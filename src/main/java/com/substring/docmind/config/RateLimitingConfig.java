package com.substring.docmind.config;


import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterConfig;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Rate Limiting Configuration using Resilience4j
 */
@Configuration
@Slf4j
public class RateLimitingConfig {

    /**
     * Create RateLimiterRegistry with event listeners
     */
    @Bean
    public RateLimiterRegistry rateLimiterRegistry() {
        RateLimiterRegistry registry = RateLimiterRegistry.of(RateLimiterConfig.custom()
            .limitRefreshPeriod(Duration.ofMinutes(1))
            .limitForPeriod(10)
            .timeoutDuration(Duration.ofSeconds(5))
            .build());

        registry.getEventPublisher()
            .onEntryAdded(event -> log.info("RateLimiter added: {}", event.getAddedEntry().getName()))
            .onEntryRemoved(event -> log.info("RateLimiter removed: {}", event.getRemovedEntry().getName()));

        return registry;
    }

    /**
     * Document upload rate limiter - 10 uploads per minute
     */
    @Bean
    public RateLimiter documentUploadRateLimiter(RateLimiterRegistry registry) {
        RateLimiterConfig config = RateLimiterConfig.custom()
            .limitRefreshPeriod(Duration.ofMinutes(1))
            .limitForPeriod(10)
            .timeoutDuration(Duration.ofSeconds(5))
            .build();

        return registry.rateLimiter("document-upload", config);
    }

    /**
     * Chat query rate limiter - 30 queries per minute
     */
    @Bean
    public RateLimiter chatQueryRateLimiter(RateLimiterRegistry registry) {
        RateLimiterConfig config = RateLimiterConfig.custom()
            .limitRefreshPeriod(Duration.ofMinutes(1))
            .limitForPeriod(30)
            .timeoutDuration(Duration.ofSeconds(5))
            .build();

        return registry.rateLimiter("chat-query", config);
    }

    /**
     * Search rate limiter - 50 searches per minute
     */
    @Bean
    public RateLimiter searchRateLimiter(RateLimiterRegistry registry) {
        RateLimiterConfig config = RateLimiterConfig.custom()
            .limitRefreshPeriod(Duration.ofMinutes(1))
            .limitForPeriod(50)
            .timeoutDuration(Duration.ofSeconds(5))
            .build();

        return registry.rateLimiter("search", config);
    }
}
