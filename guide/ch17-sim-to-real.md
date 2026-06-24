# Ch17: Sim-to-Real——仿真训练与真机部署

> 前置章节：[Ch16: 强化学习基础——PPO / SAC / 奖励塑形](ch16-rl-basics.md)
> 后续章节：[Ch18: 多模态生态——ImageBind / AnyMAL / 3DShape2VecSet](ch18-multimodal.md)
> [返回目录](README.md)

---

## 17.1 开篇：从满分到零分的落差

### 17.1.1 一个驾校类比

你在驾校练车。教练车的方向盘特别灵——轻轻一转就到位；练车场的路面是干净的水泥地，没有坑洼；来往"行人"是橡胶桩子，不会乱跑；你犯了错教练踩副刹——没有真正的后果。在这种理想环境下，你"满分通过"了所有项目。

然后你拿到驾照，开自己那辆方向盘有虚位的旧车，上了早高峰的三环。方向盘手感完全不同——转 10 度才有反应；路面有补丁、有减速带、有积水；行人从盲区窜出来；你犯了错没有副刹——只有真实的碰撞。

教练车环境 = 仿真器。三环早高峰 = 真实世界。你在教练车上练出来的技术（策略）直接拿到三环用——大概率翻车。这就是 **sim-to-real gap**（仿真到真实的鸿沟）。

### 17.1.2 Sim-to-Real Gap 的三种来源

结论先行：sim-to-real gap 不是一种笼统的"不准"，而是由三类可具体度量的差异叠加而成。

**物理参数差异（Dynamics Gap）**

仿真器里设定的物理参数和真实世界不完全一致。例如：

- 摩擦系数：仿真设为 0.7，真实地面可能是 0.3（瓷砖）到 1.2（橡胶垫）
- 电机响应：仿真假设力矩瞬间到位，真实电机有 5-15ms 延迟
- 关节阻尼：仿真设为常数，真实关节阻尼随温度、转速变化
- 连杆质量：CAD 模型标注 1.2kg，实际加了线缆和传感器后变成 1.35kg
- 接触模型：仿真用解析弹簧-阻尼器，真实接触涉及形变、滑动、粘连

一个具体的数字让你感受差异的影响：OpenAI 2020 年的 Rubik's Cube 实验中，仅仅把仿真器的摩擦系数从 0.7 改成 0.5（30% 的偏差），策略的成功率从 90% 暴跌到 20%。

**传感器差异（Observation Gap）**

仿真器"看到"的世界和真实传感器看到的不一样。

- RGB 渲染：仿真器用光线追踪生成完美图像，真实相机有运动模糊、镜头畸变、曝光不均、色彩偏移
- 深度传感器：仿真返回精确深度值，真实深度相机在反光表面、透明物体上返回噪声或空洞
- 关节编码器：仿真返回精确浮点数，真实编码器有量化噪声和漂移
- IMU：仿真给出精确加速度和角速度，真实 IMU 有零偏漂移和高频振动

Meta 的 Habitat 团队在 2022 年做了一个系统实验，发现一个关键结论：用深度图像训练的导航策略 sim-to-real 迁移成功率为 68%，用 RGB 图像训练的只有 31%。原因是深度图像对光照、纹理的差异天然不敏感。

**执行延迟差异（Latency Gap）**

仿真器的时间是离散的、同步的。你发一个动作命令，下一帧状态就更新好了。真实世界不是这样。

- 通信延迟：控制指令从计算机到电机驱动器要 2-10ms
- 计算延迟：神经网络推理在边缘设备上要 5-30ms
- 执行延迟：电机从收到指令到达到目标力矩要 3-15ms
- 总延迟：一个控制周期的端到端延迟可能是 10-50ms

仿真里策略在 0ms 延迟下学到的是"即时反馈"的控制规律。真机有 30ms 延迟——相当于策略在"30ms 前的状态"上做决策。对于高频控制任务（如灵巧手操作、平衡控制），这点延迟就是灾难性的。

### 17.1.3 从 Ch16 到 Ch17：为什么你的 PPO 策略上了真机就瘫了

在 Ch16 中，你学会了用 PPO 和 SAC 在仿真环境里训练策略。PPO 的 clipped objective 让你稳定地优化策略，SAC 的最大熵让你探索得更充分。你可能在 Isaac Gym 里把四足机器人的行走策略训到了 99% 成功率，在 MuJoCo 里把机械臂的抓取训到了 95% 成功率。

但这些数字有一个隐含假设：**训练和测试在完全相同的环境中**。你用同一个仿真器训练和评估——当然满分，就像教练车上考教练车的试一样。

一旦部署到真机，三种 gap 同时发作：

1. 物理 gap：你的 PPO 策略学到了"施加 2.3 N·m 力矩就能迈步"，但真机的摩擦比仿真小，2.3 N·m 打滑了
2. 传感器 gap：你的策略学到了"RGB 图像中看到红色方块就去抓"，但真机相机的白平衡不同，红色看起来偏暗
3. 延迟 gap：你的策略学到了"检测到倾斜立刻补偿"，但真机有 20ms 延迟，等你的补偿到达时机器人已经倒了

结果：仿真 99% → 真机 0-30%。这就是 sim-to-real gap 的代价。

### 17.1.4 应对 gap 的三大策略预览

本章后续内容围绕三种互补的策略展开：

| 策略 | 核心思路 | 类比 | 本章对应节 |
|------|----------|------|-----------|
| 高保真仿真 | 把仿真器做得更逼真 | 教练车改装得跟真车一样 | 17.2-17.3 |
| 域随机化 | 让策略在各种参数下都见过 | 什么天气都练过开车 | 17.4 |
| 非对称训练 | 训练时用更多信息加速学习 | 备考时有参考答案 | Part 2 (17.5) |

这三种策略不是互斥的——工业实践中几乎总是组合使用。Isaac Gym 训练四足机器人的标准流程就是：高保真物理仿真（PhysX）+ 域随机化（摩擦/质量/延迟随机）+ 非对称 Actor-Critic（Critic 看特权信息）。

接下来从第一个策略开始：如果仿真器能做得足够逼真，gap 自然就小了。那么，当前最好的仿真器能做到什么程度？

---

## 17.2 仿真平台全景

### 17.2.1 为什么仿真器是 Sim-to-Real 的基础设施

在 Ch16 中，我们把仿真器当作一个黑盒——调用 `env.step(action)` 就返回下一状态和奖励。但仿真器的质量直接决定了策略的上限。一个"假"的仿真器训出来的策略再怎么域随机化也没用，就像在 2D 纸片上练开车——再怎么变换纸片的颜色和大小，也学不会真正的方向盘操作。

好的仿真器需要满足三个核心需求：

1. **物理保真度**：动力学模型要足够接近真实物理（至少在关键维度上），否则训出来的策略基础就是错的
2. **速度**：要比真实时间快得多（至少 100×），否则 RL 需要的上亿步交互根本跑不完
3. **可随机化**：物理参数、视觉渲染、传感器噪声都要能方便地随机化，为域随机化提供接口

这三个需求互相矛盾：越精确的物理求解越慢；越快的求解器越牺牲精度；可随机化要求架构灵活但灵活性往往带来性能开销。不同仿真平台做了不同的权衡。

### 17.2.2 Isaac Gym → Isaac Lab（NVIDIA 系）

**定位**：GPU 端到端并行训练平台，为 RL 训练速度而生。

**核心架构创新：全在 GPU 上**

传统的 RL 训练流水线是这样的：

```
[CPU] 物理仿真 → 传输 → [GPU] 策略网络 → 传输 → [CPU] 物理仿真 → ...
```

每一步都要在 CPU 和 GPU 之间来回搬运数据（状态、动作）。当并行环境数量上千时，这个数据搬运成为瓶颈——GPU 在等 CPU 算完物理，CPU 在等 GPU 算完策略，大家都在等数据传输。

Isaac Gym 的突破性设计是**把物理仿真也搬到 GPU 上**：

```
[GPU] PhysX 物理仿真 → [GPU] 策略网络 → [GPU] PhysX 物理仿真 → ...
                     ↑ 全部在 GPU 显存中，零数据搬运 ↑
```

状态和动作以 PyTorch GPU tensor 的形式暴露给用户——你拿到的 `obs` 直接就是 CUDA tensor，可以无缝喂给 PyTorch 网络。没有 `.cpu()` 和 `.cuda()` 的来回转换。

**PhysX TGS 求解器**

NVIDIA 选择的物理求解器是 Temporal Gauss-Seidel（TGS），而非传统的 Projected Gauss-Seidel（PGS）或直接法求解器。TGS 的特点：

- 优势：天然适合 GPU SIMT 并行——每个接触点的求解相互独立，可以同时算
- 代价：物理精度不如直接法求解器（MuJoCo 的默认求解器），特别是在高度约束耦合的场景（如多指手同时抓握）

这是一个有意识的 trade-off：牺牲一些物理精度，换来 GPU 上的大规模并行能力。对于四足行走、单臂操作这类"约束不太复杂"的任务，TGS 足够准确；对于灵巧手操作（Shadow Hand），需要更细的仿真步长来补偿精度损失。

**关键性能数字**

| 指标 | 数值 | 含义 |
|------|------|------|
| 并行环境数 | 4,096-65,536 | 同时跑数千个独立仿真实例 |
| Ant 4096 环境 FPS | ~700,000 步/秒 | 一个 GPU 每秒推进 70 万个仿真步 |
| AMP（对抗运动先验）训练 | 300× 实时加速 | 以前几天的训练现在几分钟 |
| Shadow Hand 原地重定向 | 30× 加速 vs CPU | 相比纯 CPU 流水线快 30 倍 |
| 所需硬件 | 单张 A100/RTX 4090 | 一张消费级 GPU 即可跑满 |

**Isaac Lab：下一代封装**

Isaac Gym 的原始 API 偏底层，Isaac Lab（原 Orbit，后并入 Isaac Sim）在其上提供了更工程友好的封装：

- **多速率仿真**：物理引擎跑 120Hz，渲染器跑 30Hz，策略网络跑 10Hz——各层独立解耦
- **可切换渲染后端**：训练时用最快的光栅化渲染（或不渲染），评估时切换到光线追踪以生成逼真图像
- **Manager 架构**：ObservationManager / ActionManager / EventManager 统一管理观测空间、动作空间、域随机化事件
- **多 GPU 分布式**：支持多卡扩展，线性加速

> **踩坑提醒**：Isaac Gym 的原始 `isaacgym` Python 包已停止更新。新项目应该直接使用 Isaac Lab（基于 Isaac Sim 4.0+）。但大量开源代码和论文仍然使用旧版 API——阅读时注意区分版本。

**适用场景**：RL 训练速度是首要需求的场景，如四足运动、灵巧手操作、大规模域随机化训练。

### 17.2.3 MuJoCo → MJX（DeepMind 系）

**定位**：经典高精度物理引擎 + GPU 加速版本。

**MuJoCo 经典版**

MuJoCo（Multi-Joint dynamics with Contact）由 Emanuel Todorov 在 2012 年开发，长期被视为机器人学术界的"金标准"物理引擎。2021 年 DeepMind 收购后开源，成为免费软件。

MuJoCo 的物理求解器基于凸优化（convex optimization），使用自定义的 CG（共轭梯度）和直接法求解器。与 Isaac Gym 的 TGS 相比：

| 维度 | MuJoCo | Isaac Gym (PhysX TGS) |
|------|--------|----------------------|
| 求解精度 | 高（接触力收敛到物理一致解） | 中（迭代近似，可能有穿透） |
| 单环境速度 | 极快（CPU 上 ~50M 步/秒） | 中等（单环境不如 MuJoCo） |
| 大规模并行 | 差（纯 CPU，线程并行有限） | 极好（GPU SIMT 并行） |
| 灵巧操作保真度 | 高 | 中（需小步长补偿） |

传统 MuJoCo 的瓶颈是**无法 GPU 并行**——你在 CPU 上跑 4096 个环境，速度远不如 Isaac Gym 在 GPU 上跑同样数量的环境。

**MJX：MuJoCo on JAX**

