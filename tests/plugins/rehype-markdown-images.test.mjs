import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { after, test } from "node:test";

import {
	matchesNoReferrerDomain,
	parseMarkdownImageAlt,
} from "../../src/plugins/rehype-markdown-images.mjs";
import { siteMarkdownProcessor } from "../../src/utils/markdown-processor.mjs";

// unified() 返回配置型处理器，需经 createRenderer 取得真正的渲染器（与 Astro 构建期同一条插件链）
const renderer = await siteMarkdownProcessor.createRenderer({});
// This test owns its tiny fixture; deleting demo albums must not break it.
const fixtureRoot = await mkdtemp(path.resolve("public/.markdown-image-test-"));
await writeFile(path.join(fixtureRoot, "pixel.png"), Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZQAAAABJRU5ErkJggg==", "base64",
));
after(() => rm(fixtureRoot, { recursive: true, force: true }));

/**
 * 将 Markdown 处理为 HTML 字符串。
 *
 * @param {string} markdown Markdown 源码。
 * @returns {Promise<string>}
 */
async function render(markdown) {
	const { code } = await renderer.render(markdown, {
		fileURL: pathToFileURL(path.join(fixtureRoot, "note.md")),
	});
	return code;
}

const IMAGE = `/${path.basename(fixtureRoot)}/pixel.png`;

test("parses the w-N% width token out of alt text", () => {
	assert.deepEqual(parseMarkdownImageAlt("A demo image w-50%"), {
		alt: "A demo image",
		width: 50,
	});
	assert.deepEqual(parseMarkdownImageAlt("w-100% full width"), {
		alt: "full width",
		width: 100,
	});
	// 越界与非法令牌保留在 alt 中
	assert.deepEqual(parseMarkdownImageAlt("too wide w-150%"), {
		alt: "too wide w-150%",
		width: undefined,
	});
	assert.deepEqual(parseMarkdownImageAlt("not a token w-half%"), {
		alt: "not a token w-half%",
		width: undefined,
	});
	// 仅消费第一个合法令牌
	assert.deepEqual(parseMarkdownImageAlt("w-30% and w-40%"), {
		alt: "and w-40%",
		width: 30,
	});
});

test("wraps a standalone image with width token and title into a centered figure", async () => {
	const html = await render(`![A demo image w-50%](${IMAGE} "Demo caption")`);

	assert.match(html, /<figure class="markdown-image-figure">/);
	assert.match(html, /width: 50%; display: block; margin-inline: auto;/);
	assert.match(html, /alt="A demo image"/);
	assert.match(html, /loading="lazy"/);
	assert.match(html, /decoding="async"/);
	assert.match(html, /width="\d+"/);
	assert.match(html, /height="\d+"/);
	assert.match(
		html,
		/<figcaption class="markdown-image-caption">Demo caption<\/figcaption>/,
	);
	// 宽度令牌不应残留在 alt 中
	assert.doesNotMatch(html, /alt="[^"]*w-50%/);
});

test("title alone produces a caption without inline width", async () => {
	const html = await render(`![Alt text](${IMAGE} "Only caption")`);

	assert.match(html, /<figure class="markdown-image-figure">/);
	assert.match(
		html,
		/<figcaption class="markdown-image-caption">Only caption<\/figcaption>/,
	);
	assert.doesNotMatch(html, /width: \d+%;/);
});

test("width token alone produces a figure without caption", async () => {
	const html = await render(`![Narrow image w-30%](${IMAGE})`);

	assert.match(html, /<figure class="markdown-image-figure">/);
	assert.match(html, /width: 30%;/);
	assert.doesNotMatch(html, /markdown-image-caption/);
});

