# Devpad API Migration: raw fetch() → @devpad/api

## Executive Summary

Replace hand-rolled `devpad_fetch<T>()` and manually-defined types with the `@devpad/api` type-safe client. The current implementation uses hardcoded `/api/v0` URLs and a custom `ApiResult<T>` shape (`{success, data, error}`). The new client targets `/api/v1` and returns `Result<T, ApiResultError>` (`{ok, value/error}`) from `@f0rbit/corpus`.

**Scope**: Projects, Blog, and Timeline data fetching. Blog is the most complex because it currently aggregates two sources (dev.to + custom blog server). The custom blog server is the same devpad blog system — this WILL migrate. Dev.to stays as-is.

## Current State

```
src/utils.ts  ─── devpad_fetch<T>()  ─── fetch("https://devpad.tools/api/v0/...")
    │                                        ↓ returns {success, data, error}
    ├── fetch_projects()    → cache → getProjects()
    ├── fetch_blog()        → cache → getBlogPosts()  [dev.to + blog server]
    ├── fetch_timeline()    → cache → fetchTimeline()
    └── getProject(id)      → cache fallback + direct fetch

src/types.ts  ─── Project, PROJECT_STATUS, PROJECT_VISIBILITY, ApiResult<T>, Post, BlogGroup
```

### Consumers

| Function                            | Files                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `getProjects()`                     | `projects.astro`, `ProjectList.astro`, `RecentProjects.astro`, `astro.config.mjs` |
| `getProject(id)`                    | `[project_id].astro`                                                              |
| `isProjectCacheInvalid()`           | `projects.astro`                                                                  |
| `getBlogPosts()`                    | `blog.astro`, `RecentBlogs.astro`, `astro.config.mjs`                             |
| `getBlogPost(group, slug)`          | `blog/[group]/[slug].astro`                                                       |
| `fetchTimeline()` / `getTimeline()` | `Timeline.astro`                                                                  |
| `type Project`                      | `ProjectCard.astro`, `ProjectList.astro`, `ProjectPage.astro`, `skills.ts`        |
| `type PROJECT_STATUS`               | `Status.astro`                                                                    |
| `type Post` / `BlogGroup`           | `BlogCard.astro`, `blog/[group]/[slug].astro`                                     |

## Target State

```
src/client.ts     ─── ApiClient instance (singleton)
src/utils.ts      ─── SWR cache wrapping client calls
                      ├── getProjects()     → client.projects.list({private: false})
                      ├── getProject(id)    → client.projects.getByName(name)
                      ├── getBlogPosts()    → client.blog.posts.list() + dev.to fetch
                      ├── getBlogPost()     → client.blog.posts.getBySlug() or dev.to
                      ├── fetchTimeline()   → client.user.history()
                      └── getTimeline()     → (unchanged, pure transform)

src/types.ts      ─── Re-exports Project, Post from @devpad/api
                      Keeps: SKILL, Award, BlogGroup/BLOG_GROUP, local-only types
                      Removes: Project, PROJECT_STATUS, PROJECT_VISIBILITY, ApiResult<T>
```

## Analysis & Key Decisions

### 1. Blog Migration — MIGRATE the custom blog server calls

**Current**: `getBlogServerPosts()` fetches from `VITE_BLOG_URL/posts` with `Auth-Token` header. This IS the devpad blog server (same system as `@devpad/api` blog endpoints).

**Decision**: Replace `getBlogServerPosts()` and `fetchBlogPost(slug)` with `client.blog.posts.list()` and `client.blog.posts.getBySlug()`. This eliminates `VITE_BLOG_URL` and `VITE_BLOG_TOKEN` env vars.

**Breaking change**: The blog `Post` type differs significantly:

-   Local: `{ slug, group, title, description, published, url?, published_at, tag_list, content }`
-   Schema: `{ id, uuid, author_id, slug, title, content, description?, format, category, tags, archived, publish_at, created_at, updated_at, project_ids, corpus_version }`

