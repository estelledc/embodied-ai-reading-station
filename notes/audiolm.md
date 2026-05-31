---
title: "AudioLM"
slug: audiolm
topic: auditory
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2209.03143"
venue: TASLP
year: 2023
era: classic
num: 16
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

AudioLM 把音频生成当作"语言模型"任务来做：先用两层不同抽象级别的离散 token（一层管语义，一层管音色细节）把任意音频切成"音频字符"，然后训练一个 Transformer 像写句子一样自回归地"写"出新音频。给它几秒提示，它能续写出在说话人音色、语调、内容连贯性上都自然的语音或钢琴片段，全程不需要文本标注。

## 这是个什么场景 — 日常类比

想象你在听一段录音，前 3 秒是某个人说"今天天气真不错"，然后录音突然断了。你能不能让机器自动接下去说后半句，并且：

- 听上去还是同一个人的声音
- 语调连贯，不是机械人腔
- 说的内容在语义上也合理（不会突然蹦出"香蕉去火星"）

之前做这件事一般要先把音频转成文字（ASR），再用文本语言模型续写文字，最后用 TTS 合成回声音。中间走了一圈"音频 → 文字 → 文字 → 音频"，丢掉了很多东西：说话人音色、笑声、犹豫、呼吸、环境噪音、音乐细节。

AudioLM 想跳过文字这个中介，直接让模型在"音频空间"里学习长程依赖，就像 GPT 在文字空间里那样。类比的话——**之前是把录音翻译成乐谱再让模型续写乐谱再演奏，AudioLM 是直接让模型学着哼下去**。

## 之前的人怎么做的 — 3-5 bullet

- **WaveNet / SampleRNN**：直接在原始波形（每秒 1.6 万个样本点）上做自回归。问题：上下文太短，模型只能记得几十毫秒，没法保持几秒级别的连贯性。
- **Tacotron / FastSpeech 等 TTS**：质量不错，但严重依赖文本输入和大量配对数据，不能"无文本"地建模一段录音的延续。
- **VQ-VAE + 自回归先验（Jukebox 这条线）**：用离散 token 压缩音频，再用 Transformer 建模。方向对，但单层 token 很难同时兼顾"语义连贯"和"音色细节"——压得太狠丢音质，留得太多丢长程结构。
- **SoundStream / EnCodec 等神经音频编解码器**：把音频压成低比特率的离散码，重建质量很高，但当时主要用于压缩，没和大模型生成直接结合。
- **wav2vec 2.0 / w2v-BERT 等自监督语音表征**：擅长抽取"说了什么"的语义信息，但目标是判别（识别/分类），不是生成。

AudioLM 的关键观察：**这些工作要么擅长语义、要么擅长音质，没人把两者拼起来用作生成**。

## 这篇论文的关键想法

核心想法可以拆成两句话：

1. **"音频也是一门语言"**：只要把音频切成离散 token，自回归 Transformer 那一套（next-token prediction、长上下文、scale law）就能直接搬过来。
2. **"语义和音色要分两层 token"**：单一 token 流既装不下"说了什么"又装不下"听上去像谁"。AudioLM 用两类 token 分工——
   - **Semantic tokens（语义 token）**：来自 w2v-BERT，码率低、变化慢，捕捉语言学层面的内容（发音、词汇、句法、长程一致性）。
   - **Acoustic tokens（声学 token）**：来自 SoundStream 这种神经编解码器，码率高、变化快，保留音色、韵律、录音环境等细节。

生成时不一锅烩，而是分阶段：先让模型基于提示生成一串 semantic tokens（保证"说什么"长程连贯），再以这串 semantic tokens 为条件生成 acoustic tokens（把"说什么"渲染成"怎么发声"）。这样长程结构由便宜的 semantic 流负责，音质细节由 acoustic 流负责，互不抢戏。

## 它怎么做的（方法）— 3-4 段

**第一步：把音频变成两套 token**。给一段原始波形，分别走两条通道。一条进 w2v-BERT（一个语音自监督模型），抽中间层向量再用 k-means 聚类成离散 ID，得到 semantic tokens，码率大概几十 Hz 量级。另一条进 SoundStream（一个 RVQ 神经音频编解码器），输出多层 acoustic tokens（每个时间步有多个 codebook ID 叠加表达细节），码率比 semantic 高一个数量级。具体码率和层数需读原文。

**第二步：分阶段自回归建模**。AudioLM 训三个 Transformer（或一个共享但分阶段调用的 decoder），按顺序工作：

- **Semantic modeling**：在 semantic token 序列上做 next-token prediction，学"内容怎么往下走"。
- **Coarse acoustic modeling**：以全部 semantic tokens 为条件，预测 acoustic 中"粗粒度"那几层 codebook（管整体音色、说话人、韵律）。
- **Fine acoustic modeling**：以 semantic + 粗 acoustic 为条件，补出"细粒度"那几层 codebook（管高频细节、清晰度）。

为什么要这样切？因为如果一上来就让模型同时预测所有 acoustic 层，序列会非常长（每秒几百到上千 token），算力吃不消，而且语义级长程信号会被淹没。分阶段相当于先画轮廓再上色，每一阶段只解决一类问题。

**第三步：推理时给个提示就续写**。比如给 3 秒钢琴片段，先编码出 semantic + acoustic token 的前缀，然后让模型从 semantic 阶段开始续写 token 流，逐阶段生成完所有 acoustic tokens 后用 SoundStream 解码器还原回波形。整个过程不依赖任何文本标签，纯无监督。

**第四步：训练数据**。语音用大规模英文朗读 / 对话数据，钢琴用 YouTube 钢琴片段集。具体数据量需读原文。模型规模大概是中等 Transformer（几亿参数级别），不是 LLM 那种百亿规模——这也是它能在 2022-2023 年硬件上跑起来的关键。

