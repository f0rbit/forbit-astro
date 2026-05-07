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

import ApiClient from '@devpad/api'

type BuildPost = { group: string; slug: string }
type BuildProject = { project_id: string }

const BLOG_GROUP_DEV = 'dev'

function makeClient() {
    const base_url = process.env.DEVPAD_URL ?? process.env.VITE_DEVPAD_URL ?? 'https://devpad.tools/api/v1'
    const api_key = process.env.DEVPAD_API_KEY ?? process.env.VITE_DEVPAD_API_KEY
    if (!api_key) return null
    return new ApiClient({ base_url, api_key })
}

export async function getBuildProjects(): Promise<BuildProject[]> {
    const client = makeClient()
    if (!client) return []
    try {
        const result = await client.projects.list({ private: false })
        if (!result.ok) {
            console.warn('[build-data] projects fetch failed:', result.error.message)
            return []
        }
        return result.value.filter((p: any) => p.visibility === 'PUBLIC').map((p: any) => ({ project_id: p.project_id }))
    } catch (err) {
        console.warn('[build-data] projects fetch threw:', err)
        return []
    }
}

export async function getBuildBlogPosts(): Promise<BuildPost[]> {
    const client = makeClient()
    if (!client) return []
    try {
        const result = await client.blog.posts.list({ status: 'published', limit: 100 })
        if (!result.ok) {
            console.warn('[build-data] blog posts fetch failed:', result.error.message)
            return []
        }
        return result.value.posts
            .filter((p: any) => !p.archived)
            .map((p: any) => ({ group: BLOG_GROUP_DEV, slug: p.slug }))
    } catch (err) {
        console.warn('[build-data] blog posts fetch threw:', err)
        return []
    }
}
