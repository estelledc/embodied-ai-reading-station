---
title: "NeuralAids: Wireless Hearables With Programmable Speech AI Accelerators"
slug: neuralaids
topic: 七. 听觉智能
difficulty: ⭐⭐⭐
status: auto-summary
来源: papers/neuralaids/paper.pdf
generated_at: 2026-05-30
---

# NeuralAids: Wireless Hearables With Programmable Speech AI Accelerators

> 这是机器辅助生成的客观摘要笔记。教学版精读笔记由用户按节奏触发后单独成稿。

## 一句话讲什么（TL;DR）

把语音降噪深度学习模型，整个塞进一只助听器大小的无线耳机里实时跑，不用连手机。

## 这篇论文要解决什么问题（Why this paper）

想象一个画面：你 70 岁的爷爷戴着助听器去咖啡馆，旁边桌的人聊天声、咖啡机蒸汽声、背景音乐叠在一起，他听对面孙子说话只能靠猜。市面上"AI 助听器"的方案是什么？要么把麦克风的声音偷偷传到手机上算（一旦 Wi-Fi 抖、地铁信号断，回声就乱），要么在助听器里跑一个超级简化的小模型，结果是噪音确实小了，但你孙子的声音也变得像水里说话。

这篇论文要解决的就是这个尴尬：**能不能让助听器自己就把这件事做好，不依赖任何外部设备？**

具体的工程约束（被业界普遍认为"做不到"）：

- 助听器、耳塞这种小玩意，电池只有几百毫安时（mAh，电量单位，相当于汽油箱大小），芯片塞不下大模型，但用户希望它能"AI 降噪"。
- 之前的两种妥协：(a) 把音频偷偷传到手机/电脑上算 → 联网延迟高、网络一抖就卡，超过 10 ms 用户就会觉得"自己说话像在山洞里有回声"；(b) 用一个超简化的小模型 TinyDenoiser → 音质差、算法延迟还有 25 ms。
- 三个硬指标必须同时达成：每帧"低于 6 ms 算完"、模型小于 1.5 MB、功耗低于 100 mW（这样 675 号助听器电池能撑 6 小时以上）；并且音质要接近云端大模型——这三件事过去一直被认为在小硬件上做不到。

这篇论文要回答：到底能不能完全在助听器本体上跑现代深度学习语音降噪模型？

**它和你日常用的产品的关系**：你正在用的 AirPods Pro / Pixel Buds Pro 2 都已经在做"AI 降噪"，但它们都至少要把一部分计算扔回手机（蓝牙或 Apple H2 芯片本地是 NPU 处理一部分，再把残余结果丢到 iPhone 的神经网络引擎做最后清理）。Phonak 在 2024 年底发布的 Audéo Sphere Infinio 是首款"号称完全 on-device AI 降噪"的助听器，但是闭源、不公布算法。这篇论文相当于把这件商业秘密的事用一套**公开的、可复现的学术系统**做了一次 — 在硬件、网络、量化三层都摊开告诉你怎么做。如果你将来做"语音 AI 上耳"相关的产品，这是目前唯一一份可以从零起步的开源参考。

## 用了什么方法（How）

![NeuralAid 戴在耳后的样子](../papers/neuralaids/images/img_001.jpg)

整篇论文做的事可以拆成三块：硬件平台、神经网络、量化协同。下面按这个顺序拆解，每一步先类比再揭示术语。

### 1. 五块 PCB 堆叠的硬件平台

类比：**乐高五层蛋糕**。一块板管充电（PWR）、一块板管蓝牙（BT）、一块板管 AI 计算（AI）、一块板管周边存储（PERIPH）、一块板管麦克风（MIC），五片印刷电路板（PCB，Printed Circuit Board，就是电路通过铜线印在板子上的硬件载体）叠在一起塞进耳后助听器壳里。

最关键的那块叫 AI 板，里面装的是一颗叫 **GAP9** 的芯片（GreenWaves Application Processor 9）。GAP9 是给"低功耗 AI 计算"专门优化的芯片，可以理解成"耳机里的小型显卡"——但它跟手机里的 GPU 完全不是一种东西，它只擅长做整数乘加（INT8 quantized multiply-accumulate，下面讲量化时会再提）。

### 2. Dual-path 时频域神经网络（基于 TF-GridNet 改）

读到这里你可能在想：硬件搭好了，那塞什么模型进去？这是论文的第二大块。

类比：**分开听节奏和音色**。当你在嘈杂酒吧听音乐时，你的耳朵其实同时在做两件事——一件是跟踪"鼓点何时出现"（**时间维度**），另一件是辨认"这是低音吉他还是钢琴"（**频率维度**）。dual-path（双路径）网络就是把这两件事用两条神经网络通路分开处理。

具体怎么做：

1. 先用 **STFT**（Short-Time Fourier Transform，短时傅里叶变换，把音频按小窗口逐个分解成频率成分）把 6 ms 的音频块切成时间-频率小方格。
2. 一条路径专门看"频率维度"上各个频点之间的关系（比如低频降噪不能动太大、高频降噪要小心齿音），叫 **spectral path**（光谱路径）。
3. 另一条路径专门看"时间维度"上前后 chunk 之间的连贯（说话人停顿、连读），叫 **temporal path**（时间路径）。
4. 这是当前语音增强（speech enhancement）的 SOTA（State-Of-The-Art，最佳水平）范式，论文起点是 **TF-GridNet**（一篇 2023 ICASSP 论文，把 dual-path 范式用到时频域的代表作）。

