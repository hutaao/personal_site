import assert from "node:assert/strict";
import test from "node:test";
import {
	activityLevel,
	aggregateCalendarActivity,
	buildActivityDays,
} from "../src/utils/calendar-activity.ts";
import { momentExcerpt } from "../src/utils/sidebar-text.ts";

test("same-day publish/edit is one update, different entries and later edits remain distinct", () => {
	const post = {
		id: "post:one",
		title: "One",
		url: "/posts/one/",
		date: "2026-10-01",
	};
	const data = aggregateCalendarActivity([
		post,
		{ ...post },
		{ ...post, date: "2026-10-02" },
		{ ...post, id: "moment:one", url: "/moments/#moment-one" },
	]);
	assert.equal(data.postsByDate["2026-10-01"].length, 2);
	assert.equal(data.postsByDate["2026-10-02"].length, 1);
	assert.deepEqual(data.activeMonths, ["2026-10"]);
});

test("active months sort chronologically across year boundaries; empty content is valid", () => {
	const item = { id: "post:test", title: "Test", url: "/test/" };
	assert.deepEqual(
		aggregateCalendarActivity([
			{ ...item, date: "2026-01-01" },
			{ ...item, date: "2025-12-31" },
		]).activeMonths,
		["2025-12", "2026-01"],
	);
	assert.deepEqual(aggregateCalendarActivity([]), {
		postsByDate: {},
		activeMonths: [],
	});
});

test("16 weekly columns honor either week start and leave future days blank", () => {
	for (const [start, weekday] of [
		["mon", 1],
		["sun", 0],
	]) {
		const days = buildActivityDays("2026-10-03", start);
		assert.equal(days.length, 112);
		assert.equal(new Date(days[0] + "T00:00:00Z").getUTCDay(), weekday);
		assert.equal(days.filter(Boolean).at(-1), "2026-10-03");
		assert.equal(days.filter((day) => day === "2026-10-03").length, 1);
		assert.equal(
			days.filter((day) => day === null).length,
			start === "mon" ? 1 : 0,
		);
	}
});

test("activity dates include leap day and are independent of local DST", () => {
	const leap = buildActivityDays("2024-03-01", "mon").filter(Boolean);
	assert.equal(leap.at(-2), "2024-02-29");
	const yearEnd = buildActivityDays("2026-01-01", "sun").filter(Boolean);
	assert.deepEqual(yearEnd.slice(-2), ["2025-12-31", "2026-01-01"]);
	assert.equal(new Set(yearEnd).size, yearEnd.length);
});

test("activity levels represent no update through four or more updates", () => {
	assert.deepEqual([0, 1, 2, 3, 4, 8].map(activityLevel), [0, 1, 2, 3, 4, 4]);
});

test("moment summaries exclude HTML and script/style text, decode entities and collapse whitespace", () => {
	assert.equal(
		momentExcerpt(
			"<style>.x{}</style><p>学习 &amp; 记录</p><script>secret()</script><p>&#x1f338; &#20013; &nbsp; &#25991;</p>",
		),
		"学习 & 记录 🌸 中 文",
	);
	assert.equal(momentExcerpt('<p><img src="/image.jpg"></p>'), "");
	assert.equal(
		momentExcerpt("<p>&#1114112; &lt;ok&gt;</p>"),
		"&#1114112; <ok>",
	);
});