test("Obsidian pixel suffix works alone and alongside web percentage", async () => {
	assert.deepEqual(parseMarkdownImageAlt("说明 w-50%|400"), {
		alt: "说明", width: 50, pixelWidth: 400,
	});
	const percentage = await render(`![说明 w-50%|400x300](${IMAGE} "图注")`);
	assert.match(percentage, /alt="说明"/);
	assert.match(percentage, /width: 50%;/);
	assert.doesNotMatch(percentage, /400px|300px/);
	assert.match(percentage, /data-image-size="explicit"/);
	const pixels = await render(`![说明|400](${IMAGE})`);
	assert.match(pixels, /width: 400px;/);
	assert.match(pixels, /alt="说明"/);
	const bounds = await render(`![说明|400x300](${IMAGE})`);
	assert.match(bounds, /max-width: min\(100%, 400px\); max-height: 300px;/);
	assert.match(bounds, /height: auto; object-fit: contain;/);
	assert.deepEqual(parseMarkdownImageAlt("说明|0x300"), { alt: "说明|0x300", width: undefined });
});

test("plain standalone images keep their layout and only gain lazy loading", async () => {
	const html = await render(`![Plain image](${IMAGE})`);

	assert.doesNotMatch(html, /markdown-image-figure/);
	assert.match(html, /loading="lazy"/);
	assert.match(html, /decoding="async"/);
});

test("invalid width tokens stay in alt text", async () => {
	const html = await render(`![Too wide w-150%](${IMAGE})`);

	assert.match(html, /alt="Too wide w-150%"/);
	assert.doesNotMatch(html, /markdown-image-figure/);
	assert.doesNotMatch(html, /width: 150%;/);
});

test("images inside :::grid galleries are not double enhanced", async () => {
	const html = await render(
		[":::grid", `![Grid image w-80%](${IMAGE} "Grid caption")`, ":::"].join(
			"\n",
		),
	);

	assert.match(html, /class="image-grid"/);
	assert.doesNotMatch(html, /markdown-image-figure/);
	assert.doesNotMatch(html, /width: 80%;/);
	// 网格内的图注仍由画廊自身的 figcaption 负责
	assert.match(html, /image-grid__caption/);
});

test("images mixed with inline text are never wrapped in figure", async () => {
	const html = await render(`Before ![Inline w-40%](${IMAGE}) after`);

	assert.doesNotMatch(html, /markdown-image-figure/);
	assert.match(html, /width: 40%;/);
});

test("enhances raw HTML images with the shared rules", async () => {
	const html = await render(
		'<img src="https://i0.hdslb.com/demo.webp" alt="Raw image w-60%" title="Raw caption" class="existing-image" data-credit="Author">',
	);

	assert.match(html, /<figure class="markdown-image-figure">/);
	assert.match(html, /class="existing-image"/);
	assert.match(html, /data-credit="Author"/);
	assert.match(html, /alt="Raw image"/);
	assert.match(html, /width: 60%;/);
	assert.match(html, /loading="lazy"/);
	assert.match(html, /decoding="async"/);
	assert.match(html, /referrerpolicy="no-referrer"/);
	assert.match(
		html,
		/<figcaption class="markdown-image-caption">Raw caption<\/figcaption>/,
	);
});

test("raw gallery images keep their structure while receiving transport attributes", async () => {
	const html = await render(
		'<div class="image-grid"><img src="https://i0.hdslb.com/grid.webp" alt="Grid w-50%" title="Owned by gallery"></div>',
	);

	assert.match(html, /class="image-grid"/);
	assert.match(html, /alt="Grid w-50%"/);
	assert.match(html, /loading="lazy"/);
	assert.match(html, /decoding="async"/);
	assert.match(html, /referrerpolicy="no-referrer"/);
	assert.doesNotMatch(html, /markdown-image-figure/);
	assert.doesNotMatch(html, /width: 50%;/);
});

test("matches only configured HTTP image host patterns", () => {
	assert.equal(
		matchesNoReferrerDomain("https://i0.hdslb.com/a.webp", ["*.hdslb.com"]),
		true,
	);
	assert.equal(
		matchesNoReferrerDomain("https://hdslb.com/a.webp", ["*.hdslb.com"]),
		false,
	);
	assert.equal(matchesNoReferrerDomain("/local.webp", ["*"]), false);
	assert.equal(matchesNoReferrerDomain("not a url", ["*"]), false);
});
