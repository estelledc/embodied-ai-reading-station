---
title: "FAST: Efficient Action Tokenization for VLA"
slug: pi0-fast
topic: diffusion-policy
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2501.09747"
venue: RSS
year: 2025
era: frontier
num: 46
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

把机器人的连续动作序列**先做离散余弦变换（DCT, Discrete Cosine Transform）转到频域，再压缩、量化成离散 token**，让 VLA（Vision-Language-Action）模型可以像处理文本一样自回归地"说"出动作。结果是：训练快、推理快、还能保住高频动作的细节。

## 这是个什么场景 — 日常类比

想象你要把一段很长的钢琴演奏录音发给朋友。

最笨的办法：把每个采样点（比如 44100Hz × 30 秒 = 132 万个数字）一个一个发过去——又慢又冗余。

聪明一点：用 MP3 / JPEG 那一类**频域压缩**——把信号拆成"低频（整体旋律）+ 高频（细节装饰）"，低频多保留，高频可以粗一点，最终只发几千个数字就够了。

FAST 干的就是这件事，只不过对象换成了**机器人手臂的关节轨迹**。原来 VLA 把 50 步动作 × 7 个关节 = 350 个浮点数硬塞给 transformer，token 又长效率又差；FAST 先 DCT 到频域，再扔掉不重要的频率成分，最终一段动作可能只剩几十个 token。

## 之前的人怎么做的 — 3-5 bullet

- **逐步离散化**（如 RT-2、OpenVLA）：把每个时间步、每个关节维度独立量化成一个 token。问题：token 数量随动作长度线性爆炸，且没利用动作的时序冗余。
- **Diffusion Policy / Action Chunking**：直接在连续空间预测整段 action chunk，效果好但推理需要多步去噪，慢。
- **简单 binning**：把每个浮点数切成 256 个桶变成离散值——粗暴、损失大、高频信号尤其惨。
- **VQ-VAE 编码动作**：用学出来的 codebook 离散化。问题：codebook 训练不稳定，跨 embodiment 迁移差。
- 共同痛点：要么 token 太多（训练慢推理慢），要么细节丢太多（高频精细动作做不了）。

## 这篇论文的关键想法

**核心 insight**：动作序列在频域里**极度稀疏**——绝大部分能量集中在低频（整体运动趋势），高频（抖动 / 微调）只占很小一部分。

所以根本不需要在时域上一格一格地 tokenize，直接换基底（basis）到频域，能量集中，自然就压缩了。

而 DCT 是个**已知的、固定的、不需要训练的**正交变换——这正好绕过了 VQ-VAE 的训练不稳定问题。这是论文的"第一性"取舍：用一个分析意义上最优的固定变换，换掉学出来的 codebook。

配套：作者还训了一个**通用 tokenizer FAST+**，号称在多种机器人 embodiment 上都能用，不需要每个新机器人重训一个 tokenizer。

## 它怎么做的（方法）— 3-4 段

**第一步：归一化 + DCT**。把一段长度 H 的动作 chunk（每步 D 维）按维度分别做 1D-DCT，得到 H × D 的频域系数矩阵。低频系数大、高频系数小，能量分布非常偏。

**第二步：量化 + 稀疏化**。对频域系数做 scale-quantize（比如除以一个 scale 再四舍五入），高频部分的小系数会被压成 0。这一步等价于一个**有损压缩**，但损失主要落在高频细节上，整体轨迹形状几乎不变。

**第三步：BPE 编码成 token 流**。把量化后稀疏的整数序列再走一遍 byte-pair encoding（就是 GPT 那套子词压缩算法），把常见的"系数模式"合并成单个 token。最终一段动作可能从 350 个数字压到 ~30-60 个 token。具体数字需读原文。

**第四步：接进 VLA**。这些动作 token 和文本 token 共享同一个词表，VLA 模型像续写句子一样自回归生成动作 token，最后反向 DCT 还原成连续动作执行。配合 π0 这类底座模型，训练吞吐和推理速度都显著提升。

## 实验在做什么

