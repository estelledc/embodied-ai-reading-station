---
title: "Conformer"
slug: conformer
topic: auditory
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2005.08100"
venue: Interspeech
year: 2020
era: classic
num: 17
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

让 AI 听人说话时既能听清每个字的咬字，又能联系整段话的意思——一个会同时"听细节"和"听大意"的耳朵。

## 这是个什么场景

想象你在一个嘈杂咖啡馆里听朋友讲昨天发生的事。你的耳朵其实同时在干两件事：

- **听清每个字的咬字**：他说的是"can"还是"can't"？这两个词差一个尾音，但意思完全相反。这是**近处的活**——盯着两三个音节之间的连读、吞音、变调。
- **跟上整段话的意思**：他十秒钟前提到了"周五要交方案"，那这会儿那个含糊不清的词，多半是"deadline"而不是"daily"。这是**远处的活**——靠上下文猜下一个词。

让 AI 做语音识别（ASR, Automatic Speech Recognition，把声音转成文字）也是同一回事。

之前的两类做法各有偏科：纯 Transformer 像个**远视眼**——能纵览全句语境，但盯不准眼前每个音节的细节；
纯卷积神经网络（CNN, Convolutional Neural Network）像个**近视眼**——局部抓得死死的，但视野只有眼前一小段。

Conformer 干的事就像给这只 AI 耳朵**配一副远近两用眼镜**：一层网络里同时塞两套机制，一套看远（注意力），一套看近（卷积）。

## 之前的人怎么做的 — 3-5 bullet

- **纯 RNN / LSTM 系**：早期 ASR 用 LSTM（Long Short-Term Memory，长短时记忆网络）做声学建模，序列建模天然，但训练慢、长依赖建模一般。
- **纯 Transformer 系**：Speech-Transformer 把 NLP 里的 Transformer 直接搬过来，全局依赖建模强，但局部模式（音素边界、共振峰）需要靠注意力去硬学，效率不高。
- **纯 CNN 系**：如 Jasper / QuartzNet / ContextNet，用堆叠卷积加宽感受野，局部细节抓得很准，但全局上下文要靠堆很深的层数才能"传"过去。
- **CNN + Transformer 串联**：有人尝试前面卷积下采样、后面 Transformer 做长建模，但这只是**前后接力**，每一层并不是同时拥有两种能力。
- **Hybrid 系（声学模型+语言模型分开）**：传统 HMM/DNN 混合系统效果不错但流水线复杂，端到端的趋势在 2019-2020 已经很明显。

## 这篇论文的关键想法

一句话：**别让模型在"看远"和"看近"之间二选一，让它每一层都两件事一起做。**

打个比方，这就像做一个**马卡龙夹心饼干**——上下两片饼干夹住中间的奶油层。Conformer 把四个零件按这个顺序堆成一块"Conformer Block"：

1. 前馈网络（Feed-Forward Module，FFN，相当于一个"过滤+加工"的小单元）—— 半片饼干
2. 多头自注意力（Multi-Head Self-Attention, MHSA）—— 中间奶油 1：抓全局，看远
3. 卷积模块（Convolution Module）—— 中间奶油 2：抓局部，看近
4. 前馈网络（FFN）—— 另半片饼干
5. LayerNorm（层归一化，给数值"压一压量纲"）—— 收尾

这就是 Conformer 标志性的**马卡龙（Macaron）结构**："FFN — 注意力 — 卷积 — FFN"。两片半 FFN 像饼干夹住中间一对儿"看远+看近"的奶油层，每片 FFN 还按 0.5 的比例做残差（residual，把输入直接加回输出的捷径）缩放——作者实验发现，这样比传统 Transformer 那种"一整块 FFN"的吃法更好用。

## 它怎么做的（方法）— 3-4 段

**第一段：整体编码器堆叠。**
输入是声学特征（一般是 80 维的 log-mel 频谱），先过一个卷积下采样模块（subsampling），把时间分辨率压低 4 倍，
然后过一个线性层 + dropout，再喂进 N 个 Conformer Block 堆起来。最后接 CTC（Connectionist Temporal Classification）
或者 Transducer 头做解码。N 一般取 16-17 层（small/medium/large 三种规模），具体数字需读原文。

**第二段：注意力子模块。**
用的是相对位置编码（relative positional encoding）的多头自注意力，沿用了 Transformer-XL 的方式。
为什么用相对位置而不是绝对位置？因为语音的长度变化大，相对位置在长序列下泛化得更好——这是个朴素但重要的工程细节。

**第三段：卷积子模块（这是最有特色的部分）。**
卷积模块的内部结构是：LayerNorm → Pointwise Conv（1x1 卷积，相当于"通道 mlp"）→ GLU 激活（Gated Linear Unit，门控线性单元）
→ Depthwise Conv（深度可分卷积，沿时间维做 1D 卷积）→ BatchNorm → Swish 激活 → 再一个 Pointwise Conv → Dropout。
这个组合的精髓在于 **Depthwise Conv 是"按通道独立做时间卷积"**，参数量小、专注捕捉局部时序模式，
而 GLU 提供"门"机制让网络自己决定哪些通道值得通过。

