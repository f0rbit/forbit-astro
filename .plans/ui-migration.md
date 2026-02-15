# UI Migration: Tailwind CSS → @f0rbit/ui

## Executive Summary

Replace the Tailwind CSS utility-class approach across the entire forbit-astro site with the `@f0rbit/ui` SolidJS component library + its CSS utility classes. The migration covers 2 layouts, 7 pages, 23 components, and 3 config/CSS files — roughly **every rendered file** in the project.

**Core philosophy**: Components + utility classes over utility-class-only. No background fills on cards. 1px borders for structure. Let `@f0rbit/ui`'s design tokens handle the color system.

## Current State

```
src/
├── layouts/
│   ├── Page.astro          ← Tailwind body classes, Google Font import
│   └── Home.astro          ← Thin wrapper
├── pages/ (7 files)        ← Tailwind grid/flex/gap classes everywhere
├── components/
│   ├── CenteredContainer   ← Tailwind responsive padding
│   ├── CompactText         ← Custom CSS clamp + Tailwind
│   ├── Navigation          ← Tailwind border/flex + astro-navbar
│   ├── Footer              ← Tailwind border/flex
│   ├── ProjectCard         ← Tailwind border/flex/gap
│   ├── projects/ (8 files) ← Mix of Tailwind classes
│   ├── blog/ (3 files)     ← Tailwind border/grid/button
│   ├── activity/ (2 files) ← Tailwind absolute positioning + borders
│   └── about/ (6 files)    ← Tailwind grid/flex + SolidJS islands
├── global.css              ← @apply directives (heading/article styles)
├── tailwind.config.cjs     ← Custom color palette, font config
└── astro.config.mjs        ← @astrojs/tailwind integration
```

## Target State

```
src/
├── layouts/
│   ├── Page.astro          ← imports @f0rbit/ui/styles, uses design tokens
│   └── Home.astro          ← No changes needed
├── pages/ (7 files)        ← .stack, .row, .grid, .center-wide classes
├── components/
│   ├── [CenteredContainer] ← DELETED (replaced by .center-wide)
│   ├── [CompactText]       ← DELETED (replaced by <Clamp> component)
│   ├── Navigation          ← @f0rbit/ui utility classes
│   ├── Footer              ← @f0rbit/ui utility classes
│   ├── ProjectCard         ← <Card> + <Badge> + <Button>
│   ├── projects/ (8 files) ← <Card>, <Badge>, <Status>, <Button>
│   ├── blog/ (3 files)     ← <Card>, <Button>, .grid
│   ├── activity/ (2 files) ← Custom timeline with @f0rbit/ui utilities
│   └── about/ (6 files)    ← <Card>, <Badge>, <Clamp>, .grid
├── global.css              ← Article styles using CSS vars, NO @apply
├── [tailwind.config.cjs]   ← DELETED
└── astro.config.mjs        ← Tailwind integration REMOVED
```

## Key Architecture Decisions

### DECISION 1: Full Tailwind removal (DECIDED — remove)

Remove Tailwind entirely. @f0rbit/ui provides its own layout utilities (`.stack`, `.row`, `.grid`, `.center`), text utilities, and design tokens. Keeping Tailwind would create CSS specificity conflicts (both use `@layer`) and contradicts the goal of going all-in on @f0rbit/ui. The reference sites use zero Tailwind.

### DECISION 2: CenteredContainer → `.center-wide` + custom CSS (DECIDED — replace)

The current `CenteredContainer` uses responsive padding (`px-4 sm:px-8 lg:px-32 xl:px-48 3xl:px-[26rem]`). @f0rbit/ui has `.center-wide` (90ch max-width). The site's current approach creates _very_ wide gutters on large screens — `.center-wide` is actually a better fit for content readability. We'll use `.center-wide` for most pages and add a single custom CSS rule for the homepage hero sections where wider content is needed.

### DECISION 3: Google Font Sarabun → @f0rbit/ui system font stack (DECIDED — remove)

Drop Sarabun. The @f0rbit/ui system font stack (`--font`) is used across all reference sites. This reduces page load time (no font download) and ensures visual consistency with the design system. The Google Font import will be removed.

### DECISION 4: Article/prose styles → custom `article.css` with @f0rbit/ui tokens (DECIDED)

Without Tailwind Typography, we need standalone article styles. We'll rewrite `global.css` to use @f0rbit/ui CSS variables (`var(--fg)`, `var(--fg-muted)`, `var(--border)`, etc.) instead of `@apply` directives. Keep the same heading hierarchy and list styles.

### DECISION 5: Activity Timeline → keep custom, not @f0rbit/ui Timeline (DECIDED)

The current Timeline has complex commit grouping logic, collapsible `<details>`, project-specific filtering, etc. The @f0rbit/ui `Timeline` component takes a flat `items[]` array — it's too simple for this use case. **Keep the custom Timeline structure** but restyle using @f0rbit/ui utility classes. Use `Collapsible` for the grouped commits `<details>` replacement.

### DECISION 6: Experience Timeline → keep custom (DECIDED)

The experience timeline has two modes: `left` (vertical) and `middle` (alternating two-column). This is more complex than @f0rbit/ui's Timeline. Keep custom layout, use @f0rbit/ui utility classes for styling.

### DECISION 7: Hydration strategy (DECIDED)

-   **Static render (no `client:*` needed)**: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `Badge`, `Button` (without `loading`), `Status`, `Stat` — These are pure render functions with no signals/effects.
-   **Needs `client:load`**: `Clamp`, `Collapsible`, `Dropdown` — These use `createSignal` internally.
-   Components already using `client:load` (`Typewriter`, `SkillSelector`, `PublishTime`) keep their directives.

### DECISION NEEDED: astro-navbar dependency

`Navigation.astro` uses `astro-navbar` (`Astronav`, `MenuItems`, `MenuIcon`) for mobile menu toggle. This is independent of Tailwind — it generates its own toggle logic. Options:

