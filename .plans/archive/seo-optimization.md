# SEO Optimization: OG Tags, OG Images, JSON-LD

## Executive Summary

Add Open Graph meta tags, Twitter Card meta tags, dynamic OG image generation, and JSON-LD structured data to `forbit.dev`. The site currently has basic SEO (title, description, keywords, canonical, robots.txt, sitemap) but is completely missing social sharing metadata and structured data.

**Scope**: ~450 LOC across 12 files (4 new, 8 modified)

---

## Integration Point Analysis

### Files Modified

| File                                    | Change                                             |
| --------------------------------------- | -------------------------------------------------- |
| `src/layouts/Page.astro`                | Add OG/Twitter/JSON-LD meta tags, new props        |
| `src/layouts/Home.astro`                | Pass OG props to Page                              |
| `src/pages/about.astro`                 | Pass OG props to Page                              |
| `src/pages/projects.astro`              | Pass OG props to Page                              |
| `src/pages/projects/[project_id].astro` | Pass OG props (dynamic image URL)                  |
| `src/pages/blog.astro`                  | Pass OG props to Page                              |
| `src/pages/blog/[group]/[slug].astro`   | Pass OG props (dynamic image URL, Article JSON-LD) |
| `src/pages/timeline.astro`              | Pass OG props to Page                              |

### Files Created

| File                                       | Purpose                                                     |
| ------------------------------------------ | ----------------------------------------------------------- |
| `src/lib/og-image.ts`                      | Shared satori + resvg renderer, font loading, design tokens |
| `src/pages/og/project/[project_id].png.ts` | Dynamic OG image for projects                               |
| `src/pages/og/blog/[group]/[slug].png.ts`  | Dynamic OG image for blog posts                             |
| `src/pages/og/default.png.ts`              | Default OG image for static pages                           |

### Dependencies Added

| Package           | Purpose                             |
| ----------------- | ----------------------------------- |
| `satori`          | SVG generation from JSX-like markup |
| `@resvg/resvg-js` | SVG to PNG conversion               |

### No Breaking Changes

All changes are additive. The `Page.astro` props interface gains optional fields only. Existing pages continue to work unchanged until wired up.

---

## Phase 1: Foundation — Dependencies + Layout Meta Tags

**Goal**: Install deps, extend `Page.astro` with OG/Twitter meta tags, and pass through new optional props.

### Task 1.1: Install dependencies (sequential, prerequisite)

-   **Command**: `bun add satori @resvg/resvg-js`
-   **LOC**: 0 (package.json auto-updated)
-   **Files**: `package.json`, `bun.lockb`

### Task 1.2: Update `Page.astro` with OG + Twitter meta tags (sequential, depends on 1.1)

-   **LOC**: ~40
-   **Files**: `src/layouts/Page.astro`
-   **Details**:
    -   Extend `Props` interface with optional fields:
        ```ts
        interface Props {
            title: string
            description: string
            keywords?: string[]
            canonical?: string
            ogImage?: string // Full URL to OG image
            ogType?: string // 'website' | 'article' (default: 'website')
            jsonLd?: Record<string, any> // Arbitrary JSON-LD object to inject
        }
        ```
    -   Compute `ogUrl` from `canonical` (already provided by every page) — no new prop needed.
    -   Add to `<head>`:

        ```html
        <!-- Open Graph -->
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content={ogType ?? 'website'} />
        {canonical && <meta property="og:url" content={canonical} />}
        <meta property="og:site_name" content="forbit" />
        {ogImage && <meta property="og:image" content={ogImage} />}
        {ogImage && <meta property="og:image:width" content="1200" />}
        {ogImage && <meta property="og:image:height" content="630" />}

        <!-- Twitter Card -->
        <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}

        <!-- JSON-LD -->
        {jsonLd && <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />}
        ```

    -   Destructure new props with defaults in frontmatter.

**Phase 1 Verification**: `bun run build` should pass. All pages render as before (new props are optional with no default ogImage yet — tags simply omit the image).

---

## Phase 2: OG Image Generation

**Goal**: Create the satori + resvg rendering pipeline and three OG image endpoints.

### Task 2.1: Shared OG image renderer (`src/lib/og-image.ts`) (sequential, foundation for 2.2-2.4)

