# AGENTS.md — forbit-astro

Project-specific conventions and gotchas for agents working in this repo. Stacks on top of the global `~/.claude/AGENTS.md`.

## Lint/format toolchain

Code quality is enforced by `@f0rbit/lint` (oxlint + type-aware ESLint + oxfmt), not prettier.

- Scripts: `bun run lint`, `bun run lint:fix`, `bun run fmt`, `bun run fmt:check`.
- Config: `.oxlintrc.json`, `.oxfmtrc.json`, `eslint.config.ts`.
- `eslint.config.ts` calls `define_lint_config({ naming: "snake_case", tsconfig_root_dir: import.meta.dirname, module_resolution: "bundler", ambient_effect_files: ["src/lib/cache.ts"], oxlintrc_path: ..., overrides: [...] })`.
- Format is tabs + 120 width (oxfmt defaults) — NOT the old prettier config (160 width, no semicolons, single quotes). The prettier→oxfmt swap is a breaking formatter change; the repo-wide reformat landed as a standalone Phase 1 commit before any redesign work, so later diffs stay clean.
- `.prettierrc` is deleted; `prettier` and `prettier-plugin-astro` are removed from `package.json`.
- Naming convention: `snake_case` for local variables/functions, `PascalCase` for types/components. **Provider interface methods stay camelCase** (e.g. `listProjects`, `getProject`, `listMyArticles`, `fetchTimeline`) — these are external API contract shapes (`@devpad/api`-style), not free-standing local identifiers, so the naming-convention rule does not (and should not) rename them.

### oxfmt does not format `.astro` files

`oxfmt` only formats `ts/tsx/js/jsx/json/etc` — it does **not** reformat `.astro` files. `.astro` files keep their existing formatting (tabs, quote style, etc. as originally authored) even after `bun run fmt`. Don't expect `fmt:check` diffs inside `.astro` frontmatter/markup from formatting-only issues.

### `.astro` / Solid `.tsx` ESLint coverage

`@f0rbit/eslint-config` only wires up `ts/tsx/mts/cts` extensions, and this repo does not install `astro-eslint-parser`. Consequence: **type-aware ESLint rules never see `.astro` file content** — there was never anything to explicitly "exclude." `oxlint` still lints inside `.astro` frontmatter (e.g. `unicorn/filename-case`, `typescript/no-explicit-any`), so `.astro` files aren't lint-free, just not covered by the *typed* ESLint layer. Solid `.tsx` files (`SkillSelector.tsx`, `SkillCard.tsx`, `PublishTime.tsx`) go through the normal `ts_files` typed-ESLint path like any other `.tsx`.

### `oxlintrc_path` must point at the canonical oxlint config, not the repo's `.oxlintrc.json`

`eslint-plugin-oxlint`'s rule-dedupe (avoiding double-reporting between oxlint and ESLint) mirrors whatever `files` patterns it finds in the oxlint config it's pointed at. This repo's own `.oxlintrc.json` adds `files`-scoped overrides for `**/*.astro` (to turn off `unicorn/filename-case` there). If `oxlintrc_path` in `eslint.config.ts` pointed at `.oxlintrc.json` directly, the dedupe plugin would inject an ESLint flat-config object scoped to `**/*.astro` — and merely having an `.astro` `files` pattern anywhere in the flat config array makes plain `eslint .` try to parse `.astro` files with the default (non-Astro) parser, which fails immediately with a parse error. Fix: point `oxlintrc_path` at the **canonical** `@f0rbit/oxlint-config/oxlintrc.json` package export (via `createRequire(import.meta.url).resolve(...)`), which has no astro-scoped overrides, so the dedupe stays scoped to `ts_files` as intended. See `eslint.config.ts:24-36`.

### Infra file ignores

`infra.ts`, `pipeline.ts`, `grants.ts` (the pattern used elsewhere in the user's devpad/pipelines stack for files excluded from the TS program) **do not exist in this repo** — there was nothing to ignore for Phase 1. If they're added later (e.g. an Alchemy IaC file), add them to both the ESLint `overrides[].ignores` and mirror in `.oxlintrc.json`, matching the pattern already used for `.astro/**`, `.wrangler/**`, `worker-configuration.d.ts`.

### Scoped lint disables

Every `oxlint-disable-next-line` / `eslint-disable` in this repo carries a reason comment and points at a genuine pre-existing gap — not a convenience silence for something the lint-adoption pass introduced. Current instances: `get_timeline` in `src/utils.ts` (pre-existing `any` params, `@todo fix typings`), untyped `@devpad/api`/dev.to response shapes in `src/providers/*.ts` and `src/lib/build-data.ts`, the Astro middleware's mandated `onRequest` export name, and the ambient `Date.now()` effect in `src/lib/cache.ts` (documented via `ambient_effect_files` in `eslint.config.ts` rather than a disable). Don't add a new disable to silence a rule you tripped — fix it, or defer it explicitly with the same reason-comment convention.
