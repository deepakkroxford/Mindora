package com.substring.docmind.exception;

import lombok.Getter;

/**
 * Standard error codes for API responses
 */
@Getter
public enum ErrorCode {
    // Validation errors (4001-4099)
    VALIDATION_ERROR("4001", "Validation failed"),
    INVALID_INPUT("4002", "Invalid input provided"),
    FILE_SIZE_EXCEEDED("4003", "File size exceeds maximum allowed limit"),
    UNSUPPORTED_FILE_TYPE("4004", "File type not supported"),
    EMPTY_QUESTION("4005", "Question cannot be empty"),
    EMPTY_QUERY("4006", "Query cannot be empty"),

    // Authentication/Authorization errors (4011-4099)
    UNAUTHORIZED("4011", "Unauthorized access"),
    FORBIDDEN("4012", "Forbidden resource access"),
    INVALID_CREDENTIALS("4013", "Invalid credentials provided"),

    // Resource errors (4041-4099)
    RESOURCE_NOT_FOUND("4041", "Resource not found"),
    DOCUMENT_NOT_FOUND("4042", "Document not found"),

    // Processing errors (4221-4299)
    DOCUMENT_PROCESSING_FAILED("4221", "Failed to process document"),
    INDEXING_FAILED("4222", "Failed to index document"),
    EMBEDDING_FAILED("4223", "Failed to create embeddings"),
    CHAT_FAILED("4224", "Chat request failed"),

    // Rate limiting (4291-4299)
    RATE_LIMIT_EXCEEDED("4291", "You're sending requests too quickly! Please wait a minute and try again."),

    // Server errors (5001-5099)
    INTERNAL_SERVER_ERROR("5001", "Internal server error"),
    DATABASE_ERROR("5002", "Database operation failed"),
    EXTERNAL_SERVICE_ERROR("5003", "External service unavailable");

    private final String code;
    private final String message;

    ErrorCode(String code, String message) {
        this.code = code;
        this.message = message;
    }
}
