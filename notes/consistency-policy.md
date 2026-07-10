---
title: "Consistency Policy: Accelerated Visuomotor Policies via Consistency Distillation"
slug: consistency-policy
topic: diffusion-policy
difficulty: ⭐⭐⭐
status: deep-read
来源: papers/consistency-policy/paper.md
venue: RSS
year: 2024
era: classic
num: 40
generated_at: 2026-06-25
---

# Consistency Policy：一步出动作的扩散策略蒸馏

> 这是一份给"完全没接触过 AI"的读者看的精读笔记。语言尽量像聊天，公式全部翻译成人话。

## 一句话讲什么（TL;DR）

机器人选下一步动作本来要慢慢搅 100 下才出一步，这篇教它一下就跳到答案——快约十倍，连笔记本都跑得动。

*所以这一节是想说：把扩散策略的"100 步炖煮"通过蒸馏压成"1 步出锅"，而且不输味道，还能塞进笔记本 GPU。*

---

## 这是个什么场景

想象你在用老式拍立得：按一下快门，照片要等几十秒慢慢显影，影像一层层浮现你才看得到结果。机器人现在用的 Diffusion Policy（Chi et al. 2023 RSS，当时的 SOTA）就是这种工作方式——给它一段人类示教（比如 200 段"看到杯子就去抓"的录像），它学到的是"先随机涂一团噪声，再一遍遍擦掉噪声"，擦个 100 遍才得到一条干净的动作轨迹。

问题来了：拍立得慢一点没事，机器人慢就要命。在 NVIDIA T4 上，DDPM 走 100 步要约 1 秒；用快一点的 DDiM 15 步也要约 11 ms。这对跑在笔记本 GPU 上的移动机器人和四旋翼就是致命的：

- 动态任务（接住一个滚下桌的球、跟着移动目标走）需要至少 30 Hz 控制频率，1 秒才出一动作根本来不及
- 板载算力受限：3070 Ti 笔记本 GPU 跑 100 步 DDPM 要 1.5 秒/步，跟瘫痪没区别
- 同一台机器还要并行跑视觉感知、SLAM 等其他模型，VRAM 早卷不动了

作者的目标：保留 Diffusion Policy 的成功率，把推理时间砍到约 1/10。

举个具体的：论文里的 Microwave 任务是"导航到微波炉 -> 开门 -> 拿一袋西兰花 -> 放进去 -> 关门 -> 按蔬菜键"——整套要在笔记本 + WiFi 路由器上跑，机械臂用的是 Kinova Gen3 7-DoF。如果每个动作要等 1.5 秒，机器人导航中就会"卡顿式前进"，必撞东西。所以"快"不是工程审美，而是任务能不能成。

*所以这一节是想说：扩散策略好用但慢，慢到没法在小机器上跑实时控制——这就是要解决的痛点。*

---

## 之前的人怎么做的，为什么不够好

加速扩散模型的几条路线，每一条都有缺陷：

**路线 1：减少去噪步数（DDiM、EDM）。** DDPM 是把去噪过程当随机微分方程（SDE）解，每步都要加一点布朗噪声，所以步数固定 100+。DDiM 改成解一个确定性的 ODE（常微分方程），可以训练时用 100 步、推理时只用 15 步。EDM 类似但调了 preconditioning 和 weighting。但步数砍太狠时质量会掉——尤其在 Tool Hang 这种难任务上，DDiM 9 步成功率从 .79 暴跌到 .14。

**路线 2：并行采样（ParaDiGMS）。** 用 Picard 迭代让 ODE 上多个点同时收敛，可以提速 1.6x 到 3.7x。但要求 GPU VRAM 巨大，笔记本 GPU 跑不动；而且仍然不是单步。

**路线 3：图像领域已经在用的"蒸馏"（Progressive Distillation, Consistency Models, InstaFlow 等）。** 图像生成里有一类工作：用预训练好的扩散老师，教一个学生网络"一步迈得更大"。其中 Consistency Models（Song 2023）和 Consistency Trajectory Models（CTM, Kim 2023）特别有意思——它们利用 ODE 的"自一致性"：同一条 ODE 轨迹上的任意两点应该被映射到同一个终点。这个性质在图像生成里能做到 1-2 步出图。之前两篇并行工作（Chen et al. 2023, Ding & Jin 2024）也尝试把 consistency model 用到强化学习的策略里，但都是基于状态的低维任务，且没用 CTM 这个更通用的框架。作者的贡献是第一次把 CTM 框架移植到高维视觉运动模仿学习上。

**路线 4：换底层架构（Behavioral Transformer / RT-1 / Octo / VLA）。** RT-1、BeT、Octo 这类 transformer 是真正的单步策略——根本不用扩散。但它们要么是 pre-training scale up 的产物（RT-1 在 130k+ 真实示教上训练，普通实验室复现不了），要么需要云端运行（RT-2、VLA），要么本身比 Diffusion Policy 在小数据集上的成功率低（论文 References [25] BeT 已被 DP 超越）。所以作者明确不选这条路，但也指出 Octo 这种本身就是扩散的通用策略，理论上也能被本文方法蒸馏——这是未来工作。

*所以这一节是想说：图像生成圈早把扩散提速研究透了，但机器人圈还在用 100 步 DDPM——本文要把图像那边的"蒸馏术"搬过来。*

---

## 这篇论文的新想法

核心一句话：把一个训好的 Diffusion Policy 当老师，蒸馏出一个能"任意起点 -> 任意终点"直跳的学生网络，让学生在推理时一步到位。

打个比方：老师是一个走过 100 次同一条山路的老向导，每段路怎么拐都门儿清。学生是个新来的徒弟，只学一件事——"不管师父把我扔在山路哪一段，我都直接告诉你山脚在哪"。这就是"自一致性（self-consistency）"：山顶（纯噪声 t=T）到山脚（动作 x_0）这条 ODE 路径上，任意两点 (x_t, x_u) 出发，最终都到同一个山脚。Diffusion Policy 学的是每段路怎么走（要走 100 步），学生学的是"路径上任意位置 -> 山脚直达"。

等等，先慢一拍——为什么不能直接让 Diffusion Policy 自己跑 1 步？因为它是按"小步挪"训出来的，网络只对"局部去噪"在行；让它从纯噪声 t=T 一脚跳到 0，吐出来的还是噪声。所以必须重新训一个网络，让它专门学"大步跳"。这个新网络就是学生，是本文的产物。

具体到论文，作者做了三件事：

第一，换个老师框架。好比"原本的师父用方言教，徒弟听不懂"——把 DDPM 老师换成 EDM 老师。因为 DDPM 是 SDE（带随机），蒸馏需要确定性的 ODE，所以必须切到 EDM/DDiM 这类。第二，借 CTM 目标函数。抄 Kim 2023 的 CTM 损失这道作业（任意两点 x_t, x_u 都要在 s 时刻预测出同一个 x_s），但发现它训练慢 40%，于是抄了个折中版"CTM-local"——只用相邻时间点 t 和 u=t-1，但允许 s 任意 < u。第三，三个工程小改动：低方差初始采样、离散化 chaining 时间点、dropout 破坏过度一致性。

学生网络 g_theta(x_t, t, s; o) 比老师 s_phi(x_t, t; o) 多一个输入：终点时间 s。给定起点 x_t、起点时间 t、终点时间 s 和观测 o，学生直接输出 x_s。推理时 t=T、s=0，一步出动作。

