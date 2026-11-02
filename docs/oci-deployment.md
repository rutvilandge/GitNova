# GITNOVA on OCI Always Free Ampere A1

This guide describes a no-Docker deployment for the existing Java 21 / Spring Boot 4 application. It has not provisioned an OCI account or instance. Use only resources visibly marked **Always Free Eligible** in OCI Console.

## Feasibility and resource plan

The current Oracle Always Free allowance is **2 OCPUs and 12 GB RAM total** for A1 in the tenancy's home region, not the older 4 OCPU / 24 GB figures still present in some Oracle articles. Oracle may reclaim an Always Free instance if over a seven-day period its CPU p95 is below 20%, network utilization is below 20%, and (for A1) memory utilization is below 20%. A lightly used demo can meet those conditions; there is no supported setting that exempts an instance. See [Always Free resource limits and idle reclamation](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).

Recommended starting shape: one `VM.Standard.A1.Flex` VM with **2 OCPUs / 12 GB**, Ubuntu ARM64, and a 50 GB boot volume. API and worker share the VM and failure domain. Start with `-Xms256m -Xmx1536m` for the API and `-Xms256m -Xmx1024m` for the worker, then inspect `systemd`/JVM RSS under indexing load before tuning. Leave RAM for Ubuntu, Nginx, page cache, and transient Java compilation. Build the artifact on CI or a workstation instead of compiling on the production VM. GitHub REST, Groq, Gemini, and Neon are remote; the app has no native x86-only dependency in its Maven configuration. Java bytecode is architecture independent, and Ubuntu provides ARM64 Java 21. This is a strong compatibility assessment, not a completed AArch64 runtime test; verify a built jar on an ARM64 host before production traffic.

OCI capacity is not guaranteed in the home region. Account verification can require a payment card and may place a temporary authorization hold. Stay within Always Free labels and quotas, and do not upgrade to a paid account as part of this guide. Confirm the instance and storage display no charge before creation. The Nginx/HTTPS steps also require a DNS name you control; use an existing domain or a free DNS hostname provider if buying a domain is out of scope.

## Existing application configuration

