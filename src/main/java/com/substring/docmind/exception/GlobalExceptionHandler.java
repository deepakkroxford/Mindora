package com.substring.docmind.exception;

import com.substring.docmind.dto.ApiResponse;
import com.substring.docmind.dto.ErrorDetailsDto;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handle resource not found exceptions
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<ErrorDetailsDto>> handleNotFound(ResourceNotFoundException ex) {
        logger.warn("Resource not found: {}", ex.getMessage());

        ErrorDetailsDto error = new ErrorDetailsDto(
                ErrorCode.RESOURCE_NOT_FOUND.getCode(),
                ErrorCode.RESOURCE_NOT_FOUND.getMessage(),
                LocalDateTime.now());
        error.setTraceId(UUID.randomUUID().toString());

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                ApiResponse.<ErrorDetailsDto>builder()
                        .success(false)
                        .message(ex.getMessage())
                        .data(error)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * Handle document processing exceptions
     */
    @ExceptionHandler(DocumentProcessingException.class)
    public ResponseEntity<ApiResponse<ErrorDetailsDto>> handleProcessingError(DocumentProcessingException ex) {
        logger.error("Document processing error: {}", ex.getMessage(), ex);

        ErrorDetailsDto error = new ErrorDetailsDto(
                ErrorCode.DOCUMENT_PROCESSING_FAILED.getCode(),
                ErrorCode.DOCUMENT_PROCESSING_FAILED.getMessage(),
                LocalDateTime.now());
        error.setTraceId(UUID.randomUUID().toString());

        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(
                ApiResponse.<ErrorDetailsDto>builder()
                        .success(false)
                        .message("Failed to process document: " + ex.getMessage())
                        .data(error)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * Handle file size exceeded exceptions
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<ErrorDetailsDto>> handleMaxSize(MaxUploadSizeExceededException ex) {
        logger.warn("File size limit exceeded: {}", ex.getMessage());

        ErrorDetailsDto error = new ErrorDetailsDto(
                ErrorCode.FILE_SIZE_EXCEEDED.getCode(),
                ErrorCode.FILE_SIZE_EXCEEDED.getMessage(),
                LocalDateTime.now());
        error.setTraceId(UUID.randomUUID().toString());

        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(
                ApiResponse.<ErrorDetailsDto>builder()
                        .success(false)
                        .message("File size exceeds the allowed limit (25MB)")
                        .data(error)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * Handle validation exceptions with field-level error details
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<ErrorDetailsDto>> handleValidation(MethodArgumentNotValidException ex) {
        logger.warn("Validation error: {}", ex.getMessage());

        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }

        ErrorDetailsDto error = new ErrorDetailsDto(
                ErrorCode.VALIDATION_ERROR.getCode(),
                ErrorCode.VALIDATION_ERROR.getMessage(),
                fieldErrors);
        error.setTraceId(UUID.randomUUID().toString());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                ApiResponse.<ErrorDetailsDto>builder()
                        .success(false)
                        .message("Validation Failed")
                        .data(error)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * Handle rate limit exceeded exceptions (HTTP 429)
     */
    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ApiResponse<ErrorDetailsDto>> handleRateLimit(RateLimitExceededException ex) {
        logger.warn("Rate limit exceeded: {}", ex.getMessage());

        ErrorDetailsDto error = new ErrorDetailsDto(
                ErrorCode.RATE_LIMIT_EXCEEDED.getCode(),
                ex.getMessage(),
                LocalDateTime.now());
        error.setTraceId(UUID.randomUUID().toString());

        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(
                ApiResponse.<ErrorDetailsDto>builder()
                        .success(false)
                        .message(ex.getMessage())
                        .data(error)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * Handle illegal argument exceptions
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<ErrorDetailsDto>> handleIllegalArgument(IllegalArgumentException ex) {
        logger.warn("Illegal argument: {}", ex.getMessage());

        ErrorDetailsDto error = new ErrorDetailsDto(
                ErrorCode.INVALID_INPUT.getCode(),
                ErrorCode.INVALID_INPUT.getMessage(),
                LocalDateTime.now());
        error.setTraceId(UUID.randomUUID().toString());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                ApiResponse.<ErrorDetailsDto>builder()
                        .success(false)
                        .message(ex.getMessage())
                        .data(error)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * Handle 404 Not Found for unknown endpoints
     */
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ApiResponse<ErrorDetailsDto>> handleNoHandlerFound(NoHandlerFoundException ex) {
        logger.warn("Endpoint not found: {}", ex.getRequestURL());

        ErrorDetailsDto error = new ErrorDetailsDto(
                ErrorCode.RESOURCE_NOT_FOUND.getCode(),
                "Endpoint not found",
                LocalDateTime.now());
        error.setTraceId(UUID.randomUUID().toString());

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                ApiResponse.<ErrorDetailsDto>builder()
                        .success(false)
                        .message("The requested endpoint does not exist")
                        .data(error)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * Handle security authentication and credentials exceptions
     */
    @ExceptionHandler({ org.springframework.security.authentication.BadCredentialsException.class,
            io.jsonwebtoken.JwtException.class })
    public ResponseEntity<ApiResponse<ErrorDetailsDto>> handleAuthenticationError(Exception ex) {
        logger.warn("Authentication error: {}", ex.getMessage());

        ErrorDetailsDto error = new ErrorDetailsDto(
                ErrorCode.UNAUTHORIZED.getCode(),
                ErrorCode.UNAUTHORIZED.getMessage(),
                LocalDateTime.now());
        error.setTraceId(UUID.randomUUID().toString());

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                ApiResponse.<ErrorDetailsDto>builder()
                        .success(false)
                        .message("Authentication failed: " + ex.getMessage())
                        .data(error)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * Handle security authorization / access denied exceptions
     */
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ApiResponse<ErrorDetailsDto>> handleAccessDenied(
            org.springframework.security.access.AccessDeniedException ex) {
        logger.warn("Access denied: {}", ex.getMessage());

        ErrorDetailsDto error = new ErrorDetailsDto(
                ErrorCode.FORBIDDEN.getCode(),
                ErrorCode.FORBIDDEN.getMessage(),
                LocalDateTime.now());
        error.setTraceId(UUID.randomUUID().toString());

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                ApiResponse.<ErrorDetailsDto>builder()
                        .success(false)
                        .message("Access denied: " + ex.getMessage())
                        .data(error)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * Generic exception handler for all unhandled exceptions
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<ErrorDetailsDto>> handleGeneric(Exception ex) {
        logger.error("Unexpected error occurred: ", ex);

        ErrorDetailsDto error = new ErrorDetailsDto(
                ErrorCode.INTERNAL_SERVER_ERROR.getCode(),
                ErrorCode.INTERNAL_SERVER_ERROR.getMessage(),
                LocalDateTime.now());
        error.setTraceId(UUID.randomUUID().toString());

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                ApiResponse.<ErrorDetailsDto>builder()
                        .success(false)
                        .message("An unexpected error occurred. Please try again later.")
                        .data(error)
                        .timestamp(LocalDateTime.now())
                        .build());
    }
}