## 实验在做什么

论文从两个域验证"音频语言建模"思路：

- **语音续写（speech continuation）**：给 3 秒提示，让模型续生成数秒。评估三件事：(a) **语义连贯性** —— 续写内容像不像同一个人在自然说话；(b) **说话人一致性** —— 续写的音色和提示是不是同一个人，用说话人识别模型打分；(c) **音质** —— 主观打分（MOS）和客观指标。论文报告 AudioLM 在这三项上都显著好于纯 acoustic-only 基线，证明 semantic token 那一层确实在帮长程结构。
- **钢琴续写**：换一个完全不同的领域（音乐而不是语音），验证方法是不是通用。给一段钢琴提示，续生成的旋律在节奏和调性上保持一致。这一组实验的意义是说明 AudioLM 不靠"语音先验"，而是真的在做通用音频建模。
- **消融**：去掉 semantic token 那一层会怎样？答案是长程结构崩坏，说话人音色还行但说的内容变得颠三倒四。这个对照很关键，直接支撑了"两层 token 各司其职"的核心 claim。

具体数字（MOS、说话人一致率、SI-SNR 等）需读原文。

## 你应该懂的几个新词 — 4-6 个

- **离散音频 token（discrete audio tokens）**：把连续波形量化成有限词表里的整数 ID，类比汉字之于汉语。一旦音频被 tokenize，所有 NLP 大模型那套技术（Transformer、causal mask、KV cache）就能照搬。
- **RVQ（Residual Vector Quantization，残差向量量化）**：SoundStream / EnCodec 用的核心技巧。一层 codebook 量化完，把残差再交给下一层 codebook 量化，叠几层就能用很小的码率达到很好的重建。每个时间步因此有多个 token 而不是一个。
- **Semantic token vs Acoustic token**：前者来自语音自监督模型的中层表征聚类，慢变、低码率、装"说什么"；后者来自神经编解码器，快变、高码率、装"怎么响"。这是 AudioLM 的灵魂。
- **w2v-BERT**：语音版的 BERT，结合对比学习和掩码预测在大规模无标注语音上训练，中间层向量被广泛认为携带语言学语义。
- **自回归生成（autoregressive generation）**：模型按顺序一个 token 一个 token 地预测，每次条件化在已生成的所有前文上。GPT 文本续写、AudioLM 音频续写本质同源。
- **MOS（Mean Opinion Score）**：让一群人主观打分（通常 1-5）取平均，是音频/语音质量评估的金标准之一，缺点是贵且不能完全自动化。

## 它和其他论文什么关系

- **上游**：站在 w2v-BERT（语义表征）和 SoundStream（声学 token）的肩膀上，自己不重新发明 tokenizer。这种"模块组合"风格在 2022-2023 年的多模态生成里很常见。
- **横向同期**：和 Jukebox（OpenAI，2020）共享"VQ + 自回归 Transformer 生成音频"的大方向，但 Jukebox 是单流多分辨率层级，AudioLM 明确分语义/声学两类语义不同的 token。AudioGen（Meta，2022）走的是文本 → 音效，依赖文本条件；AudioLM 强调无文本。
- **下游**：直接催生了 SoundStorm（同组并行解码加速）、MusicLM（同思路做文本到音乐）、VALL-E（微软，把这套用于零样本 TTS，把 AudioLM 的 acoustic 阶段改成文本+音色提示条件生成）。可以说 AudioLM 是 2023 年那一波"音频也是 LLM"浪潮的起点。
- **对比 TTS 经典系**：Tacotron / FastSpeech 需要文本对，AudioLM 不需要；后续 VALL-E / NaturalSpeech 2 等再把文本条件加回来，但骨架仍是 AudioLM 的两层 token 思想。

## 我建议这样读 — 3-4 步

1. **第一遍只看 Figure 1 + Section 3**：搞清楚两类 token 是怎么定义的、三阶段建模的输入输出分别是什么。这是骨架，理解它后面全是细节。
2. **第二遍读 Section 4（实验）和音频 demo**：论文官网有大量音频样例，**一定要去听**——读多少描述都不如听 10 秒"去掉 semantic token 后会怎样"的对比来得直观。
3. **第三遍研究 tokenizer 细节**：w2v-BERT 是哪一层、k 取多少、SoundStream 多少层 RVQ、码率配比。这些参数选择决定了能不能跑起来，也是后续工作（VALL-E、MusicLM）改动最多的地方。
4. **可选第四步**：跟着读 SoundStorm 和 VALL-E，看 AudioLM 这套架构如何被加速（并行解码替代自回归）和被特化（加文本条件做 zero-shot TTS），形成完整脉络。

## 为什么值得读

AudioLM 的价值不在某个特定 SOTA 数字，而在它把一种"思考方式"立住了：**音频生成 = tokenize + 自回归语言建模 + 语义/声学分层**。这套思路之后被反复复用——MusicLM 拿去做文本到音乐，VALL-E 拿去做零样本 TTS，SoundStorm 拿去做加速，再之后多模态 LLM（Gemini、GPT-4o 的语音侧）也都能看到它的影子。

对零基础学习者来说，读 AudioLM 还有两个隐藏收益：

- 它是理解"为什么 LLM 范式能跨模态扩张"的一个非常干净的样本——比图文多模态简单，因为输入输出都是一维序列；
- 它清晰展示了"分层抽象"在工程里怎么落地：当一个目标既要管全局结构又要管局部细节时，硬塞进一个 token 流通常崩，分两层各司其职往往就通了。这个直觉在很多别的领域（视频生成、机器人动作生成）也能复用。

如果你只读 5 篇 2023 年的音频/语音论文，AudioLM 应该是其中一篇。
