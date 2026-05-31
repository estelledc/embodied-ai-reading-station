---
title: "AudioPaLM"
slug: audiopalm
topic: multimodal
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2306.12925"
venue: arXiv
year: 2023
era: classic
num: 67
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

AudioPaLM 把 Google 两套强模型——文本侧的 **PaLM-2**（大语言模型）和语音侧的 **AudioLM**（语音生成语言模型）——融合到**同一个 decoder-only Transformer** 里，用一个统一的 token 词表同时处理"文字 token"和"语音 token"。结果是：一个模型可以做语音识别（ASR）、语音翻译（AST）、文本翻译、甚至**保留说话人音色的语音翻译（S2ST）**，并且零样本能跨越训练里没出现过的语种对。

## 这是个什么场景 — 日常类比

想象你在用同声传译耳机。普通方案是三个流水线工人接力：

1. 一个工人专门把"声波"转成"文字"（ASR 模型）
2. 第二个工人把中文文字翻成英文文字（翻译模型）
3. 第三个工人把英文文字念出来（TTS 模型）

每个工人都是不同公司训练的，互相不认识，交接时会丢信息——比如**你原本说话的语气、停顿、声线**，到第三个工人那里就只剩冷冰冰的合成腔。

AudioPaLM 干的事是：**把这三个工人换成一个会同时读文字和听声音的全能员工**，让他在脑子里直接处理"声音输入 → 声音输出"，中间想用文字做草稿就用文字，不想用就不用。最后那一份音色信息也没在交接里丢掉。

## 之前的人怎么做的 — 3-5 bullet

- **流水线（cascade）**：ASR → MT → TTS 三段拼，工程上最成熟，但**误差累积**且丢音色 / 韵律。
- **AudioLM（2022, Google）**：纯语音侧的语言模型，把音频离散化成 semantic token + acoustic token，能做长程连贯的语音续写，但**不会文本任务**，没有"知识"。
- **PaLM / PaLM-2**：纯文本侧的超大 LLM，知识强、翻译强，但**听不见也不会说**。
- **Whisper（OpenAI 2022）**：encoder-decoder ASR/翻译统一模型，强但**只输出文字**，不能合成语音。
- **SpeechT5 / VALL-E / Translatotron** 系列：直接 speech-to-speech 的早期尝试，规模和泛化能力都受限。

核心矛盾：语音模型懂"声"不懂"知识"，文本 LLM 懂"知识"不懂"声"。

## 这篇论文的关键想法

**用一个共享词表把语音 token 和文本 token 当成同一种东西**，然后用一个 decoder-only Transformer 自回归生成。

具体三个动作：

1. **扩词表**：把 PaLM-2 原本的文本词表扩展，新增一批专门表示语音的 audio token（来自 AudioLM 那一路 semantic 量化器）。
2. **热启动**：模型权重直接从 PaLM-2 初始化，不从零训。新加进来的语音 token embedding 是新的，但 Transformer 主体已经具备语言知识。
3. **任务即提示**：不同任务（ASR / AST / S2ST / TTS）用不同的 prompt 模板表达，模型一律按"看见什么 token，预测下一个 token"的方式工作。所以训练时不需要为每个任务设计独立 head。

输出端如果要还原为可听的波形，再走 AudioLM 那套 acoustic 解码器把 token 还原成 waveform，**音色由原说话人音频条件化**——这就是它能在翻译时保留你声音的原因。

## 它怎么做的（方法）— 3-4 段

**第一步：把语音变成 token。** 沿用 AudioLM 的做法，用一个自监督模型（如 USM 或 w2v-BERT 系列）抽取语音的 semantic representation，再用 k-means 或 RVQ 量化成离散整数 ID。这一步的关键：semantic token 编码"说了什么"，而非"怎么说"，所以它和文字 token 处在同一抽象层级，方便统一建模。

**第二步：扩展 PaLM-2 的词表。** 假设 PaLM-2 原本有约 25 万个 BPE token，AudioPaLM 在末尾追加几千个 audio token 槽位（具体数字需读原文）。Embedding 矩阵和输出 softmax 矩阵都对应增大。这一步只加参数，不动原结构。

**第三步：多任务联合训练。** 训练数据混合 ASR、AST、S2ST、TTS、MT 各种 (input, output) 对，每个样本前面拼一个任务标签（比如 `[ASR English]`），模型在自回归 next-token-prediction 这一个目标下学全部任务。文本任务保持 PaLM-2 的能力不退化（避免灾难性遗忘）；语音任务从 AudioLM 借来的 token 空间天然兼容。

