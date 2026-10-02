import { setWallpaperMode } from "@utils/setting-utils";
import { prefersReducedMotion } from "@utils/motion";
let switchingTimer: ReturnType<typeof setTimeout> | undefined;
export const HYBRID_DISPLAY_EVENT = "hutaao:display-settings";
export const DISPLAY_KEY = "hutaao-display-preferences";
export type BackgroundMode = "banner" | "fullscreen" | "overlay" | "none";
export interface DisplayPreferences {
	mode: BackgroundMode;
	layout: "classic" | "hero";
	title: boolean;
	waves: boolean;
	gradient: boolean;
	sakura: boolean;
	opacity: number;
	blur: number;
	cardOpacity: number;
}
export const displayDefaults: DisplayPreferences = {
	mode: "fullscreen",
	layout: "classic",
	title: true,
	waves: true,
	gradient: true,
	sakura: false,
	opacity: 80,
	blur: 10,
	cardOpacity: 60,
};
export function getDisplayPreferences(): DisplayPreferences {
	const result = { ...displayDefaults };
	if (typeof document === "undefined") return result;
	const d = document.documentElement.dataset;
	if (["banner", "fullscreen", "overlay", "none"].includes(d.previewMode ?? ""))
		result.mode = d.previewMode as BackgroundMode;
	if (d.previewLayout === "hero") result.layout = "hero";
	for (const key of ["title", "waves", "gradient", "sakura"] as const)
		result[key] =
			d["preview" + key[0].toUpperCase() + key.slice(1)] !== "false";
	result.sakura = d.previewSakura === "true";
	for (const [key, dataKey, min, max] of [
		["opacity", "previewOpacity", 20, 100],
		["blur", "previewBlur", 0, 20],
		["cardOpacity", "previewCardOpacity", 20, 100],
	] as const) {
		const n = Number(d[dataKey]);
		if (Number.isFinite(n)) result[key] = Math.max(min, Math.min(max, n));
	}
	return result;
}
export function applyDisplayPreferences(prefs: DisplayPreferences): void {
	const root = document.documentElement;
	const main = document.getElementById("main-layout");
	const before = main?.getBoundingClientRect().top ?? 0;
	const oldMode = root.dataset.previewMode;
	const oldLayout = root.dataset.previewLayout;
	const backgroundChanged =
		oldMode !== prefs.mode || oldLayout !== prefs.layout;
	if (backgroundChanged) {
		clearTimeout(switchingTimer);
		if (!prefersReducedMotion()) {
			root.dataset.wallpaperSwitching = "true";
			switchingTimer = setTimeout(
				() => delete root.dataset.wallpaperSwitching,
				520,
			);
		} else delete root.dataset.wallpaperSwitching;
	}
	root.classList.add("display-changing");
	main?.getBoundingClientRect();
	try {
		localStorage.setItem(DISPLAY_KEY, JSON.stringify(prefs));
	} catch {}
	for (const [key, value] of Object.entries(prefs))
		root.setAttribute(
			"data-preview-" + key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()),
			String(value),
		);
	root.style.setProperty("--wallpaper-opacity", String(prefs.opacity / 100));
	root.style.setProperty("--wallpaper-blur", prefs.blur + "px");
	root.style.setProperty("--wallpaper-card-opacity", prefs.cardOpacity + "%");
	setWallpaperMode(
		prefs.mode === "none" || prefs.mode === "overlay" ? "none" : "banner",
	);
	// Preserve the reading position when the entrance changes height.
	if (
		(oldMode !== prefs.mode || oldLayout !== prefs.layout) &&
		before <= 140 &&
		main
	) {
		const after = main.getBoundingClientRect().top;
		window.scrollBy({ top: after - before, behavior: "instant" });
	}
	window.dispatchEvent(new CustomEvent(HYBRID_DISPLAY_EVENT));
	requestAnimationFrame(() => root.classList.remove("display-changing"));
}
