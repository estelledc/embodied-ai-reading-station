---
title: "MusicLM"
slug: musiclm
topic: auditory
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2301.11325"
venue: arXiv
year: 2023
era: classic
num: 21
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

MusicLM 把"文本生成音乐"做成一个**层级 seq2seq token 建模**问题：先把音频压成离散 token，再用语言模型按"语义层 → 声学层"的顺序，把一句文字 prompt（比如"一段缓慢的爵士钢琴 + 鼓刷"）一步步翻译成几分钟连贯、保真的音乐波形。

## 这是个什么场景 — 日常类比

把它想象成"用嘴点菜，让一个会做菜的厨师从无到有炒一盘菜"：

- 你说一句话："我要一首带电吉他 solo、节奏快、像 80 年代 rock 的歌"
- 模型不能直接画出每一帧的波形（太密、太长、太难学），所以它分两步：
  1. 先决定"这首歌大致是什么风格 / 情绪 / 乐器布局"——像厨师先想好"川菜，麻辣，主菜是鸡"（语义层 token）
  2. 再决定"每一秒到底听起来什么样"——像厨师真的开始切菜、下油、控火（声学层 token）
- 最后把声学 token 解码回波形（让你真听到声音）

类比的关键：**先搭骨架再贴皮**。直接预测每一个采样点的波形等于让厨师每秒决定一次"下一粒盐放在哪里"，没人能做到。

## 之前的人怎么做的 — 3-5 bullet

- **MIDI / 符号音乐生成**（Music Transformer 等）：在乐谱级别做 token 建模，能生成结构，但只能生成"谱"，不能直接出音色丰富的真实录音
- **WaveNet / SampleRNN**：直接预测波形采样点，音质 OK 但极慢、生成长度受限，且很难"按文字指挥"
- **Jukebox（OpenAI 2020）**：层级 VQ-VAE + Transformer，能生成几十秒带歌声的音乐，但慢且文本控制粒度粗（艺术家 / 流派 tag）
- **AudioLM（Google 2022）**：MusicLM 的直接前身——把语音生成做成"语义 token + 声学 token"两层语言模型，但只做语音
- **Riffusion / MuBERT 等**：用图像扩散或拼接合成音乐，要么不连贯要么不自由

MusicLM 的位置：把 AudioLM 的"层级 token LM"思路 + MuLan 的"文本-音乐对齐"嫁接起来，第一次实现"自由文本 → 长时连贯高质量音乐"。

## 这篇论文的关键想法

**核心一句话**：把"文本到音乐"重新定义成"在层级离散 token 空间里做条件语言建模"，每一层 token 各司其职。

三个关键思想：

1. **三套 token 解耦**
   - **语义 token**（来自 w2v-BERT）：管"这是什么音乐、什么走向"，码本小、序列稀疏
   - **声学 token**（来自 SoundStream，残差 VQ）：管"听起来什么样"，码本大、序列密
   - **MuLan 文本-音乐 embedding**：管"文字 prompt 怎么对齐到音乐空间"
2. **层级条件**：先用 MuLan embedding 条件生成语义 token，再以语义 token 为条件生成声学 token，最后 SoundStream 解码回 24kHz 波形
3. **训练时不需要"文本-音乐配对"**：MuLan 只需要音乐 + 噪声标签（视频标题 / 描述）就能学到联合 embedding；推理时把文本 prompt 也压成 MuLan embedding 即可——这绕开了"高质量配对数据稀缺"这个老大难

## 它怎么做的（方法）— 3-4 段

**第一段：把音频拆成两套 token。** 一首音乐先过两个独立的编码器：SoundStream（神经音频编解码器，用残差 VQ 把每秒音频压成几百个离散 token，能高保真重建）和 w2v-BERT（自监督音频表示模型，取中间层做 k-means 聚类得到语义 token，码本远小于声学 token）。同一段音频于是有两套时间对齐的 token 流：声学流密集、信息量大；语义流稀疏、抽象。

**第二段：用 MuLan 把文本和音乐塞进同一个空间。** MuLan 是一个对比学习模型，把音频片段和它的描述文字（弱监督，比如视频标题 tag）拉近、不相关的推开。训练完之后，"一段爵士钢琴的音频" 和 "jazz piano with brush drums" 这句话在 MuLan 空间里距离很近。MusicLM 训练时只用音频侧的 MuLan embedding 当条件（不需要文本配对），推理时换成文本侧的 MuLan embedding——同一个空间，模型分不出来。

**第三段：层级语言模型生成 token。** 训练两个（或更多）自回归 Transformer：
- 语义 stage：以 MuLan embedding 为条件，生成语义 token 序列（决定结构 / 风格 / 走向）
- 声学 stage：以 MuLan embedding + 语义 token 为条件，生成声学 token 序列（决定音色 / 细节）

声学 stage 内部还会再分 coarse / fine 两步，因为残差 VQ 的不同层 codebook 对应不同精度的细节，分开建模更稳定。具体层数和参数需读原文。

