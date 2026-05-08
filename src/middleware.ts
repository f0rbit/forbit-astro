import { defineMiddleware } from 'astro:middleware'
import { HttpDevpadProvider } from './providers/devpad'
import { HttpDevtoProvider } from './providers/devto'
import { HttpPostsFeedProvider } from './providers/posts-feed'
import type { CacheCtx } from './lib/cache'

const NOOP_CTX: CacheCtx = { waitUntil: () => {} }

function resolveCache(runtime: any): Cache | undefined {
    const fromRuntime = runtime?.caches?.default
    if (fromRuntime) return fromRuntime as Cache
    if (typeof caches !== 'undefined' && (caches as any).default) {
        return (caches as any).default as Cache
    }
    return undefined
}

function resolveCtx(runtime: any): CacheCtx {
    const ctx = runtime?.ctx
    if (ctx && typeof ctx.waitUntil === 'function') {
        return { waitUntil: (p) => ctx.waitUntil(p) }
    }
    return NOOP_CTX
}

export const onRequest = defineMiddleware(async (context, next) => {
    const env = await import('astro:env/server')
    const runtime = (context.locals as any).runtime
    const locals = context.locals as any
    locals.providers = {
        devpad: new HttpDevpadProvider({ base_url: env.DEVPAD_URL, api_key: env.DEVPAD_API_KEY }),
        devto: new HttpDevtoProvider({ apiKey: env.DEVTO_KEY }),
        postsFeed: new HttpPostsFeedProvider({ url: env.POSTS_URL }),
    }
    locals.cache = resolveCache(runtime)
    locals.ctx = resolveCtx(runtime)
    return next()
})
