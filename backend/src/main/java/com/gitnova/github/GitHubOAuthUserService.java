package com.gitnova.github;

import com.gitnova.user.GitnovaUser;
import com.gitnova.user.GitnovaUserRepository;
import java.time.Instant;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class GitHubOAuthUserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {
    private final DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();
    private final GitnovaUserRepository users;
    private final RestClient github;

    public GitHubOAuthUserService(GitnovaUserRepository users, RestClient.Builder builder) {
        this.users = users;
        this.github = builder.baseUrl("https://api.github.com").defaultHeader("Accept", "application/vnd.github+json").build();
    }

    @Override public OAuth2User loadUser(OAuth2UserRequest request) throws OAuth2AuthenticationException {
        OAuth2User profile = delegate.loadUser(request);
        Object rawId = profile.getAttribute("id");
        if (!(rawId instanceof Number number)) throw new OAuth2AuthenticationException(new OAuth2Error("invalid_user_info_response"));
        long githubId = number.longValue();
        String login = profile.getAttribute("login");
        String email = verifiedEmail(request);
        if (email == null || email.isBlank()) email = "github+" + githubId + "@users.gitnova.invalid";
        String name = profile.getAttribute("name");
        if (name == null || name.isBlank()) name = login;
        var linked = users.findByGithubId(githubId);
        if (linked.isPresent()) return profile;
        String finalEmail = email.trim().toLowerCase();
        var existing = users.findByEmail(finalEmail);
        if (existing.isPresent()) {
            GitnovaUser account = existing.get();
            if (account.githubId() != null && account.githubId() != githubId)
                throw new OAuth2AuthenticationException(new OAuth2Error("account_link_conflict"));
            users.save(new GitnovaUser(account.id(), account.name(), account.email(), account.passwordHash(), githubId, account.createdAt()));
        } else {
            users.save(new GitnovaUser(null, name, finalEmail, null, githubId, Instant.now()));
        }
        return profile;
    }

    private String verifiedEmail(OAuth2UserRequest request) {
        try {
            var response = github.get().uri("/user/emails")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + request.getAccessToken().getTokenValue())
                .retrieve().body(GitHubEmail[].class);
            if (response == null) return null;
            for (GitHubEmail email : response) if (email.primary() && email.verified()) return email.email();
        } catch (RuntimeException ignored) {
            // A private or unavailable email is represented by a non-routable placeholder.
        }
        return null;
    }

    private record GitHubEmail(String email, boolean primary, boolean verified) {}
}
