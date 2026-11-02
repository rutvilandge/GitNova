package com.gitnova.config;

import java.util.List;
import com.gitnova.github.GitHubOAuthUserService;
import com.gitnova.user.GitnovaUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.client.RestClient;

@Configuration
public class SecurityConfig {
    @Bean RestClient.Builder restClientBuilder() { return RestClient.builder(); }

    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean UserDetailsService userDetailsService(GitnovaUserRepository users) {
        return email -> users.findByEmail(email)
            .filter(account -> account.passwordHash() != null && !account.passwordHash().isBlank())
            .map(account -> User.withUsername(account.email())
                .password(account.passwordHash())
                .roles("USER").build())
            .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException("Account not found"));
    }

    @Bean DaoAuthenticationProvider authenticationProvider(UserDetailsService users, PasswordEncoder encoder) {
        var provider = new DaoAuthenticationProvider(users);
        provider.setPasswordEncoder(encoder);
        return provider;
    }

    @Bean AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean SecurityContextRepository securityContextRepository() { return new HttpSessionSecurityContextRepository(); }

    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http, DaoAuthenticationProvider provider,
        SecurityContextRepository contexts, @Qualifier("corsConfigurationSource") CorsConfigurationSource cors,
        GitHubOAuthUserService githubUsers,
        @Value("${gitnova.frontend-url}") String frontendUrl) throws Exception {
        return http.authenticationProvider(provider).cors(c -> c.configurationSource(cors))
            .csrf(c -> c.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                .ignoringRequestMatchers("/api/v1/webhooks/github"))
            .authorizeHttpRequests(a -> a.requestMatchers("/actuator/health/**", "/api/v1/health", "/api/v1/auth/csrf", "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/webhooks/github", "/oauth2/**", "/login/**").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll().anyRequest().authenticated())
            .exceptionHandling(e -> e.defaultAuthenticationEntryPointFor(
                new HttpStatusEntryPoint(org.springframework.http.HttpStatus.UNAUTHORIZED),
                request -> request.getRequestURI().startsWith("/api/")))
            .oauth2Login(o -> o.userInfoEndpoint(user -> user.userService(githubUsers))
                .defaultSuccessUrl(frontendUrl + "/dashboard", true))
            .logout(l -> l.logoutUrl("/api/v1/auth/logout").logoutSuccessHandler((request, response, authentication) -> response.sendRedirect(frontendUrl + "/")))
            .securityContext(c -> c.securityContextRepository(contexts))
            .build();
    }

    @Bean CorsConfigurationSource corsConfigurationSource(@Value("${gitnova.frontend-url}") String frontendUrl) {
        var configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(frontendUrl));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN"));
        configuration.setAllowCredentials(true);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
