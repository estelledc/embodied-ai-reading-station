---
title: "AudioLM"
slug: audiolm
topic: auditory
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2209.03143"
venue: TASLP
year: 2023
era: classic
num: 16
generated_at: 2026-07-01
---

# AudioLM：语义 token + 声学 token 的「音频 GPT」

> 零基础可读精读笔记。数字来自 arXiv:2209.03143 原文 Table I–IV。

## 一句话讲什么（TL;DR）

Google **AudioLM** 把波形变成 **两套离散 token**——**w2v-BERT 语义 token（25 Hz）** 管长程内容，**SoundStream 声学 token（50 Hz×12 层 RVQ）** 管高保真音色——再用 **三个 0.3B Transformer** 分阶段自回归续写；**3 秒**未见说话人提示即可续出 **语义连贯、音色一致** 的语音，听众 **51.2%** 辨真/假（≈随机 **50%**）。

*所以这一节是想说：AudioLM 立住「音频 = token LM + 语义/声学分层」，是 Ch20 听觉生成范式的起点。*

---

## 这是个什么场景

朋友语音发到一半断了：「今天天气真不错——」。你希望手机自动接上后半句，且：

- 还是 **你的嗓音**；
- **语调自然**，不像导航腔；
- **意思接得上**，不蹦「香蕉去火星」。

老路线像传话游戏：**ASR → 文本 LM → TTS**，路上丢掉笑声、呼吸、背景钢琴、个人音色。

**ASR–LM–TTS 丢什么？** 副语言（ hesitation、笑声）、**非语言声源**（音乐、环境音）、**与文本不对齐的韵律**。AudioLM 直接在 **声学 token 空间** 续写，保留 **prompt 里的录音条件**（混响、底噪），续写时 **延续同一「声学场景」**——Table III **92.6% 同说话人** 即证据。

**AudioLM** 跳过「字」中介，直接在 **音频 token** 里做 GPT 式续写——像 **听着你哼的前 3 秒直接接哼**，而非先转乐谱再请人演奏。

论文还证明：**同一框架** 在 **钢琴续写** 上成立（**40k 小时**钢琴数据），无需乐谱符号。

*所以这一节是想说：AudioLM 要的是 **无文本、长程一致、高音质** 的通用音频生成。*

---

## 之前的人怎么做的，为什么不够好

- **WaveNet / SampleRNN**：原始波形自回归，上下文 **仅几十毫秒**，难保持 **秒级** 结构。
- **Tacotron / FastSpeech**：依赖 **文本–音频配对**，无法「纯听录音续写」。
- **Jukebox**：层级 VQ + Transformer，音乐 **时序连贯** 但 **音质 artifact** 明显。
- **GSLM / textless NLP**：HuBERT 离散 unit + LM，**语义连贯** 但 **单说话人、干净环境、音质有限**。
- **Perceiver AR + SoundStream**：**高音质钢琴**，但 **长程结构** 仍可改进。
- **SoundStream / EnCodec**：神经编解码 **重建强**，但当时多用于 **压缩** 而非 **LM 生成目标**。

**缺口**：现有工作 **要么语义好、要么音质好**，没人把 **互补 token** 拼成 **分层 LM 生成**。

**GSLM 具体差在哪？** 论文对比：GSLM **unit-to-speech 仅单说话人、干净录音**；AudioLM 在 **60k 小时多样数据** 上 **续写 unseen speaker** 且 **主观接近真人**。Jukebox **音乐连贯** 但 artifact 多；Perceiver AR **音质好** 但 **长程结构** 仍不如 **显式 semantic 阶段**。

*所以这一节是想说：AudioLM 的观察是 **两种 tokenizer  trade-off 相反**，必须 **Hybrid + 三阶段**。*

---

## 这篇论文的新想法

**核心公式**：$x \xrightarrow{\text{enc}} h \xrightarrow{\text{LM}} \hat{h} \xrightarrow{\text{dec}} \hat{x}$，其中 $T' \ll T$（token 数比样本点 **少 2–3 个数量级**）。

**Hybrid tokenization（Fig. 1）**：

