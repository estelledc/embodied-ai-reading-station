---
title: "AnyMAL: An Efficient and Scalable Any-Modality Augmented Language Model"
slug: anymal
topic: multimodal
difficulty: ⭐⭐⭐
status: deep-read
来源: papers/anymal/paper.pdf
venue: EACL
year: 2023
era: classic
num: 66
generated_at: 2026-07-01
---

# AnyMAL：冻结 LLaMA-2-70B，给四种模态各配一副「翻译眼镜」

> 零基础可读精读笔记。数字来自 arXiv:2309.16058 原文 Table 2–6、Figure 3–4 及 §3–4。

## 一句话讲什么（TL;DR）

Meta **AnyMAL** 在 **LLaMA-2-70B-chat 全程冻结** 的前提下，为 **图 / 视频 / 音 / IMU** 各训一个 **投影层（aligner）**，把模态信号映进 **LLM 词嵌入空间** 当「伪 token」；再用自标 **60K MM-IT** + 合成 **150K** 做指令微调。零样本：**COCO CIDEr 99.5（13B）**、**VQAv2 67.8%（MM-IT）**、**AudioCaps CIDEr 77.8**、**STAR 48.2%**；**图+IMU 交错输入** 可联合写朋友圈文案。

*所以这一节是想说：AnyMAL 卖的是 **「输入端翻译 + 量化单卡训 70B 投影层」** 的可扩展配方，不是改 LLM 结构。*

---

## 这是个什么场景

你周末骑车，拍了咖啡店照片，手环 IMU 记着踩踏频率。你想让 AI 写朋友圈：**既要 cue 照片氛围，又要提「骑了 10 公里」**。

问题是：ChatGPT 式 **LLM（大语言模型）** 天生只识字——像 **闭着眼、捂着耳朵的顾问**，只能读字条。

AnyMAL 的做法：**图、视频、音、IMU 各自过编码器 → 投影层压成 32–64 个伪 token → 拼在文字 prompt 前 → 冻结的 70B LLM 自回归出字**。多种模态可 **交错** 一次喂入（Table 11：图 + IMU 写 caption）。

下游覆盖：COCO 字幕、6 套 VQA、AudioCaps、STAR/How2QA/NextQA、Ego4D IMU 描述（新任务）、MM-IT 开放式创作/推理。

*所以这一节是想说：场景是 **「任意模态进、文字出」的多模态助手**，具身侧 IMU 是离机器人最近的骨头。*

---

## 之前的人怎么做的，为什么不够好

| 路线 | 代表 | 短板 |
|------|------|------|
| 跨注意力插 LLM 中层 | Flamingo | 改结构、闭源、偏图/视频 |
| Q-Former 桥接 | BLIP-2 | 基本只支持 **图像** |
| GPT-4 蒸馏指令 | LLaVA | 闭源依赖 + **图+文** 二元 |
| 闭源大模型 + 传感器 | PaLM-E | PaLM 不开源，全参微调贵 |
| 音视频扩展 | Video-LLaMA 等 | 模态少、工程难 scale |

**共同缺口**：（1）**IMU 等工业传感器** 未系统接入；（2）开源里 **70B 多模态** 训练成本过高；（3）指令数据多靠 **ChatGPT/GPT-4**；（4）少支持 **多模态交错 in-context**。

AnyMAL 一次填：**开源 LLaMA-2-70B + 四模态 + 手标 MM-IT + QLoRA 单卡 80GB**。

*所以这一节是想说：AnyMAL 是 **Frozen → Flamingo → BLIP-2 → LLaVA** 在 **模态广度 + 规模 + 数据合规** 上的集大成。*

---

## 这篇论文的新想法

**① 只在输入端动手，LLM 一行不改。**  
模态特征 → 伪 token → 与文字 token 一起进 **同一嵌入空间**。类比：前台把日/法/手语都译成中文，顾问大脑不换。

**② 编码器必须「已经对齐过文字」。**  
用 **CLIP / CLAP / IMU2CLIP / Internvideo**，投影层只做微调映射；**DinoV2**（无文字对齐）在 VQA 上明显更差——工程教训：**别用纯自监督视觉 encoder 硬接 LLM**。

