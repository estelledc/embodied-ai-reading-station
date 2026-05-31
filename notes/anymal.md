---
title: "AnyMAL: An Efficient and Scalable Any-Modality Augmented Language Model"
slug: anymal
topic: multimodal
difficulty: ⭐⭐⭐
status: auto-summary
来源: papers/anymal/paper.pdf
venue: EACL
year: 2023
era: classic
num: 99
generated_at: 2026-05-31
---

# AnyMAL 精读笔记

## TL;DR

一句话：Meta 用一个**轻量"翻译器"**，把图像、视频、音频、IMU 运动信号都翻成 LLaMA-2 能听懂的"伪文字 token"，让大语言模型不用重新训练就能"看图、听声、感知动作"。

三件让人眼前一亮的事：

- **不动 LLM 主干**：LLaMA-2-70B 全程冻结，只训前面那个小投影层（projection layer），训练成本骤降，70B 模型一张 80GB A100 就能跑。
- **真正的"任意模态"**：不是"文+图"或"文+音"二选一，而是图、视频、音、IMU 四种全上，还能一次喂进去多种（比如"图片 + 你正在骑车的运动信号"一起推理）。
- **手工 MM-IT 数据集**：自己花钱标了 60K 条多模态指令-回答对，专门捕捉"必须看图才能答"的开放式任务（写诗、找电话号、推荐菜）。

实验上，COCO 图片描述 +8.4 CIDEr，VQAv2 +7%，AudioCaps +14.5 CIDEr，IMU 描述更是开了一个全新任务（52.5 CIDEr）。

*所以这一节是想说：AnyMAL 的卖点是"冻结 LLM + 每个模态配一个翻译器"的可扩展配方，把 LLM 的推理能力"白嫖"给所有模态。*

---

## 这是个什么场景

想象你雇了一个**只会读中文的超级聪明顾问**（这就是 LLaMA-2）。他读书破万卷、推理能力一流，但闭着眼、捂着耳朵——你只能用文字字条跟他沟通。

现在你希望他也能：

- 看你拍的照片，给你写段诙谐的图说
- 听一段录音，猜你在哪儿
- 感知你戴的手表里 IMU（惯性测量单元，就是手机里那种检测翻转/走路的传感器）信号，知道你在骑车
- 同时综合"图片 + 运动"两路信号，给你写朋友圈文案

最直接的办法是：把图片、声音、运动数据**翻译成中文短语**塞给他。可这些信号长得跟语言完全不一样——一张图是几百万像素，一段音频是几千个采样点，IMU 是 6 轴时间序列。怎么"翻译"？

AnyMAL 解决的就是这件事：**给每种模态配一个小翻译模块，把信号塞进 LLM 的"词嵌入空间"，假装它们也是 token**。然后 LLM 就一视同仁地处理"真 token + 假 token"的混合序列。

它服务的下游任务范围很广：

- 图像描述（COCO captioning）
- 视觉问答（VQAv2、TextVQA、ScienceQA、VizWiz、OKVQA、Hateful Meme）
- 音频描述（AudioCaps）
- 视频问答（STAR、How2QA、NextQA）
- IMU 运动描述（Ego4D，全新任务）
- 多模态交错推理（图片 + IMU 联合输入）

*所以这一节是想说：AnyMAL 想造一个"五感俱全"的多模态助手，输入端任意组合，输出永远是文字。*

---

## 之前的人怎么做

先把场上几位选手摆出来：

- **Flamingo / OpenFlamingo**（DeepMind 2022 / 2023）：开创"冻结 LLM + 跨注意力插入图像 token"思路，但参数闭源、模态局限于图像和视频。
- **BLIP-2**（Salesforce 2023）：用 Q-Former 把 ViT 的视觉特征压缩成几十个 token 喂给 LLM。聪明，但只支持图像。
- **LLaVA / MiniGPT-4**（2023）：直接用 GPT-4 蒸馏的指令数据微调 LLaMA + CLIP，效果不错但走的是"图+文"二元路线。
- **PaLM-E**（Google 2023）：把机器人的传感器信号也接进 LLM，但用的是闭源 PaLM。
- **Video-LLaMA / PandaGPT / Macaw-LLM**：尝试同时支持音视频，但模态扩展性受限于训练数据和工程实现。

