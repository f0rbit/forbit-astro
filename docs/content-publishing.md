# Content publishing

## How a new blog post reaches forbit.dev

1. Publish a post in DevPad (`status: published`).
2. DevPad fires the configured webhook -> Cloudflare Workers Builds Deploy
   Hook URL.
3. Workers Builds rebuilds from `main`, injecting the new commit SHA into
   `BUILD_SHA` at build time (`astro.config.mjs` reads
   `WORKERS_CI_COMMIT_SHA` -> `GITHUB_SHA` -> `'dev'`).
4. New deploy = new SHA = new cache keys (`https://cache.local/${SHA}/blog`)
   = effective cache flush.
5. First request after deploy populates the new cache; subsequent requests
   hit it.

End-to-end latency: ~30-90s from DevPad publish to forbit.dev showing the
new post.

## Setup

See `docs/deploy.md` Section 5 for the Deploy Hook URL setup.

## What if cache flush is too slow

The Cache API persists across deploys until `max-age` expires.
SHA-keyed cache keys solve this: a new build can never read old SHA's
entries. Old entries age out via `max-age = 2 * ttl` (default 1200s = 20 min)
and Cloudflare's eventual eviction.

If a hot-fix is needed faster, manually trigger the Deploy Hook from the
dashboard (Settings -> Builds -> Deploy Hooks) without committing. Same
effect: new build -> new SHA -> fresh cache keys.