读到这你可能想：那 TF-GridNet 直接搬过来不就行了吗？答案是不能，因为它对硬件太贪了。所以论文做了三个魔改：

![网络架构图：双路径模块、缓存状态、双窗口](../papers/neuralaids/images/img_006.jpg)

#### 魔改 a：频率压缩 + GRU 替代 LSTM

类比：**先把谱图横向压扁再处理**。原始 TF-GridNet 的 spectral path 用的是双向 LSTM（Long Short-Term Memory，长短期记忆网络，一种能记住远距离上下文的 RNN）顺序处理几百个频点——这就像让一个人逐个数完整本书所有的字才能告诉你这本书写啥，慢得离谱。

作者的做法：先用 **strided convolution**（步长卷积，一种把序列长度横向压缩的卷积）把频率维度"压扁"四倍，再用更轻的 **GRU**（Gated Recurrent Unit，门控循环单元，比 LSTM 少一个门，速度快一截但效果差不多）替代 LSTM——速度提上来还不掉点。

#### 魔改 b：Dual-window 重叠加（overlap-add）

类比：**两个不同尺寸的窗户错开开关**。标准的 overlap-add（音频重建时把相邻 chunk 加权拼接的标准操作）因为需要"等下一帧的回看部分"才能拼出当前帧，会引入额外算法延迟。

作者用一对**不对称的窗函数**——分析时用一个大窗（看得多）、合成时用一个小窗（不依赖未来）——把这个延迟省掉。最终算法延迟从 25 ms（TinyDenoiser）降到 10 ms。

#### 魔改 c：Cache state 复用

类比：**做菜留底汤**。streaming 推理每来一个 chunk 都要算一遍卷积、LSTM 状态、ISTFT，但其实很多中间结果跨 chunk 是可以复用的。作者维护四个缓存：STFT 帧缓存、dual-path 模块输出缓存、ISTFT 中间帧缓存、temporal LSTM 隐状态。这避免了重复计算。

读到这你可能想：神经网络改完就能跑了吗？答案还是不能，因为模型还是 float32（32 位浮点数，单个数 4 字节），太大太慢。所以论文还有第三块。

#### 魔改 a 拓展 — 频率压缩到底压了多少倍、为什么是 4×

**它在干什么**：原始 STFT 出来的频谱有约 257 个频率 bin（FFT 大小 512 → 一半 + 1），spectral path 的双向 LSTM 要按这 257 步顺序往前/往后跑两遍，每一步都做矩阵乘加，单帧就要几百万次乘加。strided convolution 把 257 这个序列长度横向压扁 4 倍变成 ~64，LSTM 的总计算量就降到原来的 1/4。

**关键超参**：作者实测对自己的模型用 4× 压缩（参见 §3.1.2 "我们的模型应用 4× 频率压缩"）；对 baseline TFGridNet-6F 必须用 6× 才能塞进实时预算。压得越多越快但损失越大——4× 是 quality vs speed 的甜蜜点。

**消融告诉我们什么**：Table 2 中 TFGridNet-6F 用 6× 压缩拿到 8.43 dB SISDRi，本作 4× 压缩拿到 8.65 dB——4× 比 6× 多 0.22 dB。也就是"少压一点能多挤 0.22 dB"，但代价是 spectral 模块计算量翻 1.5 倍。

#### 魔改 b 拓展 — Dual-window 数学上为什么能省 lookback 延迟

**关键公式**（人话翻译版）：
```
原文公式（合成窗）：
s[i] = 1                if i ∈ [L_F, L_C]
s[i] = 1 / (⌊(L_C+L_B)/L_C⌋ + 1)   otherwise
```

**人话翻译**：分析窗（用来算 STFT 的那个窗函数）用一个"长方形大窗"覆盖 lookback + chunk + lookahead = 6+6+4 = 16 ms 的全部样本，让 FFT 的频率分辨率高；合成窗（用来还原信号的那个窗函数）只覆盖当前 chunk 的中段（L_F 到 L_C 这 6 ms），lookback 部分赋一个非常小的常数权重，这样 overlap-add 的时候 lookback 部分基本不会"污染"前一帧的输出。

**关键参数**：L_C = 6 ms（chunk 大小）、L_B = 6 ms（lookback）、L_F = 4 ms（lookahead）。最终算法延迟 = L_C + L_F = 10 ms，完美。如果用标准 overlap-add，算法延迟 = L_C + L_F + L_B + L_C = 22 ms，TinyDenoiser 之前的 25 ms 就来自类似的设计。

**为什么这么设计**：因为人耳对 10 ms 以下的延迟基本不敏感，超过 10 ms 就会"听到自己说话有山洞回声"。dual-window 把延迟从 22 ms 砍到 10 ms 是这篇论文能落地的关键。

#### 魔改 c 拓展 — 4 个缓存到底各缓存了什么

**1. STFT 帧缓存**：第一层 2D causal convolution 需要往前看几帧才能算当前帧的输出。如果不缓存，每来一个新 chunk 都要把过去 N 帧的 STFT 重算一遍。缓存后，每一帧只算一次。
**2. dual-path 模块输出缓存**：deconv 也是 causal 的，需要看 dual-path 模块在过去几帧的输出。
**3. ISTFT 中间帧缓存**：overlap-add 阶段需要"记住"前一帧的尾巴，和当前帧的头部相加才能拼出完整音频。
**4. temporal LSTM 隐状态**：标准的 RNN cell state 复用，不重新跑前几帧。

