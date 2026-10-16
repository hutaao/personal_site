import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const fixture = path.resolve(process.env.BLOG_TEST_ROOT ?? process.cwd(), "src/content/posts/local-image-layout-check.md");
let ownsFixture = false;
const coverFixtures: string[] = [];
const image = "https://layout.invalid/portrait.svg";
test.use({ reducedMotion: "reduce" });
test.beforeAll(async () => {
	await mkdir(path.dirname(fixture), { recursive: true });
	await writeFile(fixture, `---\ntitle: Local image layout check\npublished: 2026-10-14\nupdated: 2026-10-15\ndraft: true\ncategory: LayoutTest\ntags: [LayoutTest]\nimage: ${image}\n---\n\n![Default portrait](${image})\n\n![Percent portrait w-40%](${image} "Visible caption")\n\n![Pixels portrait|400](${image})\n\n![Both portrait w-50%|300](${image})\n\n![Box portrait|400x300](${image})\n`, { flag: "wx" });
	ownsFixture = true;
	for (const shape of ["landscape", "square"]) {
		const file = path.join(path.dirname(fixture), `local-image-layout-${shape}.md`);
		await writeFile(file, `---\ntitle: Local ${shape} cover check\npublished: 2026-10-14\ndraft: true\nimage: https://layout.invalid/${shape}.svg\n---\n\nCover fixture.\n`, { flag: "wx" });
		coverFixtures.push(file);
	}
});
test.afterAll(async () => {
	if (ownsFixture) await rm(fixture);
	for (const file of coverFixtures) await rm(file);
});

test.beforeEach(async ({ page }) => {
	await page.route("https://**/*", route => route.abort());
	await page.route("https://layout.invalid/**", route => {
		const [w, h] = route.request().url().includes("landscape") ? [1600, 900] : route.request().url().includes("square") ? [1200, 1200] : [1200, 1600];
		return route.fulfill({ contentType: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#6688aa"/><rect width="${w/4}" height="${h/4}" fill="#aa8866"/></svg>` });
	});
});

test("card preserves the whole cover; article keeps body images with bounded defaults and explicit sizes", async ({ page }) => {
	await page.goto("/");
	const card = page.locator(".m3-blog-postcard").filter({ has: page.getByRole("link", { name: "Local image layout check", exact: true }).first() });
	await expect(card).toHaveCount(1);
	await expect(card.locator(".m3-blog-postcard__cover-foreground img")).toHaveCSS("object-fit", "contain");
	await card.locator(".m3-blog-postcard__title").click();
	await expect(page).toHaveURL(/\/posts\/local-image-layout-check\//);
	await expect(page.locator("#post-cover")).toHaveCount(0);
	await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /portrait\.svg/);
	for (const [alt, widthFraction, pixelWidth, pixelHeight] of [
		["Default portrait", null, 720, 675],
		["Percent portrait", .4, null, null],
		["Pixels portrait", null, 400, null],
		["Both portrait", .5, null, null],
		["Box portrait", null, 400, 300],
	] as const) {
		const img = page.locator(`.custom-md img[alt="${alt}"]`);
		await img.scrollIntoViewIfNeeded();
		await expect.poll(() => img.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBe(1200);
		const size = await img.evaluate(el => ({ w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height, container: el.parentElement!.getBoundingClientRect().width }));
		expect(size.w / size.h).toBeCloseTo(.75, 2);
		if (widthFraction) expect(size.w).toBeCloseTo(size.container * widthFraction, 0);
		if (pixelWidth) expect(size.w).toBeLessThanOrEqual(pixelWidth);
		if (pixelHeight) expect(size.h).toBeLessThanOrEqual(pixelHeight);
	}
	await expect(page.locator(".markdown-image-caption")).toHaveText("Visible caption");
});

test("landscape, portrait and square covers use a complete sharp foreground with a decorative blurred copy", async ({ page }) => {
	await page.goto("/");
	for (const title of ["Local image layout check", "Local landscape cover check", "Local square cover check"]) {
		const card = page.locator(".m3-blog-postcard").filter({ has: page.locator(".m3-blog-postcard__title").filter({ hasText: title }) });
		const cover = card.locator(".m3-blog-postcard__cover");
		await cover.scrollIntoViewIfNeeded();
		const foreground = cover.locator(".m3-blog-postcard__cover-foreground img");
		const backdrop = cover.locator(".m3-blog-postcard__cover-backdrop");
		await expect.poll(() => foreground.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
		await expect(foreground).toHaveCSS("object-fit", "contain");
		await expect(foreground).toHaveCSS("filter", "none");
		await expect(backdrop).toHaveAttribute("aria-hidden", "true");
		await expect(backdrop.locator("img")).toHaveAttribute("alt", "");
		await expect(backdrop.locator("img")).toHaveCSS("object-fit", "cover");
		await expect(backdrop).toHaveCSS("filter", "blur(12px)");
		expect(await foreground.evaluate(el => (el as HTMLImageElement).currentSrc)).toBe(await backdrop.locator("img").evaluate(el => (el as HTMLImageElement).currentSrc));
		await expect(cover.locator(".m3-blog-postcard__cover-loading")).toHaveClass(/cover-loading--done/);
		const size = await cover.boundingBox();
		expect(size!.width).toBeGreaterThan(0);
		expect(size!.height).toBeGreaterThan(0);
	}
});

test("metadata identifies dates, category and tags on hover and keyboard focus", async ({ page }) => {
	await page.goto("/posts/local-image-layout-check/");
	for (const [key, text] of [["published", "发布日期"], ["updated", "最后更新日期"], ["category", "分类"], ["tags", "标签"]]) {
		await page.locator(`[data-postmeta="${key}"]`).hover();
		await expect(page.getByRole("tooltip", { name: text, exact: true })).toBeVisible();
		await page.mouse.move(0, 0);
	}
	await page.locator('[data-postmeta="category"] a').focus();
	await expect(page.getByRole("tooltip", { name: "分类", exact: true })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("tooltip", { name: "分类", exact: true })).toBeHidden();
});

for (const theme of ["light", "dark"]) {
	test(`article metadata and image changes remain accessible in ${theme} mode`, async ({ page }) => {
		await page.addInitScript(value => localStorage.setItem("theme", value), theme);
		await page.goto("/posts/local-image-layout-check/");
		await page.waitForFunction(() => document.documentElement.style.getPropertyValue("--mc-primary").trim().startsWith("#"));
		await page.waitForFunction(() => [...document.querySelectorAll(".onload-animation")].every(el => (el as HTMLElement).offsetParent === null || getComputedStyle(el).opacity === "1"));
		const results = await new AxeBuilder({ page }).disableRules(["page-has-heading-one"]).analyze();
		expect(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
	});
}
