---
title: "Consistency Policy: Accelerated Visuomotor Policies via Consistency Distillation"
slug: consistency-policy
topic: diffusion-policy
difficulty: ★★★
status: auto-summary
来源: papers/consistency-policy/paper.pdf
venue: RSS
year: 2024
era: classic
num: 40
generated_at: 2026-05-31
---

## TL;DR

机器人选下一步动作本来要慢慢搅 100 下才出一步，这篇教它一下就跳到答案——快约十倍，连笔记本都跑得动。

*所以这一节是想说：把扩散策略的"100 步炖煮"通过蒸馏压成"1 步出锅"，而且不输味道，还能塞进笔记本 GPU。*

## 这是个什么场景

想象你在用老式拍立得：按一下快门，照片要等几十秒慢慢显影，影像一层层浮现你才看得到结果。机器人现在用的 Diffusion Policy（2023 RSS 那篇当时的 SOTA）就是这种工作方式——给它一段人类示教（比如 200 段"看到杯子就去抓"的录像），它学到的是"先随机涂一团噪声，再一遍遍擦掉噪声"，擦个 100 遍才得到一条干净的动作轨迹。

问题来了：拍立得慢一点没事，机器人慢就要命。在 NVIDIA T4 上，DDPM 走 100 步要 ≈ 1 秒；用快一点的 DDiM 15 步也要 ≈ 11 ms。这对**跑在笔记本 GPU 上的移动机器人 / 四旋翼**就是致命的：

- 动态任务（接住一个滚下桌的球、跟着移动目标走）需要至少 30 Hz 控制频率，1 秒才出一动作根本来不及
- 板载算力受限：3070 Ti 笔记本 GPU 跑 100 步 DDPM 要 1.5 秒/步，跟瘫痪没区别
- 同一台机器还要并行跑视觉感知、SLAM 等其他模型，VRAM 早卷不动了

作者的目标：**保留 Diffusion Policy 的成功率，把推理时间砍到 ~1/10**。

举个具体的：论文里的 Microwave 任务是"导航到微波炉 → 开门 → 拿一袋西兰花 → 放进去 → 关门 → 按蔬菜键"——整套要在笔记本 + WiFi 路由器上跑，机械臂用的是 Kinova Gen3 7-DoF。如果每个动作要等 1.5 秒，机器人导航中就会"卡顿式前进"，必撞东西。所以"快"不是工程审美，而是任务能不能成。

*所以这一节是想说：扩散策略好用但慢，慢到没法在小机器上跑实时控制——这就是要解决的痛点。*

## 之前的人怎么做

加速扩散模型的几条路线，每一条都有缺陷：

**路线 1：减少去噪步数（DDiM、EDM）**
DDPM 是把去噪过程当随机微分方程（SDE）解，每步都要加一点布朗噪声，所以步数固定 100+。DDiM 改成解一个**确定性的 ODE（常微分方程）**，可以训练时用 100 步、推理时只用 15 步。EDM 类似但调了 preconditioning 和 weighting。但步数砍太狠时质量会掉——尤其在 Tool Hang 这种难任务上，DDiM 9 步成功率从 .79 暴跌到 .14。

**路线 2：并行采样（ParaDiGMS）**
用 Picard 迭代让 ODE 上多个点同时收敛，可以提速 1.6x ~ 3.7x。但要求 GPU VRAM 巨大，笔记本 GPU 跑不动；而且仍然不是单步。

**路线 3：图像领域已经在用的"蒸馏"（Progressive Distillation, Consistency Models, InstaFlow 等）**
图像生成里有一类工作：用预训练好的扩散老师，教一个学生网络"一步迈得更大"。其中 Consistency Models（Song 2023）和 Consistency Trajectory Models（CTM, Kim 2023）特别有意思——它们利用 ODE 的"自一致性"：同一条 ODE 轨迹上的任意两点应该被映射到同一个终点。这个性质在图像生成里能做到 1-2 步出图。

之前两篇并行工作（Chen et al. 2023, Ding & Jin 2024）也尝试把 consistency model 用到强化学习的策略里，但都是基于状态的低维任务，且没用 CTM 这个更通用的框架。**作者的贡献是第一次把 CTM 框架移植到高维视觉运动模仿学习上**。