这些方案的共同短板：

1. **模态偏食**：要么只做图，要么只做音视频，没把 IMU 这种工业传感器接进来。
2. **要么用闭源 LLM，要么 LLM 规模上不去**：开源里很少看到 70B 量级的多模态模型，因为训练成本扛不住。
3. **指令数据靠 ChatGPT/GPT-4 蒸馏**：法律灰色地带，且天花板被老师模型限住。
4. **不支持"多模态交错输入"**：你不能同时塞一张图和一段 IMU 信号让模型联合推理。

AnyMAL 想一次把这几个洞都填了：开源 + 70B + 4 种模态 + 自标注数据 + 交错输入。

*所以这一节是想说：之前的多模态 LLM 各自占一隅；AnyMAL 在做"统一战线"，关键是让方案足够便宜以容纳更大 LLM 和更多模态。*

---

## 新想法

AnyMAL 的核心 insight 可以拆成三条：

**① 不要重新发明轮子，让 LLM 维持原貌。**

之前很多工作会把视觉特征通过跨注意力（cross-attention）插进 LLM 的中间层，这意味着要改 LLM 的结构、要重新训练或微调。AnyMAL 反其道——**只在输入端动手脚**：把模态特征转成"长得像 token embedding 的东西"，从最前面塞进 LLM。LLM 内部权重一行不动。

类比：你不是给翻译官换大脑，而是雇了几个"前台翻译"，把日语、法语、手语都先变成中文，再交给翻译官。

**② 利用"已经对齐过文字"的预训练编码器。**

随机初始化一个图像编码器从头训对齐 LLM，要 200M+ 数据慢慢磨。AnyMAL 走捷径：直接拿 CLIP（已经对齐过文字）、CLAP（音频对齐文字）、IMU2CLIP（IMU 对齐文字）做基底。这些编码器的输出空间已经"半成品对齐"了，再加个轻量投影层就能映到 LLM 词嵌入空间。

类比：日语翻译先把日语变成英语，你只要再训一个"英→中"的转换头，比直接训"日→中"快得多。

**③ 量化 + 投影层训练 = 大模型也能玩。**

70B 模型本来要 FSDP（多卡分片）才能装下。AnyMAL 用 4-bit / 8-bit 量化把 LLaMA-2-70B 压到一张 A100 80GB 卡里，又因为 LLM 是冻结的、只训投影层，参数量 << 模型量，单卡 batch size 4 就能开练。

加分项：他们还自己花钱标了 60K 条 MM-IT（multi-modal instruction tuning）数据，专门捕捉"开放式、必须看图"的复杂指令——区别于业界常用的 GPT-4 蒸馏数据。

*所以这一节是想说：核心创新不在某个新模块，而在"把 LLM 当黑盒只在输入端做翻译 + 量化降本 + 高质量手工指令数据"这三件事的组合。*

---

## 方法分步

### 阶段 1：模态对齐预训练（Modality Alignment Pre-training）

**目标**：让每种模态的编码器输出，能被映射到 LLM 的词嵌入空间，且映射后的"假 token"能驱动 LLM 生成对应的文字描述。

**流程**（以图像为例）：

1. 拿一张图 X_image，过 CLIP ViT-G 编码器得到视觉特征 g(X_image)。
2. 把 g(X_image) 喂给 **Perceiver Resampler**（投影模块），输出 64 个"伪 token"（叫 Z_modality）。
   - Perceiver Resampler 类比：你有一堆杂乱的笔记，让一个秘书把它精炼成 64 张小卡片。秘书的工作方式是"用一组可学习的查询向量去注意力提取笔记重点"。
