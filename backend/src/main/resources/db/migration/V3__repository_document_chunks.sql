ALTER TABLE repository_document
    DROP CONSTRAINT repository_document_owner_user_id_github_repo_id_file_path_key;

ALTER TABLE repository_document
    ADD COLUMN chunk_index INTEGER NOT NULL DEFAULT 0;

ALTER TABLE repository_document
    ADD CONSTRAINT repository_document_owner_repo_path_chunk_key
    UNIQUE(owner_user_id, github_repo_id, file_path, chunk_index);
