package com.substring.docmind.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizSubmitResultRequestDto {

    private String quizTitle;
    private List<String> documentNames;
    private int score;
    private int totalQuestions;
    private int percentage;
    private String difficulty;
}