*所以这一节是想说：用一个学生网络去吃掉"沿路径走 100 步"这个过程，让推理变成一次函数调用。*

---

## 它分几步做的（方法）

整篇论文的方法分五大步：先训一个 EDM 老师、定义学生网络、构造 CTM-local 损失、设计推理模式、调工程细节。下面逐一展开，每一步都从"类比 -> 机制 -> 公式人话翻译 -> 为什么有用"的顺序讲清楚。

下图是五个组件之间的依赖关系与复现顺序（训练阶段 vs 推理阶段）：

```
        ┌──────────────────────────────────────────┐
        │  人类示教数据 (观测 o, 动作 x_0)           │
        └───────────────┬──────────────────────────┘
                        ▼
   Step0 ┌──────────────────────────┐
         │ EDM 老师 s_phi           │  确定性 ODE + Heun 二阶
         │ (DSM 损失训练)           │  9-15 步出动作
         └───────┬──────────────────┘
                 │ 热启动 + 零初始化新层
                 ▼
   Step1 ┌──────────────────────────┐
         │ 学生 g_theta(x_t,t,s;o)  │  比老师多一个终点输入 s
         └───────┬──────────────────┘
                 ▼
   Step2 ┌──────────────────────────┐   Step5
         │ CTM-local 一致性损失     │◄──── dropout=0.2
         │  L_CP = α·L_CTM + β·L_DSM│      (破坏过度一致性)
         │  老师走 t→u=t-1 一小步   │
         │  学生两路跳到 s 再到 0   │
         └───────┬──────────────────┘
      ═══════════╪═══════ 训练/推理分界 ═══════════════
                 ▼
   Step3 ┌──────────────────────────┐   Step4
         │ 推理: 1 步直跳 (~1ms)    │◄──── 从 N(0,I) 采样
         │ 或 3 步 chaining(~2ms)   │      (低方差初始)
         └──────────────────────────┘
```

*上图说明：EDM 老师是一切基础，学生继承老师参数后用 CTM-local 损失（配 dropout）学"任意起点直跳终点"，推理时一次前向即出动作。*

### Step 0：先训一个 EDM 老师

**输入**：人类示教数据集（观测-动作对），跟 Diffusion Policy 用的完全一样。

**处理**：用 EDM 框架训练一个扩散模型。EDM 学的是 ODE 的导数：给老师当前位置 x_t 和时间 t，它告诉你"这一刻应该往哪个方向走"。数学上写成：

```
dx_t / dt = -(x_t - s_phi(x_t, t; o)) / t
```

人话翻译：这个公式说的是"在 ODE 轨迹上，从 x_t 走一小步的方向，等于 x_t 到老师预测的干净动作 s_phi 之间的差值除以当前时间 t"。老师 s_phi 就是一个神经网络，它看到带噪声的动作 x_t 和观测 o，预测出干净的动作 x_0。

然后用 Heun 二阶数值积分往前推——相当于用一种更精确的"小步走"方法，比欧拉法（一阶）每步更准。

损失函数用的是 Denoising Score Matching（DSM）——给一个干净动作 x_0 加噪到 x_t，让老师预测回 x_0：

```
L_DSM(theta) = E[d(x_0, s_phi(x_t, t; o))]
```

人话翻译：随机选一个时间步 t，把真实动作加噪到 t 时刻的噪声水平，让网络预测原始动作，用距离 d 衡量预测和真实之间的差距。

距离函数 d 用 pseudo-huber loss（介于 L1 和 L2 之间，对 outlier 更鲁棒）：

```
d(x, y) = sqrt(||x-y||^2 + c^2) - c
```

其中 c = 0.00054 * sqrt(D)，D 是数据维度。为什么不直接用 L2？因为 L2 对离群值敏感——某次蒸馏中如果学生预测和老师差距太大，L2 会把这个样本的梯度放到天上去，搞崩训练。Pseudo-Huber 在大误差区域近似 L1，对离群值更稳。机器人动作数据少、易有 outlier 示教，所以这个细节比图像生成更重要。

**输出**：一个训好的 EDM 老师模型 s_phi，能用 Heun 积分走 9-15 步出动作。

类比：EDM 老师就是已经训好的 Diffusion Policy 的"加速版"，能用 9 步而不是 100 步出动作，但还不能 1 步。它是蒸馏的前提条件——没有好老师就没有好学生。

一个值得注意的工程选择：作者没有直接复用 Diffusion Policy 的 DDPM 老师，而是重新训了一个 EDM 老师。原因有两层。第一，DDPM 是 SDE 采样（每步加随机噪声），同一起点出发会走出不同路径，没法定义"同一条轨迹上的一致性"——一致性蒸馏的前提是确定性 ODE。第二，EDM 的 preconditioning 把网络输出归一化到同一尺度，不同 t 的损失贡献更均匀；原版 DDPM 的噪声预测在大 t 和小 t 之间量级差很多，直接当老师会让蒸馏信号不稳定。

另外，Heun 二阶 solver 比一阶 Euler 多一次函数求值（每步先 Euler 预测一个中间点，再用中间点修正），但精度显著更高。在老师这里多花一次前向无所谓——老师只在训练时被调用，推理时不用。这种"训练时对老师精度不吝啬、推理时只用学生"的思路贯穿全文。

*所以这一步是想说：先用标准方法训一个扩散老师，作为后续蒸馏的基础。选 EDM 而非 DDPM 是因为蒸馏需要确定性 ODE + 更稳定的损失尺度。*

### Step 1：定义学生网络 g_theta(x_t, t, s; o)

**输入**：带噪声的动作 x_t、起点时间 t、终点时间 s、观测 o。

**处理**：学生网络架构和老师几乎一样（1D Conv UNet + FiLM 条件层），只是 FiLM block 多吃一个 s 输入。这里有三个设计细节：

第一，多了一个输入 s。老师只知道"当前在哪"（x_t, t），学生还知道"要去哪"（s）。这让学生可以做任意跨度的跳跃——从 t 直接跳到 s，而不是只能走一小步。推理时 s=0 就是"一步到底"。

第二，热启动（warm start）。用老师的参数初始化学生——好比学生考试前先把老师的笔记背了一遍。这让学生一开始就不是从零学起，大幅加速收敛。

第三，零初始化新增层。新增的 FiLM 层（处理 s 的部分）参数初始化为零。为什么？如果新增层一开始就有随机参数，会立刻破坏从老师继承来的好参数。零初始化意味着新层一开始"不做任何事"（乘 0 或加 0），学生的行为和老师完全一致，然后慢慢学习如何利用 s 这个新信息。

**输出**：一个学生网络 g_theta，输入 (x_t, t, s, o)，输出 x_s（从 t 跳到 s 的预测）。

类比：学生的大脑构造和老师几乎一样（同样的 UNet），但多了一根"目的地天线"（s 输入）。老师只会沿路一步步走，学生可以直接传送到目的地。

为什么热启动这么重要？作者没有做"从随机初始化训学生"的消融（因为预期效果太差），但从 Consistency Models 原论文的经验来看，热启动能让训练收敛时间缩短 2-5 倍。直觉是：老师已经学会了"带噪声动作 -> 干净动作"的映射，学生只需要在此基础上多学一个"跳到中间时刻 s"的能力——这是增量学习，比从头学容易得多。

零初始化新增 FiLM 层的原理类似 LoRA 的初始化思路：新增的参数一开始不改变原有行为（输出恒为零），等反向传播慢慢把有用的信号写进去。如果用随机初始化，新层会在第一步就把从老师继承的好参数全部搅乱——相当于你抄了老师的笔记，结果还没翻开就先往上泼了一杯咖啡。

