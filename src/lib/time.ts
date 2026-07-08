/**
 * Native replacement for moment.js — relative time ("3 hours ago"), calendar-style
 * dates ("Yesterday at 2:30 PM" / "DD/MM/YYYY"), duration bucketing, and a
 * spelled-out date+time string. No dependency: safe to ship to the browser
 * (used by the PublishTime.tsx client island).
 *
 * The bucket thresholds below intentionally mirror moment's default English
 * `relativeTime` locale (ss:44, s:45, m:45, h:22, d:26, M:11) so the rendered
 * strings are unchanged from the moment-based implementation they replace.
 */

export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;
/** Average Gregorian month length (365.25 / 12 days) — matches moment's internal duration conversion. */
export const DAYS_PER_MONTH = 30.436875;
export const MS_PER_MONTH = DAYS_PER_MONTH * MS_PER_DAY;
export const MS_PER_YEAR = 12 * MS_PER_MONTH;

function pad2(n: number): string {
	return n.toString().padStart(2, "0");
}

function start_of_day(date: Date): number {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function format_duration(start: Date, end: Date): string {
	const ms = end.getTime() - start.getTime();
	const days = ms / MS_PER_DAY;
	const months = days / DAYS_PER_MONTH;
	const years = months / 12;
	if (months >= 16) return `${Math.round(years).toString()} years`;
	if (months >= 2) return `${Math.ceil(months).toString()} months`;
	if (days >= 3) return `${Math.ceil(days).toString()} days`;
	const hours = ms / MS_PER_HOUR;
	return `${Math.ceil(hours).toString()} hours`;
}

type RelativeBucket =
	| { kind: "few-seconds" }
	| { kind: "minute" }
	| { kind: "minutes"; count: number }
	| { kind: "hour" }
	| { kind: "hours"; count: number }
	| { kind: "day" }
	| { kind: "days"; count: number }
	| { kind: "month" }
	| { kind: "months"; count: number }
	| { kind: "year" }
	| { kind: "years"; count: number };

function bucket_relative(abs_ms: number): RelativeBucket {
	const seconds = Math.round(abs_ms / 1000);
	const minutes = Math.round(abs_ms / MS_PER_MINUTE);
	const hours = Math.round(abs_ms / MS_PER_HOUR);
	const days = Math.round(abs_ms / MS_PER_DAY);
	const months = Math.round(abs_ms / MS_PER_MONTH);
	const years = Math.round(abs_ms / MS_PER_YEAR);

	if (seconds <= 44) return { kind: "few-seconds" };
	if (minutes <= 1) return { kind: "minute" };
	if (minutes < 45) return { kind: "minutes", count: minutes };
	if (hours <= 1) return { kind: "hour" };
	if (hours < 22) return { kind: "hours", count: hours };
	if (days <= 1) return { kind: "day" };
	if (days < 26) return { kind: "days", count: days };
	if (months <= 1) return { kind: "month" };
	if (months < 11) return { kind: "months", count: months };
	if (years <= 1) return { kind: "year" };
	return { kind: "years", count: years };
}

function phrase_for(bucket: RelativeBucket): string {
	switch (bucket.kind) {
		case "few-seconds":
			return "a few seconds";
		case "minute":
			return "a minute";
		case "minutes":
			return `${bucket.count.toString()} minutes`;
		case "hour":
			return "an hour";
		case "hours":
			return `${bucket.count.toString()} hours`;
		case "day":
			return "a day";
		case "days":
			return `${bucket.count.toString()} days`;
		case "month":
			return "a month";
		case "months":
			return `${bucket.count.toString()} months`;
		case "year":
			return "a year";
		case "years":
			return `${bucket.count.toString()} years`;
	}
}

/** Equivalent to moment(target).fromNow() under the default English locale. */
export function format_relative_time(target: Date, now: Date = new Date()): string {
	const diff_ms = now.getTime() - target.getTime();
	const phrase = phrase_for(bucket_relative(Math.abs(diff_ms)));
	return diff_ms >= 0 ? `${phrase} ago` : `in ${phrase}`;
}

function weekday_name(date: Date): string {
	return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
}

function month_name(date: Date): string {
	return new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
}

function format_time_12h(date: Date): string {
	const hours24 = date.getHours();
	const hours = hours24 % 12 === 0 ? 12 : hours24 % 12;
	const period = hours24 >= 12 ? "PM" : "AM";
	return `${hours.toString()}:${pad2(date.getMinutes())} ${period}`;
}

export function format_ddmmyyyy(date: Date): string {
	return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear().toString()}`;
}

/**
 * Equivalent to moment(target).calendar() under the default English locale —
 * "Today at 3:00 PM" / "Yesterday at ..." / "Last Monday at ..." within the
 * surrounding week, otherwise falls back to `same_else` (moment's `sameElse: 'L'`,
 * which for en-AU is DD/MM/YYYY).
 */
export function format_calendar(
	target: Date,
	now: Date = new Date(),
	same_else: (date: Date) => string = format_ddmmyyyy,
): string {
	const diff_days = Math.round((start_of_day(target) - start_of_day(now)) / MS_PER_DAY);
	const time = format_time_12h(target);
	if (diff_days === 0) return `Today at ${time}`;
	if (diff_days === 1) return `Tomorrow at ${time}`;
	if (diff_days === -1) return `Yesterday at ${time}`;
	if (diff_days > 1 && diff_days < 7) return `${weekday_name(target)} at ${time}`;
	if (diff_days < -1 && diff_days > -7) return `Last ${weekday_name(target)} at ${time}`;
	return same_else(target);
}

function ordinal_suffix(day: number): string {
	const mod100 = day % 100;
	if (mod100 >= 11 && mod100 <= 13) return "th";
	switch (day % 10) {
		case 1:
			return "st";
		case 2:
			return "nd";
		case 3:
			return "rd";
		default:
			return "th";
	}
}

/** Equivalent to moment(date).format("dddd, MMMM Do YYYY, h:mm:ss a"). */
export function format_full_date_time(date: Date): string {
	const day = date.getDate();
	const hours24 = date.getHours();
	const hours = hours24 % 12 === 0 ? 12 : hours24 % 12;
	const period = hours24 >= 12 ? "pm" : "am";
	return `${weekday_name(date)}, ${month_name(date)} ${day.toString()}${ordinal_suffix(day)} ${date.getFullYear().toString()}, ${hours.toString()}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())} ${period}`;
}
