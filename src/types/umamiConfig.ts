/**
 * Umami 统计配置类型（由 oddmisc 提供）。
 */
export type UmamiConfig = {
	/** 全局 Umami 统计总开关：false 时完全不加载 oddmisc 运行时脚本与 DOM */
	enable: boolean;
	/** 公开读取统计的分享链接；空字符串关闭展示，不影响已配置的采集。 */
	shareUrl: string;
	/** Umami Website ID；与 scriptUrl 同时配置时启用访问采集。 */
	websiteId?: string;
	/** Umami 采集脚本 URL；与 websiteId 同时配置时启用访问采集。 */
	scriptUrl?: string;
};

/**
 * 解析后的 Umami 配置选项。
 */
export type ResolvedUmamiOptions = {
	shareUrl: string;
	websiteId?: string;
	scriptUrl?: string;
} | null;
