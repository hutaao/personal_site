import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile, rm } from "node:fs/promises";
import path from "node:path";

const fixtureRoot = process.env.BLOG_TEST_ROOT ?? process.cwd();
const fixture = path.resolve(fixtureRoot, "src/content/moments/local-disclosure-test.md");
const shortFixture = path.resolve(fixtureRoot, "src/content/moments/local-disclosure-short-test.md");
const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZQAAAABJRU5ErkJggg==";
let ownsLong = false, ownsShort = false;
test.beforeAll(async () => {
	await writeFile(fixture, `---\npublished: 2099-01-01T12:00:00+08:00\ndraft: true\n---\n\nDISCLOSURE_TEST_START ${"文字".repeat(70)}\n\n${"完整段落".repeat(25)}\n\n![One w-50%](${pixel} "Whole caption")\n\n${"后续正文".repeat(150)}\n\n![Two](${pixel})\n\n![Three](${pixel})\n\nDISCLOSURE_TEST_END\n`, { flag: "wx" });
	ownsLong = true;
	await writeFile(shortFixture, "---\npublished: 2098-01-01T12:00:00+08:00\ndraft: true\n---\n\nDISCLOSURE_SHORT_TEST\n", { flag: "wx" });
	ownsShort = true;
});
test.afterAll(async () => {
	if (ownsLong) await rm(fixture, { force: true });
	if (ownsShort) await rm(shortFixture, { force: true });
});

test("long moments expand whole images and collapse accessibly on direct load and navigation", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.route(/^https:\/\//, route => route.abort());
	await page.goto("/moments/");
	const card = page.locator(".moment-card").filter({ hasText: "DISCLOSURE_TEST_START" });
	const toggle = card.getByRole("button", { name: /展开全文/ });
	await expect(toggle).toHaveAttribute("aria-expanded", "false");
	await expect(card.locator(".moment-card__content img")).toHaveCount(0);
	await expect(toggle).toContainText("……");
	const collapsedA11y = await new AxeBuilder({ page }).include(".moment-card").analyze();
	expect(collapsedA11y.violations).toEqual([]);
	await toggle.click();
	const collapse = card.getByRole("button", { name: "收起", exact: true });
	await expect(collapse).toHaveAttribute("aria-expanded", "true");
	await expect(card.locator(".moment-card__content img")).toHaveCount(3);
	await expect(card.locator("figcaption")).toHaveText("Whole caption");
	await expect(card).toContainText("DISCLOSURE_TEST_END");
	const expandedA11y = await new AxeBuilder({ page }).include(".moment-card").analyze();
	expect(expandedA11y.violations).toEqual([]);
	await collapse.scrollIntoViewIfNeeded();
	await collapse.click();
	await expect(toggle).toBeFocused();
	await expect(card.locator(".moment-card__content img")).toHaveCount(0);
	expect(await card.evaluate(el => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(70);
	const short = page.locator(".moment-card").filter({ hasText: "DISCLOSURE_SHORT_TEST" });
	await expect(short.getByRole("button")).toHaveCount(0);
	await page.locator('a[href="/about/"]:visible').first().click();
	await page.waitForURL("**/about/");
	await page.locator('a[href="/moments/"]:visible').first().click();
	await page.waitForURL("**/moments/");
	await expect(toggle).toHaveAttribute("aria-expanded", "false");
	await toggle.focus();
	await page.keyboard.press("Enter");
	await expect(collapse).toBeVisible();
});