3. 拼接序列：[Z_modality, Z_text]，送进冻结的 LLaMA-2。
4. 让 LLM 预测下一个 token 应该是 X_text 中的什么词，按交叉熵损失反向传播。
5. 因为 LLM 冻结，梯度只更新 Resampler 的参数。

**关键公式翻译**：

$$p(X_{text}|X_{modality}) = \prod_{i=1}^L p_\theta(X_{text}^{[i]} | Z_{modality}, Z_{text}^{[1:i-1]})$$

人话：在已知"模态 token + 之前的文字 token"条件下，预测下一个文字 token。这是标准的自回归语言模型损失，只是前缀里多了几十个伪 token。

**各模态的具体配置**：

| 模态 | 编码器 | 投影 | token 数 | 数据量 |
|------|--------|------|----------|--------|
| 图像 | CLIP ViT-L / ViT-G / DinoV2 | Resampler (6 层) | 64 | 200M（LAION-2B 子集） |
| 视频 | Internvideo | Resampler (4 层) | 32 | 28M（HowTo100M） |
| 音频 | CLAP | Linear (1 层) | 32 | 2.2M（AudioSet+AudioCaps+CLOTHO） |
| IMU | IMU2CLIP | Linear (1 层) | 32 | 528K（Ego4D） |

**量化（quantization）小贴士**：作者用 QLoRA 那套 4/8 bit 量化技术，把 LLaMA-2-70B 的权重压缩约 8 倍，让 80GB 单卡能放下。推理时才换回全精度跑。

### 阶段 2：多模态指令微调（MM-IT Fine-tuning）

预训练完模型只会"看图说话"，但不会"看图回答你刁钻的问题"。所以再来一轮指令微调。

**数据**：
- **手标 60K 条**：找了一批人工标注员，给开源协议图片配指令-回答对。要求"必须看图才能答"，避免那种"问图里有什么 → 答一只猫"的浅层 QA。
- **合成 150K 条**：用 LLaMA-2-70B 自己（注意不是 GPT-4）基于图像的"文本表示"（caption + bbox + 物体列表）生成 QA 对。

**输入格式**：
```
[<system_message> <instruction> <modality_tokens>]
```

**两种微调方式（消融对比）**：
- 只训投影层（projection-only）
- 加 LoRA 到 LLM（让 LLM 也能微调一点点，但不动主干权重）

最终选用 LoRA + projection 联合微调（r=64, α=16, 3000 步, batch 128, lr 1e-5）。

### 阶段 3：推理

推理时 LLM 切回**全精度**（量化只在训练时省显存），保证生成质量。多模态交错输入也是这套流程：把图、IMU 各自过自己的投影层得到伪 token，按顺序拼在文字 prompt 前面就行。

*所以这一节是想说：方法很"工程"——预训练投影层做对齐，量化降本上 70B，指令微调救开放式任务。每个模态一个翻译器，一个一个加。*

---

## 关键数字

