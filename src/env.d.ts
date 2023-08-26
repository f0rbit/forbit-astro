/// <reference types="astro/client" />
//

export const PROJECT_STATUS: {
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
    status: "DEVELOPMENT" | "FINISHED",
    deleted: boolean,
    link_url: string | null,
    link_text: string | null,
    current_version: string | null
}