DeepMind 的解决方案是 MJX——把 MuJoCo 的核心物理运算用 JAX 重写，编译到 XLA（Google 的线性代数加速器编译器），从而跑在 GPU/TPU 上。

MJX 的思路和 Isaac Gym 不同：Isaac Gym 换了求解器（从精确的直接法换成可并行的 TGS），MJX 则保留了 MuJoCo 原有的高精度求解器，只是把运算后端从 CPU 搬到了 GPU。代价是并行效率不如 TGS（因为原始求解器有更多的顺序依赖），但物理精度更高。

MJX 的附加能力：

- **内置域随机化模板**：直接在 JAX 的 `vmap` 中对物理参数做批量随机化
- **ONNX 导出**：训练完的 JAX 策略可以导出为 ONNX 格式，部署到 C++ 推理运行时
- **可微分物理**：因为 JAX 支持自动微分，MJX 的物理仿真本身是可微分的——可以直接对物理参数求梯度

> **踩坑提醒**：MJX 目前（2024）不支持 MuJoCo 的全部功能——流体、柔性体、肌肉模型等尚未移植。如果你的任务涉及这些，仍需使用 CPU 版 MuJoCo。

**适用场景**：需要高物理保真度的研究、可微分仿真实验、DeepMind 生态（JAX/Flax/Optax）中的项目。

### 17.2.4 Habitat 系列（Meta 系）

**定位**：大规模室内导航仿真，速度极致优化。

**Habitat 1.0 → 2.0 → 3.0 的演进**

Habitat 专注于一个场景：机器人在室内环境中导航和交互。它不追求通用物理仿真的精度，而是追求**视觉渲染的速度和保真度**——因为导航任务的核心挑战是视觉理解（从图像中理解空间布局），而不是精确的接触力计算。

关键性能数字：

- Habitat 2.0 视觉导航：单 GPU 4093 FPS（每秒处理 4093 帧带渲染的仿真步）
- 对比：传统导航仿真器（如 Gibson）~100 FPS
- 加速比：~40×

Habitat 的独特数据资产：

- **HM3D**（Habitat-Matterport 3D）：1000 个真实扫描的室内空间
- **HSSD**（Habitat Synthetic Scenes Dataset）：211 个高质量合成场景
- 这些环境直接从真实房屋/公寓扫描重建，视觉逼真度远超程序化生成的场景

**关键发现：深度优于 RGB**

Meta 在 2022 年发表的 sim-to-real 导航论文中报告了一个对社区影响深远的发现：

- 用 **RGB 图像**训练的导航策略，sim-to-real 成功率仅 31%
- 用 **深度图像**训练的导航策略，sim-to-real 成功率达 68%
- 组合使用两者并没有带来额外提升

原因分析：RGB 图像对光照条件、纹理细节、白平衡高度敏感——仿真渲染的 RGB 再逼真也和真实相机有肉眼可见的差异。深度图像只编码几何信息，不受光照和纹理影响，是一种天然"域不变"（domain-invariant）的表征。

这个发现启示了后续很多 sim-to-real 工作：**选择正确的输入模态比提升渲染逼真度更有效**。

> **踩坑提醒**：Habitat 的物理仿真能力较弱。如果你的任务涉及精确的接触操作（抓取、推挤、工具使用），Habitat 不适合——应该选择 Isaac Gym 或 MuJoCo。Habitat 适合导航、社交导航、指令跟随等"移动为主"的任务。

### 17.2.5 SAPIEN（交互操作）

**定位**：关节物体交互操作仿真，强调零件级别的泛化。

**核心数据资产：PartNet-Mobility**

SAPIEN 的杀手级特性是它配套的 PartNet-Mobility 数据集——14,068 个可动零件，覆盖 46 个类别的日常物体（抽屉、门、水龙头、微波炉、洗衣机等）。每个物体都有精确的关节定义（旋转轴、平移轴、运动范围），可以直接在仿真中操作。

这使得 SAPIEN 特别适合研究一个关键问题：**操作策略能否泛化到没见过的物体**？

**关键数字：泛化 Gap**

ManiSkill 2023（基于 SAPIEN 的操作 benchmark）报告了一个令人警醒的数字：

- 训练集上的成功率：88.7%
- 测试集（未见过的物体实例）上的成功率：22.9%

这 65.8% 的落差不是 sim-to-real gap——因为训练和测试都在仿真中。这是**物体泛化 gap**：策略过拟合了训练物体的几何形状、关节参数、尺寸比例。

这个数字说明：即使解决了 sim-to-real gap（让仿真和真实物理完全一致），策略仍然可能在面对新物体时失败。泛化能力需要额外的工作——更大的训练物体集合、更好的表征学习、或更强的策略架构。

**SAPIEN 的物理后端**

SAPIEN 使用 PhysX 作为物理引擎（和 Isaac Gym 同源），支持 GPU 并行。在 ManiSkill 3（2024）中已经支持类似 Isaac Gym 的 GPU 端到端训练流水线，消除了 CPU-GPU 数据搬运瓶颈。

### 17.2.6 其他平台速览

| 平台 | 开发者 | 核心场景 | 物理引擎 | GPU 并行 | 特色 |
|------|--------|----------|----------|----------|------|
| RoboCasa | UT Austin | 家庭操作 | MuJoCo | 否 | 100+ 厨房场景，2500+ 3D 物体，配合 MimicGen 数据生成 |
| ProcTHOR | AI2 | 导航 + 交互 | Unity | 否 | 程序化无限生成室内环境 |
| BEHAVIOR-1K | Stanford | 长程家务 | OmniGibson | 部分 | 1000 种日常活动定义，模拟脏/湿/碎等状态变化 |
| RLBench | Imperial | 操作 Benchmark | CoppeliaSim | 否 | 100 个操作任务，统一接口 |
| Meta-World | UC Berkeley | 操作 Benchmark | MuJoCo | 否 | 50 个桌面操作任务，多任务/元学习标准 |
| SimplerEnv | UC San Diego | 真实策略评估 | SAPIEN | 是 | 不训练用——把真机策略放进高保真仿真测试 |
| Genesis | 多机构 | 通用物理 | 自研 GPU | 是 | 2024 新平台，多后端（刚体/流体/布料/粒子） |
| Flex / Warp | NVIDIA | 软体/流体 | 粒子法 | 是 | 可微分粒子仿真 |

### 17.2.7 仿真平台总览对比表

| 平台 | 物理引擎 | GPU 并行 | 核心场景 | 关键数字 | 典型论文 |
|------|----------|----------|----------|----------|----------|
| Isaac Gym/Lab | PhysX TGS | 是（端到端） | 运动控制、灵巧操作 | 4096 env, 70 万 FPS | Makoviychuk 2021 |
| MuJoCo/MJX | MuJoCo 凸优化 | MJX 是 | 学术研究、高精度 | 50M 步/秒(CPU单env) | Todorov 2012, Freeman 2021 |
| Habitat | Bullet (简化) | 是（渲染） | 室内导航 | 4093 FPS | Szot 2021 |
| SAPIEN/ManiSkill | PhysX | 是（v3） | 关节物体操作 | 14,068 可动零件 | Xiang 2020 |
| RoboCasa | MuJoCo | 否 | 家庭操作 | 100+ 厨房, 2500+ 物体 | Nasiriany 2024 |
| Genesis | 自研多后端 | 是 | 通用物理 | 多材质统一框架 | Genesis Team 2024 |

### 17.2.8 如何选择仿真平台

选平台不是"哪个最好"的问题——是"你的任务瓶颈在哪"的问题。一个决策流程：

1. **你的任务需要大量 RL 训练吗？**（如运动控制、灵巧操作）
   - 是 → 必须有 GPU 并行 → Isaac Gym/Lab 或 MJX
   - 否（如只需少量演示学习）→ 物理精度优先 → MuJoCo

2. **你的任务核心挑战是视觉理解吗？**（如导航、视觉操作）
   - 是 → 渲染质量和场景多样性优先 → Habitat 或 SAPIEN
   - 否（如用关节编码器不用视觉）→ 渲染不重要 → Isaac Gym headless 模式

3. **你需要泛化到大量不同物体吗？**（如开各种抽屉、转各种水龙头）
   - 是 → 需要大规模物体资产库 → SAPIEN (PartNet-Mobility) 或 RoboCasa
   - 否（如只操作固定零件）→ 任何平台都行

4. **你是否需要精确的接触力模拟？**（如装配、多指协调）
   - 是 → MuJoCo（物理最精确）
   - 否 → Isaac Gym 的 TGS 足够

> **踩坑提醒**：不要在选平台上花太多时间。业界的共识是：先用 Isaac Lab（速度快、社区大），遇到物理精度瓶颈再切 MuJoCo。对于初学者，最重要的是先跑通一个完整的训练→评估流程，而不是对比 10 个平台的参数表。

---

## 17.3 GPU 并行仿真的工程原理

### 17.3.1 传统流水线的瓶颈

在 Ch16 中，你可能已经注意到 RL 训练有一个独特的特征：**训练数据是自己生成的**。不像监督学习（数据提前准备好），RL 的 `env.step()` 和 `policy.forward()` 交替执行——策略生成一步数据，用这个数据更新策略，然后生成下一步数据。

这意味着仿真器的速度直接决定了训练速度。如果 `env.step()` 慢，再快的 GPU 训练策略也没用——GPU 大部分时间在等数据。

传统流水线的典型时间分配（以四足机器人为例）：

```
时间轴 (每个训练步)：
|--- env.step() on CPU ---|--- 数据搬运 CPU→GPU ---|--- policy.forward() on GPU ---|--- 数据搬运 GPU→CPU ---|
|        40%              |          15%           |           30%                 |          15%           |
```

问题分解：

1. **env.step() 在 CPU 上**：物理求解是计算密集的，但 CPU 的并行能力有限。跑 4096 个环境需要多线程/多进程，但受限于 GIL（Python）和核心数量
2. **数据搬运 CPU↔GPU**：每一步要把 4096 个环境的状态（比如每个 48 维 = 4096×48 = 196,608 个浮点数）从 CPU 拷贝到 GPU，再把动作拷贝回来。PCIe 带宽有限，且有 latency
3. **GPU 空闲**：policy.forward() 本身很快（一个小 MLP 前向传播不到 1ms），但前后都在等数据

Isaac Gym 的报告显示：在传统流水线中，GPU 利用率通常只有 30-40%——大部分时间在等 CPU 算完物理或等数据传输。

### 17.3.2 Isaac Gym 方案：全部留在 GPU

Isaac Gym 的解决方案在概念上非常简单：**把物理仿真也搬到 GPU，消除数据搬运**。

```
时间轴 (每个训练步)：
|--- PhysX TGS on GPU ---|--- policy.forward() on GPU ---|
|         55%            |              45%              |
             ↑ 数据始终在 GPU 显存中，零搬运 ↑
```

GPU 利用率从 30-40% 提升到 90%+。

**PhysX TGS 并行化的关键**

物理仿真的核心计算是求解接触约束——当机器人的脚踩在地面时，需要计算地面施加的反力，使得脚不会穿透地面。传统求解器（如 PGS）是迭代的：第一个接触点的解影响第二个接触点的解，必须顺序计算。

TGS 的并行化思路：

1. **环境间并行**：4096 个环境之间完全独立——机器人 A 的接触力不影响机器人 B。这是最粗粒度的并行，不需要任何算法修改。
2. **环境内近似并行**：同一个机器人的多个接触点之间，TGS 用时域分解的方式近似独立求解——当前帧用上一帧的解作为初始值，每个接触点独立迭代几步。这引入了一些物理误差，但换来了 GPU SIMT 并行。

类比：想象 4096 个独立的象棋棋盘。你有 4096 个 AI 同时走棋——棋盘之间互不影响（环境间并行）。每个棋盘上，AI 还可以同时评估多个候选走法（环境内并行）。GPU 的数千个 CUDA 核心正好匹配这种结构。

**Tensor API：零拷贝数据暴露**

Isaac Gym 的另一个工程巧思是 Tensor API：