**③ 量化 + 只训投影 = 70B 单卡可训。**  
4/8-bit 冻结 LLM + 可训 aligner；**80GB A100 batch=4** 训 70B，吞吐与 FSDP 相当但 **GPU 减半**（推理换回全精度）。

**④ 手标 MM-IT 捕捉「必须看多模态才能答」的开放任务**——写诗、读传单电话、配酒，而非浅层「图里有什么」。

*所以这一节是想说：创新在 **配方组合**，不在单个新模块。*

---

## 它分几步做的（方法）

### 5.1 总览（Figure 2）

```
  模态 raw 信号
       │
  g(·) 冻结编码器（CLIP/CLAP/IMU2CLIP/Internvideo）
       │
  Projectionθ（Perceiver Resampler 或 Linear）→ Z_modality（固定长度伪 token）
       │
  拼接 [Z_modality, Z_text] → 冻结 LLaMA-2 → 下一个 text token
```

**两阶段**：(a) **Modality Alignment Pre-training**；(b) **MM-IT Fine-tuning**。

*所以这一节是想说：全 pipeline **输入翻译 + 冻结 LLM 自回归**，与 Flamingo 中层插入路线正交。*

---

### 5.2 阶段一：模态对齐预训练（§3.1）

**输入**：成对 $(X_{\text{text}}, X_{\text{modality}})$（字幕、caption、Ego4D 叙述等）。

**处理**：

$$Z_{\text{modality}} = \text{Projection}_\theta(h_{\text{latents}}, g(X_{\text{modality}}))$$

$$p(X_{\text{text}}|X_{\text{modality}}) = \prod_{i=1}^{L} p_\theta(X_{\text{text}}^{[i]} | Z_{\text{modality}}, Z_{\text{text}}^{[1:i-1]})$$

**人话**：在「伪 token + 已生成文字」条件下预测下一个字；**LLM 冻结**，梯度只更新 **Projection**（及 Resampler 内 latent queries）。

**为何冻结 LLM 仍有效？** 对齐阶段的目标是让 $Z_{\text{modality}}$ **占据与相关 caption 相同的嵌入邻域**——LLM 在预训练时已学会 **「读 token 序列 → 续写文本」**；只要 prefix 足够 informative，**70B 的 world knowledge** 就能在 VQA/MM-IT 上 **零样本推理**（Table 4 未 MM-IT 仍 competitive）。代价是 **像素级 OCR、严格 grounding** 仍弱，因为 LLM **从未为看像素而更新权重**。

**各模态配置（原文 Table / §3.1）**：

| 模态 | 编码器 $g(\cdot)$ | 投影 | 伪 token 数 | 预训练数据量 |
|------|-------------------|------|-------------|--------------|
| 图像 | CLIP ViT-L / ViT-G / DinoV2 | Perceiver Resampler **6 层** | 64（消融 256） | **200M**（LAION-2B CAT 过滤+人脸模糊） |
| 视频 | Internvideo | Resampler **4 层** | 32 | **28M**（HowTo100M） |
| 音频 | CLAP | **Linear 1 层** | 32 | **2.2M**（AudioSet+AudioCaps+CLOTHO） |
| IMU | IMU2CLIP | **Linear 1 层** | 32 | **528K**（Ego4D 同步 IMU+文本） |

**量化**：训练时 LLM **4/8-bit**；验证 loss 略高于 FSDP 全精度，但 **生成质量不受影响**；推理 **全精度 LLM**。

*所以这一节是想说：对齐阶段 = **让每种模态的 64 张「小卡片」能驱动 LLM 复述 caption**。*

---

### 5.3 Perceiver Resampler 机制（图像/视频）

**输入**：编码器输出变长视觉 token 序列 $g(X)\in\mathbb{R}^{N\times d}$。

**处理**：$K$ 个 **可学习 latent queries** 对 $g(X)$ 做 cross-attention，输出 **固定 $K$ 个** 向量（本文 $K=64$ 或 32）。

