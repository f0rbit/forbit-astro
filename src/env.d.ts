/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// `worker-configuration.d.ts` is generated with `wrangler types --include-runtime=false`, so the
// Workers runtime globals it would otherwise emit (including a global `interface ImageMetadata`
// that collides with astro's own global `ImageMetadata`) are not in the program. `Fetcher` is the
// only runtime type the generated env interface actually references, so pull just that one in via
// a scoped import instead of the whole global block. See AGENTS.md for the full note.
type Fetcher = import("@cloudflare/workers-types").Fetcher;

declare namespace App {
	interface Locals {
		runtime: import("@astrojs/cloudflare").Runtime<Env>["runtime"];
		providers: import("./providers/types").AppProviders;
		cache: Cache | undefined;
		ctx: import("./lib/cache").CacheCtx;
	}
}

interface ImportMetaEnv {
	readonly BUILD_SHA: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
