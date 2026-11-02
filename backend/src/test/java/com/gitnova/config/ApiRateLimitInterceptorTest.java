package com.gitnova.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.TestingAuthenticationToken;

class ApiRateLimitInterceptorTest {
    @Test
    void allowsAuthenticatedAiRequestAndStoresHashedPrincipal() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), any(Object[].class))).thenReturn(1);
        ApiRateLimitInterceptor interceptor = new ApiRateLimitInterceptor(jdbc);
        MockHttpServletRequest request = request("/api/v1/rag/chat");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertTrue(interceptor.preHandle(request, response, new Object()));
        verify(jdbc).queryForObject(anyString(), eq(Integer.class), any(Object[].class));
    }

    @Test
    void returns429AndRetryAfterWhenTheDatabaseBucketIsExhausted() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), any(Object[].class)))
            .thenThrow(new EmptyResultDataAccessException(1));
        ApiRateLimitInterceptor interceptor = new ApiRateLimitInterceptor(jdbc);
        MockHttpServletRequest request = request("/api/v1/rag/index");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertFalse(interceptor.preHandle(request, response, new Object()));
        assertEquals(429, response.getStatus());
        assertTrue(Integer.parseInt(response.getHeader("Retry-After")) > 0);
        assertTrue(response.getContentAsString().contains("Request limit reached"));
    }

    private MockHttpServletRequest request(String path) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.setUserPrincipal(new TestingAuthenticationToken("user@example.test", "not-a-real-password", "ROLE_USER"));
        return request;
    }
}
