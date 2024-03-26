import type { Duration } from "moment";
import { PROJECT_VISIBILITY, type ApiResult, type Project, type BlogGroup, BLOG_GROUP, type Post } from "./types";

const DEFAULT_CACHE_INTERVAL = 30 * 1000; // 10 minutes

// define a type for consistent cache behaviour
type StaleCache<T> = {
    name: string,
    interval: number,
    last_fetched: Date | null,
    invalid_response: boolean,
    data: T,
    fetch: () => DataFetch<T>,
}

type DataFetch<T> = Promise<{ data: T, invalid_response: boolean }>;

const caches = {
    'project': {
        name: 'PROJECTS',
        interval: DEFAULT_CACHE_INTERVAL,
        last_fetched: null,
        invalid_response: false,
        data: [],
        fetch: fetch_projects
    } as StaleCache<Project[]>,
    'blog': {
        name: 'BLOG',
        interval: DEFAULT_CACHE_INTERVAL,
        last_fetched: null,
        invalid_response: false,
        data: [], 
        fetch: fetch_blog
    } as StaleCache<Post[]>,
    'timeline': {
        name: 'TIMELINE',
        interval: DEFAULT_CACHE_INTERVAL,
        last_fetched: null,
        invalid_response: false,
        data: [],
        fetch: fetch_timeline
    } as StaleCache<any[]>
} as const;

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
    return await get_data(caches['project']); 
}

async function get_data<T>(cache: StaleCache<T>) {
    const log_cache: any = { ...cache }
    log_cache['data'] = log_cache['data'].length;
    //console.log(log_cache);

    switch (cache_status(cache)) {
        case "fresh": {
            console.log(`${cache.name}: cache hit`);
            return cache.data;
        }
        case "stale": {
            const response = structuredClone(cache.data); // avoid race condition collision
            console.log(`${cache.name}: stale`);
            update_cache(cache);
            return response;
        }
        case "empty": 
        default: {
            await update_cache(cache);
            return cache.data;
        }
    }
}

function cache_status<T>(cache: StaleCache<T>) {
    if (cache.last_fetched == null) return "empty";
    const time_gap = Date.now() - cache.last_fetched.getTime();
    return time_gap < cache.interval ? "fresh" : "stale";
}

async function update_cache<T>(cache: StaleCache<T>) {
    // perform fetch
    const response = await cache.fetch();
    cache.data = response.data;
    cache.invalid_response = response.invalid_response;
    cache.last_fetched = new Date();
}

async function fetch_projects() {
    const projects_url = `https://devpad.tools/api/projects?user_id=${import.meta.env.DEVPAD_USER_ID}&api_key=${import.meta.env.DEVPAD_API_KEY}`;
    const project_response = await fetch(projects_url);
    if (!project_response || project_response.ok == false) {
        console.error("PROJECTS: fetch error");
        return { data: [], invalid_response: true };
    }
    const project_result = (await project_response.json()) as ApiResult<Project[]>;
    if (!project_result.success) { 
        console.error("PROJECTS: result error");
        return { data: [], invalid_response: false };
    };
    const data = project_result.data.filter((p) => p.visibility == PROJECT_VISIBILITY.PUBLIC);
    console.log("PROJECTS: new entry");
    return { data: data, invalid_response: false };
}

export async function getProject(project_id: string) {
    // check to see if cache is recent
    if (cache_status(caches['project']) != "empty") {
        console.log("FETCH_PROJECT: cache hit");
        const data = await get_data(caches['project']);
        const project = data.find((p) => p.project_id == project_id);
        if (project) return project;
        console.log("FETCH_PROJECT: not in cache");
    }

    // otherwise fetch directory to api
    const project_url = `https://devpad.tools/api/project?project_id=${project_id}&user_id=${import.meta.env.DEVPAD_USER_ID}&api_key=${import.meta.env.DEVPAD_API_KEY}`;
    const project_response = await fetch(project_url);
    if (!project_response || project_response.ok == false) return null;
    const project_result = (await project_response.json()) as ApiResult<Project>;
    console.log("FETCH_PROJECT: " + project_result.success ? "success" : "failure");
    if (!project_result.success) return null;
    return project_result.data;
}

export function isProjectCacheInvalid() {
    return caches['project'].invalid_response;
}

function getDevToHeaders(API_KEY: any) {
    return { headers: { 'api-key': API_KEY, 'accept': 'application/vnd.forem.api-v1+json' } };
}

export async function fetchDevToAPI(url: string) {
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

const BLOG_ENV = {
    url: import.meta.env.BLOG_URL,
    key: import.meta.env.BLOG_TOKEN
}

function parseDevBlog(post: any): Post {
    post.tag_list = post.tags;
    post.group = BLOG_GROUP.DEV;
    post.tag_list = post.tags;
    if (!post.description) post.description = post.content.substring(0, 80);
    post.published_at = post.publish_at;

    return post;
}

export async function getBlogServerPosts() {
    try {
        const response = await fetch(`${BLOG_ENV.url}/posts`, { method: "GET", headers: { 'Auth-Token': BLOG_ENV.key } });
        if (!response || !response.ok) return [];
        const result = await response.json();
        if (!result || !result.posts) return [];
        const filtered_result = result.posts.filter((p: any) => !p.archived);
        return filtered_result.map(parseDevBlog) as Post[];
    } catch (err) {
        return [];
    }
}

export async function fetchBlogPost(slug: string) {
    try {
        const response = await fetch(`${BLOG_ENV.url}/post/${slug}`, { method: "GET", headers: { 'Auth-Token': BLOG_ENV.key } });
        if (!response || !response.ok) return null;
        const result = await response.json();
        return parseDevBlog(result);
    } catch (err) {
        return null;
    }
}

async function fetch_blog() {
    const posts: Post[] = [];
    const dev_posts_raw = await fetchDevToAPI("https://dev.to/api/articles/me");
    const dev_posts: Post[] = dev_posts_raw ? dev_posts_raw.map((p: any) => ({ ...p, group: BLOG_GROUP.DEVTO })) : [];
    posts.push(...dev_posts);
    const local_posts = await getBlogServerPosts();
    posts.push(...local_posts);
    // then sort
    posts.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    console.log("BLOG: new entry");
    return { data: posts, invalid_response: false };
}

export async function getBlogPosts() {
    return await get_data(caches['blog']);
}

export async function getBlogPost(group: BlogGroup, slug: string): Promise<Post | null> {
    if (group == BLOG_GROUP.DEVTO) {
        // fetch from devto
        const post = await fetchDevToAPI("https://dev.to/api/articles/forbit/" + slug);
        post['content'] = post['body_markdown'];
        return post;
    } else if (group == BLOG_GROUP.DEV) {
        return await fetchBlogPost(slug);
    } else {
        console.error(`Invalid blog group ${group}`);
        return null;
    }
}

async function fetch_timeline() {
    const response = await fetch(import.meta.env.POSTS_URL);
    if (!response || !response.ok) {
        console.error("TIMELINE: fetch error");
        return { data: [], invalid_response: true };
    }
    const activity = await (await fetch(import.meta.env.POSTS_URL)).json()
    console.log("TIMELINE: new entry");
    return { data: activity as any[], invalid_response: false }
}

export async function fetchTimeline() {
    return await get_data(caches['timeline']);
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
                title: `${commits.length} commits to f0rbit/${commits[0].project}`,
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
