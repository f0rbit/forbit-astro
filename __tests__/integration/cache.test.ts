import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ok, err } from "@devpad/api";
import { cached_fetch } from "../../src/lib/cache";
import { make_fake_cache, make_fake_ctx } from "../helpers";
import type { Result, ProviderError } from "../../src/providers/types";

const make_counting_fetcher = <T>(
	values: T[],
): { fetcher: () => Promise<Result<T, ProviderError>>; calls: () => number } => {
	let i = 0;
	let calls = 0;
	const fetcher = async (): Promise<Result<T, ProviderError>> => {
		calls++;
		const v = values[Math.min(i, values.length - 1)];
		i++;
		return ok(v);
	};
	return { fetcher, calls: () => calls };
};

describe("cached_fetch SWR semantics", () => {
	const real_now = Date.now;
	let now_ms = 0;

	const advance = (ms: number) => {
		now_ms += ms;
	};

	beforeEach(() => {
		now_ms = 1_700_000_000_000;
		Date.now = () => now_ms;
	});

	afterEach(() => {
		Date.now = real_now;
	});

	it("fresh hit reuses cache without re-invoking fetcher", async () => {
		const cache = make_fake_cache();
		const ctx = make_fake_ctx();
		const { fetcher, calls } = make_counting_fetcher([["a"]]);

		const first = await cached_fetch({ cache, ctx, name: "fresh", ttlSeconds: 600, fetcher });
		advance(60 * 1000);
		const second = await cached_fetch({ cache, ctx, name: "fresh", ttlSeconds: 600, fetcher });

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (first.ok && second.ok) {
			expect(first.value).toEqual(["a"]);
			expect(second.value).toEqual(["a"]);
		}
		expect(calls()).toBe(1);
		expect(ctx.promises.length).toBe(0);
	});

	it("empty miss invokes fetcher once, caches the value, and returns ok", async () => {
		const cache = make_fake_cache();
		const ctx = make_fake_ctx();
		const { fetcher, calls } = make_counting_fetcher([["only"]]);

		const result = await cached_fetch({ cache, ctx, name: "miss", ttlSeconds: 600, fetcher });

		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual(["only"]);
		expect(calls()).toBe(1);

		const hit = await cache.match(new Request("https://cache.local/dev/miss"));
		expect(hit).toBeDefined();
	});

	it("cold-fetch failure returns err and leaves the cache empty", async () => {
		const cache = make_fake_cache();
		const ctx = make_fake_ctx();
		let calls = 0;
		const fetcher = async (): Promise<Result<string[], ProviderError>> => {
			calls++;
			return err({ code: "boom", message: "cold fetch failure" });
		};

		const first = await cached_fetch({ cache, ctx, name: "cold-fail", ttlSeconds: 600, fetcher });

		expect(first.ok).toBe(false);
		if (!first.ok) expect(first.error.code).toBe("boom");

		const hit = await cache.match(new Request("https://cache.local/dev/cold-fail"));
		expect(hit).toBeUndefined();

		const second = await cached_fetch({ cache, ctx, name: "cold-fail", ttlSeconds: 600, fetcher });
		expect(second.ok).toBe(false);
		expect(calls).toBe(2);
	});

	it("stale hit returns stale value, schedules refresh, and a later read sees the new value", async () => {
		const cache = make_fake_cache();
		const ctx = make_fake_ctx();
		const { fetcher, calls } = make_counting_fetcher([["v1"], ["v2"]]);

		const first = await cached_fetch({ cache, ctx, name: "stale", ttlSeconds: 60, fetcher });
		expect(first.ok).toBe(true);
		if (first.ok) expect(first.value).toEqual(["v1"]);

		advance(61 * 1000);
		const second = await cached_fetch({ cache, ctx, name: "stale", ttlSeconds: 60, fetcher });
		expect(second.ok).toBe(true);
		if (second.ok) expect(second.value).toEqual(["v1"]);
		expect(ctx.promises.length).toBe(1);

		await Promise.all(ctx.promises);

		const third = await cached_fetch({ cache, ctx, name: "stale", ttlSeconds: 60, fetcher });
		expect(third.ok).toBe(true);
		if (third.ok) expect(third.value).toEqual(["v2"]);
		expect(calls()).toBe(2);
	});

	it("stale-with-failed-refresh leaves the original entry intact", async () => {
		const cache = make_fake_cache();
		const ctx = make_fake_ctx();
		let calls = 0;
		const fetcher = async (): Promise<Result<string[], ProviderError>> => {
			calls++;
			if (calls === 1) return ok(["original"]);
			return err({ code: "refresh_failed", message: "background refresh failure" });
		};

		const first = await cached_fetch({ cache, ctx, name: "stale-fail", ttlSeconds: 60, fetcher });
		expect(first.ok).toBe(true);
		if (first.ok) expect(first.value).toEqual(["original"]);

		advance(61 * 1000);
		const second = await cached_fetch({ cache, ctx, name: "stale-fail", ttlSeconds: 60, fetcher });
		expect(second.ok).toBe(true);
		if (second.ok) expect(second.value).toEqual(["original"]);
		expect(ctx.promises.length).toBe(1);

		await Promise.all(ctx.promises);

		const third = await cached_fetch({ cache, ctx, name: "stale-fail", ttlSeconds: 60, fetcher });
		expect(third.ok).toBe(true);
		if (third.ok) expect(third.value).toEqual(["original"]);
	});

	it("ttl boundary: age == ttl is fresh; age == ttl + epsilon is stale", async () => {
		const cache = make_fake_cache();
		const ctx_boundary = make_fake_ctx();
		const { fetcher: fetcher_boundary } = make_counting_fetcher([["v1"], ["v2"]]);

		const seed_boundary = await cached_fetch({
			cache,
			ctx: ctx_boundary,
			name: "boundary",
			ttlSeconds: 60,
			fetcher: fetcher_boundary,
		});
		expect(seed_boundary.ok).toBe(true);

		advance(60 * 1000);
		const at_boundary = await cached_fetch({
			cache,
			ctx: ctx_boundary,
			name: "boundary",
			ttlSeconds: 60,
			fetcher: fetcher_boundary,
		});
		expect(at_boundary.ok).toBe(true);
		if (at_boundary.ok) expect(at_boundary.value).toEqual(["v1"]);
		expect(ctx_boundary.promises.length).toBe(0);

		const cache2 = make_fake_cache();
		const ctx_past = make_fake_ctx();
		const { fetcher: fetcher_past } = make_counting_fetcher([["v1"], ["v2"]]);

		const seed_past = await cached_fetch({
			cache: cache2,
			ctx: ctx_past,
			name: "boundary-past",
			ttlSeconds: 60,
			fetcher: fetcher_past,
		});
		expect(seed_past.ok).toBe(true);

		advance(60 * 1000 + 1);
		const past_boundary = await cached_fetch({
			cache: cache2,
			ctx: ctx_past,
			name: "boundary-past",
			ttlSeconds: 60,
			fetcher: fetcher_past,
		});
		expect(past_boundary.ok).toBe(true);
		if (past_boundary.ok) expect(past_boundary.value).toEqual(["v1"]);
		expect(ctx_past.promises.length).toBe(1);

		await Promise.all(ctx_past.promises);
	});

	it("exactly one waitUntil is scheduled per single stale read", async () => {
		const cache = make_fake_cache();
		const ctx = make_fake_ctx();
		const { fetcher } = make_counting_fetcher([["v1"], ["v2"]]);

		const first_wait = await cached_fetch({ cache, ctx, name: "one-wait", ttlSeconds: 60, fetcher });
		expect(first_wait.ok).toBe(true);
		expect(ctx.promises.length).toBe(0);

		advance(120 * 1000);
		const second_wait = await cached_fetch({ cache, ctx, name: "one-wait", ttlSeconds: 60, fetcher });
		expect(second_wait.ok).toBe(true);

		expect(ctx.promises.length).toBe(1);

		await Promise.all(ctx.promises);
	});

	it("different names produce independent cache entries", async () => {
		const cache = make_fake_cache();
		const ctx = make_fake_ctx();
		const { fetcher: fetcher_a, calls: calls_a } = make_counting_fetcher([["a1"], ["a2"]]);
		const { fetcher: fetcher_b, calls: calls_b } = make_counting_fetcher([["b1"], ["b2"]]);

		const seed_a = await cached_fetch({ cache, ctx, name: "name-a", ttlSeconds: 60, fetcher: fetcher_a });
		expect(seed_a.ok).toBe(true);
		const seed_b = await cached_fetch({ cache, ctx, name: "name-b", ttlSeconds: 60, fetcher: fetcher_b });
		expect(seed_b.ok).toBe(true);

		advance(120 * 1000);

		const stale_a = await cached_fetch({ cache, ctx, name: "name-a", ttlSeconds: 60, fetcher: fetcher_a });
		expect(stale_a.ok).toBe(true);
		if (stale_a.ok) expect(stale_a.value).toEqual(["a1"]);
		expect(ctx.promises.length).toBe(1);

		await Promise.all(ctx.promises);

		const fresh_b = await cached_fetch({ cache, ctx, name: "name-b", ttlSeconds: 600, fetcher: fetcher_b });
		expect(fresh_b.ok).toBe(true);
		if (fresh_b.ok) expect(fresh_b.value).toEqual(["b1"]);

		expect(calls_a()).toBe(2);
		expect(calls_b()).toBe(1);
	});
});
