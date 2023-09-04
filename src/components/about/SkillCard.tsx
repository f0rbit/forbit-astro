import { type SkillInformation } from "../../assets/skills";
interface Props {
    skill: string,
    information: SkillInformation,
    header: boolean
}


export default function SkillCard(props: Props) {
    const { skill, information, header } = props;
    return (
        <div className={"border border-borders-primary flex flex-col justify-center px-4 p-2 rounded transition-colors duration-150 " + (!header ? " hover:bg-base-accent-primary hover:border-borders-secondary " : "")}>
            <h3>{skill}</h3>
            <p>{information.description}</p>
        </div>
    )

}