| 指标 | 数值 | 怎么读 |
|------|------|--------|
| LLM 参数量 | 70B（LLaMA-2-70B-chat） | 当时开源最大 chat 模型 |
| 投影层 token 数 | 64-256 | 模态信号被压成几十个伪 token |
| 图像预训练数据 | 200M | LAION-2B 经 CAT 方法过滤后子集 |
| 音频预训练数据 | 2.2M | AudioSet + AudioCaps + CLOTHO |
| IMU 预训练数据 | 528K | Ego4D 头戴设备同步 IMU |
| 视频预训练数据 | 28M | HowTo100M |
| MM-IT 手标数据 | 60K | 自己花钱标 |
| MM-IT 合成数据 | 150K | LLaMA-2 自合成 |
| 训练硬件 | 单张 A100 80GB（量化后） | bsz=4 就能跑 70B |
| 图像预训练 batch size | 2048 | bsz=16K 没明显增益 |
| 图像预训练步数 | 100k | |
| **COCO 字幕（CIDEr）** | **99.5 (13B) / 95.9 (70B)** | 之前 SOTA: IDEFICS-80B 91.8 |
| **VQAv2 准确率** | **67.8%（MM-IT）** | 之前 SOTA: BLIP-2 65.0 |
| **Hateful Meme AUC** | **69.1** | 之前 SOTA: IDEFICS-80B 60.6 |
| **AudioCaps CIDEr** | **77.8 (70B)** | 之前 SOTA: PANNs+BERT 66.7 |
| **STAR 视频 QA** | **48.2%** | 之前 SOTA: BLIP-2 42.2 |
| **IMU 描述 CIDEr** | 52.5 | 全新任务，无对比基线 |
| 人工评测开放式任务胜率 | AnyMAL 41.1% vs 人类 ground truth | LLaVA 仅 34.4% |

几个值得停下来想的点：

- **13B 在 COCO 上居然超过 70B**：作者解释 LLaMA-70B 太啰嗦，COCO 标注偏简短，导致 CIDEr 反而低。说明评测指标有时候不是越大越好。
- **DinoV2 不如 CLIP**：自监督编码器没经过文字对齐，输出空间和 LLM 词嵌入差太远，投影层学不动。再次印证"用文字对齐过的编码器"是关键。
- **bsz 16K 增益不大，但 Resampler 加深从 2 层到 6 层显著降 loss**：意味着投影层结构 > batch size 规模。
- **70B 在音频任务上比 7B/13B 强很多**：说明开放式音频推理需要 LLM 的世界知识来"脑补"，模型越大越能联想。

*所以这一节是想说：数字告诉你两件事——AnyMAL 在主流多模态 benchmark 上确实 SOTA；scaling 模型尺寸 vs 投影层结构的回报曲线很不一样。*

---

## 应该懂的新词

- **modality（模态）**：一种感知或表达通道。文字、图像、声音、运动信号各是一种模态。
- **encoder（编码器）**：把原始信号（像素、波形、传感器读数）压缩成"特征向量"的神经网络。CLIP 就是图像编码器，CLAP 就是音频编码器。
- **embedding space（嵌入空间）**：高维向量空间，每个 token、特征都是其中一个点。LLM 内部就活在它的"词嵌入空间"里。
- **projection layer / aligner（投影层 / 对齐器）**：把 A 空间的向量映射到 B 空间。这里就是把"图像特征空间"映到"LLM 词嵌入空间"。
- **Perceiver Resampler**：Flamingo 提出的投影模块。机制是用一组**可学习的 latent 查询向量**去 cross-attend 编码器输出，把任意长的视觉序列压成固定数量的 token。类比：一群"采访记者"（latent）去问"被采访者"（视觉特征），最后整理成固定篇幅的稿子。
- **CLIP / CLAP / IMU2CLIP**：三个对比学习预训练编码器。CLIP 用图-文对，CLAP 用音-文对，IMU2CLIP 用 IMU-文（基于 Ego4D 的同步注释）对，都把"模态特征"和"文字特征"拉到同一个空间。
- **LoRA（Low-Rank Adaptation）**：一种参数高效微调方法。不直接改 LLM 主权重 W，而是加一个低秩矩阵 ΔW = AB，只训 A、B 这两个小矩阵。类比：原画不动，旁边加张"补丁透明胶片"。
- **QLoRA / quantization**：把模型权重从 16-bit 浮点压缩到 4-bit 或 8-bit 整数，显存占用降一个量级。配合 LoRA 微调，可以在小卡上调大模型。
- **FSDP（Fully Sharded Data Parallel）**：PyTorch 的多卡分片训练框架，把模型权重切成几份分布在多张卡上。AnyMAL 用量化绕开 FSDP，省一半 GPU。
- **instruction tuning（指令微调）**：用"指令-回答"格式的数据微调模型，让它从"会预测下一个词"变成"会按指令做事"。MM-IT 就是多模态版指令微调数据集。
- **zero-shot evaluation（零样本评测）**：模型从没在评测数据集上训过，直接拿来测。考察泛化能力。
- **CIDEr / SPICE / ROUGE-L**：图像/音频字幕的自动评测指标。CIDEr 看 n-gram 共识度，SPICE 看场景图重叠，ROUGE-L 看最长公共子序列。
- **VQA（Visual Question Answering）**：给一张图加一个问题，输出答案。AnyMAL 测了 6 个不同 VQA benchmark。
- **IMU**：Inertial Measurement Unit，惯性测量单元，含加速度计 + 陀螺仪，能检测设备运动状态。Ego4D 头戴相机里有一个，能告诉你戴的人在走、在骑车、还是在低头。
- **interleaved modalities（交错模态）**：一次输入里多种模态混合，比如"图像 + IMU"组合。AnyMAL 的架构允许这种灵活拼接。

