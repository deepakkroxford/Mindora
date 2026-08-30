package com.substring.docmind.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_user_id_audit", columnList = "user_id"),
    @Index(name = "idx_audit_timestamp", columnList = "created_at"),
    @Index(name = "idx_action_audit", columnList = "action")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 50)
    private String action; // UPLOAD, DELETE, QUERY, LOGIN, etc.

    @Column(nullable = false, length = 50)
    private String entity; // DOCUMENT, CONVERSATION, USER, etc.

    @Column
    private String entityId;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(length = 45)
    private String ipAddress;

    @Column(length = 500)
    private String userAgent;

    @Column(nullable = false)
    @Builder.Default
    private String status = "SUCCESS"; // SUCCESS, FAILED

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