**为什么这么设计**：这是任何 streaming RNN/CNN 都必须做的工程。论文展示了 4 个缓存加起来约 30 KB（远小于 GAP9 的 128 KB L1 + 1.5 MB L2），所以"为了省时间"换"占点内存"是划算的交易。

### 3. 混合精度量化 + QAT（量化感知训练）

类比：**训练时就让模型预演被压缩成整数后的损失**。

什么是量化？想象你原本用毫米精度量身高（179.834 mm），现在被迫只能用厘米精度（180 cm）——你丢了精度，但记录占的位数从 32 位降到 8 位，算起来快、占空间小。神经网络量化就是把权重和激活从 float32（32 位浮点）压成 int8（8 位整数），内存少 4 倍、整数乘法在低功耗芯片上比浮点快 5-10 倍。

但有个大问题：**直接压会崩**。论文实测，把整个网络全压成 int8（**PTQ**，Post-Training Quantization，训练后量化），SISDRi（衡量降噪质量的指标，下面术语章节有解释）从 8.65 dB 直接掉到 -1.70 dB——也就是说降完比不降还差，模型坏了。

作者的两步解法：

1. **Mixed-Precision（混合精度）**：第一层卷积和最后一层反卷积保持 bfloat16（16 位浮点，比 int8 精度高、比 fp32 省一半），其它层用 int8。逻辑是：第一层处理原始输入、最后一层产生原始输出，这两个位置最敏感，一旦丢精度全网崩。
2. **QAT**（Quantization-Aware Training，量化感知训练）：训练时就在 forward 里插入"假装量化"的算子（用 STE，Straight-Through Estimator，直通估计器，用 1 来近似量化算子的导数让梯度能传），让模型在训练阶段就"提前体验"被压成整数后的误差，并学着补偿。最终 mixed-precision + QAT 把性能从 0.90 dB 拉回到 8.19 dB——只比原始 fp32（8.65 dB）低 0.57 dB。

#### 量化机制深挖 — 公式人话版

**关键公式**：
```
原文公式（量化）：Q(r) = ⌊r/S⌉ + Z
原文公式（反量化）：r̂ = S(Q(r) - Z)
```

**人话翻译**：
- `r` 是原始浮点数（例如 0.847）
- `S` 是缩放因子（scaling factor），决定"每 1 个整数代表多大的浮点跨度"——比如 S = 0.01，那么 int8 的 100 就代表浮点 1.0
- `Z` 是零点（zero point），决定整数 0 对应到浮点的哪个值（int8 范围 -128~127，如果浮点范围是 [0, 2.55] 就需要把零点偏移）
- `⌊·⌉` 是四舍五入到最近整数

**两种量化方式**：
- **per-tensor**（整张张量一组 S/Z）：简单，但损失大，因为不同 channel 数值范围差异很大
- **per-channel**（每个 channel 单独的 S/Z）：精度更高，存储开销略大

**本文实际用的策略**：
- **激活值（activations）** → per-tensor 非对称量化（asymmetric，因为激活后通常都是非负的，零点偏移能更好利用 int8 范围）
- **权重（weights）** → per-channel 对称量化（symmetric，权重通常以 0 为中心）

**为什么 GAP9 上量化能大提速**：GAP9 的 NE16 加速器只支持 8-bit 权重 + 8/16-bit 激活的整数乘加，且单条指令能并行做 16 路乘加。fp32 在 RISC-V 核上要用慢得多的 fpu 单元逐个跑。所以 int8 化是"被硬件逼出来"的选择，不是单纯为了减肥。

#### LSQ — QAT 之上的进一步优化

**它在干什么**：传统 QAT 把 scaling factor `S` 当固定常数。**LSQ**（Learned Step-Size Quantization，可学习步长量化，参见原文 [17]）把 `S` 也当作可学习参数，通过反向传播学最优值。

**为什么这么设计**：不同层、不同训练阶段的"最优 S"不一样——比如前期训练时激活分布在 [-2, 2]，后期可能压到 [-0.5, 0.5]。固定 S 就用了次优的量化范围，浪费了 int8 表达力。LSQ 让 S 跟着训练自适应。

**关键超参**：QAT 阶段 30 epochs，每 epoch 4000 个 mixture（远少于第一阶段的 20k，因为 QAT 计算量太大），初始学习率 1e-3，ReduceLROnPlateau 调度器。

## 关键实验结果（What works）

![QAT 后量化模型几乎追平浮点模型](../papers/neuralaids/images/img_008.jpg)

每个数字后面我加一句"为什么这了不起"：

**5.54 ms 推理 / 6 ms 音频块**
- 设置：在 GAP9 加速器上，整个 pipeline（FFT → AI 推理 → iFFT → overlap-add）测 100 次取平均
- 数字：单次推理 5.54 ms（其中 AI 网络本身约 5.0 ms，FFT/iFFT 各约 0.05 ms，overlap-add 等其它约 0.4 ms）
- 对比：TinyDenoiser 同款硬件上 0.58 ms（小，但算法延迟 25 ms 抵消了硬件优势）
- 现实意义：每收到 6 ms 新音频，模型在 5.54 ms 内就处理完了，留 0.46 ms 缓冲不会"赶不上"；用户听到的回声延迟在 10 ms 感知阈值之下

