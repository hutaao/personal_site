# hutaao 的学习手记

基于 Astro、Shirone 和 Firefly 入场效果的个人博客，用于记录技术学习、科研与生活。

## 本地运行

需要 Node.js 22.12 以上和 pnpm 9.14.4。

```sh
pnpm install --frozen-lockfile
pnpm dev -- --port 4324
```

主仓库预览地址为 `http://localhost:4324/personal_site/`。GitHub Pages 子路径已配置为 `/personal_site/`。

```sh
pnpm astro check
pnpm build
```

## 内容与外观

- 站点设置：`src/config/siteConfig.ts`
- 个人资料：`src/config/profileConfig.ts`
- 侧栏排列：`src/config/sidebarConfig.ts`
- 文章：`src/content/posts/`
- 动态：`src/content/moments/`
- 壁纸与头像：`src/assets/images/hutaao/`

调色盘提供外观、壁纸和特效三组设置，保存访问者的本地偏好。保留 Firefly 全屏入场与 Shirone 阅读区域，支持 Classic 和 Hero 布局。

当前文章、动态等仍包含主题示例内容，后续可逐步替换。

## 来源与许可

主题基于 [LyraVoid/Shirone](https://github.com/LyraVoid/Shirone)，入场效果与樱花参考 [CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly)。保留原主题署名及 MIT 许可，见 `LICENSE` 和 `THIRD_PARTY_LICENSES/Firefly-LICENSE`。内容许可配置与素材各自的许可独立。

推送源码不会自动启用 GitHub Pages 部署。