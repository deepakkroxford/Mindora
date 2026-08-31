package com.substring.docmind.service;

import com.substring.docmind.dto.*;
import com.substring.docmind.entity.TokenUsageEvent;
import com.substring.docmind.entity.User;
import com.substring.docmind.repository.ChatMessageRepository;
import com.substring.docmind.repository.MindMapRecordRepository;
import com.substring.docmind.repository.TokenUsageEventRepository;
import com.substring.docmind.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class TokenUsageService {

    private final TokenUsageEventRepository tokenRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    // Blended OpenAI GPT-4o-mini pricing ($0.15 / 1M prompt, $0.60 / 1M completion)
    private static final double PROMPT_COST_PER_TOKEN = 0.00000015;
    private static final double COMPLETION_COST_PER_TOKEN = 0.00000060;
    private static final double BLENDED_COST_PER_TOKEN = 0.00000035;

    public TokenUsageService(
            TokenUsageEventRepository tokenRepository,
            UserRepository userRepository,
            JdbcTemplate jdbcTemplate) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Asynchronously records a new token usage event.
     */
    @Async
    public void recordEvent(
            UUID userId,
            String category,
            int promptTokens,
            int completionTokens,
            UUID documentId,
            String documentName,
            String description) {
        try {
            int total = promptTokens + completionTokens;
            if (total <= 0) return;

            TokenUsageEvent event = TokenUsageEvent.builder()
                    .userId(userId)
                    .category(category != null ? category.toUpperCase() : "CHAT")
                    .promptTokens(promptTokens)
                    .completionTokens(completionTokens)
                    .totalTokens(total)
                    .documentId(documentId)
                    .documentName(documentName != null ? documentName : "Document")
                    .description(description)
                    .build();

            tokenRepository.save(event);
            log.debug("Recorded token usage event: category={}, totalTokens={}", category, total);
        } catch (Exception e) {
            log.warn("Failed to record token usage event: {}", e.getMessage());
        }
    }

    /**
     * Retrieves aggregated analytics, daily time-series, and category distribution.
     */
    public TokenAnalyticsDto getTokenAnalytics(String email, Integer days) {
        UUID userId = resolveUserId(email);
        int dayWindow = (days != null && days > 0) ? days : 30;
        LocalDateTime since = LocalDateTime.now().minusDays(dayWindow);

        // Fetch all unified token events
        List<TokenUsageEvent> events = tokenRepository.findRecentEvents(userId, since);

        List<TokenEventDto> allEvents = new ArrayList<>();
        Set<UUID> seenIds = new HashSet<>();

        for (TokenUsageEvent e : events) {
            allEvents.add(mapToDto(e));
            if (e.getId() != null) seenIds.add(e.getId());
        }

        // Always supplement with historical chat_messages, mind_map_records, and quiz_attempts
        for (TokenEventDto ch : fetchHistoricalChatTokens(userId, since)) {
            if (ch.getId() != null && !seenIds.contains(ch.getId())) {
                allEvents.add(ch);
                seenIds.add(ch.getId());
            }
        }

        for (TokenEventDto mm : fetchHistoricalMindMapTokens(userId, since)) {
            if (mm.getId() != null && !seenIds.contains(mm.getId())) {
                allEvents.add(mm);
                seenIds.add(mm.getId());
            }
        }

        for (TokenEventDto qz : fetchHistoricalQuizTokens(userId, since)) {
            if (qz.getId() != null && !seenIds.contains(qz.getId())) {
                allEvents.add(qz);
                seenIds.add(qz.getId());
            }
        }

        allEvents.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));

        // Aggregate statistics
        long totalTokensPeriod = allEvents.stream().mapToLong(TokenEventDto::getTotalTokens).sum();
        long totalOperations = allEvents.size();
        double totalCost = allEvents.stream().mapToDouble(TokenEventDto::getEstimatedCost).sum();
        double dailyAvg = dayWindow > 0 ? (double) totalTokensPeriod / dayWindow : 0;

        // Group by category (CHAT, MINDMAP, QUIZ)
        Map<String, TokenCategorySummaryDto> categoryMap = new LinkedHashMap<>();
        List<String> standardCategories = List.of("CHAT", "MINDMAP", "QUIZ");
        for (String cat : standardCategories) {
            List<TokenEventDto> catEvents = allEvents.stream()
                    .filter(e -> e.getCategory().equalsIgnoreCase(cat))
                    .toList();

            long catTokens = catEvents.stream().mapToLong(TokenEventDto::getTotalTokens).sum();
            long catPrompt = catEvents.stream().mapToLong(TokenEventDto::getPromptTokens).sum();
            long catComp = catEvents.stream().mapToLong(TokenEventDto::getCompletionTokens).sum();
            double catCost = catEvents.stream().mapToDouble(TokenEventDto::getEstimatedCost).sum();
            double pct = totalTokensPeriod > 0 ? ((double) catTokens / totalTokensPeriod) * 100.0 : 0.0;

            categoryMap.put(cat, TokenCategorySummaryDto.builder()
                    .category(cat)
                    .totalTokens(catTokens)
                    .requestCount(catEvents.size())
                    .promptTokens(catPrompt)
                    .completionTokens(catComp)
                    .estimatedCost(catCost)
                    .percentage(Math.round(pct * 10.0) / 10.0)
                    .build());
        }

        // Build continuous daily time-series for the past N days
        List<DailyTokenUsageDto> dailyUsage = buildDailyTimeSeries(allEvents, dayWindow);

        return TokenAnalyticsDto.builder()
                .totalTokensAllTime(totalTokensPeriod)
                .totalTokensPeriod(totalTokensPeriod)
                .totalEstimatedCost(Math.round(totalCost * 10000.0) / 10000.0)
                .totalOperations(totalOperations)
                .dailyAverageTokens(Math.round(dailyAvg))
                .categoryBreakdown(categoryMap)
                .dailyUsage(dailyUsage)
                .recentEvents(allEvents.stream().limit(50).collect(Collectors.toList()))
                .build();
    }

    /**
     * Builds continuous date time-series so graphs are unbroken.
     */
    private List<DailyTokenUsageDto> buildDailyTimeSeries(List<TokenEventDto> events, int days) {
        Map<String, List<TokenEventDto>> grouped = events.stream()
                .collect(Collectors.groupingBy(e -> e.getCreatedAt().toLocalDate().toString()));

        List<DailyTokenUsageDto> series = new ArrayList<>();
        LocalDate start = LocalDate.now().minusDays(days - 1);
        LocalDate end = LocalDate.now();

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDate cur = start;
        while (!cur.isAfter(end)) {
            String dateKey = cur.format(dtf);
            List<TokenEventDto> dayEvents = grouped.getOrDefault(dateKey, Collections.emptyList());

            long chat = dayEvents.stream()
                    .filter(e -> "CHAT".equalsIgnoreCase(e.getCategory()))
                    .mapToLong(TokenEventDto::getTotalTokens).sum();

            long mindMap = dayEvents.stream()
                    .filter(e -> "MINDMAP".equalsIgnoreCase(e.getCategory()))
                    .mapToLong(TokenEventDto::getTotalTokens).sum();

            long quiz = dayEvents.stream()
                    .filter(e -> "QUIZ".equalsIgnoreCase(e.getCategory()))
                    .mapToLong(TokenEventDto::getTotalTokens).sum();

            long dayTotal = chat + mindMap + quiz;
            double dayCost = dayEvents.stream().mapToDouble(TokenEventDto::getEstimatedCost).sum();

            series.add(DailyTokenUsageDto.builder()
                    .date(dateKey)
                    .chatTokens(chat)
                    .mindMapTokens(mindMap)
                    .quizTokens(quiz)
                    .totalTokens(dayTotal)
                    .estimatedCost(dayCost)
                    .build());

            cur = cur.plusDays(1);
        }

        return series;
    }

    /**
     * Exports token usage events as a professionally formatted CSV with executive summary and audit log.
     */
    public String exportCsv(String email, Integer days) {
        TokenAnalyticsDto analytics = getTokenAnalytics(email, days);
        StringBuilder sb = new StringBuilder();

        // 1. Executive Metadata Banner
        sb.append("# ==============================================================================\n");
        sb.append("# MINDORA ENTERPRISE RAG — TOKEN USAGE & COST AUDIT REPORT\n");
        sb.append(String.format("# Generated At: %s | User: %s | Period: %s\n",
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                email != null ? email : "Anonymous",
                days == 1 ? "Today (1 Day)" : ("Last " + days + " Days")));
        sb.append("# ==============================================================================\n");
        sb.append(String.format("# SUMMARY METRICS:\n"));
        sb.append(String.format("# Total Tokens: %d | Total Cost: $%.5f USD | Total Operations: %d\n",
                analytics.getTotalTokensPeriod(),
                analytics.getTotalEstimatedCost(),
                analytics.getTotalOperations()));
        sb.append(String.format("# Daily Average: %.0f tokens/day | Model Basis: OpenAI GPT-4o-mini\n",
                analytics.getDailyAverageTokens()));
        sb.append("# ------------------------------------------------------------------------------\n");
        sb.append("# CATEGORY BREAKDOWN SUMMARY:\n");
        sb.append("Category,Total Tokens,Prompt Tokens,Output Tokens,Operations,Est Cost (USD),Share Percentage\n");

        if (analytics.getCategoryBreakdown() != null) {
            for (TokenCategorySummaryDto cat : analytics.getCategoryBreakdown().values()) {
                sb.append(String.format("\"%s\",%d,%d,%d,%d,%.6f,%.1f%%\n",
                        cat.getCategory(),
                        cat.getTotalTokens(),
                        cat.getPromptTokens(),
                        cat.getCompletionTokens(),
                        cat.getRequestCount(),
                        cat.getEstimatedCost(),
                        cat.getPercentage()));
            }
        }

        sb.append("# ==============================================================================\n");
        sb.append("# DETAILED AUDIT TRAIL LOGS:\n");
        sb.append("Event ID,Timestamp,Category,Prompt Tokens,Output Tokens,Total Tokens,Est Cost (USD),Document Scope,Operation Description\n");

        for (TokenEventDto e : analytics.getRecentEvents()) {
            sb.append(String.format("\"%s\",\"%s\",\"%s\",%d,%d,%d,%.6f,\"%s\",\"%s\"\n",
                    e.getId(),
                    e.getCreatedAt(),
                    e.getCategory(),
                    e.getPromptTokens(),
                    e.getCompletionTokens(),
                    e.getTotalTokens(),
                    e.getEstimatedCost(),
                    e.getDocumentName() != null ? e.getDocumentName().replace("\"", "\"\"") : "Workspace",
                    e.getDescription() != null ? e.getDescription().replace("\"", "\"\"") : ""
            ));
        }
        return sb.toString();
    }

    private TokenEventDto mapToDto(TokenUsageEvent e) {
        double cost = (e.getPromptTokens() * PROMPT_COST_PER_TOKEN) + (e.getCompletionTokens() * COMPLETION_COST_PER_TOKEN);
        if (cost <= 0) cost = e.getTotalTokens() * BLENDED_COST_PER_TOKEN;

        return TokenEventDto.builder()
                .id(e.getId())
                .category(e.getCategory())
                .promptTokens(e.getPromptTokens())
                .completionTokens(e.getCompletionTokens())
                .totalTokens(e.getTotalTokens())
                .documentId(e.getDocumentId())
                .documentName(e.getDocumentName())
                .description(e.getDescription())
                .estimatedCost(cost)
                .createdAt(e.getCreatedAt())
                .build();
    }

    private List<TokenEventDto> fetchHistoricalChatTokens(UUID userId, LocalDateTime since) {
        try {
            String sql = "SELECT id, question, prompt_tokens, completion_tokens, total_tokens, created_at, document_id FROM chat_messages WHERE created_at >= ? ORDER BY created_at DESC";
            return jdbcTemplate.query(sql, (rs, rowNum) -> {
                int p = rs.getInt("prompt_tokens");
                int c = rs.getInt("completion_tokens");
                int t = rs.getInt("total_tokens");
                if (t <= 0) t = p + c;
                double cost = (p * PROMPT_COST_PER_TOKEN) + (c * COMPLETION_COST_PER_TOKEN);

                return TokenEventDto.builder()
                        .id(rs.getObject("id", UUID.class))
                        .category("CHAT")
                        .promptTokens(p)
                        .completionTokens(c)
                        .totalTokens(t)
                        .description(rs.getString("question"))
                        .estimatedCost(cost > 0 ? cost : t * BLENDED_COST_PER_TOKEN)
                        .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
                        .build();
            }, since);
        } catch (Exception e) {
            log.debug("Historical chat tokens query: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<TokenEventDto> fetchHistoricalMindMapTokens(UUID userId, LocalDateTime since) {
        try {
            String sql = "SELECT id, title, document_id, tokens_used, created_at FROM mind_map_records WHERE created_at >= ? ORDER BY created_at DESC";
            return jdbcTemplate.query(sql, (rs, rowNum) -> {
                int t = rs.getInt("tokens_used");
                return TokenEventDto.builder()
                        .id(rs.getObject("id", UUID.class))
                        .category("MINDMAP")
                        .promptTokens((int) (t * 0.7))
                        .completionTokens((int) (t * 0.3))
                        .totalTokens(t)
                        .description("Mind Map: " + rs.getString("title"))
                        .estimatedCost(t * BLENDED_COST_PER_TOKEN)
                        .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
                        .build();
            }, since);
        } catch (Exception e) {
            log.debug("Historical mind map tokens query: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<TokenEventDto> fetchHistoricalQuizTokens(UUID userId, LocalDateTime since) {
        try {
            String sql = "SELECT id, quiz_title, document_names, total_questions, created_at FROM quiz_attempts WHERE created_at >= ? ORDER BY created_at DESC";
            return jdbcTemplate.query(sql, (rs, rowNum) -> {
                int qCount = rs.getInt("total_questions");
                if (qCount <= 0) qCount = 5;
                int promptT = 450 + (qCount * 40);
                int compT = qCount * 120;
                int total = promptT + compT;
                double cost = (promptT * PROMPT_COST_PER_TOKEN) + (compT * COMPLETION_COST_PER_TOKEN);

                return TokenEventDto.builder()
                        .id(rs.getObject("id", UUID.class))
                        .category("QUIZ")
                        .promptTokens(promptT)
                        .completionTokens(compT)
                        .totalTokens(total)
                        .documentName(rs.getString("document_names"))
                        .description("AI Quiz: " + rs.getString("quiz_title"))
                        .estimatedCost(cost > 0 ? cost : total * BLENDED_COST_PER_TOKEN)
                        .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
                        .build();
            }, since);
        } catch (Exception e) {
            log.debug("Historical quiz tokens query: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private UUID resolveUserId(String email) {
        if (email == null || email.isBlank() || "anonymous".equals(email)) return null;
        return userRepository.findByEmail(email).map(User::getId).orElse(null);
    }
}
