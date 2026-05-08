import type { APIRoute } from 'astro'
import { defaultLayout, ogResponse } from '../../lib/og-image'

export const prerender = false

export const GET: APIRoute = async () => {
    return await ogResponse(defaultLayout())
}
