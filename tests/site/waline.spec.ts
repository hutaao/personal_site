import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { execFileSync } from "node:child_process";
import path from "node:path";

// Read-only UI checks use deterministic comment/avatar fixtures. Real loopback
// writes remain explicitly opt-in and require exact owned-comment cleanup.
async function ready(page: Page, theme: "light" | "dark", mock = true, brokenAvatar = false, storage: "inline" | "blob" = "inline") {
  if (mock) {
    // Test either storage mode without switching the user's live configuration
    // or creating real cloud objects before the backend is approved/deployed.
    await page.route("**/guestbook/", async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace(/data-image-storage="(?:inline|blob)"/, `data-image-storage="${storage}"`);
      await route.fulfill({ response, body });
    });
  }
  if (mock) {
    await page.route(/\/api\/comment(?:\?|$)/, route => {
      if (route.request().method() !== "GET") return route.continue();
      return route.fulfill({ json: { errno: 0, errmsg: "", data: {
        page: 1, totalPages: 1, pageSize: 10, count: 1,
        data: [{ objectId: 901, nick: "头像测试", comment: "<p>头像显示测试</p>",
          avatar: "https://avatar.test/visitor.svg", link: "https://example.com/",
          time: 1792108800000, like: 0, children: [], status: "approved" }],
      } } });
    });
    await page.route("https://avatar.test/visitor.svg", route => brokenAvatar ? route.abort() : route.fulfill({
      contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><circle cx="24" cy="24" r="24" fill="#287080"/></svg>',
    }));
  }
	await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/guestbook/", { waitUntil: "domcontentloaded" });
	await page.waitForFunction(() =>
		getComputedStyle(document.documentElement).getPropertyValue("--mc-primary").trim().startsWith("#"),
	);
	await page.locator(".shirone-waline").scrollIntoViewIfNeeded();
	await expect(page.locator(".shirone-waline .wl-editor")).toBeVisible();
	await expect(page.locator(".shirone-waline .wl-editor")).toHaveCount(1);
}

for (const theme of ["light", "dark"] as const) {
		test(`Waline ${theme}: required nickname, optional contact fields, avatar and upload, no visitor login or tracking controls`, async ({ page }) => {
		await ready(page, theme);
		await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*\bdark\b)/);
		const comments = page.locator(".shirone-waline");
		await expect(comments.locator(".wl-header input")).toHaveCount(3);
    for (const field of ["nick", "mail", "link"]) {
      const input = comments.locator(`input[name="${field}"]`);
      await expect(input).toBeVisible();
      expect(await input.evaluate((element: HTMLInputElement) => element.required)).toBe(field === "nick");
    }
    const avatar = comments.locator('img[src="https://avatar.test/visitor.svg"]');
    await expect(avatar).toBeVisible();
    await expect.poll(() => avatar.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
		await expect(comments.locator(".wl-login, .wl-reaction")).toHaveCount(0);
		await expect(comments.locator('label[for="wl-image-upload"]')).toBeVisible();
		await expect(comments.getByRole("button", { name: /登录|注册/ })).toHaveCount(0);
		const editor = comments.locator(".wl-editor");
		const colors = await editor.evaluate((element) => ({
			text: getComputedStyle(element).color,
			background: getComputedStyle(element).backgroundColor,
		}));
		expect(colors.text).not.toBe(colors.background);
		await comments.screenshot({ path: `.blog-local/waline-trial-20261015/waline-${theme}.png` });
		const accessibility = await new AxeBuilder({ page })
			.include(".shirone-waline")
			.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
			.disableRules(["page-has-heading-one"])
			.analyze();
		expect(accessibility.violations).toEqual([]);
	});
}

