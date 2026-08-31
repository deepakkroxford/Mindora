package com.substring.docmind.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenEventDto {
    private UUID id;
    private String category; // CHAT, MINDMAP, QUIZ
    private int promptTokens;
    private int completionTokens;
    private int totalTokens;
    private UUID documentId;
    private String documentName;
    private String description;
    private double estimatedCost;
    private LocalDateTime createdAt;
}
