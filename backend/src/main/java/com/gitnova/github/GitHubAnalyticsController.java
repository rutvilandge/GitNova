package com.gitnova.github;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/github")
public class GitHubAnalyticsController {
    private final RestClient github;
    private final OAuth2AuthorizedClientService clients;

    public GitHubAnalyticsController(RestClient.Builder builder, OAuth2AuthorizedClientService clients) {
        this.clients = clients;
        this.github = builder.baseUrl("https://api.github.com").defaultHeader("Accept", "application/vnd.github+json")
            .defaultHeader("X-GitHub-Api-Version", "2022-11-28").build();
    }

    @GetMapping("/analytics")
    public RepositoryAnalytics analytics(@RequestParam String repo, Authentication authentication) {
        if (!repo.matches("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid repository.");
        OAuth2AuthorizedClient client = authorizedClient(authentication);
        String token = client.getAccessToken().getTokenValue();
        String owner = repo.substring(0, repo.indexOf('/'));
        String name = repo.substring(repo.indexOf('/') + 1);
        try {
            GitHubRepo[] accessible = github.get().uri("/user/repos?per_page=100&visibility=all")
                .headers(h -> h.setBearerAuth(token)).retrieve().body(GitHubRepo[].class);
            if (accessible == null || java.util.Arrays.stream(accessible).noneMatch(item -> repo.equalsIgnoreCase(item.fullName())))
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Repository is not accessible to this GitHub account.");
            Instant since = Instant.now().minusSeconds(7 * 24 * 60 * 60L);
            CommitEntry[] commits = github.get().uri(uri -> uri.path("/repos/{owner}/{repo}/commits").queryParam("since", since).queryParam("per_page", 100).build(owner, name))
                .headers(h -> h.setBearerAuth(token)).retrieve().body(CommitEntry[].class);
            PullRequest[] open = github.get().uri("/repos/{owner}/{repo}/pulls?state=open&per_page=100", owner, name)
                .headers(h -> h.setBearerAuth(token)).retrieve().body(PullRequest[].class);
            PullRequest[] closed = github.get().uri("/repos/{owner}/{repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100", owner, name)
                .headers(h -> h.setBearerAuth(token)).retrieve().body(PullRequest[].class);
            Map<LocalDate, Long> daily = new LinkedHashMap<>();
            for (int i = 6; i >= 0; i--) daily.put(LocalDate.now(ZoneOffset.UTC).minusDays(i), 0L);
            if (commits != null) for (CommitEntry commit : commits) {
                Instant authored = commit.commit() == null || commit.commit().author() == null ? null : commit.commit().author().date();
                if (authored != null) {
                    LocalDate day = authored.atZone(ZoneOffset.UTC).toLocalDate();
                    if (daily.containsKey(day)) daily.compute(day, (ignored, count) -> count + 1);
                }
            }
            long merged = closed == null ? 0 : java.util.Arrays.stream(closed).filter(pr -> pr.mergedAt() != null && pr.mergedAt().isAfter(since)).count();
            var series = new ArrayList<DailyCount>();
            daily.forEach((day, count) -> series.add(new DailyCount(day.toString(), count)));
            return new RepositoryAnalytics(repo, open == null ? 0 : open.length, commits == null ? 0 : commits.length, merged, series);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "GitHub analytics could not be loaded. Try again shortly.");
        }
    }

    private OAuth2AuthorizedClient authorizedClient(Authentication authentication) {
        if (!(authentication instanceof OAuth2AuthenticationToken oauth))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Connect GitHub to view repository analytics.");
        OAuth2AuthorizedClient client = clients.loadAuthorizedClient("github", oauth.getName());
        if (client == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Connect GitHub to view repository analytics.");
        return client;
    }

    public record RepositoryAnalytics(String repository, int openPullRequests, int commitsThisWeek,
        long mergedPullRequestsThisWeek, List<DailyCount> dailyCommits) {}
    public record DailyCount(String day, long commits) {}
    private record GitHubRepo(@JsonProperty("full_name") String fullName) {}
    private record PullRequest(@JsonProperty("merged_at") Instant mergedAt) {}
    private record CommitEntry(Commit commit) {}
    private record Commit(CommitAuthor author) {}
    private record CommitAuthor(Instant date) {}
}
