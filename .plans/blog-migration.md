# Blog Migration: Legacy Blog Server → @devpad/api Client

## Executive Summary

Replace raw `fetch()` calls to `api.forbit.dev/blog` with the existing `@devpad/api` client (`devpad.blog.posts.*`) in `src/client.ts`. The local `Post` type stays as the display type; a new adapter function bridges the devpad API `Post` shape to the local shape. Dev.to integration is untouched.

**Scope**: Blog fetching only. Projects (already migrated) and timeline are out of scope.

**Risk**: Low. Single-phase swap of two fetch functions + dead code removal. The local `Post` type is the contract between data layer and consumers — as long as the adapter is correct, zero consumer changes are needed.

---

## Current State

```
src/utils.ts
├── secrets.BLOG_URL, secrets.BLOG_TOKEN         ← env vars for legacy server
├── BLOG_ENV = { url, key }                       ← config object
├── parseDevBlog(post: any): Post                 ← adapter: legacy server → local Post
├── getBlogServerPosts()                          ← fetch(BLOG_URL/posts?limit=100) → Post[]
├── fetchBlogPost(slug)                           ← fetch(BLOG_URL/post/{slug}) → Post | null
├── fetch_blog()                                  ← merges dev.to + getBlogServerPosts(), sorts
└── getBlogPost(group, slug)                      ← dispatches by group: devto→fetchDevToAPI, dev→fetchBlogPost
```

## Target State

```
src/utils.ts
├── devpadPostToLocal(post: DevpadPost): Post     ← adapter: @devpad/api Post → local Post
├── getDevpadBlogPosts(): Promise<Post[]>          ← devpad.blog.posts.list() → map adapter
├── fetchDevpadBlogPost(slug): Promise<Post|null>  ← devpad.blog.posts.getBySlug() → adapter
├── fetch_blog()                                   ← merges dev.to + getDevpadBlogPosts(), sorts
└── getBlogPost(group, slug)                       ← dispatches: devto→fetchDevToAPI, dev→fetchDevpadBlogPost
```

### Removed

-   `BLOG_URL` and `BLOG_TOKEN` from `secrets` object
-   `BLOG_ENV` config object
-   `parseDevBlog()` function
-   `getBlogServerPosts()` function
-   `fetchBlogPost()` function
-   `VITE_BLOG_URL` and `VITE_BLOG_TOKEN` from `.env.example`

### Unchanged

-   Local `Post` type in `src/types.ts` (display contract)
-   `BlogGroup`, `BLOG_GROUP` constants
-   Dev.to integration (`fetchDevToAPI`, `getDevToHeaders`, `secrets.DEVTO_KEY`)
-   SWR cache layer (`caches.blog`, `get_data`, `update_cache`)
-   All consumer files (zero changes: `blog.astro`, `[group]/[slug].astro`, `BlogCard.astro`, `RecentBlogs.astro`, `PublishTime.tsx`, `astro.config.mjs`)

---

## Adapter Design

The key type mapping from `@devpad/api Post` to local `Post`:

```typescript
import type { Post as DevpadPost } from '@devpad/api'

function devpadPostToLocal(post: DevpadPost): Post {
    const publish_at = post.publish_at
    // publish_at comes over JSON — could be Date object or ISO string depending on client internals
    const published_at =
        publish_at instanceof Date
            ? publish_at.toISOString()
            : typeof publish_at === 'string'
              ? publish_at
              : post.created_at instanceof Date
                ? post.created_at.toISOString()
                : String(post.created_at)

    return {
        slug: post.slug,
        group: BLOG_GROUP.DEV,
        title: post.title,
        description: post.description ?? post.content.substring(0, 80),
        published: true,
        published_at,
        tag_list: post.tags,
        content: post.content,
        // no `url` — devpad posts are hosted locally, not external links
    }
}
```

**Why the `publish_at` gymnastics**: The `@devpad/api` Post schema declares `publish_at: Date | null`. But the data arrives over HTTP as JSON, where `Date` objects are serialized as ISO strings. The `@devpad/api` client _may_ parse them back to `Date` via Zod `.transform()` or it may leave them as strings. We handle both cases defensively.

---

## Risk Assessment

| Risk                                                      | Severity | Mitigation                               |
| --------------------------------------------------------- | -------- | ---------------------------------------- |
| `publish_at` arrives as string, not Date                  | Medium   | Adapter handles both cases               |
| `description` is `undefined` on devpad Post (ZodOptional) | Low      | Fallback to `content.substring(0, 80)`   |
| `devpad.blog.posts.list()` default limit < 100            | Low      | Explicitly pass `limit: 100`             |
| `devpad.blog.posts.list()` returns archived posts         | Low      | Pass `archived: false` explicitly        |
| Sitemap top-level await in `astro.config.mjs`             | None     | Uses `getBlogPosts()` which is unchanged |

