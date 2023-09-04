import type { SkillInformation } from "../../assets/skills";
import { createSignal } from "solid-js";

type Info = [string, SkillInformation]

function SkillComponent(props: { skills: Record<string, SkillInformation> }) {
    const first_skill = Object.entries(props.skills).at(0);
    if (!first_skill) throw new Error("No skills in object!");
    const [selectedSkill, setSelectedSkill] = createSignal<Info>(first_skill);

    const handleSkillClick = (info: Info) => {
        setSelectedSkill(info);
    };

    return (
        <div>
            <div className="header">
                {selectedSkill() && (
                    <div className="selected-skill-card">
                        {/* Render the selected skill card here */}
                        <h2>{selectedSkill()[0]}</h2>
                        {/* Render other information about the selected skill */}
                    </div>
                )}
            </div>
            <div className="skill-list">
                <h3>Skills</h3>
                <ul>
                    {Object.entries(props.skills).map(([id, data]) => (
                        <li key={id} onClick={() => handleSkillClick([ id, data ])}>
                            {id}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default SkillComponent;
