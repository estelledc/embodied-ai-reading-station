---
title: "Mastering Atari with Discrete World Models"
slug: dreamer-v2
topic: world-model
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: papers/dreamer-v2/paper.pdf
venue: ICLR
year: 2021
era: classic
num: 147
generated_at: 2026-06-25
---

# Mastering Atari with Discrete World Models（DreamerV2）

> 这是一份给"完全没接触过强化学习"的读者看的精读笔记。语言尽量像聊天，公式全部翻译成人话。

## 一句话讲什么（TL;DR）

让 AI 闭眼"做白日梦"练打老游戏，第一次只靠脑子里想象就打到人类水平。具体做法：把脑内模拟器的"快照"从连续数字（高斯）换成离散选项（32 组 x 32 类 categorical），再用一个叫 KL balancing 的二八开技巧来让"猜测"尽量贴近"亲眼看到"的状态，最终在 55 款 Atari 游戏上以 gamer median 2.15 超越所有单卡 model-free 对手，且只需单张 V100 跑 10 天。

*所以这一节是想说：DreamerV2 用两个简单改动——离散潜状态 + KL balancing——让纯潜空间想象第一次在 Atari 上跑赢硬刚游戏的传统派。*

---

## 这是个什么场景

你出门前在脑子里"过一遍"路线：先到地铁口，换乘 2 号线，出站找右手边那个咖啡店。这个"过一遍"就是脑内模拟——你没真走，但已经把可能撞到的坑预演了一遍。等真出门时，速度比第一次去快多了。

学打游戏其实也分这两种人：

- **方案 A（model-free，硬刚派）**：插上手柄死磕，输了重来、赢了记套路。慢，但直接。
- **方案 B（model-based，建模派）**：先在脑子里搭一个"游戏模拟器"——它能预测"我按这个键、画面下一秒大概变成啥"。然后大部分练习都在脑子里推演，偶尔上真机验证。

下盲棋的高手就是 B：他闭眼也能下，因为脑子里那张棋盘比眼前的还清楚。

强化学习圈里有个叫 Atari 的"全国统考"——55 款 1980 年代街机游戏（打砖块、太空入侵者、吃豆人之类），每款规则都不一样，用来比哪家 AI 更通用。诡异的是：**这场考试里，所有"脑内建模派"都干不过"硬刚派"**——脑子里搭的模拟器要么不准、要么算到游戏结束都还没建好。

DreamerV2 是第一个在 Atari 上把"脑内模拟"这条路走通的 AI。

> **强化学习（Reinforcement Learning, RL）**：让 AI 通过"试错 + 拿奖励"自己学会一件事的训练方法。比如让它打游戏，赢了加分、输了扣分，慢慢学会怎么打分高。
>
> **Atari 基准**：1980 年代街机游戏组成的标准测试集。AI 圈用它比较算法的通用性——同一套代码能不能把 55 个完全不同的游戏都打好。

*所以这一节是想说：DreamerV2 走的是"先建脑内模拟器再练习"的路子，第一次在 Atari 上跑赢了"硬刚游戏"的传统派。*

---

## 之前的人怎么做的，为什么不够好

- **DQN / Rainbow / IQN（model-free 派）**：直接拿真游戏画面练手，2015 年起就是 Atari 之王。问题是**贵**——要打 2 亿帧才到人类水平，相当于一个游戏让 AI 不眠不休练几十天。
- **SimPLe（早期 model-based 派）**：在像素空间里逐帧预测下一帧画面，再用预测出来的画面练 agent。问题是**像素预测太贵**，一帧帧画面预测要 GPU 算半天，只能玩 36 个游戏中的部分，且作者报告训练更久也不再涨分。
- **MuZero（DeepMind 王炸）**：能在 Atari 上拿到惊人分数，但**算力恐怖**——单卡训一个游戏要 80 天，实现不公开，普通研究组看看就行。而且 MuZero 不重建画面，靠 value gradient 学模型，表征不具备通用性。
- **DreamerV1（这篇的前作）**：用高斯连续潜变量 + RSSM，在 DeepMind Control Suite 的 20 个连续控制任务上效率碾压 model-free，但到 Atari 这种离散动作 + 复杂画面的场景就力不从心。核心瓶颈有二：(1) 连续高斯无法表达多模态的画面跳变；(2) 普通的 KL 正则把 posterior 压得太"简单"，丢失了画面中的关键信息。
- **核心难题**：要在脑子里建"模拟器"，模拟器得**够准**才能拿来练。Atari 画面突变多（进新房间、敌人消失），用普通的高斯分布建模拟器抓不住这种"跳变"。

*所以这一节是想说：之前要么算力贵到爆，要么模拟器不够准，没人能用"脑内模拟"在 Atari 上打赢传统派。*

---

## 这篇论文的新想法

**把脑内模拟器的状态从"连续小数"换成"离散类别变量"，外加一个 KL balancing 的二八开训练技巧，第一次让纯潜空间想象在 Atari 上超越传统派。**

听起来反直觉——把表达更"精细"的连续数字换成更"粗糙"的类别选项，怎么反而效果好？关键在于 Atari 这种游戏画面的性质：它是"跳变型"的（进新房间、敌人消失、道具出现），离散变量天然表达"非此即彼"的状态切换，不需要在两个完全不同的画面之间做尴尬的连续插值。此外，离散分布有一个被低估的数学优势——多个 categorical 分布混合后还是 categorical 分布，所以 prior 能精确拟合 posterior 的混合分布；而多个高斯混合后不再是高斯，prior 永远追不上 posterior。

*所以这一节是想说：核心改动是潜状态从高斯分布换成多组 categorical 变量 + KL balancing 二八开——看似简单的两步棋，解决的是"脑内模拟器在复杂视觉任务上不够准"的根本瓶颈。*

---

## 它分几步做的（方法）

把 DreamerV2 当成一个学游戏的小孩，他每天做三件事：白天看几局真游戏录像、晚上躺床上闭眼推演几千遍、第二天再上手玩几把验证。下面四节就是这套作息的拆解：

1. **世界模型**——把看到的画面压成"摘要快照"，方便晚上回忆。
2. **KL balancing**——晚上闭眼推演的画面要尽量对得上白天看到的，一个二八开的小技巧。
3. **脑内白日梦**——晚上同时跑 2500 条 15 步的推演，挑高分动作。
4. **真环境闭环**——第二天上手玩几把，收集脑子里没见过的局面。

下图是这套"作息"的三阶段闭环（学模型 → 想象训策略 → 真实验证）：

```
   ┌───────────────── 经验数据集 (FIFO, 200 万帧) ─────────────────┐
   │                                                               │
   ▼ 抽 B=50 × L=50 序列                              存 x,a,r,γ ▲
┌──────────────────────────────┐                                 │
│ Step1 世界模型学习(RSSM)      │              ┌──────────────────┴───┐
│  x_t ─CNN→ posterior q(z|h,x) │              │ Step3 真环境交互      │
│  h_t=GRU(h,z,a)               │              │ actor 玩 Atari 一局   │
│  prior p(z|h) ◄KL balancing┐  │              │ (每4步真↔1梯度步)     │
│    0.8训prior / 0.2训post  │  │              └──────────────────▲───┘
│  重建图像/奖励/折扣         │  │                                 │
└──────────────┬───────────────┘                                 │
   世界模型冻结 │ posterior 状态作起点                            │
               ▼                                    策略更好↑     │
┌──────────────────────────────────────────────────────┐        │
│ Step2 脑内白日梦 (纯潜空间, 世界模型冻结)              │        │
│  2500 条 × 15 步:  z ─actor→ a ─prior→ z' ─→ ...       │────────┘
│  critic 用 λ-return 看远期; actor 用 Reinforce/直通    │
│  一帧真数据 ≈ 10000 倍脑内推演 (468B 想象状态)         │
└────────────────────────────────────────────────────────┘
```

