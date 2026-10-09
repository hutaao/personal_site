# 项目维护指南

本文面向需要运行或修改 hutaao-blog 源码的开发者。网站的用途和访客操作见 [README](../README.md)。

## 本地运行

使用 Node.js 24 和 pnpm 9.14.4，与 GitHub Actions 保持一致。在仓库根目录执行：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

终端会显示实际监听的端口。访问该地址下的 `/personal_site/`，例如默认端口对应 `http://localhost:4321/personal_site/`。

Windows PowerShell 如遇脚本执行策略限制，可使用 `pnpm.cmd`。

## 目录说明

| 位置 | 内容 |
| --- | --- |
| `src/pages`、`src/layouts` | 路由与页面布局 |
| `src/components`、`src/styles` | 界面组件与样式 |
| `src/config`、`src/user` | 默认配置与站点配置覆盖 |
| `src/content`、`src/data` | 公开文章与结构化内容 |
| `src/assets`、`public` | 图片、音频、视频和其他静态资源 |
| `scripts` | 内容同步、资源生成与检查脚本 |
| `docs` | 技术说明与维护文档 |
| `rules`、`DESIGN.md` | 组件、设计与代码约定 |
| `tests` | 单元测试与浏览器测试 |
| `.github/workflows/pages.yml` | GitHub Pages 构建与发布 |
| `THIRD_PARTY_LICENSES` | 第三方许可说明 |

`dist`、`.astro` 和 `node_modules` 是构建产物、缓存或依赖目录，不提交到仓库。内容同步和配置覆盖的契约见 [内容分离文档](content-separation/README.md)。

## 检查与构建

```sh
pnpm check
node --test tests/calendar-activity.test.mjs
pnpm build
pnpm preview
```

`pnpm build` 包含内容同步、图标生成、动态缩略图生成、Astro 静态页面构建、Pagefind 搜索索引与字体检查。预览同样使用 `/personal_site/` 子路径。

验证应与改动相匹配。页面交互需要补充对应的浏览器检查；上游部分测试依赖演示内容，不能直接视为本站的发布门禁。具体约定见 [CI 与测试说明](ci-and-node-tests.md)。

## 发布与回退

推送至 `main` 后，[Pages 工作流](../.github/workflows/pages.yml) 会运行检查、构建并发布，也支持手动触发。云端读取已提交的源码和公开内容。

发布前检查差异；发布后确认首页、文章页和静态资源能够访问。主站部署在 `/personal_site/` 下，修改路径或资源时需同时检查站内导航。

需要撤回改动时，使用 `git revert <提交号>` 生成恢复提交，再重新发布，避免强制改写远端历史。

组件分层、配置契约和资源管线的详细资料见 [文档索引](README.md) 与 [部署分层说明](deployment.md)。
