import { expect, test } from "@playwright/test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

test.describe("相册页响应式滚动", () => {
	test("从手机视口切换到桌面视口后仍可滚动", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/albums/AcgExample/", { waitUntil: "networkidle" });
		await expect(page.locator(".album-gallery__item").first()).toBeVisible();

		await page.setViewportSize({ width: 1440, height: 900 });
		await expect
			.poll(() =>
				page.evaluate(
					() => document.documentElement.scrollHeight > window.innerHeight,
				),
			)
			.toBe(true);

		await page.evaluate(() => window.scrollTo(0, 700));
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeGreaterThan(0);

		await expect(page.locator("html")).not.toHaveAttribute(
			"data-overlayscrollbars",
		);
		await expect(page.locator("body")).not.toHaveAttribute(
			"data-overlayscrollbars",
		);
	});
});

test.describe("shared local cover", () => {
	const albumRoot = path.resolve(process.env.BLOG_TEST_ROOT ?? process.cwd(), "public/images/albums");
	const owned: string[] = [];
	const ids = ["local-shared-cover-check", "local-shared-cover-protected-check"];
	test.use({ reducedMotion: "reduce" });
	test.beforeAll(async () => {
		await mkdir(albumRoot, { recursive: true });
		for (const [index, id] of ids.entries()) {
			const dir = path.join(albumRoot, id);
			await mkdir(dir); // Never overwrite an existing album.
			owned.push(dir);
			await writeFile(path.join(dir, "info.json"), JSON.stringify({ title: id, cover: "01.jpg", date: "2026-10-15", layout: index ? "masonry" : "grid", columns: index ? 4 : 2, ...(index ? { password: "fixture-password" } : {}) }));
			for (const [name, width, height] of [["01.jpg", 120, 180], ["02.jpg", 180, 120]] as const) {
				await sharp({ create: { width, height, channels: 3, background: "#163041" } }).jpeg().toFile(path.join(dir, name));
			}
		}
	});
	test.afterAll(async () => {
		for (const dir of owned) {
			if (!path.resolve(dir).startsWith(albumRoot + path.sep) || !path.basename(dir).startsWith("local-shared-cover-")) throw new Error("Refusing cleanup outside owned fixture root");
			await rm(dir, { recursive: true, force: true });
		}
	});
	test.beforeEach(async ({ page }) => { await page.route("https://**/*", route => route.abort()); });

	test("one photo supplies the index cover and remains in the ordinary gallery", async ({ page }) => {
		await page.goto("/albums/");
		const link = page.locator(`.album-card__link[href="/albums/${ids[0]}/"]`);
		await expect(link.locator("img")).toHaveAttribute("src", new RegExp(`${ids[0]}/01\\.jpg$`));
		await page.waitForFunction(() => Boolean(window.swup));
		await link.click();
		await expect(page).toHaveURL(new RegExp(`/albums/${ids[0]}/$`));
		await expect(page.locator(".album-gallery__item")).toHaveCount(2);
		await expect(page.locator(".album-detail__hero > img")).toHaveAttribute("src", new RegExp(`${ids[0]}/01\\.jpg$`));
		await expect(page.locator('.album-gallery__item img[src$="/01.jpg"]')).toHaveCount(1);
		await expect(page.locator(".album-gallery")).toHaveClass(/album-gallery--grid/);
	});

	test("the shared cover also survives protected-album unlock and preserves layout", async ({ page }) => {
		await page.goto(`/albums/${ids[1]}/`);
		await expect(page.locator(".album-detail__hero > img")).toHaveAttribute("src", new RegExp(`${ids[1]}/01\\.jpg$`));
		await expect(page.locator(".password-gate")).toBeVisible();
		await expect(page.locator(".album-gallery__item")).toHaveCount(0);
		await page.locator('.password-gate input[name="password"]').fill("fixture-password");
		await page.locator('.password-gate button[type="submit"]').click();
		await expect(page.locator(".album-gallery__item")).toHaveCount(2);
		await expect(page.locator('.album-gallery__item img[src$="/01.jpg"]')).toHaveCount(1);
		await expect(page.locator(".album-gallery")).toHaveClass(/album-gallery--masonry/);
		await expect(page.locator(".password-gate")).toBeHidden();
	});
});

test.describe("受保护相册", () => {
	test("提供完整的密码输入与解锁反馈", async ({ page }) => {
		await page.goto("/albums/EncryptedExample/", { waitUntil: "networkidle" });

		const input = page.getByRole("textbox", { name: "Password" });
		const submit = page.getByRole("button", { name: "Unlock album" });
		const visibility = page.getByRole("button", { name: "Show password" });

		await expect(
			page.getByRole("heading", { name: "This album is protected" }),
		).toBeVisible();
		await expect(page.getByText("Six digits", { exact: true })).toBeVisible();
		await expect(input).toHaveAttribute("type", "password");
		await expect(input).toHaveAttribute("autocomplete", "current-password");

		await visibility.click();
		await expect(input).toHaveAttribute("type", "text");
		await expect(
			page.getByRole("button", { name: "Hide password" }),
		).toBeVisible();

		await submit.click();
		await expect(
			page.getByText("Enter a password", { exact: true }),
		).toBeVisible();
		await expect(input).toHaveAttribute("aria-invalid", "true");

		await input.fill("000000");
		await expect(
			page.getByText("Enter a password", { exact: true }),
		).toBeHidden();
		await submit.click();
		await expect(
			page.getByText("That password could not unlock this album", {
				exact: true,
			}),
		).toBeVisible();

		await input.fill("123456");
		await submit.click();
		await expect(page.locator(".album-gallery__item")).toHaveCount(2);
		await expect(page.locator(".album-gallery")).toHaveClass(
			/album-gallery--masonry/,
		);
		await expect(page.locator(".album-gallery")).not.toHaveClass(
			/album-gallery--grid/,
		);
		const portrait = page.getByAltText("A protected vertical photograph");
		const landscape = page.getByAltText("A protected garden landscape");
		await expect(
			page.locator(".album-gallery__item img").first(),
		).toHaveAttribute("alt", "A protected vertical photograph");
		await expect
			.poll(async () => {
				const portraitBox = await portrait.boundingBox();
				const landscapeBox = await landscape.boundingBox();
				if (!portraitBox || !landscapeBox) return false;
				const naturalDirections = await page.evaluate(() => {
					const portraitImage = document.querySelector(
						'img[alt="A protected vertical photograph"]',
					) as HTMLImageElement | null;
					const landscapeImage = document.querySelector(
						'img[alt="A protected garden landscape"]',
					) as HTMLImageElement | null;
					return Boolean(
						portraitImage &&
							landscapeImage &&
							portraitImage.naturalHeight > portraitImage.naturalWidth &&
							landscapeImage.naturalWidth > landscapeImage.naturalHeight,
					);
				});
				return (
					naturalDirections &&
					portraitBox.height > portraitBox.width &&
					landscapeBox.width > landscapeBox.height &&
					portraitBox.x <= landscapeBox.x
				);
			})
			.toBe(true);
		await expect(page.locator(".password-gate")).toBeHidden();
		await expect
			.poll(() =>
				page.locator(".album-detail__gallery").evaluate((element) => {
					const style = getComputedStyle(element);
					return (
						style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
						style.padding !== "0px"
					);
				}),
			)
			.toBe(true);
	});
});
