package com.substring.docmind.controller;

import com.substring.docmind.dto.*;
import com.substring.docmind.service.RagService;
import io.micrometer.core.instrument.search.Search;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import javax.naming.directory.SearchResult;
import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
@Tag(name = "Chat Management", description = "All chat related apis goes here.")
@RequiredArgsConstructor
public class ChatController {

        private final RagService ragService;

        @PostMapping("/query")
        @Operation(summary = "Ask a question against all documents or a specific document with citations")
        public ResponseEntity<ApiResponse<ChatResponseDto>> askQuestion(
                        @Valid @RequestBody ChatRequestDto requestDto) {

                ChatResponseDto chatResponseDto = ragService.askQuestion(requestDto);
                return ResponseEntity.ok(
                                ApiResponse.<ChatResponseDto>builder()
                                                .success(true)
                                                .message(null)
                                                .data(chatResponseDto)
                                                .timestamp(LocalDateTime.now())
                                                .build());

        }

        @PostMapping("/stream")
        @Operation(summary = "Stream real-time Q&A answer tokens via Server-Sent Events (SSE)")
        public Flux<String> streamQuestion(
                        @Valid @RequestBody ChatRequestDto requestDto) {
                return ragService.streamQuestionAnswer(requestDto);
        }

        @PostMapping("/search/similarity")
        @Operation(summary = "Perform semantic similarity search on stored document vectors")
        public ResponseEntity<ApiResponse<SearchResultDto>> searchSimilar(
                        @Valid @RequestBody SearchRequestDto request) {
                SearchResultDto results = ragService.searchSimilarChunks(request);
                return ResponseEntity.ok(
                                ApiResponse.<SearchResultDto>builder()
                                                .success(true)
                                                .message(null)
                                                .data(results)
                                                .timestamp(LocalDateTime.now())
                                                .build());
        }

        @GetMapping("/conversations")
        @Operation(summary = "Get all conversations for the authenticated user")
        public ResponseEntity<ApiResponse<java.util.List<ConversationDto>>> getConversations() {
                java.util.List<ConversationDto> conversations = ragService.getConversations();
                return ResponseEntity.ok(
                                ApiResponse.<java.util.List<ConversationDto>>builder()
                                                .success(true)
                                                .message(null)
                                                .data(conversations)
                                                .timestamp(LocalDateTime.now())
                                                .build());
        }

        @GetMapping("/conversations/{conversationId}/messages")
        @Operation(summary = "Get all messages in a conversation")
        public ResponseEntity<ApiResponse<java.util.List<ChatMessageDto>>> getMessages(
                        @PathVariable UUID conversationId) {
                java.util.List<ChatMessageDto> messages = ragService.getMessages(conversationId);
                return ResponseEntity.ok(
                                ApiResponse.<java.util.List<ChatMessageDto>>builder()
                                                .success(true)
                                                .message(null)
                                                .data(messages)
                                                .timestamp(LocalDateTime.now())
                                                .build());
        }

        @DeleteMapping("/conversations/{conversationId}")
        @Operation(summary = "Delete a conversation and all its messages")
        public ResponseEntity<ApiResponse<Void>> deleteConversation(@PathVariable UUID conversationId) {
                ragService.deleteConversation(conversationId);
                return ResponseEntity.ok(
                                ApiResponse.<Void>builder()
                                                .success(true)
                                                .message("Conversation deleted successfully")
                                                .timestamp(LocalDateTime.now())
                                                .build());
        }

}