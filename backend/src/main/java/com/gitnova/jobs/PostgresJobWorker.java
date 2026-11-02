package com.gitnova.jobs;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import com.gitnova.rag.GeminiEmbeddingService;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.time.Duration;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Profile("worker")
@EnableScheduling
public class PostgresJobWorker {
    private static final Logger log = LoggerFactory.getLogger(PostgresJobWorker.class);
    private static final String WORKER_ID = "worker-" + UUID.randomUUID();
    private final JdbcTemplate jdbc;
    private final JsonMapper json;
    private final GeminiEmbeddingService embeddings;

    public PostgresJobWorker(JdbcTemplate jdbc, JsonMapper json, GeminiEmbeddingService embeddings) {
        this.jdbc = jdbc;
        this.json = json;
        this.embeddings = embeddings;
    }

    @Scheduled(fixedDelayString = "${gitnova.jobs.poll-delay-ms:2000}")
    public void poll() {
        recoverExpiredLeases();
        Job job = claim();
        if (job == null) return;
        try {
            String result = process(job);
            jdbc.update("UPDATE background_job SET status='succeeded', result=CAST(? AS jsonb), locked_at=NULL, locked_by=NULL, last_error=NULL, updated_at=now() WHERE id=? AND locked_by=?", result, job.id(), WORKER_ID);
        } catch (Exception exception) {
            retry(job, exception);
        }
    }

    private void recoverExpiredLeases() {
        jdbc.update("UPDATE background_job SET status='queued', locked_at=NULL, locked_by=NULL, available_at=now(), updated_at=now() WHERE status='running' AND locked_at < now() - interval '15 minutes'");
    }

    private Job claim() {
        var jobs = jdbc.query("""
            WITH next_job AS (
              SELECT id FROM background_job
              WHERE status='queued' AND available_at <= now()
              ORDER BY available_at, created_at
              FOR UPDATE SKIP LOCKED LIMIT 1
            )
            UPDATE background_job job
            SET status='running', locked_at=now(), locked_by=?, attempts=attempts+1, updated_at=now()
            FROM next_job WHERE job.id=next_job.id
            RETURNING job.id, job.job_type, job.payload::text AS payload, job.attempts, job.owner_user_id
            """, (rs, row) -> new Job(rs.getLong("id"), rs.getString("job_type"), rs.getString("payload"), rs.getInt("attempts"), rs.getLong("owner_user_id")), WORKER_ID);
        return jobs.isEmpty() ? null : jobs.getFirst();
    }

    private String process(Job job) throws Exception {
        if ("RAG_INDEX".equals(job.type())) return indexRepository(job);
        if (!"GITHUB_WEBHOOK".equals(job.type())) throw new IllegalArgumentException("Unsupported background job type.");
        JsonNode wrapper = json.readTree(job.payload());
        String delivery = wrapper.path("deliveryId").asText();
        String eventType = wrapper.path("eventType").asText();
        JsonNode payload = wrapper.path("payload");
        if (delivery.isBlank() || eventType.isBlank() || payload.isMissingNode()) throw new IllegalArgumentException("Incomplete webhook job payload.");
        JsonNode repo = payload.path("repository");
        String repositoryName = repo.path("full_name").asText(null);
        Long repositoryId = repo.path("id").canConvertToLong() ? repo.path("id").asLong() : null;
        String action = payload.path("action").asText(null);
        jdbc.update("""
            INSERT INTO github_webhook_event(delivery_id, event_type, repository_id, repository_name, action, payload)
            VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb))
            ON CONFLICT (delivery_id) DO NOTHING
            """, delivery, eventType, repositoryId, repositoryName, action, payload.toString());
        return json.writeValueAsString(Map.of("stored", true, "deliveryId", delivery));
    }

    private String indexRepository(Job job) throws Exception {
        JsonNode payload = json.readTree(job.payload());
        long ownerUserId = payload.path("ownerUserId").asLong(-1);
        long repositoryId = payload.path("repoId").asLong(-1);
        JsonNode docsNode = payload.path("documents");
        if (ownerUserId != job.ownerUserId() || ownerUserId < 1 || repositoryId < 1 || !docsNode.isArray() || docsNode.isEmpty()) {
            throw new IllegalArgumentException("Incomplete repository indexing job.");
        }
        List<RepositoryDocument> documents = json.convertValue(docsNode,
            json.getTypeFactory().constructCollectionType(List.class, RepositoryDocument.class));
        List<float[]> vectors = embeddings.embedDocuments(documents.stream().map(RepositoryDocument::content).toList());
        if (vectors.size() != documents.size()) throw new IllegalStateException("Embedding result count does not match indexed content.");

        Timestamp indexStartedAt = Timestamp.from(Instant.now());
        for (int i = 0; i < documents.size(); i++) {
            RepositoryDocument document = documents.get(i);
            jdbc.update("""
                INSERT INTO repository_document(owner_user_id, github_repo_id, file_path, chunk_index, content_hash, content, embedding)
                VALUES (?, ?, ?, ?, ?, ?, CAST(? AS vector))
                ON CONFLICT(owner_user_id, github_repo_id, file_path, chunk_index) DO UPDATE SET
                    content_hash=EXCLUDED.content_hash, content=EXCLUDED.content, embedding=EXCLUDED.embedding, indexed_at=now()
                """, ownerUserId, repositoryId, document.path(), document.chunkIndex(), document.hash(), document.content(), vectorLiteral(vectors.get(i)));
        }
        jdbc.update("DELETE FROM repository_document WHERE owner_user_id=? AND github_repo_id=? AND indexed_at < ?",
            ownerUserId, repositoryId, indexStartedAt);
        return json.writeValueAsString(Map.of("indexedChunks", documents.size(), "repository", payload.path("repository").asText()));
    }

    private String vectorLiteral(float[] vector) {
        StringBuilder value = new StringBuilder(vector.length * 10).append('[');
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) value.append(',');
            value.append(Float.toString(vector[i]));
        }
        return value.append(']').toString();
    }

    private void retry(Job job, Exception exception) {
        long delaySeconds = Math.min(Duration.ofHours(1).toSeconds(), 1L << Math.min(job.attempts(), 11));
        String message = exception.getClass().getSimpleName() + " while processing " + job.type();
        jdbc.update("""
            UPDATE background_job
            SET status=CASE WHEN attempts >= 8 THEN 'failed' ELSE 'queued' END,
                available_at=now() + (? * interval '1 second'), locked_at=NULL, locked_by=NULL,
                last_error=?, updated_at=now()
            WHERE id=? AND locked_by=?
            """, delaySeconds, message, job.id(), WORKER_ID);
        log.warn("Background job {} failed on attempt {}; retry scheduled in {} seconds", job.id(), job.attempts(), delaySeconds);
    }

    private record Job(long id, String type, String payload, int attempts, long ownerUserId) {}
    private record RepositoryDocument(String path, int chunkIndex, int firstLine, String hash, String content) {}
}
