package com.substring.docmind.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Utility class for JWT token generation and validation
 */
@Component
@Slf4j
public class JwtUtil {

    @Value("${app.jwt.secret:DocmindApplicationSecureSecretKeyForJWTTokenThatIsAtLeast64CharactersLongForHS512Algorithm}")
    private String secret;

    @Value("${app.jwt.expiration:86400000}") // Default 24 hours in milliseconds
    private long expirationTime;

    private SecretKey getSigningKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        // Ensure key is at least 64 bytes for HS512
        if (keyBytes.length < 64) {
            log.warn("JWT secret key is less than 64 bytes. This is not recommended for production.");
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Generate JWT token from email and role
     */
    public String generateToken(String email, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role != null ? role : "USER");
        return createToken(claims, email);
    }

    /**
     * Create JWT token with claims
     */
    private String createToken(Map<String, Object> claims, String subject) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationTime);

        try {
            return Jwts.builder()
                    .claims(claims)
                    .subject(subject)
                    .issuedAt(now)
                    .expiration(expiryDate)
                    .signWith(getSigningKey())
                    .compact();
        } catch (Exception e) {
            log.error("Error creating JWT token: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate JWT token", e);
        }
    }

    /**
     * Extract email (subject) from token
     */
    public String extractEmail(String token) {
        try {
            if (token == null || token.isEmpty()) {
                return null;
            }
            return extractClaim(token, Claims::getSubject);
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Failed to extract email from token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extract role from token
     */
    public String extractRole(String token) {
        try {
            if (token == null || token.isEmpty()) {
                return null;
            }
            String role = extractClaim(token, claims -> claims.get("role", String.class));
            return role != null ? role : "USER";
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Failed to extract role from token: {}", e.getMessage());
            return "USER";
        }
    }

    /**
     * Extract any claim from token
     */
    public <T> T extractClaim(String token, java.util.function.Function<Claims, T> claimsResolver) {
        Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Extract all claims from token
     */
    private Claims extractAllClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            return e.getClaims();
        }
    }

    /**
     * Check if token is expired
     */
    public Boolean isTokenExpired(String token) {
        try {
            if (token == null || token.isEmpty()) {
                return true;
            }
            Date expiration = extractClaim(token, Claims::getExpiration);
            return expiration != null && expiration.before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Token validation failed: {}", e.getMessage());
            return true;
        }
    }

    /**
     * Validate token - checks signature and expiration
     */
    public Boolean validateToken(String token, String email) {
        try {
            if (token == null || token.isEmpty() || email == null) {
                return false;
            }
            String extractedEmail = extractEmail(token);
            return extractedEmail != null && extractedEmail.equals(email) && !isTokenExpired(token);
        } catch (Exception e) {
            log.debug("Token validation failed for email {}: {}", email, e.getMessage());
            return false;
        }
    }

    /**
     * Get remaining time until token expiration
     */
    public Long getTokenExpirationTime(String token) {
        try {
            if (token == null || token.isEmpty()) {
                return null;
            }
            Date expiration = extractClaim(token, Claims::getExpiration);
            if (expiration == null) {
                return null;
            }
            long remainingTime = expiration.getTime() - new Date().getTime();
            return remainingTime > 0 ? remainingTime : 0L;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Failed to get token expiration time: {}", e.getMessage());
            return null;
        }
    }
}