架构细节上，1D Conv UNet 的选择直接沿用 Diffusion Policy：输入是 T_p 个时间步的动作向量拼成的 1D 序列，经过下采样-中间块-上采样三段处理。FiLM 条件层把观测 o 和时间 (t, s) 通过一个 MLP 映射到 gamma 和 beta，对特征图做逐通道的仿射变换。时间 t 和 s 各自经过正弦位置编码后拼接，再送入 FiLM MLP——这是标准做法，和 Transformer 里的位置编码同源。

*所以这一步是想说：学生网络 = 老师网络 + "终点时间 s 输入" + 热启动 + 零初始化新层。热启动让增量学习成为可能，零初始化保护继承来的参数不被破坏。*

### Step 2：构造 CTM-local 损失——论文的核心

**输入**：训练数据中的观测-动作对、老师模型、学生模型。

**处理**：这是论文最核心的部分，对应 Fig. 2。一句话讲完：采样三个时间 0 <= s < u < t <= T，造两条"通往 s 的路径"，再各自被同一个 stopgrad 的学生带回 0，比较两个 0 时刻的预测。

现在用日常类比一步步走：

想象你在教一个导航学徒。你在同一条公路上选了三个路标：起点 t（最远）、中间点 u（近一点）、目标 s（更近）。训练方式是这样的：

第一步：在 ODE 路径上采一个起点 x_t。这相当于把学徒扔到公路上的 t 路标处。

第二步：用老师走 t->u 这一步（CTM-local 里 u = t-1，所以只走 1 步）得到 x_u。老师只走一步是因为它对"局部导航"很在行——这是它的本职工作。

第三步：学生从 x_t 一步跳到 s 时刻，得到 x_s^(t) = g_theta(x_t, t, s; o)。这一步有梯度（蓝色路径）。这是我们想训练的核心能力——"远距离传送"。

第四步：学生从 x_u 一步跳到 s 时刻，得到 x_s^(u) = g_theta(x_u, u, s; o)。这一步 stopgrad（橙色路径）。stopgrad 是 PyTorch 里的 .detach()，意思是"这条路径不回传梯度"——它只提供参考答案，不参与训练。

第五步：再用 stopgrad 学生把 x_s^(t) 和 x_s^(u) 都从 s 走到 0。

第六步：在 0 时刻比较两个最终预测的差距。

损失函数写出来：

```
L_CTM = d(g_theta(x_s^(t), s, 0; o), g_theta(x_s^(u), s, 0; o))
```

人话翻译：学生从两个不同起点（t 和 u）出发，各自跳到 s，再各自跳到 0。如果学生真的学会了 ODE 轨迹的结构，两条路径在 0 时刻应该重合——因为它们本来就在同一条 ODE 轨迹上。

为什么必须先回到 0 时刻才比？因为损失函数应该作用在最终的"动作空间"，而不是中间某个噪声水平。s 时刻的动作只是半成品，在半成品上比差距会引入噪声水平带来的尺度差异。在 0 时刻（完全干净的动作空间）比，尺度一致、物理意义明确。

为什么只有 t->s 这一条有梯度？如果所有路径都有梯度，学生可以通过"作弊"让两条路径结果接近——比如学一个把所有输入都映射到同一个点的退化映射。只让一条有梯度，另一条作为固定参考，迫使学生真正学到 ODE 的结构。

**CTM vs CTM-local vs Consistency Distillation 三者的区别**：

Consistency Distillation（Song 2023 原版）：t 和 u 相邻、s 固定为 0。最简单，但约束最弱——只学了"相邻两步最终到 0 一致"。Square 成功率 .88。

CTM（Kim 2023 原版）：t 和 u 可以是任意距离、s 也任意。约束最强，但训练慢 40%——因为 t 和 u 之间的大距离需要老师走很多步（每步都是一次前向传播）。Square 成功率 .91。

CTM-local（本文）：t 和 u 相邻（只走 1 步）、s 任意。折中方案——像 Consistency Distillation 一样快，像 CTM 一样灵活。训练速度和 Consistency Distillation 一样，Square 成功率 .92，反而最高。

总损失：

```
L_CP = alpha * L_CTM + beta * L_DSM
```

人话翻译：总损失 = 一致性损失（让学生学会跳跃） + 去噪损失（让学生本身的预测能力不崩）。DSM 项保证学生不至于因为 CTM 信号消失而崩盘（见后文 dropout 那段）。alpha 和 beta 是可调超参数。

为什么需要 DSM 兜底？有两个原因。第一，CTM 损失是相对的——它只要求两条路径在终点一致，但不保证终点本身是正确的动作。极端情况下，学生可以把所有输入映射到同一个错误的点，CTM 损失仍然为零。DSM 损失提供了绝对监督——"你的预测必须接近真实动作"。第二，当训练早期学生还很弱时，CTM 损失的梯度方向可能很混乱（因为 stopgrad 路径的预测也不靠谱），DSM 损失提供了稳定的梯度方向让训练不至于发散。

训练时的采样策略也值得关注。时间步 t 和 s 分别从离散化时间网格上均匀采样。为什么不用 log-normal 之类的加权采样？作者引用了 EDM 的经验：均匀采样在机器人动作空间上已经足够。图像生成领域的加权采样策略（更多关注高噪声水平）在低维动作空间未必适用——因为低维空间中不同噪声水平的难度差异没有高维那么悬殊。

**输出**：训好的学生模型参数 theta。

类比：CTM-local 像在教学生"路径压缩"——老师走慢路（t->u 一步），学生从两个不同起点都要跳到 s，再各自跳到 0。如果学生学会了，两条路径在 0 时刻应该重合。DSM 是额外的"期末考试"——不光要两条路合到一块，合到的那个点还得是正确答案。

*所以这一步是想说：CTM-local 损失是本文的技术核心——用"同一条 ODE 轨迹上不同起点的一致性"来训练学生的跳跃能力，外加 DSM 损失提供绝对监督兜底。*

### Step 3：推理两种模式

**输入**：训好的学生模型 g_theta、当前观测 o。

**处理与输出**：

**1 步推理**（速度优先）：从标准正态分布采一个噪声 z ~ N(0, I)，一次调用 x = g_theta(z, T, 0; o)，直接把 x 当动作执行。耗时约 1 ms。

整个推理就是一次函数调用——跟调用一个普通神经网络一样简单。不需要循环、不需要迭代、不需要老师。这就是蒸馏的全部意义。和 Diffusion Policy 推理时的循环对比：DP 要 for t in range(T, 0, -1): x = denoise(x, t)，循环 100 次；CP 是 x = g_theta(z, T, 0; o)，一行搞定。

**3 步推理**（精度优先，用 chaining）：先 1 步生成 x_0 = g_theta(z, T, 0; o)，再给 x_0 加噪到 t_1 得到 x_{t_1}，再 1 步去噪 x_0' = g_theta(x_{t_1}, t_1, 0; o)，再加噪到 t_2 得到 x_{t_2}，最后 1 步去噪 x_0'' = g_theta(x_{t_2}, t_2, 0; o)。总共 3 次学生前向。

为什么 chaining 有效？直觉是"先画大轮廓、再修细节"。第一步从纯噪声跳到 0，拿到一个粗略的动作；加噪到较低水平 t_1 相当于"只模糊细节但保留大方向"；再去噪一次就是在大方向不变的前提下修正细节。这和图像生成中的 SDEdit 思路类似——通过可控的噪声注入 + 去噪来精炼结果。

