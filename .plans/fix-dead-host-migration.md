# Fix Dead Host Migration: Blog + Timeline → @devpad/api

## Executive Summary

`api.forbit.dev` is dead. Two fetch paths still hit it, causing:

1. **76s dev server startup** — `getBlogPosts()` TCP-times-out in `astro.config.mjs` top-level await
2. **Broken timeline page** — `fetch_timeline()` hangs on dead host, plus has a double-fetch bug
3. **Broken blog server posts** — `getBlogServerPosts()` and `fetchBlogPost()` time out

The `@devpad/api` client (already in `src/client.ts`) has direct replacements for all three dead endpoints. Project fetching was already migrated in Phase 1 of the original plan.

## Current State

```
src/utils.ts
├── fetch_timeline()       → fetch(VITE_POSTS_URL)           ← DEAD HOST + double-fetch bug
├── getBlogServerPosts()   → fetch(VITE_BLOG_URL/posts)      ← DEAD HOST
├── fetchBlogPost(slug)    → fetch(VITE_BLOG_URL/post/slug)  ← DEAD HOST
├── fetch_blog()           → dev.to API + getBlogServerPosts()
├── getBlogPost(group,slug)→ dev.to API or fetchBlogPost()
└── fetch_projects()       → devpad.projects.list()           ← ALREADY MIGRATED

astro.config.mjs
├── await getBlogPosts()   → sequential top-level await (blocks on dead blog fetch)
└── await getProjects()    → sequential top-level await (works, but waits for blog)

secrets object references:
├── BLOG_URL    → "https://api.forbit.dev/blog"     ← dead
├── BLOG_TOKEN  → Auth-Token header for dead host    ← dead
├── POSTS_URL   → "https://api.forbit.dev/media/posts" ← dead
└── DEVTO_KEY   → dev.to API key                     ← works
```

### Consumers

| Function                   | Consumers                                             |
| -------------------------- | ----------------------------------------------------- |
| `getBlogPosts()`           | `blog.astro`, `RecentBlogs.astro`, `astro.config.mjs` |
| `getBlogPost(group, slug)` | `blog/[group]/[slug].astro`                           |
| `fetchTimeline()`          | `Timeline.astro`                                      |
| `getBlogServerPosts()`     | `fetch_blog()` internal only                          |
| `fetchBlogPost(slug)`      | `getBlogPost()` internal only                         |

## Target State

```
src/utils.ts
├── fetch_timeline()       → devpad.user.history()
├── fetch_blog()           → devpad.blog.posts.list() + dev.to API
├── getBlogPost(group,slug)→ devpad.blog.posts.getBySlug() or dev.to API
├── fetch_projects()       → devpad.projects.list()  (unchanged)
└── fetchDevToAPI()        → fetch with AbortController timeout

astro.config.mjs
├── Promise.all([getBlogPosts(), getProjects()])  ← parallel

secrets object:
└── DEVTO_KEY   → dev.to API key (only remaining secret)

.env / .env.example:
├── VITE_DEVPAD_API_KEY  (kept, used by client.ts)
├── VITE_DEVTO_KEY       (kept, dev.to)
├── REMOVED: VITE_BLOG_URL, VITE_BLOG_TOKEN, VITE_POSTS_URL
```

## Type Adapter Analysis

**Devpad `Post`** (from `@devpad/api`):

```typescript
{
  id: number, uuid: string, author_id: string,
  slug: string, title: string, content: string,
  description?: string, format: "md" | "adoc",
  category: string, tags: string[], archived: boolean,
  publish_at: Date | null, created_at: Date, updated_at: Date,
  project_ids: string[], corpus_version: string | null
}
```

**Local `Post`** (display type):

```typescript
{
  slug: string, group: BlogGroup, title: string,
  description: string, published: boolean, url?: string,
  published_at: string, tag_list: string[], content: string
}
```

Key differences:

-   `tags` vs `tag_list` — field rename
-   `publish_at: Date | null` vs `published_at: string` — type + name change
-   `description?: string` vs `description: string` — optionality
-   Local has `group`, `published`, `url` — not in devpad schema
-   Devpad has `id`, `uuid`, `author_id`, `format`, `category`, etc. — not needed for display

Strategy: Keep local `Post` type as the display type. Write a `devpadPostToDisplayPost()` adapter function. No consumer changes needed.

## Risk Assessment

| Risk                                                                          | Severity | Mitigation                                                                                  |
| ----------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| Devpad blog API returns different `publish_at` serialization (Date vs string) | Medium   | API client may serialize Date as ISO string over JSON; test actual response                 |
| `PostListParams` defaults don't match old `?limit=100` behavior               | Low      | Explicitly pass `{ status: 'published', archived: false, limit: 100 }`                      |
| dev.to fetch still has no timeout                                             | Medium   | Add AbortController with 10s timeout in Phase 2                                             |
| `parseDevBlog` adapter had field mappings we might miss                       | Low      | Carefully replicate: `tag_list = tags`, `published_at = publish_at`, `description fallback` |

