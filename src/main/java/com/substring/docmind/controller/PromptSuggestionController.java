package com.substring.docmind.controller;

import com.substring.docmind.dto.ApiResponse;
import com.substring.docmind.dto.FollowUpSuggestionRequestDto;
import com.substring.docmind.service.PromptSuggestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat/suggestions")
@Tag(name = "Prompt Suggestions", description = "Endpoints for dynamic contextual follow-up questions and document starter prompts")
public class PromptSuggestionController {

    private final PromptSuggestionService promptSuggestionService;

    public PromptSuggestionController(PromptSuggestionService promptSuggestionService) {
        this.promptSuggestionService = promptSuggestionService;
    }

    @PostMapping("/follow-up")
    @Operation(summary = "Generate 3 contextual follow-up questions for a question & answer pair")
    public ResponseEntity<ApiResponse<List<String>>> getFollowUpSuggestions(
            @Valid @RequestBody FollowUpSuggestionRequestDto requestDto) {

        List<String> suggestions = promptSuggestionService.generateFollowUpSuggestions(
                requestDto.getQuestion(),
                requestDto.getAnswer()
        );

        return ResponseEntity.ok(
                ApiResponse.<List<String>>builder()
                        .success(true)
                        .message("Follow-up suggestions generated successfully")
                        .data(suggestions)
                        .timestamp(LocalDateTime.now())
                        .build()
        );
    }

    @GetMapping("/document/{documentId}")
    @Operation(summary = "Get 3 dynamic starter prompt questions for an uploaded document")
    public ResponseEntity<ApiResponse<List<String>>> getDocumentStarterPrompts(
            @PathVariable("documentId") UUID documentId) {

        List<String> starterPrompts = promptSuggestionService.getDocumentStarterPrompts(documentId);

        return ResponseEntity.ok(
                ApiResponse.<List<String>>builder()
                        .success(true)
                        .message("Document starter prompts retrieved successfully")
                        .data(starterPrompts)
                        .timestamp(LocalDateTime.now())
                        .build()
        );
    }
}
