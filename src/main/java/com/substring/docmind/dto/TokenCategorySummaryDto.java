package com.substring.docmind.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenCategorySummaryDto {
    private String category; // CHAT, MINDMAP, QUIZ
    private long totalTokens;
    private long requestCount;
    private long promptTokens;
    private long completionTokens;
    private double estimatedCost;
    private double percentage;
}
