package com.substring.docmind.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "mindmap_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MindMapRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String documentNames;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String rootNodeJson;

    @Column(nullable = false)
    private int totalNodes;

    @Column(nullable = false)
    private int tokensUsed;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