*上图说明：三阶段闭环——世界模型把画面压成 (h, z)，在潜空间做上万倍想象训练 actor-critic，再回真环境收集新局面校准模型。*

### 1. 世界模型：用一个 RSSM 把游戏画面压成"压缩快照"

**类比**

你看一段 30 秒的游戏录像。要让 AI 记住这段录像，又不想存原始视频（占空间），怎么办？

> 你把每一帧压成一句"游戏当前状态摘要"——比如"敌人在右下、我在中间、还有 3 条命"。这一句话就是这一帧的**压缩快照**。

然后下一帧的摘要 = 上一帧摘要 + 这一帧新看到的东西。一连串摘要就能复原整段游戏。

DreamerV2 的世界模型就这么干，但摘要分两半：

- **确定性记忆 h**（GRU 隐状态，600 维）：像一本流水账，确定性地记着"前面发生了什么"。h_t = GRU(h_{t-1}, z_{t-1}, a_{t-1})。
- **随机潜状态 z**（32 组 x 32 类离散变量）：每一步的"瞬间快照"，带有随机性——同一个历史可能对应多种可能的当前状态。

两者拼在一起 (h_t, z_t) 构成完整的"模型状态"。

**RSSM 的六个组件**

论文 Figure 2 画了完整的数据流，对应六个子网络（全部用 ELU 激活函数，世界模型参数量共 20M）：

| 组件 | 输入 | 输出 | 功能 |
|------|------|------|------|
| 循环模型 | h_{t-1}, z_{t-1}, a_{t-1} | h_t | GRU 更新确定性记忆 |
| 表征模型（posterior） | h_t, x_t | z_t ~ q(z_t \| h_t, x_t) | CNN 编码图像 + MLP，得到"亲眼看到后的状态" |
| 转移预测器（prior） | h_t | z-hat_t ~ p(z-hat_t \| h_t) | 只看历史猜当前状态，做白日梦时全靠它 |
| 图像预测器 | h_t, z_t | x-hat_t | 转置 CNN 重建画面 |
| 奖励预测器 | h_t, z_t | r-hat_t | MLP 预测当前奖励 |
| 折扣预测器 | h_t, z_t | gamma-hat_t | MLP 输出 Bernoulli 概率，判断游戏是否结束 |

训练时数据格式：从经验数据集（FIFO 队列，最大 200 万帧）随机抽 B=50 条长度 L=50 的序列，均匀采样起始位置。

> **RSSM（Recurrent State-Space Model，循环状态空间模型）**：一个把"画面 + 历史"压缩成紧凑状态、再从状态预测下一步的网络结构。名字拆开看——"Recurrent"指 GRU 提供时序记忆，"State-Space"指状态由确定性 h 和随机性 z 两部分组成。
>
> **潜状态（latent state）**：游戏当前情况的"数字摘要"，AI 内部用，外人看不懂。
>
> **categorical（类别变量）**：从有限选项里选一个，比如"红/绿/蓝"。32 组 x 32 类相当于 32 个槽，每个槽从 32 个选项里选一个。

**世界模型的总损失函数**

论文 Equation 2 把四个损失加在一起（全部对世界模型参数 phi 联合优化）：

```
L(phi) = E[ sum_t (
    -ln p(x_t | h_t, z_t)      # 图像重建 log-loss
    -ln p(r_t | h_t, z_t)      # 奖励预测 log-loss
    -ln p(gamma_t | h_t, z_t)  # 折扣预测 log-loss（Bernoulli）
    + beta * KL(posterior || prior)  # KL 散度
)]
```

图像预测器输出均值为 x-hat 的对角高斯（方差固定为 1），奖励预测器输出单变量高斯（方差 1），折扣预测器输出 Bernoulli。KL 系数 beta = 0.1（Atari），beta = 1.0（连续控制）。

> **prior vs posterior（先验 vs 后验）**：prior = "光想就能猜的"——只用历史 h_t 预测当前状态 z-hat_t；posterior = "亲眼看到后修正的"——用历史 h_t + 当前画面 x_t 推断 z_t。世界模型希望两者越接近越好，因为做白日梦时只能靠 prior。
>
> **KL loss / KL 散度**：两个概率分布的"距离"。KL(posterior || prior) 让 prior 向 posterior 靠拢。

**Categorical 替换 Gaussian 的具体做法**

V1 的 z_t 是一个 30 维的对角高斯（每维独立采样一个连续数字）。V2 把它换成 32 个独立的 categorical 变量，每个有 32 个类别。前向传播时用 argmax（或按概率采样）得到一个 one-hot 向量，32 组拼成 32 x 32 = 1024 维的稀疏二进制向量（只有 32 位是 1）。

但 argmax 不可微——不能对"选了第 3 类还是第 5 类"求导。怎么办？

> **Straight-through 梯度（直通梯度）**：前向用真采样（one-hot），反向用 softmax 概率传梯度。论文 Algorithm 1 只有 3 行代码：
>
> ```
> sample = one_hot(draw(logits))           # 前向：真采样，无梯度
> probs = softmax(logits)                   # 这个有梯度
> sample = sample + probs - stop_grad(probs) # 前向值不变（仍是 one-hot），但梯度走 probs
> ```
>
> 直觉理解：你站在 32 个门前选了第 7 号门走进去（前向 = 离散选择）。反向传播想告诉你"下次偏向第 9 号门"。如果严格按离散处理，梯度只知道"你选了 7，对还是错"——信息太少。Straight-through 用 softmax 概率软化这个信息："你有 40% 概率选 7、35% 选 9、15% 选 3…"，梯度就能温和地调整各门概率。这个估计有偏差（biased），但实践中方差很低，训练稳定。

**为什么离散比连续好？（四个假说）**

论文 Section 3.2 坦诚说"不知道确切原因"，但给出四个可能的解释：

(a) **分布匹配**：多个 categorical 混合还是 categorical，所以 prior 能精确拟合 posterior 的混合分布。而多个高斯混合不再是高斯——prior 永远追不上 posterior。这可能是最关键的一点。

(b) **稀疏表示**：32 x 32 展开是 1024 维二进制向量、只有 32 位为 1。这种稀疏性对泛化有好处——迫使网络把不同的"概念"编码到不同的独立槽中。

(c) **梯度健康**：straight-through 梯度忽略了一个在高斯 reparameterization 中存在的缩放项，可能减少了梯度爆炸 / 消失问题。

(d) **归纳偏置匹配**：Atari 画面是"跳变型"的——进新房间、敌人消失、道具出现。离散变量天然表达"非此即彼"的状态切换，不需要在两种截然不同的画面之间做连续插值。

消融结果：离散在 42 / 55 个游戏上赢高斯，8 个输，5 个平。clipped record mean 从 0.19（高斯）升到 0.25（离散）。

