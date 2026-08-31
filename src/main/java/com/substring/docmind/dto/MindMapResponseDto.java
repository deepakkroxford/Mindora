package com.substring.docmind.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MindMapResponseDto {

    private UUID id;
    private String title;
    private List<String> documentNames;
    private MindMapNodeDto rootNode;
    private int totalNodes;
    private int tokensUsed;
    private boolean isCached;
    private LocalDateTime createdAt;
}