1. **Keep `astro-navbar`** and just restyle with @f0rbit/ui classes (simplest)
2. **Replace with a custom mobile menu** using @f0rbit/ui's `Collapsible` or a simple JS toggle

**Recommendation**: Keep `astro-navbar` for now — it works, it's not Tailwind-specific, and replacing it is scope creep. Just restyle the classes.

---

## Risk Assessment

| Risk                                                       | Impact | Mitigation                                                            |
| ---------------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| @f0rbit/ui CSS conflicts with remaining inline styles      | Medium | Remove ALL Tailwind classes first, then apply @f0rbit/ui              |
| SolidJS SSR issues with Card/Badge components              | High   | Test in Phase 1 — if SSR fails, wrap in `client:load`                 |
| `.center-wide` too narrow for some layouts                 | Low    | Can override with `style="max-width: ..."` or custom class            |
| Lost responsive behavior (Tailwind breakpoints → auto-fit) | Medium | @f0rbit/ui `.grid` is auto-fit (min 250px) — actually more responsive |
| Article styles break without @apply                        | Medium | Rewrite to plain CSS with design tokens in Phase 0                    |
| Homepage two-column layout (content + sidebar)             | Low    | Use CSS grid with explicit columns — no framework needed              |

## Rollback Strategy

Each phase is independently committable. If Phase N fails:

1. `git revert` the Phase N commit
2. The previous phase's commit is a working state
3. Fix and re-attempt

---

## Phase Breakdown

### Phase 0: Foundation — Install @f0rbit/ui, rewrite global CSS, remove Tailwind

**Goal**: Swap the CSS foundation. After this phase, the site will look mostly broken but the infrastructure is correct.

#### Task 0.1: Install @f0rbit/ui and update astro.config

**Files**: `package.json`, `astro.config.mjs`
**Est. LOC**: ~10
**Deps**: None

-   `bun add @f0rbit/ui`
-   Remove `@astrojs/tailwind` from `astro.config.mjs` integrations array
-   Remove `tailwind` import from `astro.config.mjs`

#### Task 0.2: Update Page.astro layout — import styles, remove Tailwind classes

**Files**: `src/layouts/Page.astro`
**Est. LOC**: ~15
**Deps**: Task 0.1

-   Add `import "@f0rbit/ui/styles";` in frontmatter
-   Replace `class="text-base-text-subtlish bg-base-bg-primary"` on `<body>` with no class (or blank — @f0rbit/ui sets `body` styles via reset + tokens)
-   The `pb-4` and `minHeight` calc can use plain CSS

#### Task 0.3: Rewrite global.css — remove @apply, use CSS variables

**Files**: `src/global.css`
**Est. LOC**: ~80
**Deps**: Task 0.1

Replace all `@apply` directives with plain CSS using @f0rbit/ui design tokens:

**Current** → **New** mapping:

```css
/* Links */
html a {
    @apply text-blue-400 hover:text-blue-500;
}
→ html a {
    color: var(--accent);
}
html a:hover {
    opacity: 0.8;
}

/* Headings */
html h1 {
    @apply text-3xl font-bold text-base-text-primary;
}
→ html h1 {
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--fg);
    line-height: unset;
}

html h2 {
    @apply text-2xl font-bold text-base-text-primary;
}
→ html h2 {
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--fg);
}

html h3 {
    @apply text-xl font-bold text-base-text-secondary;
}
→ html h3 {
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--fg-muted);
}

html h4,
html h5 {
    @apply text-lg font-semibold text-base-text-secondary;
}
→ html h4,
html h5 {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--fg-muted);
}

/* Article styles — same pattern, all @apply → CSS vars */
article h1 {
    font-size: var(--text-4xl);
} /* was text-5xl, scaled down */
article h2 {
    font-size: var(--text-3xl);
}
article h3 {
    font-size: var(--text-2xl);
}
article h4,
article h5 {
    font-size: var(--text-xl);
}
article h1,
h2,
h3,
h4,
h5,
h6 {
    margin-top: 1rem;
    margin-bottom: 0.25rem;
}

/* Lists */
article ul {
    list-style: disc;
    list-style-position: inside;
}
article ol {
    list-style: decimal;
    list-style-position: inside;
}
article ul > li > ul > li,
article ol > li > ol > li {
    margin-left: 1.5rem;
}
article ul > li::marker,
ol > li::marker {
    color: var(--fg-faint);
}

/* Spacing */
article p + p {
    margin-top: 2ch;
}

/* Code */
article pre > code {
    display: flex;
    padding: var(--space-md);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    overflow: auto;
}
article pre {
    padding: var(--space-sm);
    background: var(--bg);
}
article code {
    font-size: var(--text-sm);
    background: var(--bg-alt);
    padding: 2px 6px;
    display: inline-flex;
}

/* Images */
article img {
    width: 100%;
    height: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 4px;
}

/* Blockquotes */
article blockquote {
    border-left: 4px solid var(--border);
    padding-left: 0.5rem;
}

/* Specification article */
article.specification h1 {
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--fg);
}
article.specification h2 {
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--fg-muted);
}
article.specification h3 {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--fg-muted);
}

/* Remove Google Font import */
/* (remove) @import url('https://fonts.googleapis.com/css2?family=Sarabun&display=swap'); */
```

Also remove `.tech-list li::marker` (will handle inline).

#### Task 0.4: Delete tailwind.config.cjs

**Files**: `tailwind.config.cjs`
**Est. LOC**: -76 (deletion)
**Deps**: Task 0.3

Delete the file entirely. All color tokens are now @f0rbit/ui CSS variables.

#### Task 0.5: Remove Tailwind dependencies from package.json

**Files**: `package.json`
**Est. LOC**: ~5
**Deps**: Task 0.1

Remove from `dependencies`: `tailwindcss`, `@astrojs/tailwind`
Remove from `devDependencies`: `@tailwindcss/typography`
Run `bun install` to clean lockfile.