```python
# 传统方式（数据搬运）
obs_numpy = env.get_obs()               # CPU numpy 数组
obs_tensor = torch.tensor(obs_numpy).cuda()  # 拷贝到 GPU
action = policy(obs_tensor)
action_numpy = action.cpu().numpy()      # 拷贝回 CPU
env.set_action(action_numpy)

# Isaac Gym Tensor API（零拷贝）
obs_tensor = gym.acquire_obs_tensor()    # 直接拿 GPU tensor 的引用
action = policy(obs_tensor)              # 直接计算
gym.set_action_tensor(action)            # 直接写回
```

`acquire_obs_tensor()` 返回的是物理引擎内部 GPU buffer 的直接引用（同一块显存），没有任何数据拷贝。策略网络的输出也直接写入物理引擎的动作 buffer。整个训练循环中，数据从未离开 GPU 显存。

### 17.3.3 MJX 方案：JAX 编译 MuJoCo 到 XLA

MJX 采用了不同于 Isaac Gym 的技术路线来实现 GPU 并行。

**JAX 的核心能力**

JAX 是 Google 开发的数值计算库，核心能力有三：

1. **`jit`**：把 Python 函数编译成 XLA（Accelerated Linear Algebra）内核，跑在 GPU/TPU 上
2. **`vmap`**：把作用于单个数据的函数自动批量化——写一次单环境逻辑，自动并行到 N 个环境
3. **`grad`**：对任意函数求自动微分

MJX 用 JAX 重写了 MuJoCo 的核心物理运算（刚体动力学、接触检测、约束求解），然后：

```python
import mujoco.mjx as mjx
import jax

# 单环境的仿真步函数
def step_single(state, action):
    state = mjx.step(model, state, action)
    return state

# vmap 自动批量化 → 4096 环境并行
step_batch = jax.vmap(step_single)

# jit 编译到 GPU
step_batch_compiled = jax.jit(step_batch)

# 运行
states = step_batch_compiled(batch_states, batch_actions)  # 全在 GPU 上
```

**与 Isaac Gym 的关键差异**

| 维度 | Isaac Gym | MJX |
|------|-----------|-----|
| 物理求解器 | TGS（为并行设计） | MuJoCo 原始求解器（为精度设计） |
| 并行方式 | CUDA kernel + 自定义内存管理 | JAX vmap + XLA 编译 |
| 生态绑定 | PyTorch | JAX/Flax |
| 可微分 | 否（默认） | 是（JAX 自动微分） |
| 部署导出 | PyTorch → ONNX/TensorRT | JAX → ONNX / SavedModel |

**可微分物理的独特价值**

MJX 因为基于 JAX，天然支持对物理仿真本身求梯度。这意味着你可以做这样的事情：

```python
# 计算 "改变摩擦系数" 对 "最终位置" 的梯度
def simulate_and_measure(friction):
    model = set_friction(base_model, friction)
    state = initial_state
    for _ in range(100):
        state = mjx.step(model, state, policy(state))
    return final_position(state)

# 自动微分：最终位置对摩擦系数的梯度
grad_friction = jax.grad(simulate_and_measure)(0.7)
```

这对系统辨识（System Identification）非常有价值——你可以直接用梯度下降找到最匹配真实数据的仿真参数。

### 17.3.4 4096 并行环境 = 域随机化的硬件基础

这里有一个关键的认知连接：GPU 并行仿真不仅仅是"让训练更快"——它直接使能了域随机化（Domain Randomization，下一节详述）。

原理：当你有 4096 个并行环境时，你可以让每一个环境使用**不同的物理参数**：

```
环境 0: 摩擦 = 0.3, 质量 = 1.1 kg, 延迟 = 5ms
环境 1: 摩擦 = 0.8, 质量 = 1.4 kg, 延迟 = 20ms
环境 2: 摩擦 = 0.5, 质量 = 0.9 kg, 延迟 = 12ms
...
环境 4095: 摩擦 = 1.1, 质量 = 1.3 kg, 延迟 = 8ms
```

一次前向传播，策略同时在 4096 种"不同的现实"中被评估。一次参数更新，策略从 4096 种不同的经验中学习。这等价于在 4096 种不同的物理世界中同时训练——策略被迫找到一种在所有这些世界中都有效的控制方式。

如果没有 GPU 并行，要达到相同的多样性覆盖，你需要顺序跑 4096 个不同参数的仿真——时间成本增加 4096 倍。域随机化在实践中之所以可行，正是因为 GPU 并行仿真让"大量多样化环境"的计算成本几乎为零（相比单环境的边际成本）。

### 17.3.5 权衡：物理精度 vs 并行速度

总结一下 GPU 并行仿真面临的核心 trade-off：

```
                高精度                             高速度
                  ↑                                 ↑
      MuJoCo CPU (单环境最精确)              Isaac Gym TGS (并行最快)
                  ↑                                 ↑
           MJX (中间地带)                     PhysX PGS (中间地带)
```

实践中的指导原则：

- **对于运动控制**（行走、跑步、跳跃）：TGS 精度足够，选 Isaac Gym 追求速度
- **对于精密操作**（螺丝拧入、多指协调）：可能需要 MuJoCo 的精度，但要接受训练速度慢
- **折中方案**：先在 Isaac Gym 中快速迭代策略架构和奖励设计，确定大方向后用 MuJoCo 做精细调优

### 17.3.6 训练循环伪代码

下面把上面讨论的全部内容整合为一个完整的 GPU 并行 RL 训练循环伪代码：

```python
# ========== GPU 并行 RL 训练循环 (Isaac Gym 风格) ==========

import torch
from isaac_gym import gymapi, gymtorch

# --- 初始化 ---
num_envs = 4096
gym = gymapi.acquire_gym()

# 创建 4096 个并行环境，每个有不同的物理参数（域随机化）
envs = create_parallel_envs(gym, num_envs, randomize_params=True)

# 获取 GPU tensor 引用（零拷贝）
obs_tensor = gym.acquire_obs_tensor(envs)       # shape: [4096, obs_dim]
action_tensor = gym.acquire_action_tensor(envs) # shape: [4096, act_dim]
reward_tensor = gym.acquire_reward_tensor(envs) # shape: [4096]

# 策略和价值网络（也在 GPU 上）
policy = PolicyNetwork(obs_dim, act_dim).cuda()
value_fn = ValueNetwork(obs_dim).cuda()
optimizer = torch.optim.Adam(list(policy.parameters()) + list(value_fn.parameters()))

# --- 训练循环 ---
for iteration in range(10000):
    # 1. 收集 rollout（全在 GPU 上）
    rollout_buffer = []
    for step in range(horizon):
        # 策略前向（GPU tensor → GPU tensor）
        with torch.no_grad():
            action_dist = policy(obs_tensor)
            action = action_dist.sample()
            log_prob = action_dist.log_prob(action)
            value = value_fn(obs_tensor)

        # 写入动作到仿真器（零拷贝）
        action_tensor[:] = action

        # 仿真器前进一步（GPU 上的物理计算）
        gym.simulate(envs)
        gym.refresh_tensors(envs)

        # obs_tensor 和 reward_tensor 已自动更新
        rollout_buffer.append((obs_tensor.clone(), action, log_prob, reward_tensor.clone(), value))

    # 2. 计算 GAE 优势估计
    advantages = compute_gae(rollout_buffer, gamma=0.99, lam=0.95)

    # 3. PPO 更新（标准 clipped objective，见 Ch16）
    for epoch in range(4):
        for mini_batch in split_into_batches(rollout_buffer, advantages):
            loss = ppo_loss(policy, value_fn, mini_batch)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

    # 4. 重新随机化环境参数（可选：每 N 轮重新采样一次）
    if iteration % 100 == 0:
        randomize_env_params(envs)
```

注意这个循环中**没有任何 `.cpu()` 或 `.cuda()` 调用**——所有数据始终在 GPU 显存中。这就是 GPU 端到端训练的本质。

> **踩坑提醒**：上面是简化伪代码。真实的 Isaac Lab 代码需要处理环境自动重置（episode 结束时重置状态）、观测归一化、奖励缩放、学习率调度等工程细节。但核心思想不变：全 GPU、零搬运、大规模并行。

---

## 17.4 域随机化：让策略"见过世面"

### 17.4.1 核心思想

**类比：什么天气都练过的司机**

你认识两个司机。

司机 A 只在晴天练过车——每次上路都是阳光明媚、干燥路面、能见度 10 公里。他的驾驶技术在晴天无可挑剔：走位精准、刹车距离控制完美、并线流畅。但某天突然下暴雨——路面湿滑、能见度 50 米、雨刷刮不干净。司机 A 慌了：刹车距离变了他不知道多踩多少、看不清前车他不知道怎么判断距离。

司机 B 在驾校时被教练逼着各种天气都练：晴天练、雨天练、雾天练、冰雪路面也练。每种条件下摩擦力不同、能见度不同、制动特性不同。司机 B 的技术在任何单一天气下可能不如司机 A 的晴天技术完美——但他面对**任何天气**都不慌。他学会了一种"鲁棒"的驾驶策略：留更大的跟车距离、更早更轻地踩刹车、不依赖精确的视觉距离判断。

域随机化（Domain Randomization, DR）就是把你的策略训练成"司机 B"。在训练过程中，**刻意扰动**仿真器的各种参数——摩擦力、质量、延迟、传感器噪声、视觉外观——让策略在各种"天气"下都被训练过。当部署到真实世界（一种特定的、未见过的"天气"）时，策略已经对各种变化具有鲁棒性。

**形式化定义**

标准 RL 训练在一个固定的 MDP $M = (S, A, T, R, \gamma)$ 上进行，其中转移函数 $T$ 是固定的。

域随机化将训练从单一 MDP 扩展为一个 **MDP 分布** $p(\xi)$，其中 $\xi$ 是域参数（摩擦、质量等）。训练时，每个 episode（或每隔固定步数）从 $p(\xi)$ 中采样一组新参数。策略 $\pi$ 的训练目标变为：

$$\max_\pi \mathbb{E}_{\xi \sim p(\xi)} \left[ \mathbb{E}_{\tau \sim \pi, T_\xi} \left[ \sum_t \gamma^t r_t \right] \right]$$

即：在所有可能的域参数下，策略的**平均回报**最大化。

**与仿真逼真度的互补关系**

直觉上，你可能会问：如果仿真器做得足够逼真，还需要域随机化吗？

答案是：需要，但原因变了。即使仿真器的"标称参数"非常接近真实世界，真实世界本身也有变化——同一块地面早上干燥下午可能有水渍；同一个电机使用久了阻尼会变；同一个相机不同光照下图像不同。域随机化不仅弥补仿真器的系统性偏差，还让策略对真实世界**本身的随机性**具有鲁棒性。

高保真仿真 + 域随机化 = 最佳实践。前者减小系统偏差（bias），后者增强对变化的容忍（variance tolerance）。

### 17.4.2 物理域随机化

物理域随机化扰动的是仿真器的**动力学参数**——这些参数决定了"同样的力产生什么效果"。

**常见随机化维度**

| 参数 | 含义 | 典型范围 | 为什么重要 |
|------|------|----------|-----------|
| 摩擦系数 | 接触面的滑动阻力 | [0.2, 1.5] | 直接影响能否站稳/抓住 |
| 连杆质量 | 机器人各部分的重量 | [0.8×, 1.2×] 标称值 | 影响惯性和力矩需求 |
| 质心偏移 | 质心相对标称位置的偏移 | [-2cm, +2cm] | 影响平衡和步态 |
| 关节阻尼 | 关节运动的阻力 | [0.5×, 2.0×] 标称值 | 影响运动速度和能耗 |
| 执行延迟 | 从发指令到执行的时间 | [0ms, 40ms] | 影响控制稳定性 |
| 力矩缩放 | 实际输出力矩相对指令的比例 | [0.8, 1.2] | 模拟电机老化/电压不稳 |
| 重力方向微扰 | 重力向量的微小偏转 | [-3°, +3°] | 模拟机器人安装倾斜 |
| 地面反弹系数 | 碰撞后的能量恢复比 | [0.0, 0.5] | 影响落地稳定性 |

**OpenAI Rubik's Cube 的域随机化清单**

