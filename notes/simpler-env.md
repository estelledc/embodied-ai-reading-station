---
title: "SimplerEnv"
slug: simpler-env
topic: sim
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2405.05941"
venue: NeurIPS
year: 2024
era: frontier
num: 37
generated_at: 2026-07-01
---

# SimplerEnv：仿真给 VLA 打分，和真机「排序一致」

> 零基础可读精读笔记。数字来自 arXiv:2405.05941 原文 Table I–III 及 §IV–VI。

## 一句话讲什么（TL;DR）

**SIMPLER**（SimplerEnv 套件）在 **SAPIEN** 里重建 **Google Robot / WidowX BridgeV2** 真机评测场景，用 **SysID 控物理 + Visual Matching 绿幕贴图** 缩小 **real-to-sim 鸿沟**；对 **6 个开源 VLA checkpoint** 做 **paired 真机/仿真** 评测，**Visual Matching** 平均 **Pearson r=0.924、MMRV=0.056**，远胜 **验证集 MSE（r=0.308）**——仿真成功率可当 **真机改进的代理指标**。

*所以这一节是想说：目标不是 **仿真越像越好**，而是 **谁强谁弱和真机一致**。*

---

## 这是个什么场景

你训了一个 **VLA**（看图+听指令→出动作），论文要写 **「比 RT-1 高 5%」**——理想情况得 **借 Google 真机跑 500 次 pick-place**。现实是：

- **真机贵、排队、难复现**（桌布、摩擦、初始位姿略变，分数就飘）；
- **验证集 action MSE** 低 **≠** 真机成功率高（模仿学习老坑）；
- **RoboSuite / RLBench** 分数 **和 RT 系真机 benchmark 对不上号**。

**SIMPLER** 像 **「校准过的驾考 simulator」**：不追求 **照片级数字孪生**，只追求 **同一批策略在仿真 vs 真机的相对排序一致**。你 **没真机** 也能 **几小时** 拿到 **和 RT-1 论文可比的 proxy 分数**。

**和 Sim-to-Real 训练对比**：Sim2Real 问 **「sim 里练的策略能否上真机」**；SIMPLER 问 **「已在真机数据上练好的策略，sim 里谁更强」**——**问题方向相反**，但 **都怕 control/visual gap**。

*所以这一节是想说：generalist VLA 时代需要 **Real-to-Sim Evaluation** 基建。*

---

## 之前的人怎么做的，为什么不够好

- **真机金标准**：RT-1/RT-2/Octo 报 **真实 success rate**——权威但 **不可扩展**。
- **通用仿真 benchmark**（Meta-World、RLBench、RoboSuite）：**train+eval 都在 sim**，**不保证** 反映 **真机训好的策略**。
- **数字孪生导航**（Habitat 扫房间）： manipulation 要 **动态物体+接触力学+材质**， **全 fidelity 重建** 仍 **贵且 open**。
- **Validation MSE 选模型**：Table I 显示 **MMRV 0.375、r=0.308**——**选 checkpoint 会选错**。
- **纯 Domain Randomization 评测**：视觉 **离真机太远** 时，**敏感策略** 分数 **崩**（VarAgg MMRV **0.143** vs VisMatch **0.056**）。

**缺口**：缺 **「对齐 RT/Bridge 真机协议 + 公开相关性数字」** 的 **评测专用 sim**——SIMPLER **用 Table I 的 r/MMRV 把「可信」量化出来**。

*所以这一节是想说：Sim-to-Real 训策略 **≠** Real-to-Sim **评策略**——后者长期被忽视。*

---

## 这篇论文的新想法

**核心公式**（§III-A）：要找仿真器 $\mathcal{S}$，使得对策略 $\pi_a,\pi_b$：

$$\text{sign}(R_a - R_b) \approx \text{sign}(R_{\mathcal{S},a} - R_{\mathcal{S},b})$$

**不必** $R_{\mathcal{S}} = R_{\text{real}}$ 逐点相等，**只需排序 + 间隔可信**。

**两轴对齐**（借 sim2real 文献）：

1. **Control gap**：开环 replay 演示动作 → sim **末端 6D 轨迹** 贴真机（**SysID 调 PD**）。
2. **Visual gap**：**绿幕**（真背景 + sim 前景）+ **纹理烘焙**（物体/机械臂）。

**新指标 MMRV**（§III-B）：错序时惩罚 **$|R_i-R_j|$**（真机差距大才重罚），比 **Spearman** 更懂 **「噪声级错序 vs 灾难错序」**。

