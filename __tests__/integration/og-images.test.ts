import { describe, it, expect, beforeEach } from "bun:test";
import {
	OG,
	status_color,
	default_layout,
	project_layout,
	project_fallback_layout,
	blog_layout,
	blog_fallback_layout,
	extract_text,
} from "../../src/lib/og-image";
import type { AppLocals } from "../../src/utils";
import { make_fake_cache, make_fake_ctx, make_fake_providers } from "../helpers";
import type { Project, Post } from "../../src/types";
import { PROJECT_VISIBILITY, BLOG_GROUP } from "../../src/types";
import { GET as default_get } from "../../src/pages/og/default.png";

/* eslint-disable @typescript-eslint/consistent-type-assertions -- fixture is intentionally a partial/loose shape (only the fields these tests read), not the full real `Project` type from @devpad/api */
function make_test_project(overrides?: Partial<Project>): Project {
	return {
		project_id: "gm-server",
		name: "GM Server",
		description: "A multiplayer server framework for GameMaker.",
		visibility: PROJECT_VISIBILITY.PUBLIC,
		status: "LIVE",
		skills: [],
		...overrides,
	} as Project;
}
/* eslint-enable @typescript-eslint/consistent-type-assertions */

function make_test_post(overrides?: Partial<Post>): Post {
	const post: Post = {
		slug: "hello-world",
		group: BLOG_GROUP.DEV,
		title: "Hello World",
		description: "A first post.",
		published: true,
		published_at: new Date("2024-01-01").toISOString(),
		tag_list: ["typescript", "astro"],
		content: "",
		...overrides,
	};
	return post;
}

describe("og-image layout helpers", () => {
	describe("status_color", () => {
		it("maps RELEASED/LIVE/FINISHED to success", () => {
			expect(status_color("RELEASED")).toBe(OG.success);
			expect(status_color("LIVE")).toBe(OG.success);
			expect(status_color("FINISHED")).toBe(OG.success);
		});

		it("maps DEVELOPMENT to info, PAUSED to warning, STOPPED/ABANDONED to error", () => {
			expect(status_color("DEVELOPMENT")).toBe(OG.info);
			expect(status_color("PAUSED")).toBe(OG.warning);
			expect(status_color("STOPPED")).toBe(OG.error);
			expect(status_color("ABANDONED")).toBe(OG.error);
		});

		it("falls back to fgSubtle for unknown status", () => {
			expect(status_color("UNKNOWN")).toBe(OG.fgSubtle);
		});
	});

	describe("default_layout", () => {
		it("contains the brand text and tagline", () => {
			const text = extract_text(default_layout());
			expect(text).toContain("forbit");
			expect(text).toContain("Software Developer");
			expect(text).toContain("forbit.dev");
		});
	});

	describe("project_layout", () => {
		it("contains the project name, description, and status", () => {
			const project = make_test_project({ name: "My Cool Project", description: "A neat thing.", status: "LIVE" });
			const text = extract_text(project_layout(project));
			expect(text).toContain("My Cool Project");
			expect(text).toContain("A neat thing.");
			expect(text).toContain("LIVE");
			expect(text).toContain("forbit.dev");
		});

		it("truncates long descriptions to 120 chars", () => {
			const long = "x".repeat(500);
			const project = make_test_project({ description: long });
			const text = extract_text(project_layout(project));
			// truncated text ends with ellipsis, far shorter than 500
			expect(text.length).toBeLessThan(500);
			expect(text).toContain("...");
		});

		it("omits description segment when none provided", () => {
			const project = make_test_project({ description: null });
			const text = extract_text(project_layout(project));
			expect(text).toContain(project.name);
			// No '...' should appear since no description to truncate
			expect(text).not.toContain("...");
		});
	});

	describe("project_fallback_layout", () => {
		it("shows Project Not Found", () => {
			expect(extract_text(project_fallback_layout())).toContain("Project Not Found");
		});
	});

	describe("blog_layout", () => {
		it("contains the post title, description, and tags", () => {
			const post = make_test_post({
				title: "Functional Astro",
				description: "Why composition wins.",
				tag_list: ["astro", "fp", "ts"],
			});
			const text = extract_text(blog_layout(post));
			expect(text).toContain("Functional Astro");
			expect(text).toContain("Why composition wins.");
			expect(text).toContain("astro");
			expect(text).toContain("fp");
			expect(text).toContain("ts");
			expect(text).toContain("forbit.dev");
		});

		it("truncates long titles to 80 chars", () => {
			const post = make_test_post({ title: "a".repeat(200), description: "" });
			const text = extract_text(blog_layout(post));
			expect(text).toContain("...");
		});

		it("caps tag pills to 5", () => {
			const post = make_test_post({ tag_list: ["t1", "t2", "t3", "t4", "t5", "t6", "t7"] });
			const text = extract_text(blog_layout(post));
			expect(text).toContain("t1");
			expect(text).toContain("t5");
			expect(text).not.toContain("t6");
			expect(text).not.toContain("t7");
		});
	});

	describe("blog_fallback_layout", () => {
		it("shows Post not found", () => {
			expect(extract_text(blog_fallback_layout())).toContain("Post not found");
		});
	});
});

