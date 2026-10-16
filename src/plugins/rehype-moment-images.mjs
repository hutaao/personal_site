/** Resolve co-located images before Astro converts Markdown images to placeholders.
 * Only the standalone moments renderer uses this plugin.
 * @param {{resolve: (src: string, filePath: string) => Promise<string>}} options
 */
export function rehypeMomentImages(options) {
	return async (tree, file) => {
		async function walk(node) {
			if (node.type === "element" && node.tagName === "img") {
				const src = node.properties?.src;
				if (typeof src === "string" && file.path) {
					node.properties.src = await options.resolve(src, file.path);
				}
			}
			await Promise.all((node.children ?? []).map(walk));
		}
		await walk(tree);
	};
}
