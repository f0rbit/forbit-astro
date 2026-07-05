import type { SkillInformation } from "../../assets/skills";
import SkillCard, { SkillSubheading } from "../../components/about/SkillCard";
import { createSignal } from "solid-js";

function SkillComponent(props: { skills: Record<string, SkillInformation> }) {
	const first_skill = Object.entries(props.skills).at(0);
	// eslint-disable-next-line functional/no-throw-statements -- programmer-error guard for an always-non-empty props contract, not a recoverable Result case
	if (!first_skill) throw new Error("No skills in object!");
	const [selected_skill, set_selected_skill] = createSignal<string>(first_skill[0]);

	const handle_skill_click = (skill: string) => {
		set_selected_skill(skill);
	};

	return (
		<div class="stack">
			{Object.entries(props.skills)
				.filter(([id]) => id == selected_skill())
				.map((selected) => {
					return (
						<div class="stack">
							<div class="stack stack-sm" style={{ "align-items": "center" }}>
								<h3>{selected[0]}</h3>
								<SkillSubheading information={selected[1]} />
							</div>
							<p>{selected[1].description}</p>
							<div class="row">
								<h5>Experience</h5>
								<div class="row row-sm">
									{Array.from(selected[1].experience).map((exp) => (
										<a href={`#${exp}`}>{exp}</a>
									))}
								</div>
							</div>
						</div>
					);
				})}
			<div class="grid">
				{Object.entries(props.skills)
					.filter(([id]) => id != selected_skill())
					.map(([id, data]) => (
						<button
							type="button"
							onClick={() => {
								handle_skill_click(id);
							}}
							style={{ background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%" }}
						>
							<SkillCard skill={id} information={data} header={false} />
						</button>
					))}
			</div>
		</div>
	);
}

export default SkillComponent;