*所以这一节是想说：术语只是工程术语，背后逻辑都很朴素——编码 → 投影 → 拼接到 LLM 输入端 → 输出文字。*

---

## 搞不定的

作者自己列的三个限制（Section 7）：

**① 输入对齐"软"，模型容易脑补。**

LLM 偏向"按自己的语言模型概率"输出，而不是严格按图像信号输出。结果是有时图里没有的东西也会编出来（就是俗称的"幻觉"）。要根治可能要解冻 LLM 参数训练，但成本会爆炸。

**② 视觉知识被训练数据量卡住。**

虽然用了 200M 图，但很多长尾概念（特定地名、罕见物种）依然不认识。作者建议引入"外部知识检索"（类似 RAG）来兜底，但本文没做。

**③ 只支持 4 种模态。**

触觉、3D 点云、热成像、雷达等都没覆盖。理论上方法可扩展，但每加一种都需要"配对数据 + 预训练编码器 + 投影层训练"三件套。

我自己读完还想到几点：

**④ MM-IT 数据规模偏小**：60K 手标 + 150K 合成对 70B 模型来说不算多。Object Recognition 分数在指令微调后反而降了（85.4 → 79.3），作者的解释是"标注偏好简洁回复"，但也可能是数据不够多元。

**⑤ 视频处理是用图像编码器抽帧**：AnyMAL-Image 70B 在 STAR/How2QA/NextQA 上居然比 AnyMAL-Video 还好。说明专门的视频时序建模没带来增益，反而是单帧 + LLM 推理够用。这暗示了"视频理解 = 选帧 + 图像理解"还是一个值得继续挖的范式。

**⑥ 交错模态的实证只有定性例子**：Table 11 里展示了"图 + IMU"联合推理，但没有量化的多模态交错 benchmark。这是后来工作可以接上的地方。

*所以这一节是想说：AnyMAL 是配方而不是终点——幻觉、知识天花板、模态广度都还有大空间。*

---

## 与别篇关系

