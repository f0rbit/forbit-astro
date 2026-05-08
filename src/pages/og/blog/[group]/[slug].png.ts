import type { APIRoute } from 'astro'
import type { BlogGroup } from '../../../../types'
import type { AppLocals } from '../../../../utils'
import { getBlogPost } from '../../../../utils'
import { ogResponse, blogLayout, blogFallbackLayout } from '../../../../lib/og-image'

export const prerender = false

export const GET: APIRoute = async ({ params, locals }) => {
    const group = params.group as BlogGroup
    const slug = params.slug as string
    const post = await getBlogPost(locals as AppLocals, group, slug)
    const element = post ? blogLayout(post) : blogFallbackLayout()
    return await ogResponse(element, post ? 3600 : 60)
}