**输出**：$Z_{\text{modality}}\in\mathbb{R}^{K\times d_{\text{LLM}}}$，与词嵌入维对齐。

**类比**：$K$ 个记者把长采访稿压成固定页数的摘要，再交给 LLM。

**消融（Figure 4，13B 上扫）**：Resampler **2→6 层** loss 降明显；**64→256 token**、**bsz 2048→16384** 增益很小——**投影结构 >  brute-force batch**。

*所以这一节是想说：视觉用 Resampler 是因为 **变长像素特征必须压成固定 prefix**。*

---

### 5.4 阶段二：MM-IT 指令微调（§3.2）

**动机**：预训练只会「描述模态」，不会「按刁钻指令办事」。

**数据**：

| 来源 | 规模 | 特点 |
|------|------|------|
| **手标** | **60K** | CC 协议图 + 人工指令/回答；**必须理解多模态才能答**（Table 1 示例：创意写作、开放推理） |
| **合成** | **150K** | 用 **LLaMA-2-70B**（非 GPT-4）根据 caption+bbox+物体列表生成 QA |

**输入格式**：`[<system> <instruction> <modality_tokens>]`

**微调方式消融**：

- 只训投影层；
- **投影 + LoRA**（$r=64,\alpha=16$，**3000 steps**，batch **128**，lr **1e-5**）——最终选用。

**Table 3 启示**：仅合成 **54.2%** Response Acc → 加手标 **58.0%**（+3.8pp）；但 Object Recognition **85.4→79.3**（MM-IT 偏好 **简洁** 回答）。

*所以这一节是想说：MM-IT 是 **开放多模态推理** 的燃料，手标 60K 贵但 **换得来主观胜率**。*

---

### 5.5 推理与交错模态（§3 + Table 11）

**输入**：任意子集模态各自投影 → 按序拼接伪 token + 文本 prompt。

**输出**：LLM 自回归文本（创意文案、QA、IMU 运动描述等）。

**交错示例（Table 11）**：**图像（金门大桥景）+ IMU（骑行）+ prompt「写社交媒体 caption」** → 输出同时 cue **景色与 pedaling**——作者称 **未专门训交错对**，靠单模态对齐 **组合泛化**（**无定量 benchmark**）。

*所以这一节是想说：架构天然支持 **in-context 多模态拼贴**，但交错能力 **偏 zero-shot 演示**。*

---

### 5.6 训练资源与超参（Appendix B.3 摘要）

| 项目 | 图像预训练默认 |
|------|----------------|
| LLM | LLaMA-2 **7B / 13B / 70B** chat |
| 图像 batch | **2048**（有效） |
| 图像步数 | **100k** |
| 70B 训练卡 | **1× A100 80GB**，bsz=4（量化） |
| 推理 | **全精度** LLM |

*所以这一节是想说：**70B 的可训性** 来自「冻结+量化+只训 aligner」，不是 magic。*

---

### 5.7 架构一图（ASCII）

```
                    ┌─────────────────────────────────────┐
                    │   LLaMA-2-70B-chat（冻结 / 量化训）   │
                    │   自回归预测 text token              │
                    └──────────────▲──────────────────────┘
                                   │ [Z_mod, Z_text]
         ┌─────────┬─────────┬─────┴─────┬─────────┐
         │ Resampler│ Resampler│  Linear  │ Linear  │
         │ 64 tok  │ 32 tok  │  32 tok  │ 32 tok  │
         ▼         ▼         ▼          ▼
      CLIP ViT-G  Internvideo  CLAP    IMU2CLIP
         │         │         │          │
       Image     Video      Audio      IMU
```

**MM-IT 阶段**：可选 **LoRA 贴片** 在 LLM  attention 上（仍不动全量权重）。

*所以这一节是想说：**每种模态一个独立 aligner**，加新模态 = 加一行 encoder+投影，不动 LLM。*

---

## 关键数字（What works）

### 表 1：图像字幕（Table 2，zero-shot CIDEr）