We need an adapter type or to update all blog consumers to use the new shape. A unified `DisplayPost` type that works for both devpad and dev.to posts is the cleanest approach.

### 2. Timeline — MIGRATE to `client.user.history()`

**Current**: Fetches from `VITE_POSTS_URL` (untyped `any[]`). The `getTimeline()` function processes events with `category: 'GITHUB'` and `category: 'COMMITS'`.

**Decision**: Replace with `client.user.history()` which returns `ApiResult<any[]>`. The `getTimeline()` transform function stays unchanged (it operates on `any[]` already). This eliminates the `VITE_POSTS_URL` env var.

### 3. Caching — KEEP the SWR cache layer

The cache is important for an SSR site — it prevents hammering the API on every page load. The generic `StaleCache<T>` pattern is clean and works well. Keep it, just swap the inner fetch functions.

### 4. Type Migration — Project types from @devpad/api, blog needs adapter

**Project**: The `Project` type from `@devpad/schema` has the same fields as the local one, PLUS `repo_id`, `scan_branch`, `id`, `owner_id`. All existing field accesses (`project_id`, `name`, `status`, `visibility`, etc.) are compatible. Direct replacement works.

**PROJECT_STATUS / PROJECT_VISIBILITY**: The schema uses string literal types from Drizzle enums. These are compatible with the current const object pattern. The local types can be replaced with type re-exports, keeping the const objects for runtime value usage if needed (e.g., `PROJECT_VISIBILITY.PUBLIC` in `fetch_projects`).

**Post**: Incompatible shapes. Need a `DisplayPost` adapter type.

### 5. ENV vars after migration

| Current                   | After                 | Notes                                            |
| ------------------------- | --------------------- | ------------------------------------------------ |
| `VITE_DEVPAD_API_KEY`     | `VITE_DEVPAD_API_KEY` | Kept, used by ApiClient                          |
| `VITE_DEVTO_KEY`          | `VITE_DEVTO_KEY`      | Kept, dev.to stays                               |
| `VITE_BLOG_URL`           | **REMOVED**           | Replaced by client                               |
| `VITE_BLOG_TOKEN`         | **REMOVED**           | Client uses API key                              |
| `VITE_POSTS_URL`          | **REMOVED**           | Replaced by client.user.history()                |
| _(new)_ `VITE_DEVPAD_URL` | Optional              | Client defaults to `https://devpad.tools/api/v1` |

### 6. API version change: v0 → v1