chaining 时间点怎么选？作者发现不同噪声水平对应不同"特征粒度"：很早的 t（接近 0）只调微小特征，很晚的 t（接近 T）只决定大致方向。真正重要的细节集中在"早中段"。所以 chaining 时间点选在离散化时间网格的 2/3 和 1/3 处，即 {t_(2N/3), t_(N/3)}。

为什么用离散化网格切分而不是在连续时间上等分？因为 EDM 的时间网格在 t 接近 0 时非常密集（细节最多），等分连续时间会漏掉这些密集区域。EDM 的离散化网格按 sigma(t) = (sigma_min^{1/rho} + (i/N-1)(sigma_max^{1/rho} - sigma_min^{1/rho}))^rho 分布，rho=7 让小 sigma 区间有更多网格点——这保证了细粒度调整发生在最需要的区域。消融实验印证了这一点（Table VII）：离散切分在 Tool Hang 上比连续切分高 5 个百分点（.77 vs .72）。

另一个实践细节：chaining 的加噪步骤用确定性加噪（不加随机噪声），保证同一个初始采样在多次 chaining 后结果确定。如果加噪用随机的，每次 chaining 结果不同，策略输出就会抖动——对机器人控制来说是灾难性的。

3 步推理耗时约 2 ms——仍然比 DDiM 15 步的 11 ms 快 5 倍多。

*所以这一步是想说：推理时一步直跳，可选 3 步打磨。1 步追求极速，3 步追求精度，都远快于原始扩散。*

### Step 4：低方差初始噪声——一个反直觉的小改动

**输入**：需要确定推理起点的噪声分布。

**处理**：传统扩散从 z ~ N(0, T^2 * I) 出发——标准正态乘 T，这里 T 是最大时间步，所以初始噪声方差很大。本文改成 z ~ N(0, I)——直接从标准正态采，方差小得多。

为什么这样更好？需要理解高维高斯分布的一个反直觉性质。高维高斯的概率质量集中在"球壳"上（远离中心），这叫"concentration of measure"。但机器人动作空间维度低（16 步 x 10D = 160D），远低于图像空间（32x32x3 = 3072D 的 CIFAR）。低维情况下高斯中心附近仍有足够的概率质量，模型在中心区域学到了有效的 score 支持。

作者用 CIFAR-10 做了对照实验验证这个假说：同一个 EDM 模型，低方差出发的生成结果是一坨灰块（模型没在中心区域学到东西），高方差出发才出正常图片。这说明低方差初始采样是机器人动作空间的特有优势，不适用于图像生成。

另一个解释来自 Pearce et al. 2022 的假说：在模仿学习中，把输出推离高概率无条件区域（数据分布的中心）是有害的。高方差采样恰好做了这件事——它把起点推到了高概率区域之外。低方差采样让起点留在分布中心，更"in-distribution"。

**输出**：推理时从 N(0, I) 而非 N(0, T^2 * I) 采样初始噪声。

消融数据：Square 任务 1-step 从 .90 涨到 .92，3-step 从 .91 涨到 .96——3-step 提升尤其明显，可能是因为后续 chaining 步骤的加噪-去噪过程能恢复高方差位置的表达能力。

*所以这一步是想说：机器人动作空间维度低，从"球心"而非"球壳"出发采样更靠谱——这是一个领域特有的工程洞察。*

### Step 5：Dropout 的隐藏角色——一个意外发现

**输入**：训练中的学生网络、CTM 损失。

**处理**：作者无意中发现：CTM 损失里的 s->0 那两段（红色到 0 时刻的最终对比）必须开 dropout，否则训练信号会消失。

为什么？回到 CTM 损失的结构。loss 比较的是 g_theta(x_s^(t), s, 0; o) 和 g_theta(x_s^(u), s, 0; o) 的差距。因为学生网络足够强（warm start 自老师），s->0 这一步几乎是确定性映射——给它任何 x_s，它都能精确地映射到 x_0。这意味着即使 x_s^(t) 和 x_s^(u) 差距很大，它们被 s->0 映射之后差距可以变得极小。经验上，作者发现 d(x_s^(t), x_s^(u)) 比 d(g_theta(x_s^(t), s, 0; o), g_theta(x_s^(u), s, 0; o)) 大了至少两个数量级——损失几乎为零，梯度消失。

开 dropout 后，s->0 变成随机过程——每次有不同的神经元被关掉，同一个输入得到不同的输出。这破坏了"过度一致性"，让损失项重新有信号。

Table IX 实测：disable s->0 dropout，Square 从 .92 掉到 .86。整体 dropout rate = 0.2。

这是论文一个比较 hacky 但又重要的发现：dropout 不是为了正则化（防止过拟合），而是为了"破坏过度一致性"——一个完全不同于传统理解的用途。作者承认对此没有完整的理论解释，但实验结果非常一致。

**输出**：训练时 s->0 路径必须开 dropout=0.2。

*所以这一步是想说：dropout 在这里的作用不是防过拟合，而是制造"信号扰动"让 CTM 损失不至于因为学生太强而消失——一个实践先于理论的发现。*

### 方法总结

把五步串起来：训练 = "先训 EDM 老师 -> 定义学生（多一个 s 输入 + 热启动 + 零初始化）-> 用 CTM-local 一致性约束 + DSM 兜底训练 -> dropout 破坏过度一致性"；推理 = "一步直跳（从 N(0,I) 出发），可选 3 步 chaining 打磨"。

整体 trade-off 很清晰：训练贵（要先训老师、再训学生、每步学生要跑老师+多次学生前向），推理便宜（1 次前向传播 = 1 ms）。这是典型的边缘部署模式——在云端花大力气训练，在设备端用极低成本推理。

梳理一下各组件之间的依赖关系：EDM 老师是一切的基础（Step 0）；学生的架构和初始化依赖老师（Step 1）；CTM-local 损失同时依赖老师（走一步生成 x_u）和学生（两条路径）（Step 2）；推理模式独立于训练过程，只依赖学生模型（Step 3）；低方差初始噪声（Step 4）影响推理和训练数据分布；dropout（Step 5）只影响训练。如果你要复现这篇工作，训练流程是 Step 0 -> Step 1 -> Step 2+5 联合训练 -> Step 3+4 推理。

一个容易被忽略的点是观测编码器（ResNet-18 或 ViT）的处理方式：老师和学生共享同一个观测编码器，蒸馏过程中冻结（不更新）编码器参数。这意味着编码器的质量完全取决于老师训练阶段——如果编码器没训好，蒸馏也救不回来。在真实世界实验中，图像编码器占推理时间的 6 ms（总共 21 ms），是一个不容忽视的常数项开销。

*所以这一节是想说：训学生 = "走老师路径 + 一致性约束 + DSM 兜底 + dropout 制造扰动"；推理 = 一步直跳，可选 3 步打磨；初始噪声从中心采。五个组件之间有明确的依赖关系，复现时按 0->1->2+5->3+4 的顺序走。*

---

下图对比 CTM-local 损失的"双路径一致性"结构，以及推理时 1 步与 3 步两种模式：

