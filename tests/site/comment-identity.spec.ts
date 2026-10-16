import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const theme of ["light", "dark"]) {
  test(`comment identity: nickname required, verified owner badge, ${theme}`, async ({ page }) => {
    await page.addInitScript(theme => localStorage.setItem("theme", theme), theme);
    await page.emulateMedia({ reducedMotion: "reduce" });
    let posts = 0;
    await page.route(/\/api\/comment(?:\?|$)/, route => {
      if (route.request().method() === "POST") {
        posts++;
        return route.fulfill({ json: { errno: 0, data: { objectId: 903, nick: "访客", comment: "<p>fixture</p>", time: Date.now(), children: [] } } });
      }
      return route.fulfill({ json: { errno: 0, data: { page: 1, totalPages: 1, pageSize: 10, count: 2, data: [
        { objectId: 901, nick: "hutaao", type: "administrator", comment: "<p>管理员测试</p>", time: 1792108800000, children: [] },
        { objectId: 902, nick: "hutaao", type: "guest", comment: "<p>同名访客测试</p>", time: 1792108800000, children: [] },
      ] } } });
    });
    // The main project uses the real GitHub Pages base, unlike the legacy root preview.
    await page.goto("/personal_site/guestbook/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue("--mc-primary").trim().startsWith("#"));
    const comments = page.locator(".shirone-waline");
    await comments.scrollIntoViewIfNeeded();
    await expect(comments.locator(".wl-editor")).toBeVisible();
    await expect(comments.locator('input[name="nick"]')).toHaveAttribute("required", "");
    for (const name of ["mail", "link"]) expect(await comments.locator(`input[name="${name}"]`).evaluate((input: HTMLInputElement) => input.required)).toBe(false);
    await expect(comments.locator("[data-owner-badge]")).toHaveCount(1);
    await expect(comments.locator("[data-owner-badge]")).toHaveText("博主");
    await comments.locator('input[name="nick"]').fill("");
    await comments.locator(".wl-editor").fill("fixture");
    await comments.getByRole("button", { name: "提交", exact: true }).click();
    expect(await comments.locator('input[name="nick"]').evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
    expect(posts).toBe(0);
    await comments.locator('input[name="nick"]').fill("访客");
    await comments.getByRole("button", { name: "提交", exact: true }).click();
    await expect.poll(() => posts).toBe(1);
    await page.waitForFunction(() => Boolean(window.swup));
    await page.evaluate(() => window.swup.navigate("/personal_site/"));
    await expect(page.locator(".shirone-waline")).toHaveCount(0);
    await page.evaluate(() => window.swup.navigate("/personal_site/guestbook/"));
    await comments.scrollIntoViewIfNeeded();
    await expect(comments.locator(".wl-editor")).toHaveCount(1);
    await expect(comments.locator("[data-owner-badge]")).toHaveCount(1);
    await expect(comments.locator('input[name="nick"]')).toHaveAttribute("aria-required", "true");
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*\bdark\b)/);
    await comments.screenshot({ path: `.blog-local/comment-identity-${theme}.png` });
    const result = await new AxeBuilder({ page }).include(".shirone-waline").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(result.violations).toEqual([]);
  });
}