**路线 4：换底层架构（Behavioral Transformer / RT-1 / Octo / VLA）**
RT-1、BeT、Octo 这类 transformer 是真正的单步策略——根本不用扩散。但它们要么是 pre-training scale up 的产物（RT-1 在 130k+ 真实示教上训练，普通实验室复现不了），要么需要云端运行（RT-2、VLA），要么本身比 Diffusion Policy 在小数据集上的成功率低（论文 References [25] BeT 已被 DP 超越）。所以作者明确不选这条路，但也指出**Octo 这种本身就是扩散的通用策略，理论上也能被本文方法蒸馏**——这是未来工作。

*所以这一节是想说：图像生成圈早把扩散提速研究透了，但机器人圈还在用 100 步 DDPM——本文要把图像那边的"蒸馏术"搬过来。*

## 新想法

核心一句话：**把一个训好的 Diffusion Policy 当老师，蒸馏出一个能"任意起点 → 任意终点"直跳的学生网络，让学生在推理时一步到位。**

打个比方：老师是一个走过 100 次同一条山路的老向导，每段路怎么拐都门儿清。学生是个新来的徒弟，只学一件事——"不管师父把我扔在山路哪一段，我都直接告诉你山脚在哪"。这就是"自一致性（self-consistency）"：山顶（纯噪声 t=T）到山脚（动作 x₀）这条 ODE 路径上，**任意两点 (xₜ, xᵤ) 出发，最终都到同一个山脚**。Diffusion Policy 学的是每段路怎么走（要走 100 步），学生学的是"路径上任意位置 → 山脚直达"。

等等，先慢一拍 — 为什么不能直接让 Diffusion Policy 自己跑 1 步？因为它是按"小步挪"训出来的，网络只对"局部去噪"在行；让它从纯噪声 t=T 一脚跳到 0，吐出来的还是噪声。所以必须**重新训一个网络**，让它专门学"大步跳"。这个新网络就是学生，是本文的产物。

具体到论文，作者做了三件事：

1. **换个老师框架**：好比"原本的师父用方言教，徒弟听不懂"——把 DDPM 老师换成 EDM 老师。因为 DDPM 是 SDE（带随机），蒸馏需要确定性的 ODE，所以必须切到 EDM/DDiM 这类。
2. **借 CTM 目标函数**：抄 Kim 2023 的 CTM 损失这道作业（任意两点 xₜ, xᵤ 都要在 s 时刻预测出同一个 xₛ），但发现它训练慢 40%，于是抄了个折中版"CTM-local"——只用相邻时间点 t 和 u=t-1，但允许 s 任意 < u。
3. **三个工程小改动**：见下节。

学生网络 gθ(xₜ, t, s; o) 比老师 sφ(xₜ, t; o) 多一个输入：终点时间 s。给定起点 xₜ、起点时间 t、终点时间 s 和观测 o，学生直接输出 xₛ。推理时 t=T、s=0，一步出动作。

*所以这一节是想说：用一个学生网络去吃掉"沿路径走 100 步"这个过程，让推理变成一次函数调用。*

## 方法分步

### Step 0：先训一个 EDM 老师

EDM 学的是 ODE 的导数：dxₜ/dt = -(xₜ - sφ(xₜ, t; o)) / t。

人话翻译：给老师当前位置 xₜ 和时间 t，它告诉你"这一刻应该往哪个方向走"。然后用 Heun 二阶数值积分往前推。损失函数用的是 Denoising Score Matching（DSM）——给一个干净动作 x₀ 加噪到 xₜ，让老师预测回 x₀：

```
L_DSM(θ) = E[d(x₀, sφ(xₜ, t; o))]
```

距离函数 d 用 pseudo-huber loss（介于 L1 和 L2 之间，对 outlier 更鲁棒）：d(x, y) = √(‖x-y‖² + c²) - c。

类比：EDM 老师就是已经训好的 Diffusion Policy 的"加速版"，能用 9 步而不是 100 步出动作，但不能 1 步。

### Step 1：定义学生 gθ(xₜ, t, s; o)

