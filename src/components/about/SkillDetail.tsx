import type { SkillInformation } from "../../assets/skills";
import { SkillSubheading } from "../../components/about/SkillCard";
import { selected_skill } from "./skill-store";

function SkillDetail(props: { skills: Record<string, SkillInformation> }) {
	const data = () => props.skills[selected_skill()];

	return (
		<div class="stack stack-sm">
			{(() => {
				const info = data();
				return (
					<>
						<div class="stack stack-sm" style={{ "align-items": "center" }}>
							<h3>{selected_skill()}</h3>
							<SkillSubheading information={info} />
						</div>
						<p class="text-muted">{info.description}</p>
						<div class="row" style={{ "flex-wrap": "wrap" }}>
							<h5>Experience</h5>
							<div class="row row-sm" style={{ "flex-wrap": "wrap" }}>
								{Array.from(info.experience).map((exp) => (
									<a href={`#${exp}`} class="font-mono text-sm">
										{exp}
									</a>
								))}
							</div>
						</div>
					</>
				);
			})()}
		</div>
	);
}

export default SkillDetail;
