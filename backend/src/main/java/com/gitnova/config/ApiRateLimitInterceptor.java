package com.gitnova.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.Principal;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class ApiRateLimitInterceptor implements HandlerInterceptor {
    private static final int AI_REQUESTS_PER_MINUTE = 12;
    private static final int INDEX_REQUESTS_PER_MINUTE = 3;
    private final JdbcTemplate jdbc;

    public ApiRateLimitInterceptor(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        String bucket = bucketFor(request.getRequestURI());
        Principal principal = request.getUserPrincipal();
        if (bucket == null || !(principal instanceof Authentication authentication)
                || !authentication.isAuthenticated()) return true;

        int limit = "repository-index".equals(bucket) ? INDEX_REQUESTS_PER_MINUTE : AI_REQUESTS_PER_MINUTE;
        Instant now = Instant.now();
        Instant windowStart = now.truncatedTo(java.time.temporal.ChronoUnit.MINUTES);
        int allowed = consume(hash(authentication.getName()), bucket, windowStart, limit);
        if (allowed > 0) return true;

        long retryAfter = Math.max(1, Duration.between(now, windowStart.plusSeconds(60)).toSeconds());
        response.setStatus(429);
        response.setHeader("Retry-After", Long.toString(retryAfter));
        response.setContentType("application/json");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write("{\"error\":\"Request limit reached. Wait briefly and try again.\"}");
        return false;
    }

    private int consume(String subjectHash, String bucket, Instant windowStart, int limit) {
        try {
            Integer count = jdbc.queryForObject("""
                INSERT INTO api_rate_limit_bucket(subject_hash, bucket_key, window_started_at, request_count)
                VALUES (?, ?, ?, 1)
                ON CONFLICT (subject_hash, bucket_key) DO UPDATE SET
                    window_started_at=CASE
                        WHEN api_rate_limit_bucket.window_started_at < EXCLUDED.window_started_at
                        THEN EXCLUDED.window_started_at ELSE api_rate_limit_bucket.window_started_at END,
                    request_count=CASE
                        WHEN api_rate_limit_bucket.window_started_at < EXCLUDED.window_started_at
                        THEN 1 ELSE api_rate_limit_bucket.request_count + 1 END
                WHERE api_rate_limit_bucket.window_started_at < EXCLUDED.window_started_at
                   OR api_rate_limit_bucket.request_count < ?
                RETURNING request_count
                """, Integer.class, subjectHash, bucket, Timestamp.from(windowStart), limit);
            return count == null ? 0 : count;
        } catch (org.springframework.dao.EmptyResultDataAccessException rejected) {
            return 0;
        }
    }

    private String bucketFor(String path) {
        if ("/api/v1/rag/index".equals(path)) return "repository-index";
        if ("/api/v1/rag/chat".equals(path)
                || "/api/v1/github/pull-requests/review".equals(path)
                || (path.startsWith("/api/v1/intelligence/") && !path.startsWith("/api/v1/intelligence/activity/"))) {
            return "ai-generation";
        }
        return null;
    }

    private String hash(String subject) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256")
            .digest(subject.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(digest);
    }
}