- **Frozen（[1]，2021）**：AnyMAL 直接继承"冻结 LLM + 训练投影层"的思想，把 LLM 升级到 LLaMA-2-70B，编码器换成更强的 CLIP/CLAP/IMU2CLIP。
- **Flamingo（[2]，2022）**：Perceiver Resampler 这个模块来自 Flamingo。但 Flamingo 用了 cross-attention 插入 LLM 中间层，AnyMAL 只在输入端拼接，更轻。
- **BLIP-2（[3]，2023）**：BLIP-2 的 Q-Former 也是把视觉特征压缩成几十个 token。AnyMAL 算 BLIP-2 的"扩展+换大 LLM+多模态版"。
- **LLaVA（[20]，2023）**：LLaVA 用 GPT-4 合成指令数据。AnyMAL 自己手标 + 用 LLaMA-2 合成（避开闭源依赖），并扩展到音频/IMU。
- **InstructBLIP（[19]，2023）**：直接竞品，AnyMAL 在主观评测上超过它（41.1% vs 16.7% 胜率）。
- **PaLM-E（[18]，2023）**：把传感器接进 LLM 的代表作，但用闭源 PaLM。AnyMAL 是开源版同思路。
- **LLaMA-Adapter / mPLUG-Owl / Video-LLaMA / PandaGPT / Macaw-LLM**：同期"LLM + 多模态"的各种排列组合，AnyMAL 在数据规模和模态广度上更猛。
- **IMU2CLIP（[33]，2022）**：本文第一作者 Moon 自己之前的工作，把 IMU 信号对齐到 CLIP 文本空间。AnyMAL 复用了这个编码器。
- **QLoRA（[40]，2023）**：本文用的量化技术。
- **后续影响**：AnyMAL 这套"冻结 LLM + 模态翻译器"的范式，后来被 NExT-GPT、Unified-IO 2、AudioGPT 等延续。也成为机器人领域 VLA（vision-language-action）模型的输入端思路雏形——RT-2、OpenVLA 类的工作都借鉴了"把感知信号 token 化"的思想。

*所以这一节是想说：AnyMAL 不是凭空造的，是 Frozen → Flamingo → BLIP-2 一路改进的集大成；它向后启发了通用多模态助手与机器人 VLA 模型。*

---

## 阅读顺序

如果你时间有限，按这个顺序看：

1. **Abstract + Section 1（10 分钟）**：抓住 AnyMAL 的三件事——任意模态 / 冻结 LLM / 手标 MM-IT。
2. **Figure 2 + Section 3.1 前半（15 分钟）**：理解"对齐预训练"流程图，公式 1-2 的人话翻译。
3. **Section 3.2（10 分钟）**：看 MM-IT 数据怎么造的，为什么手标。
4. **Table 2、4、5（15 分钟）**：用三张主表把图像字幕、VQA、音频字幕的数字对比一遍，体会胜负。
5. **Section 4.3（10 分钟）**：定性例子——AnyMAL 和基线对比，最直观。
6. **Appendix B.3（5 分钟）**：超参数表，要复现的话照着来。
7. （可选）Section 7 限制 + Section 5 安全：知道作者自己心虚的地方在哪。

如果你是机器人/embodied 方向：重点看 IMU 那部分（Section 4 IMU Motion Description + Table 8），它才是 AnyMAL 跟具身智能最相关的骨头。

*所以这一节是想说：先抓配方图（Figure 2），再看数字（Table 2/4/5），最后看定性例子和限制就够。*

---

## FAQ

**Q1：为什么不直接微调整个 LLM 端到端？**

A：成本太高。70B 模型端到端训练需要几百张 A100，AnyMAL 用冻结 + 量化把成本压到单卡 80GB。代价是 LLM 主干不会变得更"懂图像"，只是学会"读懂被翻译过来的伪 token"。

**Q2：投影层用 64 个 token 够吗？图像信息会不会丢？**

A：作者做了消融，64 vs 256 token 的训练 loss 差别很小（Figure 4）。说明 LLM 主要靠语言推理填补，而不是从图像里抽取细节。这也部分解释了为什么 TextVQA（需要读出图像里的文字）表现一般——细粒度信息确实丢了。

**Q3：MM-IT 的手标 60K 真的值得吗？**

A：表 3 显示，用合成 150K 单独训：响应准确率 54.2；加上手标 60K：58.0。手标这 60K 拿到了 +3.8 个百分点。考虑到合成数据的 zero cost vs 手标的高单价，是不是值得见仁见智，但作者强调这些手标是"必须看图"的高难度任务，合成数据替代不了。

**Q4：AnyMAL 能不能扩展到机器人控制？**

