import type { SkillInformation } from "../../assets/skills";
import SkillCard from "../../components/about/SkillCard";
import { selected_skill, set_selected_skill } from "./skill-store";

const COLORS = ["var(--term-link)", "var(--term-keyword)", "var(--term-status-finished)"] as const;

function skill_color(index: number): string {
	return COLORS[index % COLORS.length] ?? "var(--term-gray-72)";
}

function SkillBars(props: { skills: Record<string, SkillInformation> }) {
	const entries = Object.entries(props.skills);

	return (
		<div class="grid grid-3" style={{ "row-gap": "0.75rem", "column-gap": "2rem" }}>
			{entries.map(([id, data], index) => (
				<button
					type="button"
					onClick={() => {
						set_selected_skill(id);
					}}
					style={{ background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%" }}
				>
					<SkillCard skill={id} information={data} color={skill_color(index)} selected={id === selected_skill()} />
				</button>
			))}
		</div>
	);
}

export default SkillBars;
