package com.substring.docmind.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class SearchRequestDto {

    @NotBlank(message = "Query cannot be empty")
    @Size(min = 2, max = 5000, message = "Query must be between 2 and 5000 characters")
    private String query;

    private UUID documentId;

    @Min(value = 1, message = "topK must be at least 1")
    @Max(value = 50, message = "topK cannot exceed 50")
    private Integer topK;

    @Min(value = 0, message = "Similarity search threshold must be >= 0")
    @Max(value = 1, message = "Similarity search threshold must be <= 1")
    private Double similaritySearch;



}
