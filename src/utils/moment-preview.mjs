import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";

const textOf = node => node.type === "text" ? node.value : (node.children ?? []).map(textOf).join("");
const hasMedia = node => ["img", "video", "iframe", "audio", "table", "pre"].includes(node.tagName) || (node.children ?? []).some(hasMedia);
const imageCount = node => (node.tagName === "img" ? 1 : 0) + (node.children ?? []).reduce((sum, child) => sum + imageCount(child), 0);

function shorten(node, budget) {
	const copy = structuredClone(node);
	function walk(current) {
		if (current.type === "text") {
			current.value = current.value.slice(0, budget.left);
			budget.left -= current.value.length;
		} else if (current.children) {
			current.children = current.children.filter(child => {
				if (budget.left <= 0) return false;
				walk(child);
				return true;
			});
		}
	}
	walk(copy);
	return copy;
}

/** Build a valid HTML excerpt at block boundaries; figures and captions stay whole.
 * A single oversized paragraph may end at a sentence boundary (or at the budget).
 * Returns null for short moments, so they need no disclosure button.
 */
export function createMomentPreview(html, { target = 200, maximum = 300 } = {}) {
	const tree = fromHtml(html, { fragment: true });
	if (textOf(tree).trim().length <= maximum && imageCount(tree) <= 2) return null;
	let used = 0, media = 0, stopped = false;
	function select(children) {
		const selected = [];
		for (const node of children) {
			if (stopped) break;
			if (node.tagName === "section") {
				const nested = select(node.children ?? []);
				if (nested.length) selected.push({ ...node, children: nested });
				continue;
			}
			const text = textOf(node).trim();
			if (!text && !hasMedia(node)) continue; // Don't carry decorative blank lines into the excerpt.
			if (hasMedia(node)) {
				if (used || media) { stopped = true; break; }
				selected.push(node); media++;
				continue;
			}
			if (used >= target || (used && used + text.length > maximum)) { stopped = true; break; }
			if (text.length > maximum && !used) {
				const raw = textOf(node);
				const sentence = [...raw.matchAll(/[。！？.!?](?:[”’"']?)/g)].find(match => match.index + match[0].length >= target);
				const end = sentence && sentence.index + sentence[0].length <= maximum ? sentence.index + sentence[0].length : target;
				selected.push(shorten(node, { left: end })); stopped = true; break;
			}
			selected.push(node); used += text.length;
		}
		return selected;
	}
	const children = select(tree.children);
	return stopped ? toHtml({ type: "root", children }) : null;
}