test("Waline: narrow layout, avatar failure fallback and required nickname and optional contact fields", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await ready(page, "light", true, true);
  const comments = page.locator(".shirone-waline");
  const avatar = comments.locator(".wl-user-avatar");
  await expect(avatar).toHaveAttribute("src", /^data:image\/svg\+xml,/);
  await expect.poll(() => avatar.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  expect(await comments.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  let submitted: Record<string, unknown> | undefined;
  await page.route(/\/api\/comment(?:\?|$)/, route => {
    if (route.request().method() !== "POST") return route.fallback();
    submitted = route.request().postDataJSON();
    return route.fulfill({ json: { errno: 0, errmsg: "", data: {
      objectId: 902, nick: "匿名", comment: "<p>anonymous fixture</p>", like: 0, children: [],
      time: 1792108800000, status: "approved",
    } } });
  });
  for (const field of ["nick", "mail", "link"]) await comments.locator(`input[name="${field}"]`).fill("");
  await comments.locator(`input[name="nick"]`).fill("访客");
  await comments.locator(".wl-editor").fill("anonymous fixture");
  await comments.getByRole("button", { name: "提交", exact: true }).click();
  await expect.poll(() => Boolean(submitted)).toBe(true);
  expect(submitted?.mail ?? "").toBe("");
  expect(submitted?.link ?? "").toBe("");
  expect(submitted?.comment).toBe("anonymous fixture");
});

test("Waline: Swup navigation recreates one editor and leaves article comments disabled", async ({ page }) => {
	await ready(page, "light");
	await page.waitForFunction(() => Boolean(window.swup));
	await page.evaluate(() => {
		(window as unknown as { walineDocumentSentinel: object }).walineDocumentSentinel = {};
	});
	for (let visit = 0; visit < 2; visit++) {
		await page.evaluate(() => window.swup.navigate("/posts/my-first-test/my-first-test/"));
		await expect(page).toHaveURL(/\/posts\/my-first-test\/my-first-test\/$/);
		await expect(page.locator(".shirone-waline")).toHaveCount(0);
		await page.evaluate(() => window.swup.navigate("/guestbook/"));
		await expect(page).toHaveURL(/\/guestbook\/$/);
		await page.locator(".shirone-waline").scrollIntoViewIfNeeded();
		await expect(page.locator(".shirone-waline .wl-editor")).toHaveCount(1);
		await expect(page.locator(".shirone-waline .wl-editor")).toBeVisible();
	}
	expect(await page.evaluate(() => Boolean((window as unknown as { walineDocumentSentinel?: object }).walineDocumentSentinel))).toBe(true);
});

test("Waline: uploaded photo is resized and compressed before insertion", async ({ page }) => {
  await ready(page, "light");
  const source = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2200;
    canvas.height = 1400;
    const context = canvas.getContext("2d")!;
    const pixels = context.createImageData(canvas.width, canvas.height);
    let seed = 42;
    for (let i = 0; i < pixels.data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        pixels.data[i + c] = seed >>> 24;
      }
      pixels.data[i + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.94).split(",")[1];
  });
  const original = Buffer.from(source, "base64");
  expect(original.length).toBeGreaterThan(300 * 1024);
  expect(original.length).toBeLessThan(5 * 1024 * 1024);
  const comments = page.locator(".shirone-waline");
  await comments.locator(".wl-editor").fill("");
  await comments.locator('input[type="file"]').setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: original });
  const editor = comments.locator(".wl-editor");
  await expect(editor).toHaveValue(/data:image\/webp;base64,/, { timeout: 15000 });
  const value = await editor.inputValue();
  const dataURL = value.match(/data:image\/webp;base64,[A-Za-z0-9+/=]+/)![0];
  const size = Buffer.from(dataURL.split(",")[1], "base64").length;
  expect(size).toBeLessThanOrEqual(300 * 1024);
  const dimensions = await page.evaluate(async url => {
    const bitmap = await createImageBitmap(await (await fetch(url)).blob());
    const result = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return result;
  }, dataURL);
  expect(Math.max(dimensions.width, dimensions.height)).toBeLessThanOrEqual(1600);
  expect(dimensions.width / dimensions.height).toBeCloseTo(2200 / 1400, 2);
  console.log(JSON.stringify({ originalBytes: original.length, compressedBytes: size, ...dimensions }));
});