| 模型 | COCO | MM-IT-Cap |
|------|------|-----------|
| Flamingo-80B | 84.3 | — |
| IDEFICS-80B | 91.8 | — |
| LLaVA | — | 14.3 |
| **AnyMAL 13B (ViT-G)** | **99.5** | 15.5 |
| **AnyMAL 70B (ViT-G)** | 95.9 | **15.7** |

*13B COCO 高于 70B*：LLaMA-70B **更啰嗦**，COCO 标注偏短，**CIDEr 惩罚长句**。

### 表 2：图像 VQA（Table 4，zero-shot；† 含 in-domain 图）

| 模型 | H-Meme AUC | VQAv2 | TextVQA | S-QA | VizWiz | OKVQA |
|------|------------|-------|---------|------|--------|-------|
| Flamingo-80B | 46.4 | 56.3 | 35.0 | — | 31.6 | 50.6 |
| BLIP-2 | 52.0 | 65.0† | 44.1* | 64.5 | 29.4 | 45.9 |
| IDEFICS-80B | 60.6 | 60.0 | 30.9 | — | 36.0 | 45.2 |
| AnyMAL 70B ViT-G | **69.1** | 64.2 | 32.9 | **70.8** | 33.8 | 42.6 |
| **AnyMAL 70B MM-IT** | 67.4 | **67.8**† | 32.5 | 67.6 | **41.3** | **46.1** |

*TextVQA*：ViT-L **336²** 优于 ViT-G **224²**——**读图中文字靠分辨率**。

### 表 3：音频 / 视频 / IMU

| 任务 | 指标 | SOTA 对比 | AnyMAL 70B |
|------|------|-----------|------------|
| AudioCaps | CIDEr | PANNs+BERT **66.7** | **77.8** (+14.5pp 级) |
| STAR 视频 QA | Acc | BLIP-2 **42.2** | **48.2**（AnyMAL-**Image** 抽帧） |
| How2QA | Acc | BLIPv2 **69.8** | **68.1** |
| Ego4D IMU 描述 | CIDEr | （新任务） | **52.5**；ROUGE-L **23.2** |

### 表 4：MM-IT 人工评测（Table 3 + Figure 3，1K test）

| 模型 | Response Acc | Obj Recognition | 相对 GT 胜率 |
|------|--------------|-----------------|--------------|
| LLaVA | 51.7 | **85.4** | **34.4%** |
| InstructBLIP | 46.3 | 73.2 | 16.7% |
| AnyMAL 70B | 56.0 | 82.4 | — |
| **AnyMAL 70B MM-IT (Human+Synth)** | **58.0** | 79.3 | **41.1%** |

*所以这一节是想说：数字支撑 **对齐预训练 + MM-IT** 在 **字幕/VQA/音频/视频/IMU** 五线拿 SOTA 或强 competitive；**主观开放任务** 胜 LLaVA。*

---

## 实验结果说明了什么

1. **冻结 LLM 不妨碍 zero-shot 推理**：未 MM-IT 的 AnyMAL 70B 在 VQA 已 competitive——**对齐阶段已把「视觉概念」搬进 LLM 可读空间**。
2. **LLM 规模影响「需要推理」的任务**：AudioCaps **70B CIDEr 77.8** 明显高于 7B/13B；COCO 字幕反而 **13B>70B**——任务类型决定要不要大 LLM「脑补」。
3. **MM-IT 换能力**：+Response Acc，-Object Recognition 细节——**数据偏好简洁** 与 **开放指令** 的 trade-off。
4. **BLIP-2/InstructBLIP 偏科**：公开 VQA 高，MM-IT 开放题胜率 **4.1% / 16.7%**——**benchmark 分数 ≠ 聊天体验**。
5. **视频：抽帧+图像 encoder > 专用 video encoder**（Table 6）——HowTo100M ASR 对齐弱、内容同质；**STAR 上 Image-70B 48.2 > Video-70B 41.3**。
6. **DinoV2 教训**：无 text-aligned 特征 → TextVQA **13.7%** 级崩盘，印证 **encoder 选型 > 投影层花活**。
7. **IMU 新任务可行**：52.5 CIDEr 开启 **「运动传感器→语言」**；结合 LLM 可答 **「怎么安全刹车」** 而无显式「你在骑车」文本（Table 8）。
8. **交错模态仅定性**：Table 11 图+IMU caption **无系统 benchmark**——后续 NExT-GPT 等才补 **输出侧多模态**。

