---
title: "Improved Baselines with Visual Instruction Tuning"
slug: llava-1-5
topic: vlm-foundation
difficulty: ⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2310.03744"
venue: CVPR
year: 2024
era: classic
num: 133
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

LLaVA-1.5 是初代 LLaVA 的"小修小补"升级版：把视觉特征到语言模型之间的连接层从一层线性投影换成两层 MLP（多层感知机），训练数据里多塞了一些 OCR（光学字符识别）和学术 VQA（视觉问答）数据集，没动主干结构、没引入新损失，就把多个 VQA 榜单刷到了开源 SOTA（state of the art，当下最好成绩），从此成为开源 VLM（视觉语言模型）社区最常被复现、二开、对比的 baseline。

## 这是个什么场景 — 日常类比

想象你要把一只懂中文的鹦鹉教会"看图说话"。鹦鹉本来只会听文字，你给它配了一双"翻译眼镜"——眼镜把图像翻译成它能听懂的"文字描述"，鹦鹉再开口回答。

初代 LLaVA 的眼镜很简陋：一块单层薄镜片（线性投影）。LLaVA-1.5 做的事相当于：把镜片升级成两层（MLP），再让鹦鹉额外背了一些"包含中英文招牌、表格、考试题"的图片素材。鹦鹉本身没变，眼镜变清楚了、教材更全了，整体就答得更准了。

这是 2023 年下半年开源 VLM 的典型故事：少改架构、多调数据，效果反而最好。

## 之前的人怎么做的 — 3-5 bullet

- **初代 LLaVA**（2023 年 4 月）：CLIP（对比语言-图像预训练）的视觉编码器 + 单层线性投影 + Vicuna 语言模型，用 GPT-4 自动生成的多模态指令数据训练；能聊天但 VQA 榜单分数不高
- **MiniGPT-4 / mPLUG-Owl**：思路类似，用 Q-Former 或单层投影把视觉 token 接到 LLM 上，注重对话流畅
- **BLIP-2**：用 Q-Former 这种"压缩 + 查询"的桥接方式，参数效率高但训练复杂
- **InstructBLIP**：在 BLIP-2 基础上加 instruction tuning，VQA 强但开源生态不如 LLaVA
- **共同短板**：要么对话强但答 VQA 不准，要么 VQA 准但配方复杂、不好复现；学术 VQA / OCR 任务普遍弱

## 这篇论文的关键想法

一句话：**简单配方 + 对的数据，能打过复杂结构**。

具体两个赌注：

1. **桥接层不需要花哨**：把单层线性投影换成两层 MLP（中间加一个非线性激活），表达能力够用，参数量增加可忽略
2. **数据是真正的瓶颈**：把 OCR 类（OCR-VQA、TextCaps）和学术 VQA 类（A-OKVQA、OKVQA）数据加进 instruction tuning 阶段，模型在对应榜单立刻补齐短板

底层信仰：在视觉编码器（CLIP-ViT）和 LLM（Vicuna）都已经很强的前提下，中间桥不必复杂；VLM 的天花板更多由"训练数据覆盖了哪些任务"决定。

## 它怎么做的（方法）— 3-4 段

**架构**：CLIP-ViT-L/336px（输入分辨率 336×336 的 ViT-Large）→ 两层 MLP 投影 → Vicuna-13B（基于 LLaMA 微调的对话模型）。视觉编码器输出的 patch token 经过 MLP 投影后，被当作"软 token"拼接到文本 token 序列前面，整段一起喂给 LLM 自回归预测下一个 token。

**两阶段训练**：
- 阶段 1（特征对齐）：冻住视觉编码器和 LLM，只训 MLP 投影层，用图像-文本配对数据让投影学会把视觉特征映射到 LLM 的词嵌入空间
- 阶段 2（visual instruction tuning，视觉指令微调）：解冻 LLM 一起训练，喂多任务混合的指令数据；这一步是分数提升的关键

**数据配方**：在初代 LLaVA 的 LLaVA-Instruct-150K（GPT-4 自动构造的多模态对话指令）基础上，混入：
- VQAv2 / GQA（通用 VQA）
- OCR-VQA / TextCaps（文字识别相关）
- A-OKVQA / OKVQA（需常识推理的 VQA）
- 学术 VQA 数据集若干

具体配比和 epoch 数需读原文。

**轻量化**：分辨率提到 336×336（比初代的 224×224 更清晰）；输入 prompt 加上"用一个词或短语回答"这类 response format prompt，让模型在 VQA 短答场景不啰嗦。整套配方训练成本约 1 天 8×A100，比 InstructBLIP 等复杂配方便宜很多。

## 实验在做什么

主要在 12 个左右的多模态 benchmark 上对比：