-   **LOC**: ~100
-   **Files**: `src/lib/og-image.ts` (new)
-   **Details**:
    -   Export `renderOgImage(jsx: SatoriNode): Promise<Buffer>` — takes satori JSX, returns PNG buffer.
    -   Load font: fetch Inter from Google Fonts CDN at startup (or bundle a `.woff` in `src/assets/fonts/`). Cache the ArrayBuffer in module scope so it's only fetched once per server lifecycle.
        -   Use Inter 400 + Inter 700 (two weights).
        -   Satori requires `.woff` or `.ttf` format — Google Fonts serves these via direct URL.
    -   Export design token constants matching the UI theme:
        ```ts
        export const OG = {
            bg: '#1a1a2e', // oklch(21% 0.015 280) ≈ this hex
            bgAlt: '#242440', // oklch(27% 0.02 290)
            border: '#353555', // oklch(32% 0.02 290)
            fg: '#ffffff', // white
            fgMuted: '#c8c8d8', // oklch(85% 0.02 290)
            fgSubtle: '#a0a0b8', // oklch(75% 0.02 290)
            accent: '#8888b0', // oklch(70% 0.035 280)
            success: '#66cc88', // oklch(0.85 0.1 150)
            error: '#cc6666', // oklch(0.85 0.1 20)
            warning: '#ccaa44', // oklch(0.85 0.12 85)
            info: '#6688cc', // oklch(0.85 0.1 240)
            width: 1200,
            height: 630,
        } as const
        ```
    -   Export `statusColor(status: string): string` helper mapping project status to badge color.
    -   Satori options: width 1200, height 630, fonts array with loaded Inter buffers.
    -   Use `@resvg/resvg-js` `Resvg` class to convert SVG string → PNG buffer.

### Task 2.2: Default OG image endpoint (parallel with 2.3, 2.4 — after 2.1)

-   **LOC**: ~60
-   **Files**: `src/pages/og/default.png.ts` (new)
-   **Details**:
    -   Astro API route (`export const GET`).
    -   Renders a simple OG card:
        -   Dark background (`OG.bg`)
        -   "forbit" in large white text (centered or left-aligned)
        -   Tagline: "Software Developer & Open Source Contributor" in muted text
        -   Site URL `forbit.dev` in subtle text at bottom
        -   Subtle decorative border or accent line
    -   Returns `new Response(pngBuffer, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } })`.

### Task 2.3: Project OG image endpoint (parallel with 2.2, 2.4 — after 2.1)

-   **LOC**: ~80
-   **Files**: `src/pages/og/project/[project_id].png.ts` (new)
-   **Details**:
    -   Astro API route with dynamic param `project_id`.
    -   Fetch project via `getProject(project_id)` from `src/utils.ts`.
    -   Look up technologies via `TECH_MAP[project_id]` from `src/assets/technology.ts`.
    -   If project not found, return a fallback "Project Not Found" image or redirect to default.
    -   Render OG card:
        -   Dark background
        -   Project name in large white text
        -   Description in muted text (truncated to ~120 chars)
        -   Status badge (colored text matching `statusColor`)
        -   Technology pills row at bottom (each tech name in a small rounded box)
        -   `forbit.dev` watermark in corner
    -   Cache-Control: `public, max-age=3600` (1 hour, projects update more frequently).

### Task 2.4: Blog OG image endpoint (parallel with 2.2, 2.3 — after 2.1)

-   **LOC**: ~70
-   **Files**: `src/pages/og/blog/[group]/[slug].png.ts` (new)
-   **Details**:
    -   Astro API route with dynamic params `group`, `slug`.
    -   Fetch post via `getBlogPost(group, slug)` from `src/utils.ts`.
    -   If post not found, redirect to default.
    -   Render OG card:
        -   Dark background
        -   Post title in large white text (truncated to ~80 chars if needed)
        -   Description in muted text
        -   Published date formatted nicely
        -   Tag pills at bottom (from `tag_list`)
        -   `forbit.dev` watermark
    -   Cache-Control: `public, max-age=3600`.

**Phase 2 Verification**: `bun run build` passes. Manually test endpoints:

-   `GET /og/default.png` → valid PNG
-   `GET /og/project/devpad.png` → valid PNG with project data
-   `GET /og/blog/dev/some-slug.png` → valid PNG with blog data

---

## Phase 3: JSON-LD Structured Data

**Goal**: Create JSON-LD generators for Article (blog posts) and WebSite/Person (site-wide).

### Task 3.1: JSON-LD helper functions (sequential)

-   **LOC**: ~60
-   **Files**: `src/lib/json-ld.ts` (new)
-   **Details**:
    -   Export `websiteJsonLd()`:
        ```ts
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "forbit",
          "url": "https://forbit.dev",
          "author": {
            "@type": "Person",
            "name": "forbit",
            "url": "https://forbit.dev/about"
          }
        }
        ```
    -   Export `personJsonLd()`:
        ```ts
        {
          "@context": "https://schema.org",
          "@type": "Person",
          "name": "forbit",
          "url": "https://forbit.dev",
          "sameAs": [] // can add social links later
        }
        ```
    -   Export `articleJsonLd(post: Post, url: string, ogImage: string)`:
        ```ts
        {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title,
          "description": post.description,
          "image": ogImage,
          "datePublished": post.published_at,
          "author": {
            "@type": "Person",
            "name": "forbit",
            "url": "https://forbit.dev/about"
          },
          "publisher": {
            "@type": "Person",
            "name": "forbit",
            "url": "https://forbit.dev"
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": url
          },
          "keywords": post.tag_list
        }
        ```
    -   Keep it simple — no `SoftwareApplication` schema for projects (diminishing returns, not a standard use case).

**Phase 3 Verification**: `bun run build` passes. JSON-LD module exports correct shapes.

---

