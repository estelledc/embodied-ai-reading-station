---
title: "Behavior Transformers: Cloning k Modes with One Stone"
slug: bet
topic: imitation
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2206.11251"
venue: NeurIPS
year: 2022
era: classic
num: 53
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

看一堆人做同一件事却各有各的做法，BeT 让 AI 先认出"有几种主流流派"，再在每个流派里微调——而不是把所有动作平均成一个四不像。

## 这是个什么场景 — 日常类比

你打开抖音想学做番茄炒蛋，搜出 100 个视频跟着学。问题是：每个博主做法都不一样——

- 有的先炒蛋再下番茄、有的先炒番茄再倒蛋液
- 有的放糖（上海派）、有的放盐（北方派）
- 有的大火快炒 30 秒、有的中火慢煨 2 分钟

如果一个零经验的人想"把这 100 个视频的动作取平均"——蛋下锅 1.5 次、火候介于大小之间、糖盐各放一半——做出来会是什么？一锅四不像。

机器人模仿学习碰到的就是这个问题：同一个画面下，人类示范里**藏着好几种合理做法**（叫"多模态"），但传统方法（用 MSE 损失）会无脑取平均，把所有流派糊成一团。

正确的教法应该是：**先认出"有几种主流流派"，再在每种流派内部学细节**。BeT 干的就是这件事——先用 k-means（一种聚类算法）找出"动作风格大致分几派"，再让 Transformer 学"看到这一帧画面，该走哪一派 + 派内部怎么微调"。

## 之前的人怎么做的 — 3-5 bullet

- **MLP + MSE 回归**：直接让神经网络拟合"观测 → 动作"，但 MSE 损失会把多模态分布**平均掉**，结果就是上面那锅怪番茄炒蛋。
- **GMM（高斯混合模型）**：手动指定几个高斯分量，能表达多模态，但分量数难调、训练不稳定，且只看当前观测、不看历史。
- **VAE / 隐变量模型**：用一个隐变量 z 来"分支"，理论上能多模态，但训练复杂、坍缩到单模态是常见痛点。
- **Energy-Based Model（IBC, Implicit BC）**：把动作生成变成能量最小化，能表达多模态，但推理慢、数值上难驯。
- **RL with reward**：如果有奖励信号就好办了，但这里的设定就是"**没奖励、只有人类示范**"——纯模仿学习。

BeT 的核心吐槽：上面这些要么压不住多模态，要么吃不到 Transformer 的"长上下文"红利。

## 这篇论文的关键想法

**关键洞察**：连续动作空间太大、模态太多，直接学很难；但如果先把动作"**离散化成 k 个 bin**"（用 k-means 聚类），就把"多模态生成"问题转成了**两件容易的事**：

1. **分类问题**：当前应该走哪个 bin（哪种模式）？→ Transformer 输出一个 k 维 logits。
2. **回归问题**：在那个 bin 内部，相对于聚类中心要偏移多少？→ Transformer 输出一个相对偏移量。

最终动作 = 选中 bin 的中心 + 偏移量。这种"**离散 + 残差**"的设计 NLP 里早就有（参考分类头 + 回归头），BeT 的贡献是把它**搬到机器人模仿学习**，并配合 GPT 风格的因果 Transformer，吃下"过去几十帧观测"作为上下文。

> 名字双关："cloning k modes with one stone" = "一石（一个模型）克隆 k 个模式（行为）" = 一石 k 鸟。

## 它怎么做的（方法）— 3-4 段

**Step 1：动作离散化（offline 预处理）**——*像做菜前先把食材分成"肉/菜/蛋"几堆*。

把训练集里所有的动作 a 收集起来，跑 k-means 聚类，得到 k 个簇中心 $\{c_1, ..., c_k\}$。每个原始动作 a 都被分解成"它属于哪个簇 i" + "它相对于 $c_i$ 的偏移 $\delta = a - c_i$"。这一步纯离线、跟模型无关。k 一般取 8 到 64，**具体数字需读原文**。

> 等等，先慢一拍 —— **k-means 是什么？** 给一堆点（这里是动作向量），让算法自动找出 k 个"代表点"，每个原始点就近归到最近代表点。本质上就是"动作做归类"，比如把 1000 种炒蛋手势归成"翻炒/颠勺/划散" 8 大类。

**Step 2：因果 Transformer 学条件分布**——*像翻译员看完整句中文再决定下一个英文词，而不是逐字蒙*。

模型输入是过去 H 帧观测序列 $(o_{t-H+1}, ..., o_t)$（GPT 风格 mini-GPT，**具体层数/参数量需读原文**）。每个 token 位置输出两个头：
- **分类头**（categorical head）：k 维 logits，预测应该走第几个 bin（哪一派做法）
- **偏移头**（offset head）：k × dim_action 维向量，每个 bin 备一个微调向量

这样设计避免"先分类、再回归"的两步推理——训练时一次前传、两个 loss 同时优化。

**Step 3：损失函数 = focal loss + masked MSE loss**——*像老师批改作业时只看你选的那道题答得对不对，没选的题不扣分*。

