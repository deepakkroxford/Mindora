package com.substring.docmind.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.docmind.config.AppProperties;
import com.substring.docmind.dto.*;
import jakarta.validation.constraints.NotBlank;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

import com.substring.docmind.entity.*;
import com.substring.docmind.repository.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class RagService {
    private static final Logger log = LoggerFactory.getLogger(RagService.class);

    private final VectorStore vectorStore;
    private final AppProperties appProperties;
    private final ChatClient chatClient;
    private final ConversationRepository conversationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final DocumentDiagramRepository documentDiagramRepository;
    private final DocumentMetadataRepo documentMetadataRepo;
    private final TokenUsageService tokenUsageService;
    private final PlatformTransactionManager transactionManager;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final SemanticCacheService semanticCacheService;
    private final RedisRateLimitingService redisRateLimitingService;

    public RagService(
            VectorStore vectorStore,
            AppProperties appProperties,
            ChatClient chatClient,
            ConversationRepository conversationRepository,
            ChatMessageRepository chatMessageRepository,
            UserRepository userRepository,
            DocumentDiagramRepository documentDiagramRepository,
            DocumentMetadataRepo documentMetadataRepo,
            TokenUsageService tokenUsageService,
            PlatformTransactionManager transactionManager,
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            SemanticCacheService semanticCacheService,
            RedisRateLimitingService redisRateLimitingService) {
        this.vectorStore = vectorStore;
        this.appProperties = appProperties;
        this.chatClient = chatClient;
        this.conversationRepository = conversationRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.documentDiagramRepository = documentDiagramRepository;
        this.documentMetadataRepo = documentMetadataRepo;
        this.tokenUsageService = tokenUsageService;
        this.transactionManager = transactionManager;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.semanticCacheService = semanticCacheService;
        this.redisRateLimitingService = redisRateLimitingService;
    }

    /**
     * Approximate token estimation (~3.8 characters per token)
     */
    private int estimateTokens(String text) {
        if (text == null || text.isBlank())
            return 0;
        return Math.max(1, (int) Math.ceil(text.length() / 3.8));
    }

    /**
     * Consolidates single documentId and multi-document documentIds list into a
     * unified list of UUIDs.
     */
    private List<UUID> resolveEffectiveDocIds(UUID singleId, List<UUID> multiIds) {
        Set<UUID> ids = new LinkedHashSet<>();
        if (singleId != null) {
            ids.add(singleId);
        }
        if (multiIds != null) {
            ids.addAll(multiIds.stream().filter(Objects::nonNull).toList());
        }
        return new ArrayList<>(ids);
    }

    /**
     * Background async LLM title generator: replaces truncated prompts with crisp
     * 3-5 word titles.
     */
    private void generateAndSaveAiTitle(UUID conversationId, String promptText) {
        if (conversationId == null || promptText == null || promptText.isBlank())
            return;
        try {
            String titlePrompt = "Generate a concise, professional conversation title (maximum 3 to 5 words, no quotation marks, no preamble like 'Title:', no trailing period) that captures the core subject of this user inquiry: \""
                    + promptText + "\"";
            var response = chatClient.prompt().user(titlePrompt).call().content();
            if (response != null && !response.isBlank()) {
                String cleanTitle = response.trim()
                        .replaceAll("^[\"']+|[\"']+$", "")
                        .replaceAll("(?i)^title:\\s*", "")
                        .replaceAll("[\\n\\r]+", " ")
                        .trim();
                if (cleanTitle.length() > 60) {
                    cleanTitle = cleanTitle.substring(0, 57) + "...";
                }
                TransactionTemplate tx = new TransactionTemplate(transactionManager);
                final String finalTitle = cleanTitle;
                tx.execute(status -> {
                    conversationRepository.findById(conversationId).ifPresent(c -> {
                        c.setTitle(finalTitle);
                        conversationRepository.saveAndFlush(c);
                        log.info("AI generated conversation title for id {}: '{}'", conversationId, finalTitle);
                    });
                    return null;
                });
            }
        } catch (Exception e) {
            log.warn("Async AI conversation title generation failed for id {}: {}", conversationId, e.getMessage());
        }
    }

    /**
     * Helper method to find or create a conversation and save the chat question &
     * answer with token metadata.
     * Uses TransactionTemplate to ensure commits succeed on both synchronous
     * request threads and async Reactor stream threads.
     */
    public Conversation saveConversationAndMessage(
            String email,
            ChatRequestDto request,
            String answer,
            List<CitationDto> citationDtos,
            Integer promptTokens,
            Integer completionTokens,
            Integer totalTokens) {
        if (email == null || email.equals("anonymousUser")) {
            log.warn("Cannot save conversation: unauthenticated user ({})", email);
            return null;
        }

        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        return tx.execute(status -> {
            try {
                User user = userRepository.findByEmail(email).orElse(null);
                if (user == null) {
                    user = User.builder()
                            .email(email)
                            .name(email.contains("@") ? email.split("@")[0] : email)
                            .password("AUTO_PROVISIONED")
                            .role("USER")
                            .enabled(true)
                            .build();
                    user = userRepository.saveAndFlush(user);
                    log.info("Auto-provisioned user record for email: {}", email);
                }

                UUID conversationUuid = null;
                if (request.getConversationId() != null && !request.getConversationId().isBlank()) {
                    try {
                        conversationUuid = UUID.fromString(request.getConversationId());
                    } catch (IllegalArgumentException e) {
                        log.warn("Invalid conversation ID format: {}", request.getConversationId());
                    }
                }

                Conversation conversation = null;
                if (conversationUuid != null) {
                    conversation = conversationRepository.findByIdAndUserId(conversationUuid, user.getId())
                            .orElse(null);
                }

                if (conversation == null) {
                    String initialTitle = request.getQuestion().length() > 60
                            ? request.getQuestion().substring(0, 57) + "..."
                            : request.getQuestion();
                    conversation = Conversation.builder()
                            .user(user)
                            .title(initialTitle)
                            .messageCount(0)
                            .build();
                    conversation = conversationRepository.saveAndFlush(conversation);
                    log.info("Created new conversation: id={}, title='{}' for user={}", conversation.getId(),
                            initialTitle, email);

                    // Trigger async background LLM title generation
                    final UUID convIdForAsync = conversation.getId();
                    final String promptForTitle = request.getQuestion();
                    CompletableFuture.runAsync(() -> generateAndSaveAiTitle(convIdForAsync, promptForTitle));
                }

                Double topSimilarityScore = (citationDtos != null && !citationDtos.isEmpty())
                        ? citationDtos.get(0).getSimilarityScore()
                        : null;

                UUID primaryDocId = request.getDocumentId();
                if (primaryDocId == null && request.getDocumentIds() != null && !request.getDocumentIds().isEmpty()) {
                    primaryDocId = request.getDocumentIds().get(0);
                }

                ChatMessage chatMessage = ChatMessage.builder()
                        .conversation(conversation)
                        .question(request.getQuestion())
                        .answer(answer)
                        .documentId(primaryDocId)
                        .similarityScore(topSimilarityScore)
                        .promptTokens(promptTokens)
                        .completionTokens(completionTokens)
                        .totalTokens(totalTokens)
                        .build();
                chatMessageRepository.saveAndFlush(chatMessage);
                log.info("Saved chat message id={} for conversation id={} (tokens: prompt={}, completion={}, total={})",
                        chatMessage.getId(), conversation.getId(), promptTokens, completionTokens, totalTokens);

                tokenUsageService.recordEvent(
                        user != null ? user.getId() : null,
                        "CHAT",
                        promptTokens,
                        completionTokens,
                        primaryDocId,
                        (citationDtos != null && !citationDtos.isEmpty()) ? citationDtos.get(0).getFileName() : "Workspace",
                        request.getQuestion()
                );

                conversation.setMessageCount(conversation.getMessageCount() + 1);
                return conversationRepository.saveAndFlush(conversation);
            } catch (Exception e) {
                log.error("Exception occurred while persisting conversation and message", e);
                status.setRollbackOnly();
                return null;
            }
        });
    }

    /**
     * Detects if the query is a document-level summary or overview request.
     */
    private boolean isSummaryIntent(String question) {
        if (question == null || question.isBlank())
            return false;
        String q = question.toLowerCase().trim();
        return q.contains("summar") || q.contains("overview") || q.contains("key points")
                || q.contains("action items") || q.contains("findings") || q.contains("clauses")
                || q.contains("what is this document") || q.contains("explain this document")
                || q.contains("tell me about this document") || q.contains("what does this document say")
                || q.contains("what is in this document") || q.contains("give me a summary")
                || q.contains("give me an executive summary") || q.contains("outline")
                || q.contains("key findings") || q.contains("data points") || q.contains("table of contents")
                || q.contains("compare") || q.contains("comparison") || q.contains("difference");
    }

    // to ask any thing related to document
    @Transactional
    public ChatResponseDto askQuestion(ChatRequestDto request) {
        String email = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getName()
                : "anonymous";

        // 1. Enforce distributed rate limiting
        if (!redisRateLimitingService.tryAcquireChat(email)) {
            throw new com.substring.docmind.exception.RateLimitExceededException(
                    "⏳ You're asking questions too quickly! Please wait a minute and try again.");
        }

        List<UUID> effectiveDocIds = resolveEffectiveDocIds(request.getDocumentId(), request.getDocumentIds());

        // 2. Check Redis Semantic / Exact Response Cache (<15ms hit) unless bypassCache
        // is requested (e.g. Regenerate)
        boolean shouldBypassCache = Boolean.TRUE.equals(request.getBypassCache());
        if (!shouldBypassCache) {
            Optional<ChatResponseDto> cachedOpt = semanticCacheService.getCachedResponse(request.getQuestion(),
                    effectiveDocIds);
            if (cachedOpt.isPresent()) {
                ChatResponseDto cached = cachedOpt.get();
                Conversation savedConv = saveConversationAndMessage(
                        email, request, cached.getAnswer(), cached.getCitations(),
                        cached.getPromptTokens(), cached.getCompletionTokens(), cached.getTotalTokens());
                if (savedConv != null) {
                    cached.setConversationId(savedConv.getId().toString());
                }
                return cached;
            }
        }

        long startTime = System.currentTimeMillis();
        log.info("Processing live query (bypassCache={}): '{}', scoped documentIds: {}, conversationId: {}",
                shouldBypassCache, request.getQuestion(), effectiveDocIds, request.getConversationId());

        List<Document> similarDocuments = this.retrieveRelevantDocuments(request.getQuestion(), effectiveDocIds,
                request.getTopK(), request.getMinSimilarity());

        List<CitationDto> citationDtos = similarDocuments.stream().map(this::mapToCitation).toList();
        Double topSimilarityScore = !citationDtos.isEmpty() ? citationDtos.get(0).getSimilarityScore() : null;

        boolean isSummary = isSummaryIntent(request.getQuestion());
        boolean isScoped = !effectiveDocIds.isEmpty();

        boolean isLowRelevance;
        if (isScoped || isSummary) {
            isLowRelevance = similarDocuments.isEmpty();
        } else {
            isLowRelevance = similarDocuments.isEmpty() || (topSimilarityScore != null && topSimilarityScore < 0.45);
        }

        // If Guardrail triggers (out-of-domain query), do not attach false citations
        // from unrelated docs
        if (isLowRelevance) {
            citationDtos = Collections.emptyList();
        }

        String contextText = buildContextString(similarDocuments);
        String conversationHistory = buildConversationHistoryString(request.getConversationId());

        String prompt = buildPrompt(request.getQuestion(), contextText, conversationHistory, isLowRelevance);

        var chatResponse = this.chatClient.prompt().user(prompt).call().chatResponse();
        String answer = chatResponse != null && chatResponse.getResult() != null
                && chatResponse.getResult().getOutput() != null
                        ? chatResponse.getResult().getOutput().getText()
                        : "";

        long responseTime = System.currentTimeMillis() - startTime;
        log.info("Completed Q&A in {} ms with {} citations", responseTime, citationDtos.size());

        // Token usage calculation
        int promptTokens = estimateTokens(prompt);
        int completionTokens = estimateTokens(answer);
        if (chatResponse != null && chatResponse.getMetadata() != null
                && chatResponse.getMetadata().getUsage() != null) {
            var usage = chatResponse.getMetadata().getUsage();
            if (usage.getPromptTokens() != null && usage.getPromptTokens() > 0) {
                promptTokens = usage.getPromptTokens().intValue();
            }
            if (usage.getCompletionTokens() != null && usage.getCompletionTokens() > 0) {
                completionTokens = usage.getCompletionTokens().intValue();
            }
        }
        int totalTokens = promptTokens + completionTokens;

        Conversation savedConv = saveConversationAndMessage(email, request, answer, citationDtos, promptTokens,
                completionTokens, totalTokens);
        String convIdResult = savedConv != null ? savedConv.getId().toString() : request.getConversationId();

        List<DocumentDiagramDto> responseDiagrams = citationDtos.stream()
                .filter(c -> c.getDiagrams() != null)
                .flatMap(c -> c.getDiagrams().stream())
                .distinct()
                .collect(Collectors.toList());

        ChatResponseDto finalResponse = ChatResponseDto.builder()
                .answer(answer)
                .conversationId(convIdResult)
                .citations(citationDtos)
                .diagrams(responseDiagrams)
                .responseTimeMs(responseTime)
                .similarityScore(topSimilarityScore)
                .promptTokens(promptTokens)
                .completionTokens(completionTokens)
                .totalTokens(totalTokens)
                .isCached(false)
                .build();

        // 3. Save / overwrite in Redis Cache (2 Hour TTL)
        semanticCacheService.cacheResponse(request.getQuestion(), effectiveDocIds, finalResponse);

        return finalResponse;
    }

    // this streams
    public Flux<String> streamQuestionAnswer(ChatRequestDto requestDto) {
        final String email = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getName()
                : "anonymous";

        // 1. Enforce distributed rate limiting
        if (!redisRateLimitingService.tryAcquireChat(email)) {
            return Flux.error(new com.substring.docmind.exception.RateLimitExceededException(
                    "⏳ You're asking questions too quickly! Please wait a minute and try again."));
        }

        List<UUID> effectiveDocIds = resolveEffectiveDocIds(requestDto.getDocumentId(), requestDto.getDocumentIds());

        // 2. Check Redis Cache for Instant Stream unless bypassCache is requested
        boolean shouldBypassCache = Boolean.TRUE.equals(requestDto.getBypassCache());
        if (!shouldBypassCache) {
            Optional<ChatResponseDto> cachedOpt = semanticCacheService.getCachedResponse(requestDto.getQuestion(),
                    effectiveDocIds);
            if (cachedOpt.isPresent()) {
                ChatResponseDto cached = cachedOpt.get();
                saveConversationAndMessage(email, requestDto, cached.getAnswer(),
                        cached.getCitations(), cached.getPromptTokens(), cached.getCompletionTokens(),
                        cached.getTotalTokens());
                return Flux.just(cached.getAnswer());
            }
        }

        log.info("Streaming query: '{}', scoped documentIds: {}, conversationId: {}",
                requestDto.getQuestion(), effectiveDocIds, requestDto.getConversationId());

        List<Document> relevantDocuments = retrieveRelevantDocuments(
                requestDto.getQuestion(),
                effectiveDocIds,
                requestDto.getTopK(),
                requestDto.getMinSimilarity());

        List<CitationDto> initialCitations = relevantDocuments.stream().map(this::mapToCitation).toList();
        final Double topSimilarityScore = !initialCitations.isEmpty() ? initialCitations.get(0).getSimilarityScore()
                : null;

        boolean isSummary = isSummaryIntent(requestDto.getQuestion());
        boolean isScoped = !effectiveDocIds.isEmpty();

        boolean isLowRelevance;
        if (isScoped || isSummary) {
            isLowRelevance = relevantDocuments.isEmpty();
        } else {
            isLowRelevance = relevantDocuments.isEmpty() || (topSimilarityScore != null && topSimilarityScore < 0.45);
        }

        final List<CitationDto> citationDtos = isLowRelevance ? Collections.emptyList() : initialCitations;

        String contextText = buildContextString(relevantDocuments);
        String conversationHistory = buildConversationHistoryString(requestDto.getConversationId());
        String userPrompt = buildPrompt(requestDto.getQuestion(), contextText, conversationHistory, isLowRelevance);

        final int promptTokens = estimateTokens(userPrompt);
        StringBuilder fullAnswer = new StringBuilder();

        return chatClient.prompt()
                .user(userPrompt)
                .stream()
                .content()
                .doOnNext(token -> fullAnswer.append(token))
                .doOnComplete(() -> {
                    String answer = fullAnswer.toString();
                    int completionTokens = estimateTokens(answer);
                    int totalTokens = promptTokens + completionTokens;

                    if (email != null && !email.equals("anonymousUser")) {
                        try {
                            saveConversationAndMessage(email, requestDto, answer, citationDtos, promptTokens,
                                    completionTokens, totalTokens);
                        } catch (Exception e) {
                            log.error("Failed to save streaming message to conversation history for user {}", email, e);
                        }
                    }

                    List<DocumentDiagramDto> streamDiagrams = citationDtos.stream()
                            .filter(c -> c.getDiagrams() != null)
                            .flatMap(c -> c.getDiagrams().stream())
                            .distinct()
                            .collect(Collectors.toList());

                    // Cache streaming response in Redis
                    ChatResponseDto toCache = ChatResponseDto.builder()
                            .answer(answer)
                            .conversationId(requestDto.getConversationId())
                            .citations(citationDtos)
                            .diagrams(streamDiagrams)
                            .responseTimeMs(0L)
                            .similarityScore(topSimilarityScore)
                            .promptTokens(promptTokens)
                            .completionTokens(completionTokens)
                            .totalTokens(totalTokens)
                            .isCached(true)
                            .build();
                    semanticCacheService.cacheResponse(requestDto.getQuestion(), effectiveDocIds, toCache);
                });
    }

    /**
     * Retrieve recent conversation turns (up to last 4) for conversational memory
     * context.
     */
    private String buildConversationHistoryString(String conversationIdStr) {
        if (conversationIdStr == null || conversationIdStr.isBlank()) {
            return "";
        }
        try {
            UUID convId = UUID.fromString(conversationIdStr);
            List<ChatMessage> messages = chatMessageRepository.findByConversationIdOrderByCreatedAtAsc(convId);
            if (messages == null || messages.isEmpty()) {
                return "";
            }
            // Retain up to the last 4 dialogue turns
            int start = Math.max(0, messages.size() - 4);
            List<ChatMessage> recent = messages.subList(start, messages.size());

            StringBuilder historyBuilder = new StringBuilder();
            for (ChatMessage msg : recent) {
                if (msg.getQuestion() != null && !msg.getQuestion().isBlank()) {
                    historyBuilder.append("User: ").append(msg.getQuestion().trim()).append("\n");
                }
                if (msg.getAnswer() != null && !msg.getAnswer().isBlank()) {
                    String ans = msg.getAnswer().trim();
                    if (ans.length() > 500) {
                        ans = ans.substring(0, 500) + "... [truncated]";
                    }
                    historyBuilder.append("Assistant: ").append(ans).append("\n\n");
                }
            }
            return historyBuilder.toString().trim();
        } catch (Exception e) {
            log.warn("Could not retrieve conversation history for id {}: {}", conversationIdStr, e.getMessage());
            return "";
        }
    }

    /**
     * Constructs prompt with Context Compression, Guardrails, and Conversational
     * History.
     */
    private String buildPrompt(String question, String contextText, String conversationHistory,
            boolean isLowRelevance) {
        StringBuilder sb = new StringBuilder();

        if (conversationHistory != null && !conversationHistory.isBlank()) {
            sb.append("Recent Conversation History (for conversational context & follow-ups):\n");
            sb.append("---------------------\n");
            sb.append(conversationHistory).append("\n");
            sb.append("---------------------\n\n");
        }

        if (isLowRelevance) {
            sb.append("⚠️ GUARDRAIL ENFORCEMENT: Out-of-Domain / Low Document Confidence\n");
            sb.append("---------------------\n");
            sb.append(
                    "The question is not covered by the uploaded document context (No matching document content found).\n");
            sb.append("MANDATORY INSTRUCTIONS:\n");
            sb.append("1. You MUST begin the very first line of your response with exactly:\n");
            sb.append(
                    "   'ℹ️ *This topic was not found in your uploaded documents. Answering with general model knowledge:*'\n");
            sb.append("2. Provide an accurate, helpful answer using your broad general knowledge.\n");
            sb.append("3. Do NOT cite the uploaded document for this answer.\n");
            sb.append("---------------------\n\n");
        }

        if (contextText != null && !contextText.isBlank() && !isLowRelevance) {
            sb.append("Document Context:\n");
            sb.append("---------------------\n");
            sb.append(contextText).append("\n");
            sb.append("---------------------\n\n");
        }

        sb.append("Current User Message / Question: ").append(question).append("\n\n");
        sb.append("Instructions & Output Format:\n");
        sb.append("- Pay attention to the recent conversation history to understand context, follow-up questions, pronouns, and previous dialogue.\n");
        if (contextText != null && !contextText.isBlank() && !isLowRelevance) {
            sb.append("- Prioritize and ground your answer using the provided Document Context, citing key concepts, metrics, and parameters.\n");
        }
        sb.append("- Structure your response with rich, professional Markdown:\n");
        sb.append("  • Use descriptive section headings with badges/emojis (e.g., ### 📌 Core Concept / Overview, ### 🏗️ Architecture & Mechanism, ### ⚙️ How It Works in Practice, ### 💡 Key Takeaways & Best Practices).\n");
        sb.append("  • Bold important technical terms, components, and parameter values.\n");
        sb.append("  • Use structured bullet points and numbered steps for processes.\n");
        sb.append("  • If you include a table, always provide introductory context before it and an analytical summary/takeaway after it. Never return a bare table without explanation.\n");
        sb.append("- Provide deep, articulate, and actionable insights that thoroughly answer the user's intent.\n");

        return sb.toString();
    }

    /**
     * Latency-optimized Context builder: Caps character count (~3,500 chars / ~850
     * tokens)
     * to keep Time-To-First-Token (TTFT) ultra-fast without overloading prompt
     * length.
     */
    private String buildContextString(List<Document> similarDocuments) {
        if (similarDocuments == null || similarDocuments.isEmpty()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        int totalChars = 0;
        final int MAX_CONTEXT_CHARS = 3500;

        for (Document doc : similarDocuments) {
            String fileName = (String) doc.getMetadata().getOrDefault("fileName", "Unknown File");
            Object page = doc.getMetadata().getOrDefault("pageNumber", "N/A");
            String chunkText = doc.getText();
            if (chunkText == null || chunkText.isBlank())
                continue;

            if (totalChars + chunkText.length() > MAX_CONTEXT_CHARS) {
                int remaining = MAX_CONTEXT_CHARS - totalChars;
                if (remaining > 150) {
                    sb.append(String.format("[Source: %s | Page: %s]\n%s\n\n---\n\n", fileName, page,
                            chunkText.substring(0, remaining) + "..."));
                }
                break;
            }

            sb.append(String.format("[Source: %s | Page: %s]\n%s\n\n---\n\n", fileName, page, chunkText));
            totalChars += chunkText.length();
        }

        return sb.toString().trim();
    }

    private CitationDto mapToCitation(Document document) {

        Map<String, Object> meta = document.getMetadata();
        UUID docId = null;
        if (meta.get("documentId") != null) {
            try {
                docId = UUID.fromString(meta.get("documentId").toString());
            } catch (Exception ignore) {

            }
        }
        Integer chunkIndex = null;
        if (meta.get("chunkIndex") instanceof Number n) {
            chunkIndex = n.intValue();
        }

        Integer pageNumber = null;
        if (meta.get("pageNumber") instanceof Number n) {
            pageNumber = n.intValue();
        } else if (meta.get("page_number") instanceof Number n) {
            pageNumber = n.intValue();
        }

        Double score = null;
        if (meta.get("distance") instanceof Number n) {
            score = 1.0 - n.doubleValue();
        } else if (meta.get("similarityScore") instanceof Number n) {
            score = n.doubleValue();
        }

        List<DocumentDiagramDto> diagramDtos = new ArrayList<>();
        if (docId != null && pageNumber != null) {
            try {
                diagramDtos = documentDiagramRepository.findByDocumentIdAndPageNumber(docId, pageNumber)
                        .stream()
                        .map(d -> DocumentDiagramDto.builder()
                                .id(d.getId())
                                .documentId(d.getDocumentId())
                                .documentName((String) meta.getOrDefault("fileName", "Document"))
                                .pageNumber(d.getPageNumber())
                                .imageUrl("/api/v1/diagrams/" + d.getId() + "/image")
                                .width(d.getWidth())
                                .height(d.getHeight())
                                .caption(d.getCaption())
                                .build())
                        .collect(Collectors.toList());
            } catch (Exception ignore) {
            }
        }

        return CitationDto.builder().documentId(docId).fileName((String) meta.getOrDefault("fileName", "Unknown"))
                .chunkIndex(chunkIndex).pageNumber(pageNumber).snippet(document.getText()).similarityScore(score)
                .metadata(meta).diagrams(diagramDtos).build();
    }

    /**
     * Fast direct retrieval of document chunks across one or multiple scoped
     * documents for summarization/comparisons
     */
    private List<Document> getDocumentOverviewChunks(List<UUID> documentIds, int limit) {
        if (documentIds == null || documentIds.isEmpty()) {
            return Collections.emptyList();
        }

        StringBuilder sql = new StringBuilder(
                "SELECT id, content, metadata FROM vector_store WHERE (metadata->>'documentId' IN (");
        List<Object> params = new ArrayList<>();
        for (int i = 0; i < documentIds.size(); i++) {
            if (i > 0)
                sql.append(", ");
            sql.append("?");
            params.add(documentIds.get(i).toString());
        }
        sql.append(")) LIMIT ?");
        params.add(limit);

        List<Document> docs = new ArrayList<>();
        try {
            jdbcTemplate.query(sql.toString(), rs -> {
                String content = rs.getString("content");
                String metaJson = rs.getString("metadata");
                Map<String, Object> metadata = new HashMap<>();
                if (metaJson != null && !metaJson.isBlank()) {
                    try {
                        metadata = objectMapper.readValue(metaJson, new TypeReference<Map<String, Object>>() {
                        });
                    } catch (Exception ignore) {
                    }
                }
                metadata.put("similarityScore", 0.95);
                metadata.put("matchType", "DOCUMENT_OVERVIEW");
                docs.add(new Document(content, metadata));
            }, params.toArray());
        } catch (Exception e) {
            log.warn("Failed to retrieve document overview chunks for {}: {}", documentIds, e.getMessage());
        }
        return docs;
    }

    public SearchResultDto searchSimilarChunks(SearchRequestDto request) {

        List<UUID> docIds = request.getDocumentId() != null ? List.of(request.getDocumentId())
                : Collections.emptyList();
        java.util.List<Document> matchedDocs = retrieveRelevantDocuments(request.getQuery(), docIds,
                request.getTopK(), request.getSimilaritySearch());

        List<CitationDto> citations = matchedDocs.stream().map(this::mapToCitation).toList();

        return SearchResultDto.builder().query(request.getQuery()).totalMatches(citations.size()).matches(citations)
                .build();

    }

    /**
     * Parallel Hybrid Retrieval supporting multi-document scoping:
     * 1. Vector Semantic Cosine Search (pgvector)
     * 2. Exact Keyword Search (PostgreSQL ILIKE on vector_store)
     * 3. Reciprocal Rank Fusion (RRF) Reranking
     */
    private List<Document> retrieveRelevantDocuments(
            @NotBlank(message = "Query cannot be empty") String query,
            List<UUID> documentIds,
            Integer topK,
            Double similaritySearch) {
        int effectiveTopK = (topK != null && topK > 0) ? topK : appProperties.getRag().getTopK();
        double effectiveSimilarity = (similaritySearch != null) ? similaritySearch
                : appProperties.getRag().getSimilarityThreshold();

        List<UUID> resolvedDocIds = documentIds != null ? new ArrayList<>(documentIds) : new ArrayList<>();
        if (resolvedDocIds.isEmpty()) {
            String email = SecurityContextHolder.getContext().getAuthentication() != null
                    ? SecurityContextHolder.getContext().getAuthentication().getName()
                    : null;
            if (email != null && !email.isBlank() && !"anonymousUser".equals(email) && !"anonymous".equals(email)) {
                User user = userRepository.findByEmail(email).orElse(null);
                if (user != null) {
                    List<UUID> userDocIds = documentMetadataRepo.findByUserOrderByCreatedAtDesc(user)
                            .stream().map(DocumentMetadata::getId).toList();
                    if (!userDocIds.isEmpty()) {
                        resolvedDocIds.addAll(userDocIds);
                    }
                }
            }
        }
        final List<UUID> scopedDocIds = Collections.unmodifiableList(resolvedDocIds);

        // If the user scoped document(s) and requested a summary/overview/comparison,
        // load chunks directly
        if (!scopedDocIds.isEmpty() && isSummaryIntent(query)) {
            List<Document> overviewDocs = getDocumentOverviewChunks(scopedDocIds, effectiveTopK);
            if (!overviewDocs.isEmpty()) {
                log.info("Returning {} direct overview chunks for documentIds: {}", overviewDocs.size(), scopedDocIds);
                return overviewDocs;
            }
        }

        // 1. Asynchronous Vector Semantic Search
        CompletableFuture<List<Document>> vectorSearchFuture = CompletableFuture.supplyAsync(() -> {
            try {
                SearchRequest.Builder searchRequestBuilder = SearchRequest.builder()
                        .query(query)
                        .topK(effectiveTopK);

                if (effectiveSimilarity > 0.0) {
                    searchRequestBuilder.similarityThreshold(effectiveSimilarity);
                }

                if (!scopedDocIds.isEmpty()) {
                    FilterExpressionBuilder b = new FilterExpressionBuilder();
                    if (scopedDocIds.size() == 1) {
                        searchRequestBuilder
                                .filterExpression(b.eq("documentId", scopedDocIds.get(0).toString()).build());
                    } else {
                        String[] idStrings = scopedDocIds.stream().map(UUID::toString).toArray(String[]::new);
                        searchRequestBuilder.filterExpression(b.in("documentId", (Object[]) idStrings).build());
                    }
                }

                List<Document> docs = vectorStore.similaritySearch(searchRequestBuilder.build());
                log.info("Vector search retrieved {} chunks for query: '{}' across {} scoped doc(s)", docs.size(),
                        query, scopedDocIds.size());
                return docs;
            } catch (Exception e) {
                log.error("Vector similarity search error for query: '{}'", query, e);
                return Collections.<Document>emptyList();
            }
        });

        // 2. Asynchronous Keyword Search on vector_store table
        CompletableFuture<List<Document>> keywordSearchFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return performKeywordSearch(query, scopedDocIds, effectiveTopK);
            } catch (Exception e) {
                log.warn("Keyword search failed or uninitialized: {}", e.getMessage());
                return Collections.<Document>emptyList();
            }
        });

        // Parallel join: reduces total retrieval latency by ~50%
        List<Document> vectorDocs;
        List<Document> keywordDocs;
        try {
            CompletableFuture.allOf(vectorSearchFuture, keywordSearchFuture).join();
            vectorDocs = vectorSearchFuture.get();
            keywordDocs = keywordSearchFuture.get();
        } catch (Exception e) {
            log.warn("Hybrid search join failed, falling back to vector docs", e);
            vectorDocs = vectorSearchFuture.getNow(Collections.emptyList());
            keywordDocs = Collections.emptyList();
        }

        // 3. Reciprocal Rank Fusion & Deduplication
        return fuseAndRerankResults(vectorDocs, keywordDocs, effectiveTopK);
    }

    private static final Set<String> STOPWORDS = Set.of(
            "who", "what", "where", "when", "why", "which", "how", "whose", "whom",
            "is", "are", "was", "were", "be", "been", "being", "am",
            "do", "does", "did", "have", "has", "had", "having",
            "can", "could", "should", "would", "will", "shall", "may", "might", "must",
            "the", "and", "for", "that", "this", "these", "those", "with", "from",
            "about", "tell", "give", "explain", "describe", "show", "find", "know",
            "you", "your", "yours", "me", "my", "mine", "he", "his", "she", "her", "they", "their", "it", "its",
            "ji", "sir", "madam", "mr", "mrs", "ms", "dr", "please", "thanks", "hello", "hi", "some", "any", "all");

    /**
     * Fast PostgreSQL Keyword Search for exact terms, product codes, or acronyms
     */
    private List<Document> performKeywordSearch(String query, List<UUID> documentIds, int limit) {
        if (query == null || query.trim().length() < 3) {
            return Collections.emptyList();
        }

        String[] rawTerms = query.split("\\s+");
        List<String> terms = new ArrayList<>();
        for (String t : rawTerms) {
            String clean = t.replaceAll("[^a-zA-Z0-9_-]", "").trim();
            if (clean.length() >= 3 && !isStopword(clean)) {
                terms.add(clean.toLowerCase());
            }
        }

        if (terms.isEmpty()) {
            return Collections.emptyList();
        }

        StringBuilder sql = new StringBuilder("SELECT id, content, metadata FROM vector_store WHERE (");
        List<Object> params = new ArrayList<>();
        for (int i = 0; i < terms.size(); i++) {
            if (i > 0)
                sql.append(" OR ");
            sql.append("content ILIKE ?");
            params.add("%" + terms.get(i) + "%");
        }
        sql.append(")");

        if (documentIds != null && !documentIds.isEmpty()) {
            sql.append(" AND (metadata->>'documentId' IN (");
            for (int i = 0; i < documentIds.size(); i++) {
                if (i > 0)
                    sql.append(", ");
                sql.append("?");
                params.add(documentIds.get(i).toString());
            }
            sql.append("))");
        }

        sql.append(" LIMIT ?");
        params.add(limit);

        List<Document> keywordDocs = new ArrayList<>();
        jdbcTemplate.query(sql.toString(), (rs) -> {
            String content = rs.getString("content");
            String metaJson = rs.getString("metadata");
            Map<String, Object> metadata = new HashMap<>();
            if (metaJson != null && !metaJson.isBlank()) {
                try {
                    metadata = objectMapper.readValue(metaJson, new TypeReference<Map<String, Object>>() {
                    });
                } catch (Exception ignore) {
                }
            }

            // Calculate term match ratio
            long matchedCount = terms.stream().filter(t -> content != null && content.toLowerCase().contains(t))
                    .count();
            if (matchedCount > 0) {
                double matchRatio = (double) matchedCount / terms.size();
                double computedScore = Math.min(0.95, 0.50 + (matchRatio * 0.40));
                metadata.put("similarityScore", computedScore);
                metadata.put("matchType", "KEYWORD");
                keywordDocs.add(new Document(content, metadata));
            }
        }, params.toArray());

        log.info("Keyword search retrieved {} chunks for terms: {}", keywordDocs.size(), terms);
        return keywordDocs;
    }

    private boolean isStopword(String word) {
        if (word == null || word.length() < 3)
            return true;
        return STOPWORDS.contains(word.toLowerCase());
    }

    /**
     * Reciprocal Rank Fusion (RRF) for merging and deduplicating semantic and
     * keyword matches
     */
    private List<Document> fuseAndRerankResults(List<Document> vectorDocs, List<Document> keywordDocs, int topK) {
        Map<String, Document> docByContent = new LinkedHashMap<>();
        Map<String, Double> rrfScores = new HashMap<>();
        final double K = 60.0;

        for (int i = 0; i < vectorDocs.size(); i++) {
            Document doc = vectorDocs.get(i);
            String key = normalizeContent(doc.getText());
            docByContent.putIfAbsent(key, doc);
            rrfScores.put(key, rrfScores.getOrDefault(key, 0.0) + (1.0 / (K + (i + 1))));
        }

        for (int i = 0; i < keywordDocs.size(); i++) {
            Document doc = keywordDocs.get(i);
            String key = normalizeContent(doc.getText());
            docByContent.putIfAbsent(key, doc);
            rrfScores.put(key, rrfScores.getOrDefault(key, 0.0) + (1.0 / (K + (i + 1))));
        }

        return rrfScores.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(topK)
                .map(entry -> docByContent.get(entry.getKey()))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private String normalizeContent(String text) {
        if (text == null)
            return "";
        return text.trim().replaceAll("\\s+", " ").toLowerCase();
    }

    /**
     * Get list of conversations for the logged in user
     */
    @Transactional(readOnly = true)
    public List<ConversationDto> getConversations() {
        String email = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getName()
                : null;
        if (email == null || email.equals("anonymousUser")) {
            return Collections.emptyList();
        }
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            log.debug("No user entity found for email: {}", email);
            return Collections.emptyList();
        }

        return conversationRepository.findByUserIdOrderByUpdatedAtDesc(user.getId()).stream()
                .map(conv -> ConversationDto.builder()
                        .id(conv.getId())
                        .title(conv.getTitle())
                        .description(conv.getDescription())
                        .messageCount(conv.getMessageCount())
                        .createdAt(conv.getCreatedAt())
                        .updatedAt(conv.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Get all messages in a conversation
     */
    @Transactional(readOnly = true)
    public List<ChatMessageDto> getMessages(UUID conversationId) {
        String email = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getName()
                : null;
        if (email == null || email.equals("anonymousUser")) {
            return Collections.emptyList();
        }
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return Collections.emptyList();
        }

        Conversation conversation = conversationRepository.findByIdAndUserId(conversationId, user.getId())
                .orElse(null);
        if (conversation == null) {
            return Collections.emptyList();
        }

        return chatMessageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId()).stream()
                .map(msg -> ChatMessageDto.builder()
                        .id(msg.getId())
                        .conversationId(conversation.getId())
                        .question(msg.getQuestion())
                        .answer(msg.getAnswer())
                        .documentId(msg.getDocumentId())
                        .similarityScore(msg.getSimilarityScore())
                        .promptTokens(msg.getPromptTokens())
                        .completionTokens(msg.getCompletionTokens())
                        .totalTokens(msg.getTotalTokens())
                        .createdAt(msg.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Delete a conversation and all its messages
     */
    @Transactional
    public void deleteConversation(UUID conversationId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        if (email == null || email.equals("anonymousUser")) {
            throw new IllegalArgumentException("Unauthorized");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Conversation conversation = conversationRepository.findByIdAndUserId(conversationId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found or access denied"));

        chatMessageRepository.deleteByConversationId(conversation.getId());
        conversationRepository.delete(conversation);
        log.info("Deleted conversation: {} and all its messages", conversationId);
    }

    /**
     * Update the title of an existing conversation
     */
    @Transactional
    public ConversationDto updateConversationTitle(UUID conversationId, String newTitle) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        if (email == null || email.equals("anonymousUser")) {
            throw new IllegalArgumentException("Unauthorized");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Conversation conversation = conversationRepository.findByIdAndUserId(conversationId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found or access denied"));

        if (newTitle != null && !newTitle.isBlank()) {
            conversation.setTitle(newTitle.trim());
            conversation = conversationRepository.saveAndFlush(conversation);
            log.info("Updated title for conversation {} to '{}'", conversationId, conversation.getTitle());
        }

        return ConversationDto.builder()
                .id(conversation.getId())
                .title(conversation.getTitle())
                .description(conversation.getDescription())
                .messageCount(conversation.getMessageCount())
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .build();
    }

}