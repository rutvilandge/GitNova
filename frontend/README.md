# GITNOVA frontend

This directory is the standalone React 19 + TypeScript + Vite application. Keep browser code, browser-visible configuration, and frontend tests here. Secret credentials belong only in backend/hosting environment settings.

## Folders

- `src/components/brand`: shared brand mark.
- `src/components/landing`: landing-page graph, showcase previews, and content data.
- `src/pages/landing`: marketing page and its Vitest test.
- `src/pages/auth`: login and signup screens backed by the Java API.
- `src/pages/dashboard`: repository, GitHub metrics, and live activity interface.
- `src/styles`: global Tailwind setup and GITNOVA-specific styles.
- `src/assets`: static assets.

## Commands

- `npm ci` installs the lockfile exactly.
- `npm run dev` starts Vite.
- `npm run build` runs TypeScript checks and creates `dist/`.
- `npm test` runs Vitest.
- `npm run lint` runs Oxlint.

Set `VITE_API_URL` to the backend origin. Vite embeds `VITE_*` variables into browser assets, so never put secrets in them. `vercel.json` sets the SPA rewrite and production build output.
