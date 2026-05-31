---
title: "Qwen-VL: A Versatile Vision-Language Model for Understanding, Localization, Text Reading, and Beyond"
slug: qwen-vl
topic: vlm-foundation
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2308.12966"
venue: arXiv
year: 2023
era: classic
num: 135
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

Qwen-VL 是阿里达摩院 2023 年开源的视觉-语言模型（VLM, Vision-Language Model），把通义千问（Qwen）大语言模型当作主干，外挂视觉编码器，通过三阶段训练让一个模型同时会做：图文理解、中英双语 OCR（光学字符识别）、目标定位（grounding，即"框出图里的某个东西"）和多轮对话。它在发布时是中文社区里第一个能同时打这么多张牌的开源 VLM 基线。

## 这是个什么场景 — 日常类比

想象你在教一个翻译（语言模型）认识图片。最简单的方法是给翻译塞一副"眼镜"（视觉编码器），让它能看见图。

- LLaVA / BLIP-2 那一代做的是：眼镜很简陋，主要让翻译"看个大概"，能讲出"这是一只猫坐在沙发上"。
- Qwen-VL 想做的是：眼镜更精细，翻译不仅能讲，还能：
  - 念出图里的菜单文字（OCR）
  - 用手指框出"那只猫的左耳朵在哪"（grounding）
  - 同时听懂中文和英文的指令
  - 跟你聊好几轮"那如果它换成站着呢？"

类比：就像把一个只会读字幕的同传，升级成"既能看画面、又能念招牌、还能指着画面跟你讨论"的导游。

## 之前的人怎么做的 — 3-5 bullet

- **CLIP 路线（2021）**：图文对齐，但只能算"匹配度"，不能生成长句子。
- **BLIP / BLIP-2 路线（2022-2023）**：用 Q-Former 把视觉特征压缩成几十个 token 喂给 LLM，能生成描述但 grounding 弱、OCR 弱。
- **LLaVA 路线（2023）**：MLP 投影 + 指令微调，生成能力强但中文支持差，不会输出坐标框。
- **Flamingo（2022）**：cross-attention 插进 LLM 每一层，参数大、闭源、不支持中文。
- 共性短板：要么不会"指物体"（grounding），要么不会读图里的中文字，要么是英文私有模型。

## 这篇论文的关键想法

把上面四类能力**合到一个模型**里，而不是为每种任务训一个专门模型。具体三个押注：

1. **主干换成 Qwen-7B**：天然支持中英双语，解决中文 VLM 真空。
2. **视觉端用 ViT-bigG（OpenCLIP）+ 一个轻量"位置感知"的视觉-语言适配器**：让视觉 token 既保留空间信息又压缩到可控数量（具体压缩比需读原文）。
3. **三阶段训练范式**：先大规模预训练打基础，再多任务预训练加 OCR/grounding/caption 等结构化任务，最后指令微调出 Qwen-VL-Chat 对话版本。

最关键的设计是**把 grounding 当作一种文本任务**：模型直接输出 `<box>(x1,y1),(x2,y2)</box>` 这种特殊 token，不用额外检测头。这是把"会指物"塞进语言模型的简洁路线。

## 它怎么做的（方法）— 3-4 段

**架构层**。三件套：视觉编码器（ViT-bigG，约 1.9B 参数，从 OpenCLIP 初始化）+ 视觉-语言适配器（一组可学习的 query token + cross-attention，类似简化版 Q-Former）+ Qwen-7B 语言模型。视觉适配器把 ViT 输出的几百个 patch token 压成 256 个视觉 token 喂给 LLM，附带 2D 绝对位置编码以保留"图里第几行第几列"的空间信息。

**第一阶段：预训练**。用约 14 亿（1.4B）图文对（公开 + 内部清洗），冻结 LLM，只训练 ViT 和适配器。目标是让视觉端"对齐"到 Qwen 的文本空间。低分辨率 224×224，类似 CLIP 风格。

**第二阶段：多任务预训练**。同时训七类任务：image captioning、VQA（视觉问答）、grounded captioning（带框描述）、referring expression comprehension（按描述找框）、OCR、纯文本对话、grounded VQA。把所有任务都格式化成 `<input><任务标签><output>` 的纯文本序列，开放 LLM 训练，分辨率提到 448×448。这一步是 Qwen-VL 多技能的核心。

