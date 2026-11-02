# GITNOVA source map

This document is the short reference for the current repository layout.

The longer setup, API, architecture, feature, and verification guide is [README.md](../README.md).

## Top level

| Path | Purpose |
| --- | --- |
| `.env.example` | Placeholder-only local environment template |
| `.env` | Ignored local credentials and service settings |
| `.gitignore` | Excludes credentials, dependencies, builds, and local IDE files |
| `README.md` | Project guide, architecture, APIs, setup, security, and current status |
| `frontend/` | React 19 and Vite frontend |
| `backend/` | Java 21 and Spring Boot 4 API and worker profile |
| `docs/roadmap-status.md` | Phase verification ledger |
| `docs/deployment.md` | Hosting constraints and deployment checklist |
| `docs/structure.md` | This concise source map |

## Frontend files

| Path | Purpose |
| --- | --- |
| `frontend/package.json` | Frontend scripts and dependency manifest |
| `frontend/package-lock.json` | Locked npm dependency graph |
| `frontend/index.html` | Vite HTML entry point |
| `frontend/vite.config.ts` | React, Tailwind v4, and local backend proxy |
| `frontend/vitest.config.ts` | Vitest environment and setup |
| `frontend/tsconfig*.json` | TypeScript app and build configuration |
| `frontend/vercel.json` | SPA route fallback for Vercel static hosting |
| `frontend/src/main.tsx` | React application bootstrap |
| `frontend/src/App.tsx` | Browser route declarations |
| `frontend/src/lib/api.ts` | API URL, CSRF token, and error parsing helpers |
| `frontend/src/styles/global.css` | Tailwind import and global baseline |
| `frontend/src/styles/app.css` | GITNOVA theme, layout, responsive, and component styles |
| `frontend/src/components/brand/Brand.tsx` | Reusable GITNOVA wordmark |
| `frontend/src/components/illustrations/WorkspaceIllustration.tsx` | Original authentication workspace illustration |
| `frontend/src/components/landing/IntelligenceStories.tsx` | Interactive landing feature storytelling |
| `frontend/src/components/landing/LandingConnectScene.tsx` | Repository connection scene |
| `frontend/src/components/landing/ProductPreview.tsx` | Illustrative, non-live product preview surfaces |
| `frontend/src/components/landing/RepositoryGraph.tsx` | Illustrative landing dependency visualization |
| `frontend/src/components/landing/landingData.ts` | Landing page story and product copy data |
| `frontend/src/pages/landing/Landing.tsx` | Public landing page sections |
| `frontend/src/pages/landing/Landing.test.tsx` | Landing page component tests |
| `frontend/src/pages/auth/Login.tsx` | Email/password and GitHub login UI |
| `frontend/src/pages/auth/Signup.tsx` | Signup UI and account creation request |
| `frontend/src/pages/auth/Auth.test.tsx` | Auth form and validation tests |
| `frontend/src/pages/dashboard/Dashboard.tsx` | Repository cards, creation form, analytics, navigation, and SSE feed |
| `frontend/src/pages/dashboard/ReviewWorkspace.tsx` | Pull request review controls and findings |
| `frontend/src/pages/dashboard/ReviewWorkspace.test.tsx` | Review request and secret boundary tests |
| `frontend/src/pages/dashboard/RepositoryAssistant.tsx` | Index job state and repository chat interface |
| `frontend/src/pages/dashboard/DependencyExplorer.tsx` | Lazy React Flow dependency graph |
| `frontend/src/pages/dashboard/ChangeImpact.tsx` | Pull request change-impact results |
| `frontend/src/pages/dashboard/AdvancedIntelligence.tsx` | Commit, release, health, and risk tools |
| `frontend/src/pages/dashboard/RepositoryComparison.tsx` | Live comparison of GitHub analytics |
| `frontend/src/test-setup.ts` | Vitest DOM cleanup and browser API shims |

## Backend files

