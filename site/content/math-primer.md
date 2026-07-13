---
title: "Math Primer — 公式符号速查"
order: 50
intro: "看到 ∑、argmax、∇θ 就头大？这页把笔记里所有数学符号用日常话讲清楚。"
---

## 这页是干嘛的

这站 157 篇笔记里，论文公式都翻译成了人话——但 KaTeX 渲染的符号本身依然在那儿（$\nabla_\theta J(\theta)$、$\arg\max_a Q(s,a)$ 之类）。

如果看到 $\Sigma$ 就紧张、看到 $\mathbb{E}[\cdot]$ 不知道是啥、看到下标 $\theta$ 一愣——这页给你一份**最简版速查**。每个符号一行：英文名、读法、生活类比、出现在哪些笔记里。

不背公式，**就当查字典**。

## 求和与积分

$\Sigma$ — sigma，"加起来"
- $\sum_{i=1}^N x_i = x_1 + x_2 + \cdots + x_N$
- 类比：超市小票最底下的"合计"
- 笔记：几乎每篇

$\Pi$ — pi 大写，"乘起来"  
- $\prod_{i=1}^N x_i = x_1 \cdot x_2 \cdots x_N$
- 类比：投硬币 N 次都正面的概率（连乘 0.5）
- 笔记：[CLIP](/papers/clip/)、[BLIP-2](/papers/blip-2/)

$\int$ — integral，"连续版的 Σ"
- $\int_a^b f(x) \, dx$ = 函数 $f$ 在 $a$ 到 $b$ 之间画的面积
- 类比：开车，速度对时间积分 = 总里程
- 笔记：[Diffusion Policy](/papers/diffusion-policy/)、[Flow Matching](/papers/flow-matching-manipulation/)

## 期望与概率

$\mathbb{E}[\cdot]$ — expectation，"平均下来是多少"
- $\mathbb{E}[X] = \sum_x x \cdot P(x)$
- 类比：打 100 次麻将平均输赢；每次结果不一样，平均下来一个数
- 笔记：[GAIL](/papers/gail/)、[Dreamer V3](/papers/dreamer-v3/)、所有 RL 工作

$P(A|B)$ — conditional probability，"已知 B 发生时 A 的概率"
- 类比：今天下雨的概率 vs. 已知乌云密布今天下雨的概率
- 笔记：所有概率模型

$\sim$ — 服从某分布，"从这个分布里随机抽"
- $x \sim \mathcal{N}(0,1)$ = 从标准正态分布抽一个数
- 笔记：[Diffusion Policy](/papers/diffusion-policy/)（噪声采样）

## 优化

$\arg\max_a f(a)$ — "让 $f$ 最大的那个 $a$"
- 类比：菜单里点'最便宜的那道'，arg=哪道，max=最便宜
- 笔记：[SayCan](/papers/saycan/)、[RT-1](/papers/rt-1/)、所有策略

$\arg\min$ — 反过来，"让 $f$ 最小的那个 $a$"
- 类比：导航里'最快路线'

$\nabla_\theta$ — gradient 关于 $\theta$，"沿着 $\theta$ 方向的斜率"
- $\nabla_\theta J(\theta)$ = 损失 $J$ 在参数 $\theta$ 那点最陡峭的方向
- 类比：站在山坡上，告诉你哪边最陡。SGD 就是顺着这方向往下走
- 笔记：所有训练相关论文

$\theta$ — theta，神经网络的参数
- 类比：调音台上所有旋钮的总和
- 笔记：所有有训练的论文

## 神经网络函数

$\sigma(x)$ — sigmoid，"把任何数压到 0-1 之间"
- $\sigma(x) = \frac{1}{1+e^{-x}}$
- 类比：信心打分。x 越大越接近 1，越小越接近 0
- 笔记：[SigLIP](/papers/siglip/)（这就是名字来源）

$\text{softmax}$ — "把一堆数变成概率分布（加起来=1）"
- 类比：投票之后归一化成百分比
- 笔记：所有分类、所有 attention

$\tanh$ — hyperbolic tangent，"压到 -1 到 1 之间"
- 笔记：早期 RL（[World Models](/papers/world-models-ha/)）

$\text{ReLU}(x) = \max(0, x)$ — "负的全砍掉"
- 类比：水龙头，负数关掉只放正数
- 笔记：所有 CNN/Transformer

## 距离与相似度

$\|x\|$ — norm，"x 的长度"
- $\|x\|_2 = \sqrt{\sum x_i^2}$ 是欧氏距离
- 类比：直尺量两点距离
- 笔记：[CLIP](/papers/clip/)（embedding 距离）

$\langle x, y\rangle$ 或 $x^\top y$ — inner product，"两向量的相似度"
- 大 = 方向一致；0 = 垂直；负 = 反向
- 笔记：所有对比学习（CLIP / SigLIP / FILIP）

$\text{KL}(p \| q)$ — KL divergence，"两个分布差多少"
- 类比：教练评学生模仿动作和原版差多少
- 笔记：[Dreamer](/papers/dreamer-v3/)（VAE）、[Diffusion Policy](/papers/diffusion-policy/)

## 时间与序列

$x_t$ — "t 时刻的 x"
- 类比：股票第 t 天的价格
- 笔记：所有策略 / 世界模型

$x_{1:T}$ — "从 1 到 T 的整段序列"
- $x_{1:T} = (x_1, x_2, \ldots, x_T)$
- 笔记：[Diffusion Policy](/papers/diffusion-policy/)（动作序列）、[ACT](/papers/act-aloha/)

$\hat{x}$ — x hat，"对 x 的预测/估计"
- 类比：天气预报员说的"明天可能 25 度"
- 笔记：所有有预测的工作

## 符号本身

$\theta, \phi, \psi, \xi$ — 希腊小写，神经网络参数
$\alpha, \beta, \gamma$ — 希腊小写，超参数（学习率、折扣因子）
$\lambda$ — lambda，常用作正则化系数 / Lagrangian 乘子
$\mu, \sigma$ — 高斯分布的均值和标准差
$\pi$ — 在 RL 里是策略 (policy)，不是 3.14
$Q(s,a)$ — Q-value，"在状态 s 做动作 a 的好坏分"

## 为什么不学这些也能看懂

这站的笔记设计原则就是：**所有公式都有人话翻译**。

公式只是把人话压缩成能精确传递的符号。读笔记时遇到符号，看上下文有没有人话；没有就来这页查一下；查完回去继续读。

不要被符号吓到。

---

*◼ End of Math Primer.*