*所以这一节是想说：世界模型用 RSSM 把游戏压成"确定性记忆 h + 离散快照 z"，六个子网络协同训练，离散变量的四重优势让模拟器在 Atari 的跳变画面上够准。*

---

### 2. KL balancing：教训 prior 比规训 posterior 更重要

**类比**

你在补习班学英语。两件事可以做：

- **A**：拿老师写的标准答案当样板，逼自己写得像它（让 posterior 像 prior）——这在训练术语里叫"增大 posterior 熵"。
- **B**：拿自己写得最好的那篇当样板，逼老师改答案像它（让 prior 像 posterior）——这叫"训 prior 的 cross-entropy"。

普通的 KL loss 同时干 A 和 B，各 50%。问题是 prior（老师答案）一开始就乱写，你模仿它越写越烂——posterior 被一个还没学好的 prior 拽偏，丢失了从图像中提取到的有用信息。

> KL balancing 的做法：A 占 20%，B 占 80%——**重点训 prior，少规训 posterior**。

**数学实现（论文 Algorithm 2）**

只有两行代码：

```
kl_loss = 0.8 * KL(stop_grad(posterior), prior)    # 训 prior，posterior 不动
        + 0.2 * KL(posterior, stop_grad(prior))    # 训 posterior，prior 不动
```

`stop_grad`（也叫 `sg`）是"反向传播时假装这个是常数"的操作。第一项：posterior 被当作"标准答案"不可变，只调 prior 去追它（占 80% 的权重）。第二项：prior 被当作不可变的锚点，轻轻拉 posterior 向它靠拢（占 20%）。

**与 V1 的对比：free nats**

V1 用的是 free nats 技巧——当 KL 低于某个阈值（通常 3 nats）时停止优化 KL，相当于给 posterior "最低信息配额"。问题是阈值是硬性的、需要调参。KL balancing 更优雅——它不是一刀切地设阈值，而是通过学习率比例来持续调节 prior 和 posterior 的训练强度。

**与 beta-VAE 的关系**

论文明确说 KL balancing 和 beta-VAE（Higgins et al. 2016）是正交的。beta-VAE 通过缩放整个 KL 项（beta > 1）来鼓励解耦表示；KL balancing 不改 KL 项的总权重，而是把 KL 的两个方向拆开来、给不同的学习速率。两者可以叠加使用。

**为什么这步有用**

- prior 学得准，做白日梦时才不会越想越偏。消融实验中去掉 KL balancing 后，44 个游戏掉分，clipped record mean 从 0.25 降到 0.16——这是所有消融中仅次于"去掉图像梯度"的第二大下降。
- posterior 不被一个还没学好的 prior 拽偏，能继续抓住图像里的有用信息——重建质量更高、奖励预测更准。
- 这个技巧的价值超出世界模型本身：任何带有学习先验的概率模型（如序列 VAE、层次 VAE）都可能受益。

*所以这一节是想说：KL balancing 是"二八开"分配 KL loss——让 prior 拼命追 posterior，而不是让 posterior 迁就还没学好的 prior。这保证了做白日梦时模拟器的准确性，同时不牺牲 posterior 的信息容量。*

---

### 3. 在脑内做白日梦：actor-critic 在潜空间里想象 15 步

**类比**

你下棋时不会真把每一步都摆出来，而是在脑子里推演："我走这里 -> 对方大概会走那里 -> 我再走这里..."想个 5-10 步深，挑最有利的那条线。

DreamerV2 也这么干——但不是 5-10 步，是 **15 步**，而且**一次同时推演 2500 条**。

**"想象 MDP"的形式化定义**

论文把想象过程包装成一个标准 MDP（马尔可夫决策过程）：

- 初始状态分布：取世界模型训练过程中遇到的那些 posterior 状态 z_t（这是和真实观测的最后一次接触）。
- 状态转移：完全由 prior（转移预测器）驱动——p(z-hat_t | z-hat_{t-1}, a-hat_{t-1})。不看任何真实画面。
- 奖励：奖励预测器的均值 r-hat_t。
- 折扣：折扣预测器输出的 gamma-hat_t，用来加权未来奖励和 actor-critic 的损失项，软处理"游戏可能结束"的情况。

因为潜状态是马尔可夫的（所有历史信息已经被压缩进 (h_t, z_t)），actor 和 critic 只需要看当前状态就够了，不需要更长的历史。

**它在干什么——逐步拆解**

1. 从世界模型训练时见过的某个后验状态出发（不需要再看真画面）。
2. **Actor 网络**（MLP，4 层 x 400 单元，1M 参数）根据当前状态输出一个 categorical 动作分布，采样一个动作 a-hat_t。
3. **转移预测器（prior）**根据状态 + 动作算出下一个潜状态 z-hat_{t+1}。
4. **奖励预测器**说这一步能拿多少奖励 r-hat_t、**折扣预测器**说游戏是否结束 gamma-hat_t。
5. 重复 15 步（imagination horizon H=15），得到一条想象出来的轨迹。
6. **Critic 网络**（MLP，4 层 x 400 单元，1M 参数，确定性输出）估计"从这个状态出发，未来能拿到多少累计奖励"——也就是状态价值 v(z-hat_t)。

**Critic 的训练：lambda-return 目标**

Critic 不是只看 1 步的奖励来学的——它用 lambda-return（论文 Equation 4），把"看 1 步、看 2 步、...、看 H 步"的预测加权平均，得到一个稳健的目标值 V_t^lambda：

```
V_t^lambda = r-hat_t + gamma-hat_t * [(1 - lambda) * v(z-hat_{t+1}) + lambda * V_{t+1}^lambda]    (t < H)
V_H^lambda = v(z-hat_H)                                                                             (t = H)
```

lambda = 0.95 表示更看重远期——95% 的权重给了更长步数的回报估计，只有 5% 给了短视的 1-step 估计。Critic 用均方误差回归这个目标，目标用 stop_gradient 断开梯度：

```
L(xi) = E[ sum_{t=1}^{H-1} 0.5 * (v_xi(z-hat_t) - sg(V_t^lambda))^2 ]
```

**Target network 稳定训练**

Critic 在计算 V_t^lambda 中的 v(z-hat_{t+1}) 时，用的不是自己的实时参数，而是一个每 100 步同步一次的"延迟副本"。这防止了"自己追自己尾巴"的震荡——训练中 critic 每更新一步就改变了自己的目标，如果目标变化太快，学习不稳定。

> **target network（目标网络）**：critic 的"延迟副本"，每 100 步从主网络复制一次参数。计算目标值时用副本、更新参数时用主网络，两者的时间差起到稳定作用。

**Actor 的训练：Reinforce + 直通梯度混合**

Actor 的目标是让它选的动作使 V_t^lambda 最大。论文 Equation 6 混合了两种梯度估计器：

```
L(psi) = E[ sum_{t=1}^{H-1}
    -rho * ln p_psi(a-hat_t | z-hat_t) * sg(V_t^lambda - v(z-hat_t))   # Reinforce（无偏高方差）
    -(1 - rho) * V_t^lambda                                             # 直通梯度（有偏低方差）
    -eta * H[a_t | z-hat_t]                                              # 熵正则（鼓励探索）
]
```

