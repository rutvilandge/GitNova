package com.gitnova.github;

import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GitHubRepositoryContractTest {
    @Test
    void browserRepositoryResponseUsesTheDashboardFieldNames() throws Exception {
        String response = JsonMapper.builder().build().writeValueAsString(
            new GitHubRepositoryController.RepositoryResponse(42L, "rutvilandge/GitNova", true, "description", "https://github.com/rutvilandge/GitNova"));

        assertTrue(response.contains("\"fullName\":\"rutvilandge/GitNova\""));
        assertTrue(response.contains("\"private\":true"));
        assertTrue(response.contains("\"htmlUrl\":\"https://github.com/rutvilandge/GitNova\""));
    }
}