OpenAI 在 2019 年的 Rubik's Cube 论文（"Solving Rubik's Cube with a Robot Hand"）中列出了完整的域随机化参数表——这是 DR 方法的标志性工作。他们随机化了超过 50 个物理参数，包括但不限于：

- 魔方尺寸：[-1mm, +1mm]
- 魔方质量：[70g, 150g]（标称 90g）
- 手指摩擦：[0.5, 1.5]
- 关节限位噪声：[-3°, +3°]
- 动作延迟：[0, 4 帧]（每帧约 4ms）
- 观测噪声：高斯 $\sigma$ = 关节角度量程的 2%

结果：在如此广泛的随机化下训练的策略，成功将仿真中学到的灵巧手操作技能转移到了真实的 Shadow Hand 上——这在当时被认为是 sim-to-real 的里程碑式成就。

**Legged Gym 的物理随机化实践**

对于四足机器人（如 Unitree Go1/A1），Legged Gym（基于 Isaac Gym）的标准域随机化配置：

```python
# 四足机器人典型物理域随机化配置
randomization_params = {
    "friction": {
        "range": [0.2, 1.5],       # 覆盖冰面到橡胶
        "operation": "uniform",
    },
    "base_mass": {
        "range": [-1.0, 3.0],      # 相对标称值的偏移(kg)
        "operation": "additive",    # 模拟负载变化
    },
    "com_displacement": {
        "range": [-0.05, 0.05],    # 质心偏移(m)
        "operation": "additive",
    },
    "motor_strength": {
        "range": [0.8, 1.2],       # 力矩缩放因子
        "operation": "scaling",
    },
    "Kp_factor": {
        "range": [0.7, 1.3],       # PD控制增益随机化
        "operation": "scaling",
    },
    "Kd_factor": {
        "range": [0.7, 1.3],
        "operation": "scaling",
    },
    "action_delay": {
        "range": [0, 4],           # 动作延迟(帧数)
        "operation": "integer_uniform",
    },
    "push_force": {
        "range": [0.0, 50.0],      # 随机外力扰动(N)
        "interval": 200,           # 每200步施加一次
    },
}
```

> **踩坑提醒**：摩擦系数的随机化范围需要特别小心。如果下限设得太低（如 0.05），策略会学到"永远不要快速移动脚"的保守行为，因为它见过"地面几乎无摩擦"的情况。这会导致真机上步态过于谨慎、速度过慢。实践中建议先从窄范围开始（如 [0.5, 1.0]），观察策略行为后再逐步扩大。

### 17.4.3 视觉域随机化

视觉域随机化扰动的是仿真器的**渲染参数**——这些参数决定了"同样的场景看起来什么样"。

**为什么需要视觉随机化**

如果你的策略以图像作为输入（而不是关节编码器这种底层状态），那么 sim-to-real gap 有很大一部分来自视觉差异。仿真渲染的图像——即使用了光线追踪——和真实相机拍出的图像仍有系统性差异：色调、噪声模式、运动模糊、镜头畸变等。

视觉域随机化的思路：与其让仿真渲染更逼真（成本高、永远有残差），不如让策略看过**极端多样化**的视觉条件，从而被迫学习**不依赖特定视觉细节**的控制策略。

**常见视觉随机化维度**

| 参数 | 含义 | 随机化方式 | 效果 |
|------|------|-----------|------|
| 光源方向 | 主光源的入射角 | 球面均匀采样 | 消除对特定阴影方向的依赖 |
| 光源强度 | 照明亮度 | [0.3×, 3.0×] 标称值 | 适应明暗变化 |
| 光源颜色 | 色温 | 随机 RGB 缩放 | 适应暖光/冷光/彩色灯 |
| 相机位姿 | 相机的安装位置和角度 | 平移 ±2cm, 旋转 ±3° | 容忍安装误差 |
| 相机内参 | 焦距和光心 | ±5% 扰动 | 容忍标定误差 |
| 纹理 | 物体和背景表面图案 | 随机图片/噪声贴图 | 不依赖特定纹理特征 |
| 背景 | 场景背景 | 随机图片或纯色 | 不被背景干扰 |
| 传感器噪声 | 图像噪声 | 高斯噪声 + 椒盐噪声 | 适应真实相机噪声 |
| 运动模糊 | 快速运动时的图像模糊 | 随机方向和强度 | 适应动态场景 |

**Tobin et al. (2017) 的开创性工作**

Josh Tobin 等人在 2017 年的论文 "Domain Randomization for Transferring Deep Neural Networks from Simulation to the Real World" 首次系统性验证了视觉域随机化的有效性。他们的实验：

- 任务：从 RGB 图像中定位桌面物体的位姿，用于机械臂抓取
- 方法：在仿真中将物体纹理、桌面纹理、背景、光照全部随机化
- 结果：纯仿真训练（无任何真实数据）的策略在真实机器人上达到了 88% 的抓取成功率
- 对比：不做视觉随机化，同样的策略真机成功率只有 12%

关键洞察：当训练数据的视觉多样性足够大时，真实世界的视觉条件只是"又一种可能的外观"——策略不会被它吓到，因为它见过更夸张的。

**OpenAI 的"Distracting" 方法**

OpenAI 在 Rubik's Cube 工作中把视觉随机化推向了极端。他们不仅随机化了正常的视觉参数，还加入了各种"干扰"：

- 在场景中随机插入不相关的几何体（球、盒子、圆锥）
- 随机改变手和魔方的颜色
- 随机改变桌面和墙壁的纹理

这些"干扰"在真实世界中不太可能出现，但它们迫使策略学会**忽略无关视觉信息**，只关注任务相关的特征（如手指和魔方的相对位置）。

### 17.4.4 域随机化与 GPU 并行的协同

在 17.3.4 中我们已经预告了这个连接——现在来详细展开。

**协同原理**

没有 GPU 并行时，域随机化的实现方式是：

```
Episode 1: 采样参数 ξ_1, 跑完一整个 episode
Episode 2: 采样参数 ξ_2, 跑完一整个 episode
...
Episode N: 采样参数 ξ_N, 跑完一整个 episode
```

策略更新使用的是来自**不同时间**的 N 个 episode 的数据。如果 N 小（比如 32），每次更新只见过 32 种参数组合——多样性有限。

有了 GPU 并行（如 4096 个环境），域随机化变成：

```
Step t: 
  环境 0 (ξ_0): obs_0, act_0, rew_0
  环境 1 (ξ_1): obs_1, act_1, rew_1
  ...
  环境 4095 (ξ_4095): obs_4095, act_4095, rew_4095
```

**每一个仿真步**，策略同时在 4096 种不同的物理条件下执行。一次 PPO 更新用的 batch 天然包含了 4096 种域参数的经验。多样性是"免费"获得的——不需要更多的训练时间。

**实践中的参数调度**

并不是所有并行环境都需要不同参数。常见的调度策略：

1. **按环境固定**：每个环境在创建时采样一组参数，整个训练过程保持不变。好处是策略能在每个环境中看到长期轨迹。
2. **按 episode 重采样**：每个环境在每次 reset 时重新采样参数。好处是同一个环境也能见到不同的参数组合。
3. **渐进式扩大**（Automatic DR / ADR）：训练初期用窄范围让策略先学会基本技能，然后随着策略变强逐步扩大随机化范围。OpenAI 的 ADR 方法就是这样：当策略在当前范围内成功率 > 阈值时，自动扩大范围。

OpenAI 的 ADR 从最初的窄范围自动扩展到了最终覆盖极端参数的宽范围，整个过程无需人工调参。他们报告 ADR 最终达到的随机化范围比人工设定的范围宽 2-3 倍——因为策略比预期的更能适应。

### 17.4.5 域随机化的局限

域随机化不是万能的。它有几个根本性的局限：

**局限 1：范围太窄 = 无法覆盖真实世界**

如果随机化范围没有覆盖真实世界的参数值，策略仍然会在真实世界中失败。

例子：你把摩擦系数随机化到 [0.5, 1.0]，但真实部署的地面是新打蜡的大理石（摩擦 0.25）。策略从未在如此低摩擦下训练过——部署失败。

这个问题的难点在于：你不总是知道真实世界的参数是什么。有些参数（如质量、惯量）可以测量，但有些（如接触摩擦、电机延迟）很难精确获取。如果真实参数恰好落在随机化范围之外，DR 就失效了。

**局限 2：范围太宽 = 策略过于保守**

如果随机化范围太宽，包含了很多"极端"的物理条件，策略会被迫找到一种在**所有条件下都安全**的行为——这通常意味着非常保守。

例子：你把执行延迟随机化到 [0ms, 100ms]。为了在 100ms 延迟下也不摔倒，策略学会了"慢慢走、小步幅、频繁停顿"。在真机（延迟只有 10ms）上部署时，策略比它应该做到的慢很多。

这就是 DR 的根本性 trade-off：**鲁棒性和最优性的矛盾**。一个在所有条件下都 OK 的策略，在任何特定条件下都不是最优的。就像什么天气都练过的司机——他在晴天的圈速不如专练晴天的赛车手。

**局限 3：均匀分布不一定是最优**

标准 DR 通常用均匀分布采样参数：$\xi \sim \text{Uniform}[a, b]$。但真实世界的参数分布未必是均匀的。

例子：真实机器人的电机延迟可能集中在 8-12ms（正常工况）和偶尔突增到 30-50ms（通信拥塞）。均匀分布把大量训练资源花在了 12-30ms 这个"真实世界不常出现"的区间——浪费了。

更好的做法是用一个与真实分布更匹配的采样策略。这引出了 System Identification（SI）和 Bayesian DR 等进阶方法——用真实数据估计域参数的分布，然后在这个分布上做 DR。

**局限 4：与 System Identification 的互补关系**

System Identification（SI）是域随机化的互补方法。SI 的思路是：与其在所有可能的参数上都训练，不如**精确测量**真实世界的参数，然后只在这个精确值附近做小范围随机化。

| 方法 | 策略 | 优势 | 劣势 |
|------|------|------|------|
| 纯 DR | 宽范围均匀随机化 | 不需要测量真实参数 | 策略保守、训练效率低 |
| 纯 SI | 精确匹配真实参数 | 策略最优化 | 依赖精确测量、不适应环境变化 |
| DR + SI | 以 SI 估计为中心做窄范围 DR | 兼顾最优性和鲁棒性 | 需要测量设备和校准流程 |

工业实践中，DR + SI 的组合是最常见的：先做一次 SI 确定标称参数（如通过系统辨识实验测量摩擦系数为 0.6），然后在 [0.4, 0.8] 范围内做 DR——以标称值为中心但有足够的容忍范围。

**局限 5：某些 gap 无法通过 DR 解决**

有些 sim-to-real gap 不是参数量级的差异，而是**模型结构**的缺失。

例子：仿真器没有建模空气动力学——对于小型无人机或高速运动，空气阻力是关键因素。你可以随机化已建模参数的值，但你无法通过 DR "随机出"一个没有建模的物理效应。同样，如果仿真器的接触模型是点接触，你无法通过 DR 获得面接触的行为。

对于这类结构性缺失，解决方案是：改进仿真器模型（加入缺失的物理效应），或使用真实数据微调（见 Part 2 的 fine-tuning 讨论）。

### 17.4.6 域随机化代码示例

下面是一个完整的域随机化配置和训练集成的伪代码，综合了物理和视觉随机化：

