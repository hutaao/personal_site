export type CommentProvider = "none" | "twikoo" | "giscus" | "waline";

export interface WalineConfig {
	serverURL: string;
	lang: string;
	placeholder?: string;
	/** true 使用默认表情包，或填写表情包地址数组。 */
	emoji?: boolean | string[];
	/** 开启受大小限制和压缩处理的图片插入；暂以 Base64 随评论存储。 */
	imageUploader?: boolean;
	/** inline 保留原有小图插入；blob 使用评论后端上传到 Vercel Blob。 */
	imageStorage?: "inline" | "blob";
	/** 仅由本机调试服务读取，不是云端配置。 */
	localServer?: { commentInterval?: number; showBrowser?: boolean; showRegion?: boolean };
}

export interface TwikooConfig {
	/** Twikoo 环境 ID 或后端服务地址 URL */
	envId: string;
	/** Twikoo 客户端 JS 脚本 CDN 地址 */
	scriptUrl: string;
	/** 评论语言，"auto" 自动跟随站点语言，也可指定如 "zh-CN", "en" 等 */
	lang: "auto" | string;
	/** 评论输入框的灰色说明文字；留空时不显示 */
	placeholder?: string;
}

export interface CommentConfig {
	/** 是否全局启用评论功能 */
	enable: boolean;
	/** 选用的评论提供商 */
	provider: CommentProvider;
	/** 是否开启视口懒加载（进入视口前不加载外部脚本） */
	lazy: boolean;
	/** 只在留言页启用，文章不受影响。默认 false 兼容原设置。 */
	guestbookOnly?: boolean;
	/** 本地试用时设为 true，生产构建不加载评论。 */
	localOnly?: boolean;
	waline?: WalineConfig;
	/** Twikoo 专属配置 */
	twikoo: TwikooConfig;
	/** Giscus 专属配置 */
	giscus: GiscusConfig;
}

export interface GiscusConfig {
	/** 公开 GitHub 仓库，格式 "owner/repo"（必填，giscus 会在该仓库的 Discussions 中存储评论） */
	repo: string;
	/** 仓库 ID，从 giscus.app 配置生成器获取（必填） */
	repoId: string;
	/** Discussion 分类名，如 "Announcements"（推荐使用 Announcements 类，仅维护者可开新讨论）；留空表示不限制分类 */
	category: string;
	/** Discussion 分类 ID，从 giscus.app 配置生成器获取（必填） */
	categoryId: string;
	/** 页面 ↔ Discussion 映射方式，默认 "pathname" */
	mapping: "pathname" | "url" | "title" | "og:title" | "specific" | "number";
	/** 是否开启严格标题匹配（SHA-1 哈希校验，避免模糊搜索误配），默认 false */
	strict: boolean;
	/** 是否显示主贴表情反应，默认 true */
	reactionsEnabled: boolean;
	/** 是否向父页面周期性发送 Discussion 元数据，默认 false */
	emitMetadata: boolean;
	/** 评论输入框位置，默认 "bottom" */
	inputPosition: "top" | "bottom";
	/** 明暗两套 giscus 主题（giscus 主题键如 "light"/"dark"，或自定义主题 CSS 的 URL） */
	theme: { light: string; dark: string };
	/** 评论语言："auto"（跟随站点语言）或 giscus 语言码（如 "zh-CN"、"en"），默认 "auto" */
	lang: "auto" | string;
	/** giscus client.js 地址；使用自托管 giscus 时替换为自有地址 */
	scriptUrl: string;
}

/** 传递给具体 Provider 组件的归一化上下文 */
export interface CommentContext {
	/** 页面唯一稳定标识（如 post:my-first-post） */
	key: string;
	/** 评论挂钩的 canonical 路径（如 /posts/my-first-post/） */
	path: string;
	/** 文章标题 */
	title: string;
	/** 当前页面语言代码 */
	language: string;
}
