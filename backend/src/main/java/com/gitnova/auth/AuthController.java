package com.gitnova.auth;

import com.gitnova.user.GitnovaUser;
import com.gitnova.user.GitnovaUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final GitnovaUserRepository users;
    private final PasswordEncoder passwords;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository contexts;

    public AuthController(GitnovaUserRepository users, PasswordEncoder passwords,
        AuthenticationManager authenticationManager, SecurityContextRepository contexts) {
        this.users = users; this.passwords = passwords;
        this.authenticationManager = authenticationManager; this.contexts = contexts;
    }

    @GetMapping("/csrf")
    public String csrf(CsrfToken token) { return token.getToken(); }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        var email = request.email().trim().toLowerCase();
        if (users.findByEmail(email).isPresent()) return ResponseEntity.status(HttpStatus.CONFLICT).body("An account with this email already exists.");
        GitnovaUser account;
        try {
            account = users.save(new GitnovaUser(null, request.name().trim(), email,
                passwords.encode(request.password()), null, java.time.Instant.now()));
        } catch (DuplicateKeyException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("An account with this email already exists.");
        }
        establishAuthentication(email, request.password(), servletRequest, servletResponse);
        return ResponseEntity.status(HttpStatus.CREATED).body(new AccountResponse(account.id(), account.name(), account.email()));
    }

    @PostMapping("/login")
    public ResponseEntity<AccountResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        var email = request.email().trim().toLowerCase();
        Authentication authentication = authenticationManager.authenticate(
            UsernamePasswordAuthenticationToken.unauthenticated(email, request.password()));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, servletRequest, servletResponse);
        var user = users.findByEmail(email).orElseThrow();
        return ResponseEntity.ok(new AccountResponse(user.id(), user.name(), user.email()));
    }

    private void establishAuthentication(String email, String password, HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = authenticationManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(email, password));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
    }

    public record RegisterRequest(@NotBlank @Size(max = 100) String name,
        @NotBlank @Email @Size(max = 254) String email, @NotBlank @Size(min = 12, max = 128) String password) {}
    public record LoginRequest(@NotBlank @Email @Size(max = 254) String email, @NotBlank @Size(max = 128) String password) {}
    public record AccountResponse(Long id, String name, String email) {}
}