**Phase 0 Parallelism**: Tasks 0.1 must be first. Then 0.2, 0.3, 0.4, 0.5 can run in parallel (different files). BUT 0.5 touches package.json which 0.1 also touches — so 0.5 should run after 0.1.

**Phase 0 Execution Order**:

1. Task 0.1 (sequential — foundation)
2. Tasks 0.2, 0.3, 0.4 (parallel — different files)
3. Task 0.5 (sequential — needs 0.1 done to know what to remove)
4. Verification: `bun run build` to confirm no @apply errors, styles.css loads

---

### Phase 1: Core Infrastructure — Layouts, Navigation, Footer, CenteredContainer removal

**Goal**: All shared layout components migrated. Pages will still have broken classes but the shell is correct.

#### Task 1.1: Delete CenteredContainer.astro, update all imports

**Files**: `src/components/CenteredContainer.astro` (DELETE), plus every file that imports it
**Est. LOC**: ~60 changes across files
**Deps**: Phase 0

CenteredContainer is imported in:

-   `src/pages/index.astro` (4 uses)
-   `src/pages/about.astro` (1 use)
-   `src/pages/blog.astro` (1 use)
-   `src/pages/projects.astro` (1 use)
-   `src/pages/timeline.astro` (1 use)
-   `src/pages/projects/[project_id].astro` (1 use)
-   `src/components/Footer.astro` (1 use)

Replace `<CenteredContainer class="...">` with `<div class="center-wide ...">` (or `<main class="center-wide ...">`).

The `tag` prop (`tag="main"`, `tag="div"`) means we need to pick the right HTML element. Use `<main>` where it was `tag="main"`, `<div>` otherwise.

The `class` prop forwarding — just merge into the `center-wide` class string.

**Important**: The homepage index.astro has 4 CenteredContainer usages, some nested in `<main>`. Since `center-wide` is `max-width: 90ch; margin-inline: auto; padding-inline: var(--space-lg)`, it should work well. For the homepage hero which is full-width, it doesn't use CenteredContainer anyway (it's `w-full h-screen`).

#### Task 1.2: Migrate Navigation.astro

**Files**: `src/components/Navigation.astro`
**Est. LOC**: ~30
**Deps**: Phase 0

Replace Tailwind classes:

```
Current: lg:flex items-center gap-5 justify-center border-borders-primary border-b-1 mb-3 p-3 ${home ? "border-t-1" : ""}
New:     row (on desktop) + border-bottom + padding

Current: flex w-full lg:w-max justify-between
New:     row-between

Current: block lg:hidden ml-auto
New:     hide-desktop (or media query in scoped style)

Current: hidden lg:flex font-medium pt-3 lg:pt-0
New:     (controlled by astro-navbar show/hide)

Current: flex flex-col lg:flex-row gap-2 lg:gap-5 text-lg
New:     stack on mobile, row on desktop, text-lg
```

The scoped style `@apply text-white hover:text-blue-500` → plain CSS:

```css
#navbar a {
    color: var(--fg);
}
#navbar a:hover {
    color: var(--accent);
}
```

Also: `text-base-text-primary` on MenuIcon → remove, let token handle it.

**Note**: Keep `astro-navbar` as-is. We're only restyling the CSS classes.

#### Task 1.3: Migrate Footer.astro

**Files**: `src/components/Footer.astro`
**Est. LOC**: ~15
**Deps**: Task 1.1 (CenteredContainer removed, need .center-wide)

Replace:

```
border-t-1 border-borders-primary → border-top style using var(--border)
flex flex-row justify-between h-4 my-3 → row-between
flex flex-row gap-1 items-center → row-sm
```

Replace CenteredContainer with `.center-wide`.

**Phase 1 Parallelism**: Task 1.1 touches pages + CenteredContainer. Task 1.2 touches Navigation only. Task 1.3 touches Footer only BUT depends on 1.1 for CenteredContainer removal pattern. Run 1.2 in parallel with 1.1. Run 1.3 after 1.1.

Actually — Task 1.1 touches ALL page files. If we need to also do page-level class migration later (Phase 5), we have a conflict. **Resolution**: Task 1.1 ONLY replaces CenteredContainer imports/usage — it does NOT migrate other Tailwind classes in the pages. Phase 5 handles the remaining page-level classes.

**Phase 1 Execution Order**:

1. Tasks 1.1, 1.2 (parallel — different files, though 1.1 touches pages and Footer)
    - Actually, 1.1 touches Footer.astro too (removes CenteredContainer import). And 1.3 also touches Footer.astro. **Conflict!**
    - Solution: Task 1.1 handles CenteredContainer replacement everywhere INCLUDING Footer. Task 1.3 then handles the remaining Tailwind class migration in Footer. This means 1.3 depends on 1.1.
2. Task 1.3 (after 1.1)
3. Verification: `bun run build`, check navigation renders, footer renders

---

### Phase 2: Card-based Components

**Goal**: All card patterns use `<Card>` / `<CardHeader>` / `<CardContent>` / `<CardFooter>`.

#### Task 2.1: Migrate ProjectCard.astro

**Files**: `src/components/ProjectCard.astro`
**Est. LOC**: ~45
**Deps**: Phase 1

**Current structure**:

```html
<div class="flex items-center flex-col gap-4 rounded border border-borders-primary px-2 py-1 text-base-text-secondary">
    <a href="..."><h2 class="text-2xl hover:text-blue-500">{name}</h2></a>
    <p class="w-full h-full px-4">{description}</p>
    <div class="flex flex-row gap-2 flex-wrap justify-center">
        <Status ... />
        <div class="rounded border ..."><a href="...">GitHub</a></div>
        <div class="rounded border ..."><a href="...">{link_text}</a></div>
        <div class="rounded border ...">tech icons</div>
    </div>
</div>
```

**New structure**:

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Badge } from "@f0rbit/ui";

