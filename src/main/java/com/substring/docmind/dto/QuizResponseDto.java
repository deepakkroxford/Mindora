package com.substring.docmind.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizResponseDto {

    private String title;
    private List<String> documentNames;
    private List<QuizQuestionDto> questions;
    private String difficulty;
    private boolean isCached;
}
