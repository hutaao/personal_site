import getReadingTime from "reading-time";

/** Count visible prose, including captions, without markup, image URLs or code blocks. */
export function countContentWords(tree) {
	function text(node) {
		if (node.type === "text") return node.value;
		if (["pre", "script", "style", "template", "img", "svg"].includes(node.tagName)) return "";
		const properties = node.properties ?? {};
		if (properties.hidden || properties.ariaHidden === true || properties.ariaHidden === "true") return "";
		if ((properties.className ?? []).includes("anchor")) return "";
		const value = (node.children ?? []).map(text).join("");
		return ["p", "div", "section", "li", "figcaption", "h1", "h2", "h3", "h4", "h5", "h6", "br"].includes(node.tagName) ? ` ${value} ` : value;
	}
	return getReadingTime(text(tree)).words;
}

export function rehypeContentWords() {
	return (tree, file) => {
		file.data.astro ??= {};
		file.data.astro.frontmatter ??= {};
		file.data.astro.frontmatter.contentWords = countContentWords(tree);
	};
}
