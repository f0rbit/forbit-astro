import type { Duration } from "moment";
import { PROJECT_VISIBILITY, type ApiResult, type Project, type BlogGroup, BLOG_GROUP } from "./types";

const DEFAULT_CACHE_INTERVAL = 60 * 1000;

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

const PROJECT_CACHE = {
    interval: DEFAULT_CACHE_INTERVAL,
    last_fetched: null as Date | null,
    data: [] as Project[],
}

export async function getProjects() {
    if (PROJECT_CACHE.last_fetched != null && (Date.now() - PROJECT_CACHE.last_fetched.getTime() < PROJECT_CACHE.interval)) {
        console.log("PROJECTS: cache hit");
        return PROJECT_CACHE.data;
    }  
    PROJECT_CACHE.last_fetched = null;
    const result = (await (await fetch(import.meta.env.PROJECT_URL)).json()) as ApiResult<Project[]>;
    if (!result.success) return [];
    PROJECT_CACHE.last_fetched = new Date();
    const data = result.data.filter((p) => p.visibility == PROJECT_VISIBILITY.PUBLIC);
    PROJECT_CACHE.data = data;
    console.log("PROJECTS: new entry");
    return data;
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

const BLOG_CACHE = {
    interval: DEFAULT_CACHE_INTERVAL,
    last_fetched: null as Date | null,
    data: [] as any[]
}

export async function getBlogPosts() {
    if (BLOG_CACHE.last_fetched != null && (Date.now() - BLOG_CACHE.last_fetched.getTime() < BLOG_CACHE.interval)) {
        console.log("BLOG: cache hit");
        return BLOG_CACHE.data;
    }
    BLOG_CACHE.last_fetched = null;
    const posts = [];
    const dev_posts = await fetchDevToAPI("https://dev.to/api/articles/me");
    posts.push(...dev_posts);
    BLOG_CACHE.last_fetched = new Date();
    BLOG_CACHE.data = posts;
    console.log("BLOG: new entry");
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

const TIMELINE_CACHE = {
    interval: DEFAULT_CACHE_INTERVAL,
    last_fetched: null as Date | null,
    data: [] as any[]
}

export async function fetchTimeline() {
    if (TIMELINE_CACHE.last_fetched != null && (Date.now() - TIMELINE_CACHE.last_fetched.getTime() < TIMELINE_CACHE.interval)) {
        console.log("TIMELINE: cache hit");
        return TIMELINE_CACHE.data;
    }
    TIMELINE_CACHE.last_fetched = null;
    /** @todo add error handling */
    const activity = await (await fetch(import.meta.env.POSTS_URL)).json()
    TIMELINE_CACHE.last_fetched = new Date();
    TIMELINE_CACHE.data = activity;
    console.log("TIMELINE: new entry");
    return activity;
}

/** @todo fix typings */
export function getTimeline(activities: any, group_commits: any) {
    const DAY_IN_MS = 24 * 60 * 60 * 1000 // Milliseconds in a day
    const event_timeline: any = []
    const timeline = activities.toReversed()

    let commits: any = []
    let last_commit_date = 0

    const pushCommits = () => {
        if (commits.length > 0) {
            event_timeline.push({
                category: 'COMMITS',
                commits: commits.slice().reverse(),
                date: commits[commits.length - 1].date,
                title: `${commits.length} Commits to f0rbit/${commits[0].project}`,
                project: commits[0].project,
            })
            commits = []
        }
    }

    for (const item of timeline) {
        if (item.category == 'BLOG') continue //skip over blog events for  now, malfored data in db
        if (item.category === 'GITHUB' && group_commits) {
            const item_date = item.date // Convert unix timestamp to milliseconds

            if (commits.length === 0 || (item.project === commits[0].project && item_date - last_commit_date <= 3 * DAY_IN_MS)) {
                commits.push(item)
                last_commit_date = item_date
            } else {
                pushCommits()
                commits = [item]
                last_commit_date = item_date
            }
        } else {
            pushCommits()
            event_timeline.push(item)
        }
    }

    pushCommits() // Push any remaining commits

    return event_timeline.toReversed();
}