## Phase 4: Wire Up All Pages

**Goal**: Pass `ogImage`, `ogType`, and `jsonLd` props to `Page.astro` from every page.

### Task 4.1: Static pages — Home, About, Projects listing, Blog listing, Timeline (parallel with 4.2, 4.3)

-   **LOC**: ~30
-   **Files**: `src/layouts/Home.astro`, `src/pages/about.astro`, `src/pages/projects.astro`, `src/pages/blog.astro`, `src/pages/timeline.astro`
-   **Details**:
    -   All static pages use the default OG image: `ogImage="https://forbit.dev/og/default.png"`
    -   Home page also gets `jsonLd={websiteJsonLd()}`.
    -   About page gets `jsonLd={personJsonLd()}`.
    -   All keep `ogType="website"` (default, no prop needed).

### Task 4.2: Project detail page (parallel with 4.1, 4.3)

-   **LOC**: ~10
-   **Files**: `src/pages/projects/[project_id].astro`
-   **Details**:
    -   Compute `ogImage={`https://forbit.dev/og/project/${project_id}.png`}`
    -   Pass to `<Page>`.

### Task 4.3: Blog post page (parallel with 4.1, 4.2)

-   **LOC**: ~15
-   **Files**: `src/pages/blog/[group]/[slug].astro`
-   **Details**:
    -   Compute `ogImage={`https://forbit.dev/og/blog/${group}/${slug}.png`}`
    -   Pass `ogType="article"`.
    -   Import `articleJsonLd` from `src/lib/json-ld.ts`.
    -   Compute and pass `jsonLd={articleJsonLd(post, canonical, ogImage)}`.

**Phase 4 Verification**: `bun run build` passes. View page source for each page type and confirm:

-   OG tags present with correct content
-   Twitter Card tags present
-   JSON-LD script tags present on home, about, and blog post pages
-   OG image URLs are correct and resolve

---

## Task Dependency Graph

```
Phase 1 (sequential):
  1.1 Install deps
  1.2 Update Page.astro (depends on 1.1)
  → Verify + Commit

Phase 2 (partial parallel):
  2.1 Shared renderer (sequential, foundation)
  → then parallel:
    2.2 Default OG endpoint
    2.3 Project OG endpoint
    2.4 Blog OG endpoint
  → Verify + Commit

Phase 3 (sequential):
  3.1 JSON-LD helpers
  → Verify + Commit

Phase 4 (parallel):
  4.1 Static pages (Home, About, Projects, Blog, Timeline)
  4.2 Project detail page
  4.3 Blog post page
  → Verify + Commit
```

## LOC Summary

| Task                     | Est. LOC | Files                 |
| ------------------------ | -------- | --------------------- |
| 1.2 Page.astro meta tags | 40       | 1 modified            |
| 2.1 OG renderer          | 100      | 1 new                 |
| 2.2 Default OG endpoint  | 60       | 1 new                 |
| 2.3 Project OG endpoint  | 80       | 1 new                 |
| 2.4 Blog OG endpoint     | 70       | 1 new                 |
| 3.1 JSON-LD helpers      | 60       | 1 new                 |
| 4.1 Static pages wiring  | 30       | 5 modified            |
| 4.2 Project page wiring  | 10       | 1 modified            |
| 4.3 Blog page wiring     | 15       | 1 modified            |
| **Total**                | **~465** | **5 new, 8 modified** |

## Design Decisions

1. **No `ogUrl` prop** — every page already passes `canonical`, which is the same value. Compute `og:url` from `canonical` in `Page.astro`.

2. **Font loading strategy** — fetch Inter from Google Fonts CDN on first request, cache in module scope. Avoids bundling font files in the repo. If the CDN is unreliable, fall back to bundling `.woff` files in `src/assets/fonts/`.

3. **No dedicated `<SEO>` component** — the meta tags live directly in `Page.astro`'s `<head>`. This keeps the architecture flat (one layout, one place for meta). If the site grows to have multiple layouts, extract then.

4. **JSON-LD only for articles + site/person** — no `SoftwareApplication` schema for projects. Google doesn't use it for portfolio sites, and it's not worth the complexity.

5. **OG image caching** — default image cached 24h, dynamic images cached 1h. Since all pages are SSR, the OG endpoints are also SSR and generate on each uncached request. This is fine for the expected traffic.

6. **Image dimension**: 1200x630px, the standard for OG images. Twitter summary_large_image also works at this size.

---

## Suggested AGENTS.md Updates

After implementation, consider adding:

```markdown
## OG Image Generation

-   OG images rendered server-side via satori + @resvg/resvg-js
-   Endpoints: `/og/default.png`, `/og/project/[id].png`, `/og/blog/[group]/[slug].png`
-   Design tokens in `src/lib/og-image.ts` must stay in sync with @f0rbit/ui CSS custom properties
-   Fonts loaded from Google Fonts CDN, cached in module scope (server restart clears cache)
-   All meta tags (OG, Twitter, JSON-LD) managed in `src/layouts/Page.astro` <head>
```
