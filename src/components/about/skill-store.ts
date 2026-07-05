import { createSignal } from "solid-js";
import { skills, type SkillInformation } from "../../assets/skills";
import type { Skill } from "../../types";

function first_skill(): Skill {
	const entries = Object.keys(skills);
	const first = entries.at(0);
	// eslint-disable-next-line functional/no-throw-statements -- programmer-error guard for an always-non-empty skills contract, not a recoverable Result case
	if (!first) throw new Error("No skills in object!");
	return first;
}

// Module-level Solid signal: Astro bundles same-page islands importing the
// same source module into one shared chunk, so every `client:visible`
// island that imports this module sees the same signal instance. Solid
// context does NOT cross island boundaries in Astro, so a shared signal
// module is the pattern for cross-island state on this site.
export const [selected_skill, set_selected_skill] = createSignal<Skill>(first_skill());

export type { SkillInformation };
