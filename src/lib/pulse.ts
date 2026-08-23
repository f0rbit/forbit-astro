/**
 * Pulse analytics + observability for the forbit.dev frontend.
 *
 * Mirrors devpad's apps/main/src/lib/pulse.ts. Opinionated severity ladder
 * (low → high): raw → debug → info → notice → warning → error → critical
 *
 * Usage:
 *   import { log, track } from "../lib/pulse";
 *
 *   log.info("skill selected", { name });
 *   log.error("fetch failed", err, { url });   // err optional; Error promotes to a captured exception
 *   track("external_link_clicked", { href });
 *
 * Config arrives SSR-side: Page.astro reads the astro:env server fields (backed by
 * wrangler.jsonc vars) and injects them as `window.__PULSE_CONFIG__` before this
 * module is imported. Init is lazy — no-ops cleanly when config is absent, and the
 * `typeof window === "undefined"` guard keeps SSR imports inert.
 */

import { createPulse, type Pulse } from "@f0rbit/pulse-client";
import { startSpan, type Span } from "@f0rbit/pulse-client/spans";

type LogLevel = "raw" | "debug" | "info" | "notice" | "warning" | "error" | "critical";

type PulseConfig = {
	endpoint?: string;
	project_id?: string;
	ingest_key?: string;
	release?: string;
};

export type { PulseConfig };

let pulse_instance: Pulse | null = null;
let initialized = false;
let handlers_installed = false;

const window_config = (): PulseConfig | undefined => {
	if (typeof window === "undefined") return undefined;
	return window.__PULSE_CONFIG__;
};

const ensure_initialized = (): Pulse | null => {
	if (initialized) return pulse_instance;
	initialized = true;

	if (typeof window === "undefined") return null;

	const { endpoint, project_id, ingest_key, release } = window_config() ?? {};
	if (!endpoint || !project_id || !ingest_key) return null;

	pulse_instance = createPulse({
		project_id,
		ingest_key,
		endpoint,
		auto_pageview: true,
		release,
	});

	install_browser_handlers(pulse_instance);
	return pulse_instance;
};

const install_browser_handlers = (p: Pulse): void => {
	if (handlers_installed || typeof window === "undefined") return;
	handlers_installed = true;

	window.addEventListener("error", (e: ErrorEvent) => {
		p.captureError(e.error ?? new Error(e.message), {
			source: "window.onerror",
			filename: e.filename,
			lineno: e.lineno,
			colno: e.colno,
		});
	});
	window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
		p.captureError(e.reason ?? new Error("unhandledrejection"), {
			source: "unhandledrejection",
		});
	});
};

const is_error = (x: unknown): x is Error =>
	x instanceof Error || (typeof x === "object" && x !== null && "stack" in (x as Record<string, unknown>));

const emit = (level: LogLevel, message: string, attrs?: Record<string, unknown>): void => {
	ensure_initialized()?.log(level as never, message, attrs);
};

const error_or_critical =
	(level: "error" | "critical") =>
	(message: string, err_or_attrs?: unknown, attrs?: Record<string, unknown>): void => {
		const p = ensure_initialized();
		if (!p) return;
		if (is_error(err_or_attrs)) {
			p.captureError(err_or_attrs, { message, level, ...attrs });
			return;
		}
		p.log(level, message, err_or_attrs as Record<string, unknown> | undefined);
	};

/** Namespaced log surface — see file header for the severity ladder. */
export const log = {
	raw: (msg: string, attrs?: Record<string, unknown>) => {
		emit("raw", msg, attrs);
	},
	debug: (msg: string, attrs?: Record<string, unknown>) => {
		emit("debug", msg, attrs);
	},
	info: (msg: string, attrs?: Record<string, unknown>) => {
		emit("info", msg, attrs);
	},
	notice: (msg: string, attrs?: Record<string, unknown>) => {
		emit("notice", msg, attrs);
	},
	warning: (msg: string, attrs?: Record<string, unknown>) => {
		emit("warning", msg, attrs);
	},
	/** `log.error(msg, err?, attrs?)` — when an Error is passed it's captured as an exception. */
	error: error_or_critical("error"),
	/** `log.critical(msg, err?, attrs?)` — same shape as error, higher severity. */
	critical: error_or_critical("critical"),

	span(name: string): Span {
		const p = ensure_initialized();
		if (!p) {
			const noop: Span = { end: () => {} };
			return noop;
		}
		return startSpan({ pulse: p, name });
	},

	trace(name: string, attrs?: Record<string, unknown>): void {
		log.span(name).end(attrs);
	},

	async flush(): Promise<void> {
		await ensure_initialized()?.flush();
	},
};

/** Emit a domain event (e.g. `external_link_clicked`) — distinct from a log line. */
export const track = (name: string, properties?: Record<string, unknown>): void => {
	ensure_initialized()?.event(name, properties);
};

/** Lazy singleton pulse instance for advanced use cases (manual flush, custom shapes). */
export const get_pulse = (): Pulse | null => ensure_initialized();

// Eager init in browser context — installs error handlers right away on import.
if (typeof window !== "undefined") {
	ensure_initialized();
}
