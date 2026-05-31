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

对着模型说一句"缓慢爵士钢琴配鼓刷"，它就生成几分钟真实音乐——先定骨架（结构），再填细节（音色）。

## 这是个什么场景 — 日常类比

想象你在跟一个会做菜的厨师点菜：你只说一句"我想吃一道酸甜口的、带点辣、夏天吃不腻的鸡"，厨师就得自己决定切多大块、放多少糖、几成油温——你不会一秒一秒指挥他下盐。

MusicLM 干的是同一件事，只不过你点的不是菜，是音乐：

- 你说："一首带电吉他 solo、节奏快、像 80 年代 rock 的歌"
- 它要在几分钟里安排好几十万个声音采样点。直接一个一个点画波形等于让厨师每秒决定"下一粒盐放哪里"，没人做得到
- 所以它学厨师的两步法：
  1. 先想"这盘菜整体什么风味、主料是什么"——对应歌的风格、情绪、乐器布局（语义层）
  2. 再决定"火候、刀工、摆盘"——对应每一秒具体听起来什么样（声学层）
- 最后端上桌：把声学层翻译回真正能听见的波形

关键：**先搭骨架再贴皮**。骨架管"这是什么音乐"，皮管"听起来什么样"。

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

**第一段：把音频拆成两套"标签"。** 像厨师把食材分两类来管——一类标"这是肉、这是菜"（粗分类，少而抽象），一类标"五花肉切成 0.3cm 薄片、葱切马蹄段"（细而具体）。MusicLM 也把同一段音乐过两个编码器：SoundStream（一个会压缩音频的神经网络，用"残差量化"把每秒音乐压成几百个离散 token，能再还原回波形）负责"细标签"（声学 token，密集、含音色细节）；w2v-BERT（一个学过大量音频的自监督模型）取中间层做 k-means 聚类，给出"粗标签"（语义 token，稀疏、含结构走向）。

等等，先慢一拍 — token 是什么？想成"音乐的拼音字母"：连续的声波被切成一格一格，每一格用一个编号代替，模型就能像写文章一样一格一格"写"出音乐。

**第二段：用 MuLan 让文字和音乐说同一种语言。** 像翻译官——"jazz piano with brush drums"这句英文和"一段爵士钢琴的录音"这段声音，对翻译官来说意思一样，他能在脑子里把两者对到同一个点上。MuLan 就是这种翻译官：它通过对比学习（拉近相关、推开不相关）把音频片段和它的弱标签文字（比如视频标题 tag）映到同一个向量空间。妙处在于：训练时模型只看音频侧的 MuLan 向量，推理时换成文字侧——空间是同一个，模型察觉不到差别。这就绕开了"高质量文本-音乐配对数据稀缺"这个老大难。

**第三段：两个语言模型接力写 token。** 像写小说先列大纲再展开细节。训练两个（或更多）自回归 Transformer 接力：
- 语义阶段：以 MuLan 向量为条件，先写语义 token（搭出"这首歌走向、风格、乐器布局"的大纲）
- 声学阶段：以 MuLan 向量 + 语义 token 为条件，再写声学 token（往大纲里填具体音色、细节）

声学阶段内部还分 coarse / fine 两步——因为残差量化的不同层负责不同精度（粗码定大方向，细码补细节），分开写比一锅炖更稳。具体层数参数需读原文。

**第四段：解码上桌，还能加花样。** 最后把声学 token 喂回 SoundStream 解码器，输出 24kHz 真实波形——耳朵能听见的音乐。论文展示能稳定撑几分钟连贯音乐，还支持"故事化 prompt"（一段一段描述，模型按时间顺序串起来）和"哼一段调子 + 文字"的 melody-conditioned 生成（给个旋律骨架，让它按文字风格重新配器）。

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
