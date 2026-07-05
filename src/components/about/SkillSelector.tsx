import type { SkillInformation } from "../../assets/skills";
import SkillCard, { SkillSubheading } from "../../components/about/SkillCard";
import { createSignal } from "solid-js";

const COLORS = ["var(--term-link)", "var(--term-keyword)", "var(--term-status-finished)"] as const;

function skill_color(index: number): string {
	return COLORS[index % COLORS.length] ?? "var(--term-gray-72)";
}

function SkillComponent(props: { skills: Record<string, SkillInformation> }) {
	const entries = Object.entries(props.skills);
	const first_skill = entries.at(0);
	// eslint-disable-next-line functional/no-throw-statements -- programmer-error guard for an always-non-empty props contract, not a recoverable Result case
	if (!first_skill) throw new Error("No skills in object!");
	const [selected_skill, set_selected_skill] = createSignal<string>(first_skill[0]);

	const handle_skill_click = (skill: string) => {
		set_selected_skill(skill);
	};

	return (
		<div class="stack">
			{entries
				.filter(([id]) => id === selected_skill())
				.map(([id, data]) => (
					<div class="stack stack-sm">
						<div class="stack stack-sm" style={{ "align-items": "center" }}>
							<h3>{id}</h3>
							<SkillSubheading information={data} />
						</div>
						<p class="text-muted">{data.description}</p>
						<div class="row">
							<h5>Experience</h5>
							<div class="row row-sm">
								{Array.from(data.experience).map((exp) => (
									<a href={`#${exp}`} class="font-mono text-sm">
										{exp}
									</a>
								))}
							</div>
						</div>
					</div>
				))}
			<div class="grid grid-3" style={{ "row-gap": "0.75rem", "column-gap": "2rem" }}>
				{entries.map(([id, data], index) => (
					<button
						type="button"
						onClick={() => {
							handle_skill_click(id);
						}}
						style={{ background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%" }}
					>
						<SkillCard skill={id} information={data} color={skill_color(index)} selected={id === selected_skill()} />
					</button>
				))}
			</div>
		</div>
	);
}

export default SkillComponent;
