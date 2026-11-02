package com.gitnova.rag;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.gitnova.user.GitnovaUserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

@RestController
@RequestMapping("/api/v1/rag")
public class RepositoryIndexController {
    private static final int MAX_FILES = 40;
    private static final int MAX_FILE_BYTES = 60_000;
    private static final int MAX_SOURCE_BYTES = 250_000;
    private static final int MAX_CHUNK_CHARS = 5_000;
    private static final java.util.Set<String> ALLOWED_EXTENSIONS = java.util.Set.of(
        ".java", ".kt", ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".sql", ".md", ".css", ".html", ".json", ".yml", ".yaml");
    private static final java.util.Set<String> EXCLUDED_SEGMENTS = java.util.Set.of(
        "node_modules", "vendor", "dist", "build", "target", ".git", "coverage");
    private final RestClient github;
    private final OAuth2AuthorizedClientService clients;
    private final GitnovaUserRepository users;
    private final JdbcTemplate jdbc;
    private final JsonMapper json;

    public RepositoryIndexController(RestClient.Builder builder, OAuth2AuthorizedClientService clients,
            GitnovaUserRepository users, JdbcTemplate jdbc, JsonMapper json) {
        this.clients = clients;
        this.users = users;
        this.jdbc = jdbc;
        this.json = json;
        this.github = builder.clone().baseUrl("https://api.github.com")
            .defaultHeader("Accept", "application/vnd.github+json")
            .defaultHeader("X-GitHub-Api-Version", "2022-11-28").build();
    }

