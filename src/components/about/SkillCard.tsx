import { type SkillInformation } from "../../assets/skills";
interface Props {
    skill: string,
    information: SkillInformation,
    header: boolean
}


export default function SkillCard(props: Props) {
    const { skill, information, header } = props;
    return (
        <div className={"border border-borders-primary flex flex-col items-center justify-center px-4 p-2 rounded transition-colors duration-150 " + (!header ? " hover:bg-base-accent-primary hover:border-borders-secondary " : "")}>
            <h3>{skill}</h3>
            <div className="flex flex-row gap-3">
                <div className="flex flex-row gap-1">
                    <span className="text-base-text-subtlish font-semibold">{Array.from(information.experience).length}</span>
                    <span className="text-base-text-subtle">Relevant Experiences</span>
                </div>
                <div className="flex flex-row gap-1">
                    <span className="text-base-text-subtlish font-semibold">{Array.from(information.projects).length}</span>
                    <span className="text-base-text-subtle">Projects</span>
                </div>
            </div>
        </div>
    )

}