*所以这一节是想说：**对齐 > 逼真**；**MMRV + Pearson** 一起报。*

---

## 它分几步做的（方法）

### 5.1 问题定义与指标（§III）

**输入**：在 **真机** 上测得的策略成功率 $R_i$（多 checkpoint、多任务）。

**输出**：仿真器 $\mathcal{S}$ 上 $R_{\mathcal{S},i}$，使：

| 指标 | 范围 | 含义 |
|------|------|------|
| **Pearson r** | $[-1,1]$ ↑ | sim/real 成功率 **线性相关** |
| **MMRV** | $[0,1]$ ↓ | **错序幅度** 加权（Eq.1–2） |

**RankViolation**$(i,j) = |R_i-R_j| \cdot \mathbf{1}[(R_{\mathcal{S},i}<R_{\mathcal{S},j}) \neq (R_i<R_j)]$

**MMRV** $= \frac{1}{N}\sum_i \max_j \text{RankViolation}(i,j)$

**为何不用 Spearman  alone？** Fig.1：**同样 1 次错序**，真机差距 **2% vs 40%** 严重性不同；MMRV **区分**。

**对 VLA 开发者意味着什么？** 若 **Policy A 真机 70%、B 为 50%**，合格 sim 应 **几乎从不** 给出 **B_sim > A_sim**；若违反且 **|R_A−R_B| 大**，MMRV **飙升**——比 **单独看 r** 更 **抓「致命错序」**。

*所以这一节是想说：评测 sim 质量 **看排序 + 间隔**，不是 **看绝对成功率是否相等**。*

---

### 5.2 控制对齐：System Identification（§IV-A）

**目标**：开环执行同一动作序列 $\{a_i\}_{i=1}^T$，sim 末端位姿 $(x'_i,R'_i)$ **贴近** 真机 $(x_i,R_i)$。

**损失**（演示集 $\mathcal{D}$ 来自 **RT-1 / Bridge 开源 demo**）：