```
【训练：CTM-local 双路径在 0 时刻比对】
   采样 0 ≤ s < u < t ≤ T

   x_t ──学生跳到s──► x_s^(t) ──学生──► x_0^(t)   蓝色路径(有梯度)
    │                                      ▲
    │老师走一步 t→u=t-1                     │比对 d(·,·)
    ▼                                      ▼
   x_u ──学生跳到s──► x_s^(u) ──学生──► x_0^(u)   橙色路径(stopgrad)
              (s→0 段开 dropout 破坏过度一致性)
   L_CP = α·L_CTM(两路在0时刻的差) + β·L_DSM(绝对监督)

【推理：1 步 vs 3 步 chaining】
   1 步:  z~N(0,I) ──g_theta(z,T,0)──► 动作          (~1 ms)

   3 步:  z ─►x_0 ─加噪t1─►x_t1 ─►x_0' ─加噪t2─►x_t2 ─►x_0''
              g          (2N/3网格点)      (N/3网格点)   (~2 ms)
              └── 先画大轮廓 → 逐次修细节（确定性加噪）──┘
```

*上图说明：训练靠"同一 ODE 轨迹上两个起点的预测必须在 0 时刻重合"来逼学生学到全局结构；推理时一次前向即出动作，3 步 chaining 用离散网格点加噪-去噪打磨细节。*

---

## 关键数字

### 仿真任务主表（Table I，6 个任务，每个 200 次 rollout）

| Policy | NFE | Lift | Can | Square | Tool Hang | Push-T |
|---|---|---|---|---|---|---|
| DDPM | 27 | 1.00 | .97 | .93 | .79 | .87 |
| DDiM | 9 | 1.00 | .82 | .85 | .14 | .78 |
| **CP 1-step** | **1** | 1.00 | .98 | .92 | .70 | .82 |
| **CP 3-step** | **3** | 1.00 | .95 | .96 | .77 | .84 |

NFE = Number of Function Evaluations，跑一次推理要前向网络几次。注意 DDPM 的 27 / DDiM 的 9 已经是用 ParaDiGMS 加速过的乐观估算（原本是 100 / 15）。

### Franka Kitchen 仿真结果（Table II，长时序多阶段任务）

| Policy | NFE | p1 | p2 | p3 | p4 |
|---|---|---|---|---|---|
| DDPM | 27 | 1.00 | 1.00 | 1.00 | .98 |
| DDiM | 9 | 1.00 | .98 | .98 | .93 |
| CP 1-step | 1 | .99 | .96 | .95 | .93 |
| CP 3-step | 3 | .99 | .96 | .97 | .94 |

p4 表示连续完成 4 个子任务的比例。CP 在 p1/p2 略输但在 p4 上和 DDiM 持平。

### 仿真推理时间（Table III，NVIDIA P5000，Robomimic Square）

| Policy | NFE | 推理时间 |
|---|---|---|
| DDPM | 100 | 110 ms |
| DDiM | 15 | 11 ms |
| **CP 1-step** | **1** | **1 ms** |
| **CP 3-step** | **3** | **2 ms** |

### 真实世界 3 个任务（笔记本 3070 Ti, 8GB VRAM）

| 任务 | DDiM 成功率 | CP 成功率 | DDiM 推理 | CP 推理 |
|---|---|---|---|---|
| Trash Clean Up | 0.8 | 0.8 | 192 ms | 21 ms |
| Plug Insertion | 0.6 | 0.7 | 198 ms | 22 ms |
| Microwave (移动臂) | 0.5 | 0.4 | -- | -- |

### 推理时间拆解（Table XI，3070 Ti 笔记本 GPU）

| 组件 | DDiM | CP |
|---|---|---|
| 图像编码器 | 6 ms | 6 ms |
| 策略网络前向 | 179 ms | 13.5 ms |
| 总推理时间 | 192 ms | 21 ms |

网络部分相对加速 13.3x，整体加速 9x。差距在于图像编码这个"固定开销"对两个方法是一样的——这意味着如果策略网络占总推理时间的比例越大，CP 的加速效果越明显。

### 消融实验汇总

| 消融维度 | 结果 | 含义 |
|---|---|---|
| Consistency Distillation | .88 | t/u 相邻 + s=0，最简单的 CM 目标 |
| CTM | .91 | 任意 t/u/s，原版 CTM |
| **CTM-local（本文）** | **.92** | 相邻 t/u + 任意 s，训练快 40% |
| 高方差 N(0, T^2*I) 初始 | .90 / .91（1/3 步） | EDM 标配 |
| **低方差 N(0, I) 初始** | **.92 / .96** | 3-step 提升尤其明显 |
| 离散化 chaining | .96 / .77（Square / Tool Hang） | 离散网格 2/3, 1/3 切分 |
| 连续 chaining | .94 / .72 | 在连续时间上等分 |
| Teacher .92 -> Student .92 | 鲁棒 | 老师和学生成功率一样 |
| Teacher .88 -> Student .92 | 鲁棒 | 老师差一点也无所谓 |
| Teacher .84 -> Student .88 | 略掉 | 老师太差时学生开始受影响 |
| Dropout enabled (0.2) | .92 | 必须开 |
| Dropout disabled in s->0 | .86 | 否则信号消失 |

### Consistency Training（teacher-free）对照（Table X）

| 方法 | NFE | Lift | Square |
|---|---|---|---|
| CT Policy（用 Monte Carlo 估 score） | -- | .91 | .55 |
| **CP (ours)** | **1** | **1.00** | **.92** |

CT Policy 在简单任务（Lift）还行，难任务（Square）直接崩到 .55。这印证了"高维视觉策略需要老师，不能 teacher-free"。

*所以这一节是想说：成功率打平 DDPM、推理快约一个数量级；3 步比 1 步在难任务上多 7-10 个百分点；消融全方位印证三个设计选择都有效。*

---

## 实验结果说明了什么

从数据中可以提炼出四个关键结论：

第一，单步推理不等于质量崩盘。CP 1-step 在 6 个仿真任务中有 3 个（Lift、Can、Push-T）接近或超过 DDPM 100 步的成绩。这说明一致性蒸馏真的学到了 ODE 轨迹的全局结构，而不是简单地"砍步数"。

第二，3 步 chaining 是性价比最高的选项。在难任务（Square .96、Tool Hang .77）上，3 步比 1 步提升显著，同时推理只从 1 ms 涨到 2 ms。这 1 ms 的代价换来了接近 DDPM 的精度，是实际部署中的最佳平衡点。

第三，真实世界加速被"固定开销"稀释。理论上 NFE 从 15 降到 1 应该加速 15 倍，实测只有 9 倍——因为图像编码器的 6 ms 是两个方法共享的。这意味着如果未来用更轻量的图像编码器（比如 MobileNet），CP 的相对优势会更大。

第四，Consistency Training（不用老师）在高维视觉任务上不可行。CT Policy 在 Square 上只有 .55，比有老师的 CP 低了 37 个百分点。原因是 Monte Carlo score estimator 在高维空间方差太大，提供的梯度信号太嘈杂。这个对照实验是论文中特别有价值的阴性结果——它告诉你"走近路（不训老师）是行不通的"。

*所以这一节是想说：实验证明蒸馏路线有效、3 步 chaining 是甜点、固定开销会稀释加速比、teacher-free 在高维上不行。*

---

## 你应该懂的几个新词

