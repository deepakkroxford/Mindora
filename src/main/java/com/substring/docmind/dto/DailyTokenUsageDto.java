package com.substring.docmind.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyTokenUsageDto {
    private String date; // YYYY-MM-DD
    private long chatTokens;
    private long mindMapTokens;
    private long quizTokens;
    private long totalTokens;
    private double estimatedCost;
}