学生网络架构和老师几乎一样（1D Conv UNet + FiLM 条件层），只是 FiLM block 多吃一个 s 输入。学生用老师的参数热启动（warm start），新增的 FiLM 层用零初始化，避免一开始就破坏老师学到的东西。

### Step 2：构造 CTM-local 损失

这是论文最核心的图（Fig. 2）。一句话讲完：**采样三个时间 0 ≤ s < u < t ≤ T，造两条"通往 s 的路径"，再各自被同一个 stopgrad 的学生带回 0，比较两个 0 时刻的预测**。

详细流程（用日常类比走一遍）：
1. 在 ODE 路径上采一个起点 xₜ
2. 用老师走 t-u 步（CTM-local 里 u = t-1，所以只走 1 步）得到 xᵤ
3. 学生从 xₜ 一步跳到 s 时刻，得 x_s^(t) = gθ(xₜ, t, s; o) ← 这一步**有梯度**（蓝色路径）
4. 学生从 xᵤ 一步跳到 s 时刻，得 x_s^(u) = gθ(xᵤ, u, s; o) ← 这一步 **stopgrad**（橙色路径）
5. 再用 stopgrad 学生把 x_s^(t) 和 x_s^(u) 都从 s 走到 0
6. 在 0 时刻比较两个最终预测的差距：L_CTM = d(gθ(x_s^(t), s, 0), gθ(x_s^(u), s, 0))

为什么必须先回到 0 时刻才比？因为损失函数应该作用在最终的"动作空间"，而不是中间某个噪声水平。s 时刻的动作只是半成品。

总损失：L_CP = α·L_CTM + β·L_DSM。DSM 项保证学生不至于因为 CTM 信号消失而崩盘（见后文 dropout 那段）。

类比：CTM-local 像在教学生"路径压缩"——老师走慢路（t→u 一步），学生从两个不同起点都要跳到 s，再各自跳到 0。如果学生学会了，两条路径在 0 时刻应该重合。

### Step 3：推理两种模式

**1 步推理**：z ~ N(0, I)，一次调用 x = gθ(z, T, 0; o)，部署 x。耗时 ≈ 1 ms。

**3 步推理（chaining）**：先 1 步生成 x，再加噪到 t₁，再 1 步去噪到 0，再加噪到 t₂，再 1 步去噪到 0。"加噪—去噪"反复打磨，类似画家先画轮廓再涂细节。chaining 时间点 t₁, t₂ 选在"早中段"——具体是把 N 步离散化的时间网格切成 {t_(2N/3), t_(N/3)}，因为太早的 t 只调微小特征、太晚的 t 又只决定大致方向。

### Step 4：低方差初始噪声（小但关键）

传统扩散从 z ~ N(0, T²I) 出发（标准正态乘 T，这里 T 是最大时间步）。本文改成 z ~ N(0, I)——也就是从分布的中心附近采样，而不是边缘。

为什么？作者推测是机器人动作分布的"流形"维度低（论文里是 16 步 × 10D = 160D，远低于 32×32×3=3072D 的 CIFAR），所以低方差区域学到了 score 支持。图像数据维度高，反而是低方差区域没数据、score 学不出来——所以图像扩散需要从高方差出发。Appendix B 用 CIFAR-10 上的 EDM 做了视觉对照：低方差出发的图是一坨灰块，高方差出发的图是正常猫狗。

类比：高维 Gaussian 的质量都集中在"球壳"上，低维 Gaussian 反而中心有质量。机器人动作恰好属于后者。

### Step 5：Dropout 的隐藏角色

作者无意中发现：CTM 损失里的 s→0 那两段（红色到 0 时刻的最终对比）**必须开 dropout**，否则训练信号会消失。

为什么？因为学生网络足够强（warm start 自老师），如果 s→0 是确定性映射，那么"任意 xₛ⁽ᵗ⁾ 和 xₛ⁽ᵘ⁾ 都会被映到几乎相同的 0 时刻预测"，损失逼近 0，没有梯度。开 dropout 后，s→0 变成随机过程，损失项重新有信号。Table IX 实测：disable s→0 dropout，Square 从 .92 掉到 .86。

这是论文一个比较 hacky 但又重要的发现：**dropout 不是为了正则化，而是为了"破坏过度一致性"**。论文里 dropout=0.2。