## Rollback Strategy

Single commit. If it breaks, `git revert HEAD`. The env vars `VITE_BLOG_URL`/`VITE_BLOG_TOKEN` can stay in `.env` (just not in `.env.example`) until the commit is verified.

---

## Phase 1: Blog Migration (single phase)

All tasks touch `src/utils.ts` and must be executed sequentially by a single agent.

### Task 1.1: Add adapter function + replace blog server calls

**File**: `src/utils.ts`
**Est. LOC**: ~45 changed
**Dependencies**: None (client already exists in `src/client.ts`, devpad already imported)

Changes:

1. **Add import** for `Post as DevpadPost` from `@devpad/api` (line 1 area)

2. **Add `devpadPostToLocal()` adapter** (replaces `parseDevBlog()`):

    - Map `tags` → `tag_list`
    - Map `publish_at` → `published_at` (handle Date vs string)
    - Map `description ?? content.substring(0,80)` → `description`
    - Hard-code `group: BLOG_GROUP.DEV`, `published: true`
    - No `url` field (local posts)

3. **Replace `getBlogServerPosts()`** with `getDevpadBlogPosts()`:

    ```typescript
    async function getDevpadBlogPosts(): Promise<Post[]> {
        const result = await devpad.blog.posts.list({ status: 'published', limit: 100, archived: false })
        if (!result.ok) {
            console.error('BLOG: devpad fetch error', result.error.message)
            return []
        }
        return result.value.posts.map(devpadPostToLocal)
    }
    ```

4. **Replace `fetchBlogPost(slug)`** with `fetchDevpadBlogPost(slug)`:

    ```typescript
    async function fetchDevpadBlogPost(slug: string): Promise<Post | null> {
        const result = await devpad.blog.posts.getBySlug(slug)
        if (!result.ok) {
            console.error('BLOG: devpad slug fetch error', result.error.message)
            return null
        }
        return devpadPostToLocal(result.value)
    }
    ```

5. **Update `fetch_blog()`** (line 199-210):

    - Replace `getBlogServerPosts()` → `getDevpadBlogPosts()`

6. **Update `getBlogPost(group, slug)`** (line 212-224):

    - Replace `fetchBlogPost(slug)` → `fetchDevpadBlogPost(slug)` in the `BLOG_GROUP.DEV` branch

7. **Delete** `parseDevBlog()`, `getBlogServerPosts()`, `fetchBlogPost()` functions

### Task 1.2: Clean up env vars and secrets

**File**: `src/utils.ts`, `.env.example`
**Est. LOC**: ~10 changed
**Dependencies**: Task 1.1

In `src/utils.ts`:

1. **Remove** `BLOG_URL` and `BLOG_TOKEN` from the `secrets` object (lines 8-9)
2. **Remove** the `BLOG_ENV` object (lines 160-163)

In `.env.example`:

1. **Remove** `VITE_BLOG_TOKEN` and `VITE_BLOG_URL` lines

**Note**: Do NOT remove from `.env` itself — that file is gitignored and the values are harmless. Removing from `.env.example` is sufficient to signal they're no longer needed.

### Task Summary

| Task                     | File                           | Est. LOC | Dependencies |
| ------------------------ | ------------------------------ | -------- | ------------ |
| 1.1 Adapter + fetch swap | `src/utils.ts`                 | 45       | None         |
| 1.2 Env cleanup          | `src/utils.ts`, `.env.example` | 10       | 1.1          |
| **Total**                |                                | **~55**  |              |

**Verification**: After both tasks, run typecheck + build. Manually verify:

-   `/blog` page renders blog list (mixed devpad + dev.to posts)
-   `/blog/dev/{slug}` renders a devpad blog post with correct content
-   `/blog/devto/{slug}` still works (dev.to posts unaffected)
-   Sitemap generation in `astro.config.mjs` succeeds

---

## Suggested AGENTS.md Updates

After this migration, add to a future `AGENTS.md`:

```markdown
## Blog Architecture

-   Two blog sources: devpad API (via `@devpad/api` client) + dev.to (raw fetch)
-   `devpadPostToLocal()` adapter in `src/utils.ts` bridges `@devpad/api Post` → local `Post` type
-   Local `Post` type in `src/types.ts` is the display contract — all components use this
-   Blog URLs: `/blog/dev/{slug}` (devpad) and `/blog/devto/{slug}` (dev.to)
-   `VITE_BLOG_URL` and `VITE_BLOG_TOKEN` env vars are no longer needed (removed in blog migration)
```
