import { expect, test } from "@playwright/test";

// 用户尚未收录网址时，分类仍须可见；搜索不得把空组当作命中。
test("导航分类：空板块保留，筛选可取消且刷新保留", async ({ page }) => {
	await page.goto("/compass/");
	await expect(page.locator(".compass-shelf")).toHaveCount(3);
	await expect(page.locator(".compass-shelf .section-title__title")).toHaveText(["开发", "项目", "资源"]);
	const projects = page.getByRole("button", { name: "项目", exact: true });
	await projects.click();
	await expect(page.locator(".compass-shelf")).toHaveCount(1);
	await expect(page.locator('[data-shelf="projects"]')).toBeVisible();
	await expect(page).toHaveURL(/group=projects/);
	await page.reload();
	await expect(projects).toHaveAttribute("aria-pressed", "true");
	await expect(page.locator(".compass-shelf")).toHaveCount(1);
	await projects.click();
	await expect(page.locator(".compass-shelf")).toHaveCount(3);
	await expect(page).not.toHaveURL(/group=/);
});

test("导航分类：无搜索结果可清除，不丢失三个板块", async ({ page }) => {
	await page.goto("/compass/");
	await expect(page.locator(".compass-shelf")).toHaveCount(3);
	await page.getByRole("searchbox").fill("not-collected-site");
	await expect(page.locator(".compass-section__empty")).toBeVisible();
	await expect(page.locator(".compass-shelf")).toHaveCount(0);
	await page.getByRole("searchbox").fill("");
	await expect(page.locator(".compass-shelf")).toHaveCount(3);
});