- **Reinforce 项**（rho 控制权重）：把"选这个动作的概率"按"这个动作带来的超额回报 V_t^lambda - v(z-hat_t)"加权调整。无偏但方差大——有时候一个好动作碰巧带来低回报，梯度就会给出误导信号。
- **直通梯度项**（1-rho 控制权重）：让价值的梯度直接通过世界模型的可微动力学反向传播到 actor。有偏但方差低——偏差来源于 straight-through 对离散采样的近似。
- **熵正则**（eta 控制强度）：鼓励 actor 保持动作的多样性，不要过早收敛到单一动作。

**Atari vs 连续控制的超参差异**

| 设定 | rho | eta | 含义 |
|------|-----|-----|------|
| Atari | 1.0 | 1e-3 | 纯 Reinforce，不用直通梯度 |
| 连续控制 | 0.0 | 1e-4 | 纯直通梯度，不用 Reinforce |

论文发现 Atari 上 Reinforce 远好于直通梯度（消融中纯直通的 clipped record mean 从 0.25 掉到 0.15）。猜测原因：离散动作空间 + 稀疏奖励让直通梯度的偏差影响更大。连续控制上反过来——动作空间是平滑的，直通梯度的低方差优势更突出。

> **actor-critic**：actor 决定"做什么动作"，critic 评判"这个状态多值钱"。两者相互配合：critic 给 actor 反馈，actor 给 critic 提供新数据。
>
> **Reinforce 梯度**：训练 actor 的经典方法。把"选某个动作的概率"按"这个动作带来多少超额回报"加权调整。无偏但方差大。
>
> **lambda-return**：把 1 步到 H 步的奖励预估按指数权重平均，得到一个稳健的目标值。lambda=0.95 表示更看重远期。

**为什么潜空间想象能做到 10000 倍扩增？**

- 不预测画面（只在潜空间走）-> 不需要跑 CNN 解码器 -> 一张 V100 卡能并行跑 2500 条想象轨迹。
- 每条 15 步，2500 条 = 37500 个想象状态 / 轮。整个训练 200M 真环境帧，实际产生了 **468B 条潜空间想象状态**——一帧真画面背后做了大约 10000 倍的脑内推演。
- 这就是 model-based 方法数据效率高的根本原因：真实数据只负责"校准模拟器"，大部分策略训练靠想象完成。

*所以这一节是想说：actor-critic 在世界模型的潜空间里同时跑 2500 条想象 x 15 步深，用 lambda-return 看远期、Reinforce 梯度调策略、target network 稳定训练，把一帧真数据扩展成上万倍的练习量。*

---

### 4. 落到真环境：闭环数据收集

**类比**

你在脑子里推演下棋只是练习，最终还是要上真棋盘走几手——一是验证脑内模拟器对不对，二是收集脑子里没见过的局面。

**它在干什么**

1. 把训好的 actor 放进真 Atari 模拟器跑一局（actor 在真环境时也加了 entropy 正则，鼓励探索）。
2. 把这局的画面 x_t、动作 a_t、奖励 r_t、折扣 gamma_t 存进经验数据集（FIFO 队列，最多 200 万帧）。
3. **每收集 4 步真环境数据，就用世界模型 + actor-critic 各更新 1 次梯度步**（policy steps per gradient step = 4）。
4. 整个训练在单卡 V100 上跑约 10 天，到 200M 真环境步（action repeat = 4，所以真正观测到的画面是 50M 帧）。
5. 评测协议：每局最多 108000 步（30 分钟游戏时长），sticky actions（25% 概率重复上一步动作），完整动作空间，不访问"剩余生命"信息，不用 frame stacking（世界模型自带时序记忆）。

**为什么这步有用**

- "想象 + 真实"闭环：真环境数据让世界模型见到新局面（比如从未探索过的游戏房间），不至于在自己想象里越走越偏（model exploitation）。
- 闭环的比例很关键：每 4 步真实数据配大量想象数据，相当于 1:10000 的真实 / 想象比——真数据是"锚"，想象数据是"练习量"。
- 这个闭环结构后来被 DreamerV3、TD-MPC、DayDreamer 等一票后续工作沿用，成为 model-based RL 的标准范式。

**超参总结（Atari 设定，论文 Table D.1）**

| 参数 | 值 | 含义 |
|------|-----|------|
| 数据集大小 | 200 万帧 FIFO | 最多存多少真实经验 |
| 批大小 B | 50 | 每轮训练用多少条序列 |
| 序列长度 L | 50 | 每条序列多少步 |
| 离散维度 | 32 组 | 潜状态有几个独立类别槽 |
| 每组类别数 | 32 | 每个槽几个选项 |
| RSSM 隐藏维度 | 600 | GRU 的 h_t 维度 |
| KL 系数 beta | 0.1 | KL loss 的整体权重 |
| KL balancing alpha | 0.8 | prior 训练占比 |
| 想象长度 H | 15 | 一次白日梦走多少步 |
| 折扣 gamma | 0.995 | 未来奖励衰减率 |
| lambda-return lambda | 0.95 | 偏长期 |
| Actor 梯度混合 rho | 1.0 | 纯 Reinforce |
| Actor 熵系数 eta | 1e-3 | 探索力度 |
| 世界模型学习率 | 2e-4 | Adam |
| Actor 学习率 | 4e-5 | Adam |
| Critic 学习率 | 1e-4 | Adam |
| Target network 同步间隔 | 100 步 | - |
| 每梯度步真环境步 | 4 | - |
| 总参数量 | 22M（世界模型 20M + actor 1M + critic 1M） | - |

*所以这一节是想说：DreamerV2 不是纯做白日梦——每 4 步真练习配套大量脑内推演，闭环让模型不会越练越偏。整套系统在单张 V100 上 10 天跑完一个游戏。*

---

### 方法整合：三阶段的训练循环

把上面四节拼起来，DreamerV2 的一轮训练就是不断重复这三步（论文称之为 model-based agent 的三个典型组件，致敬 Sutton 1991 年的 Dyna 框架）：

**Step 1 — 世界模型学习**：从经验数据集抽序列 -> 编码图像 -> 用 posterior 推断 z_t -> 用 KL balancing 训练 prior 贴近 posterior -> 重建图像 / 预测奖励 / 预测折扣 -> 联合优化所有损失。

**Step 2 — 行为学习（纯想象）**：从 Step 1 训练过程中的 posterior 状态出发 -> 在 prior 驱动的潜空间中展开 2500 条 x 15 步的想象轨迹 -> 用 lambda-return 训 critic -> 用 Reinforce（Atari）或直通梯度（连续控制）训 actor。世界模型参数在此阶段冻结——actor 和 critic 的梯度不影响模型表征。

**Step 3 — 环境交互**：actor 在真环境中执行动作 -> 收集新数据存入经验集 -> 回到 Step 1。

这三步的工程节奏是"每走 4 步真环境，做 1 轮 Step 1 + Step 2"。整个循环不断精进：世界模型越来越准 -> 想象轨迹越来越接近真实 -> actor 在想象中学到的策略越来越好 -> 在真环境中表现更好 -> 收集到更多样的数据 -> 世界模型进一步提升。

**从 V1 到 V2 的全部改动清单（论文 Appendix C）**

论文诚实列出了所有试过的改动和效果：

有效的改动：
- Categorical latents 替换 Gaussian latents（straight-through 替换 reparameterization）
- KL balancing 替换 free nats
- Reinforce only 替换 dynamics backpropagation（Atari 上）
- 模型规模从 13M 增到 22M
- Policy entropy 正则替换外部动作噪声