test("Waline: small image is preserved; oversized and invalid images are rejected", async ({ page }) => {
  await ready(page, "light");
  const comments = page.locator(".shirone-waline");
  const input = comments.locator('input[type="file"]');
  const editor = comments.locator(".wl-editor");
  await editor.fill("");
  const tiny = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2;
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await input.setInputFiles({ name: "tiny.png", mimeType: "image/png", buffer: Buffer.from(tiny, "base64") });
  await expect(editor).toHaveValue(new RegExp(tiny.replace(/[+]/g, "\\+")));
  for (const file of [
    { name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1), error: /5 MB/ },
    { name: "vector.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), error: /暂不支持 SVG/ },
    { name: "broken.png", mimeType: "image/png", buffer: Buffer.from("not an image"), error: /有效的图片/ },
    { name: "large.gif", mimeType: "image/gif", buffer: Buffer.concat([Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"), Buffer.alloc(301 * 1024)]), error: /动图/ },
  ]) {
    await editor.fill("");
    const message = page.waitForEvent("dialog").then(async dialog => {
      const text = dialog.message();
      await dialog.dismiss();
      return text;
    });
    await input.setInputFiles(file);
    expect(await message).toMatch(file.error);
    await expect(editor).toHaveValue("");
  }
});

test("Waline Blob: upload uses binary body and inserts only the returned public URL", async ({ page }) => {
  const url = "https://example.public.blob.vercel-storage.com/comment-images/owned-fixture.png";
  let uploaded: { bytes: number; type: string; authorization?: string } | undefined;
  await page.route("**/api/image-upload", route => {
    const request = route.request();
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    uploaded = { bytes: request.postDataBuffer()?.length ?? 0, type: request.headers()["content-type"], authorization: request.headers().authorization };
    return route.fulfill({ headers, json: { url } });
  });
  await ready(page, "light", true, false, "blob");
  const comments = page.locator(".shirone-waline");
  await expect(comments).toHaveAttribute("data-image-storage", "blob");
  await comments.locator(".wl-editor").fill("");
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 2;
    return canvas.toDataURL().split(",")[1];
  });
  const file = Buffer.from(png, "base64");
  await comments.locator('input[type="file"]').setInputFiles({ name: "tiny.png", mimeType: "image/png", buffer: file });
  await expect(comments.locator(".wl-editor")).toHaveValue(new RegExp(url.replaceAll(".", "\\.")));
  expect(await comments.locator(".wl-editor").inputValue()).not.toContain("data:image");
  expect(uploaded).toEqual({ bytes: file.length, type: "image/png", authorization: undefined });
});

test("Waline Blob: rejected uploads preserve text and do not fall back to inline data", async ({ page }) => {
  let status = 429;
  let payload: object = { error: "上传过于频繁，请稍后重试。" };
  await page.route("**/api/image-upload", route => {
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    return route.fulfill({ status, headers, json: payload });
  });
  await ready(page, "light", true, false, "blob");
  const comments = page.locator(".shirone-waline");
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 2;
    return canvas.toDataURL().split(",")[1];
  });
  for (const failure of ["rate", "invalid URL"]) {
    if (failure === "invalid URL") { status = 200; payload = { url: "javascript:alert(1)" }; }
    await comments.locator(".wl-editor").fill("保留已写正文");
    const message = page.waitForEvent("dialog").then(async dialog => {
      const text = dialog.message(); await dialog.dismiss(); return text;
    });
    await comments.locator('input[type="file"]').setInputFiles({ name: "tiny.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
    expect(await message).toMatch(failure === "rate" ? /频繁/ : /无效的图片地址/);
    await expect(comments.locator(".wl-editor")).toHaveValue("保留已写正文");
  }
});

test("Waline: anonymous local submission survives reload", async ({ page }) => {
	// Explicit opt-in: the trial-only script deletes an exact ID/content pair,
	// refuses non-test comments, and never needs an administrator account.
	const cleanup = process.env.WALINE_LOCAL_CLEANUP;
	test.skip(!cleanup, "Set WALINE_LOCAL_CLEANUP to the owned loopback-trial cleanup script");
	const message = `WALINE-LOCAL-CHECK-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	let objectId: string | number | undefined;
	await ready(page, "light", false);
	const serverURL = await page.locator(".shirone-waline").getAttribute("data-server-url");
	expect(serverURL).toBe("http://127.0.0.1:8360");
	try {
		await page.locator('.shirone-waline input[name="nick"]').fill("");
		await page.locator(".shirone-waline .wl-editor").fill(message);
		const submitted = page.waitForResponse((response) =>
			response.url().startsWith("http://127.0.0.1:8360/api/comment") && response.request().method() === "POST",
		);
		await page.locator(".shirone-waline").getByRole("button", { name: "提交", exact: true }).click();
		const response = await submitted;
		expect(response.ok()).toBe(true);
		const payload = await response.json();
		objectId = payload.data?.objectId;
		expect(payload.errno).toBe(0);
		expect(objectId).toBeTruthy();
		await expect(page.locator(".shirone-waline .wl-content").filter({ hasText: message })).toHaveCount(1);
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.locator(".shirone-waline").scrollIntoViewIfNeeded();
		await expect(page.locator(".shirone-waline .wl-content").filter({ hasText: message })).toHaveCount(1);
	} finally {
		if (objectId) {
			const result = execFileSync(process.execPath, [path.resolve(cleanup!), String(objectId), message], { encoding: "utf8" });
			expect(JSON.parse(result).deleted).toBe(1);
		}
	}
});
