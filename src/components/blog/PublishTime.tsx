import { MS_PER_DAY, format_calendar, format_full_date_time, format_relative_time } from "../../lib/time";

type Props = {
	date: string;
};

export default function PublishTime(props: Props) {
	const { date } = props;
	const target = new Date(date);
	const now = new Date();
	// if the date was withing the past 2 days we want to use the relative form
	// otherwise fall back to a calendar-style date (DD/MM/YYYY once >1 week away)

	const time =
		now.getTime() - target.getTime() < 2 * MS_PER_DAY
			? format_relative_time(target, now)
			: format_calendar(target, now);

	const title = format_full_date_time(target);

	return (
		<>
			<time datetime={date} class="text-sm" style={{ "text-transform": "lowercase" }} title={title}>
				{time}
			</time>
		</>
	);
}
