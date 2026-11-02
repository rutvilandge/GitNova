package com.gitnova.webhook;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

class GitHubWebhookSecurityTest {
    private static final String SECRET = "test-webhook-secret";
    private static final byte[] PAYLOAD = "{\"repository\":{\"id\":42,\"full_name\":\"owner/repo\"},\"action\":\"opened\"}".getBytes(StandardCharsets.UTF_8);

    @Test
    void acceptsOnlySignedPayloadsAndPersistsDeliveryIdempotently() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        var controller = new GitHubWebhookController(jdbc, JsonMapper.builder().build(), SECRET);

        var response = controller.receive(signature(PAYLOAD), "delivery-123", "pull_request", PAYLOAD);

        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        verify(jdbc).update(anyString(), eq("delivery-123"), eq("delivery-123"), eq("pull_request"), eq(new String(PAYLOAD, StandardCharsets.UTF_8)));
    }

    @Test
    void rejectsInvalidSignaturesBeforePersisting() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        var controller = new GitHubWebhookController(jdbc, JsonMapper.builder().build(), SECRET);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> controller.receive("sha256=" + "0".repeat(64), "delivery-123", "pull_request", PAYLOAD));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatusCode());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void failsClosedWhenWebhookSecretIsMissing() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        var controller = new GitHubWebhookController(jdbc, JsonMapper.builder().build(), " ");

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> controller.receive("sha256=" + "0".repeat(64), "delivery-123", "pull_request", PAYLOAD));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatusCode());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    private String signature(byte[] body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return "sha256=" + HexFormat.of().formatHex(mac.doFinal(body));
    }
}
