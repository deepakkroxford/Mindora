package com.substring.docmind.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenAnalyticsDto {
    private long totalTokensAllTime;
    private long totalTokensPeriod;
    private double totalEstimatedCost;
    private long totalOperations;
    private double dailyAverageTokens;
    private Map<String, TokenCategorySummaryDto> categoryBreakdown;
    private List<DailyTokenUsageDto> dailyUsage;
    private List<TokenEventDto> recentEvents;
}
