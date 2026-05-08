import type { Duration } from 'moment'
import { type Project, type BlogGroup, BLOG_GROUP, type Post } from './types'
import { cachedFetch, type CacheCtx } from './lib/cache'
import type { AppProviders, ProviderError, Result } from './providers/types'

const DEFAULT_TTL_SECONDS = 10 * 60 // 10 minutes

export type AppLocals = {
    providers: AppProviders
    cache: Cache | undefined
    ctx: CacheCtx
}

function resultToArray<T>(result: Result<T[], ProviderError>, name: string): T[] {
    if (result.ok) return result.value
    console.error(`${name}: fetch error`, result.error.message)
    return []
}

function resultToValue<T>(result: Result<T, ProviderError>, name: string): T | null {
    if (result.ok) return result.value
    console.error(`${name}: fetch error`, result.error.message)
    return null
}

async function getCached<T>(
    locals: AppLocals,
    name: string,
    fetcher: () => Promise<Result<T, ProviderError>>
): Promise<Result<T, ProviderError>> {
    if (!locals.cache) return await fetcher()
    return await cachedFetch({
        cache: locals.cache,
        ctx: locals.ctx,
        name,
        ttlSeconds: DEFAULT_TTL_SECONDS,
        fetcher,
    })
}

export async function getProjects(locals: AppLocals): Promise<Project[]> {
    const result = await getCached(locals, 'projects', () => locals.providers.devpad.listProjects())
    return resultToArray(result, 'PROJECTS')
}

export async function getBlogPosts(locals: AppLocals): Promise<Post[]> {
    const result = await getCached(locals, 'blog', async () => {
        const [devto_result, devpad_result] = await Promise.all([
            locals.providers.devto.listMyArticles(),
            locals.providers.devpad.listPosts(),
        ])
        const devto_posts = devto_result.ok ? devto_result.value : []
        const devpad_posts = devpad_result.ok ? devpad_result.value : []
        if (!devto_result.ok) console.error('BLOG: devto fetch error', devto_result.error.message)
        if (!devpad_result.ok) console.error('BLOG: devpad fetch error', devpad_result.error.message)
        const posts = [...devto_posts, ...devpad_posts]
        posts.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
        return { ok: true, value: posts }
    })
    return resultToArray(result, 'BLOG')
}

export async function fetchTimeline(locals: AppLocals): Promise<unknown[]> {
    const result = await getCached(locals, 'timeline', () => locals.providers.postsFeed.fetchTimeline())
    return resultToArray(result, 'TIMELINE')
}

export async function getProject(locals: AppLocals, project_id: string): Promise<Project | null> {
    const cached = await getCached(locals, 'projects', () => locals.providers.devpad.listProjects())
    if (cached.ok) {
        const found = cached.value.find((p) => p.project_id == project_id)
        if (found) return found
    }
    const direct = await locals.providers.devpad.getProject(project_id)
    return resultToValue(direct, 'FETCH_PROJECT')
}

export async function getBlogPost(locals: AppLocals, group: BlogGroup, slug: string): Promise<Post | null> {
    if (group == BLOG_GROUP.DEVTO) {
        const result = await locals.providers.devto.getArticle(slug)
        return resultToValue(result, 'BLOG_POST_DEVTO')
    }
    if (group == BLOG_GROUP.DEV) {
        const result = await locals.providers.devpad.getPost(slug)
        return resultToValue(result, 'BLOG_POST_DEV')
    }
    console.error(`Invalid blog group ${group}`)
    return null
}

/** @todo fix typings */
export function getTimeline(activities: any, group_commits: any) {
    const DAY_IN_MS = 24 * 60 * 60 * 1000
    const event_timeline: any = []
    const timeline = activities.toReversed()

    let commits: any = []
    let last_commit_date = 0

    const pushCommits = () => {
        if (commits.length > 0) {
            event_timeline.push({
                category: 'COMMITS',
                commits: commits.slice().reverse(),
                date: commits[commits.length - 1].date,
                title: `${commits.length} commits to f0rbit/${commits[0].project}`,
                project: commits[0].project,
            })
            commits = []
        }
    }

    for (const item of timeline) {
        if (item.category == 'BLOG') continue
        if (item.category === 'GITHUB' && group_commits) {
            const item_date = item.date

            if (commits.length === 0 || (item.project === commits[0].project && item_date - last_commit_date <= 3 * DAY_IN_MS)) {
                commits.push(item)
                last_commit_date = item_date
            } else {
                pushCommits()
                commits = [item]
                last_commit_date = item_date
            }
        } else {
            pushCommits()
            event_timeline.push(item)
        }
    }

    pushCommits()

    return event_timeline.toReversed()
}

export function formatDuration(duration: Duration) {
    if (duration.asMonths() >= 16) {
        return `${Math.round(duration.asYears())} years`
    } else if (duration.asMonths() >= 2) {
        return `${Math.ceil(duration.asMonths())} months`
    } else if (duration.asDays() >= 3) {
        return `${Math.ceil(duration.asDays())} days`
    } else {
        return `${Math.ceil(duration.asHours())} hours`
    }
}