**第四步：声音还原。** 模型输出的若是 audio token 序列，需要通过 AudioLM 的 acoustic 解码器（SoundStream + 后续阶段）恢复成 waveform。S2ST 任务下还会把**源说话人的声学特征作为条件输入**，让翻译后的语音保留原音色。

## 实验在做什么

- **AST（语音翻译）**：CoVoST2、FLEURS 等多语种 benchmark，对比 Whisper、mSLAM 等。AudioPaLM 据报告显著领先（具体 BLEU 数字需读原文）。
- **ASR（语音识别）**：FLEURS 多语种、LibriSpeech 等。
- **S2ST（语音到语音翻译）**：在 CVSS 等数据集上做端到端语音翻译，关键看**音色保留**和翻译质量的折中。
- **零样本翻译**：训练里没出现的语种对（A→C 没见过，但 A→B 和 B→C 见过），评估能否泛化——这是它继承自大 LLM 范式的招牌能力。
- **消融**：从 PaLM-2 初始化 vs 从零训；不同规模（8B / 64B 等）的 scaling 行为。

## 你应该懂的几个新词 — 4-6 个

- **decoder-only Transformer**：只用 Transformer 解码器、自回归生成下一个 token 的架构。GPT、PaLM 都是这种。
- **audio token / semantic token**：把连续音频通过自监督模型 + 量化器变成的离散整数 ID，让"音"可以像"字"一样被语言模型处理。
- **AudioLM**：Google 2022 的纯语音 LM，分 semantic 和 acoustic 两层 token，是 AudioPaLM 的语音侧基座。
- **S2ST（speech-to-speech translation）**：直接从源语言语音输出目标语言语音，绕开中间文本（或只把文本当辅助）。
- **零样本跨语种泛化**：训练时没见过 A→C 这对，但凭"A→英文"和"英文→C"在表征空间里的对齐能力，推理时也能直接做 A→C。
- **catastrophic forgetting（灾难性遗忘）**：在新任务上微调旧模型，旧能力大幅退化。AudioPaLM 用混合数据 + 热启动来缓解。

## 它和其他论文什么关系

- **直接前身**：AudioLM（语音 LM 框架）+ PaLM-2（文本 LLM 基座）的合体。
- **同期对比**：Whisper（强 ASR/翻译，但只出文本）、VALL-E（强 zero-shot TTS，但不做翻译）、SeamlessM4T（Meta 的多模态语音翻译，端到端做 S2ST，是商业上的直接竞品）。
- **下游影响**：把"语音 = 一种特殊语言"的范式坐实，催生后续 GPT-4o / Gemini 这类**原生多模态 LLM**——不再为每个模态训独立模型。
- **embodied AI 视角**：这条线证明"用一个统一 token 词表 + 自回归 Transformer 处理多模态"是可行的。机器人领域的 RT-2、PaLM-E、OpenVLA 都是同一思路在 vision/action 上的对应物。

## 我建议这样读 — 3-4 步

1. **先读 AudioLM 论文（2022）**：搞懂 semantic token 和 acoustic token 是什么，否则 AudioPaLM 的"扩词表"听起来很玄。
2. **跳读 AudioPaLM 摘要 + 方法图**：抓住"共享词表 + 单一 decoder + 任务即 prompt"这三件事，其他细节先放。
3. **听 demo 页**：Google 官方有 demo（保留音色的中英互译那种），听一遍比读十页方法都直观。
4. **再回头看实验**：重点看零样本翻译那一节，理解为什么"统一 token"是泛化的关键。

## 为什么值得读

- **思想层面**：它是"多模态 LLM"范式落地的早期里程碑——把不同模态压到同一 token 空间这件事，从此成了主流配方（GPT-4o、Gemini 都在沿用）。
- **工程层面**：示范了**如何在已有大模型上以最小代价加新模态**——扩词表 + 热启动 + 多任务混训，几乎是后续所有"X-LLM"工作的脚手架。
- **embodied AI 关联**：你接下来要看的 RT-2 / PaLM-E / OpenVLA 把 audio token 换成 vision token 或 action token，结构几乎一模一样。先看懂 AudioPaLM，再看那几篇能省一半力气。
- **实用层面**：S2ST 保留音色这个 demo 直观震撼，方便和不懂技术的人解释"原生多模态"是什么。
