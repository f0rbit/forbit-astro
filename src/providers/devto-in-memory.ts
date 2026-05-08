import { ok, err } from '@devpad/api'
import type { Result, ProviderError } from './types'
import type { Post } from '../types'
import type { DevtoProvider } from './devto'

export class InMemoryDevtoProvider implements DevtoProvider {
    articles: Post[] = []
    failures: Set<string> = new Set()

    async listMyArticles(): Promise<Result<Post[], ProviderError>> {
        if (this.failures.has('listMyArticles')) return err({ code: 'forced_failure', message: 'listMyArticles forced failure' })
        return ok(this.articles.slice())
    }

    async getArticle(slug: string): Promise<Result<Post, ProviderError>> {
        if (this.failures.has('getArticle')) return err({ code: 'forced_failure', message: 'getArticle forced failure' })
        const post = this.articles.find((p) => p.slug == slug)
        if (!post) return err({ code: 'not_found', message: `article ${slug} not found` })
        return ok(post)
    }
}