- **学术 VQA**：VQAv2 / GQA / VizWiz / ScienceQA-IMG / TextVQA — 测"看图答事实问题"
- **多模态对话 / 综合**：MME / MMBench / SEED-Bench / LLaVA-Bench-Wild — 测综合理解和指令跟随
- **OCR 相关**：TextVQA / OCR-VQA — 测读图中文字的能力
- **POPE**：测幻觉（hallucination，模型胡编不存在的物体）

核心结论：在多个榜单上超越同期开源 VLM（含 InstructBLIP、Qwen-VL 早期版等），并在部分 benchmark 接近或超过闭源 GPT-4V 当时的水平。具体数字需读原文。

值得注意的消融：
- 单层投影 → 两层 MLP，分数稳定提升
- 加入学术 VQA 数据，对应任务分数大幅上升，但通用对话能力没退化
- 提分辨率 224 → 336，OCR / 细节任务受益最明显

## 你应该懂的几个新词 — 4-6 个

- **Visual Instruction Tuning（视觉指令微调）**：把"图像 + 任务指令 + 答案"的三元组组织成监督数据，让 VLM 学会按指令完成多样任务，而不只是图像描述
- **MLP（Multi-Layer Perceptron，多层感知机）**：最基础的神经网络结构，多层全连接 + 非线性激活；这里特指视觉特征到 LLM 嵌入空间的两层桥接
- **Projector / Connector（投影层 / 连接器）**：视觉编码器输出和 LLM 输入之间的桥接模块，负责把视觉 token 映射到 LLM 能"听懂"的向量空间；LLaVA 系列的 projector 极简，是其特色
- **VQA（Visual Question Answering，视觉问答）**：给一张图和一个自然语言问题，模型用文字回答；学术上分通用 VQA、OCR-VQA、知识 VQA 等
- **Response Format Prompt**：在 prompt 末尾加一句格式约束（如"用一个词回答"），让模型在不同 benchmark 输出对的格式；LLaVA-1.5 用这招避免在短答 VQA 上输出长句被判错
- **POPE（Polling-based Object Probing Evaluation）**：一种测多模态幻觉的标准化评测，问模型"图里有没有 X"，统计假阳性率

## 它和其他论文什么关系

- **上游基础**：CLIP（视觉编码器）+ LLaMA / Vicuna（语言模型）；初代 LLaVA（visual instruction tuning 的开创工作）
- **同期对比**：InstructBLIP（更复杂的 Q-Former 配方）/ Qwen-VL（阿里同期开源 VLM，用 cross-attention 桥接）/ MiniGPT-4
- **下游影响**：成为开源 VLM 的事实标准 baseline，几乎所有后续工作都会在 LLaVA-1.5 上对比；衍生出 LLaVA-NeXT（1.6）、LLaVA-OneVision、ShareGPT4V、VILA 等一系列工作
- **机器人 / 具身方向**：LLaVA 系列的简单架构和开源权重，让它常被当作具身 VLM（如 RoboFlamingo、OpenVLA 早期对比）的视觉理解 backbone

在你的笔记体系里：
- 上一篇 [llava](llava.md)（初代）→ 本篇 → 下一篇可看 [qwen-vl](qwen-vl.md)（同期不同流派）
- 视觉骨干理解可回 [clip](clip.md) / [siglip](siglip.md)
- 想看 VLM 在机器人里怎么用 → [openvla](openvla.md) / [rt-2](rt-2.md)

## 我建议这样读 — 3-4 步

1. **先扫摘要 + 表 1**（大表）：直接看 LLaVA-1.5 在哪些 benchmark 上提升最大，建立"它到底强在哪"的直觉
2. **读方法节的两个改动**：MLP projector 一段 + 数据配方一段，重点看为什么两层 MLP 够、为什么这几类数据有效
3. **看消融实验**：分辨率、projector、数据三项消融分别贡献了多少分；这是作者给的"配方解构"，对你做后续 baseline 改造最有用
4. **跳读对话样例**：附录里的 demo case 看几个，体会一下 OCR / 推理 / 描述各场景的输出风格

不建议第一次就钻训练超参细节，那部分对理解贡献不大。

## 为什么值得读

- **开源 VLM 的"标准件"**：你做 VLM 相关任何研究 / 项目，几乎都会先在 LLaVA-1.5 上跑通再说，先理解它的配方等于理解整个生态的起点
- **"少即是多"的代表作**：在大家堆复杂结构的 2023 年，它用最简单的 MLP + 加数据打赢，提醒你架构不是一切
- **可复现性**：训练成本、数据、代码、权重全公开，是第一个让普通研究者真能在 8×A100 一天复现的 VLM
- **后续工作的对比锚**：读 LLaVA-NeXT、Qwen-VL-2、InternVL 等任何后续 VLM 论文，都会反复出现 "vs LLaVA-1.5"，理解它能让你看懂 90% 的 VLM 论文比较表
