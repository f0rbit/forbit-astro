import { SKILL, type Project, type Skill } from "../types";
import { getExperienceRelatingToSkill } from "./experience";

export type SkillInformation = {
    description: string,
    experience: Set<string>; 
    projects: Project['project_id'][]
}

export const skills: { [id: Skill]: SkillInformation } = {
    [SKILL.JAVA]: {
        experience: getExperienceRelatingToSkill(SKILL.JAVA),
        description: "My java journey started....",
        projects: ['gm-server']
    },
    [SKILL.GAMEMAKER]: {
        experience: getExperienceRelatingToSkill(SKILL.GAMEMAKER),
        description: "I'm a game maker professional basically",
        projects: ['gm-server', 'pixel-fly', 'bit-quest', 'clumsy-santa'],
    }
}
