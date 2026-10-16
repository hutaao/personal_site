import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const MAX_EDGE = 2560;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** No symlinks are followed; only album image bytes change, never metadata or permissions. */
function images(directory) {
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const file = join(directory, entry.name);
		if (entry.isDirectory()) return images(file);
		return entry.isFile() && /\.(jpe?g|png|webp)$/i.test(entry.name) ? [file] : [];
	});
}

export async function compressAlbums({
	directory,
	ci = Boolean(process.env.CI && process.env.CI !== "false"),
	backupRoot = process.env.ALBUM_BACKUP_ROOT || join(homedir(), "Documents", "博客备份", "相册原图", "自动备份"),
} = {}) {
	const result = { scanned: 0, compressed: 0, savedBytes: 0 };
	for (const file of images(directory)) {
		result.scanned++;
		const original = readFileSync(file);
		const metadata = await sharp(original, { animated: true }).metadata();
		// APNG and animated WebP, like GIF (excluded above), must keep their animation.
		if ((metadata.pages || 1) > 1) continue;
		// Already published/processed images are not encoded again on subsequent builds.
		if (Math.max(metadata.width, metadata.height) <= MAX_EDGE &&
			!metadata.exif && !metadata.orientation && !metadata.xmp && !metadata.iptc) continue;
		let pipeline = sharp(original).rotate().resize({
			width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true,
		});
		if (metadata.format === "jpeg") pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true });
		else if (metadata.format === "webp") pipeline = pipeline.webp({ quality: 85 });
		else if (metadata.format === "png") pipeline = pipeline.png({ compressionLevel: 9 });
		else continue;
		const output = await pipeline.toBuffer();
		const checked = await sharp(output).metadata();
		await sharp(output).raw().toBuffer();
		if (Math.max(checked.width, checked.height) > MAX_EDGE || checked.exif || checked.orientation) {
			throw new Error(`Album optimization verification failed: ${file}`);
		}
		if (!ci) {
			// Content-addressed names preserve originals even when a photo filename is reused.
			const backup = join(backupRoot, `${hash(original)}${extname(file).toLowerCase()}`);
			mkdirSync(dirname(backup), { recursive: true });
			try { writeFileSync(backup, original, { flag: "wx" }); }
			catch (error) { if (error.code !== "EEXIST") throw error; }
			if (hash(readFileSync(backup)) !== hash(original)) throw new Error(`Album backup verification failed: ${backup}`);
		}
		const temporary = `${file}.album-${process.pid}.tmp`;
		try {
			writeFileSync(temporary, output, { flag: "wx" });
			renameSync(temporary, file);
		} finally { rmSync(temporary, { force: true }); }
		result.compressed++;
		result.savedBytes += original.length - output.length;
	}
	return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	const result = await compressAlbums({ directory: resolve(process.argv[2] || "public/images/albums") });
	if (result.compressed) console.log(`[albums] Optimized ${result.compressed} images (saved ${Math.round(result.savedBytes / 1024)} KiB); names and directories unchanged.`);
}
