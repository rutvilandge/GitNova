# GITNOVA roadmap verification

Updated 2026-11-02. Status describes code and checks in this workspace only. A source implementation is not marked verified as an integration until the connected external service has been exercised end to end.

| Phase | Status | Verified evidence / remaining work |
| --- | --- | --- |
| 1. Cinematic landing page | Partial | Original GITNOVA identity, cinematic split hero, capability storytelling switcher (PR review, repository chat, dependency map, change impact), feature journey, dashboard previews, architecture, CTA and footer. Capability previews are labeled illustrative; interaction test added. Browser-level responsive audit remains. |
| 2. Login and signup UI | Partial | Forms use the session API and CSRF helper; Vitest covers login errors and password confirmation. Live database-backed registration is unverified. |
| 3. Java backend, Neon, security, authentication | Partial | Neon is connected from the local backend. Flyway validated and applied migrations v1-v4; the API started and `/actuator/health` returned `UP`. Database-backed registration/login and GitHub OAuth still need end-to-end verification. |
| 4. GitHub OAuth and repository integration | Partial | OAuth is configured locally; the user's browser showed a connected GitHub session with 16 accessible repositories. Added a server-side GitHub repository create endpoint and dashboard form using the signed-in OAuth client and CSRF protection. The new create flow still needs a live browser request. GitLite-style account filesystem roots, file editing, browser folder sync, and local Git history are not part of the current GitHub-backed implementation. |
| 5. Developer Intelligence Dashboard | Partial | Dashboard reads live repository and analytics endpoints and opens an SSE stream. UI has repository cards, live-state labeling, Recharts analytics, and grouped anchor navigation for overview, analysis, comparison and activity; browser-side interaction verification remains. |
| 6. AI Pull Request Review | Partial | Authenticated PR diff endpoint calls Groq server-side; dashboard form and request test exist. A direct Groq generation request succeeded. Full review endpoint needs an authenticated GitHub repository/PR to verify. |
| 7. Repository-Aware RAG Chat | Partial | Implemented GitHub-authorized source fetching/chunking (40-file/250 KB cap), durable `RAG_INDEX` worker, Gemini `gemini-embedding-2`, owner-scoped pgvector writes/retrieval, prompt-injection boundaries, and source-linked chat UI. The user authorized GitHub and the dashboard listed 16 repositories; provider smoke calls passed. Actual repository indexing/storage, retrieval quality, repository chat generation, and cross-account access checks remain pending. No fake source, embedding, or response was used. |
| 8. Interactive Dependency Graph | Partial | Added an authenticated graph API that verifies current GitHub access, reads only the user's indexed source files, and extracts local TS/JS, Java, and Python imports; added a lazy-loaded interactive React Flow explorer with file details and direct dependency/dependent counts. Needs live indexed-repository verification. |
| 9. Change Impact Analysis | Partial | Added authenticated GitHub PR file retrieval joined with the user's indexed dependency graph to trace downstream modules. UI shows changed paths, additions/deletions, dependent paths and truncation state. Needs live indexed-repository and PR verification. |
| 10. Advanced Developer Intelligence | Partial | Added authenticated Groq-backed commit summaries, release notes from GitHub compare, evidence-grounded repository health reports, and PR risk assessments, with on-demand dashboard controls; comparison uses actual GitHub analytics. A dedicated onboarding flow and live endpoint/provider verification remain. |
| 11. Real-Time GitHub Intelligence | Partial | HMAC-validated webhook ingestion and repository-scoped SSE query are implemented. GitHub webhook delivery and user notification flows have not been exercised end to end. |
| 12. Distributed Background Processing | Partial | PostgreSQL queue supports atomic claims, idempotency, retries, stale-lease recovery, webhook persistence, and RAG indexing. Worker profile started against Neon and successfully polled the live queue. Separate deployed API/worker services and full job recovery testing remain. |
| 13. Security, testing, performance | Partial | CSRF, session cookie settings, CORS allowlist, password hashing, webhook HMAC, prompt boundaries, owner-scoped RAG queries, database-backed per-user AI/index rate limits, frontend lint/typecheck/build, 6 frontend tests, and backend tests (latest pass) are verified locally. OAuth-only accounts can no longer authenticate with the former placeholder password; unauthenticated API calls return 401. Full threat review, broader integration tests, and performance checks remain. |
| 14. Production deployment and docs | Partial | Vercel frontend deployed and its URL returned HTTP 200. `VITE_API_URL` is not configured because there is no public Java API, so authenticated features are not live. No GITNOVA Render API/worker services deployed: Render lacks native JVM runtime and free workers, while Docker remains prohibited. |

## Checks run

- Frontend `npm run build`: passed after repository-create UI (TypeScript and Vite production build).
- Frontend `npm test`: passed (3 files, 6 tests).
- Frontend `npm run lint`: passed.
- Backend `mvnw test`: passed after repository-create API and security changes; Spring context, unauthorized API behavior, GitHub response contract, RAG security/configuration, and passwordless OAuth account tests.
- Direct Groq chat-completion smoke request: passed using the configured model; this does not verify an authenticated GitHub PR review.
- Neon connection: passed; live Spring Boot startup applied Flyway migration v4 and health returned `UP`.
- Worker queue: passed startup against Neon and executed the PostgreSQL lease recovery/atomic claim query.
- Gemini Embedding 2: passed a real API smoke call and returned a 768-dimensional vector; no vector was stored as repository content.
- Groq chat completion: passed a real request using the configured `openai/gpt-oss-20b` model and returned a five-character completion.
- GitHub OAuth setup: local credentials are configured in ignored `.env`; authorization initiation returned HTTP 302 and the user dashboard showed 16 accessible repositories.
- Phase 7 repository end-to-end: pending an index job completing in the user's authorized browser, then real embedding/storage, retrieval, and chat verification.
- The user's browser reports HTTP 502-style `Bad Gateway` failures in Developer Intelligence and Compare. Those requests depend on live GitHub and Groq upstream APIs; without the authenticated browser session or its server request logs, the failing upstream response has not yet been isolated. The features must remain marked partially verified until those requests succeed.
- The old GITNOVA Java process on port 8080 was verified and restarted so the latest security and repository-create code is active. `/actuator/health` returned HTTP 200 and Flyway applied Neon schema version 4, including the API rate-limit buckets.
- An unauthenticated `/api/v1/github/analytics` request returned `401` directly and through Vite; the older process returned `302` to GitHub.
- Restarting the API invalidated browser sessions. Reconnect GitHub before testing authenticated dashboard requests.
- An unauthenticated API request currently returns HTTP 401; the live API health endpoint returns HTTP 200. These checks do not validate authenticated GitHub/Groq requests.
- Vercel production frontend: `https://frontend-one-chi-15.vercel.app` returned HTTP 200 after deployment. It is a frontend-only deployment; sign-in and API-backed workspace features require a public Java backend and `VITE_API_URL` configuration.
- The browser-reported `Bad Gateway` in Developer Intelligence and Compare has not been retested with a fresh authenticated session. Do not mark those live integrations verified yet.
- The README now documents architecture diagrams, API and environment references, workflows, troubleshooting, and the source tree. GitLite-style snapshots, branches, local file management, and browser folder sync remain unimplemented.
