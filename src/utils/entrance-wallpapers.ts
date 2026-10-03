/** Fade the incoming photo over an opaque base, so brightness never dips between images. */
export function bindEntranceWallpapers(entrance: HTMLElement) {
	const sources: string[] = JSON.parse(entrance.dataset.wallpapers || "[]");
	const base = entrance.querySelector<HTMLImageElement>(".firefly-entrance__image");
	const overlay = entrance.querySelector<HTMLImageElement>(".firefly-entrance__wallpaper-next");
	if (!base || !overlay || sources.length < 2 || entrance.dataset.rotation !== "true") return;
	const interval = Math.max(6000, Number(entrance.dataset.interval) || 12000);
	const fade = Math.min(interval / 2, Math.max(300, Number(entrance.dataset.fade) || 2000));
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
	let index = 0;
	let timer: ReturnType<typeof setTimeout>;
	const preload = new Image();
	preload.src = sources[1];
	const schedule = (delay = interval) => { timer = setTimeout(() => { void rotate(); }, delay); };
	async function rotate() {
		if (!entrance.isConnected) return;
		const mode = document.documentElement.dataset.previewMode;
		if (document.hidden || reduced.matches || mode === "none" || entrance.querySelector(".firefly-entrance__video--active")) {
			schedule();
			return;
		}
		const nextIndex = (index + 1) % sources.length;
		overlay!.src = sources[nextIndex];
		try { await overlay!.decode(); } catch { schedule(); return; }
		if (!entrance.isConnected) return;
		overlay!.style.transition = `opacity ${fade}ms cubic-bezier(.2, 0, 0, 1)`;
		void overlay!.offsetWidth;
		overlay!.style.opacity = "1";
		await new Promise((resolve) => setTimeout(resolve, fade + 50));
		// Decode the base before removing the overlay, including on slower mobile devices.
		base!.removeAttribute("srcset");
		base!.removeAttribute("sizes");
		base!.src = sources[nextIndex];
		try { await base!.decode(); } catch { schedule(); return; }
		overlay!.style.transition = "none";
		overlay!.style.opacity = "0";
		index = nextIndex;
		preload.src = sources[(index + 1) % sources.length];
		schedule(interval - fade - 50);
	}
	schedule();
	document.addEventListener("swup:willReplaceContent", () => clearTimeout(timer), { once: true });
}
