import ApiClient from '@devpad/api'
import { ok, err } from '@devpad/api'
import type { Result, ProviderError } from './types'
import { type Project, type Post, PROJECT_VISIBILITY, BLOG_GROUP } from '../types'

export interface DevpadProvider {
    listProjects(): Promise<Result<Project[], ProviderError>>
    getProject(id: string): Promise<Result<Project, ProviderError>>
    listPosts(): Promise<Result<Post[], ProviderError>>
    getPost(slug: string): Promise<Result<Post, ProviderError>>
}

type DevpadConfig = { base_url: string; api_key: string }

export function devpadPostToLocal(post: any): Post {
    const publish_at = post.publish_at
    const published_at = publish_at
        ? typeof publish_at === 'string'
            ? publish_at
            : new Date(publish_at).toISOString()
        : post.created_at
    return {
        slug: post.slug,
        group: BLOG_GROUP.DEV,
        title: post.title,
        description: post.description ?? post.content?.substring(0, 80) ?? '',
        published: true,
        published_at: typeof published_at === 'string' ? published_at : new Date(published_at).toISOString(),
        tag_list: post.tags ?? [],
        content: post.content ?? '',
    }
}

function toProviderError(e: { message: string; code?: string }): ProviderError {
    return { code: e.code ?? 'devpad_error', message: e.message }
}

export class HttpDevpadProvider implements DevpadProvider {
    private client: ApiClient

    constructor(config: DevpadConfig) {
        this.client = new ApiClient({ base_url: config.base_url, api_key: config.api_key })
    }

    async listProjects(): Promise<Result<Project[], ProviderError>> {
        const result = await this.client.projects.list({ private: false })
        if (!result.ok) return err(toProviderError(result.error))
        return ok(result.value.filter((p) => p.visibility == PROJECT_VISIBILITY.PUBLIC))
    }

    async getProject(id: string): Promise<Result<Project, ProviderError>> {
        const result = await this.client.projects.getByName(id)
        if (!result.ok) return err(toProviderError(result.error))
        return ok(result.value)
    }

    async listPosts(): Promise<Result<Post[], ProviderError>> {
        const result = await this.client.blog.posts.list({ status: 'published', limit: 100 })
        if (!result.ok) return err(toProviderError(result.error))
        const posts = result.value.posts.filter((p: any) => !p.archived).map(devpadPostToLocal)
        return ok(posts)
    }

    async getPost(slug: string): Promise<Result<Post, ProviderError>> {
        const result = await this.client.blog.posts.getBySlug(slug)
        if (!result.ok) return err(toProviderError(result.error))
        return ok(devpadPostToLocal(result.value))
    }
}
