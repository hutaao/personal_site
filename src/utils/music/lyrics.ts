export interface LyricLine { time: number; text: string }

export function parseLrc(source: string): LyricLine[] {
	const offset = Number(source.match(/\[offset:([+-]?\d+)\]/i)?.[1] ?? 0) / 1000;
	const lines: LyricLine[] = [];
	for (const row of source.split(/\r?\n/)) {
		const stamps = [...row.matchAll(/\[(\d+):(\d{1,2})(?:\.(\d{1,3}))?\]/g)];
		const pendingTimes: number[] = [];
		for (let index = 0; index < stamps.length; index++) {
			const stamp = stamps[index];
			const seconds = Number(stamp[2]);
			if (seconds >= 60) continue;
			const fraction = Number(`0.${stamp[3] ?? "0"}`);
			pendingTimes.push(Math.max(0, Number(stamp[1]) * 60 + seconds + fraction + offset));
			const text = row.slice((stamp.index ?? 0) + stamp[0].length, stamps[index + 1]?.index)
				.replace(/\[[^\]]*\]/g, "").replace(/\/name\/[^\r\n]*\.lrc\s*$/, "").trim();
			if (text || index === stamps.length - 1) {
				for (const time of pendingTimes) lines.push({ time, text });
				pendingTimes.length = 0;
			}
		}
	}
	return lines.sort((a, b) => a.time - b.time);
}
