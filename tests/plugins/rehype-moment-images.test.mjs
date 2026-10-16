import assert from "node:assert/strict";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { unified } from "@astrojs/markdown-remark";
import { rehypeMomentImages } from "../../src/plugins/rehype-moment-images.mjs";
import { siteMarkdownProcessor } from "../../src/utils/markdown-processor.mjs";

test("standalone moment rendering emits real image URLs and preserves captions and width", async () => {
	const filePath = path.resolve("src/content/moments/example/note.md");
	const calls = [];
	const renderer = await unified({
		...siteMarkdownProcessor.options,
		rehypePlugins: [...siteMarkdownProcessor.options.rehypePlugins, [rehypeMomentImages, {
			resolve: async (src, source) => {
				calls.push({ src: decodeURI(src), source });
				return src.startsWith(".") ? "/personal_site/_astro/photo.hash.png" : src;
			},
		}]],
	}).createRenderer({});
	const { code } = await renderer.render('![reply w-50%](./图1.png "caption")\n\n![remote](https://example.com/photo.png)', {
		fileURL: pathToFileURL(filePath),
	});
	assert.match(code, /src="\/personal_site\/_astro\/photo.hash.png"/);
	assert.match(code, /width: 50%/);
	assert.match(code, /<figcaption[^>]*>caption<\/figcaption>/);
	assert.match(code, /src="https:\/\/example.com\/photo.png"/);
	assert.doesNotMatch(code, /__ASTRO_IMAGE_/);
	assert.ok(calls.some(({ src, source }) => src === "./图1.png" && source === filePath));
});
