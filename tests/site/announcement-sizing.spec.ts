import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("announcement adapts to text and stays visible despite legacy dismissal records", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.addInitScript(() => {
		localStorage.setItem("announcementClosed", "true");
		localStorage.setItem("announcementClosedTime", Date.now().toString());
	});
	await page.route(/^https:\/\//, route => route.abort());
	await page.goto("/");
	await page.waitForFunction(() => document.documentElement.style.getPropertyValue("--mc-primary").startsWith("#"));
	const widget = page.locator('widget-layout[data-id="announcement"]').first();
	const content = widget.locator(".announcement-content");
	await widget.scrollIntoViewIfNeeded();
	await expect(widget).toBeVisible();
	await expect(widget.locator(".announcement-close-btn")).toHaveCount(0);
	expect(await page.evaluate(() => localStorage.getItem("announcementClosed"))).toBe(null);
	expect(await content.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(18);
	await content.evaluate(el => { el.textContent = "欢迎来到我的博客！\n这里记录着我的生活"; });
	const compact = await widget.evaluate(el => {
		const body = el.querySelector(".announcement-content")!.getBoundingClientRect();
		return { height: el.getBoundingClientRect().height, bodyBottom: body.bottom, bottom: el.getBoundingClientRect().bottom };
	});
	expect(compact.bottom - compact.bodyBottom).toBeLessThan(25);
	await content.evaluate(el => { el.textContent = Array(20).fill("这是一段较长的公告，用于检查内容增加后能否自动增高。").join("\n"); });
	expect(await widget.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(compact.height + 200);
	expect(await content.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
	const axe = await new AxeBuilder({ page }).include('widget-layout[data-id="announcement"]').analyze();
	expect(axe.violations).toEqual([]);
	await page.locator('a[href="/about/"]:visible').first().click();
	await page.waitForURL("**/about/");
	await page.locator('a[href="/"]:visible').first().click();
	await page.waitForURL("http://127.0.0.1:4324/");
	await widget.scrollIntoViewIfNeeded();
	await expect(widget).toBeVisible();
	await expect(widget.locator(".announcement-close-btn")).toHaveCount(0);
});
