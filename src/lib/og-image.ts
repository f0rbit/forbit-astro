import { ImageResponse } from "workers-og";
import type { Project, Post, BlogGroup } from "../types";
import { TECH_MAP } from "../assets/technology";

// Palette derived from src/styles/terminal.css's oklch :root tokens (converted to hex).
// warning/error have no site-token equivalent — OG-only in-hue approximations.
export const OG = {
	bg: "#101321", // --bg
	bgAlt: "#1c2130", // --bg-alt
	border: "#373f55", // --border
	fg: "#f1f5ff", // --fg
	fgMuted: "#a1a4af", // --fg-muted
	fgSubtle: "#777a84", // --fg-subtle
	accent: "#6ea0e8", // --accent / --term-link (blue)
	success: "#76be86", // --term-status-finished (green)
	info: "#6ea0e8", // --term-status-dev / --term-link (blue)
	warning: "#e29e47", // OG-only approximation, no site token
	error: "#ed5350", // OG-only approximation, no site token
	purple: "#ac91dc", // --term-keyword, available as an accent
	width: 1200,
	height: 630,
} as const;

const STATUS_COLORS: Record<string, string> = {
	RELEASED: OG.success,
	LIVE: OG.success,
	FINISHED: OG.success,
	DEVELOPMENT: OG.info,
	PAUSED: OG.warning,
	STOPPED: OG.error,
	ABANDONED: OG.error,
};

export function status_color(status: string): string {
	return STATUS_COLORS[status] ?? OG.fgSubtle;
}

export type OgElement = {
	type: string;
	props: {
		style?: Record<string, unknown>;
		children?: OgElement | OgElement[] | string;
		[key: string]: unknown;
	};
};

const FONT_URLS = {
	regular: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf",
	bold: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf",
} as const;

type LoadedFont = { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" };

let fonts_promise: Promise<LoadedFont[]> | null = null;

export async function load_fonts(): Promise<LoadedFont[]> {
	if (!fonts_promise) {
		fonts_promise = Promise.all([
			fetch(FONT_URLS.regular).then((r) => r.arrayBuffer()),
			fetch(FONT_URLS.bold).then((r) => r.arrayBuffer()),
		]).then(([regular, bold]) => [
			{ name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
			{ name: "Inter", data: bold, weight: 700 as const, style: "normal" as const },
		]);
	}
	return fonts_promise;
}

export async function og_response(element: OgElement, max_age = 86400): Promise<Response> {
	const fonts = await load_fonts();
	// oxlint-disable-next-line typescript/no-explicit-any -- workers-og's ImageResponse element type doesn't line up with our OgElement, deferred (lint-adoption scope only)
	return new ImageResponse(element as any, {
		width: OG.width,
		height: OG.height,
		fonts,
		headers: {
			"Cache-Control": `public, max-age=${max_age.toString()}`,
		},
	});
}

function truncate(text: string, max: number): string {
	if (text.length <= max) return text;
	return text.slice(0, max).trimEnd() + "...";
}

// ---------- layouts ----------

export function default_layout(): OgElement {
	return {
		type: "div",
		props: {
			style: {
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: "100%",
				backgroundColor: OG.bg,
			},
			children: [
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							width: "100%",
							height: 4,
							background: `linear-gradient(90deg, transparent, ${OG.accent}, transparent)`,
						},
					},
				},
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							flexDirection: "column",
							flexGrow: 1,
							margin: 32,
							borderRadius: 12,
							border: `1px solid ${OG.border}`,
							alignItems: "center",
							justifyContent: "center",
						},
						children: [
							{
								type: "div",
								props: {
									style: { display: "flex", fontSize: 64, fontWeight: 700, color: OG.fg },
									children: "forbit",
								},
							},
							{
								type: "div",
								props: {
									style: { display: "flex", fontSize: 28, color: OG.fgMuted, marginTop: 12 },
									children: "Software Developer",
								},
							},
						],
					},
				},
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							justifyContent: "center",
							paddingBottom: 24,
							fontSize: 20,
							color: OG.fgSubtle,
						},
						children: "forbit.dev",
					},
				},
			],
		},
	};
}

export function project_fallback_layout(): OgElement {
	return {
		type: "div",
		props: {
			style: {
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: "100%",
				backgroundColor: OG.bg,
				alignItems: "center",
				justifyContent: "center",
			},
			children: {
				type: "div",
				props: {
					style: { display: "flex", fontSize: 48, fontWeight: 700, color: OG.fgMuted },
					children: "Project Not Found",
				},
			},
		},
	};
}

