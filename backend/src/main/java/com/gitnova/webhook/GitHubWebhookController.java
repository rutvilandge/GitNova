package com.gitnova.webhook;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/webhooks")
public class GitHubWebhookController {
    private final JdbcTemplate jdbc;
    private final JsonMapper json;
    private final String secret;

    public GitHubWebhookController(JdbcTemplate jdbc, JsonMapper json,
        @Value("${gitnova.webhook-secret:}") String secret) {
        this.jdbc = jdbc; this.json = json; this.secret = secret;
    }

    @PostMapping("/github")
    public ResponseEntity<Map<String, Boolean>> receive(
        @RequestHeader("X-Hub-Signature-256") String signature,
        @RequestHeader("X-GitHub-Delivery") String deliveryId,
        @RequestHeader("X-GitHub-Event") String eventType,
        @RequestBody byte[] body) {
        if (secret.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Webhook receiver is not configured.");
        if (body.length > 1_000_000) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE);
        if (!isValidSignature(body, signature)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid webhook signature.");
        if (deliveryId.isBlank() || deliveryId.length() > 200 || eventType.isBlank() || eventType.length() > 100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid GitHub delivery headers.");
        final JsonNode payload;
        try { payload = json.readTree(body); }
        catch (Exception exception) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON webhook payload."); }
        jdbc.update("""
            INSERT INTO background_job(job_type, idempotency_key, payload)
            VALUES ('GITHUB_WEBHOOK', ?, jsonb_build_object('deliveryId', ?, 'eventType', ?, 'payload', CAST(? AS jsonb)))
            ON CONFLICT (idempotency_key) DO NOTHING
            """, deliveryId, deliveryId, eventType, new String(body, StandardCharsets.UTF_8));
        return ResponseEntity.accepted().body(Map.of("accepted", true));
    }

    private boolean isValidSignature(byte[] body, String header) {
        if (header == null || !header.matches("sha256=[a-fA-F0-9]{64}")) return false;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String expected = "sha256=" + HexFormat.of().formatHex(mac.doFinal(body));
            return MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII), header.toLowerCase().getBytes(StandardCharsets.US_ASCII));
        } catch (Exception exception) {
            return false;
        }
    }
}
