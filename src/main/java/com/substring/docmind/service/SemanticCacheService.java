package com.substring.docmind.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.docmind.config.AppProperties;
import com.substring.docmind.dto.ChatResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.*;

/**
 * Enterprise Semantic & Exact Response Cache using Redis.
 * Intercepts LLM queries to provide sub-15ms responses with $0 token cost.
 */
@Service
@Slf4j
public class SemanticCacheService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    public SemanticCacheService(
            RedisTemplate<String, Object> redisTemplate,
            AppProperties appProperties,
            ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
    }

    private static final String CACHE_PREFIX = "rag:cache:query:";
    private static final String DOC_INDEX_PREFIX = "rag:cache:doc_queries:";

    /**
     * Attempts to retrieve a cached ChatResponseDto for the given question and
     * scoped documents.
     */
    public Optional<ChatResponseDto> getCachedResponse(String question, List<UUID> documentIds) {
        if (!appProperties.getCache().isEnabled()) {
            return Optional.empty();
        }

        try {
            long startTime = System.currentTimeMillis();
            String key = buildCacheKey(question, documentIds);
            Object cachedObj = redisTemplate.opsForValue().get(key);

            if (cachedObj != null) {
                ChatResponseDto response;
                if (cachedObj instanceof ChatResponseDto dto) {
                    response = dto;
                } else {
                    response = objectMapper.convertValue(cachedObj, ChatResponseDto.class);
                }

                long lookupTime = System.currentTimeMillis() - startTime;
                response.setIsCached(true);
                response.setResponseTimeMs(lookupTime);
                log.info("⚡ [Redis Cache HIT] Served query in {} ms: '{}'", lookupTime, question);
                return Optional.of(response);
            }
        } catch (Exception e) {
            log.warn("Redis cache read failed (fallback to live search): {}", e.getMessage());
        }

        return Optional.empty();
    }

    /**
     * Caches the completed LLM response in Redis with TTL.
     */
    public void cacheResponse(String question, List<UUID> documentIds, ChatResponseDto response) {
        if (!appProperties.getCache().isEnabled() || response == null || response.getAnswer() == null) {
            return;
        }

        try {
            String key = buildCacheKey(question, documentIds);
            long ttlSeconds = appProperties.getCache().getQueryTtlSeconds();

            // Store response copy with isCached flag
            ChatResponseDto copy = ChatResponseDto.builder()
                    .answer(response.getAnswer())
                    .conversationId(response.getConversationId())
                    .citations(response.getCitations())
                    .responseTimeMs(response.getResponseTimeMs())
                    .similarityScore(response.getSimilarityScore())
                    .promptTokens(response.getPromptTokens())
                    .completionTokens(response.getCompletionTokens())
                    .totalTokens(response.getTotalTokens())
                    .isCached(true)
                    .build();

            redisTemplate.opsForValue().set(key, copy, Duration.ofSeconds(ttlSeconds));

            // Map document IDs to this cache key for targeted invalidation
            if (documentIds != null && !documentIds.isEmpty()) {
                for (UUID docId : documentIds) {
                    String docKey = DOC_INDEX_PREFIX + docId.toString();
                    redisTemplate.opsForSet().add(docKey, key);
                    redisTemplate.expire(docKey, Duration.ofSeconds(ttlSeconds + 3600));
                }
            }

            log.debug("Saved response to Redis cache key: {} (TTL: {}s)", key, ttlSeconds);
        } catch (Exception e) {
            log.warn("Redis cache write failed: {}", e.getMessage());
        }
    }

    /**
     * Invalidate all cached responses associated with a deleted or modified
     * document.
     */
    public void evictForDocument(UUID documentId) {
        if (documentId == null)
            return;
        try {
            String docKey = DOC_INDEX_PREFIX + documentId.toString();
            Set<Object> queryKeys = redisTemplate.opsForSet().members(docKey);
            if (queryKeys != null && !queryKeys.isEmpty()) {
                List<String> keysToDelete = queryKeys.stream().map(Object::toString).toList();
                redisTemplate.delete(keysToDelete);
                redisTemplate.delete(docKey);
                log.info("Evicted {} cached queries for documentId: {}", keysToDelete.size(), documentId);
            }
        } catch (Exception e) {
            log.warn("Failed to evict document cache for {}: {}", documentId, e.getMessage());
        }
    }

    /**
     * Builds a normalized, deterministic SHA-256 cache key.
     */
    private String buildCacheKey(String question, List<UUID> documentIds) {
        String normalizedQ = (question != null ? question.trim().toLowerCase() : "")
                .replaceAll("[^a-zA-Z0-9\\s]", "")
                .replaceAll("\\s+", " ");

        List<String> docIdStrings = (documentIds != null ? documentIds : Collections.<UUID>emptyList())
                .stream()
                .filter(Objects::nonNull)
                .map(UUID::toString)
                .sorted()
                .toList();

        String raw = String.join("|", docIdStrings) + "::" + normalizedQ;
        return CACHE_PREFIX + sha256Hex(raw);
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1)
                    hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return Integer.toHexString(input.hashCode());
        }
    }
}
