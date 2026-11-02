package com.gitnova.intelligence;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
@RequestMapping("/api/v1/intelligence/impact")
public class ChangeImpactController {
    private static final int MAX_PULL_FILES = 100;
    private final DependencyGraphController dependencies;
    private final OAuth2AuthorizedClientService clients;
    private final RestClient github;

    public ChangeImpactController(DependencyGraphController dependencies, OAuth2AuthorizedClientService clients, RestClient.Builder builder) {
        this.dependencies = dependencies;
        this.clients = clients;
        this.github = builder.clone().baseUrl("https://api.github.com")
            .defaultHeader("Accept", "application/vnd.github+json")
            .defaultHeader("X-GitHub-Api-Version", "2022-11-28").build();
    }

    @GetMapping
    public ImpactResponse impact(@RequestParam String repository, @RequestParam int pullNumber, Authentication authentication) {
        if (pullNumber < 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide a valid pull request number.");
        DependencyGraphController.GraphResponse graph = dependencies.graph(repository, authentication);
        if (!(authentication instanceof OAuth2AuthenticationToken oauth)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Connect GitHub to analyze pull request impact.");
        OAuth2AuthorizedClient client = clients.loadAuthorizedClient("github", oauth.getName());
        if (client == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Connect GitHub to analyze pull request impact.");
        String[] parts = repository.split("/", 2);
        PullRequestFile[] pullFiles;
        try {
            pullFiles = github.get().uri("/repos/{owner}/{repo}/pulls/{number}/files?per_page=100", parts[0], parts[1], pullNumber)
                .headers(headers -> headers.setBearerAuth(client.getAccessToken().getTokenValue())).retrieve().body(PullRequestFile[].class);
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "GitHub could not load pull request files. Check repository access and the pull request number.");
        }
        if (pullFiles == null) pullFiles = new PullRequestFile[0];
        if (pullFiles.length == MAX_PULL_FILES) {
            PullRequestFile[] additional;
            try {
                additional = github.get().uri("/repos/{owner}/{repo}/pulls/{number}/files?per_page=100&page=2", parts[0], parts[1], pullNumber)
                    .headers(headers -> headers.setBearerAuth(client.getAccessToken().getTokenValue())).retrieve().body(PullRequestFile[].class);
            } catch (RuntimeException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "GitHub could not confirm the pull request file limit.");
            }
            if (additional != null && additional.length > 0) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "This pull request exceeds the 100-file impact analysis limit.");
        }

        Set<String> known = graph.nodes().stream().map(DependencyGraphController.GraphNode::path).collect(java.util.stream.Collectors.toSet());
        List<ChangedFile> changed = java.util.Arrays.stream(pullFiles)
            .filter(file -> file.filename() != null)
            .map(file -> new ChangedFile(file.filename(), file.status(), file.additions(), file.deletions(), file.changes(), known.contains(file.filename())))
            .toList();
        Map<String, List<String>> reverseEdges = new HashMap<>();
        for (DependencyGraphController.GraphEdge edge : graph.edges()) reverseEdges.computeIfAbsent(edge.target(), ignored -> new ArrayList<>()).add(edge.source());

        Map<String, ImpactPath> affected = new HashMap<>();
        ArrayDeque<ImpactPath> queue = new ArrayDeque<>();
        for (ChangedFile file : changed) if (file.indexed()) queue.add(new ImpactPath(file.path(), 0, file.path()));
        Set<String> visited = new HashSet<>(changed.stream().filter(ChangedFile::indexed).map(ChangedFile::path).toList());
        while (!queue.isEmpty() && affected.size() < 200) {
            ImpactPath current = queue.removeFirst();
            for (String dependent : reverseEdges.getOrDefault(current.path(), List.of())) {
                if (visited.add(dependent)) {
                    ImpactPath impacted = new ImpactPath(dependent, current.distance() + 1, current.path());
                    affected.put(dependent, impacted);
                    queue.addLast(impacted);
                }
            }
        }
        List<ImpactedFile> impactedFiles = affected.values().stream().sorted(java.util.Comparator.comparingInt(ImpactPath::distance).thenComparing(ImpactPath::path))
            .map(item -> new ImpactedFile(item.path(), item.distance(), item.through())).toList();
        return new ImpactResponse(repository, pullNumber, changed, impactedFiles, graph.indexedFiles(), graph.edges().size(), affected.size() >= 200);
    }

    public record ImpactResponse(String repository, int pullNumber, List<ChangedFile> changedFiles,
        List<ImpactedFile> impactedFiles, int indexedFiles, int analyzedLinks, boolean impactListTruncated) {}
    public record ChangedFile(String path, String status, int additions, int deletions, int changes, boolean indexed) {}
    public record ImpactedFile(String path, int dependencyHops, String connectedTo) {}
    private record ImpactPath(String path, int distance, String through) {}
    private record PullRequestFile(String filename, String status, int additions, int deletions, int changes) {}
}
