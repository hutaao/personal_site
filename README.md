# hutaao-blog

基于 Astro、Shirone 与 Firefly 入场效果的个人博客。

正式网站：https://hutaao.github.io/personal_site/

## 日常编辑

文章、动态、关于正文、相册、公告、个人资料与歌单通过内容同步器集中管理。
网站构建读取 `src/content`、`src/data`、图片资源及 `src/user/user-config.ts`。

## 本地运行

需要 Node.js 24 与 pnpm 9.14.4。首次安装：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

主项目使用 `/personal_site/` 子路径，预览时需保留此路径。

```sh
pnpm check
node --test tests/calendar-activity.test.mjs
pnpm build
pnpm preview
```

构建包含内容同步、图标、动态缩略图、Astro 静态页面、Pagefind 搜索索引与字体检查。

## 发布与回退

`.github/workflows/pages.yml` 在 `main` 推送后自动构建并部署到 GitHub Pages，也支持手动触发。
GitHub 云端使用已提交的站点内容。

发布前核对差异并检查内容与图片。回退优先使用 `git revert` 生成新的恢复提交并重新部署，不强制改写远端历史。

## 文件导航

| 目录 | 用途 |
| --- | --- |
| `src/components`、`src/layouts`、`src/styles` | 主题组件与外观 |
| `src/config`、`src/user` | 默认配置与同步后的个人配置 |
| `src/content`、`src/data` | 公开文章和结构化内容 |
| `public`、`src/assets` | 图片、图标、字体与静态资源 |
| `scripts/content` | 内容源同步与校验 |
| `docs`、`rules` | 主题技术文档与维护约定 |
| `tests` | 功能测试；部分上游测试需演示文章，不作为本站全套门禁 |
| `.github/workflows/pages.yml` | Pages 自动发布 |

演示文章、相册、歌曲、友链等已清空。当前没有正式文章，留言服务尚未接通；这些空状态属于当前内容状态。

调色盘提供外观、壁纸与特效设置；Umami 显示访问统计。仅正式域名采集访问，本地预览不计入。

## 来源与许可

主题基于 [LyraVoid/Shirone](https://github.com/LyraVoid/Shirone)，入场效果与樱花参考 [CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly)。保留主题署名、`LICENSE` 与 `THIRD_PARTY_LICENSES`。
文章内容许可和图片、音乐等素材许可分别适用。

更多技术细节见 [INDEX.md](INDEX.md) 和 [docs](docs)。`frontmatter.json` 是可选的上游编辑工具配置。
