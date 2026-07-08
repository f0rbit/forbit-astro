/**
 * Single source of truth for the site's five routes as terminal-style
 * "paths" (~/home, ~/work, ...). Consumed by both Navigation.astro (tab
 * strip + mobile path menu) and TerminalWindow.astro (titlebar label).
 */

export type PathTab = {
	href: string;
	label: string;
};

export const PATH_TABS: readonly PathTab[] = [
	{ href: "/", label: "~/home" },
	{ href: "/projects", label: "~/work" },
	{ href: "/about", label: "~/about" },
	{ href: "/blog", label: "~/blog" },
	{ href: "/timeline", label: "~/timeline" },
];

export function is_active_path(tab_href: string, pathname: string): boolean {
	if (tab_href === "/") return pathname === "/";
	return pathname === tab_href || pathname.startsWith(`${tab_href}/`);
}

/** Derives the titlebar path label for a route, including detail routes. */
export function derive_path(pathname: string): string {
	if (pathname === "/") return "~/home";

	const project_match = /^\/projects\/([^/]+)\/?$/.exec(pathname);
	if (project_match) return `~/work/${project_match[1]}`;

	if (pathname.startsWith("/projects")) return "~/work";
	if (pathname.startsWith("/about")) return "~/about";
	if (pathname.startsWith("/blog")) return "~/blog";
	if (pathname.startsWith("/timeline")) return "~/timeline";

	return pathname;
}
