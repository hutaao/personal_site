import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const pagesDir = new URL("../src/pages/", import.meta.url);
const footerFile = new URL(
	"../src/components/organisms/Footer.astro",
	import.meta.url,
);

test("Astro routes do not include public agent instruction files", async () => {
	const files = await readdir(pagesDir, { recursive: true });
	assert.deepEqual(files.filter((file) => /(?:^|[/\\])AGENTS\.md$/i.test(file)), []);
});

test("personal-site footer credits its themes and gates package branding", async () => {
	const footer = await readFile(footerFile, "utf8");
	assert.match(footer, /packageMetadata\.name === "shirones"/);
	assert.match(footer, /\.\.\.\(isShironesPackage\s*\?\s*\[[\s\S]*?https:\/\/github\.com\/yCENzh\/shirones[\s\S]*?\]\s*:\s*\[\]/);
	assert.match(footer, /https:\/\/github\.com\/LyraVoid\/Shirone/);
	assert.match(footer, /https:\/\/github\.com\/CuteLeaf\/Firefly/);
});