**第四段：解码与延展。** 把生成出的声学 token 喂给 SoundStream 解码器，直接出 24kHz 波形。论文展示能稳定生成几分钟级别的连贯音乐，并且支持"故事化 prompt"（一段一段描述，模型按时间顺序拼接）和"用一段哼唱 + 文本"做 melody-conditioned 生成。

## 实验在做什么

- **数据**：约 28 万小时音乐音频做训练（具体数字需读原文）
- **客观指标**：FAD（Fréchet Audio Distance，越低越像真实音乐）、KLD（与文本类别分布的一致性）、MuLan cycle consistency（生成回去再算 MuLan 距离）
- **主观评测**：人类评分员对比 MusicLM vs Riffusion vs Mubert vs MusicLM 消融，从"音质"和"文本一致性"两个维度打分
- **新基准 MusicCaps**：作者放出 5500 条由音乐家手工写描述的高质量 caption-音乐配对，用于评估文本到音乐生成；这个 benchmark 后来被几乎所有同类工作沿用
- **消融**：对比"无 MuLan / 无语义 token / 单层 LM"等变体，验证层级结构和 MuLan 条件的必要性

## 你应该懂的几个新词 — 4-6 个

- **残差 VQ（Residual Vector Quantization, RVQ）**：把一个向量量化成"主码 + 残差码 + 残差的残差码……"多层离散码，越深越细。SoundStream 用它做高码率音频压缩
- **SoundStream**：Google 的神经音频 codec，端到端学一个"编码 → RVQ → 解码"的网络，能在低比特率下保真重建语音和音乐；MusicLM 拿它当声学 token 的来源和最终解码器
- **w2v-BERT**：自监督音频模型，把音频映射成连续表示；MusicLM 在它中间层做 k-means 得到离散语义 token
- **MuLan**：Music + Language 的对比学习模型，类似音乐版 CLIP；不需要严格配对，能从弱监督文本（视频 tag、描述）里学
- **AudioLM**：MusicLM 的方法骨架来源，把"语音生成"做成"语义 token LM + 声学 token LM"两阶段；MusicLM 把它扩展到音乐并加上文本条件
- **FAD（Fréchet Audio Distance）**：音频领域的 FID，用预训练音频分类网络的特征算两个分布之间的 Fréchet 距离，评估生成质量

## 它和其他论文什么关系

- **直接前身：AudioLM（语音）+ MuLan（音乐-文本对齐）+ SoundStream（音频 codec）**——MusicLM 是这三个 Google 工作合体的产物
- **同期对手 / 后继**：
  - **MusicGen（Meta, 2023）**：用单个 LM 直接预测多层 RVQ token，简化了层级；之后成了开源主流
  - **Stable Audio / AudioLDM 系列**：转向 latent diffusion 路线，与 token LM 分庭抗礼
  - **Jukebox**：早 3 年的层级 VQ-VAE 思路，MusicLM 在长度 / 文本可控性上明显超越
- **跨模态思路上的近亲**：和 VALL-E（语音）、AudioLM（语音）、VideoPoet（视频）共享"把信号压成离散 token + 大模型自回归"这一通用范式
- **对 embodied / 听觉感知**的意义：本身是生成式工作，但里面用到的 SoundStream + 语义/声学层级表示，和音频感知（声源分离、声场理解）共用同一套表示层，值得作为"音频离散表示"的代表案例读

## 我建议这样读 — 3-4 步

1. **先看 demo 页**：Google 官方 demo（搜 "MusicLM samples"）里有几十段 prompt → 音乐对照，先用耳朵建立直觉，再读论文不会发懵
2. **再读 AudioLM 论文（必看前置）**：MusicLM 的方法基本是 AudioLM 的音乐版，AudioLM 本身写得更清楚，先理解"语义 token + 声学 token 两阶段 LM"
3. **跳读 MusicLM 正文**：方法图（Figure 2 或类似的层级图）+ 实验主表 + MusicCaps 那一节是必读，模型超参可以略
4. **可选延伸**：读 SoundStream 弄懂 RVQ；读 MuLan 弄懂"无配对学到 joint embedding"；读 MusicGen 看后人怎么简化它

## 为什么值得读

- **范式标杆**：第一篇把"自由文本 → 长时连贯高质量音乐"做通的工作，定义了之后两年音乐生成的研究框架
- **离散音频 token 的代表作**：理解了 MusicLM，AudioLM / MusicGen / VALL-E / VideoPoet 这一整条"信号离散化 + 大模型"路线就都通了
- **MusicCaps benchmark**：自己放出的评测集后来成了行业标准，读原文能搞清这个 benchmark 怎么设计、有什么 bias
- **方法论启发**：MuLan 那一招"用弱监督文本 + 共享 embedding 空间绕开配对数据稀缺"，在很多模态都能复用——这是比模型本身更值得带走的洞察
- **听觉方向必读**：哪怕你做感知不做生成，这篇里 SoundStream / w2v-BERT / RVQ 是音频表示的"标配组件"，不读迟早要回来补
