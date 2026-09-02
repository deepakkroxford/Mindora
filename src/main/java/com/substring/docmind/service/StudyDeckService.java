package com.substring.docmind.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.docmind.dto.*;
import com.substring.docmind.entity.DocumentMetadata;
import com.substring.docmind.entity.QuizAttempt;
import com.substring.docmind.entity.User;
import com.substring.docmind.repository.DocumentMetadataRepo;
import com.substring.docmind.repository.QuizAttemptRepository;
import com.substring.docmind.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class StudyDeckService {

    private final ChatClient chatClient;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate stringRedisTemplate;
    private final DocumentMetadataRepo documentMetadataRepo;
    private final QuizAttemptRepository quizAttemptRepository;
    private final UserRepository userRepository;
    private final TokenUsageService tokenUsageService;

    private static final String QUIZ_CACHE_PREFIX = "rag:cache:quiz:";
    private static final String FLASHCARD_CACHE_PREFIX = "rag:cache:flashcards:";

    public StudyDeckService(
            ChatClient chatClient,
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            StringRedisTemplate stringRedisTemplate,
            DocumentMetadataRepo documentMetadataRepo,
            QuizAttemptRepository quizAttemptRepository,
            UserRepository userRepository,
            TokenUsageService tokenUsageService) {
        this.chatClient = chatClient;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.stringRedisTemplate = stringRedisTemplate;
        this.documentMetadataRepo = documentMetadataRepo;
        this.quizAttemptRepository = quizAttemptRepository;
        this.userRepository = userRepository;
        this.tokenUsageService = tokenUsageService;
    }

    /**
    /**
     * Helper to resolve authenticated User UUID.
     */
    private UUID resolveUserId(String userEmail) {
        if (userEmail != null && !userEmail.isBlank() && !"anonymous".equalsIgnoreCase(userEmail) && !"anonymousUser".equalsIgnoreCase(userEmail)) {
            return userRepository.findByEmail(userEmail).map(User::getId).orElse(null);
        }
        if (org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() != null) {
            String authName = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            if (authName != null && !authName.isBlank() && !"anonymous".equalsIgnoreCase(authName) && !"anonymousUser".equalsIgnoreCase(authName)) {
                return userRepository.findByEmail(authName).map(User::getId).orElse(null);
            }
        }
        return null;
    }

    public QuizResponseDto generateQuiz(QuizGenerationRequestDto request) {
        return generateQuiz(request, null);
    }

    /**
     * Generates or retrieves an interactive multiple-choice quiz based on selected document(s).
     */
    public QuizResponseDto generateQuiz(QuizGenerationRequestDto request, String userEmail) {
        List<UUID> docIds = request.getDocumentIds() != null ? request.getDocumentIds() : Collections.emptyList();
        int count = Math.min(Math.max(request.getNumQuestions(), 3), 15);
        String difficulty = (request.getDifficulty() != null && !request.getDifficulty().isBlank())
                ? request.getDifficulty().toLowerCase()
                : "medium";

        List<String> docNames = getDocumentNames(docIds);
        String cacheKey = generateCacheKey(QUIZ_CACHE_PREFIX, docIds, difficulty + ":" + count);

        // 1. Check Redis Cache
        try {
            String cachedJson = stringRedisTemplate.opsForValue().get(cacheKey);
            if (cachedJson != null && !cachedJson.isBlank()) {
                QuizResponseDto cachedDto = objectMapper.readValue(cachedJson, QuizResponseDto.class);
                if (cachedDto != null && cachedDto.getQuestions() != null && !cachedDto.getQuestions().isEmpty()) {
                    cachedDto.setCached(true);
                    log.debug("⚡ [Redis Cache HIT] Quiz for docs: {}", docIds);
                    return cachedDto;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to read quiz from Redis cache: {}", e.getMessage());
        }

        // 2. Fetch context excerpts from PostgreSQL vector_store
        String context = fetchDocumentContext(docIds);
        if (context.isBlank()) {
            return getFallbackQuiz(docNames, difficulty);
        }

        // 3. Prompt LLM for structured MCQ JSON
        try {
            String prompt = """
                    You are an expert educator and quiz creator.
                    Based strictly on the document excerpts provided below, create %d high-quality multiple-choice questions (%s difficulty).
                    
                    DOCUMENT EXCERPTS:
                    %s
                    
                    REQUIREMENTS:
                    1. Each question must have exactly 4 distinct options.
                    2. Exactly one option must be the correct answer. Provide the 0-based index in "correctOptionIndex" (0, 1, 2, or 3).
                    3. Provide a clear, educational "explanation" of why that option is correct based on the text.
                    4. Include a short "sourceSnippet" (1-2 sentences) directly referencing the document text.
                    5. Ensure question IDs are unique strings (e.g. "q-1", "q-2").
                    
                    OUTPUT FORMAT:
                    Output ONLY a valid JSON array of objects with the exact structure below, without markdown fences or any explanation outside JSON:
                    [
                      {
                        "id": "q-1",
                        "question": "What is the primary objective of ...?",
                        "options": ["Option A", "Option B", "Option C", "Option D"],
                        "correctOptionIndex": 1,
                        "explanation": "Option B is correct because the document states that...",
                        "sourceSnippet": "The primary objective outlined in Section 1 is..."
                      }
                    ]
                    """.formatted(count, difficulty, context);

            var chatResponse = chatClient.prompt().user(prompt).call().chatResponse();
            String response = chatResponse != null && chatResponse.getResult() != null
                    && chatResponse.getResult().getOutput() != null
                            ? chatResponse.getResult().getOutput().getText()
                            : "";
            List<QuizQuestionDto> questions = parseQuizQuestions(response);

            if (questions.isEmpty()) {
                return getFallbackQuiz(docNames, difficulty);
            }

            int promptTokens = 0;
            int completionTokens = 0;
            if (chatResponse != null && chatResponse.getMetadata() != null
                    && chatResponse.getMetadata().getUsage() != null) {
                var usage = chatResponse.getMetadata().getUsage();
                if (usage.getPromptTokens() != null) {
                    promptTokens = usage.getPromptTokens().intValue();
                }
                if (usage.getCompletionTokens() != null) {
                    completionTokens = usage.getCompletionTokens().intValue();
                }
            }
            if (promptTokens == 0 && completionTokens == 0) {
                promptTokens = Math.max(prompt.length() / 4, 100);
                completionTokens = Math.max(response.length() / 4, 100);
            }

            String title = docNames.isEmpty() ? "Workspace Knowledge Quiz" : docNames.get(0) + (docNames.size() > 1 ? " & more" : "") + " Quiz";

            UUID userId = resolveUserId(userEmail);

            tokenUsageService.recordEvent(
                    userId,
                    "QUIZ",
                    promptTokens,
                    completionTokens,
                    docIds.isEmpty() ? null : docIds.get(0),
                    docNames.isEmpty() ? "Workspace" : String.join(", ", docNames),
                    "AI Quiz: " + title + " (" + count + " questions)"
            );

            QuizResponseDto result = QuizResponseDto.builder()
                    .title(title)
                    .documentNames(docNames)
                    .questions(questions)
                    .difficulty(difficulty)
                    .isCached(false)
                    .build();

            // 4. Cache in Redis (24 Hour TTL)
            try {
                String jsonPayload = objectMapper.writeValueAsString(result);
                stringRedisTemplate.opsForValue().set(cacheKey, jsonPayload, Duration.ofHours(24));
            } catch (Exception e) {
                log.warn("Failed to cache quiz in Redis: {}", e.getMessage());
            }

            return result;
        } catch (Exception e) {
            log.error("Failed to generate quiz via LLM: {}", e.getMessage(), e);
            return getFallbackQuiz(docNames, difficulty);
        }
    }

    public FlashcardDeckResponseDto generateFlashcards(QuizGenerationRequestDto request) {
        return generateFlashcards(request, null);
    }

    /**
     * Generates or retrieves interactive study flashcards based on selected document(s).
     */
    public FlashcardDeckResponseDto generateFlashcards(QuizGenerationRequestDto request, String userEmail) {
        List<UUID> docIds = request.getDocumentIds() != null ? request.getDocumentIds() : Collections.emptyList();
        int count = Math.min(Math.max(request.getNumQuestions(), 4), 16);

        List<String> docNames = getDocumentNames(docIds);
        String cacheKey = generateCacheKey(FLASHCARD_CACHE_PREFIX, docIds, "count:" + count);

        // 1. Check Redis Cache
        try {
            String cachedJson = stringRedisTemplate.opsForValue().get(cacheKey);
            if (cachedJson != null && !cachedJson.isBlank()) {
                FlashcardDeckResponseDto cachedDeck = objectMapper.readValue(cachedJson, FlashcardDeckResponseDto.class);
                if (cachedDeck != null && cachedDeck.getCards() != null && !cachedDeck.getCards().isEmpty()) {
                    cachedDeck.setCached(true);
                    log.debug("⚡ [Redis Cache HIT] Flashcards for docs: {}", docIds);
                    return cachedDeck;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to read flashcards from Redis cache: {}", e.getMessage());
        }

        // 2. Fetch context excerpts
        String context = fetchDocumentContext(docIds);
        if (context.isBlank()) {
            return getFallbackFlashcards(docNames);
        }

        // 3. Prompt LLM for structured Flashcards JSON
        try {
            String prompt = """
                    You are an expert tutor creating active-recall study flashcards based STRICTLY on the document excerpts provided below.

                    TASK:
                    Generate exactly %d flashcards designed for spaced repetition.
                    Focus on key terms, architectural components, concepts, and definitions.

                    OUTPUT FORMAT:
                    Return ONLY a valid JSON array of flashcard objects. No markdown code fences, no extra text.
                    Schema:
                    [
                      {
                        "id": "fc-1",
                        "front": "What is the primary role of PostgreSQL pgvector in this architecture?",
                        "back": "It stores 1536-dimensional vector embeddings and performs cosine distance similarity searches.",
                        "category": "Architecture",
                        "hint": "Think of semantic embedding retrieval."
                      }
                    ]
                    """.formatted(count, context);

            var chatResponse = chatClient.prompt().user(prompt).call().chatResponse();
            String response = chatResponse != null && chatResponse.getResult() != null
                    && chatResponse.getResult().getOutput() != null
                            ? chatResponse.getResult().getOutput().getText()
                            : "";
            List<FlashcardDto> cards = parseFlashcards(response);

            if (cards.isEmpty()) {
                return getFallbackFlashcards(docNames);
            }

            int promptTokens = 0;
            int completionTokens = 0;
            if (chatResponse != null && chatResponse.getMetadata() != null
                    && chatResponse.getMetadata().getUsage() != null) {
                var usage = chatResponse.getMetadata().getUsage();
                if (usage.getPromptTokens() != null) {
                    promptTokens = usage.getPromptTokens().intValue();
                }
                if (usage.getCompletionTokens() != null) {
                    completionTokens = usage.getCompletionTokens().intValue();
                }
            }
            if (promptTokens == 0 && completionTokens == 0) {
                promptTokens = Math.max(prompt.length() / 4, 100);
                completionTokens = Math.max(response.length() / 4, 100);
            }

            String title = docNames.isEmpty() ? "Workspace Study Flashcards" : docNames.get(0) + " Flashcards";

            UUID userId = resolveUserId(userEmail);

            tokenUsageService.recordEvent(
                    userId,
                    "QUIZ",
                    promptTokens,
                    completionTokens,
                    docIds.isEmpty() ? null : docIds.get(0),
                    docNames.isEmpty() ? "Workspace" : String.join(", ", docNames),
                    "Flashcards: " + title + " (" + count + " cards)"
            );

            FlashcardDeckResponseDto result = FlashcardDeckResponseDto.builder()
                    .title(title)
                    .documentNames(docNames)
                    .cards(cards)
                    .isCached(false)
                    .build();

            // 4. Cache in Redis (24 Hour TTL)
            try {
                String jsonPayload = objectMapper.writeValueAsString(result);
                stringRedisTemplate.opsForValue().set(cacheKey, jsonPayload, Duration.ofHours(24));
            } catch (Exception e) {
                log.warn("Failed to cache flashcards in Redis: {}", e.getMessage());
            }

            return result;
        } catch (Exception e) {
            log.error("Failed to generate flashcards via LLM: {}", e.getMessage(), e);
            return getFallbackFlashcards(docNames);
        }
    }

    private String fetchDocumentContext(List<UUID> docIds) {
        try {
            List<String> chunks;
            if (docIds != null && !docIds.isEmpty()) {
                String inSql = String.join(",", Collections.nCopies(docIds.size(), "?"));
                String sql = "SELECT content FROM vector_store WHERE metadata->>'documentId' IN (" + inSql + ") LIMIT 12";
                Object[] params = docIds.stream().map(UUID::toString).toArray();
                chunks = jdbcTemplate.query(sql, (rs, rowNum) -> rs.getString("content"), params);
            } else {
                String sql = "SELECT content FROM vector_store LIMIT 10";
                chunks = jdbcTemplate.query(sql, (rs, rowNum) -> rs.getString("content"));
            }

            if (chunks.isEmpty()) return "";

            String joined = String.join("\n\n---\n\n", chunks);
            return joined.length() > 6000 ? joined.substring(0, 6000) + "..." : joined;
        } catch (Exception e) {
            log.warn("Failed to fetch vector_store chunks for study deck: {}", e.getMessage());
            return "";
        }
    }

    private List<String> getDocumentNames(List<UUID> docIds) {
        if (docIds == null || docIds.isEmpty()) return Collections.emptyList();
        try {
            return documentMetadataRepo.findAllById(docIds).stream()
                    .map(DocumentMetadata::getFilename)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private String generateCacheKey(String prefix, List<UUID> docIds, String suffix) {
        if (docIds == null || docIds.isEmpty()) {
            return prefix + "all:" + suffix;
        }
        String sorted = docIds.stream().map(UUID::toString).sorted().collect(Collectors.joining(","));
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(sorted.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return prefix + hexString.substring(0, 16) + ":" + suffix;
        } catch (Exception e) {
            return prefix + Math.abs(sorted.hashCode()) + ":" + suffix;
        }
    }

    private List<QuizQuestionDto> parseQuizQuestions(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) return Collections.emptyList();
        try {
            String cleaned = cleanJsonString(rawJson);
            return objectMapper.readValue(cleaned, new TypeReference<List<QuizQuestionDto>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse quiz JSON: {}. Raw: {}", e.getMessage(), rawJson);
            return Collections.emptyList();
        }
    }

    private List<FlashcardDto> parseFlashcards(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) return Collections.emptyList();
        try {
            String cleaned = cleanJsonString(rawJson);
            return objectMapper.readValue(cleaned, new TypeReference<List<FlashcardDto>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse flashcards JSON: {}. Raw: {}", e.getMessage(), rawJson);
            return Collections.emptyList();
        }
    }

    private String cleanJsonString(String raw) {
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

    private QuizResponseDto getFallbackQuiz(List<String> docNames, String difficulty) {
        List<QuizQuestionDto> questions = List.of(
                QuizQuestionDto.builder()
                        .id("fb-1")
                        .question("What is the primary role of RAG (Retrieval-Augmented Generation)?")
                        .options(List.of(
                                "To generate completely random fictional answers",
                                "To ground LLM responses with real document passages and verifiable citations",
                                "To compress video files into smaller formats",
                                "To replace database indexing with web queries"
                        ))
                        .correctOptionIndex(1)
                        .explanation("RAG retrieves relevant chunks from a knowledge base to ground language model responses in verified facts.")
                        .sourceSnippet("Retrieval-Augmented Generation grounds AI responses in enterprise knowledge.")
                        .build(),
                QuizQuestionDto.builder()
                        .id("fb-2")
                        .question("How does Reciprocal Rank Fusion (RRF) improve document search accuracy?")
                        .options(List.of(
                                "By merging keyword matching and vector semantic rankings into an optimal combined score",
                                "By deleting duplicate documents from the server",
                                "By translating queries into multiple languages",
                                "By multiplying token latency by 2"
                        ))
                        .correctOptionIndex(0)
                        .explanation("RRF merges disparate rank lists (e.g. pgvector cosine distance and SQL exact matches) to ensure high recall.")
                        .sourceSnippet("Parallel hybrid retrieval merges vector and keyword lists using RRF (K=60).")
                        .build(),
                QuizQuestionDto.builder()
                        .id("fb-3")
                        .question("What happens when an out-of-domain query is detected by Mindora's guardrails?")
                        .options(List.of(
                                "The application crashes immediately",
                                "The system answers safely from general knowledge with a disclaimer and strips false citations",
                                "The user's account is locked",
                                "The document is erased from PostgreSQL"
                        ))
                        .correctOptionIndex(1)
                        .explanation("Guardrails prevent hallucinated document citations by falling back to general model reasoning with a clear disclaimer.")
                        .sourceSnippet("Anti-hallucination guardrails disclaim ungrounded inquiries safely.")
                        .build()
        );

        return QuizResponseDto.builder()
                .title(docNames.isEmpty() ? "Document Mastery Quiz" : docNames.get(0) + " Quiz")
                .documentNames(docNames)
                .questions(questions)
                .difficulty(difficulty)
                .isCached(false)
                .build();
    }

    private FlashcardDeckResponseDto getFallbackFlashcards(List<String> docNames) {
        List<FlashcardDto> cards = List.of(
                FlashcardDto.builder()
                        .id("fbc-1")
                        .front("What is Reciprocal Rank Fusion (RRF)?")
                        .back("An algorithmic technique that combines ranked results from vector search and keyword search to produce superior retrieval precision.")
                        .category("Hybrid Retrieval")
                        .hint("Think combining dense and sparse search rankings.")
                        .build(),
                FlashcardDto.builder()
                        .id("fbc-2")
                        .front("Why is pgvector used for embeddings?")
                        .back("It allows storing high-dimensional vector embeddings (1536 dims) directly in PostgreSQL for fast cosine and inner-product nearest-neighbor queries.")
                        .category("Database Architecture")
                        .hint("Vector similarity extension in Postgres.")
                        .build(),
                FlashcardDto.builder()
                        .id("fbc-3")
                        .front("What is Redis Semantic Caching?")
                        .back("A caching layer that stores previous RAG answers by query hash, returning instant <15ms responses with zero LLM token consumption.")
                        .category("Performance & Scaling")
                        .hint("Sub-15ms repeated query acceleration.")
                        .build(),
                FlashcardDto.builder()
                        .id("fbc-4")
                        .front("How do Mindora Guardrails prevent hallucinations?")
                        .back("When vector similarity is below threshold (<45%), it disclaims out-of-domain knowledge and prevents fabricating non-existent page citations.")
                        .category("Safety & Integrity")
                        .hint("Low similarity score fallback mechanism.")
                        .build()
        );

        return FlashcardDeckResponseDto.builder()
                .title(docNames.isEmpty() ? "Knowledge Base Flashcards" : docNames.get(0) + " Flashcards")
                .documentNames(docNames)
                .cards(cards)
                .isCached(false)
                .build();
    }

    /**
     * Saves a completed quiz attempt to PostgreSQL database.
     */
    public QuizAttemptResponseDto saveQuizAttempt(QuizSubmitResultRequestDto request, String userEmail) {
        UUID userId = null;
        if (userEmail != null && !userEmail.isBlank()) {
            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            if (userOpt.isPresent()) {
                userId = userOpt.get().getId();
            }
        }

        String docNamesStr = request.getDocumentNames() != null && !request.getDocumentNames().isEmpty()
                ? String.join(", ", request.getDocumentNames())
                : "Entire Knowledge Base";

        QuizAttempt attempt = QuizAttempt.builder()
                .userId(userId)
                .quizTitle(request.getQuizTitle() != null ? request.getQuizTitle() : "Document Quiz")
                .documentNames(docNamesStr)
                .score(request.getScore())
                .totalQuestions(request.getTotalQuestions())
                .percentage(request.getPercentage())
                .difficulty(request.getDifficulty() != null ? request.getDifficulty() : "medium")
                .build();

        QuizAttempt saved = quizAttemptRepository.save(attempt);
        log.info("Saved quiz attempt #{} for user {}: {}/{} ({}%)", saved.getId(), userEmail, saved.getScore(), saved.getTotalQuestions(), saved.getPercentage());

        return mapToQuizAttemptResponseDto(saved);
    }

    /**
     * Retrieves the history of past quiz attempts for a user.
     */
    public List<QuizAttemptResponseDto> getQuizHistory(String userEmail) {
        List<QuizAttempt> attempts;
        if (userEmail != null && !userEmail.isBlank()) {
            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            if (userOpt.isPresent()) {
                attempts = quizAttemptRepository.findByUserIdOrderByCreatedAtDesc(userOpt.get().getId());
            } else {
                attempts = quizAttemptRepository.findAllByOrderByCreatedAtDesc();
            }
        } else {
            attempts = quizAttemptRepository.findAllByOrderByCreatedAtDesc();
        }

        return attempts.stream()
                .map(this::mapToQuizAttemptResponseDto)
                .collect(Collectors.toList());
    }

    private QuizAttemptResponseDto mapToQuizAttemptResponseDto(QuizAttempt a) {
        List<String> docNames = a.getDocumentNames() != null && !a.getDocumentNames().isBlank()
                ? Arrays.asList(a.getDocumentNames().split(",\\s*"))
                : Collections.emptyList();

        return QuizAttemptResponseDto.builder()
                .id(a.getId())
                .quizTitle(a.getQuizTitle())
                .documentNames(docNames)
                .score(a.getScore())
                .totalQuestions(a.getTotalQuestions())
                .percentage(a.getPercentage())
                .difficulty(a.getDifficulty())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
