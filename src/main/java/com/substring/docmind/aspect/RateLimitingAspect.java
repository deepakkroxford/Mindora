package com.substring.docmind.aspect;

import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

/**
 * Aspect for applying rate limiting to methods
 */
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitingAspect {

    private final RateLimiterRegistry rateLimiterRegistry;

    @Around("@annotation(rateLimit)")
    public Object rateLimit(ProceedingJoinPoint pjp, RateLimit rateLimit) throws Throwable {
        RateLimiter rateLimiter = rateLimiterRegistry.rateLimiter(rateLimit.value());

        if (!rateLimiter.acquirePermission()) {
            log.warn("Rate limit exceeded for: {}", rateLimit.value());
            throw new RuntimeException("Rate limit exceeded. Please try again later.");
        }

        return pjp.proceed();
    }
}