```python
# ========== 域随机化配置 (Isaac Lab 风格) ==========

from dataclasses import dataclass
from typing import Tuple
import torch

@dataclass
class DomainRandomizationConfig:
    """域随机化参数配置"""

    # --- 物理随机化 ---
    friction_range: Tuple[float, float] = (0.3, 1.2)
    mass_offset_range: Tuple[float, float] = (-0.5, 2.0)    # kg
    com_displacement: Tuple[float, float] = (-0.03, 0.03)    # m
    motor_strength_range: Tuple[float, float] = (0.85, 1.15)
    joint_damping_range: Tuple[float, float] = (0.7, 1.3)
    action_delay_range: Tuple[int, int] = (0, 3)             # 帧
    gravity_perturbation: float = 0.05                        # rad

    # --- 视觉随机化（如果使用图像输入）---
    light_intensity_range: Tuple[float, float] = (0.4, 2.5)
    light_color_range: Tuple[float, float] = (0.7, 1.3)      # RGB 各通道缩放
    camera_pos_noise: float = 0.02                            # m
    camera_rot_noise: float = 0.05                            # rad
    texture_randomize: bool = True
    sensor_noise_std: float = 0.01

    # --- 调度策略 ---
    randomize_every_n_steps: int = 0     # 0 = 只在 reset 时随机化
    use_adr: bool = False                 # 是否使用 Automatic DR


def apply_domain_randomization(envs, config: DomainRandomizationConfig):
    """对一批并行环境应用域随机化"""
    num_envs = envs.num_envs
    device = envs.device

    # 物理参数采样
    frictions = torch.empty(num_envs, device=device).uniform_(*config.friction_range)
    mass_offsets = torch.empty(num_envs, device=device).uniform_(*config.mass_offset_range)
    com_displacements = torch.empty(num_envs, 3, device=device).uniform_(*config.com_displacement)
    motor_strengths = torch.empty(num_envs, device=device).uniform_(*config.motor_strength_range)
    joint_dampings = torch.empty(num_envs, device=device).uniform_(*config.joint_damping_range)
    action_delays = torch.randint(
        config.action_delay_range[0], config.action_delay_range[1] + 1,
        (num_envs,), device=device
    )

    # 重力方向微扰
    gravity_angles = torch.empty(num_envs, 2, device=device).uniform_(
        -config.gravity_perturbation, config.gravity_perturbation
    )

    # 应用到各环境
    envs.set_friction(frictions)
    envs.set_mass_offset(mass_offsets)
    envs.set_com_displacement(com_displacements)
    envs.set_motor_strength(motor_strengths)
    envs.set_joint_damping(joint_dampings)
    envs.set_action_delay(action_delays)
    envs.set_gravity_perturbation(gravity_angles)

    # 视觉随机化（如果有渲染）
    if config.texture_randomize:
        envs.randomize_textures()
    envs.randomize_lighting(
        intensity_range=config.light_intensity_range,
        color_range=config.light_color_range
    )
    envs.randomize_camera_pose(
        pos_noise=config.camera_pos_noise,
        rot_noise=config.camera_rot_noise
    )

    return {
        "frictions": frictions,
        "mass_offsets": mass_offsets,
        "motor_strengths": motor_strengths,
        "action_delays": action_delays,
    }


# ========== 训练循环中的集成 ==========

config = DomainRandomizationConfig(
    friction_range=(0.3, 1.2),
    mass_offset_range=(-1.0, 3.0),
    action_delay_range=(0, 4),
    use_adr=False,
)

# 初始随机化
dr_params = apply_domain_randomization(envs, config)

for iteration in range(total_iterations):
    # 收集 rollout
    for step in range(horizon):
        obs = envs.get_obs()

        # 应用观测噪声（在线随机化）
        obs += torch.randn_like(obs) * config.sensor_noise_std

        # 应用动作延迟（每个环境可能不同）
        action = policy(obs)
        delayed_action = apply_per_env_delay(action, dr_params["action_delays"])

        envs.step(delayed_action)

    # PPO 更新（见 Ch16 和 17.3.6）
    ppo_update(policy, value_fn, rollout_buffer)

    # 重新随机化（在 reset 时）
    reset_mask = envs.get_reset_mask()
    if reset_mask.any():
        dr_params = apply_domain_randomization(
            envs, config, mask=reset_mask
        )
```

**关键设计选择解读：**

1. **per-env 独立采样**：每个环境独立采样参数。4096 个环境 = 4096 种不同的"现实"。
2. **观测噪声在线添加**：不是在环境层面添加，而是在策略接收观测时添加——更灵活，且可以在不修改环境代码的情况下调整。
3. **动作延迟 per-env 不同**：每个环境的延迟帧数不同，策略必须学会处理 0-4 帧的任意延迟。
4. **reset 时重新采样**：只在环境重置（episode 结束）时重新采样参数，而非每一步都变——这让策略能在一个 episode 内学到"这个环境的参数是什么"并适应。

> **踩坑提醒**：动作延迟的实现有陷阱。简单的做法是用一个 FIFO 队列存储过去几帧的动作，每步取延迟帧数之前的动作。但要注意：如果环境 reset 了，FIFO 队列也要清空，否则新 episode 的开头会执行上一个 episode 结尾的动作——这是一个非常隐蔽的 bug，会导致训练不稳定。

### 17.4.7 本节总结

域随机化是 sim-to-real 迁移中最实用、性价比最高的技术之一。它的核心逻辑可以用一句话概括：**如果你不知道真实世界的精确参数，就让策略在所有合理的参数范围内都有效**。

配合 GPU 并行仿真（Isaac Gym / MJX），域随机化几乎没有额外的训练成本——4096 个并行环境各自使用不同参数，多样性是"免费"获得的。

但 DR 不是银弹。它的局限提醒我们：

1. 范围设置需要领域知识——太窄覆盖不到真实世界，太宽策略过于保守
2. 均匀分布不一定是最优的——配合 SI 使用效果更好
3. 模型结构性缺失无法通过 DR 弥补——需要改进仿真器

---

## 17.5 非对称 Actor-Critic：用"作弊"加速学习

### 17.5.1 一个考试作弊的类比

想象你在准备一场数学考试。备考阶段，老师坐在你旁边，每做一道题就告诉你"这道对了"或"这道思路偏了"。老师能看到标准答案，能看到你的每一步推导，甚至知道题目里故意藏了什么陷阱。但真正考试时，老师不在了——你只能靠自己的笔、自己的草稿纸、自己的直觉。

这个场景完美对应了非对称 Actor-Critic（Asymmetric Actor-Critic）的核心思想：

- **老师 = Critic**：训练时拥有"特权信息"（privileged information），能看到真实物理参数、精确位置、接触力等仿真器内部的"上帝视角"数据。
- **你 = Actor**：部署时只能依赖"可部署信息"——相机图像、关节编码器读数、力/力矩传感器输出。这些是真实机器人能获取的信息。
- **备考 = 训练阶段**：Critic 用特权信息快速评估当前策略的好坏，给 Actor 提供高质量的梯度信号。
- **考试 = 部署阶段**：Critic 被丢弃，只有 Actor 上场。

结论先行：非对称 Actor-Critic 通过解耦"训练时能看到什么"和"部署时能看到什么"，让仿真训练的收敛速度大幅提升，同时不牺牲策略的可部署性。这是目前仿真训练中性价比最高的一项技术。

### 17.5.2 为什么标准 PPO/SAC 慢

回顾 Ch16 学过的 PPO 算法。标准 PPO 的训练循环中，Actor 和 Critic 接收**完全相同的观测**：

```
# 标准 PPO —— Actor 和 Critic 共享输入
observation = env.reset()
for each step:
    action = actor_network(observation)      # Actor 决策
    value = critic_network(observation)       # Critic 估值
    next_obs, reward, done = env.step(action)
```

问题在于：一个四足机器人的观测可能只有 30 维（关节角度 + 角速度 + IMU），这 30 维信息严重不足以判断当前状态的价值。比如，机器人的脚踩在冰面上还是水泥地上，从关节编码器很难区分——但这个信息对评估"当前姿态好不好"至关重要。

Critic 看不到地面材质，只能从 Actor 的动作后果间接推断，导致价值估计的方差很大。方差大 → 梯度噪声大 → 收敛慢 → 需要更多样本 → 需要更多仿真时间。

非对称方法的关键洞察是：**Critic 的输入不需要和 Actor 一样**。Critic 只在训练时存在，它可以使用仿真器内部的任何信息——地面摩擦系数、精确质心位置、每只脚的接触力向量。这些信息让 Critic 的价值估计更准确，从而给 Actor 更好的学习信号。

### 17.5.3 非对称 PPO 的训练循环

下面是非对称 PPO 的伪代码，对比标准 PPO 看差异：

```python
# ========== 非对称 PPO 训练循环 ==========

# Actor 输入：可部署观测（关节角度、IMU、相机等）
# Critic 输入：可部署观测 + 特权信息（摩擦系数、质心、接触力等）

privileged_info = env.get_privileged_state()  # 仿真器内部信息
deployable_obs = env.get_deployable_obs()      # 传感器可获取信息

# --- 训练阶段 ---
for each epoch:
    for each step in rollout:
        # Actor 只看可部署信息
        action = actor_network(deployable_obs)

        # Critic 看完整信息（特权 + 可部署）
        critic_input = concat(deployable_obs, privileged_info)
        value = critic_network(critic_input)

        # 环境步进
        next_obs, reward, done = env.step(action)
        # 收集 (deployable_obs, action, reward, critic_input) 到 buffer

    # PPO 更新
    for each minibatch:
        # 用 GAE 计算优势函数（advantage）
        advantage = compute_gae(rewards, values(critic_inputs))

        # Actor 更新：只用 deployable_obs，不需要特权信息
        actor_loss = ppo_clip_loss(actor, deployable_obs, actions, advantage)

        # Critic 更新：用完整 critic_input
        critic_loss = mse(critic_network(critic_inputs), returns)

        total_loss = actor_loss + 0.5 * critic_loss
        total_loss.backward()
        optimizer.step()

# ========== 部署阶段 ==========
# 只需要 actor_network，critic_network 直接丢弃
# robot_control = actor_network(sensor_data)
```

关键区别在第 14-17 行：Actor 和 Critic 的输入不同。Actor 的输入在部署时也能获取，Critic 的输入只在仿真中存在。这个"不对称"就是方法名称的由来。

### 17.5.4 特权信息具体包含什么

不同任务使用的特权信息不同，但可以归为三类：

| 特权信息类别 | 具体内容 | 为什么 Actor 看不到 |
|---|---|---|
| 环境物理参数 | 摩擦系数、质量分布、关节阻尼 | 真实世界无法直接测量，传感器只能间接反映 |
| 全局状态 | 精确质心位置、所有物体位置 | 部分可观测，传感器有噪声和遮挡 |
| 接触信息 | 每个接触点的力和方向 | 真实机器人的力传感器稀疏且有噪声 |

以四足机器人行走为例，Isaac Gym 中的典型设置：

- Actor 输入（~35 维）：关节角度、关节角速度、IMU 角速度、上一帧动作
- Critic 附加输入（~60 维）：精确质心高度、质心速度、脚部接触力向量、地面摩擦系数、外力扰动

Critic 的输入维度几乎是 Actor 的三倍，但它只存在于训练阶段，不影响部署。

### 17.5.5 Teacher-Student 蒸馏：非对称训练的另一种实现

非对称 Actor-Critic 有一个变体叫做 Teacher-Student 蒸馏（也称 Distillation），分两步走：

**第一步：训练 Teacher**

Teacher 策略使用完整的特权信息训练，相当于一个"理想中的最优策略"：

```python
# Teacher 用完整状态训练
teacher_state = concat(sensor_obs, privileged_info)
teacher_action = ppo_train(teacher_state, env)
# Teacher 学到接近最优的策略
```

**第二步：训练 Student**

Student 策略只看传感器数据，目标是模仿 Teacher 的输出：

```python
# Student 只用传感器数据，模仿 Teacher
for each batch:
    sensor_obs = env.get_sensor_obs()
    teacher_action = teacher_network(sensor_obs, privileged_info)  # Teacher 预测
    student_action = student_network(sensor_obs)                   # Student 预测

    # 行为克隆损失（Behavioral Cloning loss）
    loss = mse(student_action, teacher_action.detach())
    loss.backward()
```

与非对称 Actor-Critic 相比，两者的区别：

| 维度 | 非对称 Actor-Critic | Teacher-Student 蒸馏 |
|---|---|---|
| 训练阶段数 | 1 阶段（Actor 和 Critic 同时训练） | 2 阶段（先 Teacher 再 Student） |
| Critic 作用 | 提供价值估计辅助 Actor 梯度 | Teacher 直接提供行为标签 |
| 实现复杂度 | 较低（改 Critic 输入即可） | 较高（需要两轮训练） |
| 典型应用 | Isaac Gym 四足行走 | ANYmal 四足导航、DAgger 系列 |

