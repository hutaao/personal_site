import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";

// Opt-in regression against the real loopback trial service. Cleanup is limited
// to the exact ID/content created here, never existing visitor comments.
test("Waline local: like, unlike, reload and Swup keep one consistent count", async ({ page }) => {
	const cleanup = process.env.WALINE_LOCAL_CLEANUP;
	test.skip(!cleanup, "Requires the owned local-trial cleanup script");
	const message = `WALINE-LOCAL-CHECK-${Date.now()}-${Math.random().toString(36).slice(2)}-likes`;
	let objectId: string | number | undefined;
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/guestbook/", { waitUntil: "domcontentloaded" });
	const comments = page.locator(".shirone-waline");
	await comments.scrollIntoViewIfNeeded();
	await expect(comments.locator(".wl-editor")).toBeVisible();
	expect(await comments.getAttribute("data-server-url")).toBe("http://127.0.0.1:8360");
	try {
		await comments.locator('input[name="nick"]').fill("");
		await comments.locator(".wl-editor").fill(message);
		const submission = page.waitForResponse((response) =>
			response.url().startsWith("http://127.0.0.1:8360/api/comment") && response.request().method() === "POST",
		);
		await comments.getByRole("button", { name: "提交", exact: true }).click();
		const submitted = await submission;
		const created = await submitted.json();
		objectId = created.data?.objectId;
		expect(submitted.ok(), JSON.stringify(created)).toBe(true);
		expect(created.errno, JSON.stringify(created)).toBe(0);
		expect(objectId).toBeTruthy();
		const card = () => comments.locator(`.wl-card-item[id="${objectId}"]`);
		const button = () => card().locator("button.wl-like");
		await expect(card().locator(".wl-content")).toContainText(message);
		await expect(button()).toHaveText("0");
		const updates: { status: number; payload: unknown }[] = [];
		page.on("response", async (response) => {
			if (response.url().startsWith(`http://127.0.0.1:8360/api/comment/${objectId}`) && response.request().method() === "PUT") {
				updates.push({ status: response.status(), payload: await response.json() });
			}
		});
		const toggle = async (count: number, responseCount: number) => {
			const updated = page.waitForResponse((response) =>
				response.url().startsWith(`http://127.0.0.1:8360/api/comment/${objectId}`) && response.request().method() === "PUT",
			);
			await button().click();
			const response = await updated;
			const payload = await response.json();
			expect(response.ok(), JSON.stringify(payload)).toBe(true);
			expect(payload.errno).toBe(0);
			expect(String(payload.data.objectId)).toBe(String(objectId));
			expect(payload.data.comment).toContain(message);
			expect(payload.data.like).toBe(count);
			await expect(button()).toHaveText(String(count));
			await expect.poll(() => updates.length).toBe(responseCount);
		};
		await toggle(1, 1);
		await toggle(0, 2);
		await page.reload({ waitUntil: "domcontentloaded" });
		await comments.scrollIntoViewIfNeeded();
		await expect(button()).toHaveText("0");
		await page.waitForFunction(() => Boolean(window.swup));
		await page.evaluate(() => window.swup.navigate("/"));
		await expect(page).toHaveURL(/\/$/);
		await expect(comments).toHaveCount(0);
		await page.evaluate(() => window.swup.navigate("/guestbook/"));
		await expect(page).toHaveURL(/\/guestbook\/$/);
		await comments.scrollIntoViewIfNeeded();
		await expect(comments.locator(".wl-editor")).toHaveCount(1);
		await expect(button()).toHaveText("0");
		await toggle(1, 3);
		await page.reload({ waitUntil: "domcontentloaded" });
		await comments.scrollIntoViewIfNeeded();
		await expect(button()).toHaveText("1");
		expect(updates).toHaveLength(3);
		expect(updates.every((update) => update.status === 200)).toBe(true);
	} finally {
		if (objectId) {
			const result = execFileSync(process.execPath, [path.resolve(cleanup!), String(objectId), message], { encoding: "utf8" });
			expect(JSON.parse(result).deleted).toBe(1);
		}
	}
});