**71.64 mW 功耗 + 299 kB 模型**
- 设置：1.8V 电源驱动 GAP9，连续跑几分钟测平均电流，乘以电压
- 数字：71.64 mW（GAP9 自身），加上其它组件（BLE 6.75 + 麦克风 2.02 + 喇叭 1.49 = 10.26 mW），总功耗约 82 mW
- 对比：手机端跑同类模型轻松上百 mW；TinyDenoiser 在 GAP9 上只要 24.12 mW（小但音质差）
- 现实意义：300 mAh × 3.85V = 1.155 Wh 的小电池，按 82 mW 持续跑可以撑约 14 小时，**对常规 6+ 小时使用绰绰有余**

**SISDRi 8.19 dB（量化后），TinyDenoiser 同条件 5.97 dB**
- 设置：合成测试集（LibriSpeech 干净语音 + 4 个 BRIR 数据集 + WHAM! 噪声），双方都做了 mixed-precision QAT 和 10 ms 算法延迟约束
- 数字：本作 8.19 dB ± 3.38；TinyDenoiser 5.97 dB ± 3.35；纯 fp32 baseline 8.65 dB
- 对比：~2.2 dB 改善是同硬件预算下的最大幅度；与 fp32 baseline 只差 0.57 dB
- 现实意义：在主观感知上从"中等清晰度"提到"高清晰度"——MOS 提升约 1.4 分对应主观感受的明显跃迁

**用户研究 28 人 MOS 评分**
- 设置：18-70+ 岁、仅排除"不能听懂英语指令的非成年人"，每人评 15 个真实场景 × 3 种模式（No AI / TinyDenoiser / Ours），随机顺序
- 数字：本作噪声抑制 MOS 3.57（baseline 2.15）、整体 MOS 3.38（baseline 2.96）
- 对比：TinyDenoiser 噪声抑制 MOS 仅 2.38（小升），但**整体 MOS 反而从 2.96 掉到 1.96**——它降噪同时也把语音弄失真了
- 现实意义：本作"降噪 + 不损害可懂度"两件事同时做到，是关键卖点；TinyDenoiser 是"为了减肥把肌肉一起减掉"的反例

**量化 vs 浮点的差距：从 7.86 dB 缩到 0.57 dB**
- 设置：对比 Mix PTQ（不做训练）和 Mix QAT（做 30 epoch 量化感知训练）下，量化版与 fp32 版的 SISDRi 差距
- 数字：Mix PTQ 时差距 7.86 dB（fp32 8.65 - 量化 0.79）；Mix QAT 时差距 0.57 dB
- 对比：14× 的差距压缩
- 现实意义：mixed-precision + QAT 不是噱头，对深网络是 must-have；这两个技术每一个都不能省

**Motion 鲁棒性（Table 4）**
- 设置：合成测试集 + Steam Audio SDK 模拟说话人/听者头部转动，角速度从 -90 到 90 deg/s
- 数字：fine-tuned 版在所有角速度区间稳定在 10.2-10.7 dB；不 fine-tune 也能 9.95-10.42 dB
- 对比：差距只有 ~0.3 dB，说明双耳独立处理（不依赖时间差特征）天然抗运动
- 现实意义：用户走路、扭头看东西时降噪不会突然崩；商业产品里这是必须验的特性

**Wireless throughput（Fig. 6）**
- 设置：从耳机流式发送 10000 个 196 字节包到笔记本，距离 1-7 米
- 数字：3 米内 ~250 kbps；超过 3 米掉到 200 kbps 以下
- 对比：MP3 高质量音频约 320 kbps，PCM 16 kHz/16 bit ~256 kbps
- 现实意义：3 米内可以稳定流原始音频出去做云端录音；超过这个距离要降采样或开有损压缩

## 我读完后该懂的几个术语

