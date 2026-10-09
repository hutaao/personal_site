export interface LyricLine { time: number; text: string }

export function parseLrc(source: string): LyricLine[] {
	const offset = Number(source.match(/\[offset:([+-]?\d+)\]/i)?.[1] ?? 0) / 1000;
	const lines: LyricLine[] = [];
	for (const row of source.split(/\r?\n/)) {
		const stamps = [...row.matchAll(/\[(\d+):(\d{1,2})(?:\.(\d{1,3}))?\]/g)];
		const text = row.replace(/\[[^\]]*\]/g, "").trim();
		for (const stamp of stamps) {
			const seconds = Number(stamp[2]);
			if (seconds >= 60) continue;
			const fraction = Number(`0.${stamp[3] ?? "0"}`);
			lines.push({ time: Math.max(0, Number(stamp[1]) * 60 + seconds + fraction + offset), text });
		}
	}
	return lines.sort((a, b) => a.time - b.time);
}