<Card>
    <CardHeader>
        <CardTitle><a href={`/projects/${project.project_id}`}>{project.name}</a></CardTitle>
    </CardHeader>
    <CardContent>
        <p class="text-muted">{project.description}</p>
    </CardContent>
    <CardFooter>
        <div class="cluster">
            <Status status={project.status} />
            {project.repo_url && <Badge><a href={project.repo_url}><Github size={16} /> GitHub</a></Badge>}
            {project.link_url && <Badge><a href={project.link_url}>{project.link_text}</a></Badge>}
            {technologies.length > 0 && <Badge>{technologies.map(...)}</Badge>}
        </div>
    </CardFooter>
</Card>
```

The card title link hover: use `.interactive` class on the card, or style `a` within CardTitle.

#### Task 2.2: Migrate BlogCard.astro

**Files**: `src/components/blog/BlogCard.astro`
**Est. LOC**: ~30
**Deps**: Phase 1

**Current**:

```html
<div class="p-3 rounded border-borders-primary border flex flex-col gap-2">
    <h3 ...>{title}</h3>
    <p class="text-base-text-subtle flex-grow">{description}</p>
    <div class="flex justify-center flex-row gap-2">
        <button class="bg-base-accent-primary px-4 py-1 border-borders-secondary border rounded hover:bg-base-accent-secondary">Read</button>
    </div>
</div>
```

**New**:

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Button } from '@f0rbit/ui'

;<Card>
    <CardHeader>
        <CardTitle transition:name={'title-' + post.slug}>{post.title}</CardTitle>
    </CardHeader>
    <CardContent>
        <p class="text-subtle">{post.description}</p>
    </CardContent>
    <CardFooter>
        <div class="row">
            <a href={`/blog/${relative_url}`}>
                <Button variant="secondary" size="sm">
                    Read
                </Button>
            </a>
            {post.url && (
                <a href={post.url}>
                    <Button variant="ghost" size="sm">
                        Visit
                    </Button>
                </a>
            )}
        </div>
    </CardFooter>
</Card>
```

**Note on `transition:name`**: Astro's view transition API adds `transition:name` to elements. This works on any HTML element. Since `CardTitle` renders as a heading, this should work. If not, wrap in a span with the transition name.

#### Task 2.3: Migrate ExperienceCard.astro

**Files**: `src/components/about/ExperienceCard.astro`
**Est. LOC**: ~50
**Deps**: Phase 1

This is a timeline card with absolute positioning for the dot. Keep the dot + relative positioning. Replace:

-   `border border-borders-primary rounded px-2 py-1` (award badges) → `<Badge>` component
-   `text-sm scale-[0.75] pb-1 mt-[2px] border border-base-accent-tertiary px-2 rounded capitalize` (type tag) → `<Badge>`
-   `text-base-text-subtle` → `text-subtle`
-   `flex flex-col gap-1` → `stack-sm`
-   `flex flex-row gap-2` → `row`

The experience card is NOT a full `<Card>` component because it's part of a custom timeline layout with absolute dots and connecting lines. Keep the outer `<div>` structure, just replace classes.

**CompactText replacement**: This card uses `<CompactText text={} id={}>`. Replace with `<Clamp client:load lines={2} showMoreText="Read More" showLessText="Read Less"><p>{text}</p></Clamp>`.

#### Task 2.4: Migrate SkillCard.tsx (SolidJS)

**Files**: `src/components/about/SkillCard.tsx`
**Est. LOC**: ~30
**Deps**: Phase 1

**Current**:

```tsx
<div className="border border-borders-primary flex flex-col items-center justify-center px-4 p-2 rounded transition-colors duration-150 hover:bg-base-accent-primary hover:border-borders-secondary">
```

**New**: Use `<Card interactive>` from @f0rbit/ui. Since this is already a `.tsx` file (SolidJS component), import Card directly:

```tsx
import { Card, CardContent } from '@f0rbit/ui'

;<Card interactive={!header}>
    <CardContent>
        <div class="stack-sm" style={{ 'text-align': 'center' }}>
            <h3>{skill}</h3>
            <SkillSubheading information={information} />
        </div>
    </CardContent>
</Card>
```

Also update `SkillSubheading`:

-   `text-base-text-subtlish font-semibold` → `text-muted font-bold`
-   `text-base-text-subtle` → `text-subtle`
-   `flex flex-row gap-1` → `row-sm`

**Note**: In SolidJS, use `class` not `className`. Wait — the existing code uses `className`. Since this is a SolidJS component rendered in Astro, `className` works. But @f0rbit/ui components use `class`. To be consistent, switch to `class` (SolidJS supports both, `class` is preferred in Solid).

#### Task 2.5: Migrate SkillSelector.tsx (SolidJS)

**Files**: `src/components/about/SkillSelector.tsx`
**Est. LOC**: ~35
**Deps**: Task 2.4 (shares SkillCard)

Replace:

-   `className="flex flex-col gap-2"` → `class="stack"`
-   `className="flex items-center gap-y-0 flex-col"` → `class="stack-sm"` with center align
-   `className="flex flex-row gap-2 items-center"` → `class="row"`
-   `className="flex flex-row gap-1"` → `class="row-sm"`
-   `className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2"` → `class="grid"`

Since SkillSelector already has `client:load`, no hydration issues.

#### Task 2.6: Migrate AboutMe.astro

**Files**: `src/components/about/AboutMe.astro`
**Est. LOC**: ~25
**Deps**: Phase 1

**Current**:

```html
<div class="flex gap-4 flex-col lg:flex-row items-center lg:items-unset">
    <div class="lg:w-max flex items-center justify-center">avatar</div>
    <ul class="w-min lg:w-max whitespace-nowrap px-3 py-2 border rounded border-borders-primary">
        <li class="flex flex-row gap-2">...</li>
    </ul>
    <div class="lg:self-start">bio text</div>
</div>
```

**New**: Use a `Card` for the info list:

