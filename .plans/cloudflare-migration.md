# Cloudflare Workers Migration: forbit-astro

## Executive Summary

Migrate `forbit-astro` (personal portfolio at `forbit.dev`) from VPS-deployed
Node SSR (`@astrojs/node` standalone) to Cloudflare Workers via
`@astrojs/cloudflare`, with full CI/CD via Workers Builds and a per-PR preview
URL workflow. Replace the process-level cache with the Cloudflare Cache API
(stale-while-revalidate via `ctx.waitUntil`), replace `@resvg/resvg-js` (native
binary, blocker on Workers) with `workers-og` (satori + resvg-wasm), and
introduce a `bun test` suite that this project has never had.

Cutover is the **last** action. The VPS keeps serving traffic until Phase 4 DNS
flip and stays running for 7 days post-cutover as a rollback target.

**Scope**: ~600 LOC plus ~400 LOC of new tests. 4 phases, each independently
shippable.

---

## DECISION NEEDED — Astro 4 vs Astro 6 upgrade

The user asked for an explicit recommendation. **Recommendation: stay on
Astro 4 + `@astrojs/cloudflare` v12.2.x for this migration. Defer the Astro
6 upgrade to a separate plan.**

Rationale:

- Adapter v12.2.1 supports Astro `>=4.10.3`. Astro is currently `^4.0.4`, so
  Phase 1 minor-bumps Astro to `^4.10.3` (or the latest 4.x) — far smaller blast
  radius than Astro 4 → 6.
- Adapter v13 requires Astro 6 and only adds workerd dev parity (`astro dev`
  runs in workerd instead of Node). That's a nice-to-have, not a requirement.
  Production parity is identical between v12 and v13 — both deploy to the same
  Workers runtime.
- Astro 4 → 6 spans two majors. Breaking changes in content collections,
  middleware, and i18n APIs would force a parallel codebase audit on top of an
  already non-trivial infrastructure migration. That violates the "zero
  downtime, ship phases independently" hard requirement.
- The user values low maintenance. A clean Astro upgrade is its own project
  with its own test suite to write — best done **after** this migration when a
  test suite already exists to catch regressions.

What this trades away: `astro dev` will keep running in Node, so a small class
of workerd-only bugs (missing globals, wrong `process` shape) only surface at
`wrangler dev` or in deploy. Mitigation: add `wrangler dev` as a documented
verification step in Phase 1 and run smoke tests against a preview URL in CI
(Phase 4).

If the user disagrees, flip to adapter v13 + Astro 6 in Phase 1 — everything
else in this plan is unaffected.

---

## DECISION NEEDED — `wrangler dev` vs `astro dev` for local dev

Recommended: keep `bun run dev` as `astro dev` (Node) and add `bun run dev:cf`
as `wrangler dev ./dist` (after a build) for parity smoke checks before push.
Rationale: `astro dev` is faster to iterate on (Vite HMR), and CI catches
workerd-only issues via the preview-URL smoke test.

---

## Current State (verified)

- `astro: ^4.0.4`, `output: 'server'`, `adapter: node({ mode: 'standalone' })`
  in `astro.config.mjs:24`
- Integrations: `@astrojs/solid-js`, `@astrojs/sitemap`, `astro-icon` — all
  CF-Workers-compatible
- Process-level cache in `src/utils.ts:37-62`, three caches (`project`, `blog`,
  `timeline`), 10-min TTL via `cache_status` (`fresh`/`stale`/`empty` returns
  in `src/utils.ts:96-100`). `update_cache` mutates a module-level object.
- DevPad client constructed with env-from-`process.env`-or-`import.meta.env` in
  `src/client.ts:3-4`
- Other secrets read the same way in `src/utils.ts:6-7` (DEVTO_KEY, POSTS_URL)
- OG generation in `src/lib/og-image.ts:1-2` imports `satori` and
  `@resvg/resvg-js` (native binary — blocker)
- OG endpoints under `src/pages/og/`:
  - `default.png.ts`
  - `project/[project_id].png.ts`
  - `blog/[group]/[slug].png.ts`