*所以这一节是想说：实验同时证明 **recipe 有效** 与 **grounding/知识/模态数仍有限**。*

---

## 你应该懂的几个新词

- **Modality（模态）**：文字、图像、音频、IMU 等感知/表达通道。
- **Aligner / Projection（对齐器/投影层）**：把编码器特征映到 **LLM 词嵌入空间** 的可训模块。
- **Perceiver Resampler**：可学习 latent 对变长视觉特征 cross-attend，**压成固定 K 个 token**（来自 Flamingo）。
- **Pseudo token（伪 token）**：非词典字，但占用与词嵌入同维的 prefix 槽位。
- **MM-IT**：Multimodal Instruction Tuning，本文 **60K 手标 + 150K 合成**。
- **QLoRA / Quantization**：4/8-bit 存 LLM 权重，只训 aligner+LoRA；**训练省显存，推理全精度**。
- **CLIP / CLAP / IMU2CLIP**：图-文、音-文、IMU-文 **对比预训练** 编码器，输出已 **半对齐** 文本语义。
- **Zero-shot**：评测集 **未参与** MM-IT（注意 Table 4 中 † in-domain COCO 例外）。
- **CIDEr / SPICE**：字幕 n-gram 共识 / 场景图重叠自动指标。
- **Interleaved modalities（交错模态）**：一次 prompt 内 **多种模态 token 混排**。
- **LoRA**：低秩适配 $W+\Delta W$，只训小矩阵 **贴** 在冻结 LLM 上。

*所以这一节是想说：全文就 **encode → project → prefix → frozen LLM** 八个词。*

---

## 它有什么搞不定的

1. **Grounding 软（§7）**：生成时偶发 **更信 LLM 先验而非图像** → 幻觉；作者称可能要 **解冻 LLM**（成本爆炸）。
2. **视觉知识受 200M 图文对上限**：长尾实体弱；建议 **RAG 外挂知识**（本文未做）。
3. **仅四模态**：触觉、点云、雷达等 **未验证**；每种新模态要 **配对数据 + encoder + aligner** 三件套。
4. **MM-IT 规模有限**：60K+150K 对 70B 偏少；指令微调后 **物体细节识别下降**（Table 3）。
5. **视频时序建模增益不明**：专用 Internvideo 路线 **不如** 多帧 ViT-G **抽帧**。
6. **交错输入无定量评测**：组合泛化 **神奇但脆弱**。
7. **TextVQA / OCR 仍弱**：32.9% 级，**细粒度像素文字** 在 64 token 瓶颈下丢失。
8. **权重未完全开源**：论文为 Meta FAIR 工作；复现依赖 **LLaMA-2 许可 + 自训 aligner**（非一键 checkpoint 时代）。

*所以这一节是想说：AnyMAL 是 **2023 多模态 LLM 工程里程碑**，不是 **Gemini 级原生多模态**。*

---

## 它和别的几篇是什么关系

- **上游 · Frozen / Flamingo**：Frozen 提出 **冻 LLM 训 adapter**；Flamingo 提供 **Resampler**（AnyMAL 改 **仅输入拼接**）。
- **同期 · BLIP-2 / LLaVA / InstructBLIP**：同 **冻 LLM** 路线；AnyMAL **多模态 + 70B + 手标 MM-IT**。
- **同期 · PaLM-E**：闭源 **全参微调** 传感器进 LLM；AnyMAL **开源 + 只训 aligner**。
- **编码器 · IMU2CLIP**（Moon 前作）：IMU 分支直接复用。
- **数据 · Ego4D**：IMU+叙述对齐来源；与 **[obelics](obelics.md)** 同属 **多模态数据生态**。
- **下游 · RT-2 / OpenVLA / NExT-GPT**：**感知 token 化** 思想延续到 **机器人 VLA** 与 **输出多模态**。
- **导读邻居 · [imagebind](imagebind.md)**：ImageBind **嵌入空间对齐六模态**；AnyMAL **LLM 推理层**——Ch18 **中层+上层** 分工。

