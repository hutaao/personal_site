import fs from "node:fs";
import path from "node:path";
import type {
	AlbumGroup,
	AlbumIndexItem,
	AlbumLayout,
	AlbumPhoto,
} from "@/types/album";

const ALBUM_ROOT = path.resolve(process.cwd(), "public/images/albums");
const IMAGE_EXTENSIONS = new Set([
	".jpg",
	".jpeg",
	".png",
	".gif",
	".webp",
	".svg",
	".avif",
	".bmp",
	".tiff",
	".tif",
]);

const DEFAULT_DATE = new Intl.DateTimeFormat("en-CA").format(new Date());

type RawPhoto = Record<string, unknown>;
type RawAlbum = Record<string, unknown>;

function stringValue(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value.trim() : fallback;
}

function stringArray(value: unknown): string[] {
	return Array.isArray(value)
		? value
				.filter((item): item is string => typeof item === "string")
				.map((item) => item.trim())
				.filter(Boolean)
		: [];
}

function numberValue(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value > 0
		? value
		: undefined;
}

function dateValue(value: unknown, fallback = DEFAULT_DATE): string {
	const date = stringValue(value, fallback);
	return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : fallback;
}

function layoutValue(value: unknown): AlbumLayout {
	return value === "grid" ? "grid" : "masonry";
}

function columnsValue(value: unknown): 2 | 3 | 4 {
	const columns = typeof value === "number" ? Math.round(value) : 3;
	return columns <= 2 ? 2 : columns >= 4 ? 4 : 3;
}

function toPublicPath(relativePath: string): string {
	return `/images/albums/${relativePath.replaceAll(path.sep, "/")}`;
}

function parseFileName(fileName: string): { title: string; tags: string[] } {
	const baseName = path.basename(fileName, path.extname(fileName));
	const [title, ...tags] = baseName.split("_");
	return { title: title || baseName, tags: tags.filter(Boolean) };
}

function readJson(filePath: string): RawAlbum | null {
	try {
		const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
		return parsed && typeof parsed === "object" && !Array.isArray(parsed)
			? (parsed as RawAlbum)
			: null;
	} catch (error) {
		console.warn(`[albums] Failed to read ${filePath}`, error);
		return null;
	}
}

function fileDate(filePath: string): string {
	try {
		return dateValue(fs.statSync(filePath).mtime.toISOString().slice(0, 10));
	} catch {
		return DEFAULT_DATE;
	}
}

