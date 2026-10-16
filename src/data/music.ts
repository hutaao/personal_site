import type { TrackDescriptor } from "@/types/musicConfig";

/**
 * 侧栏音乐本地曲目数据源。
 * 遵循「零额外负担」原则：配置与数据解耦，此处专用于管理本地曲目列表。
 *
 * 添加曲目：在 musicTracks 中追加一项即可：
 * - id: 唯一标识
 * - title: 曲目标题
 * - artist: 艺术家（可选）
 * - cover: 封面图地址（可选；推荐相对 /src，亦支持 /public 或绝对 URL）
 * - source: 音频文件地址（相对 /public 或绝对 URL）
 * - duration: 曲目时长（秒，可选）
 */
export const musicTracks: readonly TrackDescriptor[] = [
	{
		id: "xiachong",
		title: "夏虫",
		artist: "洛天依",
		cover: "https://img1.kuwo.cn/star/albumcover/300/75/27/3202470885.jpg",
		lyrics: "/music/xiachong.lrc",
		source: "/music/夏虫.mp3",
	},
	{
		id: "shijie-chenshui-tonghua",
		title: "世界沉睡童话",
		artist: "洛天依",
		source: "/music/世界沉睡童话.mp3",
		lyrics: "/music/shijie-chenshui-tonghua.lrc",
		cover: "https://p1.music.126.net/fPPLz_0Ilx3SV3r4yxlQlA==/18338754439883750.jpg?param=300x300",
	},
	{
		id: "guang-yu-ying",
		title: "光与影的对白",
		artist: "洛天依",
		source: "/music/光与影的对白.mp3",
		lyrics: "/music/guang-yu-ying.lrc",
		cover: "https://p2.music.126.net/BgJWQTjYHjNkznwAw6VWjg==/109951167656373279.jpg?param=300x300",
	},
	{
		id: "yehangxing",
		cover: "https://img1.kuwo.cn/star/albumcover/300/s4s38/87/3395133891.jpg",
		title: "夜航星",
		artist: "蔡明希-不才 / 三体宇宙",
		source: "/music/夜航星.mp3",
		lyrics: "/music/yehangxing.lrc",
	},
	{
		id: "xiyou-jiuzhou",
		cover: "https://img1.kuwo.cn/star/albumcover/300/s4s91/43/1069382541.jpg",
		title: "戏游九州",
		artist: "洛天依",
		source: "/music/戏游九州.mp3",
		lyrics: "/music/xiyou-jiuzhou.lrc",
	},
	{
		id: "wo-hao-xiang-ni",
		cover: "https://img1.kuwo.cn/star/albumcover/300/s4s0/8/24940625.jpg",
		title: "我好想你",
		artist: "苏打绿",
		source: "/music/我好想你.mp3",
		lyrics: "/music/wo-hao-xiang-ni.lrc",
	},
	{
		id: "jiuchong-xianshi",
		cover: "https://p1.music.126.net/fPPLz_0Ilx3SV3r4yxlQlA==/18338754439883750.jpg?param=300x300",
		title: "九重现实",
		artist: "洛天依-言和-乐正绫-DELA",
		source: "/music/九重现实.mp3",
		lyrics: "/music/jiuchong-xianshi.lrc",
	},
];
