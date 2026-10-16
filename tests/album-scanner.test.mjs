import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { scanAllAlbums, toAlbumIndexItem } from "../src/utils/album-scanner.ts";

const root = mkdtempSync(path.join(os.tmpdir(), "hutaao-album-scanner-"));
after(() => rmSync(root, { recursive: true, force: true }));

function album(id, metadata = {}, files = ["01.jpg"]) {
	const dir = path.join(root, id);
	mkdirSync(dir);
	writeFileSync(path.join(dir, "info.json"), JSON.stringify({ title: id, date: "2026-10-15", ...metadata }));
	for (const file of files) writeFileSync(path.join(dir, file), "owned test image fixture");
	return dir;
}

test("an ordinary local photo can be both the cover and gallery image, with protected layout unchanged", () => {
	album("shared", { cover: "01.jpg", password: "fixture-password", layout: "masonry", columns: 4 }, ["02.jpg", "01.jpg"]);
	const item = scanAllAlbums(root).find(a => a.id === "shared");
	assert.equal(item.cover, "/images/albums/shared/01.jpg");
	assert.deepEqual(item.photos.map(p => p.src), ["/images/albums/shared/01.jpg", "/images/albums/shared/02.jpg"]);
	assert.equal(item.layout, "masonry");
	assert.equal(item.columns, 4);
	const index = toAlbumIndexItem(item);
	assert.equal(index.protected, true);
	assert.equal(index.photoCount, 2);
	assert.equal("password" in index, false);
});

test("legacy covers remain hidden and WebP precedence remains unchanged", () => {
	album("legacy", {}, ["cover.jpg", "cover.webp", "01.jpg", "01.webp", "02.jpg"]);
	album("legacy-explicit", { cover: "cover.jpg" }, ["cover.jpg", "01.jpg"]);
	const all = scanAllAlbums(root);
	const item = all.find(a => a.id === "legacy");
	assert.equal(item.cover, "/images/albums/legacy/cover.webp");
	assert.deepEqual(item.photos.map(p => p.src), ["/images/albums/legacy/01.webp", "/images/albums/legacy/02.jpg"]);
	assert.equal(all.find(a => a.id === "legacy-explicit").photos.length, 1);
});

test("explicit cover uses the exact selected filename without changing gallery deduplication", () => {
	album("exact", { cover: "01.jpg" }, ["01.jpg", "01.webp"]);
	const item = scanAllAlbums(root).find(a => a.id === "exact");
	assert.equal(item.cover, "/images/albums/exact/01.jpg");
	assert.deepEqual(item.photos.map(p => p.src), ["/images/albums/exact/01.webp"]);
});

test("local cover rejects missing files, traversal and remote-looking paths rather than falling back", () => {
	const originalWarn = console.warn;
	console.warn = () => {};
	try {
		for (const [index, cover] of ["../01.jpg", "..\\01.jpg", "/01.jpg", "C:\\01.jpg", "https://example.com/01.jpg", "//example.com/01.jpg", "%2e%2e%2f01.jpg", "01.jpg?url=https://example.com", "missing.jpg", "info.json", 1].entries()) {
			const id = `invalid-${index}`;
			album(id, { cover }, ["cover.jpg", "01.jpg"]);
			assert.equal(scanAllAlbums(root).some(a => a.id === id), false, String(cover));
		}
	} finally { console.warn = originalWarn; }
});

test("a symlink cannot select an outside local cover", t => {
	const dir = album("symlink", { cover: "linked.jpg" }, ["01.jpg"]);
	try { symlinkSync(path.join(dir, "01.jpg"), path.join(dir, "linked.jpg")); }
	catch (error) {
		if (error.code === "EPERM" || error.code === "EACCES") { t.skip("Host does not permit creating test symlinks"); return; }
		throw error;
	}
	const originalWarn = console.warn;
	console.warn = () => {};
	try { assert.equal(scanAllAlbums(root).some(a => a.id === "symlink"), false); }
	finally { console.warn = originalWarn; }
});

test("external album URLs and metadata remain unchanged", () => {
	album("external", { mode: "external", cover: "https://example.com/cover.jpg", layout: "grid", columns: 2, photos: [{ src: "https://example.com/01.jpg", width: 600, height: 900 }] }, []);
	const originalWarn = console.warn;
	console.warn = () => {};
	try {
		const item = scanAllAlbums(root).find(a => a.id === "external");
		assert.equal(item.cover, "https://example.com/cover.jpg");
		assert.equal(item.photos[0].src, "https://example.com/01.jpg");
		assert.equal(item.photos[0].height, 900);
		assert.equal(item.layout, "grid");
		assert.equal(item.columns, 2);
	} finally { console.warn = originalWarn; }
});
