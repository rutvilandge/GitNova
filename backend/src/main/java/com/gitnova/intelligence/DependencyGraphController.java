package com.gitnova.intelligence;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.gitnova.user.GitnovaUserRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/intelligence/dependencies")
public class DependencyGraphController {
    private static final Pattern JS_IMPORT = Pattern.compile("(?:import|export)\\s+(?:.*?\\s+from\\s+)?['\\\"]([^'\\\"]+)['\\\"]|require\\(['\\\"]([^'\\\"]+)['\\\"]\\)");
    private static final Pattern JAVA_IMPORT = Pattern.compile("\\bimport\\s+(?:static\\s+)?([\\w.]+)\\s*;");
    private static final Pattern PY_IMPORT = Pattern.compile("\\bfrom\\s+(\\.*[\\w.]+)\\s+import\\b");
    private final JdbcTemplate jdbc;
    private final GitnovaUserRepository users;
    private final OAuth2AuthorizedClientService clients;
    private final RestClient github;

    public DependencyGraphController(RestClient.Builder builder, JdbcTemplate jdbc, GitnovaUserRepository users,
            OAuth2AuthorizedClientService clients) {
        this.jdbc = jdbc;
        this.users = users;
        this.clients = clients;
        this.github = builder.clone().baseUrl("https://api.github.com")
            .defaultHeader("Accept", "application/vnd.github+json")
            .defaultHeader("X-GitHub-Api-Version", "2022-11-28").build();
    }

    @GetMapping
    public GraphResponse graph(@RequestParam String repository, Authentication authentication) {
        if (repository == null || !repository.matches("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid repository.");
        }
        OAuth2AuthenticationToken oauth = requireGitHub(authentication);
        Object rawId = oauth.getPrincipal().getAttribute("id");
        if (!(rawId instanceof Number number)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Reconnect your GitHub account.");
        long ownerId = users.findByGithubId(number.longValue()).map(user -> user.id())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Connect your GitHub account first."));
        String token = clients.loadAuthorizedClient("github", oauth.getName()).getAccessToken().getTokenValue();
        String[] parts = repository.split("/", 2);
        Repository githubRepo;
        try {
            githubRepo = github.get().uri("/repos/{owner}/{repo}", parts[0], parts[1])
                .headers(headers -> headers.setBearerAuth(token)).retrieve().body(Repository.class);
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "GitHub could not confirm access to this repository.");
        }
        if (githubRepo == null || githubRepo.id() < 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Repository is not accessible.");
        boolean indexed = Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM connected_repository WHERE owner_user_id=? AND github_repo_id=? AND full_name=?)
            """, Boolean.class, ownerId, githubRepo.id(), repository));
        if (!indexed) throw new ResponseStatusException(HttpStatus.CONFLICT, "Index this repository to build its dependency graph.");

        List<IndexedFile> files = jdbc.query("""
            SELECT file_path, string_agg(content, E'\\n' ORDER BY chunk_index) AS content
            FROM repository_document WHERE owner_user_id=? AND github_repo_id=?
            GROUP BY file_path ORDER BY file_path LIMIT 200
            """, (rs, row) -> new IndexedFile(rs.getString("file_path"), rs.getString("content")), ownerId, githubRepo.id());
        if (files.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "This repository has no indexed source files yet.");

        Map<String, IndexedFile> byPath = new LinkedHashMap<>();
        files.forEach(file -> byPath.put(file.path(), file));
        LinkedHashSet<GraphEdge> edges = new LinkedHashSet<>();
        for (IndexedFile file : files) {
            String lower = file.path().toLowerCase();
            if (lower.endsWith(".java")) matchJava(file, byPath, edges);
            else if (lower.endsWith(".py")) matchPython(file, byPath, edges);
            else if (lower.matches(".*\\.(ts|tsx|js|jsx)$")) matchJavaScript(file, byPath, edges);
        }
        List<GraphNode> nodes = files.stream().map(file -> new GraphNode(file.path(), file.path(), file.path().substring(file.path().lastIndexOf('/') + 1))).toList();
        return new GraphResponse(repository, nodes, new ArrayList<>(edges), files.size());
    }

    private void matchJavaScript(IndexedFile file, Map<String, IndexedFile> files, LinkedHashSet<GraphEdge> edges) {
        Matcher matcher = JS_IMPORT.matcher(file.content());
        while (matcher.find()) {
            String module = matcher.group(1) != null ? matcher.group(1) : matcher.group(2);
            if (module.startsWith(".")) resolveRelative(file.path(), module, files).ifPresent(path -> edges.add(new GraphEdge(file.path(), path)));
        }
    }

    private void matchJava(IndexedFile file, Map<String, IndexedFile> files, LinkedHashSet<GraphEdge> edges) {
        Matcher matcher = JAVA_IMPORT.matcher(file.content());
        while (matcher.find()) {
            String suffix = matcher.group(1).replace('.', '/') + ".java";
            files.keySet().stream().filter(path -> path.endsWith(suffix)).findFirst()
                .ifPresent(path -> edges.add(new GraphEdge(file.path(), path)));
        }
    }

    private void matchPython(IndexedFile file, Map<String, IndexedFile> files, LinkedHashSet<GraphEdge> edges) {
        Matcher matcher = PY_IMPORT.matcher(file.content());
        while (matcher.find()) {
            String module = matcher.group(1);
            if (!module.startsWith(".")) continue;
            int parent = file.path().lastIndexOf('/');
            String base = parent < 0 ? "" : file.path().substring(0, parent + 1);
            int dots = 0;
            while (dots < module.length() && module.charAt(dots) == '.') dots++;
            for (int i = 1; i < dots && base.contains("/"); i++) base = base.substring(0, base.substring(0, base.length() - 1).lastIndexOf('/') + 1);
            String candidate = base + module.substring(dots).replace('.', '/');
            for (String path : List.of(candidate + ".py", candidate + "/__init__.py")) if (files.containsKey(path)) edges.add(new GraphEdge(file.path(), path));
        }
    }

    private java.util.Optional<String> resolveRelative(String source, String module, Map<String, IndexedFile> files) {
        int parent = source.lastIndexOf('/');
        String base = parent < 0 ? "" : source.substring(0, parent + 1);
        List<String> parts = new ArrayList<>(List.of((base + module).split("/")));
        List<String> normalized = new ArrayList<>();
        for (String part : parts) {
            if (part.isBlank() || part.equals(".")) continue;
            if (part.equals("..")) { if (!normalized.isEmpty()) normalized.removeLast(); }
            else normalized.add(part);
        }
        String path = String.join("/", normalized);
        for (String suffix : List.of("", ".ts", ".tsx", ".js", ".jsx", ".java", "/index.ts", "/index.tsx", "/index.js")) {
            if (files.containsKey(path + suffix)) return java.util.Optional.of(path + suffix);
        }
        return java.util.Optional.empty();
    }

    private OAuth2AuthenticationToken requireGitHub(Authentication authentication) {
        if (!(authentication instanceof OAuth2AuthenticationToken oauth) || clients.loadAuthorizedClient("github", oauth.getName()) == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Connect GitHub to view repository dependencies.");
        }
        return oauth;
    }

    public record GraphResponse(String repository, List<GraphNode> nodes, List<GraphEdge> edges, int indexedFiles) {}
    public record GraphNode(String id, String path, String label) {}
    public record GraphEdge(String source, String target) {}
    private record Repository(long id) {}
    private record IndexedFile(String path, String content) {}
}
