package com.substring.docmind.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRequestDto {

    @NotBlank(message = "Question cannot be empty")
    @Size(min = 3, max = 5000, message = "Question must be between 3 and 5000 characters")
    private String question;

    private UUID documentId;

    private List<UUID> documentIds;

    @Min(value = 1, message = "topK must be at least 1")
    @Max(value = 50, message = "topK cannot exceed 50")
    private Integer topK;

    @Min(value = 0, message = "Similarity threshold must be >= 0")
    @Max(value = 1, message = "Similarity threshold must be <= 1")
    private Double minSimilarity;

    @Pattern(regexp = "^[a-zA-Z0-9-]*$", message = "Conversation ID must contain only alphanumeric characters and hyphens")
    private String conversationId;

}