*所以这一节是想说：AnyMAL 在族谱上是 **BLIP-2/LLaVA 的模态扩展版**，向 **PaLM-E / VLA** 搭桥。*

---

## 和本导读的关系

对应 **[Ch18: 多模态生态——ImageBind / AnyMAL / 3DShape2VecSet](../guide/ch18-multimodal.md)** **§18.4**（冻结 LLM + 投射层）。

建议路径：

1. Ch18 §18.2–18.3 读 **ImageBind**（六模态嵌入）；
2. 读本笔记 §5.2–5.4（对齐 + MM-IT）；
3. Ch09 BLIP-2/LLaVA 对照 **Q-Former vs 线性投影**；
4. Ch10 SayCan / Ch11 RT-2 看 **LLM 如何接到机器人**；
5. 具身重点：**§5.5 + Table 8 IMU** 与 **Table 11 图+IMU**。

Topic VII primer 链：**imagebind → obelics → anymal**——数据/对齐/LLM 推理 **三连**。

*所以这一节是想说：Ch18 Part1 的 **AnyMAL 节** 是叙事线，本笔记是 **Table 2–6 数字手册**。*

---

## 思考题

**Q1：为何训练时量化 LLM、推理时全精度？量化 loss 更高为何仍采用？**

<details>
<summary>提示</summary>

显存：70B 全精度训 aligner 要 FSDP 多卡；4/8-bit 单卡 bsz=4。论文称 **生成质量未损**——对齐任务主要梯度在 Projection。

</details>

**Q2：DinoV2 比 CLIP ViT-G 视觉更强，为何 AnyMAL 选 CLIP 做默认？**

<details>
<summary>提示</summary>

Table 4：DinoV2 TextVQA **13.7%** vs ViT-G **32.9%**。**特征空间离 LLM 词嵌入的距离** 比 ImageNet 分类更重要。

</details>

**Q3：MM-IT 后 Object Recognition 从 85.4→79.3，这是失败吗？部署时如何取舍？**

<details>
<summary>提示</summary>

Table 3：Response Acc **58.0** 最高。手标偏好 **简洁正确** vs **冗长罗列**。要细节描述 → 少 MM-IT 或改标注 rubric。

</details>

**Q4：视频任务上 AnyMAL-Image 抽帧击败 AnyMAL-Video，说明什么？**

<details>
<summary>提示</summary>

Table 6；HowTo100M **ASR 文本对齐弱** + 内容同质。暗示 **「视频=选帧+大图 LLM 推理」** 在 2023 仍够用，专用 video encoder 非必赢。

</details>

**Q5：Table 11 图+IMU 交错输入未专门训练，为何能 work？可能何时失效？**

<details>
<summary>提示</summary>

各模态 prefix 独立对齐；LLM 自注意力 **联合读 prefix**。失效：模态冲突、某一模态噪声大、需精细 cross-modal alignment 的计数/定位任务。

</details>

**Q6：若给 AnyMAL 加「触觉」模态，最小工程清单是什么？**

<details>
<summary>提示</summary>

§7：需 **触觉-文本配对数据**、**已对齐文字的 tactile encoder**（或先训一个）、**新 Linear/Resampler**；LLM 仍冻结。无 encoder 则重复 DinoV2 陷阱。

</details>

**Q7：AnyMAL 与 OpenVLA 都「token 化感知」，根本差异在哪？**

<details>
<summary>提示</summary>

AnyMAL **输出文本**；VLA **输出动作 token/chunk**。VLA 通常 **解冻动作头或更大 scale 机器人数据**；AnyMAL 强调 **多模态理解而非控制**。

</details>

**Q8：2024+ Gemini/GPT-4o「原生多模态预训练」会淘汰 AnyMAL 路线吗？**

