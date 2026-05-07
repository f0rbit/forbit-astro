/**
 * TEMPORARY STUB — Phase 1 of Cloudflare migration.
 *
 * The previous implementation used `satori + @resvg/resvg-js` (native binary,
 * incompatible with Workers). Phase 3 re-implements this via `workers-og`.
 * See .plans/cloudflare-migration.md tasks 3.1-3.6.
 *
 * Constants and `statusColor` are kept as-is so callers can still import them
 * during Phase 1; the rendering functions are stubbed and the OG endpoints
 * return 503 until Phase 3.
 */

export const OG = {
    bg: '#1a1a2e',
    bgAlt: '#242440',
    border: '#353555',
    fg: '#ffffff',
    fgMuted: '#c8c8d8',
    fgSubtle: '#a0a0b8',
    accent: '#8888b0',
    success: '#66cc88',
    error: '#cc6666',
    warning: '#ccaa44',
    info: '#6688cc',
    width: 1200,
    height: 630,
} as const

const STATUS_COLORS: Record<string, string> = {
    RELEASED: OG.success,
    LIVE: OG.success,
    FINISHED: OG.success,
    DEVELOPMENT: OG.info,
    PAUSED: OG.warning,
    STOPPED: OG.error,
    ABANDONED: OG.error,
}

export function statusColor(status: string): string {
    return STATUS_COLORS[status] ?? OG.fgSubtle
}

export async function renderOgImage(_element: unknown): Promise<Uint8Array> {
    throw new Error('OG image generation pending Phase 3 (workers-og)')
}

export function ogResponse(_buffer: Uint8Array, _maxAge?: number): Response {
    return new Response('OG image generation pending Phase 3', { status: 503 })
}
