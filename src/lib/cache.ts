import { ok } from "@devpad/api";
import type { Result, ProviderError } from "../providers/types";
import { BUILD_SHA } from "./build-sha";

export type CacheCtx = { waitUntil(promise: Promise<unknown>): void };

export type CachedFetchOpts<T> = {
	cache: Cache;
	ctx: CacheCtx;
	name: string;
	ttlSeconds: number;
	fetcher: () => Promise<Result<T, ProviderError>>;
};

function build_key(name: string): Request {
	return new Request(`https://cache.local/${BUILD_SHA}/${name}`);
}

async function refresh_and_store<T>(opts: CachedFetchOpts<T>, key: Request): Promise<Result<T, ProviderError>> {
	const result = await opts.fetcher();
	if (!result.ok) return result;
	const response = new Response(JSON.stringify(result.value), {
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": `public, max-age=${(opts.ttlSeconds * 2).toString()}`,
			"X-Cached-At": Date.now().toString(),
		},
	});
	await opts.cache.put(key, response);
	return result;
}

async function safe_refresh<T>(opts: CachedFetchOpts<T>, key: Request): Promise<void> {
	try {
		const result = await refresh_and_store(opts, key);
		if (!result.ok) {
			console.warn(`[cache] background refresh of ${opts.name} failed:`, result.error.message);
		}
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		console.warn(`[cache] background refresh of ${opts.name} threw:`, message);
	}
}

export async function cached_fetch<T>(opts: CachedFetchOpts<T>): Promise<Result<T, ProviderError>> {
	const key = build_key(opts.name);
	const hit = await opts.cache.match(key);

	if (hit) {
		const cached_at = Number(hit.headers.get("X-Cached-At") ?? 0);
		const age_sec = (Date.now() - cached_at) / 1000;
		const data = (await hit.json()) as T;
		if (age_sec <= opts.ttlSeconds) {
			return ok(data);
		}
		opts.ctx.waitUntil(safe_refresh(opts, key));
		return ok(data);
	}

	return await refresh_and_store(opts, key);
}
