package com.gitnova.intelligence;

import java.io.IOException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Executors;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/intelligence/activity")
public class ActivityStreamController {
    private static final java.util.concurrent.ExecutorService STREAMS = Executors.newVirtualThreadPerTaskExecutor();
    private final JdbcTemplate jdbc;
    private final OAuth2AuthorizedClientService clients;
    private final RestClient github;

    public ActivityStreamController(JdbcTemplate jdbc, OAuth2AuthorizedClientService clients, RestClient.Builder builder) {
        this.jdbc = jdbc; this.clients = clients;
        this.github = builder.baseUrl("https://api.github.com").defaultHeader("Accept", "application/vnd.github+json").build();
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(Authentication authentication) {
        if (!(authentication instanceof OAuth2AuthenticationToken oauth))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Connect GitHub to stream repository activity.");
        OAuth2AuthorizedClient client = clients.loadAuthorizedClient("github", oauth.getName());
        if (client == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Connect GitHub to stream repository activity.");
        Long[] repositories;
        try {
            var result = github.get().uri("/user/repos?per_page=100&visibility=all")
                .headers(h -> h.setBearerAuth(client.getAccessToken().getTokenValue()))
                .retrieve().body(RepositoryId[].class);
            repositories = result == null ? new Long[0] : java.util.Arrays.stream(result).map(RepositoryId::id).toArray(Long[]::new);
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not verify GitHub repository access.");
        }
        var emitter = new SseEmitter(300_000L);
        var sent = new HashSet<String>();
        STREAMS.execute(() -> sendAuthorizedEvents(emitter, repositories, sent));
        return emitter;
    }

    private void sendAuthorizedEvents(SseEmitter emitter, Long[] repositories, Set<String> sent) {
        try {
            while (!Thread.currentThread().isInterrupted() && sent.size() < 500) {
                if (repositories.length > 0) {
                    String placeholders = String.join(",", java.util.Collections.nCopies(repositories.length, "?"));
                    List<ActivityEvent> events = jdbc.query("SELECT delivery_id, event_type, repository_name, action, received_at FROM github_webhook_event WHERE repository_id IN (" + placeholders + ") ORDER BY received_at DESC LIMIT 50",
                        (rs, row) -> new ActivityEvent(rs.getString("delivery_id"), rs.getString("event_type"), rs.getString("repository_name"), rs.getString("action"), rs.getTimestamp("received_at").toInstant()),
                        (Object[]) repositories);
                    for (int i = events.size() - 1; i >= 0; i--) {
                        var event = events.get(i);
                        if (sent.add(event.id())) emitter.send(SseEmitter.event().id(event.id()).name("github").data(event));
                    }
                }
                emitter.send(SseEmitter.event().comment("keepalive"));
                Thread.sleep(5_000);
            }
            emitter.complete();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt(); emitter.complete();
        } catch (IOException | RuntimeException exception) {
            emitter.completeWithError(exception);
        }
    }

    public record ActivityEvent(String id, String type, String repository, String action, Instant at) {}
    private record RepositoryId(long id) {}
}
