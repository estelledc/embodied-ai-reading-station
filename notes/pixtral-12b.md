---
title: "Pixtral 12B"
slug: pixtral-12b
topic: vlm-foundation
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2410.07073"
venue: arXiv
year: 2024
era: frontier
num: 143
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

Pixtral 12B 是 Mistral 推出的第一个开源视觉语言模型（VLM, Vision-Language Model）。它从零开始训练成"原生多模态"——不是在文本模型上后期补丁视觉，而是一开始就让图像和文本混着进。它支持任意分辨率的图片输入、长上下文窗口，并以 Apache-2.0 协议开源（商业友好）。

它的定位是：在 12B 参数量这个"中等体型"档位，把图文理解能力推到接近闭源 SOTA，同时让任何人都能下载、改、用在产品里。

## 这是个什么场景 — 日常类比

把 VLM 想成"既能看图又能聊天的助手"。

之前主流做法像是请了一个语文很好的人（已经训练完的纯文本模型），然后给他配一副"看图眼镜"（视觉编码器 + 一个翻译层）。这个人本来不会看图，眼镜帮他把图翻译成文字描述，他再回答。问题是：眼镜分辨率固定（图必须缩到 224x224 或 336x336），而且眼镜和大脑是后期粘起来的，配合得别扭。

Pixtral 的做法更像：从小让这个人同时学说话和看东西，眼睛能自动调焦距（任意分辨率），看大图就多看几眼，看小图就少看几眼。眼睛和大脑是一起长出来的，不是后装的。

## 之前的人怎么做的 — 3-5 bullet

- **LLaVA / MiniGPT-4 路线**：拿 CLIP 视觉编码器 + 现成 LLM（如 Vicuna、Llama），中间塞一个 MLP 投影层。优点是便宜，缺点是分辨率被锁死、视觉表征和语言空间没真正融合。
- **Flamingo（DeepMind, 2022）**：在 LLM 中插入 cross-attention 层让模型"读"图像 token，但视觉部分是冻结的。
- **GPT-4V / Claude 3 / Gemini**：闭源，效果好但谁也不知道怎么训的，更不能商用改装。
- **Qwen2-VL（Alibaba, 2024）**：开始支持原生分辨率，思路与 Pixtral 类似，是同期的强力开源对手。
- **InternVL 系列**：开源 VLM，但参数规模和训练配方与 Pixtral 不完全可比。

共同短板：视觉部分通常是"借来的"（CLIP 或 SigLIP 直接拿来用），分辨率被预训练阶段锁死，遇到长文档、高清图、多图任务就吃力。

## 这篇论文的关键想法

三件事一起做：

1. **从零训练专属视觉编码器**。Mistral 没用 CLIP，而是自己训了一个名为 Pixtral-ViT 的视觉 backbone，专门为下游 VLM 服务。
2. **支持原生（任意）分辨率与任意宽高比**。图片不被强制压成正方形，长文档、宽屏截图、手机竖屏照片都能直接喂。
3. **保持 Mistral Nemo 12B 的语言能力**。视觉的引入没有把语言能力打折，纯文本任务上仍然强。

加在一起：一个 12B 量级的开源 VLM，图文都不弱，且 Apache-2.0 可商用。

## 它怎么做的（方法）— 3-4 段

**视觉编码器（Pixtral-ViT, 约 400M 参数）**。Mistral 自训了一个 ViT，关键改动是把位置编码从"固定网格"换成 2D RoPE（旋转位置编码），这样不同分辨率的图都能编码而不需要插值。图片先按原始宽高比切成 patch，patch 数量随图大小变。一张高清文档可能产出几千个 visual token；一张缩略图可能只有几十个。

**语言 backbone（Mistral Nemo 12B）**。这是 Mistral 与 NVIDIA 联合训练的一个 12B 文本模型，作为 Pixtral 的"大脑"。视觉 token 和文本 token 走同一个 transformer，没有 cross-attention 这种隔离结构——属于"decoder-only 看一切"的统一架构。

**视觉 token 与文本 token 的拼接**。每张图被编码成一串 visual token，前后加上特殊标记（类似 `[IMG] ... [IMG_END]`），再和文本 token 串成一个长序列输入 LLM。多图、图文交错都靠这个序列结构表达。具体的 token 化细节、特殊符号设计需读原文。

