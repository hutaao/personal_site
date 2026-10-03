/**
 * 用户配置覆盖层（由 `pnpm content:sync` 生成，请勿手工编辑）。
 *
 * 内容来自内容仓的以下文件，改配置请改那边：
 * - config/site.yaml
 * - config/profile.yaml
 * - config/license.yaml
 * - config/announcement.yaml
 * - config/footer.yaml
 * - config/music.yaml
 * - config/umami.yaml
 * - config/about.yaml
 * - config/friends.yaml
 * - config/moments.yaml
 * - config/albums.yaml
 * - config/compass.yaml
 *
 * 每个领域的类型标注让 `tsc` 直接校验用户配置：拼错的键、越界的枚举、填错的类型
 * 都会在这里报错，错误信息里的行号可以对回上面的 YAML 文件。
 */

import type { AboutConfig } from "@/types/aboutConfig";
import type { AlbumsConfig } from "@/types/albumsConfig";
import type { AnnouncementConfig } from "@/types/announcementConfig";
import type { CompassConfig } from "@/types/compassConfig";
import type { LicenseConfig, ProfileConfig, SiteConfig } from "@/types/config";
import type { FooterConfig } from "@/types/footerConfig";
import type { FriendsConfig } from "@/types/friendsConfig";
import type { MomentsConfig } from "@/types/momentsConfig";
import type { MusicConfig } from "@/types/musicConfig";
import type { UmamiConfig } from "@/types/umamiConfig";

/**
 * 用户只需要写想改的键，因此每个领域都按「深度可选」校验。
 *
 * 数组保持原类型不放宽：清单类配置（侧栏 widget、社交链接）的覆盖语义是整体替换，
 * 半个元素没有意义，而且保留完整类型才能让判别联合的 `type` 字段继续生效。
 */
type DeepPartial<T> = T extends readonly unknown[]
	? T
	: T extends object
		? { [K in keyof T]?: DeepPartial<T[K]> }
		: T;

// config/site.yaml
const site: DeepPartial<SiteConfig> = {
	title: "hutaao",
	subtitle: "把好奇心，写成看得见的路径。",
	banner: {
		homeText: {
			title: "welcome to my blog!",
			subtitle: [
				"四百年，不过是明日复明日罢了",
			],
		},
	},
	favicon: [
		{
			src: "/favicon/hutaao-monogram.svg",
			sizes: "any",
		},
	],
};

// config/profile.yaml
const profile: DeepPartial<ProfileConfig> = {
	name: "hutaao",
	bio: "记录技术、科研与生活的学习手记。",
	avatar: "assets/images/hutaao/avatar.png",
	links: [
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/hutaao",
		},
	],
};

// config/license.yaml
const license: DeepPartial<LicenseConfig> = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

// config/announcement.yaml
const announcement: DeepPartial<AnnouncementConfig> = {
	title: "",
	content: "",
	closable: true,
	link: {
		enable: false,
		text: "",
		url: "",
		external: true,
	},
};

// config/footer.yaml
const footer: DeepPartial<FooterConfig> = {
	enable: false,
};

// config/music.yaml
const music: DeepPartial<MusicConfig> = {
	enable: true,
	provider: "local",
	defaultVolume: 0.7,
	defaultMode: "sequence",
};

// config/umami.yaml
const umami: DeepPartial<UmamiConfig> = {
	enable: true,
	shareUrl: "https://cloud.umami.is/analytics/us/share/HylggNPcWDlhBeZV",
	websiteId: "a767980f-2749-4db7-8e3a-753debcd592c",
	scriptUrl: "https://cloud.umami.is/script.js",
};

// config/about.yaml
const about: DeepPartial<AboutConfig> = {
	enable: true,
	title: "$t:about",
	description: "$t:about",
};

// config/friends.yaml
const friends: DeepPartial<FriendsConfig> = {
	enable: true,
};

// config/moments.yaml
const moments: DeepPartial<MomentsConfig> = {
	enable: true,
	title: "$t:moments",
	description: "$t:momentsBanner",
};

// config/albums.yaml
const albums: DeepPartial<AlbumsConfig> = {
	enable: true,
	title: "$t:albums",
	description: "$t:albumsBanner",
};

// config/compass.yaml
const compass: DeepPartial<CompassConfig> = {
	enable: true,
	title: "$t:compass",
	description: "$t:compassBanner",
};

/** 领域名 -> 该领域的用户覆盖值（仅包含用户显式声明的键）。 */
export const userConfigOverrides: Readonly<Record<string, unknown>> = {
	site,
	profile,
	license,
	announcement,
	footer,
	music,
	umami,
	about,
	friends,
	moments,
	albums,
	compass,
};

/** 本次生成消费了内容仓中的哪些文件，用于溯源与错误提示。 */
export const userConfigSources: readonly string[] = [
	"config/site.yaml",
	"config/profile.yaml",
	"config/license.yaml",
	"config/announcement.yaml",
	"config/footer.yaml",
	"config/music.yaml",
	"config/umami.yaml",
	"config/about.yaml",
	"config/friends.yaml",
	"config/moments.yaml",
	"config/albums.yaml",
	"config/compass.yaml",
];