A：理论上可以——把"控制信号"作为新模态，配上动作编码器和投影层即可。但本文没做。后续工作（如 RT-2、OpenVLA）用类似配方做了机器人 VLA 模型，但它们通常需要解冻 LLM 来学动作输出。

**Q5：13B 比 70B 在 COCO 上更好怎么解释？**

A：CIDEr 这个指标依赖 n-gram 重叠。LLaMA-70B 倾向写更长更精致的描述，COCO 标注却很短（"A man riding a bike"），导致 70B 的"更好的描述"在 CIDEr 上吃亏。换 MM-IT-Cap（描述更长）测，70B 就追上来了（15.7 vs 15.5）。

**Q6：为什么 DinoV2 编码器表现不如 CLIP？**

A：DinoV2 是自监督训练的，没经过文字对齐。它的特征空间和 LLM 词嵌入空间"语义距离"太远，投影层学不动。CLIP/CLAP/IMU2CLIP 都是预先和文字对齐过的，所以投影层只需要做"轻微调整"，效率高很多。这是个工程上很重要的教训：**多模态 LLM 配的编码器最好选"用文字对齐过的"**。

**Q7：交错多模态输入的训练数据从哪来？**

A：作者没专门为"交错输入"训练，而是依赖单模态预训练后的"组合泛化"——每个模态各自训得好，推理时拼起来 LLM 自然能联合处理。Table 11 展示的"图 + IMU 一起推理"是 zero-shot。这点很神奇但也很脆弱，作者也承认没系统评测。

*所以这一节是想说：常见疑问背后都有工程权衡——成本、指标、对齐质量、数据成本。*

---

## 延伸阅读

按"先看哪个最有用"排序：

1. **Flamingo（Alayrac et al. 2022, NeurIPS）** — Perceiver Resampler 的来源，对齐+插入 cross-attention 的奠基工作。看完才能理解 AnyMAL 哪些是"继承"哪些是"换路"。
2. **BLIP-2（Li et al. 2023）** — Q-Former 投影 + 冻结 LLM 范式。AnyMAL 的最直接竞品。
3. **LLaVA（Liu et al. 2023）** — 视觉指令微调的代表，AnyMAL 的 MM-IT 在思想上是 LLaVA 升级版。
4. **IMU2CLIP（Moon et al. 2022）** — 同一作者的前作，IMU 模态如何对齐文字。理解 AnyMAL 的 IMU 那部分必读。
5. **QLoRA（Dettmers et al. 2023）** — 量化 + LoRA 微调，AnyMAL 训练能跑得起的关键工程。
6. **PaLM-E（Driess et al. 2023）** — 把机器人传感器接进 LLM 的另一思路，可以和 AnyMAL 对比"开源 vs 闭源 / 输入端拼接 vs cross-attention"。
7. **Ego4D（Grauman et al. 2022, CVPR）** — IMU 数据来源。要真正复现 AnyMAL 的 IMU 部分必须懂这个数据集。
8. **CLIP（Radford et al. 2021）** — 图像-文字对齐的基石。所有现代多模态 LLM 都在它的肩膀上。
9. **LLaMA-2 技术报告（Touvron et al. 2023）** — 主干 LLM。要理解为什么"冻结也能强"得读 LLaMA-2 的训练流程。
10. **后续延伸**：NExT-GPT（Wu et al. 2023，输入+输出都多模态）、Unified-IO 2（多模态统一架构）、Macaw-LLM（也做四模态但更小）— 都是 AnyMAL 路线的延续/对照。

如果你的兴趣是具身智能（embodied AI），AnyMAL → PaLM-E → RT-2 → OpenVLA 是一条把"多模态感知接进 LLM"的演化主线，可以连着读。

*所以这一节是想说：AnyMAL 是节点不是终点，往前追到 Flamingo/CLIP，往后接到 VLA 模型，一条线就清楚了。*