```tsx
import { Card, CardContent } from '@f0rbit/ui'

;<div class="row-lg" style={{ 'flex-wrap': 'wrap', 'align-items': 'start' }}>
    <div>avatar</div>
    <Card>
        <CardContent>
            <ul class="stack-sm">
                <li class="row">
                    <Laptop2 size={18} /> Software Engineer
                </li>
                ...
            </ul>
        </CardContent>
    </Card>
    <div>
        <p class="text-muted">bio text...</p>
        {more && <a href="/about">More Information</a>}
    </div>
</div>
```

#### Task 2.7: Migrate ProjectPage.astro

**Files**: `src/components/projects/ProjectPage.astro`
**Est. LOC**: ~60
**Deps**: Phase 1

This is the project detail view with two sections (main content + sidebar). Replace:

-   `flex flex-row gap-2 flex-wrap` → `cluster`
-   `rounded border border-borders-primary px-2 py-1 font-bold` → `<Badge>` for GitHub/link badges
-   Version badge: `border-1 border-accent-btn-primary ... rounded-md font-bold text-sm` → `<Badge variant="accent">`
-   `flex flex-col gap-0 tech-list` → `stack-sm`
-   `flex flex-row gap-2 items-center` → `row`

The sidebar "Recent Commits" section stays as-is (structure), just class migration.

#### Task 2.8: Migrate Specification.astro

**Files**: `src/components/projects/Specification.astro`
**Est. LOC**: ~5
**Deps**: Phase 0 (needs global.css article styles)

**Current**:

```html
<div class="prose prose-neutral prose-invert max-w-[unset] prose-a:text-blue-600 prose-img:rounded-xl"></div>
```

