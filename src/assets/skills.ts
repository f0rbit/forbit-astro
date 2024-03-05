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
    },
    [SKILL.JAVASCIPRT]: {
        experience: getExperienceRelatingToSkill(SKILL.JAVASCIPRT),
        description: "I'm a javascript professional basically",
        projects: ['devpad', 'forbit.dev'],
    },
    [SKILL.LEADERSHIP]: {
        experience: getExperienceRelatingToSkill(SKILL.LEADERSHIP),
        description: "I'm a leader",
        projects: []
    },
}