<details>
<summary>提示</summary>

Ch18 §18.4 踩坑：原生路线 **贵一个数量级**；AnyMAL **换 LLaMA-3/Gemma 只重训 aligner** 仍便宜。研究/机器人迭代快时 **冻结+投射** 仍有 **工程窗口**。

</details>

---

## 一些好奇心问答（FAQ）

**Q：为何不端到端微调整个 70B？**  
A：数百张 A100 级成本；冻结方案 **单卡 80GB**。代价是 LLM **不会因图像变得更「懂像素」**，只靠 prefix。

**Q：64 个伪 token 够吗？**  
A：Figure 4：64 vs 256 loss 近；但 TextVQA 仍弱——**OCR 级细节** 需要更高分辨率或更多 token，不是简单加到 256 能彻底解决。

**Q：60K 手标值不值？**  
A：Table 3：**+3.8pp** Response Acc；开放题胜率 **41.1% vs LLaVA 34.4%**。合成 alone **54.2%**——手标买的是 **高难度开放指令**。

**Q：能直接控机器人吗？**  
A：本文 **无动作头**；思路被 RT-2/OpenVLA 借鉴。高层语义用 AnyMAL 类，低层控制仍要 **专用策略**（Ch10 SayCan 分层）。

**Q：13B COCO 99.5 比 70B 95.9 高，选哪个部署？**  
A：要 **短 caption** → 13B；要 **音频推理/长回答/MM-IT** → 70B。指标要看 **任务匹配**。

**Q：和 Sora 谁先进？**  
A：不同问题：Sora **生成视频像素**；AnyMAL **理解多模态输入、输出文字**。不可直接比 SOTA 表格。

*所以这一节是想说：FAQ 背后是 **成本、指标、grounding、部署分层** 四个工程坑。*

---

## 如果你想再深入

1. **Flamingo（NeurIPS 2022）** — Resampler 与 gated cross-attention 源头。  
2. **BLIP-2 / LLaVA** — 对照 **Q-Former vs 线性/Resampler 投影**。  
3. **IMU2CLIP** — 同一作者 IMU 对齐前置工作。  
4. **QLoRA** — 单卡训 70B 的工程钥匙。  
5. **PaLM-E** — 闭源 **传感器进 LLM + 机器人规划** 对照。  
6. **Ego4D** — 复现 IMU 分支必读数据。  
7. **NExT-GPT / Unified-IO 2** — AnyMAL 之后 **输入+输出多模态** 延伸。

具身主线：**AnyMAL → PaLM-E → RT-2 → [openvla](openvla.md)** — **感知 token 化 → VLA**。

*所以这一节是想说：读完应能 **画 Figure 2、读 Table 2/4/5、解释 IMU 例子**。*

---

## 原文信息

```bibtex
@inproceedings{moon2023anymal,
  title={Any{MAL}: An Efficient and Scalable Any-Modality Augmented Language Model},
  author={Moon, Seungwhan and Madotto, Andrea and Lin, Zhaojiang and Nagarajan, Tushar and others},
  booktitle={Proceedings of EACL},
  year={2023}
}
```

- **arXiv**：https://arxiv.org/abs/2309.16058
- **机构**：Meta FAIR & Meta Reality Labs

*所以这一节是想说：cite **AnyMAL** 时注明 **冻结 LLaMA-2-70B + MM-IT** 配方。*

---

## 数据流一图（ASCII）

```
  User: instruction + {image?, video?, audio?, IMU?}
              │
    ┌─────────┴─────────┐
    │  per-modality     │
    │  encoder (frozen) │
    └─────────┬─────────┘
              ▼
    aligner trainable (Resampler / Linear)
              ▼
    prefix tokens [Z_img, Z_imu, ...] + text tokens
              ▼
    LLaMA-2-70B (frozen) ──► text response
              ▲
         optional LoRA (MM-IT stage)
```

*所以这一节是想说：与 **ImageBind 嵌入相似度** 不同，AnyMAL 走 **生成式 LLM 推理** 路径。*
