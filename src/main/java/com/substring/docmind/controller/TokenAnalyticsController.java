package com.substring.docmind.controller;

import com.substring.docmind.dto.ApiResponse;
import com.substring.docmind.dto.TokenAnalyticsDto;
import com.substring.docmind.service.TokenUsageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/analytics/tokens")
@Tag(name = "Token Analytics", description = "Endpoints for token usage metrics, category breakdowns, and time-series graphing")
@Slf4j
public class TokenAnalyticsController {

    private final TokenUsageService tokenUsageService;

    public TokenAnalyticsController(TokenUsageService tokenUsageService) {
        this.tokenUsageService = tokenUsageService;
    }

    @GetMapping("/summary")
    @Operation(summary = "Get aggregated token usage and time-series graph data")
    public ResponseEntity<ApiResponse<TokenAnalyticsDto>> getTokenSummary(
            @RequestParam(required = false, defaultValue = "30") Integer days) {
        String email = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getName()
                : "anonymous";

        TokenAnalyticsDto analytics = tokenUsageService.getTokenAnalytics(email, days);

        return ResponseEntity.ok(
                ApiResponse.<TokenAnalyticsDto>builder()
                        .success(true)
                        .message("Token analytics retrieved successfully")
                        .data(analytics)
                        .timestamp(LocalDateTime.now())
                        .build()
        );
    }

    @GetMapping("/export")
    @Operation(summary = "Export token usage audit log as CSV")
    public ResponseEntity<String> exportCsv(
            @RequestParam(required = false, defaultValue = "30") Integer days) {
        String email = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getName()
                : "anonymous";

        String csv = tokenUsageService.exportCsv(email, days);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=mindora_token_usage.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }
}