- Cache function call sites (must continue to work after each phase):
  - `src/components/activity/Timeline.astro` — `fetchTimeline`
  - `src/components/projects/ProjectList.astro` — `getProjects`
  - `src/components/projects/RecentProjects.astro` — `getProjects`
  - `src/components/blog/RecentBlogs.astro` — `getBlogPosts`
  - `src/pages/projects.astro`, `src/pages/projects/[project_id].astro`
  - `src/pages/blog.astro`, `src/pages/blog/[group]/[slug].astro`
  - `astro.config.mjs:7-8` (sitemap pre-build) — top-level await of
    `getBlogPosts()` and `getProjects()`. **Important**: this runs at
    build-time (Node), not request-time. Cache API is a request-time concern
    only. The build-time call must remain a plain fetch — see Phase 2.
- No tests, no `vitest`/`bun test` scripts in `package.json`
- Existing CI: `.github/workflows/deploy.yml` is a single SSH-deploy job. To be
  deleted in Phase 4 once Workers Builds is live.

---

## Architecture Decisions Locked In

(Per the user's pre-research — do not re-litigate.)

1. Adapter: `@astrojs/cloudflare` v12.2.x. Astro stays on 4.x (bumped to
   `^4.10.3` minimum).
2. Env: `astro:env/server` typed schema. All secrets server-only, no `VITE_`
   prefix. New names: `DEVPAD_API_KEY`, `DEVTO_KEY`, `POSTS_URL`,
   `DEVPAD_URL`. `VITE_*` names deleted.
3. Cache: `caches.default` (Cloudflare Cache API) keyed on synthetic URLs
   (`https://cache.local/projects` etc). SWR via `ctx.waitUntil()` because CF
   doesn't honour `stale-while-revalidate` on `cache.put`. Implementation:
   store with `max-age = desired_ttl * 2`, treat entries past `desired_ttl` as
   stale, refresh in background. Preserves existing fresh/stale/empty
   semantics.
4. OG: replace `@resvg/resvg-js` with `workers-og`. Fonts already external
   (`fonts.gstatic.com`).
5. CI/CD: Cloudflare Workers Builds. Deploy command: `bun install && bunx
   wrangler deploy` for production (main), `bun install && bunx wrangler
   versions upload` for non-prod (PRs → preview URLs). Pre-deploy build:
   `bun run typecheck && bun test && bun run build`. Secrets via dashboard.
6. Invalidation: DevPad → CF Deploy Hook → Workers Build → fresh isolate
   flushes the cache.

---

## Testing Strategy (cross-cutting)

Per global AGENTS.md: `bun test`, in-memory fakes / Provider pattern over
mocks, integration-first.

### New test packages introduced

This project is currently a single Astro app, not a monorepo. We do **not**
need to convert it. Tests live alongside source:

```
src/
├── lib/
│   ├── og-image.ts
│   └── cache.ts                # NEW (Phase 2)
├── providers/                  # NEW (Phase 2)
│   ├── devpad.ts               # interface + production impl
│   ├── devpad-in-memory.ts     # test fake
│   ├── devto.ts                # interface + production impl
│   ├── devto-in-memory.ts      # test fake
│   ├── posts-feed.ts           # interface + production impl
│   └── posts-feed-in-memory.ts # test fake
└── utils.ts                    # rewired to take providers + cache

__tests__/
├── helpers.ts                  # makeFakeProviders(), makeFakeCache()
├── unit/
│   └── format-duration.test.ts # only pure functions
└── integration/
    ├── cache.test.ts           # Phase 2 — fresh/stale/empty + waitUntil
    ├── data-loading.test.ts    # Phase 2 — getProjects/getBlogPosts/etc.
    └── og-images.test.ts       # Phase 3 — endpoints return PNG
```

### Provider pattern for the three external APIs

```typescript
// src/providers/devpad.ts
import { Result } from '@devpad/api' // re-exports @f0rbit/corpus Result

export type ProviderError = { code: string; message: string }

export interface DevpadProvider {
  listProjects(): Promise<Result<Project[], ProviderError>>
  getProject(id: string): Promise<Result<Project, ProviderError>>
  listPosts(): Promise<Result<Post[], ProviderError>>
  getPost(slug: string): Promise<Result<Post, ProviderError>>
}

// src/providers/devpad.ts (production)
export class HttpDevpadProvider implements DevpadProvider { /* wraps @devpad/api */ }

// src/providers/devpad-in-memory.ts
export class InMemoryDevpadProvider implements DevpadProvider {
  projects: Project[] = []
  posts: Post[] = []
  /* deterministic returns */
}
```

Same shape for `DevtoProvider` (today's `fetchDevToAPI`) and `PostsFeedProvider`
(today's POSTS_URL fetch).

After bumping to `@devpad/api@^2.1.11`, all DevPad calls return corpus
`Result<T, E>` directly. Provider interfaces use the corpus `Result` type
(imported via `import { Result, ok, err } from '@devpad/api'` — devpad
re-exports corpus). Provider methods return `Promise<Result<T, ProviderError>>`
where `ProviderError = { code: string; message: string }`. Same shape for
`DevtoProvider` and `PostsFeedProvider` (we wrap their `fetch` calls in
corpus `Result` ourselves).

### Cache API fake

Cloudflare's `caches.default` is not available outside workerd. For tests we
build an in-memory fake that satisfies the surface area we use (`match`,
`put`, `delete`):

```typescript
// __tests__/helpers.ts
export function makeFakeCache(): Cache {
  const store = new Map<string, { response: Response; expiresAt: number }>()
  return {
    async match(req: Request | string) { /* returns Response or undefined */ },
    async put(req: Request | string, res: Response) { /* honours Cache-Control max-age */ },
    async delete(req: Request | string) { /* … */ },
  } as unknown as Cache
}
```

The cache module accepts a `Cache` instance and an `ExecutionContext`-shaped
`{ waitUntil(p): void }` so tests can inject both. In production, the Astro
endpoint passes `caches.default` and the runtime context.

### Smoke tests (Phase 4)

Bun script that hits a list of routes against a base URL and asserts 200 +
expected content-type. Runs as the **post-deploy** step inside Workers Builds.
Routes:

- `/` (200, text/html)
- `/projects` (200, text/html)
- `/blog` (200, text/html)
- `/og/default.png` (200, image/png)
- `/timeline` (200, text/html)
- `/sitemap-index.xml` (200, application/xml)

If smoke fails, the build fails — Workers Builds keeps the previous version
live (Workers does atomic version promotion).

---

## Phase 1 — Adapter swap, env migration, wrangler config

**Goal**: a Worker build of the site that runs on `wrangler dev` with the same
behaviour as today, deployed nowhere yet.

**Exit criteria**:

- `bun run build` produces a working Worker bundle (no runtime errors at
  `wrangler dev`)
- `wrangler dev` serves all current routes
- Astro bumped to `^4.10.3`+
- Env access goes through `astro:env/server` everywhere
- VPS still serving production unchanged

### Tasks (all sequential — single coder, default model)

| # | Task | LOC | Files |
|---|------|-----|-------|
| 1.1 | Bump `astro` to `^4.10.3`, bump `@devpad/api` to `^2.1.11` (corpus Result types), add `@astrojs/cloudflare@^12.2.1`, drop `@astrojs/node`, drop `@resvg/resvg-js` (re-added in Phase 3 as `workers-og`). `@f0rbit/corpus` becomes available transitively via devpad's re-export — no separate dep. | ~10 | `package.json` |
| 1.2 | Rewrite `astro.config.mjs`: switch `adapter` to `cloudflare`, keep `output: 'server'`, drop the top-level-await sitemap call (replace with a build-time fetch helper that does NOT touch cache state — see 1.3) | ~30 | `astro.config.mjs` |
| 1.3 | Add `src/lib/build-data.ts` that calls DevPad/DevTo directly via `fetch()` for build-time sitemap generation. No cache. | ~40 | new |
| 1.4 | Define `astro:env/server` schema in `astro.config.mjs` for `DEVPAD_API_KEY`, `DEVTO_KEY`, `POSTS_URL`, `DEVPAD_URL` (all `secret`, `optional: false` except `DEVPAD_URL` which has a default) | ~20 | `astro.config.mjs` |
| 1.5 | Rewrite `src/client.ts` to import `DEVPAD_API_KEY`, `DEVPAD_URL` from `astro:env/server`. **BREAKING**: `VITE_*` env names removed. | ~10 | `src/client.ts` |
| 1.6 | Rewrite `src/utils.ts` env block (`secrets` object on lines 5-20) to import `DEVTO_KEY`, `POSTS_URL` from `astro:env/server`. Delete the missing-secret logging block. | ~15 | `src/utils.ts` |
| 1.7 | Add `wrangler.jsonc` with `name`, `main` (Astro adapter writes to `./dist/_worker.js/index.js`), `compatibility_date`, `compatibility_flags: ["nodejs_compat"]`, `assets` block pointing at `./dist`. No bindings yet (cache uses `caches.default` which is implicit). Add `observability.enabled = true`. | ~30 | new `wrangler.jsonc` |
| 1.8 | Add `.dev.vars` template (gitignored) and a committed `.dev.vars.example` documenting required local secrets | ~10 | new |
| 1.9 | Add `bun run typecheck` and `bun run dev:cf` scripts (`wrangler dev`); run `wrangler types` in postinstall to keep `worker-configuration.d.ts` fresh; add `worker-configuration.d.ts` to `.gitignore` | ~15 | `package.json`, `.gitignore` |
| 1.10 | Update `tsconfig.json` to include `worker-configuration.d.ts` types | ~5 | `tsconfig.json` |
| 1.11 | Smoke-verify: `bun run build && bunx wrangler dev` and curl `/`, `/projects`, `/blog`, `/og/default.png`. **Note**: OG endpoints will fail at runtime in this phase because resvg-js was removed — that's expected and gets fixed in Phase 3. Skip-or-temporarily-stub the OG endpoints so the rest of the app boots. | ~20 | OG endpoints (temporary stubs) |

**Parallelisation**: none. Foundation phase, single coder, default model.

**Verification phase**: typecheck + `bun run build` succeeds + manual `wrangler
dev` smoke test of non-OG routes. No tests yet (those land in Phase 2). Commit.

**Risk**: low. VPS untouched. Worst case: branch is broken, VPS keeps serving.

---

## Phase 2 — Cache rewrite + Provider pattern + first tests

**Goal**: replace the module-level cache with a Cache API wrapper, refactor
data fetchers to take providers (so they're testable), and add the first
proper test suite.

**Exit criteria**:

- `src/utils.ts` no longer holds module-level `caches` state. All cache reads
  go through a request-scoped helper that takes `(Cache, waitUntil)`.
- All data-fetcher entry points (`getProjects`, `getBlogPosts`, `fetchTimeline`,
  `getProject`, `getBlogPost`) accept providers (or read them from a
  request-scoped factory) — they no longer construct `devpad` directly.
- `bun test` runs and passes with ≥80% coverage on new modules.
- `wrangler dev` still serves all non-OG routes.
- VPS still untouched.

### Tasks

| # | Task | LOC | Parallel? | Files |
|---|------|-----|-----------|-------|
| 2.1 | Create `src/providers/` with three interfaces + production impls + in-memory impls. Production `HttpDevpadProvider` wraps `@devpad/api` (today's `src/client.ts` logic). `HttpDevtoProvider` wraps today's `fetchDevToAPI`. `HttpPostsFeedProvider` wraps today's POSTS_URL fetch. | ~180 | yes (3 sub-tasks, one per provider) | new |
| 2.2 | Create `src/lib/cache.ts`: `cachedFetch<T>(opts: { cache: Cache, ctx: { waitUntil(p): void }, key: string, ttlMs: number, fetcher: () => Promise<T> })` returning fresh / stale-then-refresh / fetch-now per the locked-in semantics. Stores `JSON.stringify(value)` in a `Response` with `Cache-Control: max-age=2*ttl` and an `X-Cached-At` header. On read, if age > ttl: schedule background refresh via `waitUntil`, return stale value immediately. | ~120 | no (depends on 2.1 only for the `Result`-like return shape if we wrap it) | new |
| 2.3 | Rewrite `src/utils.ts`: delete module-level `caches`/`StaleCache`/`update_cache`/`get_data`/`cache_status`. Replace `getProjects`, `getBlogPosts`, `fetchTimeline`, `getProject`, `getBlogPost`, `isProjectCacheInvalid` with versions that take `({ providers, cache, ctx })` or read from a per-request context. **Keep the public function signatures stable for callers that don't pass context** by reading from `Astro.locals` (Astro adapter exposes `runtime.ctx` and `runtime.caches` on locals). Document the locals contract. | ~150 | no (depends on 2.1 + 2.2) | `src/utils.ts` |
| 2.4 | Add an Astro middleware (`src/middleware.ts`) that populates `Astro.locals.runtime` with `{ providers, cache, ctx }` per request. The cloudflare adapter already exposes `runtime.ctx` and `caches.default` — middleware just constructs production providers once and stashes them. | ~50 | no (depends on 2.3) | new |
| 2.5 | Update component/page call sites to use the new signatures. Most will be no-op if 2.3 keeps `getProjects()` callable with no args by reading from `Astro.locals` — but the `astro.config.mjs` build-time sitemap call already moved to `src/lib/build-data.ts` in 1.3, so no module-load-time issue remains. | ~30 | no | call sites listed above |
| 2.6 | Add `__tests__/helpers.ts` with `makeFakeCache()` (Map-backed Cache), `makeFakeCtx()` ({ waitUntil(p) { p.catch(noop) } }), and `makeFakeProviders()` factory | ~80 | yes | new |
| 2.7 | Write `__tests__/integration/cache.test.ts`: fresh hit, stale hit triggers background refresh, empty miss waits for fetcher, fetcher error returns last-good-stale, ctx.waitUntil is actually called on stale, ttl boundary | ~150 | yes (depends on 2.2 + 2.6) | new |
| 2.8 | Write `__tests__/integration/data-loading.test.ts`: `getProjects` filters PUBLIC, `getBlogPost` for DEVTO vs DEV groups, `fetchTimeline` returns array, error path returns empty array. Uses fake providers + fake cache. | ~150 | yes (parallel with 2.7) | new |
| 2.9 | Add `bun test` script to `package.json`. Add `bun run typecheck && bun test` to a single `bun run check` script that CI will call. | ~5 | yes | `package.json` |

**Parallelisation**: 2.1 splits into 3 parallel coder-fast worktrees (one per
provider). 2.2 → 2.3 → 2.4 → 2.5 is sequential. 2.6 + 2.7 + 2.8 can run
parallel after 2.4 lands.

**Verification phase**: typecheck + `bun test` + `bun run build` + `wrangler
dev` smoke. Commit.

**Risk**: medium. Cache semantics regression possible. Mitigation: tests
cover all three states explicitly. VPS still untouched.

**BREAKING**: signature change for `getProjects()` etc. — but they're
internal-only (no external consumers). Call sites updated in 2.5.

---

## Phase 3 — OG images via `workers-og`

**Goal**: drop `@resvg/resvg-js`, swap in `workers-og`, restore OG endpoints,
test them.

**Exit criteria**:

- `/og/default.png`, `/og/project/<id>.png`, `/og/blog/<group>/<slug>.png` all
  return 200 + `image/png` from `wrangler dev`
- Tests assert the endpoints return PNG and that the SVG (via satori
  intermediate output) contains the expected text
- VPS still untouched

### Tasks

| # | Task | LOC | Parallel? | Files |
|---|------|-----|-----------|-------|
| 3.1 | Add `workers-og` to deps. Drop `satori` and `@resvg/resvg-js` direct deps if `workers-og` re-exports them; otherwise keep `satori` (workers-og uses it internally). | ~5 | no | `package.json` |
| 3.2 | Rewrite `src/lib/og-image.ts`: replace `satori + Resvg` with `ImageResponse` from `workers-og` (or `og`/`og.svg` depending on the API the package ships). Keep `OG` colour tokens, `statusColor`, `loadFonts`, `ogResponse` unchanged in shape. Adjust `renderOgImage` to return either a `Response` directly or a `Buffer` depending on what's idiomatic for `workers-og`. | ~80 | no | `src/lib/og-image.ts` |
| 3.3 | Update `src/pages/og/default.png.ts` to use the new `og-image.ts` API | ~10 | yes | file |
| 3.4 | Update `src/pages/og/project/[project_id].png.ts` likewise | ~10 | yes | file |
| 3.5 | Update `src/pages/og/blog/[group]/[slug].png.ts` likewise | ~10 | yes | file |
| 3.6 | Add `__tests__/integration/og-images.test.ts`: import the GET handlers, call them with mock `APIContext`, assert response is 200 + content-type `image/png` + body length > 1000 bytes. For the satori-text assertion, expose a thin `renderToSvg()` from `og-image.ts` that returns the intermediate SVG so tests can `expect(svg).toContain('forbit')`, etc. | ~120 | yes | new |
| 3.7 | Manual `wrangler dev` smoke: curl all 3 OG endpoints, save PNGs, eyeball them. Document any rendering deltas vs. resvg-js. | ~0 | no | (manual) |

**Parallelisation**: 3.1 → 3.2 sequential. Then 3.3 + 3.4 + 3.5 + 3.6 in
parallel (4 worktrees).

**Verification phase**: `bun test`, `bun run build`, `wrangler dev` + curl
endpoints. Commit.

**Risk**: low-medium. `workers-og` rendering may differ visually from
resvg-js. Mitigation: PNG dimensions and byte-floor in tests; manual eyeball
in 3.7.

---

## Phase 4 — Workers Builds + DNS cutover

**Goal**: production traffic served by Cloudflare Workers via custom domain.
Auto-deploy from main, preview URLs on PRs, rebuild on DevPad publish.

**Exit criteria**:

- `forbit.dev` resolves to a Worker
- Pushes to `main` auto-deploy
- PRs auto-publish a preview URL
- DevPad publish triggers a rebuild
- Smoke tests run post-deploy and gate promotion
- VPS still running but no longer in DNS
- Rollback runbook documented

### Tasks (mix of automated and user-action-required)

#### 4a. Repo-side automation (coder agent)

| # | Task | LOC | Parallel? | Files |
|---|------|-----|-----------|-------|
| 4.1 | Add `scripts/smoke.ts` — Bun script taking `BASE_URL` env var, hitting the 6 routes listed in Testing Strategy, asserting status + content-type. Exit 1 on any failure. | ~80 | yes | new |
| 4.2 | Document Workers Builds config in `AGENTS.md` and a new `docs/deploy.md`: build command, deploy command (prod vs non-prod), required secrets, smoke command. Include the exact dashboard form-fill values. | ~80 | yes | new |
| 4.3 | Replace `.github/workflows/deploy.yml` with a no-op or delete it. The Workers Builds dashboard handles deploys. **Keep** a separate GitHub Action only if we want PR comments with preview URLs (Workers Builds posts a deployment status, but a comment is nicer); skip if low value. | ~0 | yes | delete file |
| 4.4 | Document the DevPad → CF Deploy Hook URL setup. Add a `docs/content-publishing.md` with the exact hook URL placeholder, how to register it on DevPad's blog publish webhook, and the cache-flush story (new isolate = empty Cache API entries). | ~40 | yes | new |
| 4.5 | Add a `bun run smoke` script that points at a base URL passed via env var | ~5 | yes | `package.json` |
| 4.6 | Rollback runbook in `docs/rollback.md`: (a) flip DNS back to VPS A record, (b) `wrangler rollback` to previous version, (c) when each is appropriate. | ~50 | yes | new |

#### 4b. User-action-required steps (documented, NOT automated)

These are the **only** steps the user needs to perform. The plan documents
exact click-paths so it's a copy-paste runbook.

1. **Connect GitHub to Cloudflare** (one-time):
   - Cloudflare Dashboard → Workers & Pages → Create → Connect Git
   - Authorise the `f0rbit/forbit-astro` repo
2. **Create Worker via Workers Builds**:
   - Project name: `forbit-astro`
   - Production branch: `main`
   - Build command: `bun install --frozen-lockfile && bun run check && bun run build`
     (`check` = typecheck + tests, runs pre-deploy)
   - Deploy command (production): `bunx wrangler deploy`
   - Deploy command (non-production): `bunx wrangler versions upload`
   - Post-deploy command: `BASE_URL=$CF_PAGES_URL bun run smoke`
     (Workers Builds exposes the deployed URL as an env var — verify exact
     name in Workers Builds docs at deploy time; document the actual variable
     in `docs/deploy.md`)
3. **Set runtime secrets** (dashboard → worker → Settings → Variables):
   - `DEVPAD_API_KEY` (secret)
   - `DEVTO_KEY` (secret)
   - `POSTS_URL` (secret or var, user's call)
   - `DEVPAD_URL` (var, default `https://devpad.tools/api/v1`)
4. **First production deploy**: trigger a build from the dashboard. Worker
   resolves at `forbit-astro.<account>.workers.dev`. Hit it manually, eyeball
   each route.
5. **Bind custom domain** (dashboard → worker → Settings → Domains & Routes →
   Add Custom Domain → `forbit.dev`). Cloudflare auto-handles cert + DNS if
   `forbit.dev` is on the same Cloudflare account; if not, follow the prompts.
6. **DNS cutover**: switch the `forbit.dev` A record (or CNAME) to the
   Cloudflare Worker route. **TTL should already be low** — if not, drop TTL
   to 60s a day before cutover.
7. **Create the Deploy Hook** (dashboard → worker → Settings → Builds → Deploy
   Hooks → Add Hook → name "devpad-publish", branch `main`). Copy the URL,
   register it on DevPad's blog publish webhook (DevPad UI).
8. **VPS sunset** (T+7 days):
   - Watch CF analytics for 7 days, no errors
   - Stop the VPS Astro service (don't decommission yet)
   - T+30 days: decommission VPS

**Parallelisation**: 4.1 + 4.2 + 4.4 + 4.5 + 4.6 are independent — run all 5
in parallel coder-fast worktrees. Verification coder merges and commits. User
then walks through 4b at their pace.

**Verification phase**: typecheck + tests + `bun run build`. Commit.

**Risk**: high consequence (DNS cutover) but well-mitigated. Rollback is
single-step (flip DNS back). VPS keeps running for 7 days as the safety net.

---

## Cross-cutting risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `workers-og` rendering differs visually | Medium | Low (it's an OG image) | Manual eyeball in Phase 3 task 3.7 |
| Cache API quirks (e.g. cache miss in dev) | Medium | Low | Tests use fake cache; smoke tests in Phase 4 catch prod regression |
| `astro:env/server` types not generated | Low | Medium | `wrangler types` in postinstall + tsconfig include |
| Workers Builds env var for deployed URL undocumented | Low | Low | Phase 4 task 4.2 verifies the exact var name at deploy time |
| Build-time sitemap fetch fails (no network in CI) | Medium | Medium | `src/lib/build-data.ts` returns empty arrays on fetch error; sitemap stays buildable |
| New isolate doesn't actually flush cache (Cache API persists across isolates) | Medium | Medium | This is real — Cache API persists. Re-deploy doesn't auto-flush. **Mitigation**: bake the deploy SHA into cache keys (e.g. `https://cache.local/${SHA}/projects`) so a new deploy uses fresh keys. Old entries age out naturally. |

The last one is **important** and may modify Phase 2 — see "Open question"
below.

---

## OPEN QUESTIONS

1. **Cache invalidation on deploy**: the locked-in plan says "fresh isolate
   flushes cache". That's true for *module-level memory* but **not** for
   Cloudflare Cache API — Cache API persists across isolates and across
   deploys. The DevPad → Deploy Hook design assumes a deploy purges the cache;
   it won't. Two options:
   - **(A) Bake the deploy SHA into cache keys**: `cache.local/${SHA}/projects`.
     New deploy = new SHA = new keys = effective flush. Simple, no API calls
     needed. **Recommended.**
   - **(B) Programmatic purge** via Cloudflare API on each deploy (post-deploy
     step). Adds an API token and a script. Heavier.
   I've taken Option A as the default in Phase 2 — confirm before Phase 2
   kicks off.

2. **devpad MCP not currently exposed** in this session — `devpad_*` tools
   were not in the available-tools list when this plan was written. Tasks
   below are written as a sectioned list ready to be mirrored into devpad
   manually or via an `Agent` invocation that has the MCP loaded. If you'd
   prefer, I can fall back to in-session `TaskCreate` for ephemeral tracking.

3. **`@f0rbit/corpus` Result types**: ✅ RESOLVED. `@devpad/api@2.1.11` (latest)
   imports corpus and re-exports `{ Result, err, ok }`. Plan now bumps devpad
   `2.0.2 → ^2.1.11` in Phase 1 task 1.1 and uses corpus throughout (imported
   from `@devpad/api`, no separate corpus dep needed). `Result<T, E>` shape is
   compatible with existing call sites — they already check `result.ok`.

---

## Suggested AGENTS.md updates (after migration)

Once Phase 4 ships, append to project `AGENTS.md`:

- Hosting: Cloudflare Workers via Workers Builds (auto-deploy on push to
  `main`, preview URLs on PRs)
- Local dev: `bun run dev` (Vite) for iteration; `bun run dev:cf` (`wrangler
  dev`) for workerd parity check before push
- Env vars: `astro:env/server` typed schema; secrets in CF dashboard, local
  values in `.dev.vars`
- Cache: `caches.default` with SWR via `ctx.waitUntil`; cache keys include
  deploy SHA so a new build effectively flushes
- Tests: `bun test`. Provider pattern + in-memory cache helpers in
  `__tests__/helpers.ts`. Run with `bun run check` (typecheck + tests).
- Content publishing: DevPad blog publish triggers a CF Deploy Hook → rebuild
  → fresh cache keys
- Rollback: `wrangler rollback` for code, DNS flip to VPS for emergency

---

## Devpad task list (mirror these once MCP is available)

Each task includes title, phase, priority, dependencies. Project: `forbit-astro`.

### Phase 1 — Foundation
- 1.1 Bump Astro 4.x + swap adapter (HIGH, no deps)
- 1.2 Rewrite astro.config.mjs adapter block (HIGH, deps: 1.1)
- 1.3 Create build-data.ts for sitemap (MED, deps: 1.1)
- 1.4 Define astro:env/server schema (HIGH, deps: 1.2)
- 1.5 Migrate src/client.ts env access (HIGH, deps: 1.4)
- 1.6 Migrate src/utils.ts env access (HIGH, deps: 1.4)
- 1.7 Add wrangler.jsonc (HIGH, deps: 1.2)
- 1.8 Add .dev.vars.example (LOW, deps: 1.4)
- 1.9 Add typecheck/dev:cf scripts (MED, deps: 1.7)
- 1.10 Update tsconfig (LOW, deps: 1.9)
- 1.11 Phase 1 smoke verify (HIGH, deps: 1.1-1.10)

### Phase 2 — Cache + Providers + Tests
- 2.1a HttpDevpadProvider + InMemory (HIGH, parallel, deps: Phase 1)
- 2.1b HttpDevtoProvider + InMemory (HIGH, parallel, deps: Phase 1)
- 2.1c HttpPostsFeedProvider + InMemory (HIGH, parallel, deps: Phase 1)
- 2.2 src/lib/cache.ts SWR wrapper (HIGH, deps: 2.1a/b/c)
- 2.3 Rewrite src/utils.ts (HIGH, deps: 2.2)
- 2.4 Add src/middleware.ts for locals (HIGH, deps: 2.3)
- 2.5 Update call sites (MED, deps: 2.4)
- 2.6 Test helpers (MED, parallel after 2.4)
- 2.7 Cache integration tests (HIGH, parallel after 2.6)
- 2.8 Data-loading integration tests (HIGH, parallel with 2.7)
- 2.9 Add bun test scripts (LOW, deps: 2.7+2.8)

### Phase 3 — OG Images
- 3.1 Swap deps to workers-og (HIGH, deps: Phase 2)
- 3.2 Rewrite src/lib/og-image.ts (HIGH, deps: 3.1)
- 3.3 Migrate default.png.ts (MED, parallel, deps: 3.2)
- 3.4 Migrate project/[project_id].png.ts (MED, parallel)
- 3.5 Migrate blog/[group]/[slug].png.ts (MED, parallel)
- 3.6 OG endpoint tests (HIGH, parallel)
- 3.7 Manual eyeball smoke (LOW, deps: 3.3-3.5)

### Phase 4 — CI/CD + Cutover
- 4.1 scripts/smoke.ts (MED, parallel, deps: Phase 3)
- 4.2 docs/deploy.md (MED, parallel)
- 4.3 Delete old GitHub Actions (LOW, parallel)
- 4.4 docs/content-publishing.md (LOW, parallel)
- 4.5 bun run smoke script (LOW, parallel)
- 4.6 docs/rollback.md (MED, parallel)
- 4.7 USER ACTION: Workers Builds dashboard setup (HIGH, deps: 4.1-4.6)
- 4.8 USER ACTION: First production deploy + custom domain (HIGH, deps: 4.7)
- 4.9 USER ACTION: DNS cutover (HIGH, deps: 4.8)
- 4.10 USER ACTION: DevPad deploy hook wired up (MED, deps: 4.8)
- 4.11 T+7 VPS sunset (LOW, deps: 4.9)
