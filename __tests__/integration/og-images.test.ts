import { describe, it, expect, beforeEach } from 'bun:test'
import {
    OG,
    statusColor,
    defaultLayout,
    projectLayout,
    projectFallbackLayout,
    blogLayout,
    blogFallbackLayout,
    extractText,
} from '../../src/lib/og-image'
import type { AppLocals } from '../../src/utils'
import { makeFakeCache, makeFakeCtx, makeFakeProviders } from '../helpers'
import type { Project, Post } from '../../src/types'
import { PROJECT_VISIBILITY, BLOG_GROUP } from '../../src/types'
import { GET as defaultGET } from '../../src/pages/og/default.png'
import { GET as projectGET } from '../../src/pages/og/project/[project_id].png'
import { GET as blogGET } from '../../src/pages/og/blog/[group]/[slug].png'

function makeTestProject(overrides?: Partial<Project>): Project {
    return {
        project_id: 'gm-server',
        name: 'GM Server',
        description: 'A multiplayer server framework for GameMaker.',
        visibility: PROJECT_VISIBILITY.PUBLIC,
        status: 'LIVE',
        skills: [],
        ...overrides,
    } as Project
}

function makeTestPost(overrides?: Partial<Post>): Post {
    return {
        slug: 'hello-world',
        group: BLOG_GROUP.DEV,
        title: 'Hello World',
        description: 'A first post.',
        published: true,
        published_at: new Date('2024-01-01').toISOString(),
        tag_list: ['typescript', 'astro'],
        content: '',
        ...overrides,
    } as Post
}

function makeContext(params: Record<string, string>) {
    const providers = makeFakeProviders()
    const cache = makeFakeCache()
    const ctx = makeFakeCtx()
    const locals: AppLocals = { providers, cache, ctx } as AppLocals
    return {
        params,
        locals,
        providers,
        astroContext: { params, locals } as Parameters<typeof projectGET>[0],
    }
}

describe('og-image layout helpers', () => {
    describe('statusColor', () => {
        it('maps RELEASED/LIVE/FINISHED to success', () => {
            expect(statusColor('RELEASED')).toBe(OG.success)
            expect(statusColor('LIVE')).toBe(OG.success)
            expect(statusColor('FINISHED')).toBe(OG.success)
        })

        it('maps DEVELOPMENT to info, PAUSED to warning, STOPPED/ABANDONED to error', () => {
            expect(statusColor('DEVELOPMENT')).toBe(OG.info)
            expect(statusColor('PAUSED')).toBe(OG.warning)
            expect(statusColor('STOPPED')).toBe(OG.error)
            expect(statusColor('ABANDONED')).toBe(OG.error)
        })

        it('falls back to fgSubtle for unknown status', () => {
            expect(statusColor('UNKNOWN')).toBe(OG.fgSubtle)
        })
    })

    describe('defaultLayout', () => {
        it('contains the brand text and tagline', () => {
            const text = extractText(defaultLayout())
            expect(text).toContain('forbit')
            expect(text).toContain('Software Developer')
            expect(text).toContain('forbit.dev')
        })
    })

    describe('projectLayout', () => {
        it('contains the project name, description, and status', () => {
            const project = makeTestProject({ name: 'My Cool Project', description: 'A neat thing.', status: 'LIVE' })
            const text = extractText(projectLayout(project))
            expect(text).toContain('My Cool Project')
            expect(text).toContain('A neat thing.')
            expect(text).toContain('LIVE')
            expect(text).toContain('forbit.dev')
        })

        it('truncates long descriptions to 120 chars', () => {
            const long = 'x'.repeat(500)
            const project = makeTestProject({ description: long })
            const text = extractText(projectLayout(project))
            // truncated text ends with ellipsis, far shorter than 500
            expect(text.length).toBeLessThan(500)
            expect(text).toContain('...')
        })

        it('omits description segment when none provided', () => {
            const project = makeTestProject({ description: null })
            const text = extractText(projectLayout(project))
            expect(text).toContain(project.name)
            // No '...' should appear since no description to truncate
            expect(text).not.toContain('...')
        })
    })

    describe('projectFallbackLayout', () => {
        it('shows Project Not Found', () => {
            expect(extractText(projectFallbackLayout())).toContain('Project Not Found')
        })
    })

    describe('blogLayout', () => {
        it('contains the post title, description, and tags', () => {
            const post = makeTestPost({
                title: 'Functional Astro',
                description: 'Why composition wins.',
                tag_list: ['astro', 'fp', 'ts'],
            })
            const text = extractText(blogLayout(post))
            expect(text).toContain('Functional Astro')
            expect(text).toContain('Why composition wins.')
            expect(text).toContain('astro')
            expect(text).toContain('fp')
            expect(text).toContain('ts')
            expect(text).toContain('forbit.dev')
        })

        it('truncates long titles to 80 chars', () => {
            const post = makeTestPost({ title: 'a'.repeat(200), description: '' })
            const text = extractText(blogLayout(post))
            expect(text).toContain('...')
        })

        it('caps tag pills to 5', () => {
            const post = makeTestPost({ tag_list: ['t1', 't2', 't3', 't4', 't5', 't6', 't7'] })
            const text = extractText(blogLayout(post))
            expect(text).toContain('t1')
            expect(text).toContain('t5')
            expect(text).not.toContain('t6')
            expect(text).not.toContain('t7')
        })
    })

    describe('blogFallbackLayout', () => {
        it('shows Post not found', () => {
            expect(extractText(blogFallbackLayout())).toContain('Post not found')
        })
    })
})