> **踩坑提醒**：Teacher-Student 蒸馏中，Teacher 不能太强。如果 Teacher 使用了 Student 永远无法推断的信息（比如未来几步的地面变化），Student 会尝试模仿无法实现的行为，导致策略在部署时崩溃。选择特权信息时要考虑"Student 理论上能否从传感器序列中推断出这个信息"。

### 17.5.6 非对称训练为什么有效：信息论视角

从信息论角度看，非对称训练的有效性来自一个关键假设：**最优策略在可部署观测下仍然存在**，只是很难直接从可部署观测中学到。

Critic 的特权信息相当于提供了"捷径"——它告诉 Actor "当前状态实际上好不好"，让 Actor 不需要自己通过大量试错来推断隐藏状态。这类似于你在考试复习时，老师告诉你"这道题的关键是第三行的隐含条件"，你不需要自己从零发现这个条件，但学会之后考试时你能自己识别类似模式。

形式化地说，标准 PPO 的优势函数估计为：

```
A_t = sum(gamma^l * r_{t+l}) - V(s_t)
```

其中 V(s_t) 是 Critic 对状态 s_t 的价值估计。如果 s_t 只包含传感器信息，V 的估计方差很大。加入特权信息后，V(s_t, p_t) 的估计更准确（p_t 是特权信息），优势函数 A_t 的方差减小，PPO 的样本效率提升。

NVIDIA 在 Isaac Gym 的四足行走实验中报告：非对称 Actor-Critic 相比标准 PPO，收敛速度提升约 2-3 倍，最终奖励提升 15-30%。在 Shadow Hand 在手操作任务中，4096 个并行环境配合非对称训练，训练时间从数天缩短到数小时。

### 17.5.7 典型应用与局限

**Isaac Gym Shadow Hand 在手操作**

Shadow Hand 有 24 个自由度，任务是转动物体（如球、笔）到目标姿态。Actor 输入包括关节角度和指尖触觉传感器读数；Critic 附加输入包括物体精确位姿、接触点位置、摩擦系数。4096 个并行环境 + 非对称 PPO，在 8 块 GPU 上约 1 小时完成训练，策略直接迁移到真实 Shadow Hand。

**ANYmal 四足机器人行走**

ETH Zurich 的 ANYmal 项目使用 Teacher-Student 蒸馏：Teacher 用精确质心状态和地形信息训练，Student 通过模仿 Teacher 学会从本体感受（proprioception）推断隐藏状态。在真实地形（草地、碎石、楼梯）上实现了鲁棒行走。

非对称训练的局限：

- **不是所有信息都能被推断**：如果特权信息和传感器数据之间的映射关系过于复杂，Actor/Student 无法学会从传感器推断等效信息，部署时性能会显著下降。
- **仿真器需要提供特权信息接口**：不是所有仿真平台都方便地暴露内部物理参数。Isaac Gym 和 MuJoCo 支持较好，一些自建仿真器可能需要额外开发。
- **增加了调试复杂度**：Actor 和 Critic 输入不同，当训练效果不好时，需要分别诊断是 Actor 的观测不足还是 Critic 的特权信息选择不当。

---

## 17.6 系统辨识与现实对齐

### 17.6.1 为什么不直接让仿真等于真实

17.4 节讲了域随机化（Domain Randomization, DR）的思路：既然仿真不可能完全等于真实，那就让仿真覆盖一个范围，训练出对差异不敏感的策略。但这引出一个问题：如果仿真的"基准值"本身就和真实差很远，DR 的范围就要设得很大，策略性能会被严重拉低。

打个比方：你要买一双鞋，不知道脚的确切尺码。域随机化的做法是买 38-44 码各一双，总有一双合适。但如果你的脚实际是 42 码，而仿真认为你是 39 码，你就得买 36-46 码——范围太大，每双鞋都不够合脚。

系统辨识（System Identification, SI）的做法是先量一下脚的尺码——精确到 42 码——然后只在 41-43 码范围内随机化。范围小了，每双鞋更合脚，策略性能也更好。

结论先行：系统辨识通过测量真实机器人的物理参数来校准仿真器，缩小仿真与真实的"中心偏差"；域随机化则在已校准的基准上覆盖残余不确定性。两者互补，不是替代关系。

### 17.6.2 系统辨识的具体步骤

系统辨识是一个工程密集型过程，通常包含三个层面：

**第一层：运动学参数标定**

用测量工具确定机器人的连杆长度、质量、质心位置、转动惯量。这些参数通常可以从 CAD 模型获取，但实际制造会有偏差：

- 连杆长度偏差：3D 打印件 ±0.5mm，CNC 加工件 ±0.1mm
- 质量偏差：电机、传感器等部件的实际重量与规格书的差异
- 质心位置：组装后整体质心与理论计算值的偏差

对于低成本机器人（如教育用四足），运动学标定可以显著提升仿真精度。对于高精度工业机器人（如 Franka Panda），出厂参数已经相当准确，标定的收益较小。

**第二层：动力学参数标定**

这是最关键也最困难的一层，包括：

摩擦系数标定：在真实机器人上执行已知运动，测量关节力矩，反推摩擦系数。常见方法是在不同速度下匀速运动，拟合摩擦力-速度曲线：

```
# 摩擦模型（库仑 + 粘性摩擦）
tau_friction = f_coulomb * sign(velocity) + f_viscous * velocity

# 标定流程：
# 1. 以恒定速度 v 运动关节，记录电机输出力矩 tau_motor
# 2. tau_friction = tau_motor - tau_inertia  （减去惯性项）
# 3. 多个速度点拟合 f_coulomb 和 f_viscous
```

电机响应曲线：测量从发送指令到电机实际输出的延迟和动态响应。典型值：

| 机器人类型 | 控制延迟 | 电机带宽 |
|---|---|---|
| 教育四足（如 A1） | 5-20ms | 50-100Hz |
| 工业机械臂（如 Franka） | 1-3ms | 300-1000Hz |
| 软体机器人 | 50-200ms | 5-20Hz |

传感器噪声模型标定：在静止状态下长时间采集 IMU、关节编码器、力传感器的读数，拟合噪声分布。大多数传感器噪声可以建模为高斯白噪声 + 偏置随机游走：

```
# IMU 陀螺仪噪声模型
gyro_reading = true_angular_velocity + N(0, sigma_noise) + bias
bias = bias_prev + N(0, sigma_bias_walk)  # 偏置缓慢漂移
```

**第三层：接触模型标定**

接触是仿真与真实差异最大的部分。真实接触涉及变形、粘弹性、能量耗散等复杂物理过程，而仿真器通常用简化的弹簧-阻尼模型或刚体接触模型近似。

标定方法：在真实机器人上执行受控碰撞实验（如让机械臂末端以已知速度撞击已知材质表面），记录接触力曲线，然后在仿真中调整接触参数（刚度、阻尼、摩擦）使仿真力曲线匹配真实力曲线。

### 17.6.3 SI 与 DR 的互补关系

SI 和 DR 不是二选一的关系，而是流水线上前后衔接的两个步骤：

| 维度 | 系统辨识（SI） | 域随机化（DR） |
|---|---|---|
| 目标 | 仿真基准值 ≈ 真实值 | 策略对残余差异不敏感 |
| 类比 | 校准秤的零点 | 允许秤有 ±5g 误差 |
| 处理的差距 | 系统性偏差（bias） | 随机不确定性（variance） |
| 成本 | 高（需要真机实验） | 低（纯仿真） |
| 效果 | 缩小中心差距 | 增大容忍带宽 |

最佳实践的流程：

```
1. SI：测量真实机器人参数 → 校准仿真器基准值
   - 摩擦系数：仿真 0.7 → 标定后 0.65
   - 电机延迟：仿真 0ms → 标定后 8ms
   - IMU 噪声：仿真 0 → 标定后 σ=0.01 rad/s

2. DR：在已校准基准上设置随机化范围
   - 摩擦：0.65 ± 0.15（而不是从 0 到 1 随机化）
   - 延迟：8ms ± 4ms
   - IMU 噪声：σ ∈ [0.008, 0.012]
```

先 SI 再 DR 的效果在多项研究中得到验证。ETH Zurich 在 ANYmal 上的实验表明：不做 SI 直接 DR，真机成功率约 60%；先做 SI 再 DR，成功率提升到 85% 以上。

> **踩坑提醒**：系统辨识不是一次性的工作。机器人经过维修、更换部件、磨损后，物理参数会变化。如果仿真参数不随之更新，之前标定的效果会逐渐失效。建议建立定期重新标定的流程，或在策略部署时加入在线自适应机制。

### 17.6.4 SimplerEnv：逆向思路——Alignment > Realism

2024 年斯坦福和清华的研究者提出了一个反直觉的思路：仿真不需要"逼真"，只需要"对齐"（aligned）。

传统思路认为仿真的物理越准确、视觉越逼真，仿真到真实的迁移效果就越好。SimplerEnv 质疑了这个假设。他们发现：

- 追求视觉逼真度（如用高级渲染器生成真实感图像）成本高，但对策略迁移的收益不一定成正比。
- 真正重要的是：仿真中的策略排名与真实世界中的策略排名一致。也就是说，如果策略 A 在仿真中比策略 B 好，那么在真实世界中也应该 A 比 B 好。

这把仿真的角色从"训练环境"转变为"评估环境"。在训练阶段，你用什么方法都行（甚至可以不用仿真）；在评估阶段，用 SimplerEnv 来预测哪个策略在真实世界中更可能成功。

SimplerEnv 的具体做法：

1. 构建仿真环境，不追求物理逼真，但覆盖代表性任务场景。
2. 收集多个策略在仿真中的表现数据。
3. 收集相同策略在真实世界中的表现数据。
4. 计算仿真排名与真实排名的相关性（如 Spearman 秩相关系数）。
5. 调整仿真参数使排名相关性最大化，而不是使物理参数匹配度最大化。

实验结果：SimplerEnv 在 Google Robot 和 Franka Panda 的多个操作任务上，仿真-真实排名相关性达到 0.7-0.9（1.0 完美一致），而传统高保真仿真的排名相关性只有 0.3-0.5。

这个结果的启示：如果你用仿真来**选择**部署哪个策略（而不是用仿真来**训练**策略），应该优化排名一致性而非物理逼真度。

---

## 17.7 世界模型：不用仿真器也能跨越 Gap

### 17.7.1 从"建造仿真"到"学习仿真"

前面四节讨论的所有方法——域随机化、非对称训练、系统辨识——都有一个共同前提：你需要一个手工搭建的仿真器。仿真器由物理引擎（如 PhysX、MuJoCo）驱动，需要人工定义场景几何、物理参数、渲染管线。

但 Ch15 我们学过世界模型（World Model）：Dreamer、Genie、Cosmos 等模型可以从数据中学习环境的动态规律。如果世界模型从**真实数据**中学习，它天然就"知道"真实世界的物理规律——不存在 sim-to-real gap。

类比：传统仿真器就像你照着菜谱做菜——菜谱（物理引擎）可能不完全准确，做出来的菜和餐馆的味道有差距（sim-to-real gap）。世界模型就像你尝了一口餐馆的菜，然后自己摸索着还原——虽然不可能完全一样，但至少你是直接从"真实味道"学习的，不存在"菜谱翻译误差"。

结论先行：世界模型方案通过从真实数据中学习环境动态，绕过了传统仿真器的建模误差问题。目前这条路线在数据效率（DayDreamer）和规模（Cosmos Policy）两个方向上都有突破性进展，但尚未成为工业主流。

### 17.7.2 DayDreamer：1 小时真机数据学会行走

DayDreamer（Wu et al., 2022）是第一个完全不用仿真器、纯靠世界模型在真机上学习的四足机器人项目。

核心思路：

1. 在真实四足机器人上随机收集约 1 小时的交互数据（随机动作 → 记录状态转移）。
2. 用 Dreamer-V2 世界模型在这些真实轨迹上训练，学习环境的动态模型。
3. 在世界模型的"想象"（imagination）中训练策略——类似于在仿真器中训练，但"仿真器"是学出来的。
4. 将策略直接部署到真实机器人。

整个流程的关键数据：