- **Diffusion Policy**：把动作序列当数据，用扩散模型去噪生成。Chi et al. 2023 RSS，本文的"老师"原型。
- **DDPM (Denoising Diffusion Probabilistic Models)**：2020 经典扩散，等价于解 SDE，固定 100+ 步。
- **DDiM (Denoising Diffusion Implicit Models)**：2021 改进版，等价于解 ODE，可变步数（也可少到 9-15）。
- **EDM (Elucidating the Design Space)**：Karras 2022 NeurIPS，DDiM 的变种，preconditioning 和 weighting 更优。本文老师用 EDM。
- **Score function**：对数密度梯度，告诉你"从当前位置往哪走概率更高"。扩散模型本质上就在学这个函数。
- **PFODE (Probability Flow ODE)**：把 SDE 扩散转换成等价的 ODE。ODE 的好处是确定性——同一起点只有一条路径，这是一致性蒸馏的前提。
- **Consistency Model**：Song 2023，单步生成的扩散学生模型，靠"自一致性"训练——同一条 ODE 上任意两点应映射到同一终点。本文是它在机器人上的扩展。
- **CTM (Consistency Trajectory Model)**：Kim 2023，CM 的泛化版，允许任意时间点对和任意终点 s，不局限于 s=0。本文的训练目标基础。
- **CTM-local**：本文的折中方案——相邻 t/u（local）+ 任意 s。训练和 Consistency Distillation 一样快，效果和 CTM 一样好。
- **NFE (Number of Function Evaluations)**：跑一次推理调神经网络几次。NFE=1 就是单步推理。
- **stopgrad**：PyTorch 里 .detach()，告诉自动微分"这条路径不要回传梯度"。CTM 损失里只有 t->s 一条蓝色路径有梯度。
- **DSM (Denoising Score Matching)**：扩散模型的训练损失，让网络从加噪样本预测原始样本。本文同时用 DSM 和 CTM 两个损失。
- **Pseudo-Huber loss**：d(x,y) = sqrt(||x-y||^2+c^2) - c，介于 L1/L2 之间，对离群值鲁棒。
- **Chaining steps**：3 步推理时反复"加噪-去噪"打磨，时间点是预设超参。
- **FiLM (Feature-wise Linear Modulation)**：一种把条件信息（时间步、观测）注入 CNN 的方式。FiLM(h) = gamma * h + beta，gamma 和 beta 从条件信息算出。论文里 UNet 用它吃 t 和 s。

*所以这一节是想说：术语主要来自扩散圈，机器人圈的同学需要先熟悉 score / ODE / SDE 这套语言。*

---

## 它有什么搞不定的

作者自己在 Limitations 里说得很坦诚：

**1. 多模态丢失。** Diffusion Policy 的强项之一是表达"多种合理动作"（比如 Push-T 既可以从左推也可以从右推）。Consistency Policy 蒸馏的是确定性 ODE（PFODE），所以倾向于收敛到一种动作。具体来说，DDPM 用的是 SDE（带随机布朗运动），自然表达多模态；EDM 和 CTM 学的是确定性 ODE，同一条 ODE 轨迹上只有一个终点。在 Push-T 上观察到了明显的偏好——机器人总是从同一侧推，虽然成功率还可以，但不优雅。对于需要灵活选择不同策略的任务，这可能是致命的。

**2. 训练不稳定且更慢。** CTM 损失自带递归（学生既出现在主路径又出现在 stopgrad 路径），训练比 Diffusion Policy 抖。而且训练成本高：每步学生训练 = 跑一次老师前向 + 多次学生前向，总训练时间是 Diffusion Policy 的好几倍。论文里 Microwave 因为没训到收敛就因时间限制停了——典型的"训练贵、推理便宜"。

**3. 长时序任务掉链子。** Franka Kitchen 的 p4（连续完成 4 个子任务）和 Microwave（移动操作）上 CP 略输 DDiM。长时序任务需要跨多个阶段保持一致的规划，单步推理可能在这方面不如多步迭代的扩散——毕竟多步迭代有机会在每一步修正方向。

**4. Dropout 谜题缺乏理论解释。** 作者发现 s->0 这一段必须开 dropout（否则 L_CTM 几乎消失），但完整解释不清楚。这意味着如果你想把 CTM-local 用到其他任务或架构上，可能需要重新调 dropout 的位置和比例——缺乏理论指导就只能靠试。

**5. 离散积分和数值误差未充分探讨。** 用 Heun 二阶 + EDM 时间网格是合理选择，但论文没有探讨更高阶积分器（如 RK4）是否能进一步提升老师质量、进而提升学生质量。这留下了一些低垂果实。

**6. 没和大模型 baseline 比。** RT-1、RT-2、Octo、VLA 这些没进对比表。作者解释是它们靠云端大模型，和"板载小 GPU"场景不匹配——但这也意味着 Consistency Policy 的方法学贡献和 VLA 路线是正交的。理论上 Octo 也可以被蒸馏，但这还只是设想。

*所以这一节是想说：单步推理换来速度，代价是多模态表达、训练稳定性、超长时序任务上的轻微退步，以及几个缺乏理论解释的工程 hack。*

---

## 它和别的几篇是什么关系

**直接依赖的论文**：

- Diffusion Policy (Chi et al. 2023, RSS)：直接老师，本文的对照基线。沿用 UNet 架构、observation/action 格式。没有 Diffusion Policy 就没有 Consistency Policy。
- EDM (Karras et al. 2022, NeurIPS)：扩散框架基础，本文老师就是 EDM。提供了 preconditioning、weighting、Heun solver 这套基础设施。
- Consistency Models (Song et al. 2023)：图像生成里的单步扩散学生，"Consistency Distillation"原型。本文的起点。
- CTM (Kim et al. 2023)：图像生成里更通用的一致性轨迹模型，本文目标函数的直接来源。CTM-local 是对它的简化。

**同方向的加速工作**：

- ParaDiGMS (Shih et al. 2023)：另一条加速路线（并行采样），本文把它当 baseline 加速参考。两者互补——ParaDiGMS 不改网络改调度，CP 不改调度改网络。
- InstaFlow (Liu 2023)：单步蒸馏的另一条路（Rectified Flow），和 Consistency 是竞争关系。
- Progressive Distillation (Salimans & Ho 2022)：蒸馏路线的早期代表，逐步把步数减半。CP 一步到位，比它更激进。

**并行/后续的机器人一致性模型工作**：

- Chen et al. 2023："Boosting Continuous Control with Consistency Policy"，把 consistency model 用到状态空间 RL，但是低维、没有视觉。
- Ding & Jin, ICLR 2024："Consistency Models as Rich Policy Class"，用 Consistency Training（teacher-free），但在视觉运动任务上远不如本文的蒸馏方案（Table X）。

**机器人扩散策略族谱**：

- 3D Diffusion Policy (Ze et al. 2024)：点云输入版 Diffusion Policy，本文方法对它也适用（只改了推理采样，和感知输入无关）。
- Octo (Ghosh et al. 2023)：通用机器人扩散基础模型，作者认为 Octo 可以同样被蒸馏（未来工作）。
- BeT / VQ-BeT (Shafiullah 2022, Lee 2024)：单步 transformer 路线（替代方案，非扩散）。

**技术族谱**：DDPM -> DDiM -> EDM -> Consistency Models -> CTM -> Consistency Policy。机器人侧：BC-RNN -> BeT -> Diffusion Policy -> Consistency Policy。

*所以这一节是想说：技术上是图像扩散加速圈的成果"嫁接"到 Diffusion Policy 上；机器人侧是 DP 的直接后继。*

---

## 和本导读的关系

Consistency Policy 属于 [Ch13: 扩散策略](../guide/ch13-diffusion-policy.md) 覆盖的 Diffusion Policy 家族。具体来说：

