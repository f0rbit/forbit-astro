import type { APIRoute } from 'astro'
import { OG, renderOgImage, ogResponse } from '../../lib/og-image'

export const prerender = false

export const GET: APIRoute = async () => {
    const element = {
        type: 'div',
        props: {
            style: {
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                backgroundColor: OG.bg,
            },
            children: [
                {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            width: '100%',
                            height: 4,
                            background: `linear-gradient(90deg, transparent, ${OG.accent}, transparent)`,
                        },
                    },
                },
                {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            flexGrow: 1,
                            margin: 32,
                            borderRadius: 12,
                            border: `1px solid ${OG.border}`,
                            alignItems: 'center',
                            justifyContent: 'center',
                        },
                        children: [
                            {
                                type: 'div',
                                props: {
                                    style: {
                                        display: 'flex',
                                        fontSize: 64,
                                        fontWeight: 700,
                                        color: OG.fg,
                                    },
                                    children: 'forbit',
                                },
                            },
                            {
                                type: 'div',
                                props: {
                                    style: {
                                        display: 'flex',
                                        fontSize: 28,
                                        color: OG.fgMuted,
                                        marginTop: 12,
                                    },
                                    children: 'Software Developer',
                                },
                            },
                        ],
                    },
                },
                {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            justifyContent: 'center',
                            paddingBottom: 24,
                            fontSize: 20,
                            color: OG.fgSubtle,
                        },
                        children: 'forbit.dev',
                    },
                },
            ],
        },
    }

    const buffer = await renderOgImage(element)
    return ogResponse(buffer)
}
