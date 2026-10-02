/// <reference lib="webworker" />
import {
	createParticles,
	drawParticles,
	type SakuraParticle,
} from "./reference-sakura";

type Message =
	| {
			type: "init";
			canvas: OffscreenCanvas;
			imageUrl: string;
			width: number;
			height: number;
			hidden: boolean;
	  }
	| { type: "resize"; width: number; height: number }
	| { type: "visibility"; hidden: boolean }
	| { type: "stop" };

let canvas: OffscreenCanvas | null = null;
let context: OffscreenCanvasRenderingContext2D | null = null;
let image: ImageBitmap | null = null;
let particles: SakuraParticle[] = [];
let frame = 0;
let hidden = false;

function pause() {
	if (frame) cancelAnimationFrame(frame);
	frame = 0;
}

function animate() {
	if (!canvas || !context || !image || hidden) return;
	drawParticles(context, image, particles, canvas.width, canvas.height);
	frame = requestAnimationFrame(animate);
}

self.onmessage = async (event: MessageEvent<Message>) => {
	const message = event.data;
	try {
		if (message.type === "init") {
			canvas = message.canvas;
			canvas.width = message.width;
			canvas.height = message.height;
			context = canvas.getContext("2d");
			if (!context) throw new Error("Canvas context unavailable");
			hidden = message.hidden;
			const response = await fetch(message.imageUrl);
			if (!response.ok) throw new Error(`Sakura image: ${response.status}`);
			image = await createImageBitmap(await response.blob());
			particles = createParticles(canvas.width, canvas.height);
			drawParticles(
				context,
				image,
				particles,
				canvas.width,
				canvas.height,
				false,
			);
			if (!hidden) animate();
			self.postMessage({ type: "ready" });
		} else if (message.type === "resize" && canvas) {
			canvas.width = message.width;
			canvas.height = message.height;
		} else if (message.type === "visibility") {
			hidden = message.hidden;
			pause();
			if (!hidden) animate();
		} else if (message.type === "stop") {
			pause();
			image?.close();
			image = null;
			particles = [];
			context = null;
			canvas = null;
		}
	} catch (error) {
		pause();
		self.postMessage({ type: "error", message: String(error) });
	}
};
