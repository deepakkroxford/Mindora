package com.substring.docmind.repository;

import com.substring.docmind.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    /**
     * Find audit logs for a user
     */
    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    /**
     * Find audit logs by action
     */
    List<AuditLog> findByActionOrderByCreatedAtDesc(String action);

    /**
     * Find audit logs by entity
     */
    Page<AuditLog> findByEntityOrderByCreatedAtDesc(String entity, Pageable pageable);

    /**
     * Find audit logs within date range
     */
    List<AuditLog> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime startDate, LocalDateTime endDate);
}