function resolveLocalPhotoFiles(albumDir: string): string[] {
	const files = fs
		.readdirSync(albumDir, { withFileTypes: true })
		.filter(
			(entry) =>
				entry.isFile() &&
				IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
		)
		.map((entry) => entry.name)
		.filter((name) => !/^cover\.(?:webp|jpg)$/i.test(name));
	const names = new Set(files);
	return files
		.filter((name) => {
			const ext = path.extname(name).toLowerCase();
			if (!names.has(`${path.basename(name, path.extname(name))}.webp`))
				return true;
			return ext === ".webp";
		})
		.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function localPhotos(albumId: string, albumDir: string): AlbumPhoto[] {
	return resolveLocalPhotoFiles(albumDir).map((fileName, index) => {
		const parsed = parseFileName(fileName);
		const relative = `${albumId}/${fileName}`;
		return {
			id: `${albumId}-photo-${index + 1}`,
			src: toPublicPath(relative),
			alt: parsed.title,
			title: parsed.title,
			tags: parsed.tags,
			date: fileDate(path.join(albumDir, fileName)),
		};
	});
}

/** Local metadata selects one regular image in this album, never a URL or another directory. */
function localCover(albumId: string, albumDir: string, rawCover: unknown): string {
	if (rawCover != null && rawCover !== "") {
		const fileName = stringValue(rawCover);
		const safeName = fileName &&
			!/[\\/:?#%\x00-\x1f]/.test(fileName) &&
			!fileName.includes("..") &&
			IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
		if (safeName) {
			try {
				if (fs.lstatSync(path.join(albumDir, fileName)).isFile()) {
					return toPublicPath(`${albumId}/${fileName}`);
				}
			} catch {
				// An explicit selection must exist; do not silently replace it with another cover.
			}
		}
		console.warn(`[albums] ${albumId}: cover must name an existing image file inside this album`);
		return "";
	}
	for (const fileName of ["cover.webp", "cover.jpg"]) {
		try {
			if (fs.lstatSync(path.join(albumDir, fileName)).isFile()) {
				return toPublicPath(`${albumId}/${fileName}`);
			}
		} catch {
			// Try the legacy fallback filename.
		}
	}
	return "";
}

function externalPhotos(albumId: string, rawPhotos: unknown): AlbumPhoto[] {
	if (!Array.isArray(rawPhotos)) return [];
	return rawPhotos.flatMap((value, index) => {
		if (!value || typeof value !== "object") return [];
		const raw = value as RawPhoto;
		const src = stringValue(raw.src);
		if (!src) {
			console.warn(
				`[albums] Skipping ${albumId} photo ${index + 1}: missing src`,
			);
			return [];
		}
		const title = stringValue(raw.title);
		return [
			{
				id: stringValue(raw.id, `${albumId}-external-photo-${index + 1}`),
				src,
				thumbnail: stringValue(raw.thumbnail) || undefined,
				alt: stringValue(raw.alt, title || `Photo ${index + 1}`),
				title: title || undefined,
				description: stringValue(raw.description) || undefined,
				tags: stringArray(raw.tags),
				date: dateValue(raw.date),
				location: stringValue(raw.location) || undefined,
				width: numberValue(raw.width),
				height: numberValue(raw.height),
				camera: stringValue(raw.camera) || undefined,
				lens: stringValue(raw.lens) || undefined,
				settings: stringValue(raw.settings) || undefined,
			},
		];
	});
}

function scanAlbumDirectory(entry: fs.Dirent, albumRoot: string): AlbumGroup | null {
	if (!entry.isDirectory()) return null;
	const id = entry.name;
	const albumDir = path.join(albumRoot, id);
	const raw = readJson(path.join(albumDir, "info.json"));
	if (!raw) {
		console.warn(`[albums] Skipping ${id}: info.json is missing or invalid`);
		return null;
	}
	const external = raw.mode === "external";
	const cover = external
		? stringValue(raw.cover)
		: localCover(id, albumDir, raw.cover);
	if (!cover) {
		console.warn(`[albums] Skipping ${id}: cover is missing`);
		return null;
	}
	const photos = external
		? externalPhotos(id, raw.photos)
		: localPhotos(id, albumDir);
	return {
		id,
		title: stringValue(raw.title, id),
		description: stringValue(raw.description),
		cover,
		date: dateValue(raw.date),
		location: stringValue(raw.location),
		tags: stringArray(raw.tags),
		layout: layoutValue(raw.layout),
		columns: columnsValue(raw.columns),
		hidden: raw.hidden === true,
		password: stringValue(raw.password) || undefined,
		passwordHint: stringValue(raw.passwordHint) || undefined,
		photos,
	};
}

export function scanAllAlbums(albumRoot = ALBUM_ROOT): AlbumGroup[] {
	if (!fs.existsSync(albumRoot)) return [];
	return fs
		.readdirSync(albumRoot, { withFileTypes: true })
		.map((entry) => scanAlbumDirectory(entry, albumRoot))
		.filter((album): album is AlbumGroup => album !== null)
		.sort(
			(a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title),
		);
}

export function scanVisibleAlbums(): AlbumGroup[] {
	return scanAllAlbums().filter((album) => !album.hidden);
}

export function toAlbumIndexItem(album: AlbumGroup): AlbumIndexItem {
	const { photos, password, ...metadata } = album;
	return {
		...metadata,
		photoCount: photos.length,
		protected: Boolean(password),
	};
}

export function findAlbum(id: string): AlbumGroup | undefined {
	return scanAllAlbums().find((album) => album.id === id);
}