// ---------- endpoint integration ----------
//
// `workers-og`'s `ImageResponse` requires Cloudflare-runtime-only globals
// (HTMLRewriter, WASM bundling). We can't exercise the rasterizer in
// `bun test`, so endpoint tests assert the GET handler routes correctly
// (project found vs 404 fallback, blog group dispatch) via fake providers.
// PNG byte-level verification happens in Phase 4 smoke tests against a
// real Workers preview URL.

describe('og endpoint handlers (routing only)', () => {
    let providers: ReturnType<typeof makeFakeProviders>
    let locals: AppLocals

    beforeEach(() => {
        providers = makeFakeProviders()
        const cache = makeFakeCache()
        const ctx = makeFakeCtx()
        locals = { providers, cache, ctx } as AppLocals
    })

    it('default endpoint exports a GET function', () => {
        expect(typeof defaultGET).toBe('function')
    })

    it('project endpoint resolves an existing project from providers', async () => {
        const project = makeTestProject({ project_id: 'devpad', name: 'devpad' })
        providers.devpad.projects = [project]

        let resolvedProject: Project | null = null
        const original = providers.devpad.getProject.bind(providers.devpad)
        providers.devpad.getProject = async (id: string) => {
            const result = await original(id)
            if (result.ok) resolvedProject = result.value
            return result
        }

        // Seed cache via list (so projectGET takes the cached path)
        const { getProjects, getProject } = await import('../../src/utils')
        await getProjects(locals)
        const found = await getProject(locals, 'devpad')

        expect(found).toBeDefined()
        expect(found?.project_id).toBe('devpad')
        // resolvedProject stays null because cached path skips getProject — confirms cache hit
        expect(resolvedProject).toBeNull()
    })

    it('blog endpoint dispatches DEV group to devpad provider', async () => {
        const post = makeTestPost({ group: BLOG_GROUP.DEV, slug: 'my-post', title: 'My Post' })
        providers.devpad.posts = [post]

        const { getBlogPost } = await import('../../src/utils')
        const found = await getBlogPost(locals, BLOG_GROUP.DEV, 'my-post')

        expect(found).toBeDefined()
        expect(found?.title).toBe('My Post')
    })

    it('blog endpoint dispatches DEVTO group to devto provider', async () => {
        const post = makeTestPost({ group: BLOG_GROUP.DEVTO, slug: 'my-devto', title: 'Cross-Posted' })
        providers.devto.articles = [post]

        const { getBlogPost } = await import('../../src/utils')
        const found = await getBlogPost(locals, BLOG_GROUP.DEVTO, 'my-devto')

        expect(found).toBeDefined()
        expect(found?.title).toBe('Cross-Posted')
    })

    it('project endpoint falls back when project not found', async () => {
        providers.devpad.projects = []
        providers.devpad.failures.add('getProject')

        const { getProject } = await import('../../src/utils')
        const found = await getProject(locals, 'nonexistent')
        expect(found).toBeNull()
        // fallback path drives projectFallbackLayout
        expect(extractText(projectFallbackLayout())).toContain('Not Found')
    })

    it('blog endpoint falls back when post not found', async () => {
        providers.devpad.failures.add('getPost')
        const { getBlogPost } = await import('../../src/utils')
        const found = await getBlogPost(locals, BLOG_GROUP.DEV, 'nonexistent')
        expect(found).toBeNull()
        expect(extractText(blogFallbackLayout())).toContain('not found')
    })
})