*所以这一节是想说：训学生 = "走老师路径 + 一致性约束 + DSM 兜底 + dropout 制造扰动"；推理 = 一步直跳，可选 3 步打磨；初始噪声从中心采。*

## 关键数字

仿真任务（Table I，6 个任务，每个 200 次 rollout）：

| Policy | NFE | Lift | Can | Square | Tool Hang | Push-T |
|---|---|---|---|---|---|---|
| DDPM | 27 | 1.00 | .97 | .93 | .79 | .87 |
| DDiM | 9 | 1.00 | .82 | .85 | .14 | .78 |
| **CP 1-step** | **1** | 1.00 | .98 | .92 | .70 | .82 |
| **CP 3-step** | **3** | 1.00 | .95 | .96 | .77 | .84 |

NFE = Number of Function Evaluations，跑一次推理要前向网络几次。注意 DDPM 的 27 / DDiM 的 9 已经是用 ParaDiGMS 加速过的乐观估算（原本是 100 / 15）。

仿真推理时间（NVIDIA P5000，Robomimic Square）：

| Policy | NFE | 推理时间 |
|---|---|---|
| DDPM | 100 | 110 ms |
| DDiM | 15 | 11 ms |
| **CP 1-step** | **1** | **1 ms** |
| **CP 3-step** | **3** | **2 ms** |

真实世界 3 个任务（笔记本 3070 Ti, 8GB VRAM）：

| 任务 | DDiM 成功率 | CP 成功率 | DDiM 推理 | CP 推理 |
|---|---|---|---|---|
| Trash Clean Up | 0.8 | 0.8 | 192 ms | 21 ms |
| Plug Insertion | 0.6 | 0.7 | 198 ms | 22 ms |
| Microwave (移动臂) | 0.5 | 0.4 | — | — |

为什么 21 ms 而不是 192/15=13 ms？拆解（Table XI）：图像编码器 6 ms + 网络前向 13.5 ms + 数据搬运等 ≈ 21 ms。网络部分相对加速 13.3x，整体加速 9x，因为图像编码这个"开销"对两个方法是一样的。

消融（Square 任务，除非另注明）：

| 消融维度 | 结果 | 含义 |
|---|---|---|
| Consistency Distillation | .88 | t/u 相邻 + s=0，最简单的 CM 目标 |
| CTM | .91 | 任意 t/u/s，原版 CTM |
| **CTM-local（本文）** | **.92** | 相邻 t/u + 任意 s，训练快 40% |
| 高方差 N(0, T²I) 初始 | .90 / .91（1/3 步） | EDM 标配 |
| **低方差 N(0, I) 初始** | **.92 / .96** | 3-step 提升尤其明显 |
| Discretized chaining | .96 / .77（Square / Tool Hang） | 离散网格 2/3, 1/3 切分 |
| Continuous chaining | .94 / .72 | 在连续时间上等分 |
| Teacher .92 → Student .92 | 鲁棒 | |
| Teacher .88 → Student .92 | 鲁棒 | 老师差一点也无所谓 |
| Teacher .84 → Student .88 | 略掉 | 老师太差时学生开始受影响 |
| Dropout enabled (0.2) | .92 | 必须开 |
| Dropout disabled in s→0 | .86 | 否则信号消失 |

**Consistency Training（teacher-free）的对照**（Table X）：

| 方法 | NFE | Lift | Square |
|---|---|---|---|
| CT Policy（用 Monte Carlo 估 score） | — | .91 | .55 |
| **CP (ours)** | **1** | **1.00** | **.92** |

CT Policy 在简单任务（Lift）还行，难任务（Square）直接崩。这印证了"高维视觉策略需要老师，不能 teacher-free"。

*所以这一节是想说：成功率打平 DDPM、推理快约一个数量级；3 步比 1 步在难任务上多 7-10 个百分点；消融全方位印证三个设计选择都有效。*

## 应该懂的新词

