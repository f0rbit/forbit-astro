# Deploy

## Production

Pushing to `main` auto-deploys via Cloudflare Workers Builds. No manual steps after the one-time setup below.

PRs against `main` auto-publish a preview URL (Workers Builds posts the URL as a deployment status on the PR).

## One-time setup (user action)

### 1. Connect GitHub to Cloudflare

- Cloudflare dashboard -> Workers & Pages -> Create -> Connect Git
- Authorise `f0rbit/forbit-astro`

### 2. Worker config

- Name: `forbit-astro` (must match `wrangler.jsonc#name`)
- Production branch: `main`
- Build command: `bun install --frozen-lockfile && bun run check && bun run build`
- Deploy command (production): `bunx wrangler deploy`
- Deploy command (non-production): `bunx wrangler versions upload`
- Post-deploy command: `BASE_URL=$CF_PAGES_URL bun run smoke`

> The exact env var name for the deployed URL inside Workers Builds may differ
> (`CF_PAGES_URL`, `WORKERS_CI_BUILD_URL`, etc). Verify in the dashboard at
> first deploy time and update the post-deploy command + this doc with the
> real var name.

### 3. Secrets (Settings -> Variables and Secrets)

- `DEVPAD_API_KEY` (secret)
- `DEVTO_KEY` (secret)
- `POSTS_URL` (secret or var, your call)
- `DEVPAD_URL` is already declared in `wrangler.jsonc` as a `vars` entry; no
  dashboard action needed.

### 4. First deploy + custom domain

- Trigger the first build from the dashboard, eyeball the assigned
  `*.workers.dev` URL.
- Settings -> Domains & Routes -> Add Custom Domain -> `forbit.dev`.
- DNS cutover steps live in `docs/rollback.md` (pre-cutover checklist + cutover
  step).

### 5. Deploy Hook for content publish

- Settings -> Builds -> Deploy Hooks -> Add Hook
- Name: `devpad-publish`, Branch: `main`
- Copy the URL, register it on DevPad's blog publish webhook (DevPad UI).
- Background and cache-flush story: `docs/content-publishing.md`.

## CI gates

- Every build runs `bun run check` (typecheck + 56 tests) before deploy.
- Every deploy runs `bun run smoke` against the deployed URL post-deploy.
- A failing check or smoke leaves the previous version live (Workers atomic
  versioning).

## Local development

- `bun run dev` -- Astro dev server (Node, fast HMR).
- `bun run dev:cf` -- `wrangler dev` against the built Worker (workerd parity
  check before push).

## Local secrets

Copy `.dev.vars.example` to `.dev.vars` and fill in real values. Wrangler
reads `.dev.vars` automatically. Never commit it.

## Smoke script notes

`bun run smoke` (`scripts/smoke.ts`) takes `BASE_URL` from env or argv and hits
6 routes (`/`, `/projects`, `/blog`, `/timeline`, `/og/default.png`,
`/sitemap-index.xml`), asserting status + content-type. Exits non-zero on any
failure.

`/sitemap-index.xml` is emitted at build time by `@astrojs/sitemap`. Against
`wrangler dev` of a built Worker it works. Against `astro dev` it does not.
The smoke script auto-skips the sitemap check when `BASE_URL` is `localhost` /
`127.0.0.1` so dev runs stay green.