**第三阶段：指令微调（Qwen-VL-Chat）**。用约 35 万（具体数字需读原文）多模态指令数据 + 多轮对话数据微调，做出能聊天的版本。基础版叫 Qwen-VL，对话版叫 Qwen-VL-Chat。

## 实验在做什么

涉及的 benchmark 大致涵盖四类：

- **通用 VQA**：VQAv2、OKVQA、GQA 等。
- **图文检索 / caption**：Flickr30K、NoCaps 等。
- **OCR / 文本图像理解**：TextVQA、DocVQA、ChartQA、AI2D 等。
- **Grounding / Referring**：RefCOCO、RefCOCO+、RefCOCOg。

公开论调是 Qwen-VL 在多个上面接近或超过当时同尺寸开源 VLM（如 LLaVA-1.5、InstructBLIP），尤其在中文场景和 grounding 任务上是开源里少有的可用方案。具体数字需读原文 / 阿里官方 README。

值得注意的是：实验同时报告**零样本**（zero-shot）和**有指令微调**两套结果，论文也讨论了多轮对话的鲁棒性（Qwen-VL-Chat）。

## 你应该懂的几个新词 — 4-6 个

- **VLM（Vision-Language Model）**：能同时处理图像和语言的模型；既不是纯 CLIP（只对齐），也不是纯文本 LLM。
- **Grounding（视觉定位）**：模型不仅说出"猫在哪"，还要给出像素坐标框。Qwen-VL 直接让 LLM 输出 `<box>` 文本 token 实现。
- **Referring Expression Comprehension**：根据一句话（"穿红衣服的女孩"）在图里框出对应物体，是 grounding 的反向版本。
- **视觉-语言适配器（VL Adapter）**：连接视觉编码器和 LLM 的中间模块。Qwen-VL 用的是带可学习 query 的 cross-attention，把可变数量的 patch token 压成固定 256 个。
- **OCR（Optical Character Recognition）**：让模型读图里的文字。中文 OCR 因为字符多、字形复杂，比英文难，Qwen-VL 是早期开源里中文 OCR 较强的。
- **三阶段训练（Three-stage Training）**：预训练 → 多任务预训练 → 指令微调。这种范式后来被很多 VLM（如 InternVL、MiniCPM-V）继承。

## 它和其他论文什么关系

- **上游**：BLIP-2（Q-Former 思路）、CLIP / OpenCLIP（ViT-bigG 视觉编码器来源）、LLaVA（指令微调范式）、Flamingo（多模态预训练目标）。
- **同期**：LLaVA-1.5、InstructBLIP、CogVLM、MiniGPT-4 — 都在 2023 年探索"LLM + 视觉"，Qwen-VL 的差异点是**中英双语 + grounding + OCR 三合一**。
- **下游**：Qwen-VL 系列后续演进到 Qwen-VL-Plus / Qwen-VL-Max（闭源更强版本）以及 2024 年的 Qwen2-VL（动态分辨率 + 视频）。也启发了国内一批中文 VLM。
- **对具身（embodied）研究的关系**：作为通用 VLM，可以当 high-level planner 或感知前端（看图 → 出指令）；但它本身没接动作空间，要跟 RT-2 / OpenVLA 那条线区分。

## 我建议这样读 — 3-4 步

1. **先看架构图**（论文 Figure 1）：搞清楚 ViT → VL Adapter → Qwen-7B 的数据流，以及 256 个视觉 token 怎么来的。
2. **跳到第 3 节"三阶段训练"**：每一阶段冻结/解冻了什么、数据规模、分辨率变化。这是方法论核心。
3. **看 grounding 怎么"文本化"**：找论文里 `<box>` token 的定义和示例，理解"为什么不用检测头也能定位"。
4. （可选）**对照 LLaVA / BLIP-2 论文**：体会"压缩视觉 token + 指令微调"这个共性范式，以及 Qwen-VL 在 grounding/OCR 上的额外动作。

## 为什么值得读

- 中文社区第一个能打的开源通用 VLM，之后所有"做中文多模态 demo"几乎都绕不开它。
- **三阶段训练 + 任务文本化** 这套范式被后续大量复用，读它就懂了 2023-2024 中文 VLM 的主流套路。
- **Grounding 当文本任务** 是把检测能力"塞进 LLM"的优雅做法，对理解后来视觉 agent / 具身规划器（让 VLM 输出操作坐标）很有启发。
- 工程价值高：模型权重开源、推理脚本完整，是搭中文多模态 baseline 的现成起点。
