---
title: "Issue Nº 02 — From robot brains to robot bodies"
order: 101
intro: '第二期 · 156 篇论文 · 从 VLA 鼻祖到 2025 前沿，11 主题全景'
issue_number: II
issue_date: 2026 · Late Spring
---

## 编辑前言

第一期我们从 7 个主题的 13 篇精读开始——把"机器人怎么开始有脑子"这件事讲了一个开头。

第二期我们扩到 **11 主题、156 篇笔记**：

- VLM 基座从 LLaVA 一篇扩到 21 篇（CLIP、BLIP、Flamingo、Qwen-VL、InternVL、DeepSeek-VL、Pixtral...）
- VLA 主线从 1 篇扩到 16 篇（RT-1、RT-2、Octo、π0、π0.5、TinyVLA、SpatialVLA、DexVLA...）
- **新增 4 个主题**：
  - **扩散策略 / 流匹配**（Diffusion Policy、3D Diffusion Policy、π0、π0-FAST、EquiBot...）
  - **模仿学习与遥操作**（ACT/ALOHA、Mobile ALOHA、UMI、HumanPlus、SmolVLA...）
  - **数据集与评测**（Open X-Embodiment、DROID、RoboCasa、LIBERO、SimplerEnv...）
  - **仿真与 Sim2Real**（Isaac Gym、Isaac Lab、Habitat、SAPIEN、ManiSkill、MuJoCo Playground...）

## 本期目录

156 篇按 11 主题编排。每个主题里又按 「祖师爷 → 现代经典 → 前沿延伸」 排序——告诉你这篇是怎么从前面长出来的。

> **注**：标 `auto-summary-light` 的笔记是基于摘要 + 公开资料整理的中等深度版本（约 250-350 行）；标 `auto-summary` 的是基于完整 PDF 整理的完整版本（约 350-500 行）。两种都标了诚实标签，不掩盖深度差异。

---

## 编后语

这一期的**规模跃迁**靠两件事：

1. **架构重构** — `build.mjs` 从硬编码 13 篇改成扫 `notes/*.md` frontmatter 自动发现。每加一篇笔记不再需要改 build 一行。
2. **MinerU + pdftotext** — 替代 lr 后端额度限制，本机解析 PDF。

下一期可能聚焦：「2025 年最值得读的 20 篇 VLA」、「从 RT-1 到 Helix 的演化路径」、或「具身智能的硬件视角」。

整个站现在就是一份**可持续生长的讨论手册**——你写一篇，build 一次，搜索一秒。

---

*◼ End of Issue Nº II.*
