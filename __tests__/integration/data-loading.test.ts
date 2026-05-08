import { describe, it, expect, beforeEach } from 'bun:test'
import type { AppLocals } from '../../src/utils'
import {
    getProjects,
    getBlogPosts,
    fetchTimeline,
    getProject,
    getBlogPost,
} from '../../src/utils'
import { makeFakeCache, makeFakeCtx, makeFakeProviders } from '../helpers'
import type { Project, Post } from '../../src/types'
import { PROJECT_VISIBILITY, BLOG_GROUP } from '../../src/types'

function createCallCounter(): { count: number; increment(): void } {
    return {
        count: 0,
        increment() {
            this.count++
        },
    }
}

function wrapProviderWithCounter(
    provider: any,
    methodName: string,
    counter: { count: number; increment(): void }
) {
    const original = provider[methodName].bind(provider)
    provider[methodName] = async function (...args: any[]) {
        counter.increment()
        return await original(...args)
    }
    return provider
}

function makeTestProject(overrides?: Partial<Project>): Project {
    return {
        project_id: 'test-project-1',
        title: 'Test Project',
        description: 'A test project',
        content: 'Test content',
        visibility: PROJECT_VISIBILITY.PUBLIC,
        status: 'LIVE',
        skills: [],
        ...overrides,
    } as Project
}

function makeTestPost(overrides?: Partial<Post>): Post {
    return {
        slug: 'test-post',
        group: BLOG_GROUP.DEV,
        title: 'Test Post',
        description: 'A test post',
        published: true,
        published_at: new Date('2024-01-01').toISOString(),
        tag_list: [],
        content: 'Test content',
        ...overrides,
    } as Post
}

