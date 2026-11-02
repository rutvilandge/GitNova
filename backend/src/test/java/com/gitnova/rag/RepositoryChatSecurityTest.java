package com.gitnova.rag;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.gitnova.user.GitnovaUserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

class RepositoryChatSecurityTest {
    @Test
    void chatRequiresAnAuthorizedGithubClientBeforeRepositoryLookup() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        OAuth2AuthorizedClientService clients = mock(OAuth2AuthorizedClientService.class);
        when(clients.loadAuthorizedClient("github", "intruder")).thenReturn(null);
        var controller = new RepositoryChatController(RestClient.builder(), jdbc,
            mock(GitnovaUserRepository.class), clients, mock(GeminiEmbeddingService.class),
            "configured-for-test", "test-model");
        var authentication = UsernamePasswordAuthenticationToken.authenticated("intruder", "", java.util.List.of());

        ResponseStatusException failure = assertThrows(ResponseStatusException.class,
            () -> controller.chat(new RepositoryChatController.ChatRequest("owner/private-repo", "What does this do?"), authentication));

        assertEquals(409, failure.getStatusCode().value());
    }

    @Test
    void missingEmbeddingCredentialFailsClosed() {
        var embeddings = new GeminiEmbeddingService(RestClient.builder(), "");

        ResponseStatusException failure = assertThrows(ResponseStatusException.class,
            () -> embeddings.embedQuery("How is authentication handled?"));

        assertEquals(503, failure.getStatusCode().value());
    }
}
