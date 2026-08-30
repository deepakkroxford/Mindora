package com.substring.docmind.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Error response details with error codes and field-level errors
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorDetailsDto {
    private String errorCode;
    private String message;
    private String path;
    private LocalDateTime timestamp;
    private Map<String, String> fieldErrors;
    private String traceId;

    public ErrorDetailsDto(String errorCode, String message) {
        this.errorCode = errorCode;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }

    public ErrorDetailsDto(String errorCode, String message, LocalDateTime timestamp) {
        this.errorCode = errorCode;
        this.message = message;
        this.timestamp = timestamp != null ? timestamp : LocalDateTime.now();
    }

    public ErrorDetailsDto(String errorCode, String message, Map<String, String> fieldErrors) {
        this.errorCode = errorCode;
        this.message = message;
        this.fieldErrors = fieldErrors;
        this.timestamp = LocalDateTime.now();
    }
}
