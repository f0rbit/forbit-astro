import { ok, err } from '@devpad/api'
import type { Result, ProviderError } from './types'
import type { PostsFeedProvider } from './posts-feed'

export class InMemoryPostsFeedProvider implements PostsFeedProvider {
    timeline: unknown[] = []
    failures: Set<string> = new Set()

    async fetchTimeline(): Promise<Result<unknown[], ProviderError>> {
        if (this.failures.has('fetchTimeline')) return err({ code: 'forced_failure', message: 'fetchTimeline forced failure' })
        return ok(this.timeline.slice())
    }
}
