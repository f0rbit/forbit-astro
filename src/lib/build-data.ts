/**
 * Build-time data fetchers for sitemap generation.
 *
 * Runs in Node at `astro build`, NOT in the Workers runtime. Must not import
 * anything that depends on `astro:env/server` (those bindings only resolve at
 * request time inside the Worker). Reads from `process.env` directly so the
 * sitemap stays buildable in CI.
 *
 * Returns empty arrays on any fetch failure — sitemap should still build
 * without network access to DevPad.
 */

import { ApiClient } from "@devpad/api";

type BuildPost = { group: string; slug: string };
type BuildProject = { project_id: string };

const BLOG_GROUP_DEV = "dev";

function make_client() {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- worker-configuration.d.ts declares these as always-present `string` for the Workers runtime, but this function runs in plain Node at `astro build` (see file header) where they're genuinely optional
	const base_url = process.env.DEVPAD_URL ?? process.env.VITE_DEVPAD_URL ?? "https://devpad.tools/api/v1";
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- see above
	const api_key = process.env.DEVPAD_API_KEY ?? process.env.VITE_DEVPAD_API_KEY;
	if (!api_key) return null;
	return new ApiClient({ base_url, api_key });
}

export async function get_build_projects(): Promise<BuildProject[]> {
	const client = make_client();
	if (!client) return [];
	try {
		const result = await client.projects.list({ private: false });
		if (!result.ok) {
			console.warn("[build-data] projects fetch failed:", result.error.message);
			return [];
		}
		/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- @devpad/api list() response shape untyped here, deferred (lint-adoption scope only) */
		// oxlint-disable-next-line typescript/no-explicit-any -- see above
		return result.value.filter((p: any) => p.visibility === "PUBLIC").map((p: any) => ({ project_id: p.project_id }));
		/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
	} catch (err) {
		console.warn("[build-data] projects fetch threw:", err);
		return [];
	}
}

export async function get_build_blog_posts(): Promise<BuildPost[]> {
	const client = make_client();
	if (!client) return [];
	try {
		const result = await client.blog.posts.list({ status: "published", limit: 100 });
		if (!result.ok) {
			console.warn("[build-data] blog posts fetch failed:", result.error.message);
			return [];
		}
		/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- @devpad/api posts.list() response shape untyped here, deferred (lint-adoption scope only) */
		return (
			result.value.posts
				.filter(
					// oxlint-disable-next-line typescript/no-explicit-any -- see above
					(p: any) => !p.archived,
				)
				// oxlint-disable-next-line typescript/no-explicit-any -- see above
				.map((p: any) => ({ group: BLOG_GROUP_DEV, slug: p.slug }))
		);
		/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
	} catch (err) {
		console.warn("[build-data] blog posts fetch threw:", err);
		return [];
	}
}
