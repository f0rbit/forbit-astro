/// <reference types="astro/client" />

export const PROJECT_STATUS = {
    DEVELOPMENT: "DEVELOPMENT",
    RELEASED: "RELEASED",
    STOPPED: "STOPPED",
    LIVE: "LIVE",
    FINISHED: "FINISHED",
    PAUSED: "PAUSED",
    ABANDONED: "ABANDONED"
}

export type PROJECT_STATUS = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export type Project = {
    project_id: string,
    owner_id: string,
    name: string,
    created_at: string,
    updated_at: string,
    description: string | null,
    specification: string | null,
    repo_url: string | null,
    icon_url: string | null,
    status: PROJECT_STATUS,
    deleted: boolean,
    link_url: string | null,
    link_text: string | null,
    current_version: string | null
}

export const SKILL = {
    JAVA: "Java",
    SQL: "SQL",
    PHP: "PHP",
    GAMEMAKER: "GameMaker",
    SCRATCH: "Scratch",
    JAVASCIPRT: "JavaScript",
    HTML: "HTML",
    CSS: "CSS",
    LEADERSHIP: "Leadership",
    DEPLOYMENT: "Deployment"
}

export const SKILL_EVENT_TYPE = {
    BEGIN: "BEGIN",
    LEARN: "LEARN",
    MASTER: "MASTER"
}

export function sortSkillEvent(a: SkillEventType, b: SkillEventType) {
    if (a == SKILL_EVENT_TYPE.BEGIN) return -1;
    if (a == SKILL_EVENT_TYPE.MASTER) return 1;
    if (b == SKILL_EVENT_TYPE.BEGIN) return 1;
    if (b == SKILL_EVENT_TYPE.MASTER) return -1;
    return 0;
}

export type Skill = (typeof SKILL)[keyof typeof SKILL]

export type SkillEventType = (typeof SKILL_EVENT_TYPE)[keyof typeof SKILL_EVENT_TYPE];

export type SkillEvent = { skill: Skill, events: SkillEventType[] };

export const AWARD_TYPE = {
    CERTIFICATE: "Certifcation",
    EDUCATION: "Education",
    AWARD: "Award"
}

export type AwardType = (typeof AWARD_TYPE)[keyof typeof AWARD_TYPE];

export type Award = { type: AwardType, title: string, description?: string };



