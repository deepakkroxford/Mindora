package com.substring.docmind.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizGenerationRequestDto {

    private List<UUID> documentIds;

    @Builder.Default
    private int numQuestions = 5;

    @Builder.Default
    private String difficulty = "medium"; // easy, medium, hard

    private String focusArea;
}