**长上下文支持**。Pixtral 上下文窗口约 128K token（具体数字以原文为准），意味着可以同时塞多张高清图 + 大段文字。这对文档理解（多页 PDF、长截图）、多图对比类任务很关键。训练数据配方、阶段划分（pretrain → SFT → 指令微调）等具体细节需读原文。

## 实验在做什么

报告评测覆盖几大类：

- **多模态基准**：MMMU（学科推理）、MathVista（视觉数学）、ChartQA（图表问答）、DocVQA（文档问答）等。
- **纯文本基准**：MMLU、HumanEval 等，验证视觉的引入没有让语言能力退化。
- **与同档位开源模型对比**：Qwen2-VL 7B、LLaVA-OneVision、InternVL2 等。
- **与闭源模型对比**：GPT-4o、Claude 3 Haiku、Gemini 1.5 Flash 这些"中等档位"闭源模型。

具体分数和排名需读原文。论文也提出了一个新评测 MM-MT-Bench，用来更贴近真实多轮多模态对话的场景。

## 你应该懂的几个新词 — 4-6 个

- **原生多模态（natively multimodal）**：从预训练第一步就同时学图和文，不是先训完文本再补视觉。对应概念是 "vision-language adapter"（后接式）。
- **任意分辨率（native resolution）**：图片不被强制 resize 到固定大小，patch 数量随图大小变化。
- **2D RoPE（旋转位置编码）**：原版 RoPE 是 1D 序列上的相对位置编码；2D RoPE 把它扩展到图像的行列两个方向，让 patch 位置感知不依赖固定网格。
- **Visual token**：图像经 ViT 编码后产出的向量序列，每个向量代表一个 patch，和文本 token 一样进入 transformer。
- **Apache-2.0 协议**：开源协议，允许商用、修改、再分发，不强制开源衍生品。对工业界友好。
- **MM-MT-Bench**：Pixtral 论文提出的多轮多模态对话评测集，用 LLM 当 judge 打分。

## 它和其他论文什么关系

- **对 LLaVA**：LLaVA 是"借眼镜路线"的代表，Pixtral 是"原生眼睛路线"的代表。LLaVA 便宜、复现门槛低；Pixtral 重训了 ViT，门槛更高但天花板也更高。
- **对 Qwen2-VL**：思路接近（原生分辨率、统一 transformer），是同期最直接的对标对象。两者在不同 benchmark 上各有胜负。
- **对 Flamingo**：Flamingo 用 cross-attention 隔离视觉和语言；Pixtral 走 decoder-only 统一序列路线，是 2023-2024 年的主流转向。
- **对 Llama 3.2 Vision**：Meta 的开源 VLM，思路偏"后接式"（视觉 adapter + 语言 backbone），与 Pixtral 的"原生"路线形成对比。
- **对 GPT-4V**：闭源 SOTA 的参考线。Pixtral 的目标不是超过 GPT-4V，而是让开源社区在 12B 档位有一个"够用"的选择。

## 我建议这样读 — 3-4 步

1. **先看第 1-2 章**：弄清"原生多模态"和"任意分辨率"具体指什么，它们解决了之前路线的什么痛点。
2. **看视觉编码器章节**：重点是 2D RoPE 和变长 patch 序列的设计，这是技术核心。
3. **跳到实验对比表**：直接看它和 Qwen2-VL、LLaVA-OneVision 的具体分数差距，建立"12B 开源 VLM 大概是什么水平"的体感。
4. **可选：读 MM-MT-Bench 设计**：如果关心评测方法本身，这部分有方法论价值。

## 为什么值得读

三个理由：

1. **开源 VLM 的工业级参考**：Apache-2.0、12B、效果接近闭源中档位，是当下做 VLM 产品的合理起点。
2. **"原生多模态"的样板**：从 ViT 开始重训，而不是粘 CLIP，是 2024 年 VLM 工程范式的代表。读它能理解为什么后来很多模型（Qwen2-VL、Llama 3.2 Vision 的争论）都绕这个轴转。
3. **任意分辨率的工程意义**：对文档理解、UI 截图、机器人视觉等"图不是 224x224"的真实场景，原生分辨率不是锦上添花而是基础设施。
