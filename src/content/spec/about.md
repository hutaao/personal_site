# 关于 hutaao

记录技术、科研与生活的学习手记。

把好奇心，写成看得见的路径。

[GitHub](https://github.com/hutaao)

## 网页技术实现

本站基于开源博客主题 [Shirone](https://github.com/LyraVoid/Shirone) 搭建，以静态页面呈现文章，配合交互组件实现主题切换、音乐播放与站内导航。部分定制与调试借助 AI 辅助完成，并在日常使用中持续检查、调整。

| 部分 | 使用的技术与用途 |
| --- | --- |
| 页面与交互 | [Astro](https://astro.build/) 负责构建页面，[Svelte](https://svelte.dev/) 提供交互组件，配合 [TypeScript](https://www.typescriptlang.org/) 开发。 |
| 界面与配色 | 使用 [Tailwind CSS](https://tailwindcss.com/) 和 [Stylus](https://stylus-lang.com/)，沿用 Material 3 Expressive 的设计风格，支持明暗主题和配色调整。 |
| 内容写作 | 文章以 Markdown 为主，日常通过 [Obsidian](https://obsidian.md/) 整理和编辑；网站也支持 MDX，以及公式、流程图和代码高亮等内容。 |
| 站内搜索 | [Pagefind](https://pagefind.app/) 在构建时生成全文搜索索引，访客可以在网页中检索已发布内容。 |
| 构建与发布 | 代码和公开内容通过 Git 管理，由 [GitHub Actions](https://github.com/features/actions) 自动构建，发布到 [GitHub Pages](https://pages.github.com/)。 |
| 访问统计 | 使用 [Umami](https://umami.is/) 了解网站访问情况，统计数字不在网页中公开显示。 |

字体主要使用 Outfit、悠哉圆体（Yozai）和 JetBrains Mono。中文字体在正式构建时按内容生成 WOFF2 子集，减少字体下载量。本地文章封面会生成 AVIF／WebP 等派生图片，并提供不同尺寸供浏览器选择；清晰原图与模糊背景配合展示，兼容横图、竖图和方图。

## 网站参考说明

- **[Shirone](https://github.com/LyraVoid/Shirone)**：本站的主题基础，整体组件与配色设计来自该项目；本页的技术介绍参考了其[演示站关于页](https://shirone.mysqil.com/about/)。
- **[Firefly](https://github.com/CuteLeaf/Firefly)／[夏夜流萤](https://blog.cuteleaf.cn/about/)**：首页入场效果与部分视觉效果的参考和移植来源；关于页将个人介绍、站点说明与联系方式结合的组织方式也提供了启发。

感谢这些开源项目的作者与贡献者。本站在此基础上，根据自己的写作与阅读需求继续调整布局、交互和内容展示；相关开源代码保留原有的作者与许可说明。
