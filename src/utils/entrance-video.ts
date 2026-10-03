const TOGGLE_EVENT = "banner-video:toggle";
const STATE_EVENT = "banner-video:state-change";

let bound = false;

/** Manual background playback keeps the wallpaper underneath the video. */
export function bindEntranceVideo(): void {
	if (bound) return;
	bound = true;
	let video: HTMLVideoElement | null = null;
	let sources: string[] = [];
	let index = -1;
	let needsNext = false;
	let generation = 0;
	let wantsPlayback = false;
	let pending = false;
	let frame = 0;
	let cleanup: (() => void) | undefined;

	function eligible(): boolean {
		const entrance = video?.closest<HTMLElement>("#firefly-entrance");
		if (!entrance || !entrance.isConnected || entrance.hidden) return false;
		const settings = document.documentElement.dataset;
		if (settings.previewMode === "none" || settings.previewMode === "overlay")
			return false;
		const home = document.body.dataset.currentPage === "home";
		const hero = settings.previewMode === "fullscreen" && settings.previewLayout === "hero";
		if (!home && !hero) return false;
		const style = getComputedStyle(entrance);
		return style.display !== "none" && style.visibility !== "hidden";
	}

	function report(playing: boolean): void {
		for (const button of document.querySelectorAll<HTMLElement>("#banner-video-toggle, #entrance-video-toggle, [data-banner-video-toggle]")) {
			button.setAttribute("data-playing", String(playing));
			button.setAttribute("aria-pressed", String(playing));
			button.setAttribute("aria-label", playing ? "暂停背景视频" : "播放背景视频");
		}
		document.dispatchEvent(new CustomEvent(STATE_EVENT, { bubbles: true, detail: { playing } }));
	}

	function stop(): void {
		generation += 1;
		wantsPlayback = false;
		pending = false;
		video?.pause();
		video?.classList.remove("firefly-entrance__video--active");
		report(false);
	}

	function chooseSource(): void {
		if (!video || !sources.length) return;
		if (sources.length === 1) index = 0;
		else if (video.dataset.videoOrder === "random") {
			const choices = sources.map((_, i) => i).filter((i) => i !== index);
			index = choices[Math.floor(Math.random() * choices.length)];
		} else index = (index + 1) % sources.length;
		video.src = sources[index];
		video.loop = sources.length === 1 && video.dataset.videoEnd === "continue";
	}

	async function play(): Promise<void> {
		if (!video || !sources.length || !eligible()) return;
		const target = video;
		const request = ++generation;
		wantsPlayback = true;
		pending = true;
		if (needsNext || !target.getAttribute("src")) {
			chooseSource();
			needsNext = false;
		}
		const current = () => video === target && request === generation && wantsPlayback && eligible();
		for (const muted of [false, true]) {
			if (!current()) return;
			target.muted = muted;
			try {
				await target.play();
				if (!current()) {
					// A newer play request owns the element; only a cancelled intent stops it.
					if (video !== target || !wantsPlayback || !eligible()) target.pause();
					return;
				}
				pending = false;
				return;
			} catch {
				if (!current()) return;
			}
		}
		if (current()) stop();
	}

	function attach(): void {
		const next = document.querySelector<HTMLVideoElement>("#firefly-entrance [data-banner-video]");
		if (next === video) return;
		stop();
		cleanup?.();
		video = next;
		index = -1;
		needsNext = false;
		sources = [];
		if (!next) return;
		try {
			const parsed: unknown = JSON.parse(next.dataset.videoSources ?? "[]");
			if (Array.isArray(parsed)) sources = parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
		} catch { /* An absent or malformed source list leaves the control harmless. */ }
		const onPlay = () => {
			if (!wantsPlayback || !eligible()) { stop(); return; }
			pending = false;
			next.classList.add("firefly-entrance__video--active");
			report(true);
		};
		const onPause = () => {
			next.classList.remove("firefly-entrance__video--active");
			report(false);
		};
		const onEnded = () => {
			if (!wantsPlayback || !eligible()) return;
			if (next.dataset.videoEnd !== "continue") {
				stop();
				needsNext = true;
				return;
			}
			if (sources.length < 2) return;
			chooseSource();
			void play();
		};
		const onError = () => stop();
		next.addEventListener("play", onPlay);
		next.addEventListener("pause", onPause);
		next.addEventListener("ended", onEnded);
		next.addEventListener("error", onError);
		cleanup = () => {
			next.removeEventListener("play", onPlay);
			next.removeEventListener("pause", onPause);
			next.removeEventListener("ended", onEnded);
			next.removeEventListener("error", onError);
		};
	}

	function sync(): void {
		frame = 0;
		attach();
		if ((wantsPlayback || pending) && !eligible()) stop();
		for (const button of document.querySelectorAll<HTMLElement>("#banner-video-toggle, #entrance-video-toggle, [data-banner-video-toggle]")) {
			button.setAttribute("data-banner-hidden", String(!eligible()));
			button.setAttribute("data-playing", String(!!video && !video.paused && wantsPlayback));
			button.setAttribute("aria-pressed", button.dataset.playing ?? "false");
			button.setAttribute("aria-label", button.dataset.playing === "true" ? "暂停背景视频" : "播放背景视频");
			if (button.dataset.videoBound !== "true") {
				button.dataset.videoBound = "true";
				button.addEventListener("click", () => document.dispatchEvent(new CustomEvent(TOGGLE_EVENT)));
			}
		}
	}
	function schedule(): void {
		if (!frame) frame = requestAnimationFrame(sync);
	}
	document.addEventListener(TOGGLE_EVENT, () => {
		attach();
		if (!sources.length || !eligible()) return;
		if (wantsPlayback || pending || (video && !video.paused)) stop();
		else void play();
	});
	document.addEventListener("swup:page:view", schedule);
	document.addEventListener("swup:content:replace", schedule);
	window.addEventListener("hutaao:display-settings", schedule);
	window.addEventListener("scroll", schedule, { passive: true });
	window.addEventListener("resize", schedule, { passive: true });
	new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ["data-preview-mode", "data-preview-layout"] });
	new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ["data-current-page"] });
	sync();
}
