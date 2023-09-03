import type { Duration } from "moment";
import { PROJECT_VISIBILITY, type ApiResult, type Project, type BlogGroup, BLOG_GROUP } from "./types";

export function formatDuration(duration: Duration) {
    if (duration.asMonths() >= 16) {
        return `${Math.round(duration.asYears())} years`;
    } else if (duration.asMonths() >= 2) {
        return `${Math.ceil(duration.asMonths())} months`;
    } else if (duration.asDays() >= 3) {
        return `${Math.ceil(duration.asDays())} days`;
    } else {
        return `${Math.ceil(duration.asHours())} hours`;
    }
}

export async function getProjects() {
    const result = (await (await fetch(import.meta.env.PROJECT_URL)).json()) as ApiResult<Project[]>;
    if (!result.success) return [];
    return result.data.filter((project) => project.visibility == PROJECT_VISIBILITY.PUBLIC);
}

function getDevToHeaders(API_KEY: any) {
    return { headers: { 'api-key': API_KEY, 'accept': 'application/vnd.forem.api-v1+json' } };
}

export async function fetchDevToAPI(url: string): Promise<any> {
    try {
        const api_key = import.meta.env.DEVTO_KEY;
        const response = await fetch(url, getDevToHeaders(api_key));
        if (!response || !response.ok) return null;
        const result = await response.json();
        return result;
    } catch (err) {
        return null;
    }
}

export async function getBlogPosts() {
    const posts = [];
    const dev_posts = await fetchDevToAPI("https://dev.to/api/articles/me");
    posts.push(...dev_posts);

    return posts;
}

export async function getBlogPost(group: BlogGroup, slug: string) {
    if (group == BLOG_GROUP.DEVTO) {
        // fetch from devto
        return await fetchDevToAPI("https://dev.to/api/articles/forbit/" + slug);
    } else {
        return null;
    }
}
