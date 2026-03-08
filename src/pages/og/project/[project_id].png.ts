import type { APIRoute } from 'astro'
import { OG, renderOgImage, ogResponse, statusColor } from '../../../lib/og-image'
import { getProject } from '../../../utils'
import { TECH_MAP } from '../../../assets/technology'

export const prerender = false

function truncate(text: string, max: number): string {
    if (text.length <= max) return text
    return text.slice(0, max).trimEnd() + '...'
}

function fallbackImage() {
    return {
        type: 'div',
        props: {
            style: {
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                backgroundColor: OG.bg,
                alignItems: 'center',
                justifyContent: 'center',
            },
            children: {
                type: 'div',
                props: {
                    style: { display: 'flex', fontSize: 48, fontWeight: 700, color: OG.fgMuted },
                    children: 'Project Not Found',
                },
            },
        },
    }
}

function projectImage(project: { name: string; description: string | null; status: string; project_id: string }) {
    const techs = TECH_MAP[project.project_id] ?? []
    const description = project.description ? truncate(project.description, 120) : ''
    const color = statusColor(project.status)

    return {
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
                // accent line
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
                // main content
                {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            flexGrow: 1,
                            padding: '48px 56px',
                            justifyContent: 'center',
                        },
                        children: [
                            // project name
                            {
                                type: 'div',
                                props: {
                                    style: {
                                        display: 'flex',
                                        fontSize: 52,
                                        fontWeight: 700,
                                        color: OG.fg,
                                    },
                                    children: project.name,
                                },
                            },
                            // description
                            ...(description
                                ? [
                                      {
                                          type: 'div',
                                          props: {
                                              style: {
                                                  display: 'flex',
                                                  fontSize: 24,
                                                  color: OG.fgMuted,
                                                  marginTop: 16,
                                              },
                                              children: description,
                                          },
                                      },
                                  ]
                                : []),
                            // status badge
                            {
                                type: 'div',
                                props: {
                                    style: {
                                        display: 'flex',
                                        marginTop: 24,
                                    },
                                    children: {
                                        type: 'div',
                                        props: {
                                            style: {
                                                display: 'flex',
                                                border: `2px solid ${color}`,
                                                color: color,
                                                borderRadius: 6,
                                                padding: '4px 12px',
                                                fontSize: 18,
                                            },
                                            children: project.status,
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
                // bottom bar: tech pills + watermark
                {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            padding: '0 56px 32px',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        },
                        children: [
                            // tech pills
                            {
                                type: 'div',
                                props: {
                                    style: {
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 8,
                                    },
                                    children: techs.map((tech) => ({
                                        type: 'div',
                                        props: {
                                            style: {
                                                display: 'flex',
                                                backgroundColor: OG.border,
                                                color: OG.fgSubtle,
                                                fontSize: 16,
                                                padding: '4px 12px',
                                                borderRadius: 6,
                                            },
                                            children: tech,
                                        },
                                    })),
                                },
                            },
                            // watermark
                            {
                                type: 'div',
                                props: {
                                    style: {
                                        display: 'flex',
                                        fontSize: 18,
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
    }
}

export const GET: APIRoute = async ({ params }) => {
    const project_id = params.project_id!
    const project = await getProject(project_id)

    const element = project ? projectImage(project) : fallbackImage()
    const buffer = await renderOgImage(element)
    return ogResponse(buffer, 3600)
}
