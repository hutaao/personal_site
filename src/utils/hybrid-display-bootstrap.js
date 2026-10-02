(() => {
	const root = document.documentElement;
	const defaults = {
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
	let stored = {};
	try {
		stored =
			JSON.parse(localStorage.getItem("hutaao-display-preferences") || "{}") ||
			{};
	} catch {}
	const prefs = { ...defaults };
	for (const key of ["title", "waves", "gradient", "sakura"])
		if (typeof stored[key] === "boolean") prefs[key] = stored[key];
	if (["banner", "fullscreen", "overlay", "none"].includes(stored.mode))
		prefs.mode = stored.mode;
	if (["classic", "hero"].includes(stored.layout)) prefs.layout = stored.layout;
	for (const [key, min, max] of [
		["opacity", 20, 100],
		["blur", 0, 20],
		["cardOpacity", 20, 100],
	])
		if (typeof stored[key] === "number" && Number.isFinite(stored[key]))
			prefs[key] = Math.max(min, Math.min(max, stored[key]));
	for (const [key, value] of Object.entries(prefs))
		root.setAttribute(
			"data-preview-" + key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()),
			String(value),
		);
	root.style.setProperty("--wallpaper-opacity", String(prefs.opacity / 100));
	root.style.setProperty("--wallpaper-blur", prefs.blur + "px");
	root.style.setProperty("--wallpaper-card-opacity", prefs.cardOpacity + "%");
	root.dataset.wallpaperMode = ["none", "overlay"].includes(prefs.mode)
		? "none"
		: "banner";
	try {
		localStorage.setItem("wallpaper-mode", root.dataset.wallpaperMode);
	} catch {}
})();
