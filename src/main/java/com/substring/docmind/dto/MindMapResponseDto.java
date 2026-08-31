package com.substring.docmind.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class MindMapResponseDto {

    private UUID id;
    private String title;
    private List<String> documentNames;
    private MindMapNodeDto rootNode;
    private Integer totalNodes;
    private Integer tokensUsed;

    @JsonProperty("isCached")
    private Boolean isCached;

    private LocalDateTime createdAt;
}
