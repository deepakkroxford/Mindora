package com.substring.docmind.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizQuestionDto {

    private String id;
    private String question;
    private List<String> options;
    private int correctOptionIndex;
    private String explanation;
    private String sourceSnippet;
}
