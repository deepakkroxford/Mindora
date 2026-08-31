package com.substring.docmind.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizAttemptResponseDto {

    private UUID id;
    private String quizTitle;
    private List<String> documentNames;
    private int score;
    private int totalQuestions;
    private int percentage;
    private String difficulty;
    private LocalDateTime createdAt;
}
