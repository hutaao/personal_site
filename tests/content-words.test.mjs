import assert from "node:assert/strict";
import { test } from "node:test";
import { siteMarkdownProcessor } from "../src/utils/markdown-processor.mjs";
const renderer = await siteMarkdownProcessor.createRenderer({});
async function words(body) {
	const { metadata } = await renderer.render(body);
	return metadata.frontmatter.contentWords;
}
test("counts prose and visible captions without image alt text or paths", async () => {
	assert.equal(await words('你好世界\n\n![not visible alt](/images/not-counted.png "这是图注")'), 8);
});
test("code blocks and Markdown markers do not contribute to total prose", async () => {
	assert.equal(await words('## 你好\n\n**世界**\n\n```js\nconst invisible = "lots of code here";\n```'), 4);
});
test("full long content is counted independently of disclosure previews", async () => {
	assert.equal(await words("正文".repeat(200)), 400);
	assert.equal(await words(""), 0);
});
