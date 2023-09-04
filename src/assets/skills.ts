import { SKILL, type Project, type Skill } from "../types";
import { getExperienceRelatingToSkill } from "./experience";

export type SkillInformation = {
    description: string,
    experience?: Set<string>; 
    projects: Project['project_id'][]
}

const base_skills: { [id: Skill]: SkillInformation } = {
    [SKILL.JAVA]: {
        description: "My java journey started....",
        projects: ['gm-server']
    }
}

// add the relevant experiences to the skill
export const skills = Object.entries(base_skills).map(([skill, data]) => {
    data.experience = getExperienceRelatingToSkill(skill);
});
