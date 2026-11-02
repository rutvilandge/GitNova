CREATE TABLE api_rate_limit_bucket (
    subject_hash CHAR(64) NOT NULL,
    bucket_key VARCHAR(40) NOT NULL,
    window_started_at TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL CHECK (request_count > 0),
    PRIMARY KEY (subject_hash, bucket_key)
);
