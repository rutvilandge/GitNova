package com.gitnova.user;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@Table("app_user")
public record GitnovaUser(
    @Id Long id,
    String name,
    String email,
    @Column("password_hash") String passwordHash,
    @Column("github_id") Long githubId,
    @Column("created_at") Instant createdAt
) {}
