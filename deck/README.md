# LLaVA 精读 deck · 中英双语

> 为 Task 1（论文精读 + 英文 deck）准备的 14 页 deck。
> 风格与学习站一致：atelier-zero 暖纸 + 珊瑚红 + 罗马数字 + Inter Tight + Playfair Italic + JetBrains Mono。

## 怎么看 / 怎么演

```bash
# 从 embodied-ai/ 项目根目录构建站点
cd site
npm install
npm run build

# 用真实的 report-only CSP 响应头预览构建产物
npm run serve:csp -- --port 8765
open http://127.0.0.1:8765/deck/
```

## 控制方式

- `← / →` 翻页
- `Space` 下一页
- `Home / End` 跳到首页 / 末页
- 鼠标滚轮（横向或纵向都行）
- 触屏左右滑
- `ESC` 切换 overview 网格视图，再点任意页跳转

## 14 页结构

| # | Slide | 类型 |
|---|---|---|
| 01 | Cover — Visual Instruction Tuning | dark |
| 02 | Roadmap — Where this fits | content |
| 03 | Chapter I. Why visual instruction tuning? | dark |
| 04 | Motivation — three gaps in 2023 visual AI | content |
| 05 | Chapter II. The method | dark |
| 06 | Method · Data — GPT-4 cooks the recipe | content |
| 07 | Method · Architecture — USB-to-Type-C adapter | content + figure |
| 08 | Method · Training — two stages | content |
| 09 | Chapter III. Does it work? | dark |
| 10 | Stats — four numbers, one verdict | stats |
| 11 | Limits — bag of patches, not yet a scene | content |
| 12 | Legacy — quietly the visual front-end of every VLA | content |
| 13 | Roadmap — from reading to doing (Task 2) | content |
| 14 | fin. | dark |

## 输出 PDF

浏览器全屏打开 → ⌘P / Ctrl+P → 设置：
- 纸张大小：A3 横向（或自定义 1280×720）
- 边距：无（None / 0）
- 选中"背景图形"
- 保存为 PDF

## 在演讲时

演示端用电脑：浏览器全屏 → 键盘 ← / → 翻页。
你拿手机控场：用 [Skype / Teams 演讲者笔记] 这类工具映射键盘事件——或者更简单，在两台机器上各开一个浏览器，物理按键。

## 编辑要点（如果你要改内容）

- 内容在 `index.html`，从 `<!-- 1. COVER -->` 到 `<!-- 14. END -->`，每个 `<section class="slide">` 是一页。
- 中英双语切换：`.bilingual` grid 两栏（中文左、English 右）。直接在 `<ul>` 里改文字。
- 样式与配色在 `deck.css`；改 `:root` 里的 `--coral`（珊瑚红）和 `--paper`（暖纸）即可全局换色。
- 翻页、缩放和 overview 交互在 `deck.js`。
- 加图：放在 `deck/` 目录下，`<img src="filename.jpg">` 引用。

## 风格来源

- 设计系统：[atelier-zero](https://github.com/open-design/open-design/tree/main/design-systems/atelier-zero)
- 工艺规则：[typography-hierarchy-editorial](https://github.com/open-design/open-design/tree/main/craft/typography-hierarchy-editorial)
- 模板参考：[kami-deck](https://github.com/open-design/open-design/tree/main/design-templates/kami-deck) — 借鉴了 nav 模型（←/→ · wheel · swipe · ESC）和 chrome 条