试了但没用的改动：
- Binary latents（大量二值变量代替 categorical）——比 categorical 差
- Long-term entropy（把策略熵纳入 value 目标）——没有改善
- Mixed actor gradients（混合 Reinforce + 直通）——在 Atari 上边际收益
- Scheduling（学习率 / KL scale / 熵 / 梯度混合做退火）——边际或无效
- Layer norm in GRU——无效

*所以这一节是想说：DreamerV2 = Dyna 框架的当代深度学习版本——"学模型 -> 想象训策略 -> 真实验证"三步闭环不断迭代。V1 到 V2 的核心跃升来自离散化 + KL balancing + 纯 Reinforce（Atari）+ 模型扩容。*

---

下图对比 V2 的招牌改动——离散潜状态 z 的结构，以及 KL balancing 的"二八开"方向拆分：

```
【离散潜状态 z：32 组 × 32 类 categorical】
   h_t ─┐              32 组独立类别槽 (组内 softmax 互斥)
   x_t ─┤            ┌──┬──┬──┬── ... ──┬──┐
        ▼            │▓ │  │▓ │        │  │  每组 one-hot
   CNN+MLP → logits  └──┴──┴──┴── ... ──┴──┘  → 1024 维稀疏向量
        │            前向: argmax 采样 (不可微)
        │            反向: straight-through (softmax 传梯度)
        ▼            混合后仍是 categorical → prior 能精确拟合 posterior

【KL balancing：把 KL 两个方向拆开、给不同强度】
   posterior q(z|h,x)          prior p(z|h)
   "亲眼看到"                   "光想就猜"
        │                          ▲
        │  ┌── 0.8·KL(sg[q]‖p) ────┘   训 prior 拼命追 posterior
        └──┤
           └── 0.2·KL(q‖sg[p]) ──►     只轻拉 posterior (留信息容量)

   做白日梦时只能用 prior → 让 prior 学准是重点
```

*上图说明：离散 z 用 32×32 categorical + 直通梯度表达"跳变型"画面；KL balancing 把 KL 二八开，重点训 prior（做梦时的唯一依靠）而不牺牲 posterior 的信息量。*

---

## 关键数字（What works）

数字本身不重要，重要的是它们告诉你什么"设计选择"才是关键。

| 数字 | 怎么算的 | 对比 | 翻译成人话 |
|------|---------|------|-----------|
| Gamer Median **2.15** | 55 个 Atari 游戏得分按人类玩家归一化后取中位数 | DQN 0.65、C51 1.09、Rainbow 1.47、IQN 1.29 | 一半游戏上能打到人类 2 倍以上，第一个纯世界模型 agent 登顶 |
| Clipped Record Mean **0.28** | 按人类世界纪录归一化、截断不超 1、取均值 | IQN 0.21、Rainbow 0.17、C51 0.15、DQN 0.12 | 论文推荐的鲁棒指标，不被少数游戏刷分主导 |
| 单卡 V100 **10 天** 200M 帧 | 一张 GPU 完整训完一个游戏的挂钟时间 | MuZero 单卡 80 天、SimPLe 40 卡天 | 普通研究组（一张 GPU + 10 天）就能复现 |
| 去掉离散 latent | 消融：32x32 categorical 换回高斯 | 0.25 -> 0.19（clipped record mean），42 个游戏上赢 | 最重要的单项改动 |
| 去掉 KL balancing | 消融：二八开换回 50/50 | 0.25 -> 0.16，44 个游戏上输 | 第二大功臣 |
| 去掉 image gradient | 消融：不让画面重建损失反传到表征 | 0.25 -> **0.01**，51 个游戏崩 | 世界模型完全靠画面重建学表征；没它就是瞎子 |
| 去掉 reward gradient | 消融：不让奖励预测梯度反传 | 0.25 -> 0.24，15 个游戏涨、22 个跌 | 奖励梯度不是核心信号，去掉甚至有些游戏变好——说明通用表征比奖励特化表征泛化更好 |
| 去掉 Reinforce | 消融：policy 只用直通梯度 | 0.25 -> 0.15，44 个游戏掉分 | Atari 上 Reinforce 是策略梯度的命根子 |
| 468B 想象状态 vs 50M 真观察 | 训练全程潜空间采样总数 / 真环境步数 | 比值约 10000:1 | model-based 的核心优势——一帧真数据带来一万倍脑内练习 |

**数字背后的故事**

消融表（Table 2）的排序清楚地显示了一个优先级：image gradients >> KL balancing > discrete latents > Reinforce >> reward gradients >= layer norm。最让人意外的可能是 reward gradient 的消融——去掉奖励梯度后有些游戏反而变好了。论文的解释是：不为预测过去的奖励而特化表征，反而让表征更通用、在新局面上泛化更好。这和 MuZero 形成有趣对比——MuZero 完全靠 value gradient 学表征，不重建画面，走的是"任务特化"路线。两条路各有所长。

*所以这一节是想说：决定胜负的是图像重建监督 > KL balancing > 离散潜状态 > Reinforce；少了任意一个都不同程度地崩。*

---

## 实验结果说明了什么

**评测协议**

DreamerV2 严格遵循 Machado et al. (2018) 的推荐评测方案：55 个 Atari 游戏、200M 环境步、action repeat 4、每局最多 108000 步（30 分钟）、sticky actions（25% 概率重复上一步）、完整动作空间、不访问剩余生命信息。不用 frame stacking——世界模型内置时序记忆（GRU）所以不需要叠帧。每个游戏独立训练一个 agent，每个 agent 只用一个环境实例。

**四种评分方式**

论文指出不同的评分聚合方式会得出不同的算法排名（比如 Gamer Median 下 Rainbow > IQN，但其他三种指标下 IQN > Rainbow），并推荐 clipped record mean 作为最鲁棒的指标——先按人类世界纪录归一化、截断到 [0,1]、再取均值。这样既不被少数游戏的超人分数主导（gamer mean 的问题），也不允许"一半游戏打零分"却不影响成绩（median 的问题）。

**单游戏表现细节**

DreamerV2 在大多数游戏上打平或超越 model-free 对手。最突出的优势在 James Bond、Up N Down、Assault 上。唯一明显翻车的是 Video Pinball——原因是关键物体（弹球）在画面上只占 1 个像素，重建损失几乎"看不见"它，世界模型因此抓不到核心动力学。这暴露了 DreamerV2 对图像重建的重度依赖：如果一个任务的关键信息在像素层面不显著，世界模型就学不好。

**计算预算**

单游戏 10 天 x 1 V100。55 个游戏 = 550 卡天。一组完整消融（55 games x 5 seeds x 10 days / seed）= 约 60000 卡天。这解释了为什么论文只做了 6 项消融而不是穷举——算力约束是真实的。

*所以这一节是想说：DreamerV2 在公认的严格评测协议下全面超越同预算的 model-free 对手，并且坦诚了评分方式对结论的影响和 Video Pinball 翻车的原因。*

---

## 你应该懂的几个新词

> **World Model（世界模型）**：agent 脑子里建的一个"环境模拟器"，给它当前状态和动作就能预测下一步的状态、奖励、是否结束。

