<script lang="ts">
import imageUrl from "@/assets/images/effects/reference-sakura.png?url";
import { createParticles, drawParticles, type SakuraParticle } from "@utils/reference-sakura";
import { onMount } from "svelte";

let { enabled, reduced = false }: { enabled: boolean; reduced?: boolean } = $props();
let mounted = $state(false);
let systemReduced = $state(false);
let classReduced = $state(false);

onMount(() => {
	const media = window.matchMedia("(prefers-reduced-motion: reduce)");
	const update = () => {
		systemReduced = media.matches;
		classReduced = document.documentElement.classList.contains("motion-reduced");
	};
	update();
	mounted = true;
	media.addEventListener("change", update);
	const observer = new MutationObserver(update);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
	return () => {
		media.removeEventListener("change", update);
		observer.disconnect();
	};
});

$effect(() => {
	if (!mounted || !enabled || reduced || systemReduced || classReduced) return;
	let cancelled = false;
	let canvas: HTMLCanvasElement | null = null;
	let worker: Worker | null = null;
	let frame = 0;
	let resizeFrame = 0;
	let image: HTMLImageElement | null = null;
	let context: CanvasRenderingContext2D | null = null;
	let particles: SakuraParticle[] = [];
	let fallbackStarted = false;

	function createCanvas() {
		const result = document.createElement("canvas");
		result.id = "canvas_sakura";
		result.setAttribute("aria-hidden", "true");
		result.style.cssText = "position:fixed;left:0;top:0;pointer-events:none;z-index:100;transform:translateZ(0)";
		document.body.appendChild(result);
		return result;
	}

	function animate() {
		if (cancelled || document.hidden || !canvas || !context || !image) return;
		drawParticles(context, image, particles, canvas.width, canvas.height);
		frame = requestAnimationFrame(animate);
	}

	async function mainThread() {
		if (cancelled || fallbackStarted) return;
		fallbackStarted = true;
		worker?.terminate();
		worker = null;
		canvas?.remove();
		canvas = createCanvas();
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		context = canvas.getContext("2d");
		if (!context) { canvas.remove(); canvas = null; return; }
		image = new Image();
		image.src = imageUrl;
		try {
			await image.decode();
			if (cancelled || !canvas || !context || !image) return;
			particles = createParticles(canvas.width, canvas.height);
			drawParticles(context, image, particles, canvas.width, canvas.height, false);
			animate();
		} catch (error) {
			if (!cancelled) {
				canvas?.remove();
				canvas = null;
				console.warn("[Sakura] Image unavailable", error);
			}
		}
	}

	if (typeof OffscreenCanvas !== "undefined" && typeof Worker !== "undefined" &&
		"transferControlToOffscreen" in HTMLCanvasElement.prototype) {
		try {
			canvas = createCanvas();
			worker = new Worker(new URL("../../utils/reference-sakura.worker.ts", import.meta.url), { type: "module" });
			worker.onerror = () => { void mainThread(); };
			worker.onmessage = (event: MessageEvent<{ type: string }>) => {
				if (event.data.type === "error") void mainThread();
			};
			const offscreen = canvas.transferControlToOffscreen();
			worker.postMessage({ type: "init", canvas: offscreen, imageUrl, width: window.innerWidth,
				height: window.innerHeight, hidden: document.hidden }, [offscreen]);
		} catch { void mainThread(); }
	} else void mainThread();

	function resize() {
		if (resizeFrame) return;
		resizeFrame = requestAnimationFrame(() => {
			resizeFrame = 0;
			if (worker) worker.postMessage({ type: "resize", width: window.innerWidth, height: window.innerHeight });
			else if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
		});
	}
	function visibility() {
		if (worker) worker.postMessage({ type: "visibility", hidden: document.hidden });
		else {
			if (frame) cancelAnimationFrame(frame);
			frame = 0;
			if (!document.hidden) animate();
		}
	}
	window.addEventListener("resize", resize);
	document.addEventListener("visibilitychange", visibility);
	return () => {
		cancelled = true;
		if (frame) cancelAnimationFrame(frame);
		if (resizeFrame) cancelAnimationFrame(resizeFrame);
		worker?.terminate();
		canvas?.remove();
		if (image) { image.removeAttribute("src"); image = null; }
		window.removeEventListener("resize", resize);
		document.removeEventListener("visibilitychange", visibility);
	};
});
</script>
