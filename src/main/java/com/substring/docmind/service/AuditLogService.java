package com.substring.docmind.service;

import com.substring.docmind.entity.AuditLog;
import com.substring.docmind.entity.User;
import com.substring.docmind.repository.AuditLogRepository;
import com.substring.docmind.repository.UserRepository;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Service for audit logging
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    /**
     * Log an action
     */
    public void logAction(String action, String entity, String entityId, String details, 
                         HttpServletRequest request, String status) {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = null;
            if (email != null && !email.equals("anonymousUser")) {
                user = userRepository.findByEmail(email).orElse(null);
            }

            String ipAddress = getClientIpAddress(request);
            String userAgent = request != null ? request.getHeader("User-Agent") : null;

            AuditLog logs = AuditLog.builder()
                .user(user)
                .action(action)
                .entity(entity)
                .entityId(entityId)
                .details(details)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .status(status)
                .createdAt(LocalDateTime.now())
                .build();

            auditLogRepository.save(logs);
            log.debug("Audit log created: {} - {} - {}", action, entity, entityId);
        } catch (Exception e) {
            log.error("Failed to log audit action: {}", e.getMessage(), e);
        }
    }

    /**
     * Log successful action
     */
    public void logSuccess(String action, String entity, String entityId, String details, 
                          HttpServletRequest request) {
        logAction(action, entity, entityId, details, request, "SUCCESS");
    }

    /**
     * Log failed action
     */
    public void logFailure(String action, String entity, String entityId, String details, 
                          HttpServletRequest request) {
        logAction(action, entity, entityId, details, request, "FAILED");
    }

    /**
     * Get client IP address from request
     */
    private String getClientIpAddress(HttpServletRequest request) {
        if (request == null) return null;

        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }
}
