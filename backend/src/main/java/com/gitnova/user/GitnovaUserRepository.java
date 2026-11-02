package com.gitnova.user;

import java.util.Optional;
import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

public interface GitnovaUserRepository extends CrudRepository<GitnovaUser, Long> {
    @Query("SELECT id, name, email, password_hash, github_id, created_at FROM app_user WHERE lower(email) = lower(:email)")
    Optional<GitnovaUser> findByEmail(@Param("email") String email);

    @Query("SELECT id, name, email, password_hash, github_id, created_at FROM app_user WHERE github_id = :githubId")
    Optional<GitnovaUser> findByGithubId(@Param("githubId") Long githubId);
}