| Token 类型 | 来源 | 码率/频率 | 擅长 | 弱项 |
|------------|------|-----------|------|------|
| **Semantic** | w2v-BERT XL 第 **7** 层 + **k-means K=1024** | **25 Hz**, **250 bps** | 音素/句法/长程 | **ViSQOL≈1.1** 重建差 |
| **Acoustic** | SoundStream **12 层 RVQ**, 码本 **1024** | **50 Hz**, **6000 bps** | **ViSQOL≈3.9** 高质 | ABX 音素判别差 |

**三阶段 hierarchical LM（Fig. 2）**：

1. **Semantic modeling**：$p(z_t|z_{<t})$
2. **Coarse acoustic**：前 **Q'=4** 层 RVQ，条件 **semantic + prompt coarse**
3. **Fine acoustic**：后 **8** 层，条件 **coarse acoustic**；**3 秒 chunk** 独立缩放

**关键假设**：$p(z_t|z_{<t}, y_{<t}) \approx p(z_t|z_{<t})$——语义 **近似不依赖** 过去声学细节。

*所以这一节是想说：不是一个大 LM 吐所有 token，而是 **先提纲（语义）再上色（声学粗细分两笔）**。*

---

## 它分几步做的（方法）

### 5.1 Tokenizer（冻结预训练）

#### Semantic tokens

**输入**：16 kHz 单声道波形 $x \in \mathbb{R}^T$。

**处理**：

1. **w2v-BERT XL**（**0.6B**，Conformer）提取 MLM 模块 **第 7 层** 1024 维向量（Fig. 3 选层：ABX + sWUGGY/sBLIMP + 主观听感）
2. 向量 **逐维零均值单位方差** 归一化 → **k-means K=1024** → 簇心 ID 为 token
3. 时间下采样：**25 Hz**（每 **40 ms** 一 token），$T_S = T/640$

**输出**：序列 $z \in \{1,\dots,1024\}^{T_S}$，码率 **250 bps**。

#### Acoustic tokens

**处理**：

1. SoundStream 卷积 encoder，stride **(2,4,5,8)** → embedding **50 Hz**
2. **12 层 RVQ**，每层码本 **N=1024**；row-major flatten + **offset** 避免层间 ID 冲突
3. 总码率 **6000 bps**（**600 token/s** = 50×12）

**输出**：矩阵 $Y \in \{1,\dots,1024\}^{T_A \times 12}$，$T_A = T/320$。

**Detokenizer**：SoundStream decoder → 波形 $\hat{x}$（**训练 LM 时 tokenizer 冻结**）。

**为何冻结 tokenizer？** 论文强调：把 **离散化** 与 **序列建模** 解耦，LM 训练只优化 **next-token 交叉熵**，不必端到端反传进 codec。这样 SoundStream 与 w2v-BERT 可以 **独立在大规模数据上预训练**，AudioLM 只消费 **稳定词表**。对读者而言，这类似 **先用 BPE 固定文本词表再训 GPT**，而不是边训 GPT 边改 BPE。

**输入→输出小结（整条语音）**：

- 输入：原始波形
- Tokenizer：波形 → $(z, Y)$ 两套离散 ID
- 三阶段 LM：由 prompt 前缀续写 $(\hat{z}, \hat{Y})$
- Detokenizer：$\hat{Y}$ → 续写波形

*所以这一节是想说：LM 只学 **离散序列**，编解码质量在 **预训练 codec/SSL** 里解决。*

---

### 5.2 Table I：为何必须 Hybrid（消融动机）

| Tokenization | Bitrate | ABX within/across ↓ | ViSQOL ↑ |
|--------------|---------|---------------------|----------|
| Semantic (w2v-BERT) | 250 bps | **6.7 / 7.6** | 1.1 |
| Semantic（匹配 6000 bps） | 6000 bps | 5.6 / 6.2 | 1.4 |
| Acoustic (SoundStream) | 2000 bps | 22.4 / 28.7 | 3.3 |
| Acoustic | **6000 bps** | 17.8 / 26.6 | **3.9** |

**仅 acoustic LM 续写（4 s prompt）**：音色/录音条件保留，但 **语言内容 babbling**——见官网 "Generation without semantic tokens"。

**人话读 Table I**：语义 token 像 **压缩过的「大意」**，音素分得清（ABX 低）但 **放回去听几乎听不懂**（ViSQOL 1.1）；声学 token 像 **高码率 MP3**，听着清楚但 **模型难从码流学句法**（ABX 高）。AudioLM 的 hybrid 就是 **先用大意写剧情，再用高码率配音**。

