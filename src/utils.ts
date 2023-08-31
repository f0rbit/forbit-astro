import type { Duration } from "moment";
import { PROJECT_VISIBILITY, type ApiResult, type Project } from "./types";

export function formatDuration(duration: Duration) {
    if (duration.asMonths() >= 16) {
        return `${Math.round(duration.asYears())} years`;
    } else if (duration.asMonths() >= 2) {
        return `${Math.ceil(duration.asMonths())} months`;
    } else if (duration.asDays() >= 3) {
        return `${Math.ceil(duration.asDays())} days`;
    } else {
        return `${Math.ceil(duration.asHours())} hours`;
    }
}

export async function getProjects() {
    const result = (await (await fetch(import.meta.env.PROJECT_URL)).json()) as ApiResult<Project[]>;
    if (!result.success) return [];
    return result.data.filter((project) => project.visibility == PROJECT_VISIBILITY.PUBLIC);
}
