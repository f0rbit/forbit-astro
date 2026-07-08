import { ok, err } from "@devpad/api";
import type { Result, ProviderError } from "./types";
import { type Post, BLOG_GROUP } from "../types";

export type DevtoProvider = {
	listMyArticles(): Promise<Result<Post[], ProviderError>>;
	getArticle(slug: string): Promise<Result<Post, ProviderError>>;
};

type DevtoConfig = { apiKey: string };

const HOST = "https://dev.to/api/articles";

function devto_headers(api_key: string): RequestInit {
	return { headers: { "api-key": api_key, accept: "application/vnd.forem.api-v1+json" } };
}

async function fetch_json<T>(url: string, init: RequestInit): Promise<Result<T, ProviderError>> {
	try {
		const response = await fetch(url, init);
		if (!response.ok) {
			return err({ code: "fetch_failed", message: `dev.to ${url} returned ${response.status.toString()}` });
		}
		const data = (await response.json()) as T;
		return ok(data);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return err({ code: "network_error", message });
	}
}

export class HttpDevtoProvider implements DevtoProvider {
	constructor(private readonly config: DevtoConfig) {}

	async listMyArticles(): Promise<Result<Post[], ProviderError>> {
		// oxlint-disable-next-line typescript/no-explicit-any -- dev.to API response shape untyped here, deferred (lint-adoption scope only)
		const result = await fetch_json<any[]>(`${HOST}/me`, devto_headers(this.config.apiKey));
		if (!result.ok) return result;
		// oxlint-disable-next-line typescript/no-explicit-any -- see above
		const posts: Post[] = (result.value ?? []).map((p: any) => ({ ...p, group: BLOG_GROUP.DEVTO })); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unnecessary-condition -- result.value is any[] here (T is inferred any[]), the ?? [] guard is a real runtime safety net against a missing field
		return ok(posts);
	}

	async getArticle(slug: string): Promise<Result<Post, ProviderError>> {
		/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- dev.to API response shape untyped here, deferred (lint-adoption scope only) */
		// oxlint-disable-next-line typescript/no-explicit-any -- see above
		const result = await fetch_json<any>(`${HOST}/forbit/${slug}`, devto_headers(this.config.apiKey));
		if (!result.ok) return result;
		const post = result.value;
		post.content = post.body_markdown;
		post.group = BLOG_GROUP.DEVTO;
		return ok(post as Post);
		/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
	}
}
