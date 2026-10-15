import { expect, test } from "@playwright/test";
import { writeFile, rm, mkdir } from "node:fs/promises";
import path from "node:path";
import { resolveUmamiOptions, resolveUmamiTrackingOptions } from "../../src/config/umamiConfig";
const fixture = path.resolve(process.env.BLOG_TEST_ROOT ?? process.cwd(), "src/content/posts/private-analytics-test.md");
let ownsFixture = false;
test.beforeAll(async () => {
	await mkdir(path.dirname(fixture), { recursive: true });
	await writeFile(fixture, '---\ntitle: Private analytics test\npublished: 2026-10-15\ndraft: true\n---\n\nTest body.\n', { flag: "wx" });
	ownsFixture = true;
});
test.afterAll(async () => { if (ownsFixture) await rm(fixture, { force: true }); });

test("private analytics keeps tracking independent from the disabled public API", () => {
	const config = { enable: true, shareUrl: "", websiteId: " example-id ", scriptUrl: " https://cloud.umami.is/script.js " };
	expect(resolveUmamiOptions(config)).toBeNull();
	expect(resolveUmamiTrackingOptions(config)).toEqual({ websiteId: "example-id", scriptUrl: "https://cloud.umami.is/script.js" });
	expect(resolveUmamiTrackingOptions({ ...config, enable: false })).toBeNull();
});

test("profile and article do not expose metrics or a share URL, but keep the collector", async ({ page }) => {
	const requests: string[] = [];
	page.on("request", request => requests.push(request.url()));
	await page.route(/^https:\/\//, route => route.abort());
	for (const route of ["/", "/posts/private-analytics-test/"]) {
		const response = await page.goto(route);
		expect(response?.status()).toBe(200);
		await expect(page.locator("[data-shirone-umami]")).toHaveCount(0);
		await expect(page.locator("[data-shirone-umami-pageviews], [data-shirone-umami-visits]")).toHaveCount(0);
		await expect(page.locator("style[data-shirone-umami-runtime]")).toHaveCount(0);
		await expect(page.locator('script[src="https://cloud.umami.is/script.js"][data-website-id]')).toHaveCount(1);
		const html = await response!.text();
		expect(/cloud\.umami\.is\/(?:analytics\/us\/)?share\//.test(html), "no share URL in HTML").toBe(false);
		expect(await page.evaluate(() => Boolean(window.oddmisc))).toBe(false);
	}
	expect(requests.filter(address => /oddmisc|umami\.is\/.*(?:share|stats)/i.test(address))).toEqual([]);
});
