CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE app_user (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(100),
    github_id BIGINT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE connected_repository (
    id BIGSERIAL PRIMARY KEY,
    owner_user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    github_repo_id BIGINT NOT NULL,
    full_name VARCHAR(300) NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT false,
    github_html_url TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(owner_user_id, github_repo_id)
);

CREATE TABLE background_job (
    id BIGSERIAL PRIMARY KEY,
    job_type VARCHAR(80) NOT NULL,
    idempotency_key VARCHAR(200) NOT NULL UNIQUE,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(120),
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX background_job_claim_idx ON background_job(status, available_at, created_at);

CREATE TABLE github_webhook_event (
    delivery_id VARCHAR(200) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    repository_id BIGINT,
    repository_name VARCHAR(300),
    action VARCHAR(100),
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX github_webhook_event_repo_idx ON github_webhook_event(repository_id, received_at DESC);

CREATE TABLE repository_document (
    id BIGSERIAL PRIMARY KEY,
    owner_user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    github_repo_id BIGINT NOT NULL,
    file_path TEXT NOT NULL,
    content_hash CHAR(64) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(owner_user_id, github_repo_id, file_path)
);
CREATE INDEX repository_document_scope_idx ON repository_document(owner_user_id, github_repo_id);
