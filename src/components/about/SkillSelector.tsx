import type { SkillInformation } from '../../assets/skills'
import SkillCard, { SkillSubheading } from '../../components/about/SkillCard.tsx'
import { createSignal } from 'solid-js'

function SkillComponent(props: { skills: Record<string, SkillInformation> }) {
    const first_skill = Object.entries(props.skills).at(0)
    if (!first_skill) throw new Error('No skills in object!')
    const [selectedSkill, setSelectedSkill] = createSignal<string>(first_skill[0])

    const handleSkillClick = (skill: string) => {
        setSelectedSkill(skill)
    }

    return (
        <div class="stack">
            {Object.entries(props.skills)
                .filter(([id]) => id == selectedSkill())
                .map((selected) => {
                    return (
                        <div class="stack">
                            <div class="stack stack-sm" style={{ 'align-items': 'center' }}>
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
                    )
                })}
            <div class="grid">
                {Object.entries(props.skills)
                    .filter(([id]) => id != selectedSkill())
                    .map(([id, data]) => (
                        <button key={id} onClick={() => handleSkillClick(id)}>
                            <SkillCard skill={id} information={data} header={false} />
                        </button>
                    ))}
            </div>
        </div>
    )
}

export default SkillComponent
