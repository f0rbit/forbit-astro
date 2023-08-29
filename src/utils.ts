import type { Duration } from "moment";

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
