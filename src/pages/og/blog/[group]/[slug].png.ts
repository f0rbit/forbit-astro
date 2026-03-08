import type { APIContext } from 'astro'
import type { BlogGroup } from '../../../../types'
import { getBlogPost } from '../../../../utils'
import { renderOgImage, ogResponse, OG } from '../../../../lib/og-image'

export const prerender = false

function truncate(str: string, max: number): string {
    return str.length > max ? str.slice(0, max).trimEnd() + '...' : str
}

function fallbackImage() {
    return {
        type: 'div',
        props: {
            style: {
                display: 'flex',
                width: '100%',
                height: '100%',
                background: OG.bg,
                alignItems: 'center',
                justifyContent: 'center',
            },
            children: {
                type: 'div',
                props: {
                    style: { display: 'flex', fontSize: 48, color: OG.fgMuted },
                    children: 'Post not found',
                },
            },
        },
    }
}

export async function GET({ params }: APIContext) {
    const { group, slug } = params
    const post = await getBlogPost(group as BlogGroup, slug as string)

    if (!post) {
        const buffer = await renderOgImage(fallbackImage())
        return ogResponse(buffer, 60)
    }

    const title = truncate(post.title ?? 'Untitled', 80)
    const description = truncate(post.description ?? '', 150)
    const tags = (post.tag_list ?? []).slice(0, 5)

    const tag_pills = tags.map((tag) => ({
        type: 'div',
        props: {
            style: {
                display: 'flex',
                background: OG.bgAlt,
                border: `1px solid ${OG.border}`,
                borderRadius: 6,
                padding: '6px 16px',
                fontSize: 22,
                color: OG.fgSubtle,
            },
            children: tag,
        },
    }))

    const element = {
        type: 'div',
        props: {
            style: {
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                background: OG.bg,
            },
            children: [
                // accent line
                {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            width: '100%',
                            height: 4,
                            background: OG.accent,
                        },
                        children: [],
                    },
                },
                // main content
                {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            padding: '48px 56px',
                            justifyContent: 'space-between',
                        },
                        children: [
                            // top section: title + description + date
                            {
                                type: 'div',
                                props: {
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                    },
                                    children: [
                                        {
                                            type: 'div',
                                            props: {
                                                style: {
                                                    display: 'flex',
                                                    fontSize: 72,
                                                    fontWeight: 700,
                                                    color: OG.fg,
                                                    lineHeight: 1.2,
                                                },
                                                children: title,
                                            },
                                        },
                                        ...(description
                                            ? [
                                                  {
                                                      type: 'div',
                                                      props: {
                                                          style: {
                                                              display: 'flex',
                                                              fontSize: 36,
                                                              color: OG.fgMuted,
                                                              marginTop: 24,
                                                              lineHeight: 1.4,
                                                          },
                                                          children: description,
                                                      },
                                                  },
                                              ]
                                            : []),
                                    ],
                                },
                            },
                            // bottom section: tags + watermark
                            {
                                type: 'div',
                                props: {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-end',
                                    },
                                    children: [
                                        // tag pills
                                        {
                                            type: 'div',
                                            props: {
                                                style: {
                                                    display: 'flex',
                                                    gap: 12,
                                                    flexWrap: 'wrap',
                                                },
                                                children: tag_pills,
                                            },
                                        },
                                        // watermark
                                        {
                                            type: 'div',
                                            props: {
                                                style: {
                                                    display: 'flex',
                                                    fontSize: 24,
                                                    color: OG.fgSubtle,
                                                },
                                                children: 'forbit.dev',
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
            ],
        },
    }

    const buffer = await renderOgImage(element)
    return ogResponse(buffer, 3600)
}
