import { Card, CardContent } from '@f0rbit/ui'
import { type SkillInformation } from '../../assets/skills'

interface Props {
    skill: string
    information: SkillInformation
    header: boolean
}

export function SkillSubheading(props: { information: SkillInformation }) {
    const { information } = props
    const { experience, projects } = information
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
    )
}

export default function SkillCard(props: Props) {
    const { skill, information, header } = props
    return (
        <Card interactive={!header}>
            <CardContent>
                <div class="stack stack-sm" style={{ 'text-align': 'center' }}>
                    <h3>{skill}</h3>
                    <SkillSubheading information={information} />
                </div>
            </CardContent>
        </Card>
    )
}
