import { test, expect } from 'bun:test'
import { ok } from '@devpad/api'
import { cachedFetch } from '../../src/lib/cache'
import { makeFakeCache, makeFakeCtx } from '../helpers'

test('cachedFetch returns the same value on a second call without invoking fetcher again', async () => {
    const cache = makeFakeCache()
    const ctx = makeFakeCtx()
    let calls = 0
    const fetcher = async () => {
        calls++
        return ok(['a'])
    }

    const first = await cachedFetch({ cache, ctx, name: 'smoke', ttlSeconds: 600, fetcher })
    const second = await cachedFetch({ cache, ctx, name: 'smoke', ttlSeconds: 600, fetcher })

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (first.ok && second.ok) {
        expect(first.value).toEqual(['a'])
        expect(second.value).toEqual(['a'])
    }
    expect(calls).toBe(1)
})
