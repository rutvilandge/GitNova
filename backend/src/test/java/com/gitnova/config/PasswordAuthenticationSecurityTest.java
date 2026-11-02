package com.gitnova.config;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.gitnova.user.GitnovaUser;
import com.gitnova.user.GitnovaUserRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

class PasswordAuthenticationSecurityTest {
    @Test
    void githubOnlyAccountCannotAuthenticateWithAPlaceholderPassword() {
        GitnovaUserRepository users = mock(GitnovaUserRepository.class);
        when(users.findByEmail("oauth@example.test")).thenReturn(Optional.of(
            new GitnovaUser(7L, "GitHub User", "oauth@example.test", null, 42L, Instant.now())));

        var userDetails = new SecurityConfig().userDetailsService(users);

        assertThrows(UsernameNotFoundException.class, () -> userDetails.loadUserByUsername("oauth@example.test"));
    }
}
