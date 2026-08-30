package com.substring.docmind.controller;

import com.substring.docmind.dto.*;
import com.substring.docmind.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "User authentication and authorization endpoints")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "User login", description = "Authenticate user and return JWT token")
    public ResponseEntity<ApiResponse<LoginResponseDto>> login(@Valid @RequestBody LoginRequestDto request) {
        LoginResponseDto response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.<LoginResponseDto>builder()
            .success(true)
            .message("Login successful")
            .data(response)
            .timestamp(LocalDateTime.now())
            .build());
    }

    @PostMapping("/register")
    @Operation(summary = "User registration", description = "Register a new user account")
    public ResponseEntity<ApiResponse<LoginResponseDto>> register(@Valid @RequestBody RegisterRequestDto request) {
        LoginResponseDto response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<LoginResponseDto>builder()
            .success(true)
            .message("Registration successful")
            .data(response)
            .timestamp(LocalDateTime.now())
            .build());
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh JWT token", description = "Get a new JWT token using the current one")
    public ResponseEntity<ApiResponse<LoginResponseDto>> refreshToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken == null || !bearerToken.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                ApiResponse.<LoginResponseDto>builder()
                    .success(false)
                    .message("Missing or invalid Authorization header")
                    .timestamp(LocalDateTime.now())
                    .build()
            );
        }

        String token = bearerToken.substring(7);
        LoginResponseDto response = authService.refreshToken(token);
        return ResponseEntity.ok(ApiResponse.<LoginResponseDto>builder()
            .success(true)
            .message("Token refreshed successfully")
            .data(response)
            .timestamp(LocalDateTime.now())
            .build());
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request password reset OTP", description = "Generates and emails a 6-digit OTP to user")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequestDto request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
            .success(true)
            .message("OTP has been sent to your email")
            .timestamp(LocalDateTime.now())
            .build());
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password using OTP", description = "Verifies OTP and updates user password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequestDto request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
            .success(true)
            .message("Password has been reset successfully")
            .timestamp(LocalDateTime.now())
            .build());
    }
}
