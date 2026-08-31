package com.substring.docmind.repository;

import com.substring.docmind.entity.TokenUsageEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface TokenUsageEventRepository extends JpaRepository<TokenUsageEvent, UUID> {

    List<TokenUsageEvent> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("SELECT e FROM TokenUsageEvent e WHERE (:userId IS NULL OR e.userId = :userId) AND e.createdAt >= :since ORDER BY e.createdAt DESC")
    List<TokenUsageEvent> findRecentEvents(@Param("userId") UUID userId, @Param("since") LocalDateTime since);

    @Query("SELECT e.category, SUM(e.totalTokens), COUNT(e), SUM(e.promptTokens), SUM(e.completionTokens) FROM TokenUsageEvent e WHERE (:userId IS NULL OR e.userId = :userId) AND e.createdAt >= :since GROUP BY e.category")
    List<Object[]> findCategoryAggregates(@Param("userId") UUID userId, @Param("since") LocalDateTime since);
}
