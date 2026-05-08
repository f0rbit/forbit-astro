import type { APIRoute } from 'astro'
import { ogResponse, projectLayout, projectFallbackLayout } from '../../../lib/og-image'
import { getProject } from '../../../utils'
import type { AppLocals } from '../../../utils'

export const prerender = false

export const GET: APIRoute = async ({ params, locals }) => {
    const project_id = params.project_id!
    const project = await getProject(locals as AppLocals, project_id)
    const element = project ? projectLayout(project) : projectFallbackLayout()
    return await ogResponse(element, project ? 3600 : 60)
}
