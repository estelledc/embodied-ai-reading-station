---
title: "Expanding Performance Boundaries of Open-Source Multimodal Models with Model, Data, and Test-Time Scaling"
slug: internvl-2-5
topic: vlm-foundation
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2412.05271"
venue: arXiv
year: 2024
era: frontier
num: 138
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

InternVL 2.5 是上海 AI Lab 在 2024 年底发布的开源视觉-语言模型（VLM, Vision-Language Model）系列。它没有提出某一个全新组件，而是把"模型规模、数据规模、测试时计算（test-time compute）"三个维度同时往上推了一截，让开源模型在 MMMU（Massive Multi-discipline Multimodal Understanding，大学级综合多模态题库）上首次突破 70 分，把开源和 GPT-4o 之间的差距压到接近持平。

它的价值不在于发明，而在于"系统性地证明开源也可以做到"——并且把怎么做、用了什么数据、踩了什么坑写成可复现的工程指南。

## 这是个什么场景 — 日常类比

把 VLM 想成一个能看图说话的实习生。之前的开源实习生（LLaVA、Qwen-VL、InternVL 2.0 等）在简单题目上已经够用，但碰到大学考试那种"看一张化学反应图回答机理"或"看一张地图分析地缘"，就明显不如闭源 GPT-4o 那位天才同学。

InternVL 2.5 的思路相当于：**让开源实习生再上一年学**——把课本厚度（模型参数）翻倍、做题量（训练数据）翻倍、考试时给更多思考时间（测试时多步推理），最后这位实习生在大学综合卷上第一次摸到 70 分这个本科及格线。

它不是发明新教学法，而是把已有的教学法放大到极致并且全部公开。

## 之前的人怎么做的 — 3-5 bullet

- **闭源压制**：GPT-4o、Claude 3.5、Gemini 1.5 在多模态综合卷上长期把开源压在 60 分以下，开源最高大概在 65 分附近徘徊。
- **单维度扩展**：很多开源工作只做一件事——要么堆参数（LLaVA-NeXT 加大 LLM）、要么堆数据（ShareGPT4V）、要么堆推理（CoT 提示），很少三个一起做。
- **数据质量被忽视**：早期开源 VLM 的训练数据里有大量重复、噪声、低质 caption，但因为算力瓶颈先被忽略；具体清洗方法多数没公开。
- **训练 recipe 黑盒**：闭源不公开，开源公开但碎片化；从 224 分辨率到 448 到动态高分辨率，每一步该怎么 schedule、什么时候解冻视觉塔，社区缺一份"工业级配方"。
- **测试时计算未被开源 VLM 重视**：OpenAI o1 系列已经把 test-time scaling 在文本侧做火了，但开源 VLM 在多模态上几乎没人系统试过。

## 这篇论文的关键想法

一句话：**三轴同时扩展（Model / Data / Test-Time），并且把每一轴拆到能复现的颗粒度**。

- **模型轴**：从 1B 到 78B 的完整阶梯，视觉塔（InternViT）和语言塔（基于 Qwen2.5、InternLM2.5 等）配比经过系统消融，给出了"小模型该用什么大小的 ViT"的对照表。
- **数据轴**：训练语料从 InternVL 2.0 的量级再扩张，同时强调**质量过滤**——去重、剔除低分样本、加强 OCR / 数学 / 图表等长尾领域；并构建混合 SFT（Supervised Fine-Tuning，监督微调）数据。
- **测试时轴**：在推理阶段引入 chain-of-thought + best-of-N + 自一致性等组合，把"一次答题"变成"多次思考再投票"，在 MMMU、MathVista 等推理重的 benchmark 上拿到额外几分。

关键洞察是：三轴**互相放大**——更大模型更能从更多数据中受益，也更能从更长的测试时思考中受益。这其实是把 LLM scaling law 的故事完整迁移到了 VLM。

## 它怎么做的（方法）— 3-4 段

**视觉塔 + 语言塔的渐进对齐。** InternVL 系列一贯的做法是用一个独立训练的 6B 级视觉编码器 InternViT（不是直接用 CLIP/SigLIP），跟语言模型通过 MLP projector 对齐。2.5 延续这个架构，但分辨率支持改成动态切片（dynamic high-resolution）：一张图按内容切成多个 448×448 patch tile，每个 tile 走 ViT 后再拼回来，这样既能处理 4K 文档也能处理小图标。具体切片策略和最大 tile 数需读原文。

**三阶段训练流程。** 大致是 (1) 视觉-语言预对齐：冻结 LLM，只训练 projector + 部分 ViT；(2) 大规模图文预训练：解冻 ViT，用海量 web 图文对继续训练；(3) 多任务 SFT：用高质量指令数据调教，让模型学会按指令格式回答。每一阶段的学习率、解冻策略、数据混合比都给了消融。具体数字需读原文。

**数据 pipeline 的工程细节。** 摘要强调他们做了 dataset-level 和 sample-level 双层过滤：dataset-level 评估每个数据源的整体质量决定权重；sample-level 用模型打分剔除单条噪声。还专门补了文档理解、图表、OCR、数学公式、视频帧等长尾数据。这套 pipeline 是开源 VLM 里少见的工业级配方。

**测试时扩展。** 在推理阶段允许模型先生成 reasoning trace 再给答案（CoT），并支持 best-of-N 采样 + majority vote。论文报告这种 test-time scaling 在推理重的 benchmark 上能再加几分，但对感知类任务（OCR、grounding）增益有限——这和 LLM 侧的发现一致：**思考时间只对真正需要思考的题目有用**。

