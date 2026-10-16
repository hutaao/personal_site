import assert from "node:assert/strict";
import { test } from "node:test";
import { ensurePreview, isHealthyPage, probePreview, previewStartArgs } from "../scripts/blog-writing/ensure-preview.mjs";

const good = "<!doctype html><html><body>Blog</body></html>";
test("double-click startup explicitly backgrounds Astro without agent auto-detection", () => {
	assert.ok(previewStartArgs().includes("--background"));
	assert.ok(previewStartArgs().includes("4324"));
});
test("page health rejects connection placeholders and Astro error pages, including HTTP 200 errors", () => {
	assert.ok(isHealthyPage(200, good));
	assert.equal(isHealthyPage(500, good), false);
	assert.equal(isHealthyPage(200, ""), false);
	assert.equal(isHealthyPage(200, '<!doctype html><astro-error-overlay></astro-error-overlay>'), false);
	assert.equal(isHealthyPage(200, '<!doctype html><title>TypeError</title>An error occurred'), false);
});
test("health checks require both homepage and moments to render", async () => {
	const routes = [];
	const result = await probePreview(async address => {
		routes.push(address);
		return { status: address.endsWith("/moments/") ? 500 : 200, text: async () => good };
	});
	assert.equal(result, false);
	assert.equal(routes.length, 2);
});
test("a healthy server is reused; an unhealthy one is restarted and verified", async () => {
	let starts = 0, stops = 0, probes = 0;
	const ops = { start: async () => { starts++; }, stop: async () => { stops++; }, pause: async () => {} };
	assert.equal(await ensurePreview({ ...ops, probe: async () => true }), "reused");
	assert.equal(starts, 0);
	assert.equal(await ensurePreview({ ...ops, probe: async () => ++probes > 2 }), "started");
	assert.equal(starts, 1); assert.equal(stops, 1);
});
test("persistent rendering failures stop with an error instead of claiming success or looping", async () => {
	let starts = 0;
	await assert.rejects(ensurePreview({
		probe: async () => false, start: async () => { starts++; }, stop: async () => {}, pause: async () => {},
	}), /failed its page checks/);
	assert.equal(starts, 2);
});