    @PostMapping("/index")
    public IndexAccepted index(@RequestBody IndexRequest request, Authentication authentication) {
        if (request.repository() == null || !request.repository().matches("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid repository.");
        }
        OAuth2AuthenticationToken oauth = requireGitHub(authentication);
        String token = clients.loadAuthorizedClient("github", oauth.getName()).getAccessToken().getTokenValue();
        long ownerId = accountId(oauth);
        String[] parts = request.repository().split("/", 2);
        try {
            GitHubRepository repo = github.get().uri("/repos/{owner}/{repo}", parts[0], parts[1])
                .headers(headers -> headers.setBearerAuth(token)).retrieve().body(GitHubRepository.class);
            if (repo == null || repo.id() < 1 || repo.defaultBranch() == null || repo.defaultBranch().isBlank()) {
                throw new IllegalStateException("GitHub returned incomplete repository metadata.");
            }
            GitHubTree tree = github.get().uri(uri -> uri.path("/repos/{owner}/{repo}/git/trees/{branch}")
                    .queryParam("recursive", "1").build(parts[0], parts[1], repo.defaultBranch()))
                .headers(headers -> headers.setBearerAuth(token)).retrieve().body(GitHubTree.class);
            if (tree == null || tree.entries() == null) throw new IllegalStateException("GitHub returned no repository tree.");
            if (tree.truncated()) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                "GitHub truncated this repository tree. Index a smaller repository snapshot.");
            List<DocumentChunk> documents = loadChunks(parts[0], parts[1], tree.entries(), token);
            if (documents.isEmpty()) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "No supported source files were found in this repository.");
            jdbc.update("""
                INSERT INTO connected_repository(owner_user_id, github_repo_id, full_name, is_private, github_html_url)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(owner_user_id, github_repo_id) DO UPDATE SET
                  full_name=EXCLUDED.full_name, is_private=EXCLUDED.is_private,
                  github_html_url=EXCLUDED.github_html_url, updated_at=now()
                """, ownerId, repo.id(), request.repository(), repo.isPrivate(), repo.htmlUrl());
            String payload = json.writeValueAsString(Map.of(
                "ownerUserId", ownerId, "repoId", repo.id(), "repository", request.repository(),
                "treeSha", tree.sha(), "documents", documents));
            String key = "rag-index:" + ownerId + ":" + repo.id() + ":" + tree.sha();
            Long jobId = jdbc.queryForObject("""
                INSERT INTO background_job(job_type, idempotency_key, payload, owner_user_id)
                VALUES ('RAG_INDEX', ?, CAST(? AS jsonb), ?)
                ON CONFLICT(idempotency_key) DO UPDATE SET
                    payload=CASE WHEN background_job.status='failed' THEN EXCLUDED.payload ELSE background_job.payload END,
                    status=CASE WHEN background_job.status='failed' THEN 'queued' ELSE background_job.status END,
                    attempts=CASE WHEN background_job.status='failed' THEN 0 ELSE background_job.attempts END,
                    available_at=CASE WHEN background_job.status='failed' THEN now() ELSE background_job.available_at END,
                    result=CASE WHEN background_job.status='failed' THEN NULL ELSE background_job.result END,
                    last_error=CASE WHEN background_job.status='failed' THEN NULL ELSE background_job.last_error END,
                    updated_at=now()
                RETURNING id
                """, Long.class, key, payload, ownerId);
            return new IndexAccepted(jobId, request.repository(), documents.size(), "queued");
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "GitHub repository indexing could not be queued.");
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Repository indexing could not be queued.");
        }
    }

    @GetMapping("/jobs/{id}")
    public JobStatus job(@PathVariable long id, Authentication authentication) {
        long ownerId = accountId(requireGitHub(authentication));
        return jdbc.query("""
            SELECT id, status, result::text AS result, last_error
            FROM background_job WHERE id=? AND owner_user_id=?
            """, (rs, row) -> new JobStatus(rs.getLong("id"), rs.getString("status"),
                rs.getString("result"), rs.getString("last_error")), id, ownerId)
            .stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found."));
    }

    private List<DocumentChunk> loadChunks(String owner, String repo, List<TreeEntry> entries, String token) {
        var result = new ArrayList<DocumentChunk>();
        int totalBytes = 0;
        int filesRead = 0;
        for (TreeEntry entry : entries) {
            if (filesRead >= MAX_FILES || !isSupported(entry)) continue;
            Blob blob = github.get().uri("/repos/{owner}/{repo}/git/blobs/{sha}", owner, repo, entry.sha())
                .headers(headers -> headers.setBearerAuth(token)).retrieve().body(Blob.class);
            if (blob == null || !"base64".equals(blob.encoding()) || blob.content() == null) continue;
            byte[] bytes = java.util.Base64.getMimeDecoder().decode(blob.content());
            if (bytes.length > MAX_FILE_BYTES || totalBytes + bytes.length > MAX_SOURCE_BYTES) continue;
            totalBytes += bytes.length;
            filesRead++;
            String content = new String(bytes, StandardCharsets.UTF_8);
            String[] lines = content.split("\\R", -1);
            StringBuilder chunk = new StringBuilder();
            int chunkIndex = 0;
            int firstLine = 1;
            for (int i = 0; i < lines.length; i++) {
                String line = lines[i];
                if (chunk.length() > 0 && chunk.length() + line.length() + 1 > MAX_CHUNK_CHARS) {
                    result.add(document(entry.path(), chunkIndex++, firstLine, chunk.toString()));
                    chunk.setLength(0);
                    firstLine = i + 1;
                }
                int offset = 0;
                do {
                    int available = MAX_CHUNK_CHARS - chunk.length() - (chunk.isEmpty() ? 0 : 1);
                    if (available == 0) {
                        result.add(document(entry.path(), chunkIndex++, firstLine, chunk.toString()));
                        chunk.setLength(0);
                        firstLine = i + 1;
                        available = MAX_CHUNK_CHARS;
                    }
                    if (offset == 0 && !chunk.isEmpty()) chunk.append('\n');
                    int end = Math.min(line.length(), offset + available);
                    chunk.append(line, offset, end);
                    offset = end;
                    if (offset < line.length()) {
                        result.add(document(entry.path(), chunkIndex++, firstLine, chunk.toString()));
                        chunk.setLength(0);
                        firstLine = i + 1;
                    }
                } while (offset < line.length());
            }
            if (!chunk.isEmpty()) result.add(document(entry.path(), chunkIndex, firstLine, chunk.toString()));
        }
        return result;
    }

    private boolean isSupported(TreeEntry entry) {
        if (!"blob".equals(entry.type()) || entry.path() == null || entry.sha() == null
                || entry.size() == null || entry.size() > MAX_FILE_BYTES) return false;
        String lower = entry.path().toLowerCase();
        for (String segment : lower.split("/")) if (EXCLUDED_SEGMENTS.contains(segment)) return false;
        return ALLOWED_EXTENSIONS.stream().anyMatch(lower::endsWith);
    }

    private DocumentChunk document(String path, int chunkIndex, int firstLine, String text) {
        try {
            String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
            return new DocumentChunk(path, chunkIndex, firstLine, hash, text);
        } catch (Exception exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }

    private long accountId(OAuth2AuthenticationToken oauth) {
        Object rawId = oauth.getPrincipal().getAttribute("id");
        if (!(rawId instanceof Number number)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Reconnect your GitHub account.");
        return users.findByGithubId(number.longValue()).map(user -> user.id())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Connect your GitHub account first."));
    }

    private OAuth2AuthenticationToken requireGitHub(Authentication authentication) {
        if (!(authentication instanceof OAuth2AuthenticationToken oauth)
                || clients.loadAuthorizedClient("github", oauth.getName()) == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Connect GitHub before indexing a repository.");
        }
        return oauth;
    }

    public record IndexRequest(String repository) {}
    public record IndexAccepted(Long jobId, String repository, int chunkCount, String status) {}
    public record JobStatus(long id, String status, String result, String error) {}
    private record GitHubRepository(long id, @JsonProperty("full_name") String fullName,
        @JsonProperty("default_branch") String defaultBranch, @JsonProperty("html_url") String htmlUrl,
        @JsonProperty("private") boolean isPrivate) {}
    private record GitHubTree(String sha, @JsonProperty("tree") List<TreeEntry> entries,
        @JsonProperty("truncated") boolean truncated) {}
    private record TreeEntry(String path, String sha, String type, Long size) {}
    private record Blob(String content, String encoding) {}
    public record DocumentChunk(String path, int chunkIndex, int firstLine, String hash, String content) {}
}
