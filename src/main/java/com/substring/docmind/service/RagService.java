package com.substring.docmind.service;

import com.substring.docmind.config.AppProperties;
import com.substring.docmind.dto.*;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.Filter;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.time.LocalDateTime;

import com.substring.docmind.entity.*;
import com.substring.docmind.repository.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
@RequiredArgsConstructor
public class RagService {
    private static final Logger log = LoggerFactory.getLogger(RagService.class);

    private final VectorStore vectorStore;
    private final AppProperties appProperties;
    private final ChatClient chatClient;
    private final ConversationRepository conversationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final PlatformTransactionManager transactionManager;

    /**
     * Approximate token estimation (~3.8 characters per token)
     */
    private int estimateTokens(String text) {
        if (text == null || text.isBlank()) return 0;
        return Math.max(1, (int) Math.ceil(text.length() / 3.8));
    }

    /**
     * Helper method to find or create a conversation and save the chat question & answer with token metadata.
     * Uses TransactionTemplate to ensure commits succeed on both synchronous request threads and async Reactor stream threads.
     */
    public Conversation saveConversationAndMessage(
            String email,
            ChatRequestDto request,
            String answer,
            List<CitationDto> citationDtos,
            Integer promptTokens,
            Integer completionTokens,
            Integer totalTokens
    ) {
        if (email == null || email.equals("anonymousUser")) {
            log.warn("Cannot save conversation: unauthenticated user ({})", email);
            return null;
        }

        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        return tx.execute(status -> {
            try {
                User user = userRepository.findByEmail(email).orElse(null);
                if (user == null) {
                    log.warn("Cannot save conversation: user with email {} not found", email);
                    return null;
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
                    conversation = conversationRepository.findByIdAndUserId(conversationUuid, user.getId()).orElse(null);
                }

                if (conversation == null) {
                    String title = request.getQuestion().length() > 60 
                            ? request.getQuestion().substring(0, 57) + "..." 
                            : request.getQuestion();
                    conversation = Conversation.builder()
                            .user(user)
                            .title(title)
                            .messageCount(0)
                            .build();
                    conversation = conversationRepository.saveAndFlush(conversation);
                    log.info("Created new conversation: id={}, title='{}' for user={}", conversation.getId(), title, email);
                }

                Double topSimilarityScore = (citationDtos != null && !citationDtos.isEmpty())
                        ? citationDtos.get(0).getSimilarityScore()
                        : null;

                ChatMessage chatMessage = ChatMessage.builder()
                        .conversation(conversation)
                        .question(request.getQuestion())
                        .answer(answer)
                        .documentId(request.getDocumentId())
                        .similarityScore(topSimilarityScore)
                        .promptTokens(promptTokens)
                        .completionTokens(completionTokens)
                        .totalTokens(totalTokens)
                        .build();
                chatMessageRepository.saveAndFlush(chatMessage);
                log.info("Saved chat message id={} for conversation id={} (tokens: prompt={}, completion={}, total={})",
                        chatMessage.getId(), conversation.getId(), promptTokens, completionTokens, totalTokens);

                conversation.setMessageCount(conversation.getMessageCount() + 1);
                return conversationRepository.saveAndFlush(conversation);
            } catch (Exception e) {
                log.error("Exception occurred while persisting conversation and message", e);
                status.setRollbackOnly();
                return null;
            }
        });
    }

    // to ask any thing related to document
    @Transactional
    public ChatResponseDto askQuestion(ChatRequestDto request) {

        long startTime = System.currentTimeMillis();
        log.info("Processing query: '{}', scoped documentId: {}", request.getQuestion(), request.getDocumentId());
        List<Document> similarDocuments = this.retrieveRelevantDocuments(request.getQuestion(), request.getDocumentId(),
                request.getTopK(), request.getMinSimilarity());

        List<CitationDto> citationDtos = similarDocuments.stream().map(this::mapToCitation).toList();

        String contextText = buildContextString(similarDocuments);

        String prompt = buildPrompt(request.getQuestion(), contextText);

        var chatResponse = this.chatClient.prompt().user(prompt).call().chatResponse();
        String answer = chatResponse != null && chatResponse.getResult() != null && chatResponse.getResult().getOutput() != null
                ? chatResponse.getResult().getOutput().getText()
                : "";

        long responseTime = System.currentTimeMillis() - startTime;
        log.info("Completed Q&A in {} ms with {} citations", responseTime, citationDtos.size());

        // Token usage calculation
        int promptTokens = estimateTokens(prompt);
        int completionTokens = estimateTokens(answer);
        if (chatResponse != null && chatResponse.getMetadata() != null && chatResponse.getMetadata().getUsage() != null) {
            var usage = chatResponse.getMetadata().getUsage();
            if (usage.getPromptTokens() != null && usage.getPromptTokens() > 0) {
                promptTokens = usage.getPromptTokens().intValue();
            }
            if (usage.getGenerationTokens() != null && usage.getGenerationTokens() > 0) {
                completionTokens = usage.getGenerationTokens().intValue();
            }
        }
        int totalTokens = promptTokens + completionTokens;

        Double topSimilarityScore = !citationDtos.isEmpty() ? citationDtos.get(0).getSimilarityScore() : null;

        // Get current authenticated user and save history
        String email = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getName()
                : null;
        Conversation savedConv = saveConversationAndMessage(email, request, answer, citationDtos, promptTokens, completionTokens, totalTokens);
        String convIdResult = savedConv != null ? savedConv.getId().toString() : request.getConversationId();

        return ChatResponseDto.builder()
                .answer(answer)
                .conversationId(convIdResult)
                .citations(citationDtos)
                .responseTimeMs(responseTime)
                .similarityScore(topSimilarityScore)
                .promptTokens(promptTokens)
                .completionTokens(completionTokens)
                .totalTokens(totalTokens)
                .build();
    }