- $\mathcal{L}_{trans} = \frac{1}{T}\sum \|x_i - x'_i\|_2$
- $\mathcal{L}_{rot} = \frac{1}{T}\sum \arcsin(\frac{1}{2\sqrt{2}}\|R_i-R'_i\|_F)$
- $\mathcal{L}_{sysid} = \mathcal{L}_{trans} + \mathcal{L}_{rot}$

**优化**：PD 参数 $(p,d)$ **模拟退火 3 轮**，逐轮 **缩小搜索区间**。

**为何用开环 replay 而非闭环 RL？** SysID 阶段 **固定 action 序列** 可 **隔离「控制器不准」** 与 **「策略本身差」**；若闭环，**策略会补偿 sim 误差**，**调参目标被污染**。

**与物体物理参数关系**：Table II 只动 **arm PD**；物体 **密度/摩擦** 在 §V **按材料表设**，**不再联合搜索**——否则 **搜索空间爆炸**；作者假设 **demo 接触以 arm 跟踪误差为主矛盾**。

**效果（Fig.2 Pick Coke Can）**：SysID 前 **开环抓罐失败**；后 **轨迹贴合、抓取成功**。

**人话**：VLA 输出 **「手到某 6D 位姿」**；sim 里 PD **太软** 则 **够不着罐**，**太硬** 则 **碰飞**——SysID 用 **真机 demo 回放** 找到 **「同样 action 序列，sim 手走到哪」** 的 **摩擦/阻尼**。

**数据从哪来？** **零额外真机采集**——直接用 **RT-1 / Bridge 已有 demonstration** 的 **(action, ee_pose)** 对。

**消融（Table II, Pick Coke Can）**：

| 控制参数 | Control Loss ↓ | MMRV ↓ |
|----------|----------------|--------|
| Setting 1 | 0.267 | 0.070 |
| Setting 2 | 0.432 | 0.100 |
| **SIMPLER SysID** | **0.131** | **0.031** |

*所以这一节是想说：**摩擦/阻尼不对 → sim 里 arm 「打滑」→ VLA 分数全假**。*

---

### 5.3 视觉对齐：Visual Matching（§IV-B）

**动机**：VLA **大模型对纹理/背景敏感**；纯 sim 渲染 **前景物体+机械臂** 不像。

**步骤**：

1. **Green screening**：真机评测视频 **首帧** 用 inpainting **去掉 robot/物体** 得背景 $I_{real}$；sim 渲染 $I_{sim}$ 用 **GT mask** 取前景 $M$；合成 $I' = M\odot I_{sim} + (1-M)\odot I_{real}$。

   **为何 sim 能拿 GT mask？** 评测时 **不需要 sim 像真**——**mask 来自 sim 渲染器 segmentation buffer**，**零人工成本**；**policy 输入的是合成图**，**物理仍在 sim 里算**。

2. **Texture matching**：对 **差异大** 的物体——真图 **分割 → 对齐 sim 位姿 → 纹理反投影** 到 mesh。
3. **机械臂**：从真视频 **多阶段取色**，**4 版 arm 颜色** 评测 **取平均**（Google Robot；Bridge **全黑臂** 可跳过）。

**Table III 视觉消融（Drawer 任务）启示**：**只做绿幕不做物体纹理**，或 **只做纹理不绿幕**，**可能不比 raw sim 更好**——**前景/背景不一致** 时 VLA **更困惑**。**全套 VisMatch** 才 **MMRV 最低**。

**Variant Aggregation（对照）**：**重度 domain randomization**（纹理/光照/干扰物）→ **多 variant 聚合成功率**——测 **鲁棒性**，但 **与真机单场景相关性更差**（Table I VarAgg **r=0.778**）。

**VarAgg 何时用？** 你想问 **「换桌布/光照策略还稳吗」**（Fig.6 distribution shift）；**不是** 问 **「哪个 checkpoint 更好」**——后者 **用 VisMatch**。

*所以这一节是想说：**绿幕+纹理** 是 **「cheap digital twin」** 的精髓，非 **全场景 photorealistic**。*

---

### 5.4 搭建 SIMPLER 环境（§V）

**引擎**：**SAPIEN**（§VI-D 证 **Isaac Sim 可复现** 结论）。

**两套真机协议**：

| Setup | 机器人 | 代表任务 |
|-------|--------|----------|
| **Google Robot** | RT 系论文标准台 | **Pick Coke Can**, **Move Near**, **Open/Close Drawer** |
| **WidowX BridgeV2** | Bridge 数据同款 | Spoon on towel, Stack cube, Put carrot on plate 等 |

**资产管线（逐步）**：

1. **常见物体**：Objaverse 下载 mesh → Blender **缩放到真机测量尺寸**；
2. **稀缺物体**：真物 **3D 扫描** 或 **单视图重建 API**（给参考图）；
3. **碰撞**：**CoACD** 凸包分解（sim **抓取/contact** 稳定）；
4. **铰链**：Drawer **cabinet 手工建 URDF/关节限位** + 纹理烘焙——**整条管线最耗人天**；
5. **物理参数**：金属/塑料 **密度** 查 GPT-4/网页；空罐 **标称质量÷体积** 得 **等效密度**；
6. **初始位姿**：按 **RT/Bridge 论文** 的 **xy 范围 + yaw 分布** 采样——**错 1 cm 成功率可差 20%+**。

**接口**：**一行 import + Gym API**；开源 **RT-1 / RT-1-X / Octo 推理脚本**。

*所以这一节是想说：环境是 **「评测用最小复刻」**，不是 **通用 RL 游乐场**。*

---

### 5.5 评测协议（§VI）

**考生（开源 VLA）**：

- **RT-1**：Begin / **15%** step / **Converged**（**同架构不同训练阶段** → 测 sim **能否分辨「有没有训够」**）
- **RT-1-X**, **RT-2-X**
- **Octo-Base**, **Octo-Small**（扩散头 **3 seed 平均**）

**Google Robot 三任务（Table I 核心）**：

- **Pick Coke Can**：**抓取刚性圆柱**——**contact-rich**，**SysID 敏感**（Fig.2）；
- **Move Near**：**推/挪物体靠近**——**非抓取成功判据**；
- **Drawer**：**铰链 articulation**——**视觉+动力学** 双难。

**流程**：每个任务 **paired sim & real** 同协议 **trial 数**（见 supplementary）；报告 **每 policy 成功率** → 算 **MMRV + r**。

**Bridge 任务（Fig.5）**：**除个别任务（light orange）外 rank 全对**；**Per-task MMRV 再平均**。

**两种 sim 模式**：

- **Visual Matching（主）**：**对齐真机单场景** → **高相关**；
- **Variant Aggregation**：**随机视觉变体均值** → **鲁棒性 stress test**。

*所以这一节是想说：论文 **主动报两种模式**，避免 **只报好看的那个**。*

---

### 5.6 行为模式评测（§VI-C，补充）

除 **scalar 成功率**，SIMPLER 还验证 **sim 能否复现 policy 的「行为曲线」**：

**Distribution shift（Fig.6）**：在 **Pick Coke Can + Move Near** 上，对 **背景/光照/干扰** 等 shift 因子 sweep；**RT-1 无增强 vs 有增强** 两条曲线在 **sim/real 同形状**——说明 sim **可用来预判「上线后遇 shift 会不会崩」**。

**Arm texture（Fig.7）**：只改 **机械臂纹理**，多 checkpoint **成功率跌幅** sim/real **同向**——解释 **为何 Google Robot 要 4 色 arm 平均**。

*所以这一节是想说：SIMPLER 既是 **排行榜**，也是 **VLA 灵敏度分析仪**。*

---

### 5.7 流程 ASCII

```
真机 demo 数据集 D
    → SysID: 模拟退火调 PD → 开环轨迹贴合
    → 资产: Objaverse/扫描 + CoACD + 铰链手工
    → Visual Matching: 绿幕 + 纹理烘焙
              │
    SIMPLER (SAPIEN) × Google Robot / WidowX tasks
              │
    跑 RT-1/Octo/... → R_sim  vs  论文 R_real
              │
    MMRV ↓ + Pearson r ↑  (目标: 排序一致)
```

*所以这一节是想说：**D → 控 → 视 → 评** 四步闭环。*

---

## 关键数字（What works）

### Table I：Google Robot 三任务平均（6 policies 排序）

| 评测协议 | MMRV ↓ | Pearson r ↑ |
|----------|--------|-------------|
| Validation MSE | **0.375** | **0.308** |
| SIMPLER-VarAgg | 0.143 | 0.778 |
| **SIMPLER-VisMatch** | **0.056** | **0.924** |

**分任务 VisMatch MMRV**：Pick Coke Can **0.031**；Move Near **0.111**；Drawer **0.027**。

**分任务 VisMatch r**：Pick **0.976**；Move **0.855**；Drawer **0.942**。

### 控制消融（Table II, Pick Coke Can）

SysID 最优：**Control Loss 0.131**，**MMRV 0.031**。

### 行为模式（§VI-C）

- **Distribution shift**（Fig.6）：SIMPLER **复现** 两版 RT-1 **对 shift 敏感度差异** + **数据增强效果**——**MMRV/Pearson 在「同 policy 不同 shift 因子」上仍可用**。
- **Arm texture sensitivity**（Fig.7）：**预测** 策略对 **机械臂换色** 的 **成功率跌幅**——**VisMatch 下 sim/real 曲线同形**。

### 与 Validation MSE 对比（Table I 解读）

| 若用 MSE 选 checkpoint | 后果 |
|------------------------|------|
| **MMRV 0.375** | **常把「真机弱但 MSE 低」选成最佳** |
| **Pearson 0.308** | **线性关系弱**，**无法信任 sim 分数做 early stopping** |

**VisMatch 平均 r=0.924** 意味着：**真机涨 10% 成功率，sim 约线性跟涨**——足够 **做 ablation 排序**；**Drawer 任务 r=0.942** 证明 **铰链场景也可对齐**。

*所以这一节是想说：**r=0.924** 是 **VisMatch+SysID 叠加之功**；**MSE 选模会被打脸**。*

---

## 实验结果说明了什么

1. **Sim eval 可行**：多 checkpoint **强弱关系** sim/real **高度一致**（Fig.4–5）。
2. **VisMatch > VarAgg**：强 DR **拉大视觉 gap**，**Octo 等视觉敏感策略** 在 VarAgg **失真**。
3. **MSE 不可靠**：validation **action MSE** 与真机 **几乎无关**——**别用 loss  alone 选 VLA**。
4. **SysID 必要**：PD 乱设 → **MMRV 0.07→0.10** 级恶化。
5. **视觉要「全套」**：Table III 消融——**仅绿幕或仅纹理** 可能 **不如 baseline**；**绿幕+物体纹理+arm 色** **才最佳**。
6. **跨 sim 引擎**：Isaac Sim **复现趋势**（§VI-D）——方法 **不绑 SAPIEN**。
7. **对社区**：OpenVLA 等后续 **默认报 SimplerEnv 分数** 成为可能。

8. **Bridge vs Google**：Fig.5 **WidowX** 上 **rank 几乎全对**——说明 **管线可迁移** 到 **第二套真机协议**（非 **只 overfit Google 桌**）。

9. **Behavior mode 而不只是 scalar**：Fig.6–7 证明 sim **不仅复现成功率**，还复现 **对 shift/纹理的敏感度曲线**——适合 **诊断「模型为何真机掉点」**。

*所以这一节是想说：实验 **证相关** 也 **证「该怎么建 sim」**（控+视缺一不可）。*

---

## 你应该懂的几个新词

- **Real-to-Sim Evaluation**：**真机训/测过的策略** 放到 **purpose-built sim** 里 **打分**（与 sim2real **反向**）。
- **VLA**：Vision-Language-Action，**图像+语言→动作**（RT-1、Octo、OpenVLA）。
- **SysID（系统辨识）**：用 **真实轨迹** 反推 **仿真 PD/摩擦** 参数。
- **Green screening**：**sim 前景 + 真机背景** 合成 **欺骗 VLA 眼睛**。
- **MMRV**：**错序惩罚 × 真机成功率差** 的平均最坏情况。
- **Proxy metric**：**便宜可复现** 的 **真机指标替身**。
- **Initial pose distribution**：物体 **初始位姿随机范围**——**成功率方差来源**。

*所以这一节是想说：读 **OpenVLA / π0 eval** 时会反复见 **SimplerEnv + MMRV**。*

---

## 它有什么搞不定的

1. **非数字孪生**：**绝对成功率** sim vs real **可有 gap**——只保证 **排序**。
2. **Drawer 等铰链**：**手工建模贵**——扩任务 **人力瓶颈**。
3. **只覆盖两套机器人**：Franka、UR **需新 SysID+资产** 管线。
4. **动态/接触极敏感任务**：sim **仍可能 rank 对但幅度偏**。
5. **Octo 随机头**：需 **多 seed 平均**——评测 **成本 ×3**。
6. **不能替代安全关键真机**：sim **通过** 后 **仍要 spot-check 真机**。
7. **策略过拟合 sim**：若 **针对 SIMPLER 调参**，可能 **real 相关性降**（论文 **未系统测对抗过拟合**）。

*所以这一节是想说：SIMPLER 是 **开发迭代 proxy**，不是 **部署签字**。*

---

## 它和别的几篇是什么关系

- **primer 链（Ch17 / Topic XI）**：Habitat / Isaac Gym（**sim 基建**）→ **SimplerEnv（VLA 真机对齐 eval）**。
- **被评考生**：[rt-1](rt-1.md)、[rt-2](rt-2.md)、[openvla](openvla.md)、Octo。
- **数据邻居**：[open-x-embodiment](open-x-embodiment.md)、[droid](droid.md) **训** VLA；SIMPLER **评** VLA。
- **并行 benchmark**：[robosuite](robosuite.md)、[rlbench](rlbench.md)、[meta-world](meta-world.md)——**通用 RL**；SIMPLER **RT/Bridge 专用对齐**。
- **引擎**：[sapien](sapien.md) 底层；[isaac-gym](isaac-gym.md) **训练向 GPU RL**。
- **Ch21**：与 **LIBERO/DROID 评测** 互补——SIMPLER **偏 RT 系 legacy 真机协议**。

*所以这一节是想说：SIMPLER 是 **2024 VLA 论文的「仿真驾考中心」**。*

---

## 和本导读的关系

对应 **[Ch17: Sim-to-Real](../guide/ch17-sim-to-real.md)** 末 **Real-to-Sim 评测** 与 **Ch21 数据集/评测** 语境。建议路径：

1. 先读 [rt-1](rt-1.md) **真机任务定义**（Pick/Move/Drawer）；
2. 读本笔记 §5.2–5.3（SysID + VisMatch）；
3. 跑 https://simpler-env.github.io **一行 import demo**；
4. 对照 Table I **理解 MMRV**；
5. Ch17 **Sim2Real 训练** vs 本文 **Real2Sim 评测** **勿混**。

*所以这一节是想说：Ch17 教 **怎么从 sim 走出来**；SimplerEnv 教 **怎么把真机搬回 sim 打分**。*

---

## 思考题

**Q1：为何 Pearson r 高还不够，要报 MMRV？**

<details>
<summary>提示</summary>

§III-B：非线性仍 **排序对** 时 r **惩罚**；**噪声级错序** vs **大 gap 错序** MMRV **能区分**。

</details>

**Q2：Validation MSE 为何 MMRV=0.375？**

<details>
<summary>提示</summary>

Table I：模仿学习 **低 MSE checkpoint** 真机 **未必成功**——**action 平均对 ≠ 接触成功**。

</details>

**Q3：绿幕为何只替换背景，不整个画面用真视频？**

<details>
<summary>提示</summary>

**前景物体/臂** 需 **sim 物理交互+GT mask**；背景 **静态** 最易 **inpainting**。

</details>

**Q4：VarAgg 什么时候更有用？**

<details>
<summary>提示</summary>

测 **策略对视觉 shift 鲁棒性**（Fig.6）；**不是** 替代 VisMatch **做 checkpoint 排序**。

</details>

**Q5：SysID 用的数据从哪来？**

<details>
<summary>提示</summary>

§IV-A：**现有开源 demo**（RT-1/Bridge）**开环 replay**——**无需新采真机**。

</details>

**Q6：Drawer 任务为何建模最贵？**

<details>
<summary>提示</summary>

§V：**articulated cabinet** **手工关节+纹理**——未来 **生成式 articulation** 可加速。

</details>

**Q7：Octo 为何要 3 seed 平均？**

<details>
<summary>提示</summary>

§VI：**扩散动作头随机**——降 **sim 评测方差** 才 **公平比 RT-1**。

</details>

**Q8：对你训 VLA，最该抄 SIMPLER 哪一步？**

<details>
<summary>提示</summary>

**改 checkpoint 前先在 SIMPLER-VisMatch 跑一轮**；**别只看 val MSE**。

</details>

---

## 一些好奇心问答（FAQ）

**Q：和 SAPIEN 什么关系？**

**A**：SIMPLER **建在 SAPIEN 上**；贡献是 **对齐流程+任务+指标**，非 **新物理引擎**。

**Q：能训策略吗？**

**A**：论文 focus **eval**；引擎 **也能 rollout**，但 **不是 RL 训练 benchmark**。

**Q：OpenVLA 分数能直接比 RT-1 吗？**

**A**：需 **同一 SIMPLER 任务协议+trial 数**；**跨论文** 比 **看原始 real 锚点**。

**Q：仓库入口？**

**A**：https://simpler-env.github.io — **Gym import + RT-1/Octo 推理脚本**。

**Q：和 LIBERO / DROID 评测比？**

**A**：LIBERO/DROID 偏 ** lifelong / 大规模真机数据** 基准；SIMPLER **专精 RT/Bridge 历史协议** 的 **sim-real 对齐**，**互补**。

**Q：论文机构？**

**A**：UCSD + Stanford + Berkeley + **Google DeepMind** 合作——**RT 真机锚点** 来自 **DeepMind RT 系**。

*所以这一节是想说：FAQ 覆盖 **引擎、训练/评测分工、与 LIBERO 区别、仓库**。*

---

## 如果你想再深入

1. **Table I 逐任务 scatter**（Fig.4）：**眼观 sim-real 线性**。
2. **Appendix C**：**Variant Aggregation** 随机化清单。
3. **SysID 代码**：**模拟退火 3 轮** 参数区间 **怎么缩**。
4. **对照 [libero](libero.md)**：**仿真 benchmark 设计哲学** 差异。
5. **自己 checkpoint**：**只加 SIMPLER 不改训练**，看 **MMRV 是否 <0.1**。

*所以这一节是想说：**跑一遍 Octo 脚本** 比读 **§IV 公式** 更懂工具。*

---

## 原文信息

```bibtex
@article{li2024simpler,
  title={Evaluating Real-World Robot Manipulation Policies in Simulation},
  author={Li, Xuanlin and Hsu, Kyle and Gu, Jiayuan and others},
  journal={arXiv preprint arXiv:2405.05941},
  year={2024}
}
```

- **arXiv**：https://arxiv.org/abs/2405.05941
- **Project**：https://simpler-env.github.io

*所以这一节是想说：cite **SIMPLER 套件**；代码库常称 **SimplerEnv**。*

---

## 架构一图（ASCII）

```
  RT/Bridge 真机 demo + 评测视频
           │
     SysID(PD) + 绿幕/纹理
           ▼
   SAPIEN: Google Robot / WidowX 任务
           │
   VLA policies (RT-1*, Octo, RT-2-X...)
           ▼
      R_sim  vs  R_real (paired)
           │
   VisMatch: MMRV=0.056, r=0.924 (avg)
   (vs MSE: MMRV=0.375, r=0.308)
```

*所以这一节是想说：一图串 **对齐→跑分→相关性**。*
