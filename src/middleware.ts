import { defineMiddleware } from "astro:middleware";
import { HttpDevpadProvider } from "./providers/devpad";
import { HttpDevtoProvider } from "./providers/devto";
import { HttpPostsFeedProvider } from "./providers/posts-feed";
import type { CacheCtx } from "./lib/cache";

const NOOP_CTX: CacheCtx = { waitUntil: () => {} };

type CfRuntime = App.Locals["runtime"] | undefined;

// The Workers Cache API's `Cache`/`CacheStorage` (from @astrojs/cloudflare's
// Runtime type and the ambient worker-configuration.d.ts global) don't
// structurally match lib.dom's `Cache`/`CacheStorage` (extra methods like
// add/addAll/keys/matchAll) — the two globals collide under this tsconfig's
// default DOM lib. Pre-existing `any` boundary, deferred (lint-adoption
// scope only), not a real type unification task here.
function resolve_cache(runtime: CfRuntime): Cache | undefined {
	// oxlint-disable-next-line typescript/no-explicit-any -- see comment above resolve_cache
	const from_runtime: any = runtime?.caches.default;
	if (from_runtime) return from_runtime as Cache;
	if (typeof caches !== "undefined" && (caches as unknown as { default?: Cache }).default) {
		return (caches as unknown as { default: Cache }).default;
	}
	return undefined;
}

function resolve_ctx(runtime: CfRuntime): CacheCtx {
	const ctx = runtime?.ctx;
	if (ctx && typeof ctx.waitUntil === "function") {
		return {
			waitUntil: (p) => {
				ctx.waitUntil(p);
			},
		};
	}
	return NOOP_CTX;
}

// eslint-disable-next-line @typescript-eslint/naming-convention -- Astro middleware discovery requires the exact export name `onRequest`
export const onRequest = defineMiddleware(async (context, next) => {
	const env = await import("astro:env/server");
	const runtime = context.locals.runtime;
	context.locals.providers = {
		devpad: new HttpDevpadProvider({ base_url: env.DEVPAD_URL, api_key: env.DEVPAD_API_KEY }),
		devto: new HttpDevtoProvider({ apiKey: env.DEVTO_KEY }),
		postsFeed: new HttpPostsFeedProvider({ url: env.POSTS_URL }),
	};
	context.locals.cache = resolve_cache(runtime);
	context.locals.ctx = resolve_ctx(runtime);
	return next();
});
