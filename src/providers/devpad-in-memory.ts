import { ok, err } from '@devpad/api'
import type { Result, ProviderError } from './types'
import type { Project, Post } from '../types'
import type { DevpadProvider } from './devpad'

export class InMemoryDevpadProvider implements DevpadProvider {
    projects: Project[] = []
    posts: Post[] = []
    failures: Set<string> = new Set()

    async listProjects(): Promise<Result<Project[], ProviderError>> {
        if (this.failures.has('listProjects')) return err({ code: 'forced_failure', message: 'listProjects forced failure' })
        return ok(this.projects.slice())
    }

    async getProject(id: string): Promise<Result<Project, ProviderError>> {
        if (this.failures.has('getProject')) return err({ code: 'forced_failure', message: 'getProject forced failure' })
        const project = this.projects.find((p) => p.project_id == id)
        if (!project) return err({ code: 'not_found', message: `project ${id} not found` })
        return ok(project)
    }

    async listPosts(): Promise<Result<Post[], ProviderError>> {
        if (this.failures.has('listPosts')) return err({ code: 'forced_failure', message: 'listPosts forced failure' })
        return ok(this.posts.slice())
    }

    async getPost(slug: string): Promise<Result<Post, ProviderError>> {
        if (this.failures.has('getPost')) return err({ code: 'forced_failure', message: 'getPost forced failure' })
        const post = this.posts.find((p) => p.slug == slug)
        if (!post) return err({ code: 'not_found', message: `post ${slug} not found` })
        return ok(post)
    }
}
