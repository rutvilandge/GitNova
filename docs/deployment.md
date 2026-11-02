# Deployment checklist

## Vercel frontend

1. The frontend is deployed at [https://frontend-one-chi-15.vercel.app](https://frontend-one-chi-15.vercel.app) from the `frontend` directory.
2. Vercel build succeeded with `npm ci` and `npm run build`; output directory is `dist`. A public HTTP request returned 200.
3. `VITE_API_URL` is not set because no public Java API is deployed. Login, signup, analytics, AI, RAG, SSE, and other API-backed flows are therefore not available on this hosted frontend yet.
4. Once a Java API is hosted, set `VITE_API_URL` to its origin, add the frontend origin to backend CORS, set `FRONTEND_URL`, and redeploy.

## GitHub OAuth

Create a GitHub OAuth App. Set its callback URL to `{BACKEND_URL}/login/oauth2/code/github`. Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to the backend environment. On GitHub, authorize only the access level needed for the repositories the user wants to connect.

## Neon PostgreSQL

Set `DATABASE_URL` to the Neon JDBC connection string, including `sslmode=require`. The backend runs Flyway on startup and enables pgvector in the initial migration. Confirm the selected Neon compute/database can install the `vector` extension before first deployment.

## Render limitation and current state

The connected Render service creation tools do not expose a native Java runtime. The requested Java 21 backend cannot be deployed there under the project's strict no-Docker rule with the available runtime options. No backend or worker service has been provisioned. The connected account exposed `My Workspace`; existing listed services belong to another project. Render's free tier also does not include a continuously running worker service.

To complete hosting without changing the stack, use a Java-capable host that supports build-from-source without Docker and a free, continuously running worker. Alternatively, explicitly allow Docker and a suitable paid/free-compatible Render plan. Do not describe the current Vercel frontend as a complete deployment.

## Free Java hosting comparison (researched 2026-11-02)

### Best fit: OCI Always Free VM, with operational caveats

The full no-Docker guide with ARM64 checks, systemd API/worker units, Nginx, HTTPS, OAuth, CORS, and Neon wiring is in [oci-deployment.md](oci-deployment.md). OCI must not be treated as guaranteed-free uptime: A1 idle reclamation is described in detail there.

OCI's Always Free Ampere A1 allowance provides up to 2 OCPUs and 12 GB RAM total, plus 200 GB of block storage across eligible resources and 10 TB monthly outbound transfer. A Linux VM can run the existing Java 21 API and worker as two separate `systemd` services. Eclipse Temurin publishes Java 21 for Linux ARM64, so this path needs no Dockerfile and no application-stack change. See [OCI Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) and [Temurin supported platforms](https://adoptium.net/supported-platforms).

Configure `DATABASE_URL`, GitHub/Groq/Gemini credentials, and public URLs in root-owned environment files referenced by each systemd unit, never in the repository. API and worker can share a restricted Neon role/connection URL if their current database permissions require it. Put only the API behind a TLS reverse proxy and permit inbound 443 (and tightly restricted SSH); the worker only needs outbound access to Neon, GitHub, and AI providers. Both services can reach Neon over outbound PostgreSQL TCP with TLS; this project's connection to Neon and Flyway migration v4 already passed locally. Neon documents TLS for JDBC clients and recommends `sslmode=verify-full`; the existing URL uses `sslmode=require` and `channelBinding=require`, which has connected successfully in the local backend. See [Neon secure connections](https://neon.com/docs/connect/connect-securely) and [Neon connection pooling](https://neon.com/docs/connect/connection-pooling).

Limitations: OCI capacity can be unavailable in the account's home region; A1 instances may be reclaimed after seven days when CPU, network, and (for A1) memory utilization remain below OCI's published thresholds. API and worker share one VM and one failure domain, so this is a hobby/demo deployment rather than highly available production. Oracle signup requires payment-card verification and may place a temporary authorization hold; Oracle says a charge occurs only if the account is upgraded. Do not upgrade or select paid shapes. See [OCI Free Tier FAQ](https://www.oracle.com/cloud/free/faq/).

### Google Compute Engine e2-micro: technically possible, too constrained

Google's no-expiration Free Tier includes one non-preemptible e2-micro in selected US regions, 30 GB-months standard disk, and 1 GB/month outbound transfer from North America. A Linux VM can run Java 21 and separate systemd units with environment files, but 1 GB RAM and the tiny outbound allowance leave little headroom for two Spring Boot processes, builds, GitHub/Groq traffic, and database traffic. It is a secondary experiment option, not the recommended GITNOVA host. See [Google Cloud Free Tier features](https://docs.cloud.google.com/free/docs/free-cloud-features).

### Why the requested Render free deployment does not fit

Render's native language list omits Java/JVM; its docs direct JVM apps to Docker. Free service plans cover web services and datastores, not background workers or cron jobs. A free web service sleeps after 15 minutes without inbound traffic and has only 750 workspace free instance-hours/month. Thus Java + no Docker + separate always-running worker + free Render cannot all be satisfied. Render's dashboard does support service environment variables, but this does not solve the missing Java runtime and worker plan. See [Render native runtimes](https://render.com/docs/native-runtimes), [free services](https://render.com/docs/free), and [background workers](https://render.com/docs/background-workers).

### Neon considerations

Neon accepts standard PostgreSQL client connections with TLS; the deployed VM does not need to be on the same cloud or VPC. Use the Neon pooled endpoint (`-pooler`) for the app, keep Hikari's pool modest, and avoid a keep-alive query that prevents the Free compute from suspending. The current Neon Free plan lists 1 GB of Postgres storage and 100 CU-hours per project; Free compute scales to zero after inactivity, so the first query after idle can incur a wake-up delay. Recheck quotas before launch. See [Neon's current Free plan](https://neon.com/blog/neon-free-plan-1-gb-per-project) and [scale-to-zero overview](https://neon.com/blog/why-you-want-a-database-that-scales-to-zero).

## Secrets

Set these backend environment variables in the hosting dashboard: `DATABASE_URL`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`, `FRONTEND_URL`, and `BACKEND_URL`. For a cross-site Vercel/Render cookie, also set `SESSION_COOKIE_SAME_SITE=none` and `SESSION_COOKIE_SECURE=true`. Never commit secret values. Rotate any credential posted into chat before deployment.