> **Model-based RL（基于模型的强化学习）**：先学世界模型再用它练策略；和 model-free（直接用真数据练策略）对立。核心优势是样本效率——一帧真数据能在想象中被扩展成上万倍的训练量。

> **Latent dynamics model（潜动力学模型）**：在压缩后的状态空间（不是像素空间）里做动力学预测。比逐帧预测画面快几个数量级，是 DreamerV2 能并行跑 2500 条想象轨迹的前提。

> **RSSM（Recurrent State-Space Model）**：DreamerV2 用的世界模型架构。状态分确定性 GRU 隐藏态 h（600 维）和随机潜变量 z（32x32 categorical）两半。PlaNet 提出，Dreamer 系列沿用。

> **Categorical latent（类别潜变量）**：DreamerV2 的招牌——32 组、每组 32 类的离散变量。比高斯连续变量更适合表达跳变（进新房间、敌人消失），且混合后仍是 categorical，prior 能精确拟合。

> **KL balancing（KL 平衡）**：把 KL loss 的两个方向按 0.8 / 0.2 拆开训，重点提升 prior 的预测能力，避免 posterior 被拉偏。区别于 free nats 和 beta-VAE。

> **Imagination horizon（想象长度）**：一次脑内推演走多少步。DreamerV2 用 H=15。太短看不到远期奖励，太长误差累积。lambda-return 帮助减缓对 H 的敏感性。

> **lambda-return（lambda 回报）**：把 1 步到 H 步的回报按指数权重加权平均的稳健目标值。lambda=0.95 偏长期。在想象 MDP 中用于训练 critic。

> **Reinforce gradient（策略梯度）**：训 actor 的经典方法。无偏、方差大。Atari 上比直通梯度好用（rho=1）。

> **Straight-through gradient（直通梯度）**：让"采样离散变量"这种不可导操作能被反向传播跑过去的应急技巧。前向是真采样（one-hot），反向当成 softmax 概率。在世界模型中训练 categorical latent 时使用。

> **Sticky actions（粘性动作）**：Atari 评测的一个变体——25% 概率重复上一步动作。让游戏不再是确定性环境，更接近真实分布。Machado et al. 2018 推荐此协议。

> **Discount factor gamma（折扣因子）**：未来奖励的衰减率。gamma=0.995（Atari 默认）几乎不衰减；gamma=0.99 用于 Montezuma 这种稀疏奖励游戏，缩短有效视野。

*所以这一节是想说：上面这 12 个词是看任何 model-based RL 论文都会反复出现的核心词汇，理解了它们等于拿到了读整条 Dreamer 线的钥匙。*

---

## 它有什么搞不定的

DreamerV2 强归强，论文也老实交代了几个翻车场景和结构性局限：

1. **Video Pinball 翻车**：唯一明显输给 model-free 的游戏。原因是关键物体（弹球）在画面上只占 1 像素，图像重建损失根本"看不见它"，导致世界模型抓不到核心动力学。这暴露了一个结构性弱点：DreamerV2 的表征完全依赖图像重建——如果一个任务的关键信息在像素层面不显著，整个系统就会失效。MuZero 不重建画面靠 value gradient 学表征，所以不受此限。

2. **稀疏奖励游戏受限**：Montezuma's Revenge 这种"几分钟才有一次奖励"的游戏，要把 gamma 从 0.995（默认）降到 0.99 才稳定训练，且只能勉强追平专门做探索的 ICM 方法。根本原因是想象中的 actor-critic 依赖奖励信号来学策略——如果奖励极度稀疏，lambda-return 的估计值在很多想象轨迹中都是零，策略梯度失去方向。

3. **无跨任务迁移**：每个游戏单独训一个 agent，世界模型不在游戏之间复用。55 个游戏 = 55 个独立的世界模型 + 55 个独立的 actor-critic。要做 multi-task 和 zero-shot transfer 是后续 DreamerV3 / Genie / Cosmos 的事。

4. **没有 MCTS 规划**：MuZero 的蒙特卡洛树搜索能通过 look-ahead planning 进一步推高分数，DreamerV2 没用——actor 只做 1 步决策，不搜索未来树。作者明确说 MCTS 是"正交方向"，可以叠加在 DreamerV2 的世界模型之上，但论文没做这个实验。

5. **需要逐任务调超参**：beta、gamma、eta 在 Atari 和连续控制之间需要不同设定（如 beta=0.1 vs 1.0、rho=1 vs 0）。如果要迁移到全新领域（如机器人操作），需要重新搜索超参。这个问题直接推动了 DreamerV3 的核心目标——零调参通吃所有任务。

6. **消融不完整**：由于计算约束（每项消融需要约 60000 GPU 小时），论文只做了 6 项消融。一些潜在的交互效应（如 KL balancing + categorical 是否协同？或者仅其中一个就够？）无法解答。

*所以这一节是想说：DreamerV2 是"基线打通"的概念证明——像素依赖、稀疏奖励、跨任务迁移、规划深度、调参负担这些方向都是后续工作要补的坑。*

---

## 它和别的论文是什么关系

- **前传：PlaNet（Hafner 2018）+ DreamerV1（Hafner 2019）** — 同一作者。PlaNet 提出 RSSM 结构，V1 在其上加了 actor-critic in imagination，拿到连续控制 SOTA。V2 = V1 + 离散 latent + KL balancing + Reinforce + 模型扩容。从 V1 到 V2 的改动可以精确对应到 Appendix C 的 5 项有效改动。
- **同期对手：MuZero（Schrittwieser 2019）+ SimPLe（Kaiser 2019）** — Table 3 的全部三家。MuZero 强但贵且闭源（80 天 / 卡），靠 value gradient 学模型不重建画面；SimPLe 在像素空间预测不可扩展（只评了 36 个游戏且不随训练提升）。DreamerV2 找到了"潜空间 + 离散 + 图像重建"的甜点。
- **续作：DreamerV3（Hafner 2023）** — 同一组的"通用版"。核心改进：symlog 变换统一奖励尺度、free bits 替换 KL balancing、所有预测头改为离散回归。结果：同一套超参跨 150+ 任务不需调参。**真要部署 Dreamer，请直接用 V3。**
- **续作：DayDreamer（Wu et al. 2022）** — 把 DreamerV2 的框架直接拉到真实机器人上，四足 A1 在 1 小时真实行走中学会稳健步态，UR5 机械臂 10 分钟学会抓取。证明"潜空间想象"在物理世界也成立。
- **横向：MuZero vs DreamerV2** — 各有所长。MuZero 用 MCTS 在确定性 Atari 上打分更高，但算力 8 倍且不开源。两者的规划策略正交：MCTS 可以叠加在 DreamerV2 的世界模型之上。
- **具身 AI 方向：TD-MPC / Cosmos Policy / UniPi** — 把"世界模型 + 短期规划"的思路拓展到机器人控制。DreamerV2 提供的是这个方向的底层基础设施——可微的世界模型 + 在潜空间中训练策略的范式。
- **与 VLM 路线的区别：LLaVA / OpenVLA / SayCan** — VLM 做"理解 + 生成"，没有"在脑子里推演 + 拿奖励优化动作"的闭环。SayCan 用 LLM 做高层规划，底层动作仍需 world model + controller 来执行。两条路线互补。
- **认知科学映射** — DreamerV2 这条路是 Sutton 1991 年 Dyna 框架的当代版本：人脑就是一个一直在做"反事实想象"的 agent，DreamerV2 把这个想法在深度学习时代高性能地实现出来了。Craik (1943) 最早提出人脑维护外部世界"小规模模型"的观点。

