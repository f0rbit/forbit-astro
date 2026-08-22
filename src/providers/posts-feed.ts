import { ok, err } from "@devpad/api";
import type { Result, ProviderError } from "./types";

export type PostsFeedProvider = {
	fetchTimeline(): Promise<Result<unknown[], ProviderError>>;
};

type PostsFeedConfig = { url: string };

export class HttpPostsFeedProvider implements PostsFeedProvider {
	constructor(private readonly config: PostsFeedConfig) {}

	async fetchTimeline(): Promise<Result<unknown[], ProviderError>> {
		try {
			const response = await fetch(this.config.url);
			if (!response.ok) {
				return err({ code: "fetch_failed", message: `posts-feed returned ${response.status.toString()}` });
			}
			const data: unknown = await response.json();
			return ok(data as unknown[]);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return err({ code: "network_error", message });
		}
	}
}
