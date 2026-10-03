/** Plain-text summaries from the already rendered, trusted Markdown HTML. */
export function momentExcerpt(html: string): string {
	const entities: Record<string, string> = {
		amp: "&",
		lt: "<",
		gt: ">",
		quot: '"',
		apos: "'",
		nbsp: " ",
	};
	return html
		.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
		.replace(/<[^>]+>/g, " ")
		.replace(
			/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
			(match, entity: string) => {
				if (!entity.startsWith("#"))
					return entities[entity.toLowerCase()] ?? match;
				const code =
					entity[1].toLowerCase() === "x"
						? Number.parseInt(entity.slice(2), 16)
						: Number.parseInt(entity.slice(1), 10);
				return code > 0 && code <= 0x10ffff
					? String.fromCodePoint(code)
					: match;
			},
		)
		.replace(/\s+/g, " ")
		.trim();
}
