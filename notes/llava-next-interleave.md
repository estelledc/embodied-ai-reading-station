---
title: "LLaVA-NeXT-Interleave"
slug: llava-next-interleave
topic: vlm-foundation
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2407.07895"
venue: arXiv
year: 2024
era: frontier
num: 140
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

把多张图、视频帧、3D 多视角帧统统当成"一串带文字的图片序列"喂给同一个 VLM（视觉语言模型，Vision-Language Model），用一个模型同时处理多图理解、视频理解、3D 场景理解三类任务，避免每个模态都训一个专用模型。

核心招数是 **interleaved data format（交错数据格式）**：图和文字按出现顺序穿插排列，模型看到的是 `[文字 1][图 1][文字 2][图 2][图 3][文字 3]...` 这样的序列，不再区分"这是单图任务还是视频任务"。

## 这是个什么场景 — 日常类比

想象你在看一篇旅游攻略推文。

作者会这么写：

> "今天去了西湖（配图 1），先到苏堤（配图 2），然后划船看断桥（配图 3 + 配图 4 不同角度），晚上吃了这家面（配图 5）。"

你读这篇推文时，**文字和图片是穿插着看的**——不是先把所有图看完再读文字，也不是只看文字不看图。文字给图提供上下文，图给文字提供具体形象。

之前的 VLM 大多只会"看一张图回答问题"（单图 VQA），就像只会看一张照片不会看推文。LLaVA-NeXT-Interleave 想做的是：**让模型像人读推文一样，自然地处理"图文交错"的输入**。

而一旦你能处理交错图文，**视频**（一串按时间排的帧）和 **3D 场景**（一串从不同角度拍的帧）也就变成了同一种格式——它们都是"多张图 + 描述文字"。

## 之前的人怎么做的 — 3-5 bullet

- **单图 VLM**（LLaVA-1.5、BLIP-2、Qwen-VL 早期版本）：一次只看一张图回答问题，遇到多图、视频任务直接歇菜或者只能选一帧。
- **视频专用模型**（Video-LLaMA、VideoChat、Video-LLaVA）：专门为视频设计架构，加时间编码器或者时序 pooling，但跟单图任务不通用。
- **多图专用模型**（Mantis、VPGTrans 等）：处理多图但不擅长视频或 3D。
- **3D 场景模型**：单独一个分支，往往用点云（point cloud）+ 专用 encoder，不复用 2D VLM 的能力。
- **共同问题**：每加一个新模态就要重训一个新模型，能力分散，scaling 慢，benchmark 各做各的，模型间能力不互通。

## 这篇论文的关键想法

> **一个 format 统一三类任务**：把多图、视频、3D 都重新表达成"图文交错序列（interleaved image-text sequence）"，然后一个模型一起训练、一起推理。

具体三个 insight：

1. **数据视角统一**：多图问答、视频 caption、3D 场景描述，本质都是"多张图 + 文字"，差别只是图来自哪儿（不同物体 / 不同时刻 / 不同视角）。
2. **架构最小改动**：在 LLaVA-NeXT 已有的单图架构上扩展，不引入特殊的时序/3D 模块；图们各自走 vision encoder，token 拼起来交给 LLM 处理。
3. **任务能力可迁移（cross-task transfer）**：在交错格式上训出的能力，在不同模态间可以互相增强——多图训练的"对比能力"会帮视频"找差异帧"。

## 它怎么做的（方法）— 3-4 段

**数据格式（M4-Instruct）**

作者构造了一个统一的多模态多任务指令数据集（M4 = Multi-image / Multi-frame / Multi-view / Multi-patch）。每条样本都是 `<text> <image_1> <text> <image_2> ... <text>` 这样的交错形式。多图任务（比如对比两张图哪个不同）就是 2-3 张图穿插；视频就是把帧按时序穿插；3D 就是把多视角帧穿插。具体训练数据规模和混合比例需读原文。

**模型架构**

基本沿用 LLaVA-NeXT 的结构：vision encoder（应该是 CLIP / SigLIP 系，具体配置需读原文）+ projector（投影层，把视觉 token 映射到 LLM 词表空间）+ LLM backbone（基于 Qwen 或 LLaMA 系列，多个尺寸版本）。多图输入时，每张图独立过 encoder，得到的视觉 token 按交错顺序穿插进文字 token，整体一起送进 LLM。

**训练范式**

应该走标准的 instruction tuning（指令微调）：先在大规模图文对上做预训练对齐 vision-LLM，然后在 M4-Instruct 上做指令微调，让模型学会处理交错格式。是否分阶段、各阶段数据比例、超参数需读原文确认。

**推理时的 unified 接口**

不管用户给的是 2 张图（多图 QA）、16 帧视频（视频问答）还是 8 个视角（3D 场景描述），模型都用同一种 prompt 模板处理。这就是它说的 "a single model handles three multi-image scenarios" 的含义。

