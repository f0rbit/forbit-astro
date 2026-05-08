import { ok } from '@devpad/api'
import type { Result, ProviderError } from '../providers/types'

export type CacheCtx = { waitUntil(promise: Promise<unknown>): void }

export type CachedFetchOpts<T> = {
    cache: Cache
    ctx: CacheCtx
    name: string
    ttlSeconds: number
    fetcher: () => Promise<Result<T, ProviderError>>
}

function buildKey(name: string): Request {
    const sha = (import.meta.env.BUILD_SHA as string | undefined) ?? 'dev'
    return new Request(`https://cache.local/${sha}/${name}`)
}

async function refreshAndStore<T>(opts: CachedFetchOpts<T>, key: Request): Promise<Result<T, ProviderError>> {
    const result = await opts.fetcher()
    if (!result.ok) return result
    const response = new Response(JSON.stringify(result.value), {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${opts.ttlSeconds * 2}`,
            'X-Cached-At': Date.now().toString(),
        },
    })
    await opts.cache.put(key, response)
    return result
}

async function safeRefresh<T>(opts: CachedFetchOpts<T>, key: Request): Promise<void> {
    try {
        const result = await refreshAndStore(opts, key)
        if (!result.ok) {
            console.warn(`[cache] background refresh of ${opts.name} failed:`, result.error.message)
        }
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        console.warn(`[cache] background refresh of ${opts.name} threw:`, message)
    }
}

export async function cachedFetch<T>(opts: CachedFetchOpts<T>): Promise<Result<T, ProviderError>> {
    const key = buildKey(opts.name)
    const hit = await opts.cache.match(key)

    if (hit) {
        const cachedAt = Number(hit.headers.get('X-Cached-At') ?? 0)
        const ageSec = (Date.now() - cachedAt) / 1000
        const data = (await hit.json()) as T
        if (ageSec <= opts.ttlSeconds) {
            return ok(data)
        }
        opts.ctx.waitUntil(safeRefresh(opts, key))
        return ok(data)
    }

    return await refreshAndStore(opts, key)
}