| 指标 | 数值 |
|---|---|
| 真实数据收集时间 | 约 1 小时 |
| 世界模型训练时间 | 约 40 分钟 |
| 策略训练（在想象中） | 约 20 分钟 |
| 仿真器使用 | 无 |
| 最终效果 | 四足前进行走 |

DayDreamer 的世界模型架构沿用 Dreamer-V2：

```
# DayDreamer 核心循环

# 1. 真实数据收集
real_trajectories = collect_random_rollouts(robot, duration=1hour)

# 2. 训练世界模型
world_model = DreamerV2()
world_model.train(real_trajectories)
# 世界模型学会：给定 (state, action) → 预测 next_state 和 reward

# 3. 在想象中训练策略（不需要真实机器人或仿真器）
for each iteration:
    # 从世界模型中采样想象轨迹
    imagined_traj = world_model.rollout(policy, horizon=15)
    # 在想象轨迹上计算梯度，更新策略
    actor_critic_update(imagined_traj)

# 4. 部署
robot.execute(policy)
```

为什么 DayDreamer 能用如此少的数据？关键在于四足行走任务的特性：

- 状态空间低维（关节角度 + IMU，约 30 维）
- 动态相对简单（刚体动力学，无非线性变形）
- 世界模型只需要预测短期动态（horizon ≈ 15 步），不需要长期规划

> **踩坑提醒**：DayDreamer 的"1 小时"指的是数据收集时间，不包含调试、重置机器人、处理硬件故障的时间。实际工程中，准备 1 小时有效数据可能需要一整天的现场工作。此外，四足行走是相对简单的任务——对于需要精细操作的任务（如插钥匙），1 小时数据远远不够。

### 17.7.3 UniSim：视频扩散模型作为通用仿真器

UniSim（Yang et al., 2023）走了一条更激进的路：用条件视频扩散模型（conditional video diffusion model）作为"学习出来的通用仿真器"。

核心思想：真实世界的物理规律已经隐含在海量视频中。一个人推倒积木的视频包含了刚体动力学的信息，水倒入杯子的视频包含了流体动力学的信息。如果模型能从足够多的视频中学会"给定当前画面和动作，下一帧画面是什么"，它就隐式地学会了物理规律。

UniSim 的架构：

- 输入：当前帧图像 + 文本指令（如"把红色方块推到左边"）或动作信号
- 输出：下一帧（或多帧）图像
- 模型：条件视频扩散模型，从互联网视频 + 机器人演示视频训练

与传统仿真器的对比：

| 维度 | 传统仿真器 | UniSim |
|---|---|---|
| 物理规律来源 | 人工编码的物理方程 | 从视频隐式学习 |
| 视觉真实感 | 取决于渲染管线质量 | 天然真实（学自真实视频） |
| sim-to-real gap | 存在（物理简化导致） | 理论上不存在（直接学真实） |
| 可控性 | 高（可精确设置参数） | 低（难以精确控制物理参数） |
| 计算成本 | 低（GPU 并行仿真） | 高（视频扩散推理慢） |

UniSim 的局限在于可控性和速度。传统仿真器可以精确设置摩擦系数为 0.37，UniSim 做不到——它只能通过文本描述间接影响物理行为。视频扩散模型的推理速度也比物理引擎慢几个数量级。

### 17.7.4 Cosmos Policy 与 GR-2：大规模视频预训练

Cosmos Policy（NVIDIA, 2025）和 GR-2（ByteDance, 2024）代表了世界模型方案的"暴力美学"——用海量视频预训练，再微调成机器人策略。

**Cosmos Policy**：

- 预训练数据：2000 万小时视频（NVIDIA Cosmos 世界基础模型）
- 预训练目标：视频预测（下一帧预测）
- 微调方式：在机器人演示数据上微调为策略
- 核心卖点：跳过传统仿真，直接从视频学习物理规律和视觉理解

**GR-2**：

- 预训练数据：3800 万条互联网视频（涵盖人类日常活动、操作场景）
- 预训练方式：自回归视频生成
- 微调方式：在机器人数据上微调
- 结果：在多个真实操作任务上实现 zero-shot 和 few-shot 泛化

两者的共同模式：

```
# 大规模视频预训练 → 机器人微调范式

# Stage 1: 视频预训练（学到世界动态）
video_model = train_video_predictor(millions_of_videos)
# 模型学会：物理规律、物体交互、人类行为模式

# Stage 2: 机器人微调（学会动作映射）
policy = fine_tune(video_model, robot_demonstrations)
# 模型学会：给定观测 → 输出机器人动作
```

### 17.7.5 传统仿真 vs 世界模型：全面对比

| 维度 | 传统仿真 + DR | 世界模型方案 |
|---|---|---|
| 物理精度 | 依赖引擎质量，存在建模误差 | 从真实数据学习，无建模误差 |
| 视觉真实度 | 依赖渲染管线，通常不够逼真 | 天然真实 |
| 数据需求 | 低（仿真自生成数据） | 高（需要真实视频/交互数据） |
| 计算需求 | 中（GPU 并行仿真） | 极高（视频扩散推理） |
| 可控性 | 高（可精确设参） | 低（难以精确控制物理参数） |
| 成熟度 | 工业级（Isaac Gym/Lab） | 研究阶段 |
| 代表项目 | Isaac Gym, MuJoCo | DayDreamer, UniSim, Cosmos Policy |
| 适用场景 | 高频控制、精确物理 | 视觉丰富场景、长期规划 |

当前阶段（2025 年中），传统仿真 + DR 仍然是工业主流，世界模型方案在研究界发展迅速但尚未成熟。两者的融合趋势已经开始：用世界模型增强仿真的视觉真实度（如用扩散模型生成真实感纹理），同时保留物理引擎的可控性。

---

## 17.8 自动化仿真环境生成

### 17.8.1 仿真环境的瓶颈

到此为止，我们讨论的所有方法——DR、非对称训练、SI、世界模型——都假设仿真环境已经存在。但实际上，搭建一个仿真环境本身就是巨大的工程成本：

- 定义场景几何（房间布局、物体形状、桌面摆放）
- 编写奖励函数（怎么定义"任务完成"）
- 配置物理参数（质量、摩擦、密度）
- 编写专家策略（用于验证任务可解）

一个复杂操作任务的仿真环境搭建可能需要 1-2 周的工程师时间。如果要覆盖 100 个任务，就是 2-4 人年的工作量。

2023 年以来，LLM 驱动的自动化仿真环境生成开始解决这个问题。核心思想：让 LLM 扮演仿真工程师，自动生成任务描述、奖励函数和仿真配置。

### 17.8.2 GenSim：LLM 生成仿真任务

GenSim（Wang et al., 2023）用 GPT-4 自动生成仿真操作任务。系统流程：

```
# GenSim 任务生成流程

# 输入：任务类别（如"pick-and-place"）
prompt = """
你是一个仿真任务设计师。请为 SAPIEN 仿真器设计一个 pick-and-place 任务。

输出以下内容：
1. 任务描述（一句话）
2. 物体配置（形状、尺寸、颜色、初始位姿）
3. 目标配置（目标位姿）
4. 奖励函数（Python 代码，基于物体位姿）
5. 仿真参数（摩擦、质量等）

示例参考：[附上 3-5 个已有任务的代码]
"""

# GPT-4 生成任务
task_config = gpt4.generate(prompt)

# 自动验证：在仿真中运行，检查任务可解性
success = verify_task_in_simulator(task_config)
if not success:
    # 反馈错误信息给 GPT-4，重新生成
    task_config = gpt4.fix(task_config, error_info)

# 可选：自动生成专家策略
expert_policy = train_expert_with_rl(task_config)
```

GenSim 生成了超过 100 个仿真操作任务，覆盖 pick-and-place、articulated object manipulation、tool use 等类别。与人工设计相比，LLM 生成的任务在多样性和新颖性上有优势——GPT-4 会生成一些人类工程师想不到的任务组合（如"用铲子把沙子推进杯子再倒出来"）。

但 GenSim 也有局限：生成的奖励函数经常有 bug（如奖励信号泄露、奖励梯度方向错误），需要自动验证 + 迭代修复。平均每个任务需要 2-4 轮 GPT-4 交互才能生成可用的配置。

### 17.8.3 ProcTHOR：程序化生成 10K 套房屋

ProcTHOR（Deitke et al., 2022）解决的是导航任务的仿真环境问题。传统做法是用少量真实房屋的 3D 扫描（如 Matterport3D 数据集，90 套房屋），但这些房屋数量有限且布局重复。

ProcTHOR 的方法：用程序化规则生成 10,000 套虚拟房屋。每套房屋包含多个房间、家具摆放、光照设置，全部由代码自动生成。

关键发现是**"多样性 > 单场景保真度"**：

- 只在 10 套高保真真实房屋上训练 → 真实测试集成功率 35%
- 只在 10,000 套低保真合成房屋上训练 → 真实测试集成功率 52%

合成房屋的视觉质量低于真实扫描，但数量优势带来的多样性让策略学到更泛化的导航能力。这和 17.6.4 节 SimplerEnv 的发现异曲同工：逼真不是目的，泛化才是。

ProcTHOR 的生成规则包括：

| 规则类别 | 具体内容 |
|---|---|
| 房屋布局 | 随机房间数量（1-15间）、面积、连接方式 |
| 家具摆放 | 基于功能约束（床放卧室、冰箱放厨房）+ 随机扰动 |
| 物体类别 | 1,000+ 种可交互物体，每套房屋随机选取子集 |
| 光照 | 不同时间段的自然光 + 室内灯光组合 |

### 17.8.4 与 Ch16 的联系：AI 设计 AI 的训练环境

把 Eureka（Ch16 介绍的 LLM 生成奖励函数）和 GenSim（LLM 生成仿真任务）放在一起看：

```
传统流程：人类设计任务 → 人类写奖励函数 → RL 训练策略
                  ↓ LLM 替代
新流程：   LLM 设计任务（GenSim）→ LLM 写奖励函数（Eureka）→ RL 训练策略
```

这是一个"AI 设计 AI 训练环境"的闭环。人类只需要提供高层目标（如"让机器人学会操作工具"），LLM 负责具体的任务设计、奖励函数编写、仿真配置，RL 算法负责策略训练。

2024 年的趋势是将这两个步骤进一步整合：一个 LLM agent 同时负责任务生成、奖励函数编写、训练监控和结果分析，形成全自动的"仿真环境工厂"。NVIDIA 的 Isaac Lab 已经开始集成这类能力。

> **踩坑提醒**：LLM 生成的仿真任务存在"可行性偏差"——LLM 倾向于生成它见过的任务类型，对真正新颖的任务设计能力有限。如果你的研究目标需要突破性任务设计（而非批量生成已知类型的变体），LLM 自动生成目前还不能替代人类专家的创造力。

---

## 17.9 案例研究：从仿真到真机的完整故事

前面几节分别讲了各种技术。这一节把它们串起来，通过四个案例展示完整的 sim-to-real 流水线。每个案例都包含仿真设置、训练方法、迁移结果和教训。

### 17.9.1 案例一：Isaac Gym Shadow Hand 在手操作

**背景**：Shadow Hand 是一只拟人机器人手，24 个自由度，任务是转动物体（球、圆柱、笔）到目标姿态。这是 sim-to-real 领域的经典 benchmark。

**仿真设置**：

- 平台：Isaac Gym（NVIDIA GPU 并行仿真）
- 并行环境数：4096（单 GPU 上同时运行 4096 只手）
- 物理仿真：PhysX，刚体接触模型
- 域随机化范围：

| 参数 | 随机化范围 | 真实值（估计） |
|---|---|---|
| 物体质量 | ±50% | ~0.1kg |
| 摩擦系数 | [0.2, 1.5] | ~0.8 |
| 关节摩擦 | ±30% | 标定值 |
| 动作延迟 | 0-20ms | ~8ms |
| 触觉噪声 | σ ∈ [0, 0.05] | ~0.02 |

**训练方法**：非对称 PPO