## 实验在做什么

按论文常规结构，应该测了三大类 benchmark：

- **多图基准**：MMMU-multi、Mantis-Eval、BLINK 等多图理解任务，看能不能跨图对比、找关系。
- **视频基准**：MVBench、VideoMME、EgoSchema 等视频理解任务，看时序推理能力。
- **3D 基准**：ScanQA、SQA3D 等 3D 场景理解，看多视角整合能力。

核心论点应该是：**单一模型在三类任务上都能达到或接近专用 SOTA**，证明 interleaved format 的统一性不会牺牲单任务性能。同时应该有 ablation 显示：

- 只在单一模态训练 vs 三类混合训练，混合训练在 cross-task 上更强。
- 不同模型尺寸（7B / 14B / ...）的 scaling 表现。

具体数字、对比模型、提升幅度需读原文。

## 你应该懂的几个新词 — 4-6 个

- **Interleaved image-text format（图文交错格式）**：图和文字按出现顺序穿插的输入序列。例：`[文字][图][图][文字][图][文字]`，区别于"先全部图再文字"或"先全部文字再图"。
- **Multi-image instruction tuning（多图指令微调）**：在多图样本上做 instruction tuning，让模型学会处理"输入有多张图"的任务，而非单图。
- **Cross-task transfer（跨任务迁移）**：一种能力（如多图对比）在另一种模态（如视频帧差异）上自然涌现，不用单独训。
- **Multi-view（多视角）**：从不同角度拍同一个 3D 物体/场景的多张 2D 图片。LLaVA-NeXT-Interleave 把 3D 任务降维成多视角图片任务。
- **Visual token（视觉 token）**：图片经过 vision encoder 后变成的一组向量，每个向量长得像 LLM 词表里的一个 "词"，所以可以和文字 token 拼在同一个序列里。
- **M4-Instruct**：作者构造的统一指令数据集，覆盖 multi-image / multi-frame / multi-view / multi-patch 四种"多图"场景。

## 它和其他论文什么关系

- **承接 LLaVA-1.5 / LLaVA-NeXT**：是 LLaVA 系列的多图扩展，单图能力来自 LLaVA-NeXT。
- **对标 Mantis / VPGTrans**：同样想做多图 VLM，但 LLaVA-NeXT-Interleave 更统一（覆盖视频和 3D）。
- **对标 Video-LLaVA / VideoChat**：视频理解能力，但不引入专用时序模块，靠 interleaved format 复用单图能力。
- **铺垫 InternVL-2.5 / Qwen2-VL / LLaVA-OneVision**：后续的"统一 VLM"基本都接受了交错格式作为标准输入，LLaVA-NeXT-Interleave 是这个范式较早期的代表。
- **思想上呼应 Flamingo**：Flamingo 也是处理图文交错，但它是 few-shot in-context learning 范式；LLaVA-NeXT-Interleave 是 instruction-following 范式。

## 我建议这样读 — 3-4 步

1. **先看 Figure 1 + Table 1**：理解"interleaved format 长啥样"和"它把哪些任务统一了"，这是全篇论点。
2. **跳到数据章节**：看 M4-Instruct 怎么构造的，数据来源、规模、四类场景的样本占比——这是论文真正的工程贡献。
3. **看主结果表**：对比三类 benchmark 上的成绩，重点看"单一模型 vs 各模态专用 SOTA"的 gap。
4. **如果对训练细节感兴趣**：再看 ablation，尤其是"只训单图 vs 混训三类"的对比，验证 cross-task transfer 是否真的发生。

不建议一上来就啃架构图——架构是 LLaVA-NeXT 的小改，没什么新东西。

## 为什么值得读

- **范式价值**：是"统一多模态 VLM"思路在 2024 中期的代表作，后续的 InternVL-2.5、Qwen2-VL、LLaVA-OneVision 都吃了这碗饭。如果你要追这条线，这篇是必看的中间锚点。
- **工程启发**：告诉你"加新模态不一定要加新模块"，把数据格式改对了，模型能自己学会跨模态泛化。这对做具身 AI（embodied AI）很有用——具身场景天然是多视角 + 时序，可以直接复用这个 format。
- **数据视角的胜利**：M4-Instruct 数据集本身可能比模型贡献更大，提醒人"数据格式设计 ≥ 架构设计"。
- **对 embodied 研究的指引**：如果你要做机器人 VLM，输入往往是"多个摄像头 + 多帧 + 多步骤"，正是 interleaved format 擅长的。这篇可以当 embodied VLM 输入设计的参考起点。

读完后建议串看：LLaVA-OneVision（同组后续）→ Qwen2-VL（工业级实现）→ InternVL-2.5（更大规模工程）。