- The API listens on `${PORT:8080}`. Put it on `127.0.0.1:8080` behind Nginx; do not expose 8080 publicly.
- The worker is the same jar launched with Spring profile `worker` (`@Profile("worker")`). Run a second JVM with `--spring.profiles.active=worker` and no public listener requirement. It needs the same database and Gemini embedding credentials as the API.
- Flyway migrations run at application startup. Let the API start first and become healthy before starting the worker. The second startup also checks Flyway; keep both processes on the same jar version.
- Spring CORS allows exactly the configured `FRONTEND_URL`, credentials, and the app's declared methods/headers. Set it to the exact HTTPS frontend origin, without a trailing slash. Vite's local proxy is development-only; production needs `VITE_API_URL` set at frontend build time to the API origin.
- GitHub OAuth callback is `${BACKEND_URL}/login/oauth2/code/github`; register the exact HTTPS URL. The configured scopes are `read:user,user:email,repo`.
- Cross-site session cookies require `SESSION_COOKIE_SAME_SITE=none` and `SESSION_COOKIE_SECURE=true` when frontend and API have different registrable domains (for example Vercel + an OCI API domain). HTTPS is mandatory for this setting. If both are on the same site, `lax` can be used. OAuth state/session must survive the round trip through the same API hostname.
- Configure the GitHub webhook URL as `https://API_HOST/api/v1/webhooks/github` and use the same secret in GitHub and `GITHUB_WEBHOOK_SECRET`.
- Neon connectivity is outbound from OCI to the Neon endpoint on TCP 5432 with TLS; no inbound database port is needed. Use the Neon pooled JDBC endpoint and retain `sslmode=require` (the current configuration may also include Neon `channelBinding=require`). The VM does not need to share a VPC with Neon. Verify `SELECT 1`, pgvector extension access, and Flyway from the deployed VM before switching traffic. See [Neon secure connections](https://neon.com/docs/connect/connect-securely) and [Neon connection pooling](https://neon.com/docs/connect/connection-pooling).

## Deployment steps

### 1. Provision an eligible VM

1. In OCI Console, open **Compute → Instances → Create instance** in the account's home region.
2. Select Ubuntu 24.04 LTS **ARM / aarch64** marked **Always Free Eligible**, shape `VM.Standard.A1.Flex`, and allocate 2 OCPUs / 12 GB RAM total. Use a 50 GB boot volume.
3. Create or select a public subnet with an ephemeral or reserved public IPv4. Reserve a public IP if the account's currently displayed free allowance permits it and a stable address is needed.
4. In the VCN security list or NSG allow inbound TCP 22 only from your current public IP, TCP 80 from the Internet for ACME HTTP validation/redirect, and TCP 443 from the Internet. Do not open 8080, 5432, or worker ports. Permit outbound HTTPS and outbound TCP 5432.
5. Save the instance public IP, SSH key, home region, and Ubuntu image version. Confirm the shape and boot volume show no paid charge before creating.

### 2. Install Java 21 and Nginx

SSH to the instance, then run:

```bash
sudo apt update
sudo apt install -y openjdk-21-jre-headless nginx curl ca-certificates
java -version
uname -m  # should print aarch64
```

If the chosen Ubuntu image does not offer `openjdk-21-jre-headless`, use the official Eclipse Temurin ARM64 Debian repository and install `temurin-21-jre`; do not install an x86_64 package. Check `java -version` and `dpkg --print-architecture` (`arm64`).

### 3. Build and transfer the existing jar

From the repository on a build machine with JDK 21 and Maven Wrapper:

```powershell
cd backend
.\mvnw.cmd -DskipTests package
```

Or from a Linux/macOS checkout:

```bash
cd backend
./mvnw -DskipTests package
```

Run the full tests before release; `-DskipTests` above only describes artifact packaging. Copy `target/gitnova-0.0.1-SNAPSHOT.jar` to the VM over SSH/SCP. The Maven dependencies are Java libraries; there are no configured JNI/native binaries requiring x86. On the VM:

```bash
sudo useradd --system --home /opt/gitnova --shell /usr/sbin/nologin gitnova
sudo install -d -o gitnova -g gitnova /opt/gitnova/releases /opt/gitnova/runtime
sudo install -d -o root -g gitnova -m 0750 /etc/gitnova
sudo install -o gitnova -g gitnova -m 0640 gitnova-0.0.1-SNAPSHOT.jar /opt/gitnova/releases/gitnova.jar
sudo ln -sfn /opt/gitnova/releases/gitnova.jar /opt/gitnova/app.jar
```

Replace the source path in `install` with the actual uploaded file. Retain a previous release jar for rollback.

### 4. Add runtime secrets

Create `/etc/gitnova/gitnova.env` with `sudoedit`, permissions `root:gitnova` and mode `0640`. Do not place it in the repository, publish it in shell history, or paste real values into a ticket/chat. Use the actual Neon JDBC URL and provider credentials from your secret manager/local ignored env. Values below are placeholders:

```dotenv
DATABASE_URL=jdbc:postgresql://POOLER_HOST/DB?user=DB_USER&password=DB_PASSWORD&sslmode=require&channelBinding=require
GROQ_API_KEY=REPLACE_WITH_GROQ_KEY
GROQ_MODEL=openai/gpt-oss-20b
GEMINI_API_KEY=REPLACE_WITH_GEMINI_KEY
GITHUB_CLIENT_ID=REPLACE_WITH_OAUTH_CLIENT_ID
GITHUB_CLIENT_SECRET=REPLACE_WITH_OAUTH_CLIENT_SECRET
GITHUB_WEBHOOK_SECRET=REPLACE_WITH_RANDOM_WEBHOOK_SECRET
FRONTEND_URL=https://YOUR_VERCEL_HOST
BACKEND_URL=https://api.YOUR_DOMAIN
SESSION_COOKIE_SAME_SITE=none
SESSION_COOKIE_SECURE=true
DB_POOL_SIZE=5
```

Then:

```bash
sudo chown root:gitnova /etc/gitnova/gitnova.env
sudo chmod 0640 /etc/gitnova/gitnova.env
```

The project imports `../.env` relative to the current working directory, but production units below use systemd `EnvironmentFile` and a clean `/opt/gitnova/runtime` working directory. Do not copy the repository's root `.env` to `/opt/gitnova/.env`.

### 5. Create separate API and worker services

Create `/etc/systemd/system/gitnova-api.service`:

```ini
[Unit]
Description=GITNOVA API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=gitnova
Group=gitnova
WorkingDirectory=/opt/gitnova/runtime
EnvironmentFile=/etc/gitnova/gitnova.env
Environment=PORT=8080
ExecStart=/usr/bin/java -Xms256m -Xmx1536m -XX:+ExitOnOutOfMemoryError -jar /opt/gitnova/app.jar
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/gitnova

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/gitnova-worker.service`:

```ini
[Unit]
Description=GITNOVA PostgreSQL job worker
After=network-online.target gitnova-api.service
Wants=network-online.target

[Service]
Type=simple
User=gitnova
Group=gitnova
WorkingDirectory=/opt/gitnova/runtime
EnvironmentFile=/etc/gitnova/gitnova.env
Environment=SPRING_MAIN_WEB_APPLICATION_TYPE=none
ExecStart=/usr/bin/java -Xms256m -Xmx1024m -XX:+ExitOnOutOfMemoryError -jar /opt/gitnova/app.jar --spring.profiles.active=worker
Restart=on-failure
RestartSec=5
TimeoutStopSec=45
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/gitnova

[Install]
WantedBy=multi-user.target
```

The worker profile enables the scheduled queue consumer; `SPRING_MAIN_WEB_APPLICATION_TYPE=none` prevents it from opening an unused HTTP listener. Start the API first because it runs Flyway migrations, check health, then start the worker:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now gitnova-api
sudo journalctl -u gitnova-api -n 100 --no-pager
curl -fsS http://127.0.0.1:8080/actuator/health
sudo systemctl enable --now gitnova-worker
sudo systemctl status gitnova-api gitnova-worker
```

### 6. Configure Nginx and HTTPS

Point `api.YOUR_DOMAIN` A/AAAA records at the VM. Create `/etc/nginx/sites-available/gitnova-api`:

```nginx
server {
    listen 80;
    server_name api.YOUR_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_buffering off;
    }
}
```

Enable the vhost and issue a free Let's Encrypt certificate (Certbot/Let's Encrypt has its own fair-use terms):

```bash
sudo ln -s /etc/nginx/sites-available/gitnova-api /etc/nginx/sites-enabled/gitnova-api
sudo nginx -t && sudo systemctl reload nginx
sudo snap install --classic certbot
sudo certbot --nginx -d api.YOUR_DOMAIN
```

Keep `proxy_buffering off` and long read timeout for the app's SSE stream. After Certbot, inspect Nginx's generated TLS configuration and test automatic renewal with `sudo certbot renew --dry-run`.

### 7. Connect frontend, OAuth, webhooks, and providers

1. In `frontend`, run `npm ci` and build with `VITE_API_URL=https://api.YOUR_DOMAIN` (for PowerShell, `$env:VITE_API_URL='https://api.YOUR_DOMAIN'; npm run build`). Deploy the resulting `dist` to the existing Vercel project. Vite bakes this value into the build; setting it only at runtime has no effect.
2. Set `FRONTEND_URL` to the exact deployed frontend origin and `BACKEND_URL=https://api.YOUR_DOMAIN` in `/etc/gitnova/gitnova.env`; restart both systemd services.
3. In the GitHub OAuth App set callback to `https://api.YOUR_DOMAIN/login/oauth2/code/github`. Reauthorize through the deployed frontend and verify private-repository access using the intended GitHub account.
4. In each GitHub webhook configuration, set `https://api.YOUR_DOMAIN/api/v1/webhooks/github` and the matching secret. Subscribe only to required event types.
5. Check Groq and Gemini credentials from the VM using the app's real endpoints after sign-in. Never put them in Vite variables; only the API/worker receive them.
6. Confirm CORS preflight from the exact Vercel origin, session cookies (`Secure`, `HttpOnly`, correct `SameSite`), CSRF behavior, and OAuth callback in browser devtools.