export function project_layout(project: Pick<Project, "name" | "description" | "status" | "project_id">): OgElement {
	const techs = TECH_MAP[project.project_id] ?? [];
	const description = project.description ? truncate(project.description, 120) : "";
	const color = status_color(project.status);

	const tech_pills: OgElement[] = techs.map((tech) => ({
		type: "div",
		props: {
			style: {
				display: "flex",
				backgroundColor: OG.border,
				color: OG.fgSubtle,
				fontSize: 16,
				padding: "4px 12px",
				borderRadius: 6,
			},
			children: tech,
		},
	}));

	const description_nodes: OgElement[] = description
		? [
				{
					type: "div",
					props: {
						style: { display: "flex", fontSize: 24, color: OG.fgMuted, marginTop: 16 },
						children: description,
					},
				},
			]
		: [];

	return {
		type: "div",
		props: {
			style: {
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: "100%",
				backgroundColor: OG.bg,
			},
			children: [
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							width: "100%",
							height: 4,
							background: `linear-gradient(90deg, transparent, ${OG.accent}, transparent)`,
						},
					},
				},
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							flexDirection: "column",
							flexGrow: 1,
							padding: "48px 56px",
							justifyContent: "center",
						},
						children: [
							{
								type: "div",
								props: {
									style: { display: "flex", fontSize: 52, fontWeight: 700, color: OG.fg },
									children: project.name,
								},
							},
							...description_nodes,
							{
								type: "div",
								props: {
									style: { display: "flex", marginTop: 24 },
									children: {
										type: "div",
										props: {
											style: {
												display: "flex",
												border: `2px solid ${color}`,
												color,
												borderRadius: 6,
												padding: "4px 12px",
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
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							padding: "0 56px 32px",
							alignItems: "center",
							justifyContent: "space-between",
						},
						children: [
							{
								type: "div",
								props: {
									style: { display: "flex", flexWrap: "wrap", gap: 8 },
									children: tech_pills,
								},
							},
							{
								type: "div",
								props: {
									style: { display: "flex", fontSize: 18, color: OG.fgSubtle },
									children: "forbit.dev",
								},
							},
						],
					},
				},
			],
		},
	};
}

export function blog_fallback_layout(): OgElement {
	return {
		type: "div",
		props: {
			style: {
				display: "flex",
				width: "100%",
				height: "100%",
				background: OG.bg,
				alignItems: "center",
				justifyContent: "center",
			},
			children: {
				type: "div",
				props: {
					style: { display: "flex", fontSize: 48, color: OG.fgMuted },
					children: "Post not found",
				},
			},
		},
	};
}

export function blog_layout(post: Pick<Post, "title" | "description" | "tag_list">): OgElement {
	const title = truncate(post.title, 80);
	const description = truncate(post.description, 150);
	const tags = post.tag_list.slice(0, 5);

	const tag_pills: OgElement[] = tags.map((tag) => ({
		type: "div",
		props: {
			style: {
				display: "flex",
				background: OG.bgAlt,
				border: `1px solid ${OG.border}`,
				borderRadius: 6,
				padding: "6px 16px",
				fontSize: 22,
				color: OG.fgSubtle,
			},
			children: tag,
		},
	}));

	const description_nodes: OgElement[] = description
		? [
				{
					type: "div",
					props: {
						style: { display: "flex", fontSize: 36, color: OG.fgMuted, marginTop: 24, lineHeight: 1.4 },
						children: description,
					},
				},
			]
		: [];

	return {
		type: "div",
		props: {
			style: {
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: "100%",
				background: OG.bg,
			},
			children: [
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							width: "100%",
							height: 4,
							background: OG.accent,
						},
						children: [],
					},
				},
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							flexDirection: "column",
							flex: 1,
							padding: "48px 56px",
							justifyContent: "space-between",
						},
						children: [
							{
								type: "div",
								props: {
									style: { display: "flex", flexDirection: "column" },
									children: [
										{
											type: "div",
											props: {
												style: {
													display: "flex",
													fontSize: 72,
													fontWeight: 700,
													color: OG.fg,
													lineHeight: 1.2,
												},
												children: title,
											},
										},
										...description_nodes,
									],
								},
							},
							{
								type: "div",
								props: {
									style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end" },
									children: [
										{
											type: "div",
											props: {
												style: { display: "flex", gap: 12, flexWrap: "wrap" },
												children: tag_pills,
											},
										},
										{
											type: "div",
											props: {
												style: { display: "flex", fontSize: 24, color: OG.fgSubtle },
												children: "forbit.dev",
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
	};
}

// ---------- test helper ----------

export function extract_text(element: OgElement | OgElement[] | string | undefined): string {
	if (element === undefined) return "";
	if (typeof element === "string") return element;
	if (Array.isArray(element)) return element.map(extract_text).join(" ");
	const children = element.props.children;
	return extract_text(children);
}

export type { BlogGroup };
