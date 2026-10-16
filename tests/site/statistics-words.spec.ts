import { expect, test } from "@playwright/test";
import { writeFile, rm } from "node:fs/promises";
import path from "node:path";

test("total words include full draft moments in development and refresh after saves", async ({ page }) => {
	const fixture = path.resolve(process.env.BLOG_TEST_ROOT ?? process.cwd(), "src/content/moments/local-word-count-test.md");
	let owns = false;
	await page.route(/^https:\/\//, route => route.abort());
	await page.goto("/moments/");
	const total = page.locator(".m3-site-stats__row").filter({ hasText: "总字数" }).locator(".m3-site-stats__value");
	const baseline = Number((await total.innerText()).replaceAll(",", ""));
	try {
		await writeFile(fixture, '---\npublished: 2099-01-01T00:00:00+08:00\ndraft: true\n---\n\n测试动态字数\n\n```js\nconst ignored = "not prose";\n```\n', { flag: "wx" });
		owns = true;
		await expect.poll(async () => {
			await page.reload();
			return Number((await total.innerText()).replaceAll(",", ""));
		}, { timeout: 15000 }).toBe(baseline + 6);
		await writeFile(fixture, '---\npublished: 2099-01-01T00:00:00+08:00\ndraft: true\n---\n\n测试动态字数增加\n');
		await expect.poll(async () => {
			await page.reload();
			return Number((await total.innerText()).replaceAll(",", ""));
		}, { timeout: 15000 }).toBe(baseline + 8);
	} finally {
		if (owns) await rm(fixture, { force: true });
	}
});
