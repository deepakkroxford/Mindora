package com.substring.docmind.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class DocumentChunkDto {

    private UUID id;
    private UUID documentId;
    private Integer chunkIndex;
    private Integer pageNumber;
    private String content;
    private Integer charLength;
    private Integer estimatedTokens;
    private Map<String, Object> metadata;
}
