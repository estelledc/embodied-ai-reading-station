---
title: "LLaVA: Visual Instruction Tuning"
slug: llava
topic: 一. VLM 基座
difficulty: ⭐⭐
status: auto-summary
来源: papers/llava/paper.pdf
generated_at: 2026-05-30
---

# LLaVA: Visual Instruction Tuning

> 这是机器辅助生成的客观摘要笔记。教学版精读笔记由用户按节奏触发后单独成稿。

## 一句话讲什么（TL;DR）
把"看图+按指令回答"做成端到端模型：用 GPT-4 自动造图文指令数据，再训一个能看图聊天的多模态助手。

## 这篇论文要解决什么问题（Why this paper）
现实里我们希望 AI 助手既能看图、又能按人话办事——比如你拍张冰箱照片问"还有草莓酸奶吗"，它该真的看图回答。但当时的麻烦是：

- 视觉模型（CLIP、检测器、分割器）虽强，但每个都只解决一个固定任务，**接口僵硬**——你不能用自然语言切换它的"工作模式"。
- 大语言模型（LLM）能听懂人话，但**眼盲**——只能处理文字。
- 已有的多模态模型（BLIP-2、Flamingo）虽然能"看图说话"，但**没专门用图文指令数据训过**，所以一让它"按指令回答"就退化成"描述图片"。
- 关键缺口：**没有大规模的"看图+指令+回答"三元组数据**，因为人工标注又贵又难定义。

LLaVA 就是要补上这块：用纯文本 GPT-4 当"老师"自动造数据，把视觉编码器和 LLM 拼起来端到端微调。

## 用了什么方法（How）

- **GPT-4 当数据厨子（symbolic data generation）** → 类比"把照片翻译成菜谱再让大厨重新创作"：把图片用 caption（场景描述）+ bounding box（物体框坐标）转成纯文字"骨架"喂给纯文本 GPT-4，让它生成三种数据——日常对话、详细描述、复杂推理。共 158K 条。解决了"没有图文指令数据"的问题。
- **极简架构：CLIP + 线性投影 + Vicuna** → 类比"翻译插头"：CLIP ViT-L/14 编码图片得到视觉特征 Z_v，过一个**单层线性矩阵 W** 投影成"伪词向量" H_v，直接拼到 Vicuna 的输入序列里。比 Flamingo 的 cross-attention、BLIP-2 的 Q-Former 都简单，方便快速迭代数据实验。
- **两阶段训练**：阶段一（特征对齐预训练）→ 类比"先让翻译插头学会基本词汇对应"：冻结 CLIP 和 LLM，只训 W，用 595K CC3M 图文对当单轮对话练。阶段二（端到端指令微调）→ 类比"再让整个团队配合演练"：解冻 LLM，用 158K 指令数据继续训 W 和 LLM，CLIP 始终冻结。
- **GPT-4 当裁判评测** → 类比"让另一位老师批卷"：拿同一道题让 LLaVA 和纯文本 GPT-4（看 ground truth caption）各答一遍，再让第三个 GPT-4 打分。这是后来 multimodal benchmark 的常见做法。

![Architecture](../papers/llava/images/img_031.jpg)

## 关键实验结果（What works）

- **LLaVA-Bench (In-the-Wild) 总分 67.3%**，比 BLIP-2 高 29 个点、比 OpenFlamingo 高 48 个点——同等规模下指令跟随能力大幅领先。
- **复杂推理子项 81.7%**（相对纯文本 GPT-4）——证明指令微调过的 LLaVA 在推理上几乎追平能看 ground truth 的 GPT-4。
- **ScienceQA 92.53%**（LLaVA + GPT-4 ensemble）——当年 SOTA，纯 LLaVA 单模型也有 90.92%，逼近此前 SOTA MM-CoT_Large 的 91.68%。
- **消融**：跳过预训练直接训 ScienceQA 掉 5.11 个点（85.81% vs 90.92%）；7B 比 13B 掉 1.08 点——说明 alignment 阶段和模型规模都重要。

## 我读完后该懂的几个术语

- **Visual Instruction Tuning（视觉指令微调）**：在"图+指令"配对的数据上微调，让模型学会按人话办事而不是只描述图片。类比"教学徒不只是认菜，还得听懂'帮我把这道菜咸度调低'"。
- **CLIP ViT-L/14**：OpenAI 的视觉编码器，把图切成 14×14 的 patch，输出每块的特征向量。类比"把照片切成马赛克小格子，每格生成一个 DNA 序列"。
- **Projection Matrix W（投影矩阵）**：把视觉特征维度映射到 LLM 词向量维度的一层线性层。类比"USB 转 Type-C 的转接头"——LLaVA 早期版本就这么简单。
- **Vicuna**：基于 LLaMA、用 ShareGPT 对话数据微调的开源 LLM，本论文的语言主干。类比"已经会聊天的兄长"。
- **LMM (Large Multimodal Model)**：大型多模态模型，跟 LLM 一字之差但多了视觉。这篇论文是这个词流行的起点之一。
- **In-context Learning Seed Examples（上下文示例种子）**：人工写几条样例放进 GPT-4 的 prompt，让它照葫芦画瓢生成更多。类比"先给厨师看两道范例菜，他就懂套路了"。

## 这篇论文的局限 / 我看出的疑点

- **"图当成 patch 袋子"问题**：作者自己承认 LLaVA 把图当成无序 patch，不能精细绑定语义——文中举例：冰箱里有酸奶+草莓，问"有草莓味酸奶吗"它会错答 yes，因为它把两个 patch 合并成了一个概念。
- **分辨率与知识覆盖瓶颈**：识别拉面店招牌、酸奶品牌这类需要高分辨率 OCR + 大百科知识的题目它做不好。
- **数据由 GPT-4 自动生成**：质量上限被老师模型卡住，且会继承 GPT-4 的偏见和幻觉，缺乏严格的事实校验。
- **评测方式自我循环**：用 GPT-4 当裁判评 LLaVA 输出，可能存在系统性偏好（GPT-4 偏爱 GPT-4 风格的答案）。

## 与其他 12 篇的关联

- **范式开创**：LLaVA 的"CLIP + 投影层 + LLM"成为后续 VLM 默认范式；像 OpenVLA、π0、RT-2 这类 VLA 模型大多复用了这套视觉接入方式（投影层后来从单层 MLP 升级到 2-layer MLP，但核心思路一致）。
- **与 SayCan/PaLM-E 的对比**：LLaVA 是"看图聊天"层；SayCan 是"高层任务规划"层；PaLM-E 把两者揉在一起做 embodied reasoning。LLaVA 提供了 PaLM-E 视觉 token 化方案的简化替代。
- **数据 reformation 思路被广泛复用**：用强模型造指令数据这一招，在 RT-2、OpenVLA 的 cotraining 数据构造里也能看到影子。

## 为什么值得读 / 不值得读

VLM/VLA 入门必读。架构极简、训练流程清晰、消融实验充分，是理解"为什么现代多模态助手都长一个样"的最佳起点；如果你只看一篇 VLM 论文，就读它。