- **Diffusion Policy**：把动作序列当数据，用扩散模型去噪生成。Chi et al. 2023 RSS，本文的"老师"原型。
- **DDPM (Denoising Diffusion Probabilistic Models)**：2020 经典扩散，等价于解 SDE，固定 100+ 步。
- **DDiM (Denoising Diffusion Implicit Models)**：2021 改进版，等价于解 ODE，可变步数（也可少到 9-15）。
- **EDM (Elucidating the Design Space)**：Karras 2022 NeurIPS，DDiM 的变种，preconditioning 和 weighting 更优。本文老师用 EDM。
- **Score function**：∇log pₜ(xₜ|o)，噪声分布的对数密度梯度。神经网络逼近它，去噪时沿着 score 走。
- **PFODE (Probability Flow ODE)**：把 SDE 扩散转换成等价的 ODE，可以用数值积分（Heun、RK4）求解。
- **Consistency Model**：Song 2023，单步生成的扩散学生模型，靠"自一致性"训练。本文是它在机器人上的扩展。
- **CTM (Consistency Trajectory Model)**：Kim 2023，CM 的泛化版，允许任意时间点对，本文的训练目标基础。
- **CTM-local**：本文折中——相邻 t/u（local）+ 任意 s。
- **NFE (Number of Function Evaluations)**：跑一次推理调神经网络几次。NFE 越少越快。
- **stopgrad**：PyTorch 里 `.detach()`，告诉自动微分"这条路径不要回传梯度"。CTM 损失里只有 t→s 一条蓝色路径有梯度。
- **DSM (Denoising Score Matching)**：扩散模型的训练损失，让网络从加噪样本预测原始样本。
- **Pseudo-Huber loss**：d(x,y) = √(‖x-y‖²+c²) - c，介于 L1/L2 之间，对离群值鲁棒。
- **Chaining steps**：3 步推理时反复"加噪—去噪"打磨，时间点是预设超参。
- **FiLM (Feature-wise Linear Modulation)**：一种把条件信息（时间步、观测）注入 CNN 的方式，论文里 UNet 用它吃 t 和 s。

*所以这一节是想说：术语主要来自扩散圈，机器人圈的同学需要先熟悉 score / ODE / SDE 这套语言。*

## 搞不定的

作者自己在 Limitations 里说得很坦诚：

1. **多模态丢失**：Diffusion Policy 的强项之一是表达"多种合理动作"（比如 Push-T 既可以从左推也可以从右推）。Consistency Policy 蒸馏的是确定性 ODE，所以倾向于收敛到一种动作。在 Push-T 上观察到了这个偏好——还能跑，但不优雅。
2. **训练不稳定**：CTM 损失自带递归（学生既出现在主路径又出现在 stopgrad 路径），训练比 Diffusion Policy 抖。需要更多 epoch、每个 epoch 更慢（要跑老师 + 学生多次前向）。
3. **长时序任务掉链子**：Franka Kitchen 的 p4（连续完成 4 个子任务）和 Microwave（移动操作）上 CP 略输 DDiM。作者承认 Microwave 没训到收敛就因时间限制停了。
4. **Dropout 谜题**：作者发现 s→0 这一段必须开 dropout（否则 L_CTM 几乎消失，因为学生太一致了），但完整解释不清楚。Table IX 显示 disable dropout 后 Square 从 .92 掉到 .86。
5. **离散积分 + 数值积分误差**：用 Heun 二阶 + EDM 时间网格，理论上还能上更高阶（RK4），但论文没探讨。
6. **没和大模型 baseline 比**：RT-1 / RT-2 / Octo / VLA 这些没进对比表。作者解释是它们靠云端大模型，和"板载小 GPU"场景不匹配——但这也意味着 Consistency Policy 的方法学贡献和 VLA 路线是正交的（理论上 Octo 也可以被蒸馏）。

*所以这一节是想说：单步推理换来速度，代价是多模态、训练稳定性、超长时序任务上的轻微退步。*

## 与别篇关系