## Rollback Strategy

Each phase produces a working commit. Revert to prior phase commit if something breaks. Phase 1 is the critical unblock — everything after is hardening.

---

## Phases

### Phase 1: Unblock — Migrate timeline + blog to @devpad/api (sequential)

All changes touch `src/utils.ts`. Must be a single agent, single file.

#### Task 1.1: Replace `fetch_timeline()` with `devpad.user.history()`

**Files**: `src/utils.ts`
**LOC**: ~10 changed
**Dependencies**: None

Replace:

```typescript
async function fetch_timeline(): DataFetch<any[]> {
    const response = await fetch(secrets.POSTS_URL)
    if (!response || !response.ok) {
        console.error('TIMELINE: fetch error')
        return { data: [], invalid_response: true }
    }
    const activity = await (await fetch(secrets.POSTS_URL)).json() // double-fetch bug
    console.log('TIMELINE: new entry')
    return { data: activity as any[], invalid_response: false }
}
```

With:

```typescript
async function fetch_timeline(): DataFetch<any[]> {
    const result = await devpad.user.history()
    if (!result.ok) {
        console.error('TIMELINE: fetch error', result.error.message)
        return { data: [], invalid_response: true }
    }
    console.log('TIMELINE: new entry')
    return { data: result.value, invalid_response: false }
}
```

Fixes both: dead host AND double-fetch bug.

#### Task 1.2: Replace `getBlogServerPosts()` with devpad client

**Files**: `src/utils.ts`
**LOC**: ~20 changed
**Dependencies**: None (same file as 1.1, so same agent)

Replace `getBlogServerPosts()`:

```typescript
async function getBlogServerPosts(): Promise<Post[]> {
    const result = await devpad.blog.posts.list({ status: 'published', archived: false, limit: 100 })
    if (!result.ok) return []
    return result.value.posts.map(devpadPostToDisplayPost)
}
```

Add adapter function:

```typescript
import type { Post as DevpadPost } from '@devpad/api'

function devpadPostToDisplayPost(post: DevpadPost): Post {
    return {
        slug: post.slug,
        group: BLOG_GROUP.DEV,
        title: post.title,
        description: post.description ?? post.content.substring(0, 80),
        published: post.publish_at != null,
        published_at: post.publish_at?.toISOString() ?? post.created_at.toISOString(),
        tag_list: post.tags,
        content: post.content,
    }
}
```

Note: The old `parseDevBlog` did `post.description = post.content.substring(0, 80)` when missing — preserve that fallback.

#### Task 1.3: Replace `fetchBlogPost(slug)` with devpad client

**Files**: `src/utils.ts`
**LOC**: ~10 changed
**Dependencies**: Task 1.2 (uses same adapter)

Replace:

```typescript
export async function fetchBlogPost(slug: string) {
    try {
        const response = await fetch(`${BLOG_ENV.url}/post/${slug}`, ...)
        ...
        return parseDevBlog(result)
    } catch (err) { return null }
}
```

With:

```typescript
async function fetchBlogPost(slug: string): Promise<Post | null> {
    const result = await devpad.blog.posts.getBySlug(slug)
    if (!result.ok) return null
    return devpadPostToDisplayPost(result.value)
}
```

#### Task 1.4: Remove dead secrets and code

**Files**: `src/utils.ts`
**LOC**: ~15 removed
**Dependencies**: Tasks 1.1–1.3

-   Remove `BLOG_URL`, `BLOG_TOKEN`, `POSTS_URL` from `secrets` object
-   Remove `BLOG_ENV` object
-   Remove `parseDevBlog()` function
-   Secrets object becomes just `{ DEVTO_KEY }` — simplify the validation loop

All of Phase 1 is **one agent, one file** (`src/utils.ts`). Tasks 1.1–1.4 are listed separately for clarity but execute as a single implementation pass.

**Verification**: typecheck, `astro dev` starts without 76s hang, blog page loads, timeline page loads. Commit.

---

### Phase 2: Hardening — Parallel startup + fetch timeouts (parallel agents possible)

#### Task 2.1: Parallelize `astro.config.mjs` top-level awaits

**Files**: `astro.config.mjs`
**LOC**: ~5 changed
**Dependencies**: Phase 1 complete
**Can parallel with**: Task 2.2

Replace:

```javascript
const blog_posts = await getBlogPosts()
const projects = await getProjects()
```

With:

```javascript
const [blog_posts, projects] = await Promise.all([getBlogPosts(), getProjects()])
```

This saves one full round-trip time on startup. After Phase 1 fix, both should be fast (~1-2s each), but parallelizing is free and correct.

#### Task 2.2: Add AbortController timeout to dev.to fetch

**Files**: `src/utils.ts`
**LOC**: ~15 changed
**Dependencies**: Phase 1 complete
**Can parallel with**: Task 2.1

Wrap `fetchDevToAPI` with a timeout to prevent future dead-host scenarios:

