import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import { compressAlbums } from "../scripts/images/compress-albums.mjs";

const digest = (value) => createHash("sha256").update(value).digest("hex");
async function fixture(t) {
	const root = mkdtempSync(join(tmpdir(), "album-compression-"));
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const directory = join(root, "public/images/albums/private");
	mkdirSync(directory, { recursive: true });
	const input = await sharp({ create: { width: 3000, height: 1700, channels: 3, background: "#426e7a" } })
		.jpeg().withMetadata({ orientation: 6 }).toBuffer();
	writeFileSync(join(directory, "01.jpg"), input);
	writeFileSync(join(directory, "info.json"), '{"password":"fixture-only","layout":"masonry"}');
	return { root, directory, input, backupRoot: join(root, "backup") };
}

test("original is backed up exactly; orientation corrected, EXIF removed and repeated runs are byte-identical", async (t) => {
	const f = await fixture(t);
	assert.equal((await compressAlbums({ ...f, ci: false })).compressed, 1);
	const file = join(f.directory, "01.jpg"), output = readFileSync(file);
	const meta = await sharp(output).metadata();
	assert.equal(meta.height, 2560);
	assert.ok(meta.width < meta.height);
	assert.equal(meta.exif, undefined);
	assert.equal(meta.orientation, undefined);
	assert.deepEqual(readFileSync(join(f.backupRoot, `${digest(f.input)}.jpg`)), f.input);
	assert.equal((await compressAlbums({ ...f, ci: false })).compressed, 0);
	assert.deepEqual(readFileSync(file), output);
	assert.equal(readdirSync(f.backupRoot).length, 1);
	assert.equal(readFileSync(join(f.directory, "info.json"), "utf8"), '{"password":"fixture-only","layout":"masonry"}');
});

test("replacing a reused filename retains both originals; backup corruption fails before overwrite", async (t) => {
	const f = await fixture(t);
	await compressAlbums({ ...f, ci: false });
	const next = await sharp(f.input).withMetadata({ orientation: 3 }).jpeg({ quality: 70 }).toBuffer();
	writeFileSync(join(f.directory, "01.jpg"), next);
	await compressAlbums({ ...f, ci: false });
	assert.equal(readdirSync(f.backupRoot).length, 2);
	writeFileSync(join(f.directory, "01.jpg"), next);
	writeFileSync(join(f.backupRoot, `${digest(next)}.jpg`), "damaged");
	await assert.rejects(compressAlbums({ ...f, ci: false }), /backup verification/);
	assert.deepEqual(readFileSync(join(f.directory, "01.jpg")), next);
});

test("GIF and animated WebP stay unchanged; CI creates no external backup", async (t) => {
	const f = await fixture(t);
	const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAIBRAA7", "base64");
	writeFileSync(join(f.directory, "animation.gif"), gif);
	const secondFrame = Buffer.from(gif.subarray(19, -1));
	secondFrame[secondFrame.length - 2] = 0x4c;
	const twoFrames = Buffer.concat([gif.subarray(0, -1), secondFrame, Buffer.from([0x3b])]);
	const animated = await sharp(twoFrames, { animated: true }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
	assert.equal((await sharp(animated, { animated: true }).metadata()).pages, 2);
	writeFileSync(join(f.directory, "animation.webp"), animated);
	await compressAlbums({ ...f, ci: true });
	assert.equal(existsSync(f.backupRoot), false);
	assert.deepEqual(readFileSync(join(f.directory, "animation.gif")), gif);
	assert.deepEqual(readFileSync(join(f.directory, "animation.webp")), animated);
});

test("static PNG preserves transparency and WebP keeps its format and names", async (t) => {
	const f = await fixture(t);
	for (const format of ["png", "webp"]) {
		const input = await sharp({ create: { width: 2800, height: 1400, channels: 4, background: "#12345688" } })
			.toFormat(format).toBuffer();
		writeFileSync(join(f.directory, `透明.${format}`), input);
	}
	await compressAlbums({ ...f, ci: true });
	for (const format of ["png", "webp"]) {
		const meta = await sharp(readFileSync(join(f.directory, `透明.${format}`))).metadata();
		assert.equal(meta.format, format);
		assert.equal(meta.width, 2560);
		assert.equal(meta.height, 1280);
		assert.equal(meta.hasAlpha, true);
	}
});

test("existing content sync optimizes writing source and target together, and dry run changes nothing", async (t) => {
	const f = await fixture(t);
	const project = join(f.root, "project");
	mkdirSync(project);
	const source = f.root;
	const script = resolve("scripts/content/sync.mjs");
	const env = { ...process.env, CI: "false", CONTENT_DIR: source, ALBUM_BACKUP_ROOT: f.backupRoot };
	// Source cannot contain its destination; use a separate sibling temporary project.
	const destination = mkdtempSync(join(tmpdir(), "album-project-"));
	t.after(() => rmSync(destination, { recursive: true, force: true }));
	rmSync(project, { recursive: true });
	execFileSync(process.execPath, [script, "--dry-run", "--quiet"], { cwd: destination, env, stdio: "pipe" });
	assert.deepEqual(readFileSync(join(f.directory, "01.jpg")), f.input);
	assert.equal(existsSync(f.backupRoot), false);
	execFileSync(process.execPath, [script, "--quiet"], { cwd: destination, env, stdio: "pipe" });
	const output = readFileSync(join(f.directory, "01.jpg"));
	assert.notDeepEqual(output, f.input);
	assert.deepEqual(readFileSync(join(destination, "public/images/albums/private/01.jpg")), output);
	execFileSync(process.execPath, [script, "--quiet"], { cwd: destination, env, stdio: "pipe" });
	assert.deepEqual(readFileSync(join(destination, "public/images/albums/private/01.jpg")), output);
});

test("CI sync only optimizes the materialized copy, with no backup or source mutation", async (t) => {
	const f = await fixture(t);
	const destination = mkdtempSync(join(tmpdir(), "album-ci-project-"));
	t.after(() => rmSync(destination, { recursive: true, force: true }));
	execFileSync(process.execPath, [resolve("scripts/content/sync.mjs"), "--quiet"], {
		cwd: destination,
		env: { ...process.env, CI: "true", CONTENT_DIR: f.root, ALBUM_BACKUP_ROOT: f.backupRoot },
		stdio: "pipe",
	});
	assert.deepEqual(readFileSync(join(f.directory, "01.jpg")), f.input);
	assert.equal(existsSync(f.backupRoot), false);
	const meta = await sharp(readFileSync(join(destination, "public/images/albums/private/01.jpg"))).metadata();
	assert.equal(meta.height, 2560);
	assert.equal(meta.exif, undefined);
});