    // this streams
    public Flux<String> streamQuestionAnswer(ChatRequestDto requestDto) {
        log.info("Streaming query: '{}'", requestDto.getQuestion());
        List<Document> relevantDocuments = retrieveRelevantDocuments(
                requestDto.getQuestion(),
                requestDto.getDocumentId(),
                requestDto.getTopK(),
                requestDto.getMinSimilarity());
        String contextText = buildContextString(relevantDocuments);
        String userPrompt = buildPrompt(requestDto.getQuestion(), contextText);

        final List<CitationDto> citationDtos = relevantDocuments.stream().map(this::mapToCitation).toList();
        final String email = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getName()
                : null;

        final int promptTokens = estimateTokens(userPrompt);
        StringBuilder fullAnswer = new StringBuilder();

        return chatClient.prompt()
                .user(userPrompt)
                .stream()
                .content()
                .doOnNext(token -> fullAnswer.append(token))
                .doOnComplete(() -> {
                    if (email != null && !email.equals("anonymousUser")) {
                        try {
                            String answer = fullAnswer.toString();
                            int completionTokens = estimateTokens(answer);
                            int totalTokens = promptTokens + completionTokens;
                            saveConversationAndMessage(email, requestDto, answer, citationDtos, promptTokens, completionTokens, totalTokens);
                        } catch (Exception e) {
                            log.error("Failed to save streaming message to conversation history for user {}", email, e);
                        }
                    }
                });
    }

    private String buildPrompt(@NotBlank(message = "Question cannot be empty") String question, String contextText) {

        if (contextText != null && !contextText.isBlank()) {
            return String.format(
                    """
                                   Document Context:
                                   ---------------------
                                   %s
                                   ---------------------
                                   User Message / Question: %s
                                   Instructions:
                                   - If the user's question relates to the document context above, prioritize answering using that context and reference key sections.
                                   - If the user is asking a general question, greeting, or discussing topics beyond the document context, respond helpfully and conversationally using your general knowledge while weaving in relevant document context if applicable

                            """,
                    contextText, question);
        } else {
            return String.format(
                    """
                               User Message / Question:
                               %s
                               Instructions:
                                  - Respond helpfully, accurately, and conversationally to the user's message using your broad knowledge base.

                            """,
                    question);
        }

    }

    private String buildContextString(List<Document> similarDocuments) {
        if (similarDocuments == null || similarDocuments.isEmpty()) {
            return "";
        }

        return similarDocuments.stream().map(doc -> {
            String fileName = (String) doc.getMetadata().getOrDefault("fileName", "Unknown File");
            Object page = doc.getMetadata().getOrDefault("pageNumber", "N/A");
            return String.format("[Source: %s | Page: %s]\n%s", fileName, page, doc.getText());
        }).collect(Collectors.joining("\n\n---\n\n"));

    }

    public SearchResultDto searchSimilarChunks(SearchRequestDto request) {

        java.util.List<Document> matchedDocs = retrieveRelevantDocuments(request.getQuery(), request.getDocumentId(),
                request.getTopK(), request.getSimilaritySearch());

        List<CitationDto> citations = matchedDocs.stream().map(this::mapToCitation).toList();

        return SearchResultDto.builder().query(request.getQuery()).totalMatches(citations.size()).matches(citations)
                .build();

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
        }
        return CitationDto.builder().documentId(docId).fileName((String) meta.getOrDefault("fileName", "Unknown"))
                .chunkIndex(chunkIndex).pageNumber(pageNumber).snippet(document.getText()).similarityScore(score)
                .metadata(meta).build();
    }

    private List<Document> retrieveRelevantDocuments(@NotBlank(message = "Query cannot be empty") String query,
            UUID documentId, Integer topK, Double similaritySearch) {

        int effectiveTopK = (topK != null && topK > 0) ? topK : appProperties.getRag().getTopK();
        double effectiveSimilarity = (similaritySearch != null) ? similaritySearch
                : appProperties.getRag().getSimilarityThreshold();

        SearchRequest.Builder searchRequestBuilder = SearchRequest.builder().query(query).topK(effectiveTopK);

        if (effectiveSimilarity > 0.0) {
            searchRequestBuilder.similarityThreshold(effectiveSimilarity);
        }

        if (documentId != null) {
            log.info("Filtering from document :");
            FilterExpressionBuilder b = new FilterExpressionBuilder();
            Filter.Expression documentId1 = b.eq("documentId", documentId.toString()).build();
            searchRequestBuilder.filterExpression(documentId1);
        }

        try {
            List<Document> documents = vectorStore.similaritySearch(searchRequestBuilder.build());
            log.info("Retrieved {} chunks for query: '{}' (scoped docId: {})", documents.size(), query, documentId);
            return documents;
        } catch (Exception e) {
            log.error("Similarity search failed for query: '{}'", query, e);
            return Collections.emptyList();
        }

    }

    /**
     * Get list of conversations for the logged in user
     */
    @Transactional(readOnly = true)
    public List<ConversationDto> getConversations() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        if (email == null || email.equals("anonymousUser")) {
            return Collections.emptyList();
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

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
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        if (email == null || email.equals("anonymousUser")) {
            return Collections.emptyList();
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Conversation conversation = conversationRepository.findByIdAndUserId(conversationId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found or access denied"));

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

}