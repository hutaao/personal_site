/**
 * 日历取数：聚合已发布文章的发布/修改日期与非草稿动态。
 * SSR 直出（侧栏静态渲染在 Swup 容器外，不走 API 端点）；
 * 文章使用 frontmatter 日历日期，动态时间戳使用站点时区；
 * 同一内容在同一天发布并修改时只计一次，静态页面无需外部请求。
 */
import { getCollection } from "astro:content";
import { momentsConfig } from "@/config/momentsConfig";
import { getSortedPosts } from "./content-utils";
import { aggregateCalendarActivity, type CalendarPost } from "./calendar-activity";
import { formatInstantDateInSiteTimeZone } from "./content-date";
import { formatDateToYYYYMMDD } from "./date-utils";
import { getPostUrl, url } from "./url-utils.ts";

export type { CalendarPost } from "./calendar-activity";

export interface CalendarData {
	/** dateKey → 当日发布/修改的文章与动态，列表展开展示用 */
	postsByDate: Record<string, CalendarPost[]>;
	/** 有更新的月份列表（升序 YYYY-MM），跳月导航用（跳过空月） */
	activeMonths: string[];
}

export async function getCalendarData(): Promise<CalendarData> {
	const posts = await getSortedPosts();
	const entries: CalendarPost[] = [];

	for (const post of posts) {
		if (post.data.draft) continue;
		const date = formatDateToYYYYMMDD(post.data.published);
		const item: CalendarPost = {
			id: `post:${post.id}`,
			title: post.data.title,
			url: getPostUrl(post),
			date,
		};
		entries.push(item);
		if (post.data.updated) {
			entries.push({ ...item, date: formatDateToYYYYMMDD(post.data.updated) });
		}
	}
	if (momentsConfig.enable) {
		const moments = await getCollection("moments", ({ data }) => !data.draft);
		for (const moment of moments) {
			const title = (moment.body ?? "").replace(/[#*`>\[\]]/g, "").trim().split(/\r?\n/)[0] ?? moment.id;
			entries.push({
				id: `moment:${moment.id}`,
				title: title.slice(0, 80) || moment.id,
				url: `${url("/moments/")}#moment-${moment.id}`,
				date: formatInstantDateInSiteTimeZone(moment.data.published),
			});
		}
	}
	return aggregateCalendarActivity(entries);
}