- **Diffusion Policy (Chi et al. 2023, RSS)**：直接老师，本文的对照基线。沿用 UNet 架构、observation/action 格式。
- **EDM (Karras et al. 2022, NeurIPS)**：扩散框架基础，本文老师就是 EDM。
- **Consistency Models (Song et al. 2023)**：图像生成里的单步扩散学生，"Consistency Distillation"原型。
- **CTM (Kim et al. 2023)**：图像生成里更通用的一致性轨迹模型，本文目标函数的直接来源。
- **ParaDiGMS (Shih et al. 2023)**：另一条加速路线（并行采样），本文把它当 baseline 加速参考。
- **Octo (Ghosh et al. 2023)**：通用机器人扩散策略，作者认为 Octo 可以同样被蒸馏（未来工作）。
- **3D Diffusion Policy (Ze et al. 2024)**：另一篇 Diffusion Policy 的变体（点云输入），本文方法对它也适用。
- **Concurrent: Chen et al. 2023 / Ding & Jin 2024**：把 consistency models 用到 RL，但都是状态空间低维，没用 CTM。本文是首个高维视觉的 CTM 蒸馏。

技术族谱：DDPM → DDiM → EDM → Consistency Models → CTM → Consistency Policy。机器人侧：BC-RNN → BeT → Diffusion Policy → Consistency Policy。

*所以这一节是想说：技术上是图像扩散加速圈的成果"嫁接"到 Diffusion Policy 上；机器人侧是 DP 的直接后继。*

## 阅读顺序

如果你完全没读过扩散模型相关论文，建议这样进：

1. **先打地基**：Ho 2020 DDPM（理解什么是去噪扩散）→ Song 2021 Score-based SDE（理解 SDE/ODE 视角）。这两篇打底没法跳。
2. **看 EDM**：Karras 2022 EDM。本文老师用的就是 EDM 框架，preconditioning 和 weighting 那套设计要明白。
3. **看 Diffusion Policy**：Chi 2023 RSS。本文的直接对手 + 架构来源。
4. **看 Consistency Models**：Song 2023。理解"自一致性"如何蒸馏出单步生成器。
5. **看 CTM**：Kim 2023。本文目标函数的来源，重点看 Fig 2 那种"两条路径回到同一点"的图。
6. **再回到本文**：重点看 III.B（Training）和 IV.D（Ablations）。Fig 2 是核心，配上 Eq 5-8 一起读。
7. **如果还有时间**：ParaDiGMS（并行采样思路）、InstaFlow（另一条单步蒸馏路线）。

精读建议：第一遍跳过所有公式只看图和表（Fig 1、Fig 2、Table I、Table III）；第二遍补 Section III 公式；第三遍读 Ablations 和 Limitations，理解为什么是这三个 design choice 而不是其他。

*所以这一节是想说：扩散模型基础没打就直接读这篇会很痛；DDPM/EDM/CM/CTM 四篇打底后再读一气呵成。*

## FAQ

**Q1：单步推理为什么不掉精度？我以为步数越少误差越大。**
A：经典扩散里少步数会掉精度，是因为它每一步都在估算一小段"局部"导数。一致性蒸馏改了训练目标——不再要求"每一小步都对"，而是要求"任意两步起点最后能合并"。学生网络的参数量没变，只是学了一个新任务："看到任意噪声水平，直接给我对应的动作"。所以单步不是"砍了 99 步"，而是"换了一种学法"。

**Q2：为什么必须先训老师，不能直接训学生？**
A：可以——这就是 Consistency Training（vs Consistency Distillation）。Ding & Jin 2024 用过。但作者实测在视觉运动任务上（图像观测、复杂动作）Consistency Training 不行，比 Distillation 差很多（Table X：CT Policy 在 Square 只有 .55，Consistency Policy .92）。原因是 Monte Carlo score estimator 在高维任务噪声太大，老师能给更稳定的信号。

**Q3：3 步推理比 1 步好的话，为啥不用 5 步、10 步？**
A：边际收益递减，且回到 Diffusion Policy 的老路。作者论文里只对比了 1 步和 3 步。理论上你可以做 N 步 chaining，但 N 越大就越像 DDiM，速度优势消失。3 步是性价比最高的点。

**Q4：低方差初始采样 N(0, I) vs N(0, T²I) 真有那么神吗？**
A：在 Square 任务，1-step 从 .90 涨到 .92，3-step 从 .91 涨到 .96——3-step 提升明显。作者推测是机器人动作流形低维所致。Appendix B 的 CIFAR 对照实验表明：在图像（高维）上低方差初始反而生成失败。这是机器人特有的小窍门，不是普适。

