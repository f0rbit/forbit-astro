import { ok, err } from '@devpad/api'
import type { Result, ProviderError } from './types'
import { type Post, BLOG_GROUP } from '../types'

export interface DevtoProvider {
    listMyArticles(): Promise<Result<Post[], ProviderError>>
    getArticle(slug: string): Promise<Result<Post, ProviderError>>
}

type DevtoConfig = { apiKey: string }

const HOST = 'https://dev.to/api/articles'

function devtoHeaders(api_key: string): RequestInit {
    return { headers: { 'api-key': api_key, accept: 'application/vnd.forem.api-v1+json' } }
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<Result<T, ProviderError>> {
    try {
        const response = await fetch(url, init)
        if (!response.ok) {
            return err({ code: 'fetch_failed', message: `dev.to ${url} returned ${response.status}` })
        }
        const data = (await response.json()) as T
        return ok(data)
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        return err({ code: 'network_error', message })
    }
}

export class HttpDevtoProvider implements DevtoProvider {
    constructor(private config: DevtoConfig) {}

    async listMyArticles(): Promise<Result<Post[], ProviderError>> {
        const result = await fetchJson<any[]>(`${HOST}/me`, devtoHeaders(this.config.apiKey))
        if (!result.ok) return result
        const posts: Post[] = (result.value ?? []).map((p: any) => ({ ...p, group: BLOG_GROUP.DEVTO }))
        return ok(posts)
    }

    async getArticle(slug: string): Promise<Result<Post, ProviderError>> {
        const result = await fetchJson<any>(`${HOST}/forbit/${slug}`, devtoHeaders(this.config.apiKey))
        if (!result.ok) return result
        const post = result.value
        post.content = post.body_markdown
        post.group = BLOG_GROUP.DEVTO
        return ok(post as Post)
    }
}
