import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";

test("Waline local: administrator registration is available without creating an account", async ({ page }) => {
	await page.goto("http://127.0.0.1:8360/ui/register", { waitUntil: "domcontentloaded" });
	await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 30_000 });
	await expect(page.getByRole("button", { name: /注册|Register/i }).first()).toBeVisible();
});

test("Waline local: real emoji, local image and browser identity survive reload", async ({ page }) => {
	test.setTimeout(90_000);
	const cleanup = process.env.WALINE_LOCAL_CLEANUP;
	test.skip(!cleanup, "Requires exact owned-comment cleanup");
	let objectId: string | number | undefined;
	let original = "";
	const marker = `WALINE-LOCAL-CHECK-${Date.now()}-${Math.random().toString(36).slice(2)}-features`;
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/guestbook/", { waitUntil: "domcontentloaded" });
	const comments = page.locator(".shirone-waline");
	await comments.scrollIntoViewIfNeeded();
	expect(await comments.getAttribute("data-server-url")).toBe("http://127.0.0.1:8360");
	const editor = comments.locator(".wl-editor");
	await expect(editor).toBeVisible();
	await comments.locator('input[name="nick"]').fill("");
	await editor.fill(`${marker}\n`);
	await comments.locator('button.wl-action[title="表情"]').click();
	const emoji = comments.locator(".wl-emoji-popup.display .wl-tab-wrapper button img.wl-emoji").first();
	await expect(emoji).toBeVisible();
	await expect(emoji).toHaveAttribute("src", /@waline\/emojis@1\.1\.0\/weibo\//);
	await expect.poll(() => emoji.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0), { timeout: 30_000 }).toBe(true);
	const emojiName = await emoji.getAttribute("alt");
	await emoji.click();
	await expect(editor).toHaveValue(new RegExp(`:${emojiName}:`));
	const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/nS8AAAAASUVORK5CYII=", "base64");
	const chooserPromise = page.waitForEvent("filechooser");
	await comments.locator('label[for="wl-image-upload"]').press("Enter");
	const chooser = await chooserPromise;
	await chooser.setFiles({ name: "owned-local-test.png", mimeType: "image/png", buffer: png });
	await expect(editor).toHaveValue(/data:image\/png;base64,/);
	original = await editor.inputValue();
	expect(original).toContain(marker);
	try {
		const submitted = page.waitForResponse((response) => response.url().startsWith("http://127.0.0.1:8360/api/comment") && response.request().method() === "POST");
		await comments.getByRole("button", { name: "提交", exact: true }).click();
		const response = await submitted;
		// SDK expands :emoji: into an image before sending. Cleanup must match
		// the exact submitted record, rather than the editor's shorthand text.
		original = response.request().postDataJSON().comment;
		const payload = await response.json();
		objectId = payload.data?.objectId;
		expect(response.ok(), JSON.stringify(payload)).toBe(true);
		expect(payload.errno, JSON.stringify(payload)).toBe(0);
		expect(objectId).toBeTruthy();
		await page.reload({ waitUntil: "domcontentloaded" });
		await comments.scrollIntoViewIfNeeded();
		const card = comments.locator(`.wl-card-item[id="${objectId}"]`);
		await expect(card.locator(".wl-content")).toContainText(marker);
		const images = card.locator(".wl-content img");
		await expect(images).toHaveCount(2);
		for (const image of await images.all()) {
			await expect(image).toBeVisible();
			await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0), { timeout: 30_000 }).toBe(true);
		}
		await expect(card.locator(".wl-browser")).toBeVisible();
		await expect(card.locator(".wl-browser")).toContainText(/Chrome/);
		await expect(card.locator(".wl-os")).toBeVisible();
		await expect(card.locator(".wl-addr")).toHaveCount(0);
	} finally {
		if (objectId) {
			const output = execFileSync(process.execPath, [path.resolve(cleanup!), String(objectId), original], { encoding: "utf8" });
			expect(JSON.parse(output).deleted).toBe(1);
		}
	}
});