*所以这一节是想说：Table I 是全文 **逻辑支点**——单流必牺牲一端。*

---

### 5.3 三阶段 Transformer LM

**每阶段同架构**：decoder-only Transformer，**12 层、16 头、1024 维、FFN 4096、dropout 0.1**，T5 相对位置编码 → **约 0.3B 参数/阶段**。

#### Stage 1 — Semantic modeling

- **输入→输出**：语义 token 前缀 → 自回归预测后续 $z$
- **训练**：随机裁剪 **30 s** 等价长度；去除 **连续重复** semantic token（沿用 GSLM 做法）
- **损失**：next-token CE
- **直觉**：像 **写演讲大纲**——只决定 **词与句法走向**，不管 **嗓音厚度**；因此序列 **最短、最便宜**，却对 **7 s 后续是否像人话** 起决定作用

#### Stage 2 — Coarse acoustic modeling

- **建模**：$p(y_t^q | z, y_{<t}^{\leq Q'}, y_t^{<q})$，$q \leq Q'=4$
- **序列顺序**：$(z_1,\dots,z_{T_S}, y_1^1,\dots,y_{T_A}^{Q'})$ flatten
- **训练裁剪**：**10 s**
- **作用**：恢复 **说话人、录音环境、韵律骨架**；条件 **整段 semantic（含续写）** 保证 **内容与生成分一致**

#### Stage 3 — Fine acoustic modeling

- **建模**：$q > Q'$ 的 **8** 层 fine code；**不再看 semantic**（条件独立假设）
- **训练**：**3 s** 非重叠 chunk，可 **更多 RVQ 层** 且 **序列长度与总长解耦**
- **码率**：2000 bps → **6000 bps**，ViSQOL **3.3→3.9**

**为何 Stage 2/3 拆开？** 若一次性预测 12 层 RVQ，序列长度 $\approx T_A \times 12$，自注意力 **平方复杂度** 爆炸。粗四层先定 **是谁在说、在什么房间录**，细八层再在 **3 秒局部窗口** 里补 **齿音、摩擦、混响尾音**——计算上与 **图像先低分辨率再超分** 同构。

**训练细节（三阶段共用）**：Adam 类优化在 **16 路 TPUv4** 上跑 **100 万 step**，batch **256**；Stage1/2/3 分别随机裁 **30/10/3 秒** 等价 token 长度，使 **最耗序列的 stage 用更短 crop**。

*所以这一节是想说：分阶段 = **更短序列 + 条件独立 + 算力可扩展** 三赢。*

---

### 5.4 训练与推理配置

| 项目 | 配置 |
|------|------|
| 数据 | **Libri-Light unlab-60k**（**60k 小时**英文，含噪声） |
| 硬件 | **16× TPUv4**/stage |
| Batch / steps | **256**，**1M steps**/stage |
| 采样温度 | Stage1/2/3 = **0.6 / 0.8 / 0.6** |
| 语音续写 prompt | **3 s** → 生成 **7 s** continuation（主观实验 **10 s** 总长） |

**钢琴域**：内部 **40k 小时**钢琴；codec **3 层 RVQ**、码本 **2^14**；**省略 Stage 3**，两阶段即可；Maestro **4 s** prompt。

**与 GSLM 数据对比**：GSLM 语言模型多在 **Libri-Light 6k 干净子集** 上训练；AudioLM 直接用 **unlab-60k 全量（含噪声、多说话人）**，说明 **框架对录音质量更鲁棒**，降低 **数据清洗成本**——对想复现的人意味着 **不必先筛干净句**。

*所以这一节是想说：Speech 用 **12 层 6000 bps** 满配；Music 可 **减阶段减层** 仍有效。*

---

### 5.5 推理：Continuation 数据流

**输入**：prompt 波形 $x_{\leq prompt}$。

**逐步**：

1. 编码得 $z_{\leq t_s}$、$y_{\leq t_a}^{\leq Q'}$
2. **Stage 1** 自回归生成 $\hat{z}_{>t_s}$
3. **Stage 2** 条件 $(z_{\leq t_s}, \hat{z}_{>t_s}, y_{\leq t_a}^{\leq Q'})$ 续写 coarse acoustic
4. **Stage 3** 分 chunk 生成 fine acoustic
5. **SoundStream decode** → $\hat{x}$（prompt + 续写拼接）

**其他模式**：无条件生成（全采样 $z$）；**Acoustic generation**（用 **GT semantic** 只采样 acoustic，测语义是否锁住内容）。

**Continuation 与 unconditional 区别**：前者 **锁 prompt 的 semantic+acoustic 前缀**，续写 **同一说话人/同一房间**；后者从 **随机语义** 开始，**说话人/场景每次不同**。产品上的「帮我把话说完」对应 continuation。

**主观实验协议（IV-G）**：100 条样本，**前 3 秒真人 + 后 7 秒续写或真人**；听众 **仅根据后 7 秒** 判真假——同时测 **语义、音色连贯、artifact**。

*所以这一节是想说：推理是 **严格 cascade**——前一阶段 **GT 或采样结果** 锁死下一阶段条件。*

---

### 5.6 RVQ 与 offset（读者常卡壳点）

**RVQ 人话**：第 1 层码本抓 **轮廓**（基频走向、能量包络），残差给第 2 层补 **共振峰**，再深层补 **气声与高频**……叠 **12 层** 用 **6000 bps** 还原波形。论文默认 **前 4 层为 coarse**（约 **2000 bps** 已能听清是谁在说话），**后 8 层为 fine**（把 ViSQOL 从 3.3 拉到 3.9）。

**Flatten + offset**：把 $(t,q)$ 变成一维 token ID 时加 $o_i = (i-1 \mod Q) \cdot N$，避免 **不同 quantizer 层共享同一词表索引**。否则 LM 无法区分「第 3 层码 42」与「第 7 层码 42」——就像汉字 **同形异义** 必须靠上下文 disambiguate，offset 直接在 ID 里 **加层号偏置**。

**Stage 1 去重**：训练 semantic 序列时 **删除连续重复 token**（GSLM 同款），因为 w2v-BERT 帧级特征在 **静音/稳定元音** 处易 **卡顿重复**，去重后 LM 更学 **内容转移** 而非 **拉伸同一音素**。

*所以这一节是想说：「一个时间步多个 token」是 **RVQ 残差层级**，不是多麦克风。*

---

### 5.7 流程 ASCII

```
波形 x (16kHz)
    ├─ w2v-BERT L7 → k-means → z (25Hz, 250bps)
    └─ SoundStream → Y (50Hz×12, 6000bps)
              │
    Stage1 LM: z → ẑ          (0.3B, 30s crop)
    Stage2 LM: (z,ẑ,y_coarse) → ŷ_coarse  (0.3B, 10s)
    Stage3 LM: y_coarse → ŷ_fine       (0.3B, 3s chunks)
              │
         SoundStream dec → x̂
```

*所以这一节是想说：三阶段 **参数各 0.3B**，总 **~0.9B** LM + **冻结** 大 SSL/codec。*

---

## 关键数字（What works）

### Token & 模型

| 项目 | 数值 |
|------|------|
| Semantic 频率 / 码率 | **25 Hz / 250 bps** |
| Acoustic 频率 / 码率 | **50 Hz / 6000 bps** |
| RVQ 层数 | **12**（coarse **4** + fine **8**） |
| k-means 簇数 K | **1024** |
| LM 每阶段参数量 | **~0.3B**（共三阶段） |
| 训练数据（语音） | **Libri-Light 60k h** |

### 语义是否锁住内容（Table II，Acoustic generation）

| 来源 | CER ↓ | WER ↓ |
|------|-------|-------|
| 原始音频 | 0.8 | 2.5 |
| SoundStream 重建 | 0.9 | 2.6 |
| **AudioLM**（GT semantic→采样 acoustic） | 3.4 | **6.6** |
| GSLM unit-to-speech | 2.9 | 6.0 |

→ 语义 token **基本承载转写内容**；误差主要在 **专名、句末、背景噪**。

### 说话人信息（Table III，分类准确率 %）

| 设置 | 准确率 |
|------|--------|
| SoundStream 重建 | 100.0 |
| 同 semantic、重采样 acoustic | **3.2** |
| **3 s prompt 续写 7 s** | **92.6** |

→ **音色在 acoustic**；**prompt 同时给 semantic+acoustic** 才能 **保留说话人**。

### 语言学 probing（Table IV，ZeroSpeech 2021 dev）

| Model | sWUGGY all | in-vocab | sBLIMP |
|-------|------------|----------|--------|
| GSLM (causal) | — | 68.7 | 57.1 |
| **AudioLM** | **71.5** | **83.7** | **64.7** |

→ **无文本监督** 下 **sBLIMP 超 phone topline（66.8）** 相对提升 **~8%**。

**读 probing 实验**：sWUGGY 测 **像词不像词**（brick vs blick）；sBLIMP 测 **语法对不对**（dogs sleep vs dog sleep）。AudioLM **因果 LM** 在 **in-vocab sWUGGY 83.7%** 上 **超 HuBERT-only 79.8%**，说明 **纯续写目标** 仍学到 **词汇边界**；sBLIMP **64.7%** 表明 **句法知识** 也被 **semantic AR** 捕获——支持 **「音频 LM = 无转写语言模型」** 叙事。

### 主观与安全

| 指标 | 结果 |
|------|------|
| 人耳辨真/假（10 s，续写 7 s） | **51.2%**（vs 随机 50%，**p=0.23 不显著**） |
| **AudioLM 合成检测器** | **98.6%** 准确率（1 s crop） |
| 钢琴偏好（vs 仅 acoustic LM） | **83.3%** 偏好 full AudioLM |

*所以这一节是想说：人耳难辨 ≠ 机器难辨——**IV-H 检测器** 是 responsible release 的一部分。*

---

## 实验结果说明了什么

1. **Hybrid 必要**：无 semantic → **babbling**；无 fine acoustic → **音质糊**。
2. **Semantic 管「说什么」**：GT semantic 下 ASR **WER ~6.6%** 接近重建 **2.6%** 量级（差在 mapping 噪声）。
3. **Acoustic 管「谁在说、在哪录」**：同 semantic 重采样 → 说话人分类 **~3.2%**（近 chance）。
4. **3 s 零样本说话人续写**：continuation **92.6%** 同说话人——**unseen speaker prompt** 成立。
5. **LM 学到语言学**：sWUGGY/sBLIMP **SOTA（无文本）**。
6. **Seq 微调式 CL 启示（跨域）**：朴素 **LIBERO-90 式 pretrain 害 downstream** 的反面在这里是：**SSL pretrain 强**，但 **LM 阶段数据 60k h raw** 关键。
7. **钢琴泛化**：分层 semantic→acoustic **83.3%** 胜 acoustic-only——**长程结构分离** 不限于语音。
8. **风险与缓解**：续写可 **spoof/冒充**；发布 **98.6% 检测器** + 讨论 bias（Section VI）。

9. **分层抽象的可迁移性**：Ch20 指出同一直觉可用于 **视频（结构/纹理）**、**机器人动作（语义子目标/连续控制）**——读 AudioLM 也是读 **「全局规划 token + 局部渲染 token」** 工程模板。

*所以这一节是想说：实验链 **Table I 动机 → II/III 分解 → IV 语言 → 主观/检测 → 钢琴** 完整闭合。*

---

## 你应该懂的几个新词

- **RVQ（Residual Vector Quantization）**：残差向量量化，多层 codebook **逐层补误差**。
- **Semantic / Acoustic token**：慢变 **内容/句法** vs 快变 **波形细节/音色**。
- **w2v-BERT**：对比学习 + MLM 的 **语音 SSL**；AudioLM 用 **中间层** 非 ASR 头。
- **SoundStream**：端到端 **神经音频编解码器**（对抗 + 重建损失）。
- **ABX / ViSQOL**：音素判别距离 / 感知质量客观代理。
- **sWUGGY / sBLIMP**：零资源 **词汇/语法** 判据（类似「brick vs blick」）。
- **FWT 类比**：AudioLM **续写** ≈ GPT **continue prefix**；非 CL 但 **同一 AR 范式**。

*所以这一节是想说：读 Ch20 后续 **MusicLM / VALL-E / SoundStorm** 都沿用 **semantic+acoustic 分层** 词表。*

---

## 它有什么搞不定的

1. **三阶段串行推理慢**：每 token 多阶段 AR；**SoundStorm** 后作 **并行解码** 加速。
2. **仅英语 60k h 语音主实验**：多语、歌唱、环境音 **需重训 tokenizer**。
3. **无文本条件**：不能做 **TTS「读稿」**；**VALL-E / AudioPaLM** 后加文本。
4. **专名与句末弱**：Table II **CER 3.4%** 主要错 **proper nouns / EOS 位置**。
5. **方言/低资源群体**：Section VI 警告 **accent 代表不足** 时 continuation **不一致**。
6. **人耳难辨但易检测**：**51.2% vs 98.6%**——安全靠 **分类器** 非人类直觉。
7. **算力**：1M steps × 3 stages × TPUv4；非消费级 **实时** 对话。

8. **温度采样敏感**：三阶段温度 **0.6/0.8/0.6** 是手工调参；过高 **语义漂移**，过低 **多样性差**——部署需 **task-specific 调温**。

9. **k-means 语义量化误差**：1024 簇 **不可逆** 损失，靠 **后续 acoustic 阶段** 补细节，无法 **bit-perfect 重建** 原句。

*所以这一节是想说：AudioLM 是 **研究框架** 非产品；工程化靠 **下游 + 并行 + 条件生成**。*

---

## 它和别的几篇是什么关系

- **上游**：**SoundStream**（codec）、**w2v-BERT**（semantic）、**GSLM**（textless 先驱）。
- **横向**：**Jukebox** 层级 VQ 音乐；**Perceiver AR** 高码率 AR；**AudioGen** **文本→音效**（有文本条件）。
- **下游**：**MusicLM**（+MuLan 文本）、**VALL-E**（+文本 **零样本 TTS**）、**SoundStorm**（**并行** acoustic）、**AudioPaLM**（**统一词表** PaLM-2 + audio token）。
- **具身 Ch20 链**：**Whisper** 听懂 → **AudioLM** 生成/预测听觉 → **Proactive Hearing** 选听谁。
- **与扩散（Stable Audio）**：Token LM **AR** vs **扩散** 波形；Ch20 末 **融合趋势**（粗 AR + 细 diffusion）。

**Ch20 路线图位置**：Ch20 在 **Whisper（20.4）** 之后专讲 AudioLM（20.5），形成 **「感知 ASR」→「生成 LM」** 完整听觉闭环；再往后 **Proactive Hearing** 解决 **「听谁」**，**NeuralAids** 解决 **「边缘算力」**——AudioLM 是 **生成侧世界观** 的锚点。

**MusicLM / VALL-E 改动点**：MusicLM 在 Stage1 注入 **MuLan 文本嵌入** 做 **条件生成**；VALL-E 保留 **SoundStream 声学 token**，把 **文本 phoneme** 作为 **额外条件** 做 **零样本 TTS**——**tokenizer 分层思想不变**，只改 **条件接口**。

*所以这一节是想说：AudioLM 是 **2023 音频 Foundation 思潮** 的 **Tokenizer+LM 母版**。*

---

## 和本导读的关系

对应 **[Ch20: 听觉智能](../guide/ch20-auditory.md)** §20.5 **AudioLM** 与 §20.3.8 **语义 vs 声学 token**。建议路径：

1. Ch20 §20.3 **SoundStream/RVQ**（理解 acoustic token 从哪来）；
2. 读本笔记 §5.1–5.3（Hybrid + 三阶段）；
3. Ch20 §20.5.5 **MusicLM / AudioPaLM** 下游；
4. 对照 **Whisper**（判别）vs **AudioLM**（生成）分工；
5. 具身延伸：把 AudioLM 当 **听觉世界模型**（预测下一秒声学事件，Ch20 末）。

*所以这一节是想说：Ch20 在 Whisper 之后用 AudioLM 回答 **「AI 自己听、自己续写」**。*

---

## 思考题

**Q1：为何 semantic 25 Hz、acoustic 50 Hz 仍说 acoustic「快一个数量级」？**

<details>
<summary>提示</summary>

看 **总 bps**：250 vs **6000**；还有 **12 层/步** flatten 后 **序列长度**。

</details>

**Q2：Stage 3 为何可以丢弃 semantic 条件？**

<details>
<summary>提示</summary>

论文假设 $y^{>Q'}$ 在 given coarse acoustic 下 **条件独立** 于 $z$；减序列长度。

</details>

**Q3：GT semantic + 采样 acoustic 实验想证明什么？**

<details>
<summary>提示</summary>

Table II **Acoustic generation**：分离 **内容**（semantic）与 **渲染**（acoustic）职责。

</details>

**Q4：51.2% 人耳 vs 98.6% 检测器，产品应信哪个？**

<details>
<summary>提示</summary>

Section IV-G vs IV-H；**responsible AI** 用 **自动检测** 守门。

</details>

**Q5：AudioLM 与 GPT 为何不能「一阶段生成」？**

<details>
<summary>提示</summary>

Ch20 表：文本 token **语义+拼写一体**；音频 **语义/声学可分离** → 需 **三阶段**。

</details>

**Q6：仅 acoustic LM 钢琴也高清，为何仍要 semantic？**

<details>
<summary>提示</summary>

IV-I **83.3%** 偏好；**旋律/节奏** 长程结构 acoustic-only **崩**。

</details>

**Q7：60k h 噪声 Libri-Light vs GSLM 6k clean，说明什么？**

<details>
<summary>提示</summary>

IV-A：**鲁棒性**；少 **数据清洗** 也可 **强 performance**。

</details>

**Q8：对机器人/具身，AudioLM 最大启发是什么？**

<details>
<summary>提示</summary>

Ch20：**分层 token**（规划 vs 控制）类比 **semantic vs acoustic**；**世界模型式预测** 下一听觉状态。

</details>

---

## 一些好奇心问答（FAQ）

**Q：三个 0.3B 是共享权重吗？**

**A**：**否**，**三份独立** decoder-only Transformer，各训 1M steps。

**Q：prompt 必须同时有 z 和 y 吗？**

**A**：续写要 **semantic + coarse acoustic 前缀**；仅 acoustic 会 **babbling**（Table I 消融）。

**Q：和 VALL-E 一句话区别？**

**A**：AudioLM **无文本** 续写；VALL-E 用 **文本+3s 音色 prompt** 做 **零样本 TTS**，骨架同 **codec+LM**。

**Q：官网 demo 必听哪条？**

**A**：https://google-research.github.io/seanet/audiolm/examples — **「without semantic tokens」** vs full model。

*所以这一节是想说：FAQ 覆盖 **三模型、prompt 组成、与 VALL-E 分工**。*

---

## 如果你想再深入

1. **官网音频样例**（必听）：semantic 消融 + 钢琴对比。
2. **先修**：Ch20 §20.3 SoundStream；**GSLM** 论文对比 textless 线。
3. **下游**：**SoundStorm**（并行）、**MusicLM**（文本条件）、**VALL-E**（TTS）。
4. **检测**：复现 IV-H **1 s CNN 二分类** 理解 **98.6%** 特征。
5. **具身**：Ch20 末 **Token LM vs Diffusion** 表 — 机器人 **动作 chunk** 分层同构。

*所以这一节是想说：AudioLM **听 10 秒 demo 胜过读三遍 loss 公式**。*

---

## 原文信息

```bibtex
@article{borsos2023audiolm,
  title={AudioLM: a Language Modeling Approach to Audio Generation},
  author={Borsos, Zal{\'a}n and Marinier, Rapha{\"e}l and Vincent, Damien and others},
  journal={IEEE/ACM Transactions on Audio, Speech, and Language Processing (TASLP)},
  year={2023},
  note={arXiv:2209.03143}
}
```

- **arXiv**：https://arxiv.org/abs/2209.03143
- **Demo**：https://google-research.github.io/seanet/audiolm/examples

*所以这一节是想说：cite 时区分 **框架 AudioLM** 与 **组件 SoundStream/w2v-BERT**。*

---

## 架构一图（ASCII）

```
         ┌─────────────── Libri-Light 60k h ───────────────┐
         ▼                                                │
    [Semantic tok]          [Acoustic tok 12×RVQ]         │
         │                           │                    │
    Stage1 AR (0.3B)            Stage2 AR (0.3B)          │
    z → ẑ                      z+ẑ → y_coarse           │
         │                           │                    │
         └───────────┬───────────────┘                    │
                     ▼                                    │
              Stage3 AR (0.3B)                            │
              y_coarse → y_fine (3s chunks)               │
                     ▼                                    │
              SoundStream decode → 波形 x̂               │
         3s prompt → 7s continuation · MOS/ASR/sBLIMP    │
         └────────────────────────────────────────────────┘
```

*所以这一节是想说：一图串起 **双 tokenizer → 三 LM → 解码 → 语音/钢琴/检测** 全实验矩阵。*