*所以这一节是想说：DreamerV2 是 model-based RL 这条线的里程碑——上承 PlaNet/DreamerV1，下启 DreamerV3 和具身世界模型这一票后续工作。*

---

## 和本导读的关系

本导读 Ch15（世界模型）讲的是"让机器人在脑中建立环境的心理模型，在想象中练习和规划"这条技术路线。DreamerV2 在这条路线上的角色是"Atari 突破点"——它第一次证明了纯潜空间世界模型可以在最具竞争力的 RL 基准上打败所有同预算的 model-free 方法。

Ch15 描述的演化路径是 Ha (2018) -> PlaNet (2018) -> DreamerV1 (2020) -> DreamerV2 (2021) -> DreamerV3 (2023) -> Genie (2024) -> Cosmos (2025)。DreamerV2 在这条线上的位置是承上启下：

- **承上**：V1 用连续高斯 + actor-critic in imagination 打通了连续控制，但在 Atari 上力不从心。V2 用离散化 + KL balancing 解决了这个瓶颈。
- **启下**：V2 暴露的"逐任务调参"问题直接催生了 V3 的 symlog / free bits / 离散回归三件套。V2 的"潜空间想象 + 闭环数据收集"范式被 DayDreamer 搬到真实机器人上。

对于导读的读者来说，精读 V2 的核心收获是理解三个问题：(1) 为什么离散表示在建世界模型时比连续高斯更有优势；(2) KL 散度的两个方向分别在训什么，为什么不应该对称处理；(3) actor-critic 如何在纯潜空间中完成策略优化而不生成任何画面。这三个理解是后续读 V3、Genie、Cosmos 时的必要基础。

*所以这一节是想说：DreamerV2 是 Ch15 演化路径中 V1 和 V3 之间的关键桥梁——它证明了离散表示在世界模型中的优越性，直接推动了后续"通用世界模型"的发展。*

---

## 思考题

<details><summary>1. DreamerV2 把潜状态从高斯换成了 32x32 categorical。如果你把 32x32 改成 1024 个独立的二值变量（binary latent），表达能力理论上一样大（都是 1024 维二进制向量），为什么论文说 binary latent 效果更差？</summary>

关键区别在于"组内竞争"。32 组 x 32 类的 categorical 中，每组 32 个选项互斥——softmax 迫使组内概率加和为 1，形成天然的竞争关系（"选了 A 就不能选 B"）。这种组内竞争引入了一种结构化的稀疏性：每组恰好有 1 个被激活，模型被迫在每个"槽"里做出明确选择。

而 1024 个独立的 binary 变量没有这种组内结构——每个位可以独立为 0 或 1，缺乏"必须在几个选项里选一个"的归纳偏置。实践中 binary latent 倾向于学到冗余的编码（多个位编码相似信息），或者在 straight-through 梯度下训练更不稳定（每个 bit 的 sigmoid 输出独立优化，没有 softmax 的归一化约束来稳定概率分配）。

论文 Appendix C 直接报告 binary latent "比 categorical 差"，虽然没给详细分析，但从组合数学角度看：32 组 x 32 类有 32^32 约 1.46e48 种组合，1024 个独立 binary 只有 2^1024 约 1.8e308 种——表达空间反而太大了，缺乏结构约束反而让优化更困难。
</details>

<details><summary>2. KL balancing 用 alpha=0.8 让 80% 的 KL 梯度训 prior、20% 训 posterior。如果你把 alpha 设成 1.0（100% 训 prior，完全不约束 posterior），会发生什么？</summary>

alpha=1.0 意味着 posterior 完全不受 KL 正则约束。后果是 posterior 会变得"过于自由"——它可以把每帧图像的所有细节都编码进 z_t（因为没有压力让它保持简单），导致：

(a) posterior 的分布形状变得极其尖锐（方差趋近于 0），prior 很难追上——想象中使用 prior 时误差剧增。
(b) 世界模型丧失泛化能力——posterior 过拟合到训练数据的每一帧细节，遇到新画面时表征不稳定。
(c) 离散 latent 的表现可能退化为"查表"——每帧对应一个独特的类别组合，而不是学到有意义的抽象特征。

所以 20% 的 posterior 约束不是可有可无的——它提供了必要的信息瓶颈，迫使 posterior 只保留"对预测奖励和重建画面最有用"的信息，丢弃噪声细节。这个信息瓶颈也是 VAE 框架（ELBO）的核心原理。
</details>

<details><summary>3. 论文说 straight-through 梯度是 biased 的。这个 bias 具体是什么？为什么在世界模型训练中可以接受、但在 actor 训练中（Atari 上）反而不如 Reinforce？</summary>

Straight-through 的 bias 来源于：前向传播用的是 one-hot 采样（离散的、不连续的函数），反向传播却假装这步是连续的 softmax（用 softmax 概率的梯度替代）。真正的梯度应该对"采样这个离散决策"的效果做无偏估计，但 straight-through 跳过了采样操作的不可微性，用一个可微的近似替代——这就是 bias。

在世界模型训练中 bias 可以接受，因为目标是调整 logits 使得 softmax 概率更接近 posterior 的目标分布——softmax 概率本身就是我们要优化的东西，straight-through 只是让"采样"这一步不阻挡梯度流。KL 散度直接作用于概率分布，所以 bias 的影响较小。

在 actor 训练中情况不同：actor 的目标不是调整概率分布本身，而是让选出的具体动作使 lambda-return 最大。Straight-through 假设"微调 logits -> 微调概率 -> 最终选择的动作连续变化"，但实际上离散动作空间中微调概率可能导致选择的动作跳变（从"向左"跳到"向右"），这种跳变的效果无法被连续梯度正确估计。Reinforce 虽然方差大，但它对"选了这个动作后获得的回报"做无偏估计——在离散动作 + 稀疏奖励的 Atari 场景中，无偏比低方差更重要。
</details>

<details><summary>4. DreamerV2 在想象中用 actor-critic 训练策略，世界模型参数被冻结。如果不冻结世界模型（让 actor 的梯度也反传到模型参数），会怎样？</summary>

不冻结世界模型会导致"model exploitation"（模型漏洞利用）。actor 会发现世界模型的预测弱点，学会选那些让世界模型"产生错觉"的动作——模型误以为回报很高，但真实环境中回报很低。

具体来说：如果 actor 的梯度能影响世界模型参数，那么优化目标就从"在准确的世界模型中找最优策略"变成"同时改变世界和策略使得预测回报最大"。世界模型会被推向"对 actor 当前策略过于乐观"的方向——它会学到"actor 做的动作总是好的"，失去对真实环境的忠实建模。

这就像学生同时能改考题答案和自己的作答——他会把答案改成和自己的作答一致，而不是真正学会知识。分离模型训练和策略训练是 Dreamer 系列的核心设计原则。

论文在 Section 2.2 明确强调了这一点："The world model is fixed during behavior learning, so the actor and value gradients do not affect its representations."
</details>

<details><summary>5. 消融实验显示去掉 reward gradient（奖励预测梯度不反传到表征）后，有些游戏反而变好了。这说明了什么？对设计更好的世界模型有什么启示？</summary>

