/** markdown-processor.mjs 的类型面（实现文件为 .mjs，astro.config 与 content-utils 共用） */
import type { RehypePlugins, RemarkPlugins } from "@astrojs/markdown-remark";

export interface SiteMarkdownRenderResult {
	code: string;
	metadata: Record<string, unknown>;
}

export interface SiteMarkdownRenderer {
	render(
		content: string,
		renderOpts?: {
			fileURL?: URL;
			frontmatter?: Record<string, unknown>;
		},
	): Promise<SiteMarkdownRenderResult>;
}

export declare const siteMarkdownProcessor: {
	name: "unified";
	options: {
		remarkPlugins: RemarkPlugins;
		rehypePlugins: RehypePlugins;
	};
	createRenderer(
		shared?: Record<string, unknown>,
	): Promise<SiteMarkdownRenderer>;
};