**第四段：前馈子模块和残差缩放。**
FFN 里用 Swish 激活（不是 Transformer 经典的 ReLU），中间维度一般是输入维度的 4 倍。
两个 FFN 都套了 0.5 的残差缩放，即 `x = x + 0.5 * FFN(x)`，这是马卡龙结构的关键之一，
作者实验里验证：单 FFN（普通 Transformer 风格）效果不如双半 FFN（马卡龙）。

## 实验在做什么

主要在 **LibriSpeech**（一个公开的 1000 小时英文有声书数据集）上做对比：

- **基线**：ContextNet（纯卷积 SOTA）、Transformer Transducer（纯注意力 SOTA）、QuartzNet 等。
- **指标**：WER（词错误率，越低越好），分别在 test-clean 和 test-other 两个测试集上报。
- **三种规模**：Conformer-S / M / L，分别约 10M / 30M / 118M 参数（数字记忆值，具体需读原文）。
- **消融实验**：拆掉卷积模块 / 拆掉马卡龙 FFN / 换激活函数等，验证每个设计选择的必要性。
- **结论**：Conformer-L 在 test-clean 达到 ~2.1 WER，test-other ~4.3 WER（含 LM），是当时 LibriSpeech 上的新 SOTA。

## 你应该懂的几个新词 — 4-6 个

- **WER（Word Error Rate）**：语音识别的标准指标，等于（替换+插入+删除错误数）/ 参考文本词数。越低越好。
- **CTC（Connectionist Temporal Classification）**：处理"输入帧数 ≠ 输出字数"的对齐损失函数，不需要逐帧标注。
- **Depthwise Convolution**：参数高效的卷积变种，每个输入通道独立做卷积，再用 1x1 卷积混通道。计算量比普通卷积小一个数量级。
- **GLU（Gated Linear Unit）**：把卷积/线性输出切两半，一半当值、一半过 sigmoid 当门，相乘——给网络一个"选择性放行"的能力。
- **马卡龙结构（Macaron-style FFN）**：在注意力前后各放半个 FFN（残差权重 0.5），来源于 ODE 视角下的 Transformer 改造（Lu et al. 2019）。
- **Swish 激活**：`x * sigmoid(x)`，比 ReLU 平滑，在很多任务上略好。在 Conformer 里用于 FFN 和卷积模块。

## 它和其他论文什么关系

- **上游 / 借鉴**：Transformer（Vaswani 2017，全局建模骨架）、Transformer-XL（相对位置编码）、
  Macaron Net（FFN 三明治结构）、ContextNet（纯卷积语音 SOTA，做对比基线）、
  QuartzNet / Jasper（深度可分卷积在语音里的早期实践）。
- **同期对手**：Transformer Transducer（Google 同期纯 attention 路线）、ContextNet（Google 同期纯卷积路线）。
  Conformer 可以看成 Google 团队"既要又要"的折中方案——并且赢了。
- **下游 / 影响**：
  - 语音方向：成为 Whisper 之前几乎所有开源 ASR（如 ESPnet、SpeechBrain、wav2vec 2.0 的某些变体）的默认编码器选择之一。
  - 通用序列方向：启发了"卷积 + 注意力混合"的一系列工作，比如 ViT 后的 CoAtNet、视觉的 Conv-Attn 混合骨干等。
  - 多模态方向：本笔记同目录下的 `whisper.md` / `wave-former.md` / `conv-tasnet.md` 都可作为对照阅读。

## 我建议这样读 — 3-4 步

1. **先看图 1 和图 2**（Conformer Block 结构图）：把"FFN — Attn — Conv — FFN"这个三明治顺序在脑子里画出来。
2. **再读 Section 2.1 卷积模块的子结构**：理解 Depthwise Conv + GLU + BatchNorm 这一串为什么这么排，每个组件解决什么问题。
3. **跳到 Section 3 实验和消融表**：重点看消融实验——拆掉卷积、换成绝对位置、单 FFN 各掉多少 WER，这些数字告诉你哪些设计是真有用的。
4. **回头扫 Section 2.2 模型规模**：看 S/M/L 三档参数和层数怎么搭配，这对你以后用 Conformer 做工程很有参考价值。

## 为什么值得读

三个理由：

- **架构哲学的样板**：它是"局部+全局并存"思想最干净的一个实现，远超单纯刷 SOTA 的意义。这种思路后来在视觉、多模态都被反复复用。
- **工程细节扎实**：相对位置编码、马卡龙 FFN、Depthwise Conv、GLU、Swish——每一个选择都有消融实验背书，是学习"如何做扎实消融"的好范本。
- **对具身智能（embodied AI）的迁移价值**：机器人/具身系统里的传感信号（IMU、力觉、毫米波雷达等）也都同时存在"快变的局部信号"和"慢变的全局上下文"，
  Conformer 的"局部+全局并存"骨架可以直接借鉴到这些时序模态上，不只是语音独享。