- **GAP9**（GreenWaves Application Processor 9）—— 一颗专门为低功耗 AI 设计的 RISC-V 多核加速器（9 个 RISC-V 核 + 一个 NE16 神经网络加速器单元）。类比"耳机里的小型显卡，但只擅长整数乘加"。出现在 §2.1 硬件平台的核心。
- **STFT**（Short-Time Fourier Transform，短时傅里叶变换）—— 把一段音频切成小窗口逐个做傅里叶变换得到时间-频率二维表示。类比"把电影按秒切帧再分别看"。本文每个 6 ms 的 chunk 都先过 STFT，然后才进神经网络。
- **TF-GridNet** —— 2023 年提出的 SOTA 双路径时频域语音增强网络，本文的起点。Dual-path 指"频率"和"时间"两条独立路径，由 LSTM 并行建模。
- **SISDRi**（Scale-Invariant Signal-to-Distortion Ratio improvement）—— 衡量降噪后干净语音相对失真的提升量，单位 dB。类比"把信号比噪声响多少"的度量。出现在所有 Table 2/3 中作为客观主指标。
- **MOS**（Mean Opinion Score）—— 主观评分均值，1~5 分。类比"豆瓣评分"。出现在用户研究 §3.2，分两种：noise suppression MOS（噪声抑制单维度）和 overall MOS（整体感受）。
- **PTQ**（Post-Training Quantization，训练后量化）—— 训练完再压。类比"做完菜再冷冻——口感会差"。出现在 §2.3.3，作为对照基线。
- **QAT**（Quantization-Aware Training，量化感知训练）—— 训练阶段就模拟整数量化的误差，让模型学会"抗压"。类比"考试前先用真考试卷子练，而不是练习卷"。本文核心技术，出现在 §2.3.4。
- **algorithmic latency vs hardware latency**（算法延迟 vs 硬件延迟）—— 算法延迟是"模型设计上你必须等多久才能输出当前帧"（窗口、lookahead 决定），硬件延迟是"芯片实际算这一帧花多久"。两者都要 < 10 ms。出现在 Fig. 3A 的延迟分解。
- **GRU**（Gated Recurrent Unit，门控循环单元）—— 比 LSTM 少一个门、参数少 25%、速度快约 1.3 倍、效果在多数任务上和 LSTM 持平。本文 spectral path 用 GRU 替换 LSTM 来抢回 runtime。
- **STE**（Straight-Through Estimator，直通估计器）—— 量化 round 操作的导数本来是 0（阶梯函数），STE 假装它的导数是 1，让梯度能"穿透"量化操作往回传。这是 QAT 能训练的数学根基。
- **LSQ**（Learned Step-Size Quantization，可学习步长量化）—— 把 quantizer 的 scaling factor S 也当作可训练参数。比固定 S 的 vanilla QAT 多挤出 1-2 dB。
- **per-tensor / per-channel quantization** —— 整张张量共享 S/Z 是 per-tensor，每个 channel 独立 S/Z 是 per-channel。本文激活用 per-tensor，权重用 per-channel。
- **bfloat16**（brain float 16）—— 16 位浮点，1 sign + 8 exponent + 7 mantissa，和 fp32 共享指数范围（不容易溢出），但精度只剩 ~3 位有效数字。比 fp16 更适合深度学习。本文第一层 conv 和最后一层 deconv 用它。
- **BRIR**（Binaural Room Impulse Response，双耳房间冲激响应）—— 把"空房间在某位置发声、麦克风在双耳位置录到的衰减/反射"建模成一个滤波器。和干净语音卷积可以模拟"在那个房间那个位置说话"的效果。本文用 4 个 BRIR 数据集做训练增强。
- **WHAM!**（WSJ0 Hipster Ambient Mixtures）—— 58 小时双耳格式真实环境噪声数据集（咖啡馆、餐厅、公园等），本文用作训练时的背景噪声源。
- **NE16** —— GAP9 内部专门做 8-bit 整数乘加的硬件加速单元。文中 spectral/temporal 模块的乘加都跑在它上面，FFT/iFFT 跑在通用 RISC-V 核上。

## 这篇论文的局限 / 我看出的疑点