论文的核心声称（基于摘要和公开材料）：

- **训练效率**：在多个 manipulation benchmark 上，达到 diffusion-based VLA 的同等性能但训练快得多。具体数字需读原文。
- **推理速度**：自回归一次出几十个 token，比 diffusion 多步去噪快一个数量级量级。
- **跨 embodiment**：FAST+ 这个通用 tokenizer 在没见过的机器人构型上也能用，零样本迁移。
- **任务覆盖**：覆盖了灵巧操作、长 horizon 任务、双臂任务等。具体任务列表需读原文。

读的时候重点看：DCT 截断到第几个频率分量、BPE 词表大小、token 长度的实际分布——这些超参直接决定压缩率 vs 还原精度的 trade-off。

## 你应该懂的几个新词 — 4-6 个

- **VLA（Vision-Language-Action）**：把视觉 + 语言 + 动作放进同一个序列模型的范式，代表作 RT-2、OpenVLA、π0。
- **Action chunking**：一次预测未来 H 步的动作（而不是一步一步），ACT 那篇带火的。
- **DCT（Discrete Cosine Transform）**：一种实数域正交变换，把信号拆成不同频率的余弦分量。JPEG / MP3 的核心。比 FFT 更适合"非周期但平滑"的信号。
- **Tokenization**：把连续 / 结构化数据切成离散 token 喂给 transformer。文本有 BPE，动作以前没有标准做法，FAST 就是想做"动作里的 BPE"。
- **BPE（Byte-Pair Encoding）**：把高频出现的字节对反复合并成新符号，最终得到一个紧凑词表。GPT/LLaMA 都用。
- **Codebook（VQ-VAE）**：学出来的离散 token 字典，对比 FAST 的"固定 DCT 基"是另一条路线。

## 它和其他论文什么关系

- **承接 π0**（同组工作）：π0 是底座 VLA，FAST 是 π0 的"动作 token 化"配套零件。两篇可以一起读。
- **对位 Diffusion Policy / 3D Diffusion Policy**：DP 路线坚持"连续空间 + 多步去噪"，FAST 路线选择"离散 token + 自回归"，是两种推理范式之争。
- **承接 RT-2 / OpenVLA**：同样是 token 化路线，但 FAST 用频域压缩替换了它们的逐步量化，是同一路线内的优化。
- **思想血统接 JPEG / MP3**：把信号处理领域几十年的频域压缩经验搬到机器人动作上——这是一个"老技术新场景"的好例子。
- **远亲：ACT（action chunking transformer）**：两者都信"一次出一段动作"，但 ACT 直接回归连续值，FAST 走 token 路线。

## 我建议这样读 — 3-4 步

1. **先看一张图就够**：去 arxiv 看 Figure 1（或项目主页 demo），先把"动作 → DCT → 量化 → BPE → token"的 pipeline 看明白。10 分钟。
2. **跳读方法章节**：重点看 DCT 截断到哪、量化用什么 scale、BPE 词表多大。这几个超参决定了实际压缩率。
3. **跳读实验**：直接看跨 embodiment 那部分的表格和延迟对比，判断 FAST+ 通用性是否真的成立。
4. **可选**：如果你想做自己的 tokenizer，把 FAST 和 VQ-VAE 路线（如 BeT、VQ-BeT）对比着读，能搞清楚"固定基 vs 学习基"的取舍。

## 为什么值得读

- **方法漂亮**：用一个**几十年前就有的、不需要训练的固定变换**解决了一个看起来需要 VQ-VAE 的问题。是"先做第一性原理推导"的好范例——别一上来就堆模型。
- **工程价值高**：训练 / 推理双双提速，对实验室和产线都很有吸引力。
- **路线意义**：和 diffusion 路线形成清晰对照，帮你理解"VLA 的动作表示"这个子问题里有哪几种思路。
- **跨学科启发**：信号处理 ↔ 机器人 ↔ NLP token 化的桥梁，是个挺优雅的"借力"思路，值得记下来以后用到别的场景（比如音频、传感器序列）。
