ALTER TABLE background_job
    ADD COLUMN owner_user_id BIGINT REFERENCES app_user(id) ON DELETE CASCADE,
    ADD COLUMN result JSONB;

CREATE INDEX background_job_owner_idx ON background_job(owner_user_id, created_at DESC);

CREATE INDEX repository_document_embedding_idx
    ON repository_document USING hnsw (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL;