**New**: Remove prose classes entirely (they're from `@tailwindcss/typography`). The `article.specification` styles in `global.css` handle article rendering. Just use:

```html
<div>
    <slot />
</div>
```

**Phase 2 Parallelism**: All tasks touch different files. Tasks 2.1-2.3, 2.6-2.8 are Astro components. Tasks 2.4-2.5 are SolidJS. Task 2.5 depends on 2.4 (imports SkillCard).

**Phase 2 Execution Order**:

1. Tasks 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 2.8 (parallel — all different files)
2. Task 2.5 (after 2.4 — imports SkillCard which 2.4 changes)
3. Verification: `bun run build`, spot-check card rendering

---

### Phase 3: Status, Badge, and Tag Components

**Goal**: All status indicators, tech tags, award badges, and skill events use @f0rbit/ui `Badge`/`Status`.

#### Task 3.1: Migrate Status.astro (project status)

**Files**: `src/components/projects/Status.astro`
**Est. LOC**: ~40
**Deps**: Phase 2

**Current**: Custom div with color-coded border + icon + label.

**Option A**: Use `<Status>` component. But @f0rbit/ui Status only has 4 states (active/inactive/error/pending). Project has 7 statuses (DEVELOPMENT, RELEASED, STOPPED, LIVE, FINISHED, PAUSED, ABANDONED).

**Option B**: Use `<Badge>` with appropriate variant. Map:

-   DEVELOPMENT → `<Badge variant="accent">` (purple = development)
-   LIVE, FINISHED, RELEASED → `<Badge variant="success">` (green)
-   STOPPED, ABANDONED → `<Badge variant="error">` (red)
-   PAUSED → `<Badge variant="warning">` (orange/yellow)

**Decision**: Use `<Badge>` with icons. The Badge component supports children including icons:

```tsx
import { Badge } from '@f0rbit/ui'

;<Badge variant={getVariant(status)}>
    <span class="row-sm">
        {icon} <span>{status.toLowerCase()}</span>
    </span>
</Badge>
```

Keep the lucide icon switch statement. Add a `getVariant` helper.

#### Task 3.2: Migrate SkillEvents.astro

**Files**: `src/components/about/SkillEvents.astro`
**Est. LOC**: ~20
**Deps**: Phase 1

**Current**:

```html
<div class="flex flex-row gap-2 border border-borders-primary rounded px-2 py-1">
    <span class="flex flex-row gap-1 items-center">{icons}</span>
    <span>{skill}</span>
</div>
```

**New**:

```tsx
import { Badge } from '@f0rbit/ui'

;<Badge title={title}>
    <span class="row-sm">
        {events.sort(sortSkillEvent).map((t) => (
            <EventTypeIcon type={t} size={16} />
        ))}
    </span>
    <span>{skill}</span>
</Badge>
```

#### Task 3.3: Update award badges in ExperienceCard.astro

**Files**: `src/components/about/ExperienceCard.astro` (additional changes on top of Phase 2)
**Est. LOC**: ~15
**Deps**: Task 2.3

The award badges currently:

```html
<div class="flex flex-row items-center gap-2 border border-borders-primary rounded px-2 py-1">
    <AwardTypeIcon type="{award.type}" size="{20}" />
    <span>{award.title}</span>
</div>
```

Replace with:

```tsx
<Badge title={award.description}>
    <AwardTypeIcon type={award.type} size={16} />
    <span>{award.title}</span>
</Badge>
```

Note: Task 2.3 already does the main ExperienceCard migration. Task 3.3 specifically targets the award badge section that might have been left with placeholder classes.

**Actually** — this can be folded into Task 2.3. Let's merge them: Task 2.3 handles ALL of ExperienceCard including the badge conversion.

**Phase 3 Execution Order**:

1. Tasks 3.1, 3.2 (parallel — different files)
2. Verification: `bun run build`, check badges render correctly

---

### Phase 4: Interactive Components — Clamp, Collapsible, Buttons

**Goal**: Replace CompactText with Clamp, details with Collapsible, all buttons with Button.

#### Task 4.1: Delete CompactText.astro

**Files**: `src/components/CompactText.astro` (DELETE)
**Est. LOC**: -47 (deletion)
**Deps**: Task 2.3 (ExperienceCard no longer imports it)

Delete the file. All usages replaced in Phase 2 Task 2.3 with `<Clamp>`.

#### Task 4.2: Migrate Timeline.astro (activity)

**Files**: `src/components/activity/Timeline.astro`
**Est. LOC**: ~60
**Deps**: Phase 1

**Current structure**: Custom vertical line with absolute dots, details/summary for grouped commits.

**New approach**: Keep the custom layout (vertical line, dots) but replace classes and use `Collapsible` for grouped commits.

Replace:

-   `relative pl-10` → keep `relative`, use padding via `style`
-   `absolute left-5 h-[calc(100%-20px)] w-[1px] bg-base-text-subtle mt-3` → use `var(--fg-subtle)` for the line color
-   `w-2 h-2 rounded-full bg-base-text-subtlish` → use `var(--fg-muted)` for dot color
-   `text-sm -mb-1` → `text-sm`
-   `text-base-text-secondary` → `text-primary` (it's the event title)
-   `font-mono` → `font-mono`
-   `cursor-pointer flex border-1 border-borders-primary rounded px-2 justify-center items-center` → use `<Collapsible>` from @f0rbit/ui with `client:visible`

For the grouped commits `<details>`:

```tsx
import { Collapsible } from '@f0rbit/ui'

{
    event.commits?.length > 5 ? (
        <Collapsible client:visible trigger={`${event.commits.length} Commits`}>
            <CommitList commits={event.commits} />
        </Collapsible>
    ) : (
        <CommitList commits={event.commits} />
    )
}
```

Remove the custom `<style>` block for chevron show/hide (Collapsible handles this).

#### Task 4.3: Migrate CommitList.astro

**Files**: `src/components/activity/CommitList.astro`
**Est. LOC**: ~15
**Deps**: Phase 1

Replace:

-   `flex flex-row gap-3 p-2` → `row` with padding
-   `w-[1px] bg-borders-primary` → vertical line using `var(--border)`
-   `font-mono` → `font-mono`

```html
<div class="row" style={{ padding: "var(--space-sm)" }}>
    <div style={{ width: "1px", background: "var(--border)", "align-self": "stretch" }}></div>
    <div class="stack-sm">
        {commits.map(...)}
    </div>
</div>
```

#### Task 4.4: Migrate Experience.astro (timeline wrapper)

**Files**: `src/components/about/Experience.astro`
**Est. LOC**: ~30
**Deps**: Phase 1

Replace:

-   `pl-[32px] relative flex flex-col gap-5` → `stack-lg` with padding-left and relative
-   `absolute left-[19.5px] h-[calc(100%-15px)] w-[1px] bg-base-text-subtle` → inline style with `var(--fg-subtle)`
-   The middle mode grid: `relative grid gap-5 w-full` with `gridTemplateColumns` → keep the grid template, replace gap/flex classes
-   `flex flex-grow flex-col gap-16` → `stack` with custom gap
-   `min-h-full min-w-[1px] w-[1px] bg-gray-50` → inline style with `var(--fg-subtle)`

**Phase 4 Parallelism**: All tasks touch different files. Task 4.1 is just a deletion (only if Phase 2 already removed the import). Tasks 4.2, 4.3 are activity components. Task 4.4 is about component.

**Phase 4 Execution Order**:

1. Tasks 4.1, 4.2, 4.3, 4.4 (parallel — all different files)
2. Verification: `bun run build`, test Clamp expand/collapse, test Collapsible on timeline

---

### Phase 5: Pages — Layout class migration

**Goal**: All page files use @f0rbit/ui utility classes for layout.

#### Task 5.1: Migrate index.astro (homepage)

**Files**: `src/pages/index.astro`
**Est. LOC**: ~50
**Deps**: Phases 1-4

**Current → New** class mapping:

```
Header:
w-full h-screen flex justify-center items-center flex-col gap-2
→ style="width:100%;height:100vh;display:flex;justify-content:center;align-items:center;flex-direction:column;gap:var(--space-sm)"
(or a scoped class .hero { ... })

Sections:
flex flex-col gap-2 → stack
grid gap-2 grid-cols-1 xl:grid-cols-3 → grid (auto-fit handles responsiveness)
border border-borders-primary rounded → <Card> wrapper (AboutMe section, Experience section, Timeline section)
flex gap-2 → row or stack depending on direction
hidden ... xl:flex → .hide-mobile or media query
```

The homepage two-column layout (content + sidebar timeline):

```html
<!-- Current -->
<div class="flex gap-2">
    <div class="w-max flex flex-col gap-2">content</div>
    <section class="hidden min-w-[300px] 2xl:min-w-[400px] xl:flex gap-2 flex-col">sidebar</section>
</div>
```

New approach: CSS grid with explicit columns for the two-column layout:

```html
<div class="home-layout">
    <div class="stack">content</div>
    <section class="stack home-sidebar">sidebar</section>
</div>

<style>
    .home-layout {
        display: grid;
        grid-template-columns: 1fr;
        gap: var(--space-sm);
    }
    @media (min-width: 1280px) {
        .home-layout {
            grid-template-columns: 1fr min(400px, 30vw);
        }
    }
    .home-sidebar {
        display: none;
    }
    @media (min-width: 1280px) {
        .home-sidebar {
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
        }
    }
</style>
```

Wrap the experience section and timeline section borders in `<Card>` components:

```tsx
<Card>
    <CardContent>
        <Experience ... />
    </CardContent>
</Card>
```

The `text-[4vw] font-bold` hero title — use scoped style: `.hero-title { font-size: 4vw; font-weight: 700; }`.

#### Task 5.2: Migrate about.astro

**Files**: `src/pages/about.astro`
**Est. LOC**: ~40
**Deps**: Phases 1-4

Replace:

-   `flex flex-col gap-2` → `stack`
-   `hidden lg:block` / `block lg:hidden` → media query or `.hide-mobile` / `.hide-desktop` scoped styles
-   `grid gap-2 p-2 grid-cols-1 xl:grid-cols-3` → `grid`
-   `grid gap-2 p-2 grid-cols-2 xl:grid-cols-4` → `grid-4` (or `grid` with `--grid-min: 150px`)

Hobbies cards: Keep custom `bg-cover` approach — this is one-off styling that @f0rbit/ui doesn't address. Use inline styles for the background image and overlay.

#### Task 5.3: Migrate blog.astro

**Files**: `src/pages/blog.astro`
**Est. LOC**: ~10
**Deps**: Phases 1-4

Simple: `<div class="grid">` around blog cards. The CenteredContainer is already replaced (Phase 1).

```html
<main class="center-wide grid">{posts.map((post) => <BlogCard post="{post}" />)}</main>
```

#### Task 5.4: Migrate blog/[group]/[slug].astro (blog post detail)

**Files**: `src/pages/blog/[group]/[slug].astro`
**Est. LOC**: ~15
**Deps**: Phase 1

Replace:

-   `max-w-[100ch] mx-auto px-6` → `center-wide` (or `center` for narrower reading width — `center` is 65ch which is ideal for reading)
-   `text-4xl` → scoped style or `text-4xl` (available in @f0rbit/ui utilities)

```html
<main class="center">
    {!post ? <p class="text-muted">Error fetching blog post</p> : (
        <>
            <h1 class="text-4xl" transition:name={"title-"+post.slug}>{post.title}</h1>
            <div class="row-sm text-muted"><span>Published </span><PublishTime client:load date={post.published_at} /></div>
            <article>{parsed}</article>
        </>
    )}
</main>
```

Use `center` (65ch) for blog posts — better reading width than `center-wide` (90ch).

#### Task 5.5: Migrate projects.astro

**Files**: `src/pages/projects.astro`
**Est. LOC**: ~15
**Deps**: Phases 1-4

Replace:

-   `flex flex-col gap-2` → `stack`
-   `grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4` → `grid`
-   `text-red-500 text-center` → use inline style or `text-accent` for error, or `color: var(--error)` inline

#### Task 5.6: Migrate projects/[project_id].astro

**Files**: `src/pages/projects/[project_id].astro`
**Est. LOC**: ~15
**Deps**: Phases 1-4

Replace:

-   `flex flex-col gap-2 overflow-x-hidden` → `stack` with `overflow-x: hidden`
-   `flex xl:flex-row flex-col gap-y-2` → responsive layout (stack on mobile, row on desktop)
-   `text-red-500 text-center` → `color: var(--error); text-align: center`

#### Task 5.7: Migrate timeline.astro

**Files**: `src/pages/timeline.astro`
**Est. LOC**: ~8
**Deps**: Phases 1-4

Replace:

-   `flex justify-center` → remove (center-wide handles centering)

```html
<div class="center-wide">
    <TimelineComponent group_commits="{true}" limit="{null}" />
</div>
```

#### Task 5.8: Migrate RecentBlogs.astro

**Files**: `src/components/blog/RecentBlogs.astro`
**Est. LOC**: ~5
**Deps**: Phase 2

Replace:

-   `grid gap-2 grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3` → `grid`

#### Task 5.9: Migrate ProjectList.astro

**Files**: `src/components/projects/ProjectList.astro`
**Est. LOC**: ~3
**Deps**: Phase 2

No layout classes currently (just maps to ProjectCard). No changes needed — the parent handles the grid. Keep as-is.

#### Task 5.10: Migrate RecentProjects.astro

**Files**: `src/components/projects/RecentProjects.astro`
**Est. LOC**: ~3
**Deps**: Phase 2

No layout changes needed — delegates to ProjectList. Keep as-is.

#### Task 5.11: Migrate PublishTime.tsx

**Files**: `src/components/blog/PublishTime.tsx`
**Est. LOC**: ~3
**Deps**: None

Only has `className="lowercase"` → `class="text-sm"` (or keep `style={{ "text-transform": "lowercase" }}`). Minimal change.

Note: `className` should become `class` for SolidJS consistency, but `className` also works.

**Phase 5 Parallelism**: All page tasks touch different files. Tasks 5.1-5.7 are pages. Tasks 5.8-5.11 are small component tweaks.

**Phase 5 Execution Order**:

1. All tasks 5.1-5.11 (parallel — all different files)
2. Verification: `bun run build`, full visual check of all pages

---

### Phase 6: Cleanup — Remove Tailwind deps, delete unused files

**Goal**: Clean up any remaining Tailwind artifacts, remove dependencies, final verification.

#### Task 6.1: Remove Tailwind packages via bun

**Files**: `package.json`, `bun.lockb`
**Est. LOC**: ~5
**Deps**: Phase 5

```bash
bun remove tailwindcss @astrojs/tailwind @tailwindcss/typography
```

Verify `tailwind.config.cjs` is already deleted (Phase 0).

#### Task 6.2: Grep for remaining Tailwind class patterns

**Files**: All `.astro`, `.tsx`, `.css` files
**Est. LOC**: varies
**Deps**: Phase 5

Search for patterns that indicate leftover Tailwind:

-   `@apply`
-   `bg-base-`, `text-base-`, `border-borders-`, `accent-btn-`
-   Common Tailwind patterns: `flex-col`, `flex-row`, `gap-`, `grid-cols-`, `px-`, `py-`, `mt-`, `mb-`, `ml-`, `mr-`, `pt-`, `pb-`, `pl-`, `pr-`
-   `hover:bg-`, `hover:text-`, `hover:border-`
-   `lg:`, `xl:`, `2xl:`, `3xl:`, `sm:` (responsive prefixes)

Any remaining instances need manual migration. This is the safety net.

#### Task 6.3: Final build and cleanup

**Files**: None specific
**Est. LOC**: 0
**Deps**: Task 6.2

-   `bun run build` — must succeed with zero errors
-   Check for unused imports
-   Verify no `@tailwind` directives remain
-   Test dark mode toggle
-   Spot-check every page renders correctly

**Phase 6 Execution Order**:

1. Task 6.1 (sequential)
2. Task 6.2 (sequential — needs full codebase scan)
3. Task 6.3 (sequential — final verification)
4. Commit

---

## Complete File Inventory

### Files MODIFIED (27 files)

| File                                          | Phase | Primary Changes                                       |
| --------------------------------------------- | ----- | ----------------------------------------------------- |
| `package.json`                                | 0, 6  | Add @f0rbit/ui, remove Tailwind deps                  |
| `astro.config.mjs`                            | 0     | Remove tailwind() integration                         |
| `src/global.css`                              | 0     | Rewrite @apply → CSS vars                             |
| `src/layouts/Page.astro`                      | 0     | Import @f0rbit/ui/styles, remove TW classes           |
| `src/components/Navigation.astro`             | 1     | Replace TW classes with utility classes               |
| `src/components/Footer.astro`                 | 1     | Replace TW classes, remove CenteredContainer          |
| `src/components/ProjectCard.astro`            | 2     | Card + Badge + CardFooter                             |
| `src/components/blog/BlogCard.astro`          | 2     | Card + Button                                         |
| `src/components/about/ExperienceCard.astro`   | 2, 3  | Badge, Clamp, utility classes                         |
| `src/components/about/SkillCard.tsx`          | 2     | Card interactive, utility classes                     |
| `src/components/about/SkillSelector.tsx`      | 2     | Utility classes (stack, row, grid)                    |
| `src/components/about/AboutMe.astro`          | 2     | Card for info box                                     |
| `src/components/projects/ProjectPage.astro`   | 2     | Badge, utility classes                                |
| `src/components/projects/Specification.astro` | 2     | Remove prose classes                                  |
| `src/components/projects/Status.astro`        | 3     | Badge with variant mapping                            |
| `src/components/about/SkillEvents.astro`      | 3     | Badge wrapper                                         |
| `src/components/activity/Timeline.astro`      | 4     | Collapsible, utility classes                          |
| `src/components/activity/CommitList.astro`    | 4     | Utility classes                                       |
| `src/components/about/Experience.astro`       | 4     | Utility classes, CSS vars for timeline                |
| `src/pages/index.astro`                       | 1, 5  | CenteredContainer removal, Card wrappers, grid layout |
| `src/pages/about.astro`                       | 1, 5  | CenteredContainer removal, grid, stack                |
| `src/pages/blog.astro`                        | 1, 5  | CenteredContainer removal, grid                       |
| `src/pages/blog/[group]/[slug].astro`         | 1, 5  | CenteredContainer removal, center class               |
| `src/pages/projects.astro`                    | 1, 5  | CenteredContainer removal, grid                       |
| `src/pages/projects/[project_id].astro`       | 1, 5  | CenteredContainer removal, responsive layout          |
| `src/pages/timeline.astro`                    | 1, 5  | CenteredContainer removal                             |
| `src/components/blog/RecentBlogs.astro`       | 5     | Grid class                                            |
| `src/components/blog/PublishTime.tsx`         | 5     | className → class                                     |

### Files DELETED (3 files)

| File                                     | Phase | Reason                   |
| ---------------------------------------- | ----- | ------------------------ |
| `tailwind.config.cjs`                    | 0     | No longer needed         |
| `src/components/CenteredContainer.astro` | 1     | Replaced by .center-wide |
| `src/components/CompactText.astro`       | 4     | Replaced by <Clamp>      |

### Files UNCHANGED (keep as-is)

| File                                           | Reason                        |
| ---------------------------------------------- | ----------------------------- |
| `src/components/projects/TechnologyIcon.astro` | Pure icon logic, no styling   |
| `src/components/projects/AwardTypeIcon.astro`  | Pure icon logic, no styling   |
| `src/components/projects/EventTypeIcon.astro`  | Pure icon logic, no styling   |
| `src/components/projects/ProjectList.astro`    | No layout classes (delegates) |
| `src/components/projects/RecentProjects.astro` | No layout classes (delegates) |
| `src/layouts/Home.astro`                       | Thin wrapper, no classes      |
| `src/types.ts`                                 | No styling                    |
| `src/utils.ts`                                 | No styling                    |
| `src/client.ts`                                | No styling                    |
| `src/assets/*`                                 | Data files, no styling        |

---

## Estimated Total Effort

| Phase                        | Tasks  | Est. LOC Changed | Parallel Agents |
| ---------------------------- | ------ | ---------------- | --------------- |
| Phase 0: Foundation          | 5      | ~190             | 3               |
| Phase 1: Core Infrastructure | 3      | ~105             | 2               |
| Phase 2: Card Components     | 8      | ~280             | 7               |
| Phase 3: Status/Badge        | 2      | ~60              | 2               |
| Phase 4: Interactive         | 4      | ~150             | 4               |
| Phase 5: Pages               | 11     | ~170             | 11              |
| Phase 6: Cleanup             | 3      | ~10              | 1               |
| **Total**                    | **36** | **~965**         | —               |

---

## Suggested AGENTS.md Updates

After this migration completes, add to AGENTS.md:

```markdown
## UI System

-   Uses `@f0rbit/ui` SolidJS component library — NOT Tailwind CSS
-   Import styles in layout: `import "@f0rbit/ui/styles";`
-   Layout: `.stack`, `.row`, `.grid`, `.center-wide` utility classes
-   Text: `.text-primary`, `.text-muted`, `.text-subtle`, `.text-faint`
-   Components: `Card`, `Badge`, `Button`, `Status`, `Clamp`, `Collapsible` from `@f0rbit/ui`
-   Hydration: Card/Badge/Button/Status are static (no client:\* needed). Clamp/Collapsible need `client:load` or `client:visible`.
-   Article styles in `global.css` use CSS variables (`var(--fg)`, `var(--border)`, etc.)
-   No Google Fonts — system font stack via @f0rbit/ui tokens
-   Dark mode: automatic via `prefers-color-scheme: dark`
-   Responsive: use @f0rbit/ui auto-fit `.grid`, media queries for specific layouts
```
