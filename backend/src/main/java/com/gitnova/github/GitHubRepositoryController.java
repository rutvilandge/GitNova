package com.gitnova.github;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.gitnova.user.GitnovaUserRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatusCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/github")
public class GitHubRepositoryController {
    private final RestClient github;
    private final OAuth2AuthorizedClientService clients;
    private final GitnovaUserRepository users;
    private final JdbcTemplate jdbc;
    public GitHubRepositoryController(RestClient.Builder builder, OAuth2AuthorizedClientService clients,
            GitnovaUserRepository users, JdbcTemplate jdbc) {
        this.clients = clients;
        this.users = users;
        this.jdbc = jdbc;
        this.github = builder.baseUrl("https://api.github.com").defaultHeader("Accept", "application/vnd.github+json")
            .defaultHeader("X-GitHub-Api-Version", "2022-11-28").build();
    }

    @GetMapping(value = "/repositories", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<RepositoryResponse> repositories(Authentication authentication) {
        OAuth2AuthorizedClient client = authentication instanceof OAuth2AuthenticationToken oauth
            ? clients.loadAuthorizedClient("github", oauth.getName()) : null;
        if (client == null || client.getAccessToken() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Connect GitHub to view repositories.");
        }
        try {
            var result = github.get().uri("/user/repos?sort=updated&per_page=100&visibility=all")
                .headers(headers -> headers.setBearerAuth(client.getAccessToken().getTokenValue()))
                .retrieve().body(GitHubRepository[].class);
            List<RepositoryResponse> repositories = result == null ? List.of() : java.util.Arrays.stream(result)
                .map(repository -> new RepositoryResponse(repository.id(), repository.fullName(), repository.isPrivate(),
                    repository.description(), repository.htmlUrl())).toList();
            long githubUserId = authentication instanceof OAuth2AuthenticationToken oauth
                && oauth.getPrincipal().getAttribute("id") instanceof Number id ? id.longValue() : -1L;
            var appUser = users.findByGithubId(githubUserId).orElseThrow(() -> new IllegalStateException("GitHub account is not linked."));
            for (RepositoryResponse repository : repositories) {
                jdbc.update("""
                    INSERT INTO connected_repository(owner_user_id, github_repo_id, full_name, is_private, github_html_url)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(owner_user_id, github_repo_id) DO UPDATE SET
                      full_name=EXCLUDED.full_name, is_private=EXCLUDED.is_private,
                      github_html_url=EXCLUDED.github_html_url, updated_at=now()
                    """, appUser.id(), repository.id(), repository.fullName(), repository.privateRepo(), repository.htmlUrl());
            }
            return repositories;
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "GitHub repository access failed. Reconnect GitHub and try again.");
        }
    }

    @PostMapping(value = "/repositories", consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public RepositoryResponse createRepository(@RequestBody CreateRepositoryRequest request,
            Authentication authentication) {
        if (request == null || request.name() == null
                || !request.name().matches("[A-Za-z0-9_.-]{1,100}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Repository name must be 1–100 letters, numbers, dots, hyphens, or underscores.");
        }
        OAuth2AuthorizedClient client = authentication instanceof OAuth2AuthenticationToken oauth
            ? clients.loadAuthorizedClient("github", oauth.getName()) : null;
        if (client == null || client.getAccessToken() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Connect GitHub before creating a repository.");
        }
        try {
            var created = github.post().uri("/user/repos")
                .headers(headers -> headers.setBearerAuth(client.getAccessToken().getTokenValue()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(new GitHubCreateRequest(request.name(), request.description(), request.privateRepo(), false))
                .retrieve().body(GitHubRepository.class);
            if (created == null) throw new IllegalStateException("GitHub returned no repository.");
            return new RepositoryResponse(created.id(), created.fullName(), created.isPrivate(),
                created.description(), created.htmlUrl());
        } catch (org.springframework.web.client.HttpStatusCodeException exception) {
            HttpStatusCode status = exception.getStatusCode();
            if (status.value() == 422) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "GitHub could not create this repository. The name may already be in use or invalid.");
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "GitHub could not create the repository. Check your authorization and try again.");
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "GitHub could not create the repository. Check your authorization and try again.");
        }
    }

    public record RepositoryResponse(long id, String fullName, @JsonProperty("private") boolean privateRepo,
        String description, String htmlUrl) {}
    public record CreateRepositoryRequest(String name, String description,
        @JsonProperty("private") boolean privateRepo) {}
    private record GitHubCreateRequest(String name, String description, boolean privateRepo,
        @JsonProperty("auto_init") boolean autoInit) {}
    private record GitHubRepository(long id, @JsonProperty("full_name") String fullName,
        @JsonProperty("private") boolean isPrivate, String description,
        @JsonProperty("html_url") String htmlUrl) {}
}
