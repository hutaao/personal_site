import { expect, test, type Page } from "@playwright/test";

async function open(page: Page, mode: string, theme = "light") {
	await page.addInitScript(
		({ mode, theme }) => {
			localStorage.setItem("theme", theme);
			localStorage.setItem(
				"hutaao-display-preferences",
				JSON.stringify({ mode, layout: "classic", sakura: false }),
			);
		},
		{ mode, theme },
	);
	await page.goto("/");
	await expect(page.locator("html")).toHaveAttribute("data-preview-mode", mode);
}

test("banner navigation stays available at the top, while reading, and after Swup navigation", async ({
	page,
}) => {
	await open(page, "banner");
	const nav = page.locator("#navbar");
	await expect(nav).toBeVisible();
	await expect(page.locator("#navbar-wrapper")).not.toHaveAttribute(
		"inert",
		"",
	);
	await page.evaluate(() => window.scrollTo(0, innerHeight + 128));
	await expect(nav).toBeVisible();
	await page.evaluate(() => window.scrollTo(0, 0));
	await expect(nav).toBeVisible();
	await page
		.locator("#navbar")
		.getByRole("link", { name: "归档", exact: true })
		.click();
	await expect(page).toHaveURL(/\/archive\/$/);
	await expect(nav).toBeVisible();
	await page
		.locator("#navbar")
		.getByRole("link", { name: "主页", exact: true })
		.click();
	await expect(page).toHaveURL(/\/$/);
	await expect(nav).toBeVisible();
});

test("fullscreen conceals navigation until entering the reading area", async ({
	page,
}) => {
	await open(page, "fullscreen");
	const nav = page.locator("#navbar");
	await expect(nav).toBeHidden();
	await page.evaluate(() => window.scrollTo(0, innerHeight + 128));
	await expect(nav).toBeVisible();
	await expect(page.locator("#navbar-wrapper")).not.toHaveAttribute(
		"inert",
		"",
	);
});

test("sidebar moments, site information and daily activity use linked content", async ({
	page,
}) => {
	await open(page, "banner");
	const sidebar = page.locator("#sidebar-secondary");
	await expect(sidebar.locator("#sidebar-moments")).toBeVisible();
	await expect(
		sidebar.locator("#sidebar-moments a[href*='#moment-']"),
	).toHaveCount(3);
	const info = sidebar.locator("#site-info");
	await info.scrollIntoViewIfNeeded();
	await info.locator("summary").click();
	await expect(info.locator("details")).toHaveAttribute("open", "");
	await expect(info.locator(".site-info__grid")).toContainText(
		"hutaao.github.io",
	);
	const heatmap = sidebar.locator(".m3-calendar__heatmap");
	await heatmap.scrollIntoViewIfNeeded();
	await expect(heatmap.locator(".m3-calendar__activity-cell")).toHaveCount(112);
	const day = heatmap.locator('button[aria-disabled="false"]').last();
	const date = await day.getAttribute("data-date");
	const count = Number(await day.getAttribute("data-count"));
	await day.click();
	await expect(day).toHaveAttribute("aria-expanded", "true");
	const entries = sidebar.locator("#calendar-selected-entries");
	await expect(entries).toContainText(date!);
	await expect(entries.locator("a")).toHaveCount(count);
});

for (const theme of ["light", "dark"]) {
	test(`activity squares show unobstructed hover and keyboard hints in ${theme} mode`, async ({
		page,
	}) => {
		await open(page, "banner", theme);
		if (theme === "dark")
			await expect(page.locator("html")).toHaveClass(/dark/);
		const heatmap = page.locator(".m3-calendar__heatmap");
		await heatmap.scrollIntoViewIfNeeded();
		const empty = heatmap.locator('button[data-count="0"]').first();
		await empty.hover();
		const tooltip = page.locator("#calendar-activity-tooltip");
		await expect(tooltip).toBeVisible();
		await expect(tooltip).toContainText("0 条更新");
		await expect(tooltip).toContainText(
			(await empty.getAttribute("data-date"))!,
		);
		const bounds = await tooltip.boundingBox();
		expect(bounds!.x).toBeGreaterThanOrEqual(0);
		expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
			page.viewportSize()!.width,
		);
		await expect(empty).toBeDisabled();
		await expect(page.locator("#calendar-selected-entries a")).toHaveCount(0);
		const active = heatmap.locator('button[aria-disabled="false"]').last();
		await active.focus();
		await expect(tooltip).toBeVisible();
		await expect(tooltip).toContainText(
			(await active.getAttribute("data-date"))!,
		);
		await page.evaluate(() => window.scrollBy(0, 12));
		await expect(tooltip).toHaveCount(0);
		await active.hover();
		await expect(tooltip).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(tooltip).toHaveCount(0);
		await active.press("Enter");
		await expect(active).toHaveAttribute("aria-expanded", "true");
	});
}
