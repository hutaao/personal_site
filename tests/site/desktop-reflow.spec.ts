import { expect, test, type Page } from "@playwright/test";

// Desktop pointer capabilities distinguish zoomed desktop from a touch device.
// CSS viewport checks complement the real browser zoom check.
// Like layout-stability.spec.ts, retain native scrollbar gutters: Playwright's
// default --hide-scrollbars creates nonrepresentative root width measurements.
test.use({
  reducedMotion: "reduce",
  launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] },
});

async function revealHomeNavigation(page: Page) {
  await page.locator("#main-layout").evaluate(el => el.scrollIntoView({ behavior: "instant", block: "start" }));
  await page.evaluate(() => scrollTo({ left: 0, behavior: "instant" }));
  await expect(page.locator("#navbar-wrapper")).toBeVisible();
}

async function assertDesktopColumns(page: Page, width: number) {
  const layout = page.locator("#main-layout");
  const mode = await layout.getAttribute("data-desktop-sidebar-layout");
  const minimum = mode === "dual" ? 1280 : mode === "single" ? 1100 : 0;
  const columns = mode === "dual" ? 3 : mode === "single" ? 2 : 1;
  await expect.poll(() => page.locator("#main-grid").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(columns);
  await expect.poll(() => layout.evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(minimum);
  const viewport = await page.evaluate(() => ({
    extent: document.documentElement.scrollWidth,
    available: document.documentElement.clientWidth,
  }));
  // The vertical scrollbar reserves CSS pixels; innerWidth includes that gutter.
  expect(viewport.extent).toBeGreaterThanOrEqual(Math.max(viewport.available, minimum));
  if (viewport.available < minimum) expect(viewport.extent).toBeGreaterThan(viewport.available);
  if (mode !== "none") {
    await expect(page.locator("#sidebar")).toBeVisible();
    if (mode === "dual") await expect(page.locator("#sidebar-secondary")).toBeVisible();
    // Both edge columns are reachable through native document scrolling.
    for (const edge of ["left", "right"]) {
      await page.evaluate(side => scrollTo({ left: side === "left" ? 0 : document.documentElement.scrollWidth, behavior: "instant" }), edge);
      const bounds = await page.evaluate(side => {
        const sidebars = [...document.querySelectorAll<HTMLElement>("#sidebar, #sidebar-secondary")]
          .filter(el => getComputedStyle(el).display !== "none")
          .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
        const sidebar = side === "left" ? sidebars[0] : sidebars[sidebars.length - 1];
        const rect = sidebar.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: document.documentElement.clientWidth };
      }, edge);
      expect(bounds.left, `${edge} sidebar at ${width}`).toBeGreaterThanOrEqual(-1);
      expect(bounds.right, `${edge} sidebar at ${width}`).toBeLessThanOrEqual(bounds.width + 1);
    }
  }
  await page.evaluate(() => scrollTo({ left: 0, behavior: "instant" }));
}

test("zoomed desktop retains its sidebar columns with reachable horizontal scrolling", async ({ page }) => {
  await page.route("https://**/*", route => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--mc-primary").trim())).not.toBe("");
  expect(await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches)).toBe(true);
  for (const width of [1536, 1280, 1100, 1024, 960, 768, 640]) {
    await page.setViewportSize({ width, height: 720 });
    await revealHomeNavigation(page);
    await assertDesktopColumns(page, width);
    const nav = page.locator(".top-app-bar__nav");
    if (await nav.isVisible()) {
      const navBox = (await nav.boundingBox())!;
      const brand = (await page.locator(".top-app-bar__brand").boundingBox())!;
      expect(navBox.x).toBeGreaterThanOrEqual(brand.x + brand.width);
      const search = (await page.locator(".top-app-bar__search-shell").boundingBox())!;
      expect(navBox.x + navBox.width).toBeLessThanOrEqual(search.x);
    } else {
      await expect(page.locator("#nav-drawer-switch")).toBeVisible();
      const menu = (await page.locator("#nav-drawer-switch").boundingBox())!;
      expect(menu.x).toBeGreaterThanOrEqual(0);
      expect(menu.x + menu.width).toBeLessThanOrEqual(width);
    }
  }
});

test("desktop columns and navigation survive a Swup visit and narrower viewport", async ({ page }) => {
  await page.route("https://**/*", route => route.abort());
  await page.setViewportSize({ width: 1536, height: 800 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.swup));
  await revealHomeNavigation(page);
  await page.evaluate(() => document.addEventListener("swup:content:replace", () => {
    document.documentElement.dataset.reflowVisit = "replaced";
  }, { once: true }));
  await page.locator('.top-app-bar__nav a[data-nav-key="moments"]').click();
  await expect(page.locator("#swup-container")).toHaveAttribute("data-current-page", "moments");
  await expect(page.locator("html")).toHaveAttribute("data-reflow-visit", "replaced");
  await page.setViewportSize({ width: 960, height: 600 });
  await expect(page.locator("#nav-drawer-switch")).toBeVisible();
  await assertDesktopColumns(page, 960);
});

test.describe("touch layout", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test("keeps the existing stacked mobile layout", async ({ page }) => {
    await page.route("https://**/*", route => route.abort());
    await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches)).toBe(false);
    await expect.poll(() => page.locator("#main-grid").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(1);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
});