分类用 focal loss（缓解 bin 频次不均，常用动作 bin 会霸屏），偏移用 masked MSE——**只对"真值 bin"那一列偏移算 loss**，其他 bin 的偏移任由它去。这是关键 trick：偏移头要预测 k 个候选偏移，但训练时只惩罚 ground-truth 那个 bin 的偏移，其他 bin 不学习就不会乱。

**Step 4：推理时采样**——*像点菜时不是只能选最热门的那道，可以随机翻翻别的派别*。

给定历史观测，先从分类头的 logits 采样（或 argmax）一个 bin index $i$，再从偏移头取出第 $i$ 列偏移 $\delta_i$，最终动作 $a = c_i + \delta_i$。采样而不是 argmax 就保证了**每次执行可能走不同流派**——这正是处理多模态人类示范该有的行为。

## 实验在做什么

- **环境**：CARLA 自动驾驶模拟、Franka kitchen（多任务厨房机械臂）、blockpush、relay-imitation 等。这些任务都有一个共同特点——**人类示范明显多模态**（同一情境下不同人做不同选择）。
- **对比基线**：MLP+MSE、MLP+GMM、IBC、k-NN、VAE-BC 等。
- **评测指标**：任务完成率、模态覆盖率（用了多少种不同的解法）、轨迹多样性。**具体数字需读原文**，但定性结论是 BeT 在"覆盖多模态"上明显赢，且任务成功率不输或更好。
- **关键 ablation**：k 的数量影响、context 长度 H 的影响、focal loss vs cross-entropy 的影响。

## 你应该懂的几个新词 — 4-6 个

- **多模态行为分布（multi-modal behavior distribution）**：同一个状态下，人类可能选多种合理动作；这是个分布而不是单点。MSE 会把它"压成单点"。
- **k-means 离散化**：把连续向量空间用 k 个中心切成 k 个 Voronoi 区域，每个连续向量被代表为"最近中心 + 偏移"。BeT 用它把动作空间切片。
- **Categorical head + Offset head**：分类头选哪个 bin、偏移头给 bin 内部细调；二者是独立 head 但共享 transformer 主干。
- **Focal loss**：cross-entropy 的加权版，给"模型已经分得很对的样本"降权，迫使模型多关注难样本/少数类。原本是 RetinaNet 用来对付目标检测的 class imbalance。
- **Behavior Cloning（BC）**：最朴素的模仿学习——监督学习"观测 → 动作"映射。BeT 是 BC 的一种增强版（加了 Transformer + 离散化）。
- **GPT-style causal transformer**：只能看过去、不能看未来的 self-attention，每个位置预测下一动作；和 NLP 的 GPT 同构。

## 它和其他论文什么关系

- **上游**：决策 Transformer（Decision Transformer, 2106.01345）已经把 transformer 用进 offline RL，但 DT 需要 reward-to-go 作为输入条件；BeT 不需要任何 reward。
- **同期对手**：Implicit BC（IBC）也想解多模态，但走能量模型路线、推理慢；BeT 用"离散+残差"绕开能量模型。
- **下游**：Diffusion Policy（2303.04137）后来用 diffusion 来表达多模态动作分布，效果更强但训练/推理更重；BeT 可以看作 diffusion policy 的"轻量前辈"。
- **思想血缘**：和 NLP 里 wav2vec / VQ-VAE 的"离散 codebook"思想同源——把连续信号离散化后让 Transformer 处理。
- **应用扩展**：VQ-BeT（后续工作）把 k-means 升级成 VQ-VAE codebook，进一步提升表达力。

## 我建议这样读 — 3-4 步

1. **先看 Figure 1 + Method 图**：理解"分类头 + 偏移头"的双头结构怎么吃同一个 transformer 输出——这是全文最核心的画面。
2. **跳到实验图（多模态可视化）**：看 BeT vs MSE 的轨迹散点图，直观感受"压平 vs 保留模态"的差别——比看公式更让你信服为什么要这么搞。
3. **回到 Loss 公式**：重点看 offset 的 masked loss 怎么写——为什么只对 ground-truth bin 那列算 loss，这个 trick 不直观但很关键。
4. **（可选）跟 Diffusion Policy 对比读**：同样要解多模态，diffusion 用 score matching、BeT 用离散+残差，思想路线对比能让你对"如何表达多模态分布"有更立体的认识。

## 为什么值得读

- **思路简洁、效果扎实**：没用 GAN/VAE/diffusion 这些重武器，靠"k-means + 双头 transformer"就把多模态行为表达问题打下来——是"少即是多"的好范例。
- **架起 NLP 和机器人学的桥**：把 NLP 的"分类头 + 回归头"模式迁过来，证明 Transformer 在机器人 BC 里的潜力，也为后续 VQ-BeT、ACT、Diffusion Policy 铺路。
- **没有 reward 也能学**：在数据驱动的具身智能时代，"无奖励 + 大规模人类示范"是主流范式，BeT 是这条线上必读的一篇。
- **难度适中**：不需要懂 RL/ control theory 细节，BC 框架 + Transformer 基础就够——是从 NLP 切到机器人的不错入门论文之一。
