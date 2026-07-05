import { type SkillInformation } from "../../assets/skills";

type Props = {
	skill: string;
	information: SkillInformation;
	color: string;
	selected: boolean;
};

export function skill_level(information: SkillInformation): number {
	return Math.min(5, Math.max(1, information.experience.size));
}

export function skill_label(level: number): string {
	if (level === 5) return "master";
	if (level >= 4) return "advanced";
	if (level >= 3) return "proficient";
	return "learning";
}

export function SkillSubheading(props: { information: SkillInformation }) {
	const { information } = props;
	const { experience, projects } = information;
	return (
		<div class="row row-sm">
			<div class="row row-sm">
				<span class="text-muted font-bold">{Array.from(experience).length}</span>
				<span class="text-subtle">Relevant Experiences</span>
			</div>
			<div class="row row-sm">
				<span class="text-muted font-bold">{Array.from(projects).length}</span>
				<span class="text-subtle">Projects</span>
			</div>
		</div>
	);
}

export default function SkillCard(props: Props) {
	const { skill, information, color, selected } = props;
	const level = skill_level(information);

	return (
		<div class="row row-sm" style={{ "align-items": "center", gap: "0.7rem", opacity: selected ? "1" : "0.85" }}>
			<span class="font-mono text-sm" style={{ color, width: "6.5rem", "flex-shrink": "0", "text-align": "left" }}>
				{skill}
			</span>
			<span class="row" style={{ gap: "3px", "flex-shrink": "0" }} aria-hidden="true">
				{Array.from({ length: 5 }).map((_, i) => (
					<span
						style={{
							width: "14px",
							height: "8px",
							"border-radius": "2px",
							background: i < level ? color : "transparent",
							border: `1px solid ${i < level ? color : "var(--term-border)"}`,
						}}
					/>
				))}
			</span>
			<span class="text-xs text-subtle">{skill_label(level)}</span>
		</div>
	);
}
