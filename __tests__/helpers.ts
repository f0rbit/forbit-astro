import type { CacheCtx } from '../src/lib/cache'
import { InMemoryDevpadProvider } from '../src/providers/devpad-in-memory'
import { InMemoryDevtoProvider } from '../src/providers/devto-in-memory'
import { InMemoryPostsFeedProvider } from '../src/providers/posts-feed-in-memory'
import type { AppProviders } from '../src/providers/types'

type CachedEntry = { body: string; headers: Headers }

export function makeFakeCache(): Cache {
    const store = new Map<string, CachedEntry>()
    const keyOf = (request: RequestInfo | URL): string => {
        if (typeof request === 'string') return request
        if (request instanceof URL) return request.toString()
        return request.url
    }
    return {
        async match(request: RequestInfo | URL): Promise<Response | undefined> {
            const entry = store.get(keyOf(request))
            if (!entry) return undefined
            return new Response(entry.body, { headers: new Headers(entry.headers) })
        },
        async put(request: RequestInfo | URL, response: Response): Promise<void> {
            const body = await response.text()
            store.set(keyOf(request), { body, headers: new Headers(response.headers) })
        },
        async delete(request: RequestInfo | URL): Promise<boolean> {
            return store.delete(keyOf(request))
        },
    } as unknown as Cache
}

export function makeFakeCtx(): CacheCtx & { promises: Promise<unknown>[] } {
    const promises: Promise<unknown>[] = []
    return {
        promises,
        waitUntil(promise) {
            promises.push(promise.catch(() => {}))
        },
    }
}

export function makeFakeProviders(): AppProviders & {
    devpad: InMemoryDevpadProvider
    devto: InMemoryDevtoProvider
    postsFeed: InMemoryPostsFeedProvider
} {
    return {
        devpad: new InMemoryDevpadProvider(),
        devto: new InMemoryDevtoProvider(),
        postsFeed: new InMemoryPostsFeedProvider(),
    }
}
