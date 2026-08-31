package com.substring.docmind.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;

@Service
@Slf4j
public class PromptSuggestionService {

    private final ChatClient chatClient;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate stringRedisTemplate;

    private static final String STARTER_PROMPTS_CACHE_PREFIX = "rag:cache:doc_starters:";

    public PromptSuggestionService(
            ChatClient chatClient,
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            StringRedisTemplate stringRedisTemplate) {
        this.chatClient = chatClient;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.stringRedisTemplate = stringRedisTemplate;
    }

    /**
     * Generates 3 sharp, contextual follow-up questions based on the last question & answer pair.
     */
    public List<String> generateFollowUpSuggestions(String question, String answer) {
        if (question == null || question.isBlank() || answer == null || answer.isBlank()) {
            return getDefaultFollowUpSuggestions();
        }

        try {
            // Truncate answer if very long to minimize token usage
            String trimmedAnswer = answer.length() > 1500 ? answer.substring(0, 1500) + "..." : answer;

            String prompt = """
                    You are an intelligent document research assistant.
                    Based on the user's previous question and assistant's answer below:
                    
                    User Question: "%s"
                    Assistant Answer: "%s"
                    
                    Generate strictly 3 distinct, concise, and insightful follow-up questions (each under 15 words) that the user might want to ask next to explore deeper or clarify key details.
                    
                    Output ONLY a valid JSON array of 3 strings without markdown formatting, code fences, or preamble.
                    Example format: ["What are the key deadlines mentioned?", "Can you explain the requirements in detail?", "Are there any exceptions or risks noted?"]
                    """.formatted(question, trimmedAnswer);

            var response = chatClient.prompt().user(prompt).call().content();
            List<String> suggestions = parseJsonStringArray(response);

            if (suggestions.isEmpty()) {
                return getDefaultFollowUpSuggestions();
            }

            return suggestions.stream().limit(3).toList();
        } catch (Exception e) {
            log.warn("Failed to generate contextual follow-up suggestions: {}", e.getMessage());
            return getDefaultFollowUpSuggestions();
        }
    }

    /**
     * Generates or retrieves from Redis 3 starter prompt questions for a specific document.
     */
    public List<String> getDocumentStarterPrompts(UUID documentId) {
        if (documentId == null) {
            return getDefaultStarterPrompts();
        }

        String cacheKey = STARTER_PROMPTS_CACHE_PREFIX + documentId.toString();

        // 1. Check Redis Cache
        try {
            String cachedJson = stringRedisTemplate.opsForValue().get(cacheKey);
            if (cachedJson != null && !cachedJson.isBlank()) {
                List<String> cachedList = objectMapper.readValue(cachedJson, new TypeReference<List<String>>() {});
                if (cachedList != null && !cachedList.isEmpty()) {
                    log.debug("⚡ [Redis Cache HIT] Document starter prompts for: {}", documentId);
                    return cachedList;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to read starter prompts from Redis cache for doc {}: {}", documentId, e.getMessage());
        }

        // 2. Fetch sample document chunks from PostgreSQL vector_store
        try {
            String sql = "SELECT content FROM vector_store WHERE metadata->>'documentId' = ? LIMIT 4";
            List<String> chunks = jdbcTemplate.query(sql, (rs, rowNum) -> rs.getString("content"), documentId.toString());

            if (chunks.isEmpty()) {
                return getDefaultStarterPrompts();
            }

            String sampleContext = String.join("\n\n---\n\n", chunks);
            if (sampleContext.length() > 3000) {
                sampleContext = sampleContext.substring(0, 3000) + "...";
            }

            String prompt = """
                    You are an expert document analyst.
                    Based on these sample excerpts from an uploaded document:
                    
                    %s
                    
                    Generate strictly 3 high-value, specific starter questions (each under 15 words) that someone reading this document would want to ask to understand its main insights, terms, or data.
                    
                    Output ONLY a valid JSON array of 3 strings without markdown formatting, code fences, or preamble.
                    Example format: ["What is the main purpose of this document?", "What key obligations or terms are outlined?", "Can you summarize the major findings?"]
                    """.formatted(sampleContext);

            var response = chatClient.prompt().user(prompt).call().content();
            List<String> starterPrompts = parseJsonStringArray(response);

            if (starterPrompts.isEmpty()) {
                starterPrompts = getDefaultStarterPrompts();
            } else {
                starterPrompts = starterPrompts.stream().limit(3).toList();
            }

            // 3. Cache in Redis (24 Hours TTL)
            try {
                String jsonPayload = objectMapper.writeValueAsString(starterPrompts);
                stringRedisTemplate.opsForValue().set(cacheKey, jsonPayload, Duration.ofHours(24));
            } catch (Exception e) {
                log.warn("Failed to cache starter prompts in Redis: {}", e.getMessage());
            }

            return starterPrompts;
        } catch (Exception e) {
            log.warn("Failed to generate starter prompts for document {}: {}", documentId, e.getMessage());
            return getDefaultStarterPrompts();
        }
    }

    /**
     * Safely parse raw LLM response into a List of strings.
     */
    private List<String> parseJsonStringArray(String rawResponse) {
        if (rawResponse == null || rawResponse.isBlank()) {
            return Collections.emptyList();
        }

        try {
            String cleanJson = rawResponse.trim();
            // Remove markdown code fences if present (e.g. ```json ... ```)
            if (cleanJson.startsWith("```")) {
                cleanJson = cleanJson.replaceAll("^```(?:json)?", "").replaceAll("```$", "").trim();
            }

            int firstBracket = cleanJson.indexOf('[');
            int lastBracket = cleanJson.lastIndexOf(']');
            if (firstBracket != -1 && lastBracket != -1 && lastBracket > firstBracket) {
                cleanJson = cleanJson.substring(firstBracket, lastBracket + 1);
            }

            return objectMapper.readValue(cleanJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.debug("JSON parse failed on LLM suggestion output '{}': {}", rawResponse, e.getMessage());
            // Fallback: extract line by line
            return Arrays.stream(rawResponse.split("\n"))
                    .map(String::trim)
                    .filter(line -> !line.isBlank())
                    .map(line -> line.replaceAll("^[0-9]+[.)-]\\s*", "").replaceAll("^[\"-]+", "").replaceAll("[\"-]+$", "").trim())
                    .filter(line -> line.length() > 5 && line.length() < 120)
                    .limit(3)
                    .toList();
        }
    }

    private List<String> getDefaultFollowUpSuggestions() {
        return List.of(
                "Can you provide more details on this topic?",
                "What are the key implications or next steps?",
                "Are there any relevant examples mentioned in the document?"
        );
    }

    private List<String> getDefaultStarterPrompts() {
        return List.of(
                "What is the main summary of this document?",
                "What are the key points and action items?",
                "Are there any notable rules or requirements specified?"
        );
    }
}
