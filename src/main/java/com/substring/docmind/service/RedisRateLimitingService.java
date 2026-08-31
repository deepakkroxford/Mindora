package com.substring.docmind.service;

import com.substring.docmind.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Distributed Rate Limiting using Redis Token Bucket.
 * Enforces per-user / per-IP request thresholds across multi-node deployments.
 */
@Service
@Slf4j
public class RedisRateLimitingService {

    private final StringRedisTemplate stringRedisTemplate;
    private final AppProperties appProperties;

    public RedisRateLimitingService(
            StringRedisTemplate stringRedisTemplate,
            AppProperties appProperties) {
        this.stringRedisTemplate = stringRedisTemplate;
        this.appProperties = appProperties;
    }

    private static final String RATE_LIMIT_PREFIX = "rag:ratelimit:";

    /**
     * Checks if the user has available rate quota for the specified action.
     *
     * @param userIdentifier User email, ID, or client IP address
     * @param action         e.g., "chat", "upload"
     * @param limitPerMinute Maximum permitted requests within a 60-second rolling
     *                       window
     * @return true if allowed, false if limit exceeded
     */
    public boolean tryAcquire(String userIdentifier, String action, int limitPerMinute) {
        if (!appProperties.getRateLimit().isEnabled() || limitPerMinute <= 0) {
            return true;
        }

        String key = RATE_LIMIT_PREFIX + action + ":" + (userIdentifier != null ? userIdentifier : "anonymous");

        try {
            Long currentCount = stringRedisTemplate.opsForValue().increment(key);
            if (currentCount != null && currentCount == 1) {
                // First request in the window: set 60s TTL
                stringRedisTemplate.expire(key, Duration.ofSeconds(60));
            }

            if (currentCount != null && currentCount > limitPerMinute) {
                log.warn("Rate limit exceeded for user='{}', action='{}' (count={}/{})",
                        userIdentifier, action, currentCount, limitPerMinute);
                return false;
            }

            return true;
        } catch (Exception e) {
            // Graceful degradation: if Redis is temporarily unreachable, allow request
            log.warn("Redis rate limiter check failed (allowing request): {}", e.getMessage());
            return true;
        }
    }

    /**
     * Convenience method for chat rate limits.
     */
    public boolean tryAcquireChat(String userIdentifier) {
        int limit = appProperties.getRateLimit().getChatPerMinute();
        return tryAcquire(userIdentifier, "chat", limit);
    }

    /**
     * Convenience method for document upload rate limits.
     */
    public boolean tryAcquireUpload(String userIdentifier) {
        int limit = appProperties.getRateLimit().getUploadPerMinute();
        return tryAcquire(userIdentifier, "upload", limit);
    }
}
