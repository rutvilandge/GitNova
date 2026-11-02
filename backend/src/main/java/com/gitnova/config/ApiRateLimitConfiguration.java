package com.gitnova.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class ApiRateLimitConfiguration implements WebMvcConfigurer {
    private final ApiRateLimitInterceptor interceptor;

    public ApiRateLimitConfiguration(ApiRateLimitInterceptor interceptor) {
        this.interceptor = interceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(interceptor).addPathPatterns(
            "/api/v1/rag/index",
            "/api/v1/rag/chat",
            "/api/v1/github/pull-requests/review",
            "/api/v1/intelligence/**");
    }
}