Ch13 讲了扩散策略的三条演进线：Diffusion Policy（方法验证，2023）-> 3D Diffusion Policy（感知升级，2024）-> pi0（产业级基础模型，2024）。Consistency Policy 是这条主线的一个"平行分支"——它不是在感知或规模上升级，而是在推理效率上升级。

Ch13 第 3.5 节讨论了扩散模型推理慢的根本原因（训练-推理不对称：训练并行但推理串行），并在 3.8 节第 3 点局限性中明确提到"后续的 Consistency Policy 将其压缩到 1 步"。Consistency Policy 正是这个问题的直接回答。

Ch13 还列出了扩散策略的采样范式演进：DDPM(慢) -> DDIM(快) -> Flow Matching(极快) -> Consistency(单步)。Consistency Policy 是这条"单步"终点上的代表作。

在导读的更宏观结构中，Ch13 是 Ch12（端到端 VLA）的后继、Ch14（模仿学习）的前置。Consistency Policy 为 Ch14 讨论的模仿学习方法提供了一个"高效推理"的变体——如果你用 Diffusion Policy 做模仿学习但嫌它慢，Consistency Policy 是现成的加速方案。

*所以这一节是想说：本文是 Ch13 扩散策略家族中"效率分支"的代表，解决的是 Ch13 明确提出的"推理太慢"限制。*

---

## 思考题

**Q1：Consistency Policy 的"一步推理"和传统单步策略（比如 BC-RNN）有什么本质区别？为什么不能直接用 BC-RNN 代替？**

<details>
<summary>提示</summary>

想想两者的训练目标有什么不同。BC-RNN 是直接用 MSE loss 拟合动作，遇到多模态数据会"取平均"。Consistency Policy 虽然推理时也是一步出动作，但它的训练过程利用了 ODE 轨迹的结构信息——学生学的不是"观测->动作"的直接映射，而是"噪声空间中任意位置->干净动作"的跳跃映射。这让它能保留扩散模型对多模态分布的建模能力（虽然比 DDPM 弱了一些）。推理时一步出动作只是果，训练时的结构化学习才是因。
</details>

**Q2：为什么 CTM-local（相邻 t/u + 任意 s）比原始 CTM（任意 t/u/s）效果相当但训练快 40%？"相邻"这个限制为什么不影响最终质量？**

<details>
<summary>提示</summary>

关键在于老师走 t->u 的成本。原始 CTM 允许 t-u 很大，意味着老师需要走很多步才能从 t 到 u——每步都是一次前向传播。CTM-local 限制 u=t-1，老师只需走 1 步。质量不受影响的原因：s 是任意的，所以学生仍然需要学习"跨任意距离跳跃"的能力（从 t 跳到任意 s < u）。"相邻 t/u"只限制了老师提供监督信号的范围，但学生的学习目标（跳到任意 s）并没有被削弱。换言之，局部监督 + 全局跳跃目标 = 足够的训练信号。
</details>

**Q3：作者发现低方差初始采样 N(0, I) 比高方差 N(0, T^2*I) 效果好。如果把这个技巧直接用到图像生成的 Consistency Model 上，会发生什么？为什么？**

<details>
<summary>提示</summary>

会崩掉。作者已经用 CIFAR-10 做了对照实验：低方差出发生成的是灰块。原因是高维高斯的概率质量集中在球壳上（concentration of measure），模型在中心区域没有学到有效的 score。机器人动作空间维度低（160D vs 3072D），中心区域仍有足够的概率质量支持。这个技巧的适用性取决于数据流形的维度——低维可以，高维不行。
</details>

**Q4：论文的 3 步 chaining 使用离散时间网格的 2/3 和 1/3 切分点。假设你要设计一个 5 步 chaining 方案，你会怎么选择时间点？为什么？**

<details>
<summary>提示</summary>

按论文的逻辑，应该用离散化时间网格的 4/5、3/5、2/5、1/5 切分点。因为 EDM 的离散化网格在 t 接近 0 时密度更高（细节更多），等分离散化网格而非等分连续时间能更好地覆盖重要的"早中段"特征区域。但要注意边际收益递减——论文只测了 1 步和 3 步，5 步可能已经接近 DDiM 的效果而失去速度优势了。
</details>

**Q5：Dropout 在 CTM 损失的 s->0 路径上起到"破坏过度一致性"的作用。如果不用 dropout，你能想到其他方法来解决训练信号消失的问题吗？**

<details>
<summary>提示</summary>

几个可能的方向：(1) 在 s->0 路径上加高斯噪声而非 dropout，同样破坏确定性映射；(2) 直接在 s 时刻而非 0 时刻计算损失（但论文解释了为什么 0 时刻更好——尺度一致性）；(3) 用两个不同的学生网络分别走 s->0（打破权重共享带来的一致性）；(4) 用 EMA（指数移动平均）版本的学生做 s->0（类似 Consistency Models 原文的做法，让两个网络参数有微小差异）。作者选 dropout 可能是因为最简单有效。
</details>

**Q6：在什么场景下你应该选 Consistency Policy 而不是 Diffusion Policy？反过来呢？给出具体的决策标准。**

<details>
<summary>提示</summary>

选 CP 的场景：(a) 需要高频控制（>=30 Hz，如动态抓取、平衡、四旋翼）；(b) 板载 GPU 算力受限（笔记本级 / Jetson 级 / 无人机）；(c) 已经有训好的 Diffusion Policy，想免费提速；(d) 任务动作分布是单峰的（只有一种合理策略）。选 DP 的场景：(a) 算力充裕（A100 服务器）且延迟不是瓶颈；(b) 任务需要多模态动作（双臂协作、多种可行路径）；(c) 长时序多阶段任务（Kitchen p4 类型）；(d) 训练预算有限（DP 训练更快更稳定）。核心判断：如果推理延迟是瓶颈，选 CP；如果动作多样性是关键，选 DP。
</details>

**Q7：论文发现"老师质量对学生影响不大"（Teacher .88 -> Student .92）。这看起来违反直觉——老师都不行学生怎么能行？试解释原因。**

<details>
<summary>提示</summary>

因为总损失有两个项：L_CTM（依赖老师）和 L_DSM（不依赖老师）。DSM 损失直接让学生从加噪数据预测原始数据——这个信号完全来自训练集，和老师无关。即使老师在 CTM 损失中提供了较差的轨迹监督，DSM 损失仍然能保证学生的基本预测能力。但当老师太差（.84）时，CTM 损失提供的轨迹信号噪声太大，开始拖累整体训练，所以学生也略微下降。这个发现的实践意义是：你不需要花大量时间调优老师——一个"够用"的老师就行。
</details>

---

## 一些好奇心问答（FAQ）

**Q1：单步推理为什么不掉精度？我以为步数越少误差越大。**
经典扩散里少步数会掉精度，是因为它每一步都在估算一小段"局部"导数——步数少了，数值积分误差就大了。一致性蒸馏改了训练目标——不再要求"每一小步都对"，而是要求"任意两步起点最后能合并到同一终点"。学生网络的参数量没变，只是学了一个新任务："看到任意噪声水平，直接给我对应的动作"。所以单步不是"砍了 99 步"，而是"换了一种学法"。

**Q2：为什么必须先训老师，不能直接训学生？**
可以——这就是 Consistency Training（vs Consistency Distillation）。Ding & Jin 2024 在 ICLR 上发了这个方向的工作。但作者实测在视觉运动任务上（图像观测、复杂动作）Consistency Training 不行，比 Distillation 差很多（Table X：CT Policy 在 Square 只有 .55，Consistency Policy .92）。原因是 Monte Carlo score estimator 在高维任务噪声太大，老师能给更稳定的蒸馏信号。

