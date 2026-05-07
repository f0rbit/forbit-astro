import type { APIRoute } from 'astro'

export const prerender = false

// TEMPORARY STUB — Phase 1 of Cloudflare migration. Re-implemented via
// `workers-og` in Phase 3. See .plans/cloudflare-migration.md task 1.11.
export const GET: APIRoute = async () => {
    return new Response('OG image generation pending Phase 3', { status: 503 })
}
