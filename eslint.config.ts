import { createRequire } from "node:module";
import { define_lint_config } from "@f0rbit/lint";

// .astro files are not in ts_files (@f0rbit/eslint-config only wires up
// ts/tsx/mts/cts) and this repo does not install astro-eslint-parser, so
// typed ESLint rules never see .astro content — oxlint still lints inside
// .astro frontmatter (filename-case, no-explicit-any, etc. all fire on
// .astro files already). No override needed to "exclude" .astro from typed
// rules: they were never included in the first place.
const require_from_here = createRequire(import.meta.url);

export default define_lint_config({
	naming: "snake_case",
	tsconfig_root_dir: import.meta.dirname,
	// This is a Vite/Astro-bundled app, not a published Node-ESM package —
	// relative imports are conventionally extensionless here.
	module_resolution: "bundler",
	// lib/cache.ts reads Date.now() directly for cache freshness/staleness
	// checks (SWR semantics tested via a real `Date.now` monkeypatch in
	// __tests__/integration/cache.test.ts, not dependency injection) —
	// documented ambient-effect exception rather than a clock-provider
	// refactor in this lint-adoption pass.
	// lib/time.ts's `now: Date = new Date()` default parameters ARE the
	// clock-provider pattern (every formatter takes `now` explicitly and
	// only defaults to a fresh Date for real call sites; tests always pass
	// an explicit `now`) — the rule can't distinguish an injectable default
	// from a truly hidden ambient read, so it's listed here rather than
	// forced into a required param for no testability gain.
	// components/blog/PublishTime.tsx reads `new Date()` ONCE at the top of
	// the component and threads it explicitly into every lib/time.ts call —
	// the single-ambient-read-at-the-boundary shape this rule exists to
	// encourage, just not automatically recognised as such.
	ambient_effect_files: ["src/lib/cache.ts", "src/lib/time.ts", "src/components/blog/PublishTime.tsx"],
	// IMPORTANT: point the ESLint<->oxlint rule dedupe at the CANONICAL
	// oxlint config, not the repo's `.oxlintrc.json`. Our `.oxlintrc.json`
	// adds `files`-scoped overrides for `**/*.astro` (see that file) so
	// oxlint itself skips `unicorn/filename-case` there. But
	// eslint-plugin-oxlint's dedupe mirrors whatever `files` patterns it
	// finds — if it read our overrides, it would emit an ESLint config
	// object scoped to `**/*.astro`, and merely having an `.astro` `files`
	// pattern anywhere in the flat config array makes plain `eslint .`
	// attempt to parse .astro files with the default (non-Astro) parser,
	// which fails immediately ("Parsing error: Unexpected token ...").
	// The canonical file has no astro-scoped overrides, so dedupe stays
	// scoped to ts_files as intended.
	oxlintrc_path: require_from_here.resolve("@f0rbit/oxlint-config/oxlintrc.json"),
	overrides: [
		{
			// Generated/build output, not source — none of it is checked into
			// git (see .gitignore) and the TS project service can't resolve it.
			ignores: [".astro/**", ".wrangler/**", "worker-configuration.d.ts"],
		},
		{
			// Nested Claude agent worktrees live under .claude/worktrees/** —
			// each has its own node_modules and configs; scanning them from
			// the main tree recurses into sibling checkouts and fails on
			// their (differently-versioned) toolchains.
			ignores: [".claude/**"],
		},
		{
			// Astro API routes must export exact framework-mandated names
			// (`GET`, `POST`, `prerender`, ...). No local helpers live in
			// these files, so disabling the whole rule here loses nothing.
			files: ["src/pages/**/*.ts"],
			rules: { "@typescript-eslint/naming-convention": "off" },
		},
		{
			// Provider pattern (interface + prod class + in-memory fake) is a
			// deliberate architectural choice here, predating this lint
			// adoption — see design-philosophy principle 5. classes/this are
			// the natural shape for stateful HTTP clients; try/catch at the
			// fetch boundary is how thrown network/JSON errors become
			// Result values (corpus-patterns). Not rewriting this to
			// closures in a lint-baseline pass.
			files: ["src/providers/**/*.ts", "src/lib/cache.ts", "src/lib/build-data.ts"],
			rules: {
				"functional/no-classes": "off",
				"functional/no-this-expressions": "off",
				"functional/no-try-statements": "off",
			},
		},
		{
			// @f0rbit/eslint-config's own decision log says "console.error for
			// CLI error messages is the only standard exception" but ships
			// no-console: error with no allow option, banning console.error
			// too. This repo logs caught provider errors via console.error
			// throughout (pre-existing) — implementing the documented intent
			// rather than stripping the logging.
			files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
			rules: { "no-console": ["error", { allow: ["error", "warn"] }] },
		},
		{
			// scripts/ are CLI tools whose entire job is stdout reporting.
			files: ["scripts/**/*.ts"],
			rules: { "no-console": ["error", { allow: ["error", "warn", "log"] }] },
		},
		{
			// `window.__PULSE_CONFIG__` is an SSR-injected browser global
			// (Page.astro writes it via define:vars, src/lib/pulse.ts reads it,
			// src/env.d.ts declares it). The double-underscore prefix is the
			// deliberate "layout-injected global, not page code" convention —
			// same shape devpad's apps/main uses. NOTE: oxlint covers
			// Page.astro's usage (see .oxlintrc.json); this override must NOT
			// list the .astro file — a .astro files pattern here makes plain
			// eslint try to parse it without the Astro parser.
			files: ["src/lib/pulse.ts"],
			rules: {
				"no-underscore-dangle": ["error", { allow: ["__PULSE_CONFIG__"] }],
			},
		},
		{
			// Ambient global declaration file (Astro/Vite convention): must use
			// `interface` (type aliases don't support declaration merging into
			// App.Locals/ImportMetaEnv) and inline import() type expressions
			// (a top-level import statement would turn this into a module,
			// breaking the global ambient augmentation).
			files: ["src/env.d.ts"],
			rules: {
				"@typescript-eslint/consistent-type-definitions": "off",
				"@typescript-eslint/consistent-type-imports": "off",
			},
		},
	],
});
