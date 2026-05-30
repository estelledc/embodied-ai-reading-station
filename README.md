# Embodied AI Paper Reading / 具身智能论文阅读

> 一份 12 篇具身智能论文（VLM / VLA / 机器人 / 多模态 / 世界模型 / 射频 / 听觉）的精读学习站。
> A reading-station that walks through 12 papers across embodied AI: VLM / VLA / robotics / multimodal / world models / RF / auditory intelligence.

## 这是什么

由本科科研任务驱动的学习项目：精读 12 篇论文 → 沉淀双语笔记 → 部署成可反复访问的网站 → 最终产出一份 10–15 页中英文汇报 PPT。

## 目录结构

```
embodied-ai-research/
├── research-task.md     # 原始任务清单（导师下发的 PDF 整理）
├── papers/              # 12 篇论文：原 PDF + lr pdf bundle 转出的带图 markdown
├── notes/               # 12 篇精读笔记（中文为主，关键术语保留英文）
├── site/                # 静态学习站源码（atelier-zero 期刊风）
├── deck/                # 10–15 页中英汇报 PPT（HTML deck → 浏览器打印 PDF）
└── README.md            # 本文件
```

## 论文清单（按主题）

| # | 主题 | 论文 | short-name |
|---|---|---|---|
| 01 | 一. VLM 基座 | LLaVA — Visual Instruction Tuning | `llava` |
| 02 | 一. VLM 基座 | 3DShape2VecSet | `3dshape2vecset` |
| 03 | 二. 任务规划 | SayCan | `saycan` |
| 04 | 三. 端到端 VLA | OpenVLA | `openvla` |
| 05 | 四. 多模态 | VLAS — VLA with Speech | `vlas` |
| 06 | 四. 多模态 | MLA — Multisensory Language-Action | `mla` |
| 07 | 五. 世界模型 | Cosmos Policy | `cosmos-policy` |
| 08 | 六. 射频感知 | RF-Based 3D SLAM | `rf-slam` |
| 09 | 六. 射频感知 | mmCLIP | `mmclip` |
| 10 | 六. 射频感知 | NLOS 3D Reconstruction | `nlos-mmwave` |
| 11 | 七. 听觉 | Proactive Hearing Assistants | `proactive-hearing` |
| 12 | 七. 听觉 | NeuralAids | `neuralaids` |
| 13 | 七. 听觉 | Acoustic Swarms / Speech Zones | `acoustic-swarms` |

> 实际是 13 篇——任务 PDF 里七大主题里塞了 13 篇，不是 12。我们全读。

## 工作流

1. `lr pdf bundle <paper.pdf>` → 把 PDF 转成带图 markdown
2. 在 `notes/<short-name>.md` 用统一模板写精读笔记
3. `node site/scripts/build.mjs` 把 markdown 渲染成期刊风 HTML
4. push 到 GitHub → Actions 自动部署到 Pages

## 视觉风格

- 主视觉：[atelier-zero](../open-design/design-systems/atelier-zero/DESIGN.md) — 暖纸 ivory + 珊瑚红 + 罗马数字章节
- 阅读节奏：[warm-editorial](../open-design/design-systems/warm-editorial/DESIGN.md) — GT Sectra serif + terracotta accent
- 工艺规则：[craft/typography-hierarchy-editorial](../open-design/craft/typography-hierarchy-editorial.md)

## 进度

进度看 [progress.md](progress.md)（精读完一篇划掉一行）。
