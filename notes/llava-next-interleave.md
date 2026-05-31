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

教 AI 像刷图文并茂的小红书：图和字按顺序穿着读，多图、视频、3D 都用这一招，不用各训一个模型。

## 这是个什么场景

你周末刷小红书看一篇西湖游记。博主是这么排版的：

> "早上到了西湖（图 1），先走苏堤（图 2），划船看断桥拍了正面和侧面两张（图 3、图 4），晚上吃了这家片儿川（图 5）。"

你读的时候**图和字是穿着看的**——文字告诉你这是哪、在干嘛，图告诉你具体长啥样。要是博主把所有图堆在最前面、文字全塞最后，你会看得很累。

可之前大多数 VLM（视觉语言模型，能看图说话的 AI）只会"盯一张照片回答一个问题"，相当于只会看单张照片、不会读图文混排的笔记。这篇论文想让模型也能像你刷小红书一样，自然处理"图字穿插"的输入。

**而且这一招还能顺便搞定两件事**：
- **视频** = 一串按时间排的图（早 → 中 → 晚）
- **3D 场景** = 一串从不同角度拍的图（正面 / 侧面 / 背面）

它们本质上都是"多张图 + 几段文字"，只是图的来源不同。所以一种"图文穿插"的格式，可以一口气覆盖三类任务。

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

**数据格式（M4-Instruct）—— 像写一本图文混排的菜谱**

菜谱不会把"步骤 1、2、3"全堆在一起，再把"翻面图、出锅图、装盘图"塞最后；它会"步骤 1 + 这张图、步骤 2 + 那张图"穿着写。作者就照这思路做了 M4-Instruct（M4 = Multi-image 多图 / Multi-frame 多帧 / Multi-view 多视角 / Multi-patch 多切片）这个统一指令数据集。每条样本长这样：`<文字> <图 1> <文字> <图 2> ... <文字>`。多图任务塞 2-3 张图找不同，视频按时间顺序塞帧，3D 按视角顺序塞图。具体规模和混合比例需读原文。

> 等等，先慢一拍 — instruction（指令）数据集是什么？
>
> 简单说：数据集里每条都长得像"用户提问 + 标准答案"。比如"对比这两张图哪里不一样？答：左边那只猫多了条领结。"模型靠看大量这种样本，学会"被问就照样回答"。

**模型架构 —— 像翻译流水线，原班人马接新活**

不重新装修厨房，只多请几个传菜员：基本沿用 LLaVA-NeXT，配方是 vision encoder（视觉编码器，CLIP / SigLIP 系，具体待查原文）+ projector（投影层，把视觉 token 翻译成 LLM 听得懂的"词"）+ LLM backbone（语言主干，Qwen 或 LLaMA 多个尺寸）。多张图来时，每张各走一遍编码器拿到自己的视觉 token，再按顺序穿插进文字 token 里，整队一起送进 LLM。

**训练范式 —— 先学认字，再学答题**

走的是标准 instruction tuning（指令微调）两步走：第一步在大规模图文对上预训练，让 vision 端和 LLM 端先"对上暗号"；第二步在 M4-Instruct 上做指令微调，教模型读懂"图文穿插"的提问方式。是否分更细的阶段、各阶段数据比例、超参数需读原文确认。

**推理时的统一接口 —— 一个口子，三种点单方式**

像便利店收银台不分早餐、午餐、夜宵，都从同一个口子结账：用户给 2 张图（多图问答）、16 帧视频（视频问答）还是 8 个视角（3D 场景描述），模型都用同一套 prompt 模板处理。这就是论文说的 "a single model handles three multi-image scenarios"——一个模型，吃三类活。

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