### 8. Verification and operations

```bash
curl -i https://api.YOUR_DOMAIN/actuator/health
sudo journalctl -u gitnova-api -f
sudo journalctl -u gitnova-worker -f
sudo systemctl restart gitnova-api gitnova-worker
```

Before production use: authenticate via GitHub; exercise repository list, one repository analytics endpoint, one Groq AI action, one Gemini-backed indexing job and retrieval, and one signed webhook delivery; confirm resulting rows/jobs in Neon. Health 200 alone does not establish integration health. Set alerts for VM CPU/network/memory, disk use, service restarts, failed queue jobs, Neon availability and API errors. Keep off-instance backups of configuration and database data. A1 reclamation is a service-continuity risk: monitor the seven-day thresholds, keep real workload/traffic, and maintain recovery steps for recreating the VM from the jar and backups. Artificial keepalive traffic is not a reliable or appropriate guarantee against reclamation.

## Risks and limitations

- **Idle-instance reclamation:** Oracle's published seven-day rule can reclaim a low-usage VM. GITNOVA's small personal traffic may fall below the stated CPU/network/memory thresholds. A successful deployment therefore cannot promise permanent uptime on Always Free.
- **No HA:** API and worker on one VM stop together if reclaimed, rebooted, or out of capacity. A free shape is not an uptime SLA.
- **Regional capacity/account:** A1 may show out-of-host-capacity; the home region determines Always Free availability. Signup may require card validation.
- **ARM verification:** Java/Spring dependencies are expected to run on AArch64, but the current Windows/x86 development machine cannot prove production behavior. Test the exact artifact on ARM64, especially TLS, DNS, memory, and pgvector JDBC paths.
- **Cold Neon:** Neon may scale compute to zero. The next DB operation can be slower; add connection/timeouts that tolerate wake-up. Hikari pool is set to five to limit connection use.
- **Session persistence:** A single API instance keeps sessions local. Do not scale to multiple API instances without shared session storage/stickiness. Browser cookies across Vercel and OCI need secure cross-site settings.
- **Deploy secrets:** OAuth/GitHub/Groq/Gemini/Neon values must remain in `/etc/gitnova/gitnova.env` and not in Git, frontend build variables, Nginx config, or command history.
- **Frontend remains separate:** OCI steps host API/worker only. The current Vercel frontend URL is `https://frontend-one-chi-15.vercel.app`, but the current deployment guide says it has no `VITE_API_URL` and is not an integrated app until rebuilt and reconfigured.

## Current status

This is an implementation guide and compatibility review only. No OCI account, VM, DNS record, certificate, or deployment has been created. The public API URL and final integrated website URL do not exist yet. Exact account limits and prices should be rechecked in OCI Console before any future provisioning.
