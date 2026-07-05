/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
	interface Locals {
		runtime: import("@astrojs/cloudflare").Runtime<Env>["runtime"];
		providers: import("./providers/types").AppProviders;
		cache: Cache | undefined;
		ctx: import("./lib/cache").CacheCtx;
	}
}

interface ImportMetaEnv {
	readonly BUILD_SHA: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
