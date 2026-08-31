package com.substring.docmind.dto;

import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CitationDto {

    private UUID documentId;
    private String fileName;
    private Integer chunkIndex;
    private Integer pageNumber;
    private String snippet;
    private Double similarityScore;
    private Map<String, Object> metadata;

    @Builder.Default
    private List<DocumentDiagramDto> diagrams = new ArrayList<>();
}