| Path | Purpose |
| --- | --- |
| `backend/pom.xml` | Maven dependencies and Spring Boot plugin |
| `backend/mvnw`, `backend/mvnw.cmd` | Maven Wrapper entry points |
| `backend/src/main/java/com/gitnova/GitnovaApplication.java` | Application entry point |
| `.../api/HealthController.java` | `/api/v1/health` route |
| `.../api/ApiExceptionHandler.java` | Validation and login error mapping |
| `.../auth/AuthController.java` | CSRF bootstrap, signup, login, logout |
| `.../config/SecurityConfig.java` | Sessions, OAuth, CSRF, CORS, password auth, and API entry point |
| `.../github/GitHubOAuthUserService.java` | GitHub account identity linking |
| `.../github/GitHubRepositoryController.java` | List/create repositories using the signed-in GitHub OAuth client |
| `.../github/GitHubAnalyticsController.java` | Live repository activity metrics from GitHub |
| `.../github/GitHubPullRequestReviewController.java` | Pull request diff retrieval and Groq review |
| `.../intelligence/AdvancedIntelligenceController.java` | Commit summaries, release notes, health, and PR risk |
| `.../intelligence/ActivityStreamController.java` | Repository-scoped server-sent events |
| `.../intelligence/DependencyGraphController.java` | Indexed source import graph |
| `.../intelligence/ChangeImpactController.java` | PR files joined to indexed dependencies |
| `.../jobs/PostgresJobWorker.java` | `worker` profile queue consumer and recovery loop |
| `.../rag/GeminiEmbeddingService.java` | Gemini embedding provider client |
| `.../rag/RepositoryIndexController.java` | GitHub source fetching and indexing job creation |
| `.../rag/RepositoryChatController.java` | Owner-scoped vector retrieval and Groq response |
| `.../user/GitnovaUser.java` | JDBC account record |
| `.../user/GitnovaUserRepository.java` | JDBC account repository |
| `.../webhook/GitHubWebhookController.java` | HMAC validation and idempotent webhook enqueue |
| `backend/src/main/resources/application.properties` | Environment bindings and runtime defaults |
| `backend/src/main/resources/db/migration/` | Flyway-managed PostgreSQL schema migrations |
| `backend/src/test/java/` | Backend application, contract, auth, RAG, and webhook tests |
| `backend/src/test/resources/application-test.properties` | Isolated H2 test configuration |

The `...` prefix expands to `backend/src/main/java/com/gitnova/`.

## Database migrations

| File | Purpose |
| --- | --- |
| `V1__initial_schema.sql` | Users, connected repositories, jobs, events, and repository documents |
| `V2__durable_intelligence_jobs.sql` | Queue and idempotency durability fields |
| `V3__repository_document_chunks.sql` | Chunk-aware repository document uniqueness |
| `V4__api_rate_limit_buckets.sql` | Per-account API rate-limit counters |

## Test files

| File | Purpose |
| --- | --- |
| `frontend/src/pages/landing/Landing.test.tsx` | Landing rendering and feature-story interaction |
| `frontend/src/pages/auth/Auth.test.tsx` | Auth form errors and password confirmation |
| `frontend/src/pages/dashboard/ReviewWorkspace.test.tsx` | Review request payload and frontend key boundary |
| `backend/src/test/java/com/gitnova/GitnovaApplicationTests.java` | Spring context and unauthenticated API response |
| `backend/src/test/java/com/gitnova/config/PasswordAuthenticationSecurityTest.java` | Blocks password login for OAuth-only identities |
| `backend/src/test/java/com/gitnova/github/GitHubRepositoryContractTest.java` | Repository response JSON contract |
| `backend/src/test/java/com/gitnova/rag/RepositoryIndexSecurityTest.java` | Index authorization contract |
| `backend/src/test/java/com/gitnova/webhook/GitHubWebhookSecurityTest.java` | Webhook signature validation |

## Generated and local-only files

`frontend/node_modules/` contains installed npm packages.

`frontend/dist/` contains the production bundle.

`backend/target/` contains compiled classes and packaged outputs.

`.env` contains local credentials and is ignored.

Preview screenshots are local artifacts and are not needed to run the application.

The actual implementation and verification status is tracked in [roadmap-status.md](roadmap-status.md).
