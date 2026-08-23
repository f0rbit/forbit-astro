// Single source for the deploy commit SHA (vite define-injected). Must be read
// from a .ts module — referencing `import.meta.env.BUILD_SHA` directly inside
// .astro frontmatter breaks esbuild ("Unterminated string literal") because
// Astro's env transform mangles the custom define replacement in components.
export const BUILD_SHA = (import.meta.env.BUILD_SHA as string | undefined) ?? "dev";