这个反直觉的结果说明：为预测过去经历的奖励而特化的表征，不一定是最有利于策略学习的表征。

具体原因：奖励梯度会推动表征去编码"这个状态曾经获得过多少奖励"这种历史信息。但策略需要的是"这个状态未来有多少潜力"——两者并不总是一致。比如，一个游戏中有些状态以前从未获得过高奖励（因为之前的策略太差到不了那里），但实际上它们离高奖励区域很近。如果表征被奖励梯度特化了，这些"潜力股"状态可能被编码得不够好。

启示：通用的、由图像重建驱动的表征可能比任务特化的表征泛化得更好——图像重建迫使模型保留环境的完整视觉信息，不管这些信息是否直接和奖励相关。这和自监督学习（SSL）的哲学一致：先学通用表征，再做下游任务。

这个发现也部分解释了为什么 MuZero（纯靠 value gradient 学表征）和 DreamerV2（主要靠 image gradient）能在不同游戏上各有优势——两种表征学习策略有不同的归纳偏置。
</details>

<details><summary>6. DreamerV2 用 H=15 步的想象长度。假设你有一个几乎完美的世界模型（预测误差极低），把 H 加大到 100 步甚至 1000 步会带来什么好处和风险？</summary>

好处：更长的想象视野让 actor 能"看到"更远期的奖励信号——对稀疏奖励游戏（如 Montezuma's Revenge）尤其有用，因为可能要走几十步才遇到第一个奖励。lambda-return 在长视野下也能给出更准确的价值估计。

风险即使模型"几乎完美"也存在：
(a) "几乎"的误差仍会累积。如果每步误差 0.1%，100 步后累积约 10%，1000 步后约 63%——想象轨迹后段可能已经和真实环境完全不同。
(b) 更长的想象轨迹意味着更长的反向传播链——梯度可能爆炸或消失（即使模型很准，链式法则的连乘效应仍然存在）。
(c) 计算成本线性增长：H=1000 时想象 2500 条轨迹需要 250 万次模型前向传播——可能比真环境交互还慢。
(d) lambda-return 在 lambda=0.95 时，H=100 的最远步权重已经衰减到 0.95^100 约 0.6%——信号极弱。要利用长视野需要更大的 lambda，但这又增加了方差。

实践中的折中：DreamerV2 选 H=15 是因为 lambda-return 本身就在做"用 critic 估计 15 步之后的未来"——即使只看 15 步，critic 的价值估计隐式包含了更远期的奖励信息。这比直接展开 1000 步想象要高效得多。
</details>

---

## 一些好奇心问答

**Q1：为什么离散变量比连续高斯好？**

论文给了 4 个猜想：(a) 类别混合还是类别，先验能精确拟合；高斯混合不是高斯，先验追不上。(b) 32 槽 x 32 类展开是 1024 位稀疏二进制向量，对泛化有好处。(c) 直通梯度避免高斯重参数化时的"梯度爆炸/消失"。(d) Atari 画面跳变多（进新房间、敌人消失），离散更适合表达"突变"。**作者也承认不知道哪个是真因**。

**Q2：32 x 32 这两个数怎么来的？**

论文没做过广泛的网格搜索。32 组 x 32 类是经验值——展开 1024 维和 V1 用的高斯潜变量维度差不多，方便对比。

**Q3：H=15 想象长度够不够？lambda=0.95 怎么定的？**

跟 V1 一致。H 太长，想象误差累积；太短，看不到长期奖励。lambda-return 把不同长度的预测加权平均，让长度选择不那么敏感。

**Q4：Reinforce 还是直通梯度？**

Atari 上 rho=1（纯 Reinforce），连续控制上 rho=0（纯直通）。**为什么 Atari 偏 Reinforce？**论文没给完全解释，猜测是离散动作 + 稀疏奖励让直通的 bias 影响更大。

**Q5：单卡 V100 10 天 x 55 个游戏 = 550 卡天，要这么多算力？**

是的。但消融做不全也是因为这——做一组完整消融要 60000 卡天，太贵。所以 Table 2 里只挑了 6 项最重要的消融。

**Q6：能不能把 DreamerV2 用到机器人？**

可以。论文 Appendix A 已经在 Humanoid Walk（21 维连续动作的人形机器人）上跑通了——只需要把 actor 输出从 categorical 改成 truncated normal 即可。后来 DayDreamer 把它直接放到真实物理机器人上，1 小时学会站立。

**Q7：和 MuZero 谁强？**

各有所长。MuZero 用 MCTS 在棋类和确定性 Atari 上打分更高，但贵且不开源。DreamerV2 算力 1/8、单卡可跑、开源，作者说 MCTS 是正交方向，可以叠加在世界模型之上。

**Q8：Sticky actions 是什么？为什么要用？**

每步有 25% 概率忽略你给的动作、改重复上一步。这让 Atari 不再是确定性环境，更接近真实场景的分布。Machado et al. 2018 推荐这个评测协议——之前很多 paper 在确定性 Atari 上分数虚高，sticky 是更公平的赛道。

*所以这一节是想说：实操问题（设计选择、算力、迁移、和谁打）作者都给了答案或开诚布公说"不知道"。*

---

## 如果你想再深入

按"前传 -> 同期对手 -> 续作 -> 衍生方向"四类排序：

1. **前传：PlaNet（Hafner 2018）+ DreamerV1（Hafner 2019）** — 同一系列。PlaNet 提出 RSSM 结构；V1 把它扩展到 actor-critic 拿到连续控制 SOTA。读完再看 V2 能很清楚看到"潜状态从高斯到离散"这一步的演化。
2. **同期对手：MuZero（Schrittwieser 2019）+ SimPLe（Kaiser 2019）** — Table 3 的全部三家。读这两篇能搞清楚"靠 value gradient 学模型"和"在像素空间预测下一帧"两条路为什么都走不远。
3. **续作：DreamerV3（Hafner 2023）** — 同一组的"通用版"，同一套超参跨 150+ 任务，引入 symlog reward 变换、free bits 等改动。**真要用 Dreamer，请直接读 V3**。
4. **续作：DayDreamer（Wu et al. 2022）** — 把 DreamerV2 直接拉到真实机器人上，1 小时学会四足走路。证明"潜空间想象"在物理世界也成立。
5. **衍生方向：TD-MPC / Cosmos Policy / UniPi** — 把"世界模型 + 短期规划"的思路拓展到机器人控制。可以理解为 DreamerV2 在具身 AI 时代的技术后代。

*所以这一节是想说：把 PlaNet -> DreamerV1 -> DreamerV2 -> DreamerV3 这条线连起来读，就是过去 5 年潜空间世界模型的全貌。*

---

## 原文信息

```bibtex
@inproceedings{hafner2021mastering,
  title     = {Mastering Atari with Discrete World Models},
  author    = {Hafner, Danijar and Lillicrap, Timothy and Norouzi, Mohammad and Ba, Jimmy},
  booktitle = {International Conference on Learning Representations (ICLR)},
  year      = {2021},
  url       = {https://arxiv.org/abs/2010.02193}
}
```

- 第一作者：Danijar Hafner（Google Research，Dreamer 三部曲全部第一作者）
- 通讯：mail@danijar.com
- 项目主页 & 开源代码：https://danijar.com/dreamerv2
- arXiv 版本：v4, 2022-02-12（ICLR 2021 camera-ready + 勘误）