The new client defaults to `/api/v1`. This is intentional — the API version has been upgraded. The project endpoints have the same shape. Blog endpoints are new (weren't in v0 as far as this codebase is concerned). Timeline moves from a separate URL to the main API.

## Risk Assessment

| Risk                                            | Severity | Mitigation                                                            |
| ----------------------------------------------- | -------- | --------------------------------------------------------------------- |
| Project API response shape changed in v1        | Medium   | `@devpad/schema` Project type is source of truth; verify fields match |
| Blog Post type mismatch breaks rendering        | High     | Adapter type ensures all consumers work; test blog pages manually     |
| Timeline data shape different from new endpoint | Low      | Both are `any[]`; getTimeline() is resilient to shape variations      |
| Dev.to integration breaks during refactor       | Low      | Not touching dev.to code, just moving it                              |
| Cache behavior changes                          | Low      | Keeping identical cache mechanism                                     |
| `astro.config.mjs` top-level await breaks       | Medium   | Already uses top-level await; just needs working client               |

## Rollback Strategy

Each phase produces a working commit. If Phase N breaks:

-   Revert to Phase N-1 commit
-   The site still works with the prior phase's state
-   Phase 1 is the riskiest (type changes cascade) — if it fails, `git revert` back to pre-migration

---

## Phases

### Phase 1: Foundation — Client setup + Project type migration (sequential)

All changes in this phase are interdependent and touch shared files. Must be sequential.

#### Task 1.1: Add @devpad/api dependency + create client singleton

**Files**: `package.json`, `src/client.ts` (new)
**LOC**: ~20
**Dependencies**: None

-   `npm install @devpad/api`
-   Create `src/client.ts`:

    ```typescript
    import ApiClient from '@devpad/api'

    export const devpad = new ApiClient({
        base_url: import.meta.env.VITE_DEVPAD_URL ?? process.env.VITE_DEVPAD_URL ?? 'https://devpad.tools/api/v1',
        api_key: import.meta.env.VITE_DEVPAD_API_KEY ?? process.env.VITE_DEVPAD_API_KEY,
        auth_mode: 'key',
    })
    ```

#### Task 1.2: Migrate Project types in `src/types.ts`

**Files**: `src/types.ts`
**LOC**: ~15 changed
**Dependencies**: Task 1.1

-   Remove local `Project`, `PROJECT_STATUS`, `PROJECT_VISIBILITY` type definitions
-   Re-export `Project` from `@devpad/api`
-   Keep `PROJECT_STATUS` and `PROJECT_VISIBILITY` const objects for runtime usage, but type them against the schema's string literals
-   Remove `ApiResult<T>` type (no longer needed — internal to utils.ts)
-   Keep all non-project types: `SKILL`, `SkillEvent`, `Award`, `Post`, `BlogGroup`, etc. (blog Post migrates in Phase 2)

#### Task 1.3: Migrate project fetching in `src/utils.ts`

**Files**: `src/utils.ts`
**LOC**: ~40 changed
**Dependencies**: Task 1.1, 1.2

-   Import `devpad` client from `./client`
-   Replace `devpad_fetch<T>()` usage in `fetch_projects()`:
    ```typescript
    async function fetch_projects(): DataFetch<Project[]> {
        const result = await devpad.projects.list({ private: false })
        if (!result.ok) {
            console.error('PROJECTS: fetch error', result.error.message)
            return { data: [], invalid_response: true }
        }
        // list() already filters by private:false, but keep PUBLIC filter for visibility
        const data = result.value.filter((p) => p.visibility === 'PUBLIC')
        console.log('PROJECTS: new entry')
        return { data, invalid_response: false }
    }
    ```
-   Replace `getProject()`:
    ```typescript
    export async function getProject(project_id: string) {
        if (cache_status(caches['project']) != 'empty') {
            const data = await get_data(caches['project'])
            const project = data.find((p) => p.project_id === project_id)
            if (project) return project
        }
        const result = await devpad.projects.getByName(project_id)
        if (!result.ok) return null
        return result.value
    }
    ```
-   Remove the generic `devpad_fetch<T>()` function (no longer needed after blog migrates in Phase 2 — or keep it temporarily if blog isn't migrated yet)
-   Remove `devpad_url` constant
-   Remove `DEVPAD_API_KEY` from `secrets` object (now in client.ts)

#### Task 1.4: Update `src/types.ts` Project type consumers

**Files**: `ProjectCard.astro`, `ProjectList.astro`, `ProjectPage.astro`, `Status.astro`, `skills.ts`
**LOC**: ~10 changed (mostly import path changes)
**Dependencies**: Task 1.2
**Can parallel with**: Task 1.3 (different files)

These files import `Project` and `PROJECT_STATUS` from `../../types`. Since we're re-exporting from `@devpad/api`, the imports stay the same. However, verify:

-   `project.deleted` field exists in schema ✓ (via `entity()` helper)
-   `project.status` values match ✓ (same enum values)
-   `project.visibility` values match ✓ (same enum values)

**Likely no changes needed** in consumers — the re-export preserves the import path. But verify type compatibility in the verification step.

→ **Verification**: typecheck, build, test. Commit.

---

### Phase 2: Blog migration (sequential)

#### Task 2.1: Create DisplayPost adapter type

**Files**: `src/types.ts`
**LOC**: ~30
**Dependencies**: Phase 1 complete

The devpad `Post` type (from `@devpad/schema/blog`) and dev.to posts have different shapes. Create a unified display type:

```typescript
import type { Post as DevpadPost } from '@devpad/api'

// Unified post type for display - works for both devpad and dev.to sources
export type DisplayPost = {
    slug: string
    group: BlogGroup
    title: string
    description: string
    published_at: string
    tag_list: string[]
    content: string
    url?: string
}

// Adapter: devpad Post → DisplayPost
export function toDisplayPost(post: DevpadPost): DisplayPost {
    return {
        slug: post.slug,
        group: BLOG_GROUP.DEV,
        title: post.title,
        description: post.description ?? '',
        published_at: post.publish_at?.toISOString() ?? post.created_at.toISOString(),
        tag_list: post.tags,
        content: post.content,
    }
}
```

Rename the current `Post` type to `DisplayPost` across the codebase (or alias it).

#### Task 2.2: Migrate blog fetching in `src/utils.ts`

**Files**: `src/utils.ts`
**LOC**: ~50 changed
**Dependencies**: Task 2.1

-   Replace `getBlogServerPosts()` with client call:
    ```typescript
    async function getDevpadBlogPosts(): Promise<DisplayPost[]> {
        const result = await devpad.blog.posts.list({ status: 'published', limit: 100, archived: false })
        if (!result.ok) return []
        return result.value.posts.map(toDisplayPost)
    }
    ```
-   Replace `fetchBlogPost(slug)` with:
    ```typescript
    async function fetchDevpadBlogPost(slug: string): Promise<DisplayPost | null> {
        const result = await devpad.blog.posts.getBySlug(slug)
        if (!result.ok) return null
        return toDisplayPost(result.value)
    }
    ```
-   Update `fetch_blog()` to use `getDevpadBlogPosts()` instead of `getBlogServerPosts()`
-   Update `getBlogPost(group, slug)` to use `fetchDevpadBlogPost(slug)` for the `DEV` group
-   Remove `BLOG_ENV` object, `BLOG_URL` and `BLOG_TOKEN` from secrets
-   Remove `parseDevBlog()` helper (no longer needed)

#### Task 2.3: Update blog consumer types

**Files**: `BlogCard.astro`, `blog/[group]/[slug].astro`, `RecentBlogs.astro`, `blog.astro`
**LOC**: ~15 changed
**Dependencies**: Task 2.1

-   Update `Post` imports to `DisplayPost` (or keep aliased re-export)
-   Verify field accesses: `post.slug`, `post.group`, `post.title`, `post.description`, `post.published_at`, `post.url`, `post.content`
-   All these fields exist on `DisplayPost` ✓

**Simplification**: Instead of renaming everywhere, just keep `Post` as the re-exported alias for `DisplayPost` in `src/types.ts`. This means zero changes in consumers.

→ **Verification**: typecheck, build, test. Commit.

---

### Phase 3: Timeline migration + cleanup (sequential)

#### Task 3.1: Migrate timeline fetching

**Files**: `src/utils.ts`
**LOC**: ~15 changed
**Dependencies**: Phase 2 complete

-   Replace `fetch_timeline()`:
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
-   Remove `POSTS_URL` from secrets object
-   `getTimeline()` stays unchanged (pure transform on `any[]`)

#### Task 3.2: Clean up dead code and env vars

**Files**: `src/utils.ts`, `src/types.ts`, `.env.example`
**LOC**: ~30 removed
**Dependencies**: Task 3.1

In `src/utils.ts`:

-   Remove `devpad_url` constant (if not already removed)
-   Remove `devpad_fetch<T>()` function
-   Remove `BLOG_URL`, `BLOG_TOKEN`, `POSTS_URL` from `secrets` object
-   Remove `BLOG_ENV` object
-   Remove `parseDevBlog()` function
-   Remove `getBlogServerPosts()` export (now internal)
-   Remove `fetchBlogPost()` export (now internal)
-   Clean up `secrets` validation loop (only 2 secrets left: `DEVPAD_API_KEY`, `DEVTO_KEY` — and `DEVPAD_API_KEY` may not even need to be here since it's in client.ts)

In `src/types.ts`:

-   Remove `ApiResult<T>` type
-   Verify all dead types are gone

In `.env.example`:

-   Remove `VITE_BLOG_URL`, `VITE_BLOG_TOKEN`, `VITE_POSTS_URL`
-   Optionally add `VITE_DEVPAD_URL` (with comment that it defaults to production)

#### Task 3.3: Update astro.config.mjs for blog type compatibility

**Files**: `astro.config.mjs`
**LOC**: ~5 changed
**Dependencies**: Phase 2 complete

-   Verify `getBlogPosts()` return type works with `post.group` and `post.slug` accesses
-   Verify `getProjects()` return type works with `project.project_id` access
-   Likely no changes needed if types are aliased correctly

→ **Verification**: typecheck, build, full manual smoke test of all pages. Commit.

---

## Task Summary

| Phase | Task                    | Files                                  | Est. LOC | Parallel?       |
| ----- | ----------------------- | -------------------------------------- | -------- | --------------- |
| 1     | 1.1 Client setup        | `package.json`, `src/client.ts`        | 20       | —               |
| 1     | 1.2 Project types       | `src/types.ts`                         | 15       | After 1.1       |
| 1     | 1.3 Project fetching    | `src/utils.ts`                         | 40       | After 1.1, 1.2  |
| 1     | 1.4 Verify consumers    | 5 `.astro` files, `skills.ts`          | 10       | Parallel w/ 1.3 |
| 2     | 2.1 DisplayPost type    | `src/types.ts`                         | 30       | —               |
| 2     | 2.2 Blog fetching       | `src/utils.ts`                         | 50       | After 2.1       |
| 2     | 2.3 Blog consumers      | 4 `.astro` files                       | 15       | Parallel w/ 2.2 |
| 3     | 3.1 Timeline fetching   | `src/utils.ts`                         | 15       | —               |
| 3     | 3.2 Dead code cleanup   | `utils.ts`, `types.ts`, `.env.example` | 30       | After 3.1       |
| 3     | 3.3 Config verification | `astro.config.mjs`                     | 5        | Parallel w/ 3.2 |

**Total estimated**: ~230 LOC changed/added, ~120 LOC removed

## Breaking Changes

1. **API version v0 → v1**: Project data may differ slightly. The schema type is canonical.
2. **Blog `Post` type shape**: If any external code depends on the old `Post` type, it breaks. All known consumers are internal.
3. **Removed env vars**: `VITE_BLOG_URL`, `VITE_BLOG_TOKEN`, `VITE_POSTS_URL` no longer needed. Deployment configs must be updated.
4. **Removed exports**: `devpad_fetch`, `getBlogServerPosts`, `fetchBlogPost` are removed from utils.ts public API.

---

## Suggested AGENTS.md updates

After this migration completes, the following should be captured in a new `AGENTS.md`:

```markdown
# forbit-astro

## Project Overview

Personal portfolio/blog site built with Astro 4 SSR, deployed as a standalone Node server.

## Key Architecture

-   **Data fetching**: All devpad API calls go through `@devpad/api` client singleton in `src/client.ts`
-   **Caching**: In-memory SWR cache in `src/utils.ts` with 10-min TTL. Cache wraps client calls.
-   **Blog sources**: Two sources — devpad blog API (via client) + dev.to API (raw fetch). Unified via `DisplayPost` adapter type.
-   **Types**: Project types from `@devpad/api` (re-exported via `src/types.ts`). Blog display types are local adapters.

## Env Vars

-   `VITE_DEVPAD_API_KEY` — API key for devpad client
-   `VITE_DEVTO_KEY` — dev.to API key for blog integration
-   `VITE_DEVPAD_URL` — (optional) Override devpad API base URL

## Conventions

-   Astro pages use `export const prerender = false` for SSR pages
-   `astro.config.mjs` has top-level awaits for sitemap generation
-   Process env fallback pattern: `import.meta.env.X ?? process.env.X` (Vite/Node compat)
```
