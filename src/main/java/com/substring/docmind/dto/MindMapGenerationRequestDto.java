package com.substring.docmind.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MindMapGenerationRequestDto {

    private List<UUID> documentIds;
    private Integer maxDepth; // default 3
    private String focusArea;
}
