import { ok } from "@devpad/api";
import { type Project, type BlogGroup, BLOG_GROUP, type Post } from "./types";
import { cached_fetch, type CacheCtx } from "./lib/cache";
import type { AppProviders, ProviderError, Result } from "./providers/types";

export { format_duration } from "./lib/time";

const DEFAULT_TTL_SECONDS = 10 * 60; // 10 minutes

export type AppLocals = {
	providers: AppProviders;
	cache: Cache | undefined;
	ctx: CacheCtx;
};

function result_to_array<T>(result: Result<T[], ProviderError>, name: string): T[] {
	if (result.ok) return result.value;
	console.error(`${name}: fetch error`, result.error.message);
	return [];
}

function result_to_value<T>(result: Result<T, ProviderError>, name: string): T | null {
	if (result.ok) return result.value;
	console.error(`${name}: fetch error`, result.error.message);
	return null;
}

async function get_cached<T>(
	locals: AppLocals,
	name: string,
	fetcher: () => Promise<Result<T, ProviderError>>,
): Promise<Result<T, ProviderError>> {
	if (!locals.cache) return await fetcher();
	return await cached_fetch({
		cache: locals.cache,
		ctx: locals.ctx,
		name,
		ttlSeconds: DEFAULT_TTL_SECONDS,
		fetcher,
	});
}

export async function get_projects(locals: AppLocals): Promise<Project[]> {
	const result = await get_cached(locals, "projects", () => locals.providers.devpad.listProjects());
	return result_to_array(result, "PROJECTS");
}

export async function get_blog_posts(locals: AppLocals): Promise<Post[]> {
	const result = await get_cached(locals, "blog", async () => {
		const [devto_result, devpad_result] = await Promise.all([
			locals.providers.devto.listMyArticles(),
			locals.providers.devpad.listPosts(),
		]);
		const devto_posts = devto_result.ok ? devto_result.value : [];
		const devpad_posts = devpad_result.ok ? devpad_result.value : [];
		if (!devto_result.ok) console.error("BLOG: devto fetch error", devto_result.error.message);
		if (!devpad_result.ok) console.error("BLOG: devpad fetch error", devpad_result.error.message);
		const posts = [...devto_posts, ...devpad_posts];
		posts.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
		return { ok: true, value: posts };
	});
	return result_to_array(result, "BLOG");
}

export async function fetch_timeline(locals: AppLocals): Promise<unknown[]> {
	const result = await get_cached(locals, "timeline", () => locals.providers.postsFeed.fetchTimeline());
	return result_to_array(result, "TIMELINE");
}

export async function get_project(locals: AppLocals, project_id: string): Promise<Project | null> {
	const cached = await get_cached(locals, "projects", () => locals.providers.devpad.listProjects());
	if (cached.ok) {
		const found = cached.value.find((p) => p.project_id == project_id);
		if (found) return found;
	}
	const direct = await locals.providers.devpad.getProject(project_id);
	return result_to_value(direct, "FETCH_PROJECT");
}

export async function get_blog_post(locals: AppLocals, group: BlogGroup, slug: string): Promise<Post | null> {
	if (group == BLOG_GROUP.DEVTO) {
		const result = await locals.providers.devto.getArticle(slug);
		return result_to_value(result, "BLOG_POST_DEVTO");
	}
	if (group == BLOG_GROUP.DEV) {
		const result = await locals.providers.devpad.getPost(slug);
		return result_to_value(result, "BLOG_POST_DEV");
	}
	console.error(`Invalid blog group ${group}`);
	return null;
}

export async function get_blog_post_html(
	locals: AppLocals,
	group: BlogGroup,
	slug: string,
	render: () => Promise<string>,
): Promise<string> {
	const result = await get_cached<string>(locals, `blog-html:${group}:${slug}`, async () => ok(await render()));
	return result_to_value(result, "BLOG_POST_HTML") ?? "";
}

export async function get_project_html(
	locals: AppLocals,
	project_id: string,
	render: () => Promise<string>,
): Promise<string> {
	const result = await get_cached<string>(locals, `project-html:${project_id}`, async () => ok(await render()));
	return result_to_value(result, "PROJECT_HTML") ?? "";
}

/** @todo fix typings */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/restrict-template-expressions -- everything below cascades from the untyped params above, see @todo */
// oxlint-disable-next-line typescript/no-explicit-any -- see @todo above, deferred out of lint-adoption scope
export function get_timeline(activities: any, group_commits: any) {
	const DAY_IN_MS = 24 * 60 * 60 * 1000;
	// oxlint-disable-next-line typescript/no-explicit-any -- see @todo above
	const event_timeline: any = [];
	const timeline = activities.toReversed();

	// oxlint-disable-next-line typescript/no-explicit-any -- see @todo above
	let commits: any = [];
	let last_commit_date = 0;

	const push_commits = () => {
		if (commits.length > 0) {
			event_timeline.push({
				category: "COMMITS",
				commits: commits.slice().toReversed(),
				date: commits[commits.length - 1].date,
				title: `${commits.length} commits to f0rbit/${commits[0].project}`,
				project: commits[0].project,
			});
			commits = [];
		}
	};

	for (const item of timeline) {
		if (item.category == "BLOG") continue;
		if (item.category === "GITHUB" && group_commits) {
			const item_date = item.date;

			if (
				commits.length === 0 ||
				(item.project === commits[0].project && item_date - last_commit_date <= 3 * DAY_IN_MS)
			) {
				commits.push(item);
				last_commit_date = item_date;
			} else {
				push_commits();
				commits = [item];
				last_commit_date = item_date;
			}
		} else {
			push_commits();
			event_timeline.push(item);
		}
	}

	push_commits();

	return event_timeline.toReversed();
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/restrict-template-expressions */