## 实验在做什么

- **核心结论**：MMMU 上 InternVL 2.5-78B 首次让开源模型突破 70 分，是这篇论文最响亮的标题党数字。
- **覆盖 benchmark**：MMMU、MMBench、MathVista、AI2D、ChartQA、DocVQA、OCRBench、RealWorldQA、视频 benchmark（Video-MME 等）、grounding（RefCOCO 系列）。覆盖面接近"开源 VLM 全家桶评测"。
- **对比对象**：闭源（GPT-4o、Claude 3.5 Sonnet、Gemini 1.5 Pro）+ 开源（Qwen2-VL、LLaVA-OneVision、Pixtral 等）。
- **消融**：分别消融模型规模、数据规模、测试时策略对 MMMU 的贡献，验证"三轴各自有效且可叠加"。
- **效率**：1B / 2B / 4B / 8B / 26B / 38B / 78B 完整阶梯，方便下游用户按显存挑型号——这是开源相对闭源的关键卖点。

具体每个 benchmark 的数字、消融表的 delta 需读原文表格。

## 你应该懂的几个新词 — 4-6 个

- **MMMU（Massive Multi-discipline Multimodal Understanding）**：覆盖艺术、商科、医学、理工等大学课程的综合多模态题库，被视为 VLM 的"高考"，70 分是公认的强模型门槛。
- **Test-Time Scaling**：推理阶段花更多算力换准确率，比如 CoT、best-of-N、self-consistency、tree search。OpenAI o1 把它推火，社区开始往多模态迁移。
- **Dynamic High-Resolution（动态高分辨率切片）**：把一张图按宽高比切成多个固定尺寸 tile，让 ViT 既能看高分辨率细节又不爆 token 数。InternVL、Qwen-VL、Llama 3.2 Vision 都用了类似思路。
- **InternViT**：上海 AI Lab 自训的 6B 级视觉编码器，对标 CLIP/SigLIP 但参数量更大，是 InternVL 系列的"自家视觉塔"。
- **Projector**：连接视觉特征和 LLM 词嵌入空间的小型 MLP 或 cross-attention 模块，是 VLM 里参数最少但最关键的"翻译层"。
- **SFT（Supervised Fine-Tuning）**：监督微调阶段，用高质量指令-回答对调教模型，让它学会"按用户期望的格式输出"。

## 它和其他论文什么关系

- **直接前作**：InternVL 1.0 / 1.5 / 2.0 是同一系列，2.5 主要是规模和数据扩展，架构改动不大。
- **同代竞品**：Qwen2-VL、LLaVA-OneVision、Pixtral、Llama 3.2 Vision 都在同一时间窗发布，互相对标；InternVL 2.5 在多数 benchmark 上是当时开源 SOTA。
- **scaling law 谱系**：把 Kaplan / Chinchilla 的 LLM scaling 迁移到 VLM；同期 Idefics3、PaliGemma 2 也在做类似事，但 InternVL 2.5 是规模阶梯最完整、数据 pipeline 最透明的之一。
- **测试时计算谱系**：和 OpenAI o1、DeepSeek-R1（同期）共享"test-time compute"哲学，但应用到多模态。后续 InternVL 3、Qwen2.5-VL 会继续推这条线。
- **embodied / 机器人下游**：作为通用 VLM backbone，InternVL 2.5 经常被下游 VLA（Vision-Language-Action）模型用作初始化，比如某些机器人 policy 会拿 26B 版本做视觉理解前端。

## 我建议这样读 — 3-4 步

1. **先看 §1 引言 + §6 实验主表**：确认"三轴扩展"的总框架和 MMMU 70 分这个标题数字是怎么来的。
2. **跳到数据章节（通常在 §3 或 §4）**：重点看 dataset-level / sample-level 过滤的具体规则，这是最有工程参考价值的部分；如果你以后要训自己的 VLM，这章是地图。
3. **训练 recipe 表**：找三阶段训练的学习率 / 解冻策略 / 数据混合比；对照自己手头资源决定能复现到哪个量级。
4. **测试时扩展章节**：看 CoT + best-of-N 的具体 prompt 模板和 vote 策略；这部分对推理优化工程师最有用，可以独立迁移到别的 VLM。

如果你只关心"开源 VLM 现状"，看引言 + 主表就够；如果你要用它做下游任务，重点看模型规模阶梯和支持的输入分辨率。

## 为什么值得读

- **它是 2024 年开源 VLM 的标志性 milestone**：MMMU 70 分对开源社区的意义类似 Llama 3 在文本侧"开源追上 GPT-4"的那一刻。
- **工程透明度高**：数据 pipeline、训练 recipe、消融全部公开，是少有的能当作"工业级 VLM 训练教科书"读的论文。
- **规模阶梯完整**：从 1B 到 78B 七档全发布，下游用户基本都能挑到合适显存的型号；这种"全家桶"策略也成了后续开源 VLM 的标准动作。
- **三轴框架是后续工作的脚手架**：InternVL 3、Qwen2.5-VL、MiniCPM-V 2.6 等都沿用"模型 + 数据 + 测试时"的叙事框架，2.5 是这套叙事的第一份完整论证。
- **对 embodied AI 的连接**：作为通用视觉理解基座，它会出现在很多 VLA、机器人 policy、世界模型的 backbone 选项里，理解它的能力边界 = 理解下游模型的能力边界。

读完之后你应该能回答三个问题：开源 VLM 当前能做到什么？下一步往哪扩？如果我要训一个，从哪一步开始抄作业？
