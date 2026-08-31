package com.substring.docmind.service;

import com.substring.docmind.dto.DocumentMetadataDto;
import com.substring.docmind.dto.DocumentResponseDto;
import com.substring.docmind.entity.DocumentMetadata;
import com.substring.docmind.entity.DocumentStatus;
import com.substring.docmind.exception.DocumentProcessingException;
import com.substring.docmind.exception.RateLimitExceededException;
import com.substring.docmind.exception.ResourceNotFoundException;
import com.substring.docmind.repository.DocumentMetadataRepo;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class DocumentMetadataService {

    private static final Logger log = LoggerFactory.getLogger(DocumentMetadataService.class);

    private final DocumentMetadataRepo documentMetadataRepo;
    private final DocumentParserService parserService;
    private final DocumentIngestionService ingestionService;
    private final ModelMapper modelMapper;
    private final JdbcTemplate jdbcTemplate;
    private final SemanticCacheService semanticCacheService;
    private final RedisRateLimitingService redisRateLimitingService;

    public DocumentMetadataService(
            DocumentMetadataRepo documentMetadataRepo,
            DocumentParserService parserService,
            DocumentIngestionService ingestionService,
            ModelMapper modelMapper,
            JdbcTemplate jdbcTemplate,
            SemanticCacheService semanticCacheService,
            RedisRateLimitingService redisRateLimitingService) {
        this.documentMetadataRepo = documentMetadataRepo;
        this.parserService = parserService;
        this.ingestionService = ingestionService;
        this.modelMapper = modelMapper;
        this.jdbcTemplate = jdbcTemplate;
        this.semanticCacheService = semanticCacheService;
        this.redisRateLimitingService = redisRateLimitingService;
    }

    // method to upload and parse document
    @Transactional
    @CacheEvict(value = "documents", allEntries = true)
    public DocumentResponseDto uploadAndProcess(MultipartFile file) {
        String email = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getName()
                : "anonymous";

        if (!redisRateLimitingService.tryAcquireUpload(email)) {
            throw new RateLimitExceededException(
                    "⏳ You're uploading files too quickly! Please wait a minute before uploading more.");
        }

        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

        // document meta data create
        DocumentMetadata documentMetadata = DocumentMetadata
                .builder()
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

    @Cacheable(value = "documents")
    public List<DocumentMetadataDto> getAllDocuments() {
        log.debug("Fetching all documents from PostgreSQL (Cache miss)");
        List<DocumentMetadata> allDocuments = documentMetadataRepo.findAllByOrderByCreatedAtDesc();
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
}