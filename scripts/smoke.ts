#!/usr/bin/env bun
export {}

const BASE_URL = process.env.BASE_URL ?? process.argv[2]
if (!BASE_URL) {
    console.error('Usage: BASE_URL=https://... bun run smoke')
    process.exit(2)
}

const is_local = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(BASE_URL)

type Check = { path: string; expectStatus: number; expectContentType?: string; skipLocal?: boolean }
const checks: Check[] = [
    { path: '/', expectStatus: 200, expectContentType: 'text/html' },
    { path: '/projects', expectStatus: 200, expectContentType: 'text/html' },
    { path: '/blog', expectStatus: 200, expectContentType: 'text/html' },
    { path: '/timeline', expectStatus: 200, expectContentType: 'text/html' },
    { path: '/og/default.png', expectStatus: 200, expectContentType: 'image/png' },
    { path: '/sitemap-index.xml', expectStatus: 200, expectContentType: 'application/xml', skipLocal: true },
]

const active = checks.filter((c) => !(is_local && c.skipLocal))
const skipped = checks.filter((c) => is_local && c.skipLocal)

const results = await Promise.all(
    active.map(async (c) => {
        const url = new URL(c.path, BASE_URL).toString()
        try {
            const r = await fetch(url, { redirect: 'manual' })
            const ct = r.headers.get('content-type') ?? ''
            const okStatus = r.status === c.expectStatus
            const okType = !c.expectContentType || ct.startsWith(c.expectContentType)
            return { ...c, url, status: r.status, contentType: ct, ok: okStatus && okType }
        } catch (err) {
            return { ...c, url, status: 0, contentType: 'fetch-failed', ok: false, err: String(err) }
        }
    })
)

let failed = 0
for (const r of results) {
    const tag = r.ok ? 'PASS' : 'FAIL'
    console.log(`${tag} ${r.status} ${r.contentType.split(';')[0]} ${r.url}`)
    if (!r.ok) failed++
}
for (const s of skipped) {
    console.log(`SKIP --- (local-only skip) ${new URL(s.path, BASE_URL).toString()}`)
}
if (failed) {
    console.error(`\n${failed}/${results.length} checks failed`)
    process.exit(1)
}
console.log(`\nAll ${results.length} checks passed${skipped.length ? ` (${skipped.length} skipped)` : ''}`)
