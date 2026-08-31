package com.substring.docmind.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.docmind.dto.MindMapGenerationRequestDto;
import com.substring.docmind.dto.MindMapNodeDto;
import com.substring.docmind.dto.MindMapResponseDto;
import com.substring.docmind.entity.DocumentMetadata;
import com.substring.docmind.entity.MindMapRecord;
import com.substring.docmind.entity.User;
import com.substring.docmind.repository.DocumentMetadataRepo;
import com.substring.docmind.repository.MindMapRecordRepository;
import com.substring.docmind.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class MindMapService {

    private final ChatClient chatClient;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate stringRedisTemplate;
    private final DocumentMetadataRepo documentMetadataRepo;
    private final MindMapRecordRepository mindMapRecordRepository;
    private final UserRepository userRepository;
    private final TokenUsageService tokenUsageService;

    private static final String MINDMAP_CACHE_PREFIX = "rag:cache:mindmap:";

    public MindMapService(
            ChatClient chatClient,
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            StringRedisTemplate stringRedisTemplate,
            DocumentMetadataRepo documentMetadataRepo,
            MindMapRecordRepository mindMapRecordRepository,
            UserRepository userRepository,
            TokenUsageService tokenUsageService) {
        this.chatClient = chatClient;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.stringRedisTemplate = stringRedisTemplate;
        this.documentMetadataRepo = documentMetadataRepo;
        this.mindMapRecordRepository = mindMapRecordRepository;
        this.userRepository = userRepository;
        this.tokenUsageService = tokenUsageService;
    }

    /**
     * Generates or retrieves an interactive hierarchical mind map and saves it to PostgreSQL.
     */
    public MindMapResponseDto generateMindMap(MindMapGenerationRequestDto request, String userEmail) {
        List<UUID> docIds = request.getDocumentIds() != null ? request.getDocumentIds() : Collections.emptyList();
        int maxDepth = request.getMaxDepth() != null ? Math.min(Math.max(request.getMaxDepth(), 2), 4) : 3;

        List<String> docNames = getDocumentNames(docIds);
        String cacheKey = generateCacheKey(docIds, "depth:" + maxDepth);

        // 1. Check Redis Cache
        try {
            String cachedJson = stringRedisTemplate.opsForValue().get(cacheKey);
            if (cachedJson != null && !cachedJson.isBlank()) {
                MindMapNodeDto rootNode = objectMapper.readValue(cachedJson, MindMapNodeDto.class);
                int totalNodes = countNodes(rootNode);
                log.info("Returning cached mind map for key {}", cacheKey);
                return MindMapResponseDto.builder()
                        .title(docNames.isEmpty() ? "Knowledge Base Concept Map" : docNames.get(0) + " Concept Map")
                        .documentNames(docNames)
                        .rootNode(rootNode)
                        .totalNodes(totalNodes)
                        .tokensUsed(0) // 0 tokens consumed on cache hit!
                        .isCached(true)
                        .createdAt(LocalDateTime.now())
                        .build();
            }
        } catch (Exception e) {
            log.warn("Failed to read mind map from Redis cache: {}", e.getMessage());
        }

        // 2. Fetch Document Chunks
        List<String> contextChunks = fetchContextChunks(docIds);
        String combinedContext = String.join("\n\n---\n\n", contextChunks);

        if (combinedContext.isBlank()) {
            log.warn("No vector content found for document IDs: {}. Using fallback structure.", docIds);
            MindMapNodeDto fallback = buildFallbackMindMap(docNames);
            return MindMapResponseDto.builder()
                    .title(docNames.isEmpty() ? "Knowledge Base Overview" : docNames.get(0) + " Overview")
                    .documentNames(docNames)
                    .rootNode(fallback)
                    .totalNodes(countNodes(fallback))
                    .tokensUsed(0)
                    .isCached(false)
                    .createdAt(LocalDateTime.now())
                    .build();
        }

        if (combinedContext.length() > 12000) {
            combinedContext = combinedContext.substring(0, 12000) + "\n...[truncated for graph synthesis]";
        }

        // 3. Prompt AI for Hierarchical JSON Tree
        String prompt = """
                You are an expert knowledge graph architect and technical educator.
                Analyze the following document context and construct a comprehensive, hierarchical concept mind map tree.

                HIERARCHY RULES:
                1. The root node represents the central document topic/theme.
                2. Level 1 children: 3 to 5 Primary Pillars / Core Modules (e.g. Architecture, Security & Authentication, Data Flow, Configurations).
                3. Level 2 children: 2 to 4 Sub-concepts, Mechanisms, or Components under each pillar.
                4. Level 3 children (leaves): Specific Technical Entities, Rules, Algorithms, or Key Definitions.
                5. Each node MUST have:
                   - "id": A unique short alphanumeric string (e.g. "root", "node-1", "node-1-1").
                   - "label": Clear, concise concept title (2-5 words).
                   - "description": Informative 1-2 sentence explanation of what this concept is and why it matters.
                   - "category": One of ["Architecture", "Security", "Data Flow", "Configuration", "Best Practice", "Performance", "Core Concept"].
                   - "keywords": List of 2 to 4 key technical terms/acronyms related to this node.
                   - "children": Array of child nodes (empty array [] if leaf node).

                OUTPUT FORMAT:
                Return ONLY a valid JSON object matching the MindMapNodeDto root node schema. Do NOT include markdown code fences, backticks, or extra conversational text.

                DOCUMENT NAMES: %s
                DOCUMENT CONTENT:
                %s
                """.formatted(
                docNames.isEmpty() ? "Entire Knowledge Base" : String.join(", ", docNames),
                combinedContext
        );

        int promptTokens = Math.max(prompt.length() / 4, 80);

        try {
            String aiResponse = chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();

            int completionTokens = Math.max(aiResponse.length() / 4, 80);
            int totalTokensUsed = promptTokens + completionTokens;

            String cleanJson = sanitizeJson(aiResponse);
            MindMapNodeDto rootNode = objectMapper.readValue(cleanJson, MindMapNodeDto.class);
            int totalNodes = countNodes(rootNode);

            // 4. Cache in Redis with 24h TTL
            try {
                stringRedisTemplate.opsForValue().set(cacheKey, cleanJson, Duration.ofHours(24));
            } catch (Exception e) {
                log.warn("Failed to write mind map to Redis cache: {}", e.getMessage());
            }

            // 5. Persist to PostgreSQL MindMapRecord
            UUID savedId = null;
            try {
                UUID userId = null;
                if (userEmail != null && !userEmail.isBlank()) {
                    Optional<User> userOpt = userRepository.findByEmail(userEmail);
                    if (userOpt.isPresent()) {
                        userId = userOpt.get().getId();
                    }
                }

                String title = rootNode.getLabel() != null ? rootNode.getLabel() : (docNames.isEmpty() ? "Knowledge Base Map" : docNames.get(0));
                String docNamesStr = docNames.isEmpty() ? "Entire Knowledge Base" : String.join(", ", docNames);

                MindMapRecord record = MindMapRecord.builder()
                        .userId(userId)
                        .title(title)
                        .documentNames(docNamesStr)
                        .rootNodeJson(cleanJson)
                        .totalNodes(totalNodes)
                        .tokensUsed(totalTokensUsed)
                        .build();

                MindMapRecord saved = mindMapRecordRepository.save(record);
                savedId = saved.getId();
                log.info("Saved MindMap record #{} for user {}: {} nodes, {} tokens used", savedId, userEmail, totalNodes, totalTokensUsed);

                tokenUsageService.recordEvent(
                        userId,
                        "MINDMAP",
                        promptTokens,
                        completionTokens,
                        docIds.isEmpty() ? null : docIds.get(0),
                        docNamesStr,
                        "Mind Map: " + title
                );
            } catch (Exception e) {
                log.warn("Could not persist mind map record to PostgreSQL: {}", e.getMessage());
            }

            return MindMapResponseDto.builder()
                    .id(savedId)
                    .title(rootNode.getLabel() != null ? rootNode.getLabel() : (docNames.isEmpty() ? "Knowledge Base Map" : docNames.get(0)))
                    .documentNames(docNames)
                    .rootNode(rootNode)
                    .totalNodes(totalNodes)
                    .tokensUsed(totalTokensUsed)
                    .isCached(false)
                    .createdAt(LocalDateTime.now())
                    .build();

        } catch (Exception e) {
            log.error("Failed to generate mind map via AI: {}", e.getMessage(), e);
            MindMapNodeDto fallback = buildFallbackMindMap(docNames);
            return MindMapResponseDto.builder()
                    .title(docNames.isEmpty() ? "Knowledge Base Map" : docNames.get(0))
                    .documentNames(docNames)
                    .rootNode(fallback)
                    .totalNodes(countNodes(fallback))
                    .tokensUsed(0)
                    .isCached(false)
                    .createdAt(LocalDateTime.now())
                    .build();
        }
    }

    /**
     * Retrieves saved Mind Map records from PostgreSQL for a user.
     */
    public List<MindMapResponseDto> getSavedMindMaps(String userEmail) {
        List<MindMapRecord> records;
        if (userEmail != null && !userEmail.isBlank()) {
            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            if (userOpt.isPresent()) {
                records = mindMapRecordRepository.findByUserIdOrderByCreatedAtDesc(userOpt.get().getId());
            } else {
                records = mindMapRecordRepository.findAllByOrderByCreatedAtDesc();
            }
        } else {
            records = mindMapRecordRepository.findAllByOrderByCreatedAtDesc();
        }

        return records.stream()
                .map(this::mapRecordToDto)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * Updates an existing MindMap in PostgreSQL with modified title or edited node tree.
     */
    public MindMapResponseDto updateMindMap(UUID id, MindMapResponseDto request, String userEmail) {
        MindMapRecord record = mindMapRecordRepository.findById(id)
                .orElseThrow(() -> new com.substring.docmind.exception.ResourceNotFoundException("Knowledge graph not found with id: " + id));

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            record.setTitle(request.getTitle());
        }
        if (request.getRootNode() != null) {
            try {
                String updatedJson = objectMapper.writeValueAsString(request.getRootNode());
                record.setRootNodeJson(updatedJson);
                record.setTotalNodes(countNodes(request.getRootNode()));
            } catch (Exception e) {
                log.error("Failed to serialize updated root node: {}", e.getMessage());
            }
        }
        MindMapRecord saved = mindMapRecordRepository.save(record);
        log.info("Updated MindMap record #{} with new title/content", id);
        return mapRecordToDto(saved);
    }

    /**
     * Saves a new custom or edited MindMap directly to PostgreSQL.
     */
    public MindMapResponseDto saveMindMap(MindMapResponseDto request, String userEmail) {
        UUID userId = null;
        if (userEmail != null && !userEmail.isBlank()) {
            userId = userRepository.findByEmail(userEmail).map(User::getId).orElse(null);
        }

        String json = "{}";
        int totalNodes = 1;
        if (request.getRootNode() != null) {
            try {
                json = objectMapper.writeValueAsString(request.getRootNode());
                totalNodes = countNodes(request.getRootNode());
            } catch (Exception e) {
                log.error("Failed to serialize root node: {}", e.getMessage());
            }
        }

        MindMapRecord record = MindMapRecord.builder()
                .userId(userId)
                .title(request.getTitle() != null && !request.getTitle().isBlank() ? request.getTitle() : "Custom Knowledge Graph")
                .documentNames(request.getDocumentNames() != null ? String.join(", ", request.getDocumentNames()) : "Custom Workspace")
                .rootNodeJson(json)
                .totalNodes(totalNodes)
                .tokensUsed(request.getTokensUsed() != null ? request.getTokensUsed() : 0)
                .build();

        MindMapRecord saved = mindMapRecordRepository.save(record);
        log.info("Saved custom MindMap record #{} for user {}", saved.getId(), userEmail);
        return mapRecordToDto(saved);
    }

    /**
     * Deletes a saved Mind Map record from PostgreSQL.
     */
    public void deleteMindMap(UUID id) {
        mindMapRecordRepository.deleteById(id);
        log.info("Deleted MindMap record #{}", id);
    }

    private MindMapResponseDto mapRecordToDto(MindMapRecord r) {
        try {
            MindMapNodeDto rootNode = objectMapper.readValue(r.getRootNodeJson(), MindMapNodeDto.class);
            List<String> docNames = r.getDocumentNames() != null && !r.getDocumentNames().isBlank()
                    ? Arrays.asList(r.getDocumentNames().split(",\\s*"))
                    : Collections.emptyList();

            return MindMapResponseDto.builder()
                    .id(r.getId())
                    .title(r.getTitle())
                    .documentNames(docNames)
                    .rootNode(rootNode)
                    .totalNodes(r.getTotalNodes())
                    .tokensUsed(r.getTokensUsed())
                    .isCached(true)
                    .createdAt(r.getCreatedAt())
                    .build();
        } catch (Exception e) {
            log.warn("Failed to parse saved rootNodeJson for record {}: {}", r.getId(), e.getMessage());
            return null;
        }
    }

    private List<String> fetchContextChunks(List<UUID> docIds) {
        List<String> chunks = new ArrayList<>();
        try {
            if (docIds.isEmpty()) {
                String sql = "SELECT content FROM vector_store ORDER BY random() LIMIT 20";
                chunks = jdbcTemplate.query(sql, (rs, rowNum) -> rs.getString("content"));
            } else {
                for (UUID docId : docIds) {
                    String sql = "SELECT content FROM vector_store WHERE metadata->>'documentId' = ? LIMIT 12";
                    List<String> docChunks = jdbcTemplate.query(sql, (rs, rowNum) -> rs.getString("content"), docId.toString());
                    chunks.addAll(docChunks);
                }
            }
        } catch (Exception e) {
            log.error("Error fetching context chunks for mind map: {}", e.getMessage());
        }
        return chunks;
    }

    private List<String> getDocumentNames(List<UUID> docIds) {
        if (docIds.isEmpty()) {
            return Collections.emptyList();
        }
        return documentMetadataRepo.findAllById(docIds).stream()
                .map(DocumentMetadata::getFilename)
                .collect(Collectors.toList());
    }

    private int countNodes(MindMapNodeDto node) {
        if (node == null) return 0;
        int count = 1;
        if (node.getChildren() != null) {
            for (MindMapNodeDto child : node.getChildren()) {
                count += countNodes(child);
            }
        }
        return count;
    }

    private String generateCacheKey(List<UUID> docIds, String suffix) {
        List<String> sortedIds = docIds.stream()
                .map(UUID::toString)
                .sorted()
                .collect(Collectors.toList());

        String raw = String.join(",", sortedIds) + ":" + suffix;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return MINDMAP_CACHE_PREFIX + hexString.substring(0, 16);
        } catch (Exception e) {
            return MINDMAP_CACHE_PREFIX + Math.abs(raw.hashCode());
        }
    }

    private String sanitizeJson(String raw) {
        if (raw == null) return "{}";
        String trimmed = raw.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }

    private MindMapNodeDto buildFallbackMindMap(List<String> docNames) {
        String mainTitle = docNames.isEmpty() ? "Mindora RAG Platform" : docNames.get(0);

        return MindMapNodeDto.builder()
                .id("root")
                .label(mainTitle)
                .description("Central concept map synthesized from document vectors.")
                .category("Core Architecture")
                .keywords(List.of("RAG", "Knowledge Base", "Vector Store"))
                .children(List.of(
                        MindMapNodeDto.builder()
                                .id("node-1")
                                .label("Hybrid Retrieval (RRF)")
                                .description("Combines dense semantic vector embeddings with sparse BM25 keyword search.")
                                .category("Architecture")
                                .keywords(List.of("pgvector", "Cosine Similarity", "RRF Ranking"))
                                .children(List.of(
                                        MindMapNodeDto.builder()
                                                .id("node-1-1")
                                                .label("Vector Embeddings")
                                                .description("1536-dimensional semantic representation of document chunks.")
                                                .category("Data Flow")
                                                .keywords(List.of("OpenAI", "Embedding Model"))
                                                .build(),
                                        MindMapNodeDto.builder()
                                                .id("node-1-2")
                                                .label("Reciprocal Rank Fusion")
                                                .description("Merges multiple retrieval scoring lists into a balanced relevance score.")
                                                .category("Performance")
                                                .keywords(List.of("RRF", "Dense & Sparse Fusion"))
                                                .build()
                                ))
                                .build(),
                        MindMapNodeDto.builder()
                                .id("node-2")
                                .label("Security & Guardrails")
                                .description("Enforces grounding thresholds and prevents model hallucinations.")
                                .category("Security")
                                .keywords(List.of("Hallucination Prevention", "Confidence Score"))
                                .children(List.of(
                                        MindMapNodeDto.builder()
                                                .id("node-2-1")
                                                .label("Similarity Thresholding")
                                                .description("Rejects queries with low similarity (<45%) to prevent fabrication.")
                                                .category("Best Practice")
                                                .keywords(List.of("Fallback disclaimer", "Safety"))
                                                .build(),
                                        MindMapNodeDto.builder()
                                                .id("node-2-2")
                                                .label("JWT Authentication")
                                                .description("Stateless token-based security protecting document and chat endpoints.")
                                                .category("Security")
                                                .keywords(List.of("Bearer Token", "Security Filter Chain"))
                                                .build()
                                ))
                                .build(),
                        MindMapNodeDto.builder()
                                .id("node-3")
                                .label("Performance & Caching")
                                .description("Multi-tier Redis acceleration for sub-15ms repeated queries.")
                                .category("Performance")
                                .keywords(List.of("Redis Semantic Cache", "Rate Limiting"))
                                .children(List.of(
                                        MindMapNodeDto.builder()
                                                .id("node-3-1")
                                                .label("Semantic Query Cache")
                                                .description("Stores past LLM responses with zero token consumption.")
                                                .category("Configuration")
                                                .keywords(List.of("TTL 2 Hours", "Hash Key"))
                                                .build(),
                                        MindMapNodeDto.builder()
                                                .id("node-3-2")
                                                .label("Redis Token Bucket")
                                                .description("Sliding-window rate limiter preventing API abuse.")
                                                .category("Security")
                                                .keywords(List.of("Rate Limiting", "Token Bucket"))
                                                .build()
                                ))
                                .build()
                ))
                .build();
    }
}