**Q3：3 步推理比 1 步好的话，为啥不用 5 步、10 步？**
边际收益递减，且回到 Diffusion Policy 的老路。作者论文里只对比了 1 步和 3 步。理论上你可以做 N 步 chaining，但 N 越大就越像 DDiM，速度优势消失。3 步是性价比最高的点。

**Q4：低方差初始采样 N(0, I) vs N(0, T^2*I) 真有那么神吗？**
在 Square 任务，1-step 从 .90 涨到 .92，3-step 从 .91 涨到 .96——3-step 提升明显。作者推测是机器人动作流形低维所致。Appendix B 的 CIFAR 对照实验表明：在图像（高维）上低方差初始反而生成失败（出来的是一坨灰块）。这是机器人特有的小窍门，不是普适的。

**Q5：CTM-local 和 CTM 的区别就只在 t/u 是否相邻？**
是的。原 CTM 允许 t-u 为任意大；CTM-local 强制 u = t-1。后者牺牲了一点表达能力（不能跨大步学），但换来训练快 40% + 同等成功率。在机器人这种小数据集场景，速度优势压倒灵活性。

**Q6：Consistency Policy 能再压成更小的网络吗？**
论文没探讨，但作者维持了 UNet 架构（和 Diffusion Policy 一致），所以参数量没变。理论上可以再做 knowledge distillation 或剪枝，但和本文的"步数蒸馏"是两回事。

**Q7：训练一个 Consistency Policy 总共要多久？**
要先训 EDM 老师，再训学生。每步学生 = 跑一次老师 + 多次学生前向，比 Diffusion Policy 慢得多。论文里 Microwave 因为没训到收敛而结果略差。所以是典型的训练贵、推理便宜——边缘部署场景的经典 trade-off。

**Q8：什么场景应该用 Consistency Policy 而不是 Diffusion Policy？**
满足以下任一就考虑：机器人动态任务需要 30 Hz 以上控制频率；板载 GPU 算力受限（笔记本级 / Jetson 级）；已经有训好的 Diffusion Policy 想免费提速；不在乎多模态（任务是单峰最优解）。反过来，如果你跑在 A100 服务器上 + 任务多模态明显（双臂协作、长时序规划），DDiM 15 步可能仍是更好的选择。

**Q9：训完的 Consistency Policy 能不能再回炉做 Consistency Policy of Consistency Policy？**
理论上可以——把训好的 CP 当老师，再蒸一个学生。但意义不大，因为推理已经是 1 步了。这种"二次蒸馏"在图像生成里有人做（追求质量），机器人侧没必要。

**Q10：Pseudo-Huber 损失为什么不用 L2？**
作者引用 Song 2023 的建议，c = 0.00054 * sqrt(D)（D 是数据维度）。L2 对离群值敏感——某次蒸馏中如果学生预测和老师差距太大，L2 会把这个样本的梯度放到天上去，搞崩训练。Pseudo-Huber 在大误差区域近似 L1，对离群值更稳。机器人动作数据少、易有 outlier 示教，所以这个细节比图像生成更重要。

*所以这一节是想说：单步快不等于简单粗暴；它换了训练范式，工程上有几个细节要拎清楚。*

---

## 如果你想再深入

**直接前置**：
- Diffusion Policy (Chi 2023, RSS) — 老师网络的来源 [arXiv:2303.04137]
- EDM (Karras 2022, NeurIPS) — 扩散训练框架 [arXiv:2206.00364]
- Consistency Models (Song 2023) — 单步扩散学生原型 [arXiv:2303.01469]
- Consistency Trajectory Models (Kim 2023) — 本文目标函数来源 [arXiv:2310.02279]

**同方向加速工作**：
- ParaDiGMS (Shih 2023) — 并行采样路线 [arXiv:2305.16317]
- InstaFlow (Liu 2023) — 单步蒸馏的另一条路（Rectified Flow）[arXiv:2309.06380]
- Progressive Distillation (Salimans & Ho 2022) — 蒸馏路线的早期代表 [ICLR 2022]

**机器人扩散策略族**：
- 3D Diffusion Policy (Ze 2024) — 点云输入版 [arXiv:2403.03954]
- Octo (Ghosh 2023) — 通用机器人扩散基础模型 [octo-models.github.io]
- BeT / VQ-BeT (Shafiullah 2022, Lee 2024) — 单步 transformer 路线（替代方案）

**RL 中的 consistency model**：
- Boosting Continuous Control with Consistency Policy (Chen 2023) — 状态空间 RL [arXiv:2310.06343]
- Consistency Models as Rich Policy Class (Ding & Jin, ICLR 2024) — Consistency Training 路线

**应用与后续**：
- 任何把 Diffusion Policy 当 backbone 的工作（如 RDT-1B, Pi0）原则上都可以被本文方法蒸馏
- Real-time VLA 部署的核心瓶颈之一就是推理时延，本文是这条路线的代表
- FlowPolicy (2024.11) — 用 Consistency Flow Matching 实现 1 步推理，是本文思路的 Flow Matching 版延伸

**本仓内交叉**（如果存在）：
- `notes/diffusion-policy.md` — Diffusion Policy 精读
- `guide/ch13-diffusion-policy.md` — 导读第 13 章，扩散策略家族

**实践向资源**：
- 论文官网：https://consistency-policy.github.io（含视频 demo + 真实任务录像）
- arXiv：2405.07503
- 作者 Stanford Aaditya Prasad / Kevin Lin / Jimmy Wu / Linqi Zhou / Jeannette Bohg 团队（IPRL Lab）
- 实现参考：作者后续如开源代码会基于 Diffusion Policy codebase（Chi 2023）改造

**与 vLLM 风格"推理加速"对比的元思考**：
本文是"训练时多花一倍力气，换推理时 10-100x 加速"的经典 trade-off。和 vLLM 的 PagedAttention（不改训练，改推理 KV cache）不同——后者是系统级优化，前者是算法级。机器人扩散策略的瓶颈是"网络前向次数"，所以在算法层面改更值；LLM 的瓶颈是"显存利用率和 batch 调度"，所以在系统层面改更值。读论文时分清楚这两类很重要。

*所以这一节是想说：要吃透这篇至少要往前读 4-5 篇扩散基础，往后看 1-2 篇并行/后续工作；机器人圈以外的兄弟分支（RL）也有交集；和 LLM 推理加速分属不同维度。*

---

## 原文信息

**标题**：Consistency Policy: Accelerated Visuomotor Policies via Consistency Distillation

**作者**：Aaditya Prasad, Kevin Lin, Jimmy Wu, Linqi Zhou, Jeannette Bohg

**机构**：Stanford University, Princeton University

**发表**：RSS 2024

**arXiv**：2405.07503

**官网**：https://consistency-policy.github.io

```bibtex
@inproceedings{prasad2024consistency,
  title     = {Consistency Policy: Accelerated Visuomotor Policies via Consistency Distillation},
  author    = {Prasad, Aaditya and Lin, Kevin and Wu, Jimmy and Zhou, Linqi and Bohg, Jeannette},
  booktitle = {Proceedings of Robotics: Science and Systems (RSS)},
  year      = {2024},
  url       = {https://consistency-policy.github.io}
}
```

*所以这一节是想说：这是 Stanford IPRL Lab 在 RSS 2024 发的工作，把图像生成圈的 Consistency Model 技术首次成功移植到高维视觉运动策略上。*