**Q5：CTM-local 和 CTM 的区别就只在 t/u 是否相邻？**
A：是的。原 CTM 允许 t-u ≤ 任意大；CTM-local 强制 u = t-1。后者牺牲了一点表达能力（不能跨大步学），但换来训练快 40% + 同等成功率。在机器人这种小数据集场景，速度优势压倒灵活性。

**Q6：Consistency Policy 能再压成更小的网络吗？**
A：论文没探讨，但作者维持了 UNet 架构（和 Diffusion Policy 一致），所以参数量没变。理论上可以再做 knowledge distillation 或剪枝，但和本文的"步数蒸馏"是两回事。

**Q7：训练一个 Consistency Policy 总共要多久？**
A：要先训 EDM 老师，再训学生。每步学生 = 跑一次老师 + 多次学生前向，比 Diffusion Policy 慢得多。论文里 Microwave 因为没训到收敛而结果略差。所以**训练贵、推理便宜**——典型的边缘部署 trade-off。

**Q8：什么场景应该用 Consistency Policy 而不是 Diffusion Policy？**
A：满足以下任一就考虑：
- 机器人动态任务需要 ≥ 30 Hz 控制
- 板载 GPU 算力受限（笔记本级 / Jetson 级）
- 已经有训好的 Diffusion Policy，想免费提速
- 不在乎多模态（任务是单峰最优解）

反过来，如果你跑在 A100 服务器上 + 任务多模态明显（双臂协作、长时序规划），DDiM 15 步可能仍是更好的选择。

**Q9：训完的 Consistency Policy 能不能再回炉做 Consistency Policy of Consistency Policy？**
A：理论上可以——把训好的 CP 当老师，再蒸一个学生。但意义不大，因为推理已经是 1 步了。这种"二次蒸馏"在图像生成里有人做（追求质量），机器人侧没必要。

**Q10：Pseudo-Huber 损失为什么不用 L2？**
A：作者引用 Song 2023 的建议，c = 0.00054·√D（D 是数据维度）。L2 对离群值敏感——某次蒸馏中如果学生预测和老师差距太大，L2 会把这个样本的梯度放到天上去，搞崩训练。Pseudo-Huber 在大误差区域近似 L1，对离群值更稳。机器人动作数据少、易有 outlier 示教，所以这个细节比图像生成更重要。

*所以这一节是想说：单步快 ≠ 简单粗暴；它换了训练范式，工程上有几个细节要拎清楚。*

## 延伸阅读

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

**应用 / 后续**：
- 任何把 Diffusion Policy 当 backbone 的工作（如 RDT-1B, Pi0）原则上都可以被本文方法蒸馏
- Real-time VLA 部署的核心瓶颈之一就是推理时延，本文是这条路线的代表

**本仓内交叉**（如果存在）：
- `learnings/diffusion-policy.md` — Diffusion Policy 精读
- `learnings/edm.md` — EDM 框架笔记
- `learnings/consistency-models.md` — CM/CTM 一致性家族
- `learnings/vla-deployment.md` — VLA 实时部署相关

**实践向资源**：
- 论文官网：https://consistency-policy.github.io（含视频 demo + 真实任务录像）
- arXiv：2405.07503
- 作者 Stanford Aaditya Prasad / Kevin Lin / Jeannette Bohg 团队（IPRL Lab）
- 实现参考：作者后续如开源代码会基于 Diffusion Policy codebase（Chi 2023）改造，看到的话直接对 fork 跑

**与 vLLM 风格"推理加速"对比的元思考**：
本文是"训练时多花一倍力气，换推理时 10-100x 加速"的经典 trade-off。和 vLLM 的 PagedAttention（不改训练，改推理 KV cache）不同——后者是系统级优化，前者是算法级。机器人扩散策略的瓶颈是"网络前向次数"，所以在算法层面改更值；LLM 的瓶颈是"显存利用率和 batch 调度"，所以在系统层面改更值。读论文时分清楚这两类很重要。

*所以这一节是想说：要吃透这篇至少要往前读 4-5 篇扩散基础，往后看 1-2 篇并行 / 后续工作；机器人圈以外的兄弟分支（RL）也有交集；和 LLM 推理加速分属不同维度。*
