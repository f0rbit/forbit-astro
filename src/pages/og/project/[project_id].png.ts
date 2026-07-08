import type { APIRoute } from "astro";
import { og_response, project_layout, project_fallback_layout } from "../../../lib/og-image";
import { get_project } from "../../../utils";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
	const project_id = params.project_id;
	if (!project_id) return new Response("Not found", { status: 404 });
	const project = await get_project(locals, project_id);
	const element = project ? project_layout(project) : project_fallback_layout();
	return await og_response(element, project ? 3600 : 60);
};
