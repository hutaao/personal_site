import assert from "node:assert/strict";
import { test } from "node:test";
import { fromHtml } from "hast-util-from-html";
import { createMomentPreview } from "../src/utils/moment-preview.mjs";

test("short moments remain fully displayed", () => {
	assert.equal(createMomentPreview("<p>A short update.</p>"), null);
});
test("complete paragraphs stop before the next image, retaining it for expansion", () => {
	const intro = `<p>${"甲".repeat(80)}</p><p>${"乙".repeat(90)}</p>`;
	const figure = '<figure><img src="/image.png"><figcaption>Caption</figcaption></figure>';
	assert.equal(createMomentPreview(intro + figure + `<p>${"丙".repeat(300)}</p>`), intro);
});
test("paragraph budget accepts a short final paragraph up to 300 chars", () => {
	const first = `<p>${"甲".repeat(150)}</p>`, second = `<p>${"乙".repeat(100)}</p>`;
	assert.equal(createMomentPreview(first + second + `<p>${"丙".repeat(180)}</p>`), first + second);
});
test("an oversized paragraph stops at a sentence and preserves inline markup", () => {
	const html = `<p><strong>${"甲".repeat(210)}。</strong><a href="/test/">${"乙".repeat(220)}</a></p>`;
	const result = createMomentPreview(html);
	assert.equal(result, `<p><strong>${"甲".repeat(210)}。</strong></p>`);
	assert.equal(fromHtml(result, { fragment: true }).children[0].tagName, "p");
});
test("heading sections remain balanced and leading figures are kept whole", () => {
	const figure = '<figure><img src="/image.png"><figcaption>Full caption</figcaption></figure>';
	const result = createMomentPreview(`<section><h2>Title</h2><p>${"甲".repeat(100)}</p>${figure}<p>${"乙".repeat(400)}</p></section>`);
	assert.equal(result, `<section><h2>Title</h2><p>${"甲".repeat(100)}</p></section>`);
	const leading = createMomentPreview(figure + `<p>${"甲".repeat(150)}</p><p>${"乙".repeat(220)}</p>`);
	assert.ok(leading.startsWith(figure));
	assert.equal((leading.match(/<figure>/g) ?? []).length, (leading.match(/<\/figure>/g) ?? []).length);
});
test("decorative line breaks do not consume preview space; HTML entities remain escaped", () => {
	const result = createMomentPreview(`<p>A &amp; B</p><br><br><figure><img src="/x.png"></figure><p>${"甲".repeat(350)}</p>`);
	assert.equal(result, "<p>A &#x26; B</p>");
});
