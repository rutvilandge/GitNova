package com.gitnova.rag;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GeminiEmbeddingService {
    public static final int DIMENSIONS = 768;
    private static final String MODEL = "models/gemini-embedding-2";
    private final RestClient client;
    private final String apiKey;

    public GeminiEmbeddingService(RestClient.Builder builder,
            @Value("${gitnova.gemini-api-key:}") String apiKey) {
        this.client = builder.clone().baseUrl("https://generativelanguage.googleapis.com/v1beta").build();
        this.apiKey = apiKey;
    }

    public List<float[]> embedDocuments(List<String> documents) {
        return embed(documents.stream().map(text -> "task: code retrieval | title: repository source | text: " + text).toList());
    }

    public float[] embedQuery(String question) {
        return embed(List.of("task: code retrieval | query: " + question)).getFirst();
    }

    private List<float[]> embed(List<String> texts) {
        if (apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Semantic search is not configured. Set GEMINI_API_KEY on the backend.");
        }
        var result = new ArrayList<float[]>(texts.size());
        for (int start = 0; start < texts.size(); start += 16) {
            var batch = texts.subList(start, Math.min(start + 16, texts.size()));
            var requests = batch.stream().map(text -> Map.of(
                "model", MODEL,
                "content", Map.of("parts", List.of(Map.of("text", text))),
                "embedContentConfig", Map.of("outputDimensionality", DIMENSIONS))).toList();
            try {
                Map<?, ?> response = client.post().uri("/models/gemini-embedding-2:batchEmbedContents")
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("requests", requests))
                    .retrieve().body(Map.class);
                Object embeddingsValue = response == null ? null : response.get("embeddings");
                if (!(embeddingsValue instanceof List<?> embeddings) || embeddings.size() != batch.size()) {
                    throw new IllegalStateException("Gemini returned an incomplete embedding batch.");
                }
                for (Object value : embeddings) {
                    if (!(value instanceof Map<?, ?> embedding) || !(embedding.get("values") instanceof List<?> values)
                            || values.size() != DIMENSIONS) {
                        throw new IllegalStateException("Gemini returned an invalid embedding vector.");
                    }
                    float[] vector = new float[DIMENSIONS];
                    for (int i = 0; i < DIMENSIONS; i++) vector[i] = ((Number) values.get(i)).floatValue();
                    result.add(vector);
                }
            } catch (ResponseStatusException exception) {
                throw exception;
            } catch (RuntimeException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The embedding provider failed. Try again later.");
            }
        }
        return result;
    }
}
