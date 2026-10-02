/*
 * Particle dynamics adapted from Firefly's SakuraEffect.astro and sakura.worker.ts.
 * MIT License
 * Copyright (c) 2024 saicaca
 * Copyright (c) 2025 CuteLeaf
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

export interface SakuraParticle {
	x: number;
	y: number;
	size: number;
	rotation: number;
	alpha: number;
	xSpeed: number;
	ySpeed: number;
}

export type SakuraContext =
	| CanvasRenderingContext2D
	| OffscreenCanvasRenderingContext2D;
const random = (min: number, max: number) => min + Math.random() * (max - min);

export function createParticles(
	width: number,
	height: number,
): SakuraParticle[] {
	return Array.from({ length: 21 }, () => ({
		x: Math.random() * width,
		y: Math.random() * height,
		size: random(0.5, 1.1),
		rotation: random(0, 6),
		alpha: random(0.3, 0.9),
		xSpeed: random(-1.7, -1.2),
		ySpeed: random(1.5, 2.2),
	}));
}

export function drawParticles(
	context: SakuraContext,
	image: HTMLImageElement | ImageBitmap,
	particles: SakuraParticle[],
	width: number,
	height: number,
	advance = true,
): void {
	context.clearRect(0, 0, width, height);
	for (const petal of particles) {
		if (advance) {
			petal.x += petal.xSpeed;
			petal.y += petal.ySpeed;
			petal.rotation += 0.03;
			petal.alpha -= 0.0003;
			if (
				petal.x < 0 ||
				petal.x > width ||
				petal.y < 0 ||
				petal.y > height ||
				petal.alpha <= 0
			) {
				if (Math.random() > 0.4) {
					petal.x = Math.random() * width;
					petal.y = 0;
				} else {
					petal.x = width;
					petal.y = Math.random() * height;
				}
				petal.size = random(0.5, 1.1);
				petal.rotation = random(0, 6);
				petal.alpha = random(0.3, 0.9);
			}
		}
		context.save();
		context.translate(petal.x, petal.y);
		context.rotate(petal.rotation);
		context.globalAlpha = petal.alpha;
		context.drawImage(image, 0, 0, 40 * petal.size, 40 * petal.size);
		context.restore();
	}
}
