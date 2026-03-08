import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

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

const FONT_URLS = {
    regular: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf',
    bold: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf',
} as const

let fonts_promise: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700 }[]> | null = null

export async function loadFonts() {
    if (!fonts_promise) {
        fonts_promise = Promise.all([fetch(FONT_URLS.regular).then((r) => r.arrayBuffer()), fetch(FONT_URLS.bold).then((r) => r.arrayBuffer())]).then(
            ([regular, bold]) => [
                { name: 'Inter', data: regular, weight: 400 as const },
                { name: 'Inter', data: bold, weight: 700 as const },
            ]
        )
    }
    return fonts_promise
}

export async function renderOgImage(element: any): Promise<Buffer> {
    const fonts = await loadFonts()
    const svg = await satori(element, {
        width: OG.width,
        height: OG.height,
        fonts,
    })
    const resvg = new Resvg(svg)
    return resvg.render().asPng() as Buffer
}

export function ogResponse(buffer: Buffer, maxAge?: number): Response {
    return new Response(buffer, {
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': `public, max-age=${maxAge ?? 86400}`,
        },
    })
}
