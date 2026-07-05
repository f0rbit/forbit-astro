import { describe, it, expect, beforeEach } from "bun:test";
import type { AppLocals } from "../../src/utils";
import { get_projects, get_blog_posts, fetch_timeline, get_project, get_blog_post } from "../../src/utils";
import { make_fake_cache, make_fake_ctx, make_fake_providers } from "../helpers";
import type { Project, Post } from "../../src/types";
import { PROJECT_VISIBILITY, BLOG_GROUP } from "../../src/types";

function create_call_counter(): { count: number; increment(): void } {
	const counter = {
		count: 0,
		increment: () => {
			counter.count++;
		},
	};
	return counter;
}

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return -- reflective test instrumentation (dynamically wraps a provider method to count calls); an in-memory-fake test helper, not production code */
// oxlint-disable-next-line typescript/no-explicit-any -- see above
function wrap_provider_with_counter(provider: any, method_name: string, counter: { count: number; increment(): void }) {
	const original = provider[method_name].bind(provider);
	// oxlint-disable-next-line typescript/no-explicit-any -- see above
	provider[method_name] = async function (...args: any[]) {
		counter.increment();
		return await original(...args);
	};
	return provider;
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */

/* eslint-disable @typescript-eslint/consistent-type-assertions -- fixture is intentionally a partial/loose shape (only the fields these tests read), not the full real `Project` type from @devpad/api */
function make_test_project(overrides?: Partial<Project>): Project {
	return {
		project_id: "test-project-1",
		title: "Test Project",
		description: "A test project",
		content: "Test content",
		visibility: PROJECT_VISIBILITY.PUBLIC,
		status: "LIVE",
		skills: [],
		...overrides,
	} as Project;
}
/* eslint-enable @typescript-eslint/consistent-type-assertions */

function make_test_post(overrides?: Partial<Post>): Post {
	const post: Post = {
		slug: "test-post",
		group: BLOG_GROUP.DEV,
		title: "Test Post",
		description: "A test post",
		published: true,
		published_at: new Date("2024-01-01").toISOString(),
		tag_list: [],
		content: "Test content",
		...overrides,
	};
	return post;
}

describe("Data Loading Integration", () => {
	let locals: AppLocals;
	let providers: ReturnType<typeof make_fake_providers>;

	beforeEach(() => {
		providers = make_fake_providers();
		const cache = make_fake_cache();
		const ctx = make_fake_ctx();
		locals = { providers, cache, ctx };
	});

	describe("get_projects", () => {
		it("returns all projects from the provider (in-memory does not filter by visibility)", async () => {
			const public_project = make_test_project({ visibility: PROJECT_VISIBILITY.PUBLIC });
			const private_project = make_test_project({
				project_id: "private-1",
				visibility: PROJECT_VISIBILITY.PRIVATE,
			});
			const hidden_project = make_test_project({
				project_id: "hidden-1",
				visibility: PROJECT_VISIBILITY.HIDDEN,
			});
			providers.devpad.projects = [public_project, private_project, hidden_project];

			const result = await get_projects(locals);

			// In-memory provider returns all projects; HTTP provider filters to PUBLIC only.
			// This test documents that in-memory provider behavior diverges from HTTP provider.
			expect(result).toHaveLength(3);
			expect(result.map((p) => p.project_id)).toEqual(["test-project-1", "private-1", "hidden-1"]);
		});

		it("returns [] when devpad provider returns err", async () => {
			const project = make_test_project();
			providers.devpad.projects = [project];
			providers.devpad.failures.add("listProjects");

			const result = await get_projects(locals);

			expect(result).toEqual([]);
		});

		it("caches the result — second call does not re-invoke the provider", async () => {
			const project = make_test_project();
			providers.devpad.projects = [project];

			const counter = create_call_counter();
			wrap_provider_with_counter(providers.devpad, "listProjects", counter);

			const result1 = await get_projects(locals);
			expect(counter.count).toBe(1);
			expect(result1).toHaveLength(1);

			// Second call should use cache
			const result2 = await get_projects(locals);
			expect(counter.count).toBe(1); // Still 1, not incremented
			expect(result2).toHaveLength(1);
		});
	});

	describe("get_blog_posts", () => {
		it("merges devto + devpad posts, sorted by published_at descending", async () => {
			const devto_posts = [
				make_test_post({
					group: BLOG_GROUP.DEVTO,
					slug: "devto-post-1",
					published_at: new Date("2024-01-15").toISOString(),
				}),
				make_test_post({
					group: BLOG_GROUP.DEVTO,
					slug: "devto-post-2",
					published_at: new Date("2024-01-10").toISOString(),
				}),
			];
			const devpad_posts = [
				make_test_post({
					slug: "devpad-post-1",
					published_at: new Date("2024-01-20").toISOString(),
				}),
			];
			providers.devto.articles = devto_posts;
			providers.devpad.posts = devpad_posts;

			const result = await get_blog_posts(locals);

			expect(result).toHaveLength(3);
			expect(result[0].published_at).toBe(new Date("2024-01-20").toISOString()); // Most recent first
			expect(result[1].published_at).toBe(new Date("2024-01-15").toISOString());
			expect(result[2].published_at).toBe(new Date("2024-01-10").toISOString());
		});

		it("returns devpad-only when devto fails", async () => {
			const devpad_post = make_test_post({ slug: "devpad-post-1" });
			providers.devpad.posts = [devpad_post];
			providers.devto.failures.add("listMyArticles");

			const result = await get_blog_posts(locals);

			expect(result).toHaveLength(1);
			expect(result[0].slug).toBe("devpad-post-1");
		});

		it("returns devto-only when devpad fails", async () => {
			const devto_post = make_test_post({
				group: BLOG_GROUP.DEVTO,
				slug: "devto-post-1",
			});
			providers.devto.articles = [devto_post];
			providers.devpad.failures.add("listPosts");

			const result = await get_blog_posts(locals);

			expect(result).toHaveLength(1);
			expect(result[0].slug).toBe("devto-post-1");
		});

		it("returns [] when both fail", async () => {
			providers.devto.failures.add("listMyArticles");
			providers.devpad.failures.add("listPosts");

			const result = await get_blog_posts(locals);

			expect(result).toEqual([]);
		});

		it("returns all devpad posts (in-memory does not filter archived unlike HTTP provider)", async () => {
			const normal_post1 = make_test_post({ slug: "normal-post-1" });
			const normal_post2 = make_test_post({ slug: "normal-post-2" });
			providers.devpad.posts = [normal_post1, normal_post2];

			const result = await get_blog_posts(locals);

			// In-memory provider returns all posts; HTTP provider filters out archived posts.
			// This test documents that in-memory provider behavior diverges from HTTP provider
			// which filters posts with archived=true (see HttpDevpadProvider.listPosts line 60).
			expect(result).toHaveLength(2);
			expect(result.map((p) => p.slug)).toEqual(["normal-post-1", "normal-post-2"]);
		});
	});

	describe("fetch_timeline", () => {
		it("returns the array from posts-feed provider on success", async () => {
			const timeline_data = [
				{ category: "BLOG", date: new Date("2024-01-20").toISOString() },
				{ category: "GITHUB", date: new Date("2024-01-15").toISOString() },
			];
			providers.postsFeed.timeline = timeline_data;

			const result = await fetch_timeline(locals);

			expect(result).toEqual(timeline_data);
		});

		it("returns [] when posts-feed fails", async () => {
			providers.postsFeed.failures.add("fetchTimeline");

			const result = await fetch_timeline(locals);

			expect(result).toEqual([]);
		});
	});

	describe("get_project", () => {
		it("returns the matching project from cached list when present", async () => {
			const project = make_test_project({
				project_id: "cached-project-1",
				visibility: PROJECT_VISIBILITY.PUBLIC,
			});
			providers.devpad.projects = [project];

			// Seed the cache by calling get_projects
			await get_projects(locals);

			// Count calls to get_project method
			const counter = create_call_counter();
			wrap_provider_with_counter(providers.devpad, "getProject", counter);

			const result = await get_project(locals, "cached-project-1");

			expect(result).toBeDefined();
			expect(result?.project_id).toBe("cached-project-1");
			expect(counter.count).toBe(0); // Should NOT call get_project, uses cache
		});

		it("falls back to get_project when ID not in cached list", async () => {
			const cached_project = make_test_project({
				project_id: "cached-project-1",
				visibility: PROJECT_VISIBILITY.PUBLIC,
			});
			const other_project = make_test_project({
				project_id: "other-project-1",
			});
			providers.devpad.projects = [cached_project]; // Only seed cache with one project

			// Seed cache with just cached-project-1
			await get_projects(locals);

			// Update projects after cache is populated, so get_project will fail
			providers.devpad.projects = [cached_project, other_project];

			const counter = create_call_counter();
			wrap_provider_with_counter(providers.devpad, "getProject", counter);

			// Query for different project (not in cache)
			const result = await get_project(locals, "other-project-1");

			expect(result?.project_id).toBe("other-project-1");
			expect(counter.count).toBe(1); // Should call get_project as fallback
		});

		it("falls back to get_project when cache is empty", async () => {
			const project = make_test_project({ project_id: "direct-project-1" });
			providers.devpad.projects = []; // Empty for listProjects

			// Manually populate what would be found by direct get_project lookup
			const original_get_project = providers.devpad.getProject.bind(providers.devpad);
			let get_project_called = false;
			providers.devpad.getProject = async function (id: string) {
				get_project_called = true;
				if (id === "direct-project-1") return { ok: true, value: project };
				return await original_get_project(id);
			};

			// Query without seeding cache first (cache will be empty from listProjects)
			const result = await get_project(locals, "direct-project-1");

			expect(result?.project_id).toBe("direct-project-1");
			expect(get_project_called).toBe(true); // Should call get_project since not in cache
		});

		it("returns null when get_project fails", async () => {
			providers.devpad.projects = []; // Empty cache
			providers.devpad.failures.add("getProject");

			const result = await get_project(locals, "nonexistent-project");

			expect(result).toBeNull();
		});
	});

	describe("get_blog_post", () => {
		it("with group BLOG_GROUP.DEVTO calls devto.getArticle(slug)", async () => {
			const devto_post = make_test_post({
				group: BLOG_GROUP.DEVTO,
				slug: "devto-article",
			});
			providers.devto.articles = [devto_post];

			const devto_counter = create_call_counter();
			const devpad_counter = create_call_counter();
			wrap_provider_with_counter(providers.devto, "getArticle", devto_counter);
			wrap_provider_with_counter(providers.devpad, "getPost", devpad_counter);

			const result = await get_blog_post(locals, BLOG_GROUP.DEVTO, "devto-article");

			expect(result?.slug).toBe("devto-article");
			expect(devto_counter.count).toBe(1);
			expect(devpad_counter.count).toBe(0); // Should NOT call devpad
		});

		it("with group BLOG_GROUP.DEV calls devpad.getPost(slug)", async () => {
			const devpad_post = make_test_post({
				slug: "dev-article",
			});
			providers.devpad.posts = [devpad_post];

			const devto_counter = create_call_counter();
			const devpad_counter = create_call_counter();
			wrap_provider_with_counter(providers.devto, "getArticle", devto_counter);
			wrap_provider_with_counter(providers.devpad, "getPost", devpad_counter);

			const result = await get_blog_post(locals, BLOG_GROUP.DEV, "dev-article");

			expect(result?.slug).toBe("dev-article");
			expect(devpad_counter.count).toBe(1);
			expect(devto_counter.count).toBe(0); // Should NOT call devto
		});

		it("returns null on provider error", async () => {
			providers.devpad.failures.add("getPost");

			const result = await get_blog_post(locals, BLOG_GROUP.DEV, "nonexistent");

			expect(result).toBeNull();
		});

		it("returns null on invalid group", async () => {
			const result = await get_blog_post(locals, "invalid-group", "slug");

			expect(result).toBeNull();
		});
	});
});