- Actor 输入：关节角度（24维）+ 关节速度（24维）+ 指尖触觉（96维）+ 上一帧动作（24维）= 168 维
- Critic 附加输入：物体精确位姿（7维）+ 接触点位置（15维）+ 摩擦系数（1维）+ 物体质量（1维）= 24 维
- 超参数：lr=3e-4, clip=0.2, entropy=0.01, GAE lambda=0.95
- 硬件：8x NVIDIA A100 GPU
- 训练时间：约 1 小时（约 60 亿样本）

**迁移结果**：

- 仿真中成功率：>95%（球转动到目标姿态）
- 真实成功率：70-80%（第一次尝试）
- 关键瓶颈：真实 Shadow Hand 的 tendon 驱动系统有非线性滞后，仿真中未建模

**教训**：物理 DR 的参数范围选择是成败关键。范围太窄 → 策略过拟合仿真基准值，真机失败。范围太宽 → 策略太保守，仿真中都学不好。该项目的经验是先做系统辨识确定基准值，然后以基准值为中心、±30-50% 为半径设置随机化范围。

### 17.9.2 案例二：Habitat 导航到真实部署

**背景**：Habitat（Facebook AI Research）是面向导航任务的仿真平台，支持在 3D 扫描的室内场景中训练导航策略。

**仿真设置**：

- 平台：Habitat-Sim
- 训练场景：Gibson 数据集（72 套真实房屋 3D 扫描）
- 并行效率：4093 FPS（每秒 4093 帧仿真画面，远超真实时间）
- 任务：PointNav（导航到指定坐标）
- 传感器：深度相机 + RGB 相机

**关键发现：传感器模态影响迁移难度**

研究者在迁移到真实 TurtleBot 时发现：

| 传感器模态 | 仿真成功率 | 真实成功率 | 下降幅度 |
|---|---|---|---|
| 仅深度 | 97% | 89% | -8% |
| 仅 RGB | 95% | 62% | -33% |
| 深度 + RGB | 98% | 85% | -13% |

深度传感器比 RGB 更容易跨域迁移。原因分析：

- 深度图的信息是几何结构，仿真和真实的深度图格式相同（浮点距离矩阵），渲染差异小。
- RGB 图像包含纹理、光照、色彩信息，仿真的渲染效果和真实世界差异大（即使使用真实扫描场景）。
- 深度传感器噪声模型简单（高斯 + 量化），容易在仿真中模拟；RGB 的域差异复杂（光照、白平衡、镜头畸变）。

**教训**：选对传感器模态等于降低 sim-to-real 难度。如果任务可以用深度信息完成，优先选择深度而非 RGB。如果必须用 RGB（如需要识别物体类别），则需要配合视觉域随机化（17.4 节）或真实数据微调。

### 17.9.3 案例三：SAPIEN 操作泛化 Gap

**背景**：SAPIEN 是一个面向操作任务的仿真平台。研究者在一个大规模操作 benchmark 上训练策略，测试策略在不同物体上的泛化能力。

**实验设计**：

- 训练物体集：2,684 个 3D 物体模型
- 测试物体集：656 个未见过的物体
- 任务：pick-and-place
- 训练方法：PPO + 视觉 DR

**结果**：

- 训练集物体成功率：88.7%
- 测试集物体成功率：22.9%
- 下降幅度：-65.8%

这个 66% 的性能下降经常被误读为"sim-to-real gap"。但仔细分析后发现，这些测试物体**完全在仿真中**——没有真实机器人参与。所以这不是仿真与真实的物理差异导致的，而是策略对**未见物体形状**的泛化能力不足。

**教训**：不是所有"仿真到真实"的失败都是物理差异导致的。在排查 sim-to-real 问题时，先排除泛化 gap：

1. 在仿真中用训练物体测试 → 如果性能好，说明策略学到了
2. 在仿真中用测试物体测试 → 如果性能差，是泛化问题，不是 sim-to-real 问题
3. 在真实机器人上用训练物体测试 → 如果性能差，才是真正的 sim-to-real gap

| 测试场景 | 成功率 | 失败原因 |
|---|---|---|
| 仿真 + 训练物体 | 88.7% | — |
| 仿真 + 测试物体 | 22.9% | 泛化 gap（物体形状未见） |
| 真实 + 训练物体 | ~60% | sim-to-real gap（物理差异） |
| 真实 + 测试物体 | ~15% | 泛化 gap + sim-to-real gap |

### 17.9.4 案例四：DayDreamer 四足行走——跳过仿真

**背景**：DayDreamer（17.7.2 节详细介绍过）完全不用仿真器，在真实四足机器人上用世界模型学习。

**完整流水线**：

1. **数据收集**（~1 小时真机时间）
   - 机器人执行随机动作
   - 记录状态转移序列：(关节角度, 动作) → 下一时刻关节角度
   - 约 100,000 个转移样本

2. **世界模型训练**（~40 分钟）
   - Dreamer-V2 架构
   - 编码器：将状态编码为隐变量
   - 转移模型：预测下一隐变量
   - 解码器：从隐变量重建状态
   - 奖励预测器：预测奖励

3. **策略训练**（~20 分钟）
   - 在世界模型生成的想象轨迹上训练 Actor-Critic
   - 不需要真实机器人或仿真器
   - 想象 horizon = 15 步

4. **部署**
   - 策略直接加载到真实机器人
   - 无需域随机化（世界模型已经从真实数据学到真实动态）
   - 无需系统辨识（同理）

**结果与对比**：

| 维度 | 传统仿真路线 | DayDreamer 路线 |
|---|---|---|
| 仿真器搭建 | 2-4 周 | 不需要 |
| 数据收集 | 不需要真机数据 | 1 小时真机数据 |
| 域随机化 | 必须 | 不需要 |
| 系统辨识 | 推荐 | 不需要 |
| 训练时间 | 1-10 小时（4096 并行环境） | 1 小时（单机器人数据） |
| 最终效果 | 稳定行走 | 前进行走（姿态不够稳定） |

**教训**：如果任务足够简单（低维状态、短期动态），可以跳过仿真器直接用世界模型学习。但 DayDreamer 的行走质量明显不如仿真训练的策略——走路姿态不够自然，速度较慢。这说明世界模型方案在数据效率上有优势，但在策略质量上仍有差距。随着视频预训练世界模型（如 Cosmos）的发展，这个差距正在缩小。

---

## 17.10 总结：三条路线与选择指南

### 17.10.1 三条路线

本章从 17.1 的 sim-to-real gap 定义出发，经过 DR（17.4）、非对称训练（17.5）、系统辨识（17.6）、世界模型（17.7）、自动环境生成（17.8）到案例研究（17.9），覆盖了 sim-to-real 的主要技术栈。这些技术可以归纳为三条路线：

**路线一：高保真仿真 + DR + 非对称训练**

这是主流工业路线。用物理引擎搭建仿真环境，用系统辨识校准基准参数，用域随机化覆盖残余不确定性，用非对称 Actor-Critic 加速训练。

适用条件：有大规模仿真基础设施（NVIDIA GPU + Isaac Gym/Lab），任务可以被物理引擎合理建模，有工程团队维护仿真环境。

代表项目：Isaac Gym Shadow Hand、ANYmal 四足行走、NVIDIA Isaac Lab。

优势：成熟、可控、训练速度快（4096 并行环境）、社区支持好。

劣势：仿真环境搭建成本高，视觉渲染不够逼真（需要额外处理），物理模型简化导致的 gap 仍然存在。

**路线二：世界模型替代仿真**

这是前沿研究路线。从真实数据中学习世界模型，在世界模型的想象中训练策略，绕过物理引擎的建模误差。

适用条件：有真实数据来源（真机或真实视频），任务的状态/观测空间适合世界模型建模，计算资源充足（视频扩散模型推理成本高）。

代表项目：DayDreamer（真机数据）、UniSim（互联网视频）、Cosmos Policy（大规模视频预训练）、GR-2。

优势：无物理建模误差，视觉天然真实，不需要手工搭建仿真环境。

劣势：数据需求大（除 DayDreamer 外），推理速度慢，可控性低，技术不成熟。

**路线三：直接真机学习（跳过仿真）**

不做仿真，直接在真实机器人上学习。Ch14 介绍的 UMI（Universal Manipulation Interface）和 ACT/Aloha 属于这条路线——通过人类演示收集数据，直接训练策略。

适用条件：任务简单或可高效收集数据，有安全可靠的真机实验条件，不需要大规模试错（或试错成本低）。

代表项目：UMI（Ch14）、ACT-ALOHA（Ch14）、iDP3。

优势：零 sim-to-real gap，策略直接在真实环境中学到。

劣势：数据收集成本高，安全风险大（RL 试错可能损坏机器人），难以覆盖多样场景。

### 17.10.2 路线选择决策树

```
你要训练一个机器人策略。选择路线：

1. 你的任务需要高频控制（>50Hz）且物理交互复杂（如行走、跑跳）？
   → 是：你有大规模 GPU 仿真基础设施？
      → 是：路线一（高保真仿真 + DR + 非对称训练）
      → 否：你有 1-2 小时真机数据收集条件？
         → 是：路线二（世界模型，参考 DayDreamer）
         → 否：考虑租用云 GPU 或与有仿真资源的团队合作

2. 你的任务是操作类（抓取、放置、插拔）？
   → 是：你能收集 50-200 条人类演示？
      → 是：路线三（直接真机学习，参考 UMI/ACT）
      → 否：你有仿真平台和物体 3D 模型？
         → 是：路线一 + 视觉 DR
         → 否：路线二（用视频预训练世界模型微调）

3. 你的任务是导航类？
   → 是：用深度传感器而非 RGB？
      → 是：路线一（Habitat + 深度 + DR）
      → 否：路线一（Habitat + RGB + 重度视觉 DR）或
             路线二（视频预训练世界模型）
```

### 17.10.3 三个反思教训

**教训一：sim-to-real 不是单一问题**

本章展示了多种导致仿真-真实性能下降的原因：物理参数不匹配（需要 DR/SI）、传感器域差异（需要视觉 DR 或换模态）、泛化不足（需要更多训练物体）、仿真环境限制（需要更好的接触模型）。在排查迁移失败时，先定位是哪个环节的问题，再对症下药。

**教训二：过度依赖 DR 是陷阱**

DR 是最流行的 sim-to-real 技术，但它的代价是策略性能下降——训练范围越宽，策略越保守。如果只靠 DR 而不做系统辨识，相当于在错误的基准上做宽范围随机化，策略性能会被严重拉低。始终遵循"先 SI 缩小基准偏差，再 DR 覆盖残余不确定性"的原则。

**教训三：世界模型不是万能替代品**

世界模型方案在理论上消除了 sim-to-real gap，但在实践中面临自己的 gap：世界模型的预测误差（尤其在长 horizon 上）会导致策略在想象中学到错误行为。DayDreamer 的行走质量不如仿真训练的策略，UniSim 无法精确控制物理参数。2025 年的世界模型方案更适合作为传统仿真的补充（增强视觉真实度），而非完全替代。

---

## 通向下一章

到这里，你已经掌握了从仿真训练到真实部署的完整技术栈：域随机化让策略对不确定性鲁棒，非对称训练用特权信息加速学习，系统辨识校准仿真基准，世界模型从真实数据学习动态，自动化生成降低环境搭建成本。

但还有一个维度我们没讨论：机器人感知世界的方式。前面所有章节的机器人主要靠视觉（RGB/深度相机）和本体感受（关节编码器/IMU）。真实世界的信息远不止于此——你听到杯子碰到桌面的声音就知道它放稳了，摸到材质就知道该用多大力。多模态感知是通向更通用具身智能的必经之路。

下一章，我们探索多模态生态：ImageBind 如何把六种模态（图像、文本、音频、深度、热成像、IMU）绑在统一嵌入空间中，AnyMAL 如何让大语言模型理解多模态输入，3DShape2VecSet 如何把 3D 形状编码为可计算的向量集合。这些技术将让机器人不再"只看不做"，而是"又看又听又摸"地理解世界。

---

> 前置章节：[Ch16: 强化学习基础——PPO / SAC / 奖励塑形](ch16-rl-basics.md)
> 后续章节：[Ch18: 多模态生态——ImageBind / AnyMAL / 3DShape2VecSet](ch18-multimodal.md)
> [返回目录](README.md)