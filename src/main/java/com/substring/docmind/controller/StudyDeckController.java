package com.substring.docmind.controller;

import com.substring.docmind.dto.*;
import com.substring.docmind.service.StudyDeckService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/study")
@Tag(name = "Study & Quiz Deck", description = "Endpoints for generating AI quizzes and interactive study flashcards from documents")
public class StudyDeckController {

    private final StudyDeckService studyDeckService;

    public StudyDeckController(StudyDeckService studyDeckService) {
        this.studyDeckService = studyDeckService;
    }

    @PostMapping("/quiz")
    @Operation(summary = "Generate interactive multiple-choice quiz for selected document(s)")
    public ResponseEntity<ApiResponse<QuizResponseDto>> generateQuiz(
            @RequestBody QuizGenerationRequestDto request) {

        QuizResponseDto quiz = studyDeckService.generateQuiz(request);

        return ResponseEntity.ok(
                ApiResponse.<QuizResponseDto>builder()
                        .success(true)
                        .message("Quiz generated successfully")
                        .data(quiz)
                        .timestamp(LocalDateTime.now())
                        .build()
        );
    }

    @PostMapping("/flashcards")
    @Operation(summary = "Generate interactive study flashcards for selected document(s)")
    public ResponseEntity<ApiResponse<FlashcardDeckResponseDto>> generateFlashcards(
            @RequestBody QuizGenerationRequestDto request) {

        FlashcardDeckResponseDto deck = studyDeckService.generateFlashcards(request);

        return ResponseEntity.ok(
                ApiResponse.<FlashcardDeckResponseDto>builder()
                        .success(true)
                        .message("Flashcard deck generated successfully")
                        .data(deck)
                        .timestamp(LocalDateTime.now())
                        .build()
        );
    }

    @PostMapping("/quiz/submit")
    @Operation(summary = "Persist a completed quiz attempt and score to PostgreSQL")
    public ResponseEntity<ApiResponse<QuizAttemptResponseDto>> submitQuiz(
            @RequestBody QuizSubmitResultRequestDto request,
            java.security.Principal principal) {

        String userEmail = principal != null ? principal.getName() : null;
        QuizAttemptResponseDto saved = studyDeckService.saveQuizAttempt(request, userEmail);

        return ResponseEntity.ok(
                ApiResponse.<QuizAttemptResponseDto>builder()
                        .success(true)
                        .message("Quiz score saved successfully")
                        .data(saved)
                        .timestamp(LocalDateTime.now())
                        .build()
        );
    }

    @GetMapping("/quiz/history")
    @Operation(summary = "Get user's historical quiz attempts and performance records")
    public ResponseEntity<ApiResponse<java.util.List<QuizAttemptResponseDto>>> getQuizHistory(
            java.security.Principal principal) {

        String userEmail = principal != null ? principal.getName() : null;
        java.util.List<QuizAttemptResponseDto> history = studyDeckService.getQuizHistory(userEmail);

        return ResponseEntity.ok(
                ApiResponse.<java.util.List<QuizAttemptResponseDto>>builder()
                        .success(true)
                        .message("Quiz history retrieved successfully")
                        .data(history)
                        .timestamp(LocalDateTime.now())
                        .build()
        );
    }
}