```typescript
const FETCH_TIMEOUT_MS = 10_000 // 10 seconds

export async function fetchDevToAPI(url: string) {
    try {
        const api_key = secrets.DEVTO_KEY
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
        const response = await fetch(url, {
            ...getDevToHeaders(api_key),
            signal: controller.signal,
        })
        clearTimeout(timeout)
        if (!response || !response.ok) return null
        const result = await response.json()
        return result
    } catch (err) {
        return null
    }
}
```

#### Task 2.3: Clean up env files

**Files**: `.env.example`, `.env`
**LOC**: ~5 changed
**Dependencies**: Phase 1 complete
**Can parallel with**: Tasks 2.1 and 2.2

In `.env.example`:

-   Remove `VITE_POSTS_URL`, `VITE_BLOG_TOKEN`, `VITE_BLOG_URL`
-   Add optional `VITE_DEVPAD_URL` with comment

In `.env`:

-   Remove the three dead env vars (they're harmless but misleading)

**Verification**: typecheck, build succeeds, dev server starts fast, blog/timeline pages work. Commit.

---

## Task Summary

| Phase | Task                            | Files                  | Est. LOC   | Parallel?        |
| ----- | ------------------------------- | ---------------------- | ---------- | ---------------- |
| 1     | 1.1 Timeline → devpad client    | `src/utils.ts`         | 10         | —                |
| 1     | 1.2 Blog list → devpad client   | `src/utils.ts`         | 20         | Same file as 1.1 |
| 1     | 1.3 Blog single → devpad client | `src/utils.ts`         | 10         | Same file as 1.1 |
| 1     | 1.4 Remove dead code/secrets    | `src/utils.ts`         | 15 removed | Same file as 1.1 |
| 2     | 2.1 Parallel startup            | `astro.config.mjs`     | 5          | Yes              |
| 2     | 2.2 Fetch timeout               | `src/utils.ts`         | 15         | Yes              |
| 2     | 2.3 Env cleanup                 | `.env.example`, `.env` | 5          | Yes              |

**Total**: ~80 LOC changed/added, ~40 LOC removed

## Breaking Changes

1. **Removed env vars**: `VITE_BLOG_URL`, `VITE_BLOG_TOKEN`, `VITE_POSTS_URL` — deployment configs that reference these can be cleaned up
2. **`getBlogServerPosts()` no longer exported** — was `export async function`, becomes private. No external consumers found.
3. **`fetchBlogPost()` no longer exported** — same as above, only called internally by `getBlogPost()`
4. **Blog `publish_at` serialization**: Previously the blog server returned a string. Now `@devpad/api` may return a Date object that gets `.toISOString()`. The display format (`published_at: string`) stays the same, but the exact timestamp format may differ slightly.

## Implementation Notes for Coder Agent

**Phase 1 — single agent instructions**:

1. Add `import type { Post as DevpadPost } from '@devpad/api'` at top of `src/utils.ts`
2. Add `devpadPostToDisplayPost` adapter function
3. Replace `fetch_timeline()` body
4. Replace `getBlogServerPosts()` body — remove `export`, make private
5. Replace `fetchBlogPost()` body — remove `export`, make private
6. Remove from `secrets`: `BLOG_URL`, `BLOG_TOKEN`, `POSTS_URL`
7. Remove `BLOG_ENV` object (lines 160-163)
8. Remove `parseDevBlog()` function (lines 165-173)
9. Simplify `secrets` to just `{ DEVTO_KEY }` and simplify the validation loop
10. Do NOT touch: `fetchDevToAPI`, `fetch_blog` flow (just uses new `getBlogServerPosts`), `getTimeline`, cache infrastructure, any `.astro` files

**Phase 2 — can be 3 parallel agents**:

-   Agent A: `astro.config.mjs` only — Promise.all
-   Agent B: `src/utils.ts` only — AbortController on fetchDevToAPI
-   Agent C: `.env.example` + `.env` only — remove dead vars

---

## Suggested AGENTS.md updates

After completion, add:

```markdown
## Dead Host Migration (completed)

All API calls now go through `@devpad/api` client in `src/client.ts`. No more raw fetch() to devpad endpoints.

-   Blog posts: `devpad.blog.posts.list()` + `devpad.blog.posts.getBySlug()` with `devpadPostToDisplayPost` adapter
-   Timeline: `devpad.user.history()`
-   Projects: `devpad.projects.list()` + `devpad.projects.getByName()` (migrated earlier)
-   Dev.to: Still raw fetch with AbortController timeout

Only remaining env vars: `VITE_DEVPAD_API_KEY`, `VITE_DEVTO_KEY`, optional `VITE_DEVPAD_URL`

## Gotchas

-   `astro.config.mjs` has top-level awaits for sitemap generation — these run at import time, must be fast
-   Blog `Post` type (local in `src/types.ts`) is the display type; devpad `Post` (from `@devpad/api`) is the API type. Adapter function bridges them.
-   `publish_at` (devpad, Date|null) vs `published_at` (display, string) — note the field name AND type difference
```
