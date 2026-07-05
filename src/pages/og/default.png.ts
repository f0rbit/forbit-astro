import type { APIRoute } from "astro";
import { default_layout, og_response } from "../../lib/og-image";

export const prerender = false;

export const GET: APIRoute = async () => {
	return await og_response(default_layout());
};
