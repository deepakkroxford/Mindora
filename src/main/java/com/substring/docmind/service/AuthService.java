package com.substring.docmind.service;

import com.substring.docmind.dto.ForgotPasswordRequestDto;
import com.substring.docmind.dto.LoginRequestDto;
import com.substring.docmind.dto.LoginResponseDto;
import com.substring.docmind.dto.RegisterRequestDto;
import com.substring.docmind.dto.ResetPasswordRequestDto;
import com.substring.docmind.entity.User;
import com.substring.docmind.repository.UserRepository;
import com.substring.docmind.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    /**
     * Login user and return JWT token
     */
    @Transactional
    public LoginResponseDto login(LoginRequestDto request) {
        log.info("Login attempt for email: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    log.warn("Login failed: user not found - {}", request.getEmail());
                    return new IllegalArgumentException("Invalid email or password");
                });

        if (!user.getEnabled()) {
            log.warn("Login failed: user account disabled - {}", request.getEmail());
            throw new IllegalArgumentException("User account is disabled");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Login failed: invalid password - {}", request.getEmail());
            throw new IllegalArgumentException("Invalid email or password");
        }

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        Long expiresIn = jwtUtil.getTokenExpirationTime(token);

        log.info("User logged in successfully: {}", request.getEmail());
        return LoginResponseDto.fromUser(token, user.getEmail(), user.getName(), user.getRole(), expiresIn);
    }

    /**
     * Register new user
     */
    @Transactional
    public LoginResponseDto register(RegisterRequestDto request) {
        log.info("Registration attempt for email: {}", request.getEmail());

        if (!request.passwordsMatch()) {
            log.warn("Registration failed: passwords do not match - {}", request.getEmail());
            throw new IllegalArgumentException("Passwords do not match");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("Registration failed: email already registered - {}", request.getEmail());
            throw new IllegalArgumentException("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .name(request.getName())
                .password(passwordEncoder.encode(request.getPassword()))
                .role("USER")
                .enabled(true)
                .build();

        user = userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        Long expiresIn = jwtUtil.getTokenExpirationTime(token);

        log.info("User registered successfully: {}", request.getEmail());
        return LoginResponseDto.fromUser(token, user.getEmail(), user.getName(), user.getRole(), expiresIn);
    }

    /**
     * Refresh JWT token
     */
    public LoginResponseDto refreshToken(String currentToken) {
        String email = jwtUtil.extractEmail(currentToken);
        if (email == null) {
            throw new IllegalArgumentException("Invalid token");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String newToken = jwtUtil.generateToken(user.getEmail(), user.getRole());
        Long expiresIn = jwtUtil.getTokenExpirationTime(newToken);

        log.info("Token refreshed for user: {}", email);
        return LoginResponseDto.fromUser(newToken, user.getEmail(), user.getName(), user.getRole(), expiresIn);
    }

    /**
     * Trigger forgot password flow: generate 6-digit OTP, store it with expiry, and
     * send email
     */
    @Transactional
    public void forgotPassword(ForgotPasswordRequestDto request) {
        log.info("Password reset request for email: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User with this email does not exist"));

        // Generate 6-digit OTP
        int otpCode = 100000 + new java.util.Random().nextInt(900000);
        String otp = String.valueOf(otpCode);

        user.setResetToken(otp);
        user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(10)); // valid for 10 minutes
        userRepository.save(user);

        emailService.sendOtpEmail(user.getEmail(), otp);
    }

    /**
     * Reset password: check OTP matching & expiry, verify password match, and save
     * hashed password
     */
    @Transactional
    public void resetPassword(ResetPasswordRequestDto request) {
        log.info("Resetting password for email: {}", request.getEmail());

        if (!request.passwordsMatch()) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getResetToken() == null || !user.getResetToken().equals(request.getOtp())) {
            throw new IllegalArgumentException("Invalid OTP code");
        }

        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("OTP code has expired");
        }

        // Update password and clear reset token info
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        log.info("Password successfully reset for user: {}", request.getEmail());
    }
}