describe('Data Loading Integration', () => {
    let locals: AppLocals
    let providers: ReturnType<typeof makeFakeProviders>

    beforeEach(() => {
        providers = makeFakeProviders()
        const cache = makeFakeCache()
        const ctx = makeFakeCtx()
        locals = { providers, cache, ctx } as AppLocals
    })

    describe('getProjects', () => {
        it('returns all projects from the provider (in-memory does not filter by visibility)', async () => {
            const publicProject = makeTestProject({ visibility: PROJECT_VISIBILITY.PUBLIC })
            const privateProject = makeTestProject({
                project_id: 'private-1',
                visibility: PROJECT_VISIBILITY.PRIVATE,
            })
            const hiddenProject = makeTestProject({
                project_id: 'hidden-1',
                visibility: PROJECT_VISIBILITY.HIDDEN,
            })
            providers.devpad.projects = [publicProject, privateProject, hiddenProject]

            const result = await getProjects(locals)

            // In-memory provider returns all projects; HTTP provider filters to PUBLIC only.
            // This test documents that in-memory provider behavior diverges from HTTP provider.
            expect(result).toHaveLength(3)
            expect(result.map((p) => p.project_id)).toEqual([
                'test-project-1',
                'private-1',
                'hidden-1',
            ])
        })

        it('returns [] when devpad provider returns err', async () => {
            const project = makeTestProject()
            providers.devpad.projects = [project]
            providers.devpad.failures.add('listProjects')

            const result = await getProjects(locals)

            expect(result).toEqual([])
        })

        it('caches the result — second call does not re-invoke the provider', async () => {
            const project = makeTestProject()
            providers.devpad.projects = [project]

            const counter = createCallCounter()
            wrapProviderWithCounter(providers.devpad, 'listProjects', counter)

            const result1 = await getProjects(locals)
            expect(counter.count).toBe(1)
            expect(result1).toHaveLength(1)

            // Second call should use cache
            const result2 = await getProjects(locals)
            expect(counter.count).toBe(1) // Still 1, not incremented
            expect(result2).toHaveLength(1)
        })
    })

    describe('getBlogPosts', () => {
        it('merges devto + devpad posts, sorted by published_at descending', async () => {
            const devtoPosts = [
                makeTestPost({
                    group: BLOG_GROUP.DEVTO,
                    slug: 'devto-post-1',
                    published_at: new Date('2024-01-15').toISOString(),
                }),
                makeTestPost({
                    group: BLOG_GROUP.DEVTO,
                    slug: 'devto-post-2',
                    published_at: new Date('2024-01-10').toISOString(),
                }),
            ]
            const devpadPosts = [
                makeTestPost({
                    slug: 'devpad-post-1',
                    published_at: new Date('2024-01-20').toISOString(),
                }),
            ]
            providers.devto.articles = devtoPosts
            providers.devpad.posts = devpadPosts

            const result = await getBlogPosts(locals)

            expect(result).toHaveLength(3)
            expect(result[0].published_at).toBe(new Date('2024-01-20').toISOString()) // Most recent first
            expect(result[1].published_at).toBe(new Date('2024-01-15').toISOString())
            expect(result[2].published_at).toBe(new Date('2024-01-10').toISOString())
        })

        it('returns devpad-only when devto fails', async () => {
            const devpadPost = makeTestPost({ slug: 'devpad-post-1' })
            providers.devpad.posts = [devpadPost]
            providers.devto.failures.add('listMyArticles')

            const result = await getBlogPosts(locals)

            expect(result).toHaveLength(1)
            expect(result[0].slug).toBe('devpad-post-1')
        })

        it('returns devto-only when devpad fails', async () => {
            const devtoPost = makeTestPost({
                group: BLOG_GROUP.DEVTO,
                slug: 'devto-post-1',
            })
            providers.devto.articles = [devtoPost]
            providers.devpad.failures.add('listPosts')

            const result = await getBlogPosts(locals)

            expect(result).toHaveLength(1)
            expect(result[0].slug).toBe('devto-post-1')
        })

        it('returns [] when both fail', async () => {
            providers.devto.failures.add('listMyArticles')
            providers.devpad.failures.add('listPosts')

            const result = await getBlogPosts(locals)

            expect(result).toEqual([])
        })

        it('returns all devpad posts (in-memory does not filter archived unlike HTTP provider)', async () => {
            const normalPost1 = makeTestPost({ slug: 'normal-post-1' })
            const normalPost2 = makeTestPost({ slug: 'normal-post-2' })
            providers.devpad.posts = [normalPost1, normalPost2]

            const result = await getBlogPosts(locals)

            // In-memory provider returns all posts; HTTP provider filters out archived posts.
            // This test documents that in-memory provider behavior diverges from HTTP provider
            // which filters posts with archived=true (see HttpDevpadProvider.listPosts line 60).
            expect(result).toHaveLength(2)
            expect(result.map((p) => p.slug)).toEqual(['normal-post-1', 'normal-post-2'])
        })
    })

    describe('fetchTimeline', () => {
        it('returns the array from posts-feed provider on success', async () => {
            const timelineData = [
                { category: 'BLOG', date: new Date('2024-01-20').toISOString() },
                { category: 'GITHUB', date: new Date('2024-01-15').toISOString() },
            ]
            providers.postsFeed.timeline = timelineData

            const result = await fetchTimeline(locals)

            expect(result).toEqual(timelineData)
        })

        it('returns [] when posts-feed fails', async () => {
            providers.postsFeed.failures.add('fetchTimeline')

            const result = await fetchTimeline(locals)

            expect(result).toEqual([])
        })
    })

    describe('getProject', () => {
        it('returns the matching project from cached list when present', async () => {
            const project = makeTestProject({
                project_id: 'cached-project-1',
                visibility: PROJECT_VISIBILITY.PUBLIC,
            })
            providers.devpad.projects = [project]

            // Seed the cache by calling getProjects
            await getProjects(locals)

            // Count calls to getProject method
            const counter = createCallCounter()
            wrapProviderWithCounter(providers.devpad, 'getProject', counter)

            const result = await getProject(locals, 'cached-project-1')

            expect(result).toBeDefined()
            expect(result?.project_id).toBe('cached-project-1')
            expect(counter.count).toBe(0) // Should NOT call getProject, uses cache
        })

        it('falls back to getProject when ID not in cached list', async () => {
            const cachedProject = makeTestProject({
                project_id: 'cached-project-1',
                visibility: PROJECT_VISIBILITY.PUBLIC,
            })
            const otherProject = makeTestProject({
                project_id: 'other-project-1',
            })
            providers.devpad.projects = [cachedProject] // Only seed cache with one project

            // Seed cache with just cached-project-1
            await getProjects(locals)

            // Update projects after cache is populated, so getProject will fail
            providers.devpad.projects = [cachedProject, otherProject]

            const counter = createCallCounter()
            wrapProviderWithCounter(providers.devpad, 'getProject', counter)

            // Query for different project (not in cache)
            const result = await getProject(locals, 'other-project-1')

            expect(result?.project_id).toBe('other-project-1')
            expect(counter.count).toBe(1) // Should call getProject as fallback
        })

        it('falls back to getProject when cache is empty', async () => {
            const project = makeTestProject({ project_id: 'direct-project-1' })
            providers.devpad.projects = [] // Empty for listProjects

            // Manually populate what would be found by direct getProject lookup
            const originalGetProject = providers.devpad.getProject.bind(providers.devpad)
            let getProjectCalled = false
            providers.devpad.getProject = async function (id: string) {
                getProjectCalled = true
                if (id === 'direct-project-1') return { ok: true, value: project }
                return await originalGetProject(id)
            }

            // Query without seeding cache first (cache will be empty from listProjects)
            const result = await getProject(locals, 'direct-project-1')

            expect(result?.project_id).toBe('direct-project-1')
            expect(getProjectCalled).toBe(true) // Should call getProject since not in cache
        })

        it('returns null when getProject fails', async () => {
            providers.devpad.projects = [] // Empty cache
            providers.devpad.failures.add('getProject')

            const result = await getProject(locals, 'nonexistent-project')

            expect(result).toBeNull()
        })
    })

    describe('getBlogPost', () => {
        it('with group BLOG_GROUP.DEVTO calls devto.getArticle(slug)', async () => {
            const devtoPost = makeTestPost({
                group: BLOG_GROUP.DEVTO,
                slug: 'devto-article',
            })
            providers.devto.articles = [devtoPost]

            const devtoCounter = createCallCounter()
            const devpadCounter = createCallCounter()
            wrapProviderWithCounter(providers.devto, 'getArticle', devtoCounter)
            wrapProviderWithCounter(providers.devpad, 'getPost', devpadCounter)

            const result = await getBlogPost(locals, BLOG_GROUP.DEVTO, 'devto-article')

            expect(result?.slug).toBe('devto-article')
            expect(devtoCounter.count).toBe(1)
            expect(devpadCounter.count).toBe(0) // Should NOT call devpad
        })

        it('with group BLOG_GROUP.DEV calls devpad.getPost(slug)', async () => {
            const devpadPost = makeTestPost({
                slug: 'dev-article',
            })
            providers.devpad.posts = [devpadPost]

            const devtoCounter = createCallCounter()
            const devpadCounter = createCallCounter()
            wrapProviderWithCounter(providers.devto, 'getArticle', devtoCounter)
            wrapProviderWithCounter(providers.devpad, 'getPost', devpadCounter)

            const result = await getBlogPost(locals, BLOG_GROUP.DEV, 'dev-article')

            expect(result?.slug).toBe('dev-article')
            expect(devpadCounter.count).toBe(1)
            expect(devtoCounter.count).toBe(0) // Should NOT call devto
        })

        it('returns null on provider error', async () => {
            providers.devpad.failures.add('getPost')

            const result = await getBlogPost(locals, BLOG_GROUP.DEV, 'nonexistent')

            expect(result).toBeNull()
        })

        it('returns null on invalid group', async () => {
            const result = await getBlogPost(locals, 'invalid-group' as any, 'slug')

            expect(result).toBeNull()
        })
    })
})