- **功耗数字假设 AI 加速器始终在跑**：没考虑 voice activity detection（VAD，语音活动检测，没人说话时就让 AI 休眠）触发的 duty-cycle 模式。论文自己也提了，未来工作。**用户实际感受**：在安静的图书馆 / 睡前静音环境戴 6 小时，电池没必要烧成这样，电池续航本可以翻倍。**后续是否解决**：论文 §5 明确把 duty-cycling 列为 future work，截至 2025-11 还没看到 follow-up。GAP9 SDK 自带 VAD 模块可以直接接入，工程上不难，但论文没做。
- **只在一颗加速器上验证**：其他低功耗 AI 芯片（MAX78000、Ethos-U55、Kendryte K230）没测，所以"在小硬件上能跑"这个结论的泛化性还没完全建立。**用户实际感受**：换一家厂商的助听器（不用 GAP9），这套方法能不能直接搬，未知。**后续是否解决**：尚未；这些芯片的 NPU 设计差异很大（Ethos 是 Arm 自家、MAX78000 自带 CNN-only 加速器对 RNN 不友好），需要针对性调优。
- **训练数据全是合成噪声混合**：硬件上没采集任何训练数据。在某些极端真实场景（比如风噪、强混响、多人快速切换说话）下表现是否稳健，论文用 6 个室内外环境做了 in-the-wild 但样本规模只有 28 人。**用户实际感受**：在地铁里、强风海边、教堂大堂这些声学奇葩场景，表现可能会显著掉。**后续是否解决**：未解决。同组的 Sound Bubbles (Nature Electronics '24) 用了真实采集数据，但那篇也只覆盖几种室内场景。
- **只用 1 个麦克风**：硬件有 3 麦阵列但模型只用了 1 个。意味着空间信息（声源在左在右）完全没用上，未来如果加上 beamforming，性能可能再上一个台阶。**用户实际感受**：现在它降噪是"听起来变干净"，但如果你想"只听对面那个人不听旁边那桌"（target speech extraction），目前模型还没做到。**后续是否解决**：论文 §5 明确说"探索单耳多麦 + 双耳协同"是 future work；同组的 Target Speech Hearing 论文做到了但需要外部计算。
- **没针对听损人群个性化**：用户研究的入选标准只是"成年人 + 能听懂英语指令"，没区分听损者。听损用户的需求其实和正常听力者很不同（可能需要按医学处方做频段补偿）。**用户实际感受**：这其实更像一个"健康人降噪耳塞"，而不是真正意义上的智能助听器。**后续是否解决**：论文承认这是 future work，需要"基于医学听力损失处方做信号处理个性化"。Phonak 的商用产品在做，但学术上还没有 NeuralAid 的开源版本。
- **没做 ANC（Active Noise Cancellation）**：目前依赖耳塞物理隔音（passive noise cancellation），没有像 AirPods Pro 那样主动产生反相声波抵消环境噪声。**用户实际感受**：在嘈杂环境中虽然 AI 在过滤语音，但底噪仍能"渗透"进耳道。**后续是否解决**：论文 §5 提及 GAP9 硬件支持 ANC 算法，但本作没实现；ANC 对延迟要求极严（< 1 ms），与 AI 推理 6 ms 不在一个时间尺度，需要单独的低延迟数字滤波路径。
- **目标 form factor 是 BTE 助听器，不是 earbud**：现在的 5 PCB 堆叠尺寸大约是耳塞的 3-4 倍，挂耳后部，主要是医疗用助听器外形。**用户实际感受**：你不会戴它去跑步、健身。**后续是否解决**：论文明说下一步是 earbud form factor，"由于 GAP9 体积小，工程上可行但需要重新设计电路布局"。

## 与其他 12 篇的关联

- **听觉智能主题的硬件落地代表**：这是 13 篇 reading list 中**唯一一篇研究"边缘 AI 部署"的工程论文**。和 VLA / 视觉机器人主线没有方法上的直接共享，但属于"具身 AI 的边缘部署"分支——把感知模型塞进真实穿戴设备里跑。和那些跑在 A100 / RTX 4090 集群上的 VLA 模型形成了一个有意思的对比：当算力不是问题时关心 emergent capability，当算力极度受限时关心 quantization 和 hardware-software co-design。
- **同组前作的延续**：和 ClearBuds（CHI '22）、Semantic Hearing（UIST '23）、Target Speech Hearing（CHI '24）（同组 UW Allen School Gollakota lab 的工作）一脉相承，但**这是第一篇把推理完全搬到耳机本体、不依赖手机/外置算力的**。前几篇都是"用耳机收音 + 手机算"，本文证明了"全程耳机内"是可行的，相当于这个研究路径的硬件天花板被推到了一个新位置。
- **和 VLA 模型部署到机器人 MCU 的工作共通**：方法论上的"模型压缩 + 硬件协同设计"思路，和任何想把大模型部署到机器人本体（而不是云端）的工作都共通——比如 MobileVLA、把 OpenVLA 蒸馏到 Jetson Nano 的尝试。**它们共享的核心思路是：mixed-precision + QAT 是把网络塞进低功耗芯片的钥匙**，离开这把钥匙基本没戏。
- **和 LLaVA / VLM 这类"大模型路线"形成方法论对照**：LLaVA 之类追求"参数越多能力越强"，本文走的是反方向——证明一个 299 kB 的极小模型在窄任务（语音降噪）上也能逼近 SOTA，前提是设计精细 + 硬件协同。这两条路线是具身 AI 部署的两端，未来会在某个点收敛。

## 数据集 / 实验设置详情

![不同室内外场景下的 in-the-wild 评测](../papers/neuralaids/images/img_003.jpg)

**训练数据**（合成 mixture，全程不用自己硬件采）：
- **干净语音源**：LibriSpeech [35]，360 小时清晰人声，公开免费
- **房间冲激响应**：4 个 BRIR 数据集：CIPIC [5]、RRBRIR [22]、ASH-Listening-Set [52]、CATTRIR [23]，按 train/val/test 不重叠分
- **背景噪声**：WHAM! [62]，58.03 小时的咖啡馆/餐厅/公园等真实双耳噪声
- **mixture 公式**：`x(t) = h_θφ(t) * a(t) + n(t)`，即"语音 a 卷积 BRIR"加"噪声 n"，target 是"语音卷积 BRIR"（保留双耳特征）

**训练设置（第一阶段）**：
- 200 epochs，每 epoch 20k mixtures × 5 秒
- 优化器 AdamW + 梯度裁剪 0.1
- 学习率三段：(1) 10 epoch 内从 1e-4 线性升到 1e-3；(2) 1e-3 持续 140 epoch；(3) 后 50 epoch 每 15 epoch 砍半
- Loss：SNR loss `L = ||s||² / ||s - ŝ||²`
- 左/右耳各训一个网络，独立部署

**Fine-tuning 阶段（加运动 + 噪声增强）**：
- 100 epoch，每 25 ms 更新一次声源位置，2.5% 概率触发运动事件
- 角速度从 [π/6, π/2] rad/s 范围采样，运动持续 0.1-1s
- 30% 概率加白/粉/棕噪声，30% 概率把语速变成 80-120%
- Loss 换成 multi-resolution spectrogram loss（频域多尺度损失，比 SNR loss 更贴近感知）
- 用 ReduceLROnPlateau 调度器，patience=5、factor=0.5

**QAT 阶段**：
- 30 epochs，每 epoch 仅 4000 mixtures（QAT forward/backward 计算量大，不能太多）
- 初始 lr 1e-3，ReduceLROnPlateau

**硬件**：在 UW HYAK 集群上训练，具体 GPU 数原文未提；推理硬件是 GAP9 加速器，clocked at 370 MHz。

**baselines 选择理由**：
- **TinyDenoiser** [45]：当前唯一能在 GAP9 上实时跑的开源工作，公平对比
- **TF-GridNet** [59]：dual-path 时频域 SOTA，作为"理想浮点 baseline"，但要做 6× 频率压缩才能塞进 6 ms

**评测**：
- 客观指标：SISDRi、PESQ、DNSMOS（三种语音质量自动指标）
- 系统指标：Memory（L1+L2 总和）、Runtime（100 次平均）、Power（多分钟电流平均）
- 主观指标：28 人用户研究 × 15 场景 × 3 模式（No AI / TinyDenoiser / Ours）随机顺序双盲

## 关键公式 / 算法（人话翻译版）

### 公式 1：流式语音增强的形式化

```
原文公式：ŝᵢ, hᵢ = N(xᵢ, hᵢ₋₁)
```

**人话翻译**：神经网络 N 吃两样东西——当前 6ms 的音频片段 xᵢ 和上一帧留下的"记忆缓存" hᵢ₋₁，吐出两样东西——当前帧的干净语音估计 ŝᵢ 和这一帧产生的新记忆缓存 hᵢ。这个 hᵢ 就是上面"魔改 c：Cache state"中那 4 个缓存的总和。

**为什么这样设计**：streaming 推理必须有"状态延续"，不能每个 chunk 当成独立输入跑——否则 LSTM 没法记住跨 chunk 的语音连贯性。

### 公式 2：均匀量化器

```
原文公式：Q(r) = ⌊r/S⌉ + Z
原文公式：r̂ = S(Q(r) - Z)
```

**人话翻译**（用一个具体例子）：
- 假设权重张量 r 的范围是 [-2.0, 2.0]，要量化到 int8（[-128, 127]）
- scaling factor S = 4.0 / 255 ≈ 0.0157
- zero-point Z = 0（对称量化）
- 当 r = 0.5 时，Q(r) = ⌊0.5/0.0157⌉ + 0 = 32
- 反量化：r̂ = 0.0157 × (32 - 0) = 0.502（损失 0.002）

**每一项的来源**：
- S 由 Min-Max Moving Average Observer 在校准数据上观测得到
- Z 在对称量化中固定为 0；非对称量化中 Z = -⌊α/S⌉

### 公式 3：Dual-window 合成窗

```
原文公式（合成窗 s）：
s[i] = 1                                  if i ∈ [L_F, L_C]
s[i] = 1 / (⌊(L_C+L_B)/L_C⌋ + 1)         otherwise
```

**人话翻译**：合成窗在"当前 chunk 的有效区段"（L_F 到 L_C 之间，约 6 ms）上权重为 1（保留信号），在"lookback 区段"（L_C 到 L_C+L_B 之间，6 ms）上权重为 1/2（衰减信号）。这样 overlap-add 时 lookback 部分对邻帧的污染被压到最低，**当前帧不需要等下一帧来填补**。

**为什么不直接丢弃 lookback**：因为分析窗（用来算 STFT 的窗）需要 lookback 提高频率分辨率，丢了模型就看不到那段信息；而合成窗只是控制"重建时怎么拼"，可以不依赖 lookback。这个非对称设计是 dual-window 的精髓。

### 算法：QAT 训练循环（伪代码）

```
1. 加载 fp32 预训练权重 θ
2. 应用 mixed-precision 配置（首尾用 bfloat16，中间用 int8）
3. for epoch in range(30):
4.   for batch in fetch_4000_mixtures():
5.     x = mixture
6.     # forward 时插入"假装量化"算子
7.     ŝ = forward_with_fake_quant(x, θ, S_learnable)
8.     loss = multi_resolution_spec_loss(ŝ, s_target)
9.     # backward 时用 STE 让梯度穿透量化算子
10.    ∂L/∂θ, ∂L/∂S = backward_with_STE(loss)
11.    AdamW.step(θ, S_learnable)  # S 也是可学习参数（LSQ）
```

## 实操 FAQ（如果你想复现）

- **模型多大？显存要多少？我的 4070 跑得动吗？**
  - 推理时模型 299 kB（int8 主体 + bfloat16 头尾）。**4070 杀鸡用牛刀**，但官方推理代码是给 GAP9 的，没有 PyTorch CUDA 推理 demo。训练阶段 fp32 全精度模型大约几 MB，单卡 RTX 3090/4070 完全够（论文用了 UW HYAK 集群但具体 GPU 数原文未提）。

- **数据集在哪下？要授权吗？**
  - LibriSpeech：openslr.org，CC-BY 4.0，免费
  - WHAM!：wham.whisper.ai，免费但要填表
  - CIPIC HRTF：interface.cipic.ucdavis.edu，研究用免费
  - RRBRIR / ASH-Listening-Set / CATTRIR：GitHub 公开
  - **全部公开免费可用**，这是这篇论文可复现性的关键之一

- **代码在哪？官方 repo 还活着吗？**
  - 截至 2025-11 论文发表时，**作者主页和 GitHub 上还没看到本工作的开源代码**——原文未提供 repo 链接（通常 SIGCOMM/MobiCom 投稿时不强制 release）。
  - 同组 GitHub（github.com/uw-x）有 ClearBuds、Semantic Hearing、Target Speech Hearing 等前作的代码，可参考代码风格
  - GAP9 推理框架 nn_menu_gap9 在 github.com/GreenWaves-Technologies/nn_menu_gap9（开源）

- **推理一次要多久？**
  - 在 GAP9 上 5.54 ms / 6 ms 帧；在 RTX 4070 上估计 < 0.1 ms（但没意义，目标硬件就是 GAP9）

- **训练一次要烧多少卡时？预估成本？**
  - 第一阶段 200 epoch × 20k mixtures × 5s = 约 5500 小时音频处理；按单卡 RTX 3090 估计 3-7 天
  - QAT 阶段 30 epoch × 4k mixtures = 短得多，估计 12-24 小时
  - **总成本估计单卡 5-10 天**；用 4-8 卡集群可压到 1-2 天

- **GAP9 开发板哪里买？**
  - GreenWaves Technologies 官网（greenwaves-technologies.com），带评估板 GAPmod 大约几百欧元
  - 想完全复现 NeuralAid 硬件需要自己设计 5 块 PCB——这部分论文没开源 schematic

## 失败案例与边界

论文里没有专门的 "failure case" 章节，但从评测数据里可以读出几个边界：

- **量化失败**（Table 3）：纯 int8 PTQ 时 SISDRi 直接降到 -1.70 dB，意味着模型完全坏了，输出比输入还糟。教训是"深网络 + 多 sub-component" 对量化误差极敏感，必须 mixed-precision + QAT。
- **wireless 距离边界**（Fig. 6）：超过 3 米 BLE 吞吐量降到 200 kbps 以下，超过 7 米基本不能用。**用户场景**：戴助听器去会议室开会、坐在餐厅另一桌——蓝牙到手机的连接会断断续续。
- **TinyDenoiser 反例**（Fig. 8）：TinyDenoiser 噪声抑制 MOS 从 2.15 升到 2.38（小升），但**整体 MOS 从 2.96 掉到 1.96**——降噪同时把语音也"咬碎"了。这是 over-denoising 的经典反例，提醒我们评指标不能只看 SNR。
- **未测的极端场景**：风噪、强混响（教堂、地铁站台）、多人快速切换说话——论文 6 个室内外场景里没有这类极端环境。在线评论中助听器用户最常抱怨的"地铁里听不清"问题，本工作没正面回答。
- **听损人群未覆盖**：用户研究里没区分听力正常 vs 听损者，所以严格说这是个"健康人降噪耳塞" demo，不是真正意义的"医疗级智能助听器"。

## 这篇论文之后的延伸阅读

**前传 / 必读基础**（不读这些读本文会卡）：
1. **TinyLSTM / TinyDenoiser** [19, 45] —— 本文最强 baseline，理解它就理解了"on-device 语音降噪"的最基础玩法
2. **TF-GridNet** [59] —— 本文神经网络起点，dual-path 时频域 SOTA
3. **Wang et al. STFT-domain neural speech enhancement with very low algorithmic latency** [60] —— dual-window 思想出处

**同组续作 / 兄弟工作**：
4. **Look Once to Hear (CHI '24)** [58] —— 同组前作，target speech extraction，但跑在 Orange Pi 上
5. **Sound Bubbles (Nature Electronics '24)** [10] —— 距离感知的语音过滤，未来可能搬到 NeuralAid 平台
6. **TF-MLPNet (Clarity Challenge '25)** [24] —— 同作者的更小更快后续，可能是 NeuralAid 下一代候选模型

**竞争对手 / 平行工作**：
7. **DeepFilterNet2** [49] —— 另一条流派的实时语音增强，专门为嵌入式设计但没在 sub-100mW 硬件验证
8. **OmniBuds (arXiv '24)** [33] —— 类似的 sensory earable platform，但闭源、没做 speech AI

**量化技术深挖**：
9. **Esser et al. Learned Step-Size Quantization** [17] —— LSQ 原始论文
10. **Cohen et al. Fully Quantized NN for Audio Source Separation** [16] —— 全量化语音分离的近邻工作



零基础读者建议这样读，每步给一句为什么：

1. **先看 abstract 和 Fig. 2（戴在耳后的照片）** — 1 分钟知道这是什么东西、解决了什么实际问题。如果你是冲方法来的，这步可以让你判断要不要继续读。
2. **跳到 Table 3** — 这是全文的"成绩单"。看四列数字（SISDRi / Memory / Runtime / Power）在四种量化策略下怎么变化。能看懂"为啥 int8 PTQ 是 -1.70 dB"就抓住了核心 motivation。
3. **回头读 §2.2.2 神经网络架构** — 配合 Fig. 3C 看 dual-path 是怎么从 TF-GridNet 改过来的。**频率压缩 + GRU 替代 LSTM** 这两个改动是关键，记住即可。
4. **读 §2.3.4 QAT 部分** — 这是论文真正的方法贡献。看懂"为啥 mixed-precision 不够还要 QAT"就理解了 7.86 → 0.57 dB 这个改进的意义。
5. **跳读 §3.2 用户研究** — 看 Fig. 8 的两组柱状图就够了。重点是 TinyDenoiser 的 overall MOS 反而下降这个反例。
6. **跳过 §2.1 硬件细节**（除非你做嵌入式硬件）— 五块 PCB 怎么连、I2S 时钟怎么对齐这种工程细节，零基础读者读了也用不上，看看 Fig. 1 的全家福印象即可。

## 为什么值得读 / 不值得读

如果你只能读 1 篇：跳过这篇，读 LLaVA 或 RT-2，因为它们方法论的影响面更广。

如果你能读 3 篇：还是不读，3 篇的预算不够覆盖这种垂直方向。

**如果你能读 5 篇且对边缘部署有兴趣，这篇必读**。它是把"streaming neural net 装进 sub-100mW 设备"的开门级工程参考——QAT + mixed-precision 这套打法，未来你做任何"机器人本体跑大模型"的工作都会用到。

如果你只关心 VLA 大模型和高层规划，这篇偏远，扫一眼 abstract 和 Table 3 就够，主要是了解"业界把模型部署到边缘需要哪几把钥匙"。
