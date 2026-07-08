import type { APIRoute } from "astro";
import type { BlogGroup } from "../../../../types";
import { get_blog_post } from "../../../../utils";
import { og_response, blog_layout, blog_fallback_layout } from "../../../../lib/og-image";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
	const group = params.group as BlogGroup;
	const slug = params.slug;
	if (!slug) return new Response("Not found", { status: 404 });
	const post = await get_blog_post(locals, group, slug);
	const element = post ? blog_layout(post) : blog_fallback_layout();
	return await og_response(element, post ? 3600 : 60);
};