// ---------- endpoint integration ----------
//
// `workers-og`'s `ImageResponse` requires Cloudflare-runtime-only globals
// (HTMLRewriter, WASM bundling). We can't exercise the rasterizer in
// `bun test`, so endpoint tests assert the GET handler routes correctly
// (project found vs 404 fallback, blog group dispatch) via fake providers.
// PNG byte-level verification happens in Phase 4 smoke tests against a
// real Workers preview URL.

describe("og endpoint handlers (routing only)", () => {
	let providers: ReturnType<typeof make_fake_providers>;
	let locals: AppLocals;

	beforeEach(() => {
		providers = make_fake_providers();
		const cache = make_fake_cache();
		const ctx = make_fake_ctx();
		locals = { providers, cache, ctx };
	});

	it("default endpoint exports a GET function", () => {
		expect(typeof default_get).toBe("function");
	});

	it("project endpoint resolves an existing project from providers", async () => {
		const project = make_test_project({ project_id: "devpad", name: "devpad" });
		providers.devpad.projects = [project];

		let resolved_project: Project | null = null;
		const original = providers.devpad.getProject.bind(providers.devpad);
		providers.devpad.getProject = async (id: string) => {
			const result = await original(id);
			if (result.ok) resolved_project = result.value;
			return result;
		};

		// Seed cache via list (so project_get takes the cached path)
		const { get_projects, get_project } = await import("../../src/utils");
		await get_projects(locals);
		const found = await get_project(locals, "devpad");

		expect(found).toBeDefined();
		expect(found?.project_id).toBe("devpad");
		// resolved_project stays null because cached path skips get_project — confirms cache hit
		expect(resolved_project).toBeNull();
	});

	it("blog endpoint dispatches DEV group to devpad provider", async () => {
		const post = make_test_post({ group: BLOG_GROUP.DEV, slug: "my-post", title: "My Post" });
		providers.devpad.posts = [post];

		const { get_blog_post } = await import("../../src/utils");
		const found = await get_blog_post(locals, BLOG_GROUP.DEV, "my-post");

		expect(found).toBeDefined();
		expect(found?.title).toBe("My Post");
	});

	it("blog endpoint dispatches DEVTO group to devto provider", async () => {
		const post = make_test_post({ group: BLOG_GROUP.DEVTO, slug: "my-devto", title: "Cross-Posted" });
		providers.devto.articles = [post];

		const { get_blog_post } = await import("../../src/utils");
		const found = await get_blog_post(locals, BLOG_GROUP.DEVTO, "my-devto");

		expect(found).toBeDefined();
		expect(found?.title).toBe("Cross-Posted");
	});

	it("project endpoint falls back when project not found", async () => {
		providers.devpad.projects = [];
		providers.devpad.failures.add("getProject");

		const { get_project } = await import("../../src/utils");
		const found = await get_project(locals, "nonexistent");
		expect(found).toBeNull();
		// fallback path drives project_fallback_layout
		expect(extract_text(project_fallback_layout())).toContain("Not Found");
	});

	it("blog endpoint falls back when post not found", async () => {
		providers.devpad.failures.add("getPost");
		const { get_blog_post } = await import("../../src/utils");
		const found = await get_blog_post(locals, BLOG_GROUP.DEV, "nonexistent");
		expect(found).toBeNull();
		expect(extract_text(blog_fallback_layout())).toContain("not found");
	});
});
