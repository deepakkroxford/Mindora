package com.substring.docmind.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.docmind.dto.DocumentChunkDto;
import com.substring.docmind.dto.DocumentMetadataDto;
import com.substring.docmind.dto.DocumentResponseDto;
import com.substring.docmind.entity.DocumentMetadata;
import com.substring.docmind.entity.DocumentStatus;
import com.substring.docmind.exception.DocumentProcessingException;
import com.substring.docmind.exception.RateLimitExceededException;
import com.substring.docmind.exception.ResourceNotFoundException;
import com.substring.docmind.repository.DocumentMetadataRepo;
import com.substring.docmind.entity.User;
import com.substring.docmind.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.modelmapper.ModelMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class DocumentMetadataService {

    private static final Logger log = LoggerFactory.getLogger(DocumentMetadataService.class);

    private final DocumentMetadataRepo documentMetadataRepo;
    private final DocumentParserService parserService;
    private final DocumentIngestionService ingestionService;
    private final DiagramExtractionService diagramExtractionService;
    private final ModelMapper modelMapper;
    private final JdbcTemplate jdbcTemplate;
    private final SemanticCacheService semanticCacheService;
    private final RedisRateLimitingService redisRateLimitingService;
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;

    public DocumentMetadataService(
            DocumentMetadataRepo documentMetadataRepo,
            DocumentParserService parserService,
            DocumentIngestionService ingestionService,
            DiagramExtractionService diagramExtractionService,
            ModelMapper modelMapper,
            JdbcTemplate jdbcTemplate,
            SemanticCacheService semanticCacheService,
            RedisRateLimitingService redisRateLimitingService,
            ObjectMapper objectMapper,
            UserRepository userRepository) {
        this.documentMetadataRepo = documentMetadataRepo;
        this.parserService = parserService;
        this.ingestionService = ingestionService;
        this.diagramExtractionService = diagramExtractionService;
        this.modelMapper = modelMapper;
        this.jdbcTemplate = jdbcTemplate;
        this.semanticCacheService = semanticCacheService;
        this.redisRateLimitingService = redisRateLimitingService;
        this.objectMapper = objectMapper;
        this.userRepository = userRepository;
    }

    // method to upload and parse document
    @Transactional
    @CacheEvict(value = "documents", allEntries = true)
    public DocumentResponseDto uploadAndProcess(MultipartFile file) {
        String email = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getName()
                : "anonymous";

        User user = (email != null && !email.isBlank() && !"anonymous".equals(email) && !"anonymousUser".equals(email))
                ? userRepository.findByEmail(email).orElse(null)
                : null;

        if (!redisRateLimitingService.tryAcquireUpload(email != null ? email : "anonymous")) {
            throw new RateLimitExceededException(
                    "⏳ You're uploading files too quickly! Please wait a minute before uploading more.");
        }

        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

        // document meta data create
        DocumentMetadata documentMetadata = DocumentMetadata
                .builder()
                .user(user)
                .filename(fileName)
                .contentType(contentType)
                .status(DocumentStatus.UPLOADING)
                .fileSize(file.getSize())
                .createdAt(LocalDateTime.now())
                .build();

        documentMetadata = documentMetadataRepo.save(documentMetadata);
        List<Document> parsedDocs = null;
        int chunksCreated = 0;

        try {
            // Extract architecture diagrams/charts if PDF
            diagramExtractionService.extractAndSaveDiagrams(documentMetadata, file);

            // parse the file
            parsedDocs = parserService.parse(file);

            // ingest service
            chunksCreated = ingestionService.ingest(documentMetadata, parsedDocs);
        } catch (DocumentProcessingException e) {
            log.info("Document metadata deleting due to fail processing");
            documentMetadataRepo.delete(documentMetadata);
            throw e;
        }

        return DocumentResponseDto.builder()
                .id(documentMetadata.getId())
                .fileName(documentMetadata.getFilename())
                .fileSize(documentMetadata.getFileSize())
                .chunksCreated(chunksCreated)
                .status(documentMetadata.getStatus())
                .message("Document successfully processed and indexed.")
                .build();
    }

    @CacheEvict(value = "documents", allEntries = true)
    public List<DocumentResponseDto> uploadMultipleDocuments(List<MultipartFile> files) {
        List<DocumentResponseDto> responseDtos = new ArrayList<>();
        for (MultipartFile file : files) {
            DocumentResponseDto result = this.uploadAndProcess(file);
            responseDtos.add(result);
        }
        return responseDtos;
    }

    public List<DocumentMetadataDto> getAllDocuments() {
        String email = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getName()
                : null;

        User user = (email != null && !email.isBlank() && !"anonymousUser".equals(email) && !"anonymous".equals(email))
                ? userRepository.findByEmail(email).orElse(null)
                : null;

        log.debug("Fetching documents for user: {}", email);
        List<DocumentMetadata> allDocuments;
        if (user != null) {
            allDocuments = documentMetadataRepo.findByUserOrderByCreatedAtDesc(user);
        } else {
            allDocuments = documentMetadataRepo.findAllByOrderByCreatedAtDesc();
        }

        return allDocuments.stream()
                .map(documentMetadata -> modelMapper.map(documentMetadata, DocumentMetadataDto.class))
                .toList();
    }

    @Cacheable(value = "documents", key = "#id")
    public DocumentMetadataDto getDocumentById(UUID id) {
        DocumentMetadata documentMetadata = documentMetadataRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document with given id not found !!"));
        return modelMapper.map(documentMetadata, DocumentMetadataDto.class);
    }

    @Transactional
    @CacheEvict(value = "documents", allEntries = true)
    public void deleteDocument(UUID id) {
        DocumentMetadata documentMetadata = documentMetadataRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document with given id not found !!"));

        documentMetadataRepo.delete(documentMetadata);

        // Delete the vector entries
        try {
            String deleteVectorsSql = "DELETE FROM vector_store WHERE metadata->>'documentId' = ?";
            int deletedCount = jdbcTemplate.update(deleteVectorsSql, id.toString());
            log.info("Deleted {} vector chunks for document id {} ", deletedCount, id);
        } catch (Exception e) {
            log.warn("Could not delete vectors from vector store directly: {}", e.getMessage());
        }

        // Evict query caches associated with this document
        semanticCacheService.evictForDocument(id);
    }

    public List<DocumentChunkDto> getDocumentChunks(UUID documentId) {
        DocumentMetadata documentMetadata = documentMetadataRepo.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document with given id not found !!"));

        List<DocumentChunkDto> chunks = new ArrayList<>();
        try {
            String sql = "SELECT id, content, metadata FROM vector_store WHERE metadata->>'documentId' = ?";
            chunks = jdbcTemplate.query(sql, (rs, rowNum) -> {
                String idStr = rs.getString("id");
                UUID id = null;
                try {
                    id = UUID.fromString(idStr);
                } catch (Exception ignored) {}

                String content = rs.getString("content");
                String metaJson = rs.getString("metadata");

                Map<String, Object> metaMap = new HashMap<>();
                int pageNumber = 1;
                int chunkIndex = rowNum + 1;

                if (metaJson != null && !metaJson.isBlank()) {
                    try {
                        metaMap = objectMapper.readValue(metaJson, new TypeReference<Map<String, Object>>() {});
                        if (metaMap.get("pageNumber") != null) {
                            pageNumber = Integer.parseInt(metaMap.get("pageNumber").toString());
                        } else if (metaMap.get("page") != null) {
                            pageNumber = Integer.parseInt(metaMap.get("page").toString());
                        }
                        if (metaMap.get("chunkIndex") != null) {
                            chunkIndex = Integer.parseInt(metaMap.get("chunkIndex").toString());
                        }
                    } catch (Exception e) {
                        log.debug("Could not parse chunk metadata json: {}", e.getMessage());
                    }
                }

                int charLength = content != null ? content.length() : 0;
                int estimatedTokens = (int) Math.ceil(charLength / 4.0);

                return DocumentChunkDto.builder()
                        .id(id)
                        .documentId(documentId)
                        .chunkIndex(chunkIndex)
                        .pageNumber(pageNumber)
                        .content(content)
                        .charLength(charLength)
                        .estimatedTokens(estimatedTokens)
                        .metadata(metaMap)
                        .build();
            }, documentId.toString());

            chunks.sort(Comparator.comparingInt(DocumentChunkDto::getChunkIndex));
        } catch (Exception e) {
            log.error("Failed to query chunks for document {}: {}", documentId, e.getMessage());
        }

        return chunks;
    }
}