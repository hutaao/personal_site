/** Pure calendar aggregation: one content entry contributes at most once per day. */
export interface CalendarPost {
	id: string;
	title: string;
	url: string;
	date: string;
}

export function aggregateCalendarActivity(entries: CalendarPost[]) {
	const postsByDate: Record<string, CalendarPost[]> = {};
	const seen = new Set<string>();
	for (const entry of entries) {
		const identity = `${entry.date}:${entry.id}`;
		if (seen.has(identity)) continue;
		seen.add(identity);
		(postsByDate[entry.date] ??= []).push(entry);
	}
	return {
		postsByDate,
		activeMonths: [
			...new Set(Object.keys(postsByDate).map((date) => date.slice(0, 7))),
		].sort(),
	};
}

const DAY_MS = 86_400_000;

/** 16 complete week columns ending in the week containing today, with future slots blank. */
export function buildActivityDays(
	todayKey: string,
	startOfWeek: "mon" | "sun",
) {
	const today = new Date(`${todayKey}T00:00:00Z`);
	const offset = (today.getUTCDay() - (startOfWeek === "mon" ? 1 : 0) + 7) % 7;
	const first = today.getTime() - (15 * 7 + offset) * DAY_MS;
	return Array.from({ length: 112 }, (_, index) => {
		const time = first + index * DAY_MS;
		return time <= today.getTime()
			? new Date(time).toISOString().slice(0, 10)
			: null;
	});
}

export function activityLevel(count: number): number {
	return Math.min(4, Math.max(0, count));
}
