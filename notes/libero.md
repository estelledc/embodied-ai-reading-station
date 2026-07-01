---
title: "LIBERO"
slug: libero
topic: dataset-eval
difficulty: ⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2306.03310"
venue: NeurIPS
year: 2023
era: classic
num: 31
generated_at: 2026-07-01
---

# LIBERO：机器人终身学习的「四科体检卷」

> 零基础可读精读笔记。数字来自 arXiv:2306.03310 原文 Table 1–3。

## 一句话讲什么（TL;DR）

**LIBERO** 用 **Robosuite 程序化生成 130 个**语言条件桌面任务，拆成 **Spatial / Object / Goal / 100** 四套卷，每任务 **50 条**专家遥操作示范；系统评测 **终身学习（LLDM）** 中 **陈述性 vs 程序性知识** 迁移，并意外发现：**顺序微调（SeqL）前向迁移优于 EWC/ER/PackNet**，且 **LIBERO-90 预训练可能损害下游终身学习**。

*所以这一节是想说：LIBERO 既是 CL 基准，也是 2024+ **VLA 微调的事实考场**——但论文原始 setup 与社区用法不完全相同。*

---

## 这是个什么场景

家政机器人周一学会 **叠衣服**，周二学 **洗碗**，周三学 **整理书架**——结果洗碗那天叠衣服全忘了。这叫 **灾难性遗忘（catastrophic forgetting）**。

以前没有统一考卷：各家自己造任务、自己报 success rate，无法回答——

- 是 **记不住物体在哪**（陈述性/declarative）？
- 还是 **忘了怎么开抽屉**（程序性/procedural）？

**LIBERO**（LIfelong learning BEchmark on RObot manipulation）提供：

1. **四套题型** 分别考 **空间 / 物体 / 目标 / 混合长程**
2. **130 任务 × 50 demo** + 自然语言指令
3. **FWT / NBT / AUC** 指标量化 **前向迁移 vs 遗忘**

2024 年起 **OpenVLA、π₀、RDT-1B** 等把 LIBERO 当 **per-task 微调成功率** 标准卷——与原文 **顺序终身学习** 是 **同一任务定义、不同评估协议** 的「一卷两吃」。

**和 Split-CIFAR 的类比**：Split-CIFAR 按 **类顺序** 考分类遗忘；LIBERO 按 **操纵知识类型** 考 **declarative/procedural** 遗忘——是 **决策版** 的 split benchmark。

*所以这一节是想说：LIBERO 把「机器人会不会忘」拆成可诊断的知识类型，并开源到能一键跑 baseline。*

---

## 之前的人怎么做的，为什么不够好

- **Meta-World / RLBench / CALVIN**：强在多任务或语言长程，但 **不显式解耦** 空间/物体/目标三类知识，难定位遗忘原因。
- **ContinualWorld**：改 Meta-World 50 任务做 CL，但 **任务与日常活动、语言条件** 弱于 LIBERO。
- **Split-CIFAR 等 CL 经典集**：只有 **图像分类陈述性知识**，缺 **动作/程序性知识**。
- **真机大数据（OXE/DROID）**：训 VLA 强，但 **终身学习顺序协议 + 可控分布偏移** 难做干净 ablation。
- **各 VLA 自建 eval**：不可比；LIBERO 用 **固定 130 任务 + 50 demo** 成为 **横向标尺**。

**ContinualWorld / CORA 等**：把 Atari 或 Meta-World **改顺序评测**，但 **缺 LIBERO 级：Ego4D 启发的日常语言 + PDDL 目标 + 三套 controlled shift**。F-SIOL / OpenLORIS 偏 **视觉物体增量**，不是 **完整 manipulation LLDM**。

*所以这一节是想说：LIBERO 填补的是 **「决策 + 程序性知识 + 解耦 shift」** 的标准基准空白。*

---

## 这篇论文的新想法

**核心：把 LLDM（Lifelong Learning in Decision-Making）需要的知识拆成三类 controlled shift + 一套 entangled 长程卷。**

| Suite | 控制变量 | 知识类型 | 任务数 |
|-------|----------|----------|--------|
| **LIBERO-Spatial** | 同物体集，**碗的空间关系/位置**变 | 陈述性（空间） | **10** |
| **LIBERO-Object** | 同场景结构，**物体类别**变 | 陈述性（物体） | **10** |
| **LIBERO-Goal** | 同物体同布局，**目标谓词**变 | 程序性（行为） | **10** |
| **LIBERO-100** | 三者混合 + 长技能 |  entangled | **100** |

**LIBERO-100 再切分**：

- **LIBERO-90**：90 个短 horizon 任务 → 论文用于 **预训练（T5）**
- **LIBERO-Long**：10 个长 horizon 任务 → **下游终身学习评测**

**论文摘要四条「意外发现」**（Abstract）：① **架构设计与 CL 算法同等重要**；② **SeqL 前向迁移优于现有 CL 方法**；③ **语义 rich 语言 embedding ≈ Task-ID**；④ **朴素监督预训练可损害 LLDM**。

**五个研究主题（T1–T5）**：知识类型迁移、网络结构、CL 算法、**任务顺序鲁棒性**、**预训练是否有害/有益**。

**LLDM 与图像 CL 的差异（Introduction）**：图像 CL 主要迁移 **实体/概念**（陈述性）；操纵还需 **怎么做**（程序性）——例如会找 juice 但不会开 fridge，可能是 **两种知识分别遗忘**，LIBERO 四套件 **部分解耦** 这两类失败模式。

*所以这一节是想说：design 哲学是 **「程序化无限生成 + 固定 130 题 benchmark」** 双轨。*

---

## 它分几步做的（方法）

### 5.1 程序化任务生成管道（Section 4.1）

**三步流程（Fig. 2）**：

1. **行为模板 + 语言**：从 **Ego4D** 人类活动语料抽模板（如 "Open …"）→ 填仿真可用物体 → 自然语言指令（"Open the top drawer of the cabinet and put the bowl in it"）
2. **初始状态 $\mu_0$**：按指令选场景（厨房/桌面等）→ **PDDL** 描述 **物体类别、摆放、初始状态**（Fig. 2-A/B）
3. **目标 $g$**：PDDL **谓词合取**——一元 `Open(X)`、二元 `On(A,B)` / `In(A,B)`；全部谓词为真则 episode 成功

**平台**：**Robosuite** + **MuJoCo**；单臂 **Franka Panda** 桌面操作。

**输入→输出（生成一条任务）**：

- 输入：Ego4D 模板 + 物体库 + 场景类型
- 处理：PDDL 采样布局与目标
- 输出：**语言指令 + 可仿真执行的 MDP** $(\mu_0, g)$

*所以这一节是想说：任务不是手写的，是 **语言→PDDL→仿真** 可扩展管道。*

**PDDL 人话示例**：目标可能是 `On(bowl, plate) AND In(milk, basket)` 的合取——仿真器每步检查谓词真值，**全满足即 success**。这与 RL 稀疏奖励不同：**成功定义精确、可自动判分**，适合 benchmark。

**与 Ego4D 的连接**：Ego4D 提供 **3000+ 小时** 第一视角日常活动 + 语言；LIBERO 只取 **动词-宾语模板**（非视频到动作的 end-to-end），降低生成成本，但保证任务 **贴近人类活动分布**。

---

### 5.2 四套任务套件设计细节（Section 4.2）

**LIBERO-X（Spatial / Object / Goal 各 10 任务）**：

- **Spatial**：全是「把 **bowl** 放到 **plate** 上」，但有 **两个同款 bowl**，仅 **空间关系/位置** 不同 → 必须 **持续记新空间关系**
- **Object**：全是 pick-place，但 **每个任务不同物体** → 记 **新物体概念**
- **Goal**：**物体与空间固定**，仅 **目标谓词/指令** 变（如 open vs close drawer）→ 记 **新动作程序**

**为何 10 任务/suite？** 原文 footnote：足够观察 **catastrophic forgetting** 且 **算力可承受**。

**具体任务例子（Spatial）**：桌面有 **相同物体集**（bowl、plate、cabinet 等），指令形如 pick the **left/right/中间** bowl place on plate——变的是 **bowl 与 plate 的相对位姿**，不是 object set。

**具体任务例子（Goal）**：同一 cabinet + bowl 布局，任务 A 为 **open top drawer**，任务 B 为 **close drawer** 或 **put bowl in drawer**——**motor skill / goal predicate** 变，**视觉场景几乎不变**。

**LIBERO-100**：100 个日常操纵，**90 short + 10 long**；long 用于测 **entangled 知识 + 长程**。

*所以这一节是想说：三套 X 是 **controlled ablation**，100 是 **realistic 大杂烩**。*

---

### 5.3 示范数据采集

| 项目 | 规格 |
|------|------|
| 每任务轨迹 | **50** 条 |
| 采集方式 | 专家 **3Dconnexion Spacemouse** 遥操作 |
| 策略训练 | **Behavioral Cloning（BC）**，GMM 动作头 |
| 观测 | 图像 + 关节/gripper + **语言**（非 Markov → 用 $o_{\leq t}$ 历史） |

**数据格式**：开源 **HDF5** + 训练/评估脚本（https://libero-project.github.io）。

*所以这一节是想说：50 demo/task 是为 **sample-efficient BC** 研究 CL 算法，不是 RL 稀疏奖励。*

**Lifelong 问题形式化（Eq.1–2）**：顺序任务 $T^1,\dots,T^K$，每任务 $T^k=(\mu_0^k, g^k)$。学到 $T^k$ 时 **默认无法访问** $T^{1..k-1}$ 的完整数据（ER 例外：小 buffer）。优化 **平均 success**，训练用 **BC 负对数似然** 在每条 demo 上。Partial observability：状态 $s_t \equiv o_{\leq t}$，故 **必须时序模型**（RNN/Transformer）。

**演示内容**：每条 $\tau=(o_0,a_0,\dots,o_l)$ 含 **多模态 $o_t$**（相机、关节、夹爪）与 **连续动作** $a_t$；与 VLA 的 **离散 token 动作** 不同，LIBERO 原生 **连续控制 BC**。

---

### 5.4 策略架构（Section 4.4）

三种 **视觉-语言-时序** 策略（语言默认 **BERT embedding**）：

| 架构 | 视觉 | 时序 | 语言注入 |
|------|------|------|----------|
| **ResNet-RNN** | ResNet + **FiLM** | **LSTM** | FiLM + LSTM 输入 |
| **ResNet-T** | ResNet | **Transformer decoder** | 语言 token 与视觉 token 并列 |
| **ViT-T** | **ViT** | Transformer decoder | 语言进 ViT 与 decoder |

**输出**：每步 **GMM** 采样 **连续末端执行器动作**。

**输入→输出（单步控制）**：

1. 输入：当前/历史图像 + 任务语言 + proprio
2. 视觉 backbone → token 序列
3. 时序 backbone 融合
4. GMM head → 采样动作 → Robosuite 执行

*所以这一节是想说：架构对比是论文 **Table 1 核心**，Transformer 时序 **普遍强于 RNN**。*

---

### 5.5 终身学习算法（Section 4.3）

实现五类 baseline：

| 算法 | 类型 | 角色 |
|------|------|------|
| **SeqL** | 顺序微调 | **FWT 上界参考**（意外强） |
| **MTL** | 多任务同时训 | **性能上界**（不可部署但作对照） |

**训练资源（Appendix）**：单实验 **1× A100 或 A40**（CUDA 11.7）+ **16 CPU**——CL 全曲线 **比单 task VLA FT 更耗算力**。
| **ER** | Experience Replay | 记忆库回放 |
| **EWC** | 弹性权重巩固 | 正则防遗忘 |
| **PackNet** | 动态子网络 | 参数隔离 |

**设定**：学到任务 $T^k$ 时 **不能访问** 先前任务完整数据（ER 除外，存小 buffer）；目标最大化 **Eq.(1) 平均 success** 的 lifelong 目标，训练用 **Eq.(2) BC surrogate**。

*所以这一节是想说：算法实现覆盖 **记忆/正则/动态结构** 三类 CL 范式。*

**ER（Experience Replay）**：为每个旧任务存 **少量 trajectory** 进 buffer，学新任务时 **混合采样** 旧数据——**NBT 与 AUC 较稳**，LIBERO-Long 上 **优于 PackNet 的 FWT**（Table 2）。

**EWC**：对 **Fisher 重要权重** 加二次惩罚，防参数漂移——在 LLDM 上 **FWT/AUC 常低于 SeqL**（Spatial FWT 仅 **0.23** vs SeqL **0.72**）。

**PackNet**：每任务 **二值掩码** 隔离参数；**NBT 极低**（Goal 上 **0.06**）但 **FWT 受限**，Long 上 **AUC 0.25**。

**SeqL vs MTL**：SeqL 是 **下界式 naive 微调**（FWT 强）；MTL **同时见所有任务数据** 是 **性能上界**（不可在线部署但作对照）。

---

### 5.6 评估指标（Section 5.1）

记 $c_{i,j,e}$：学完前 $i-1$ 任务、在第 $i$ 任务训练 **$e$ epoch**（$e \in \{0,5,\dots,50\}$）后，在任务 $j$ 上的 **成功率**。

| 指标 | 含义 | 方向 |
|------|------|------|
| **FWT** | 新任务上学得多快（当前 task success 曲线面积） | ↑ |
| **NBT** | **负向后迁移** = 学新任务后旧任务掉多少 | ↓ |
| **AUC** | 综合 FWT + 保持旧任务 | ↑ |

**人话**：FWT 看 **学新快不快**，NBT 看 **忘旧忘多少**，AUC 看 **整体终身表现**。

*所以这一节是想说：LIBERO 用 **success rate** 而非 loss——操纵里 loss 与成功率常脱节。*

**Epoch 网格**：每任务训练 **50 epochs**，每 **5 epoch** 评一次 success → 共 **11 个 checkpoint**（0,5,…,50）。取 **最早达到最佳 success 的 epoch** $e_i^*$ 作为该任务「学完」时刻，再测 **旧任务** $j<i$ 的 $c_{i,j}$ 算 NBT——避免 **「训更久偶然回升」** 干扰遗忘度量。

**与经典 BWT 关系**：论文用 **NBT（negative backward transfer）** 命名；$c_{k,k}-c_{\tau,k}$ 越大 **忘得越狠**。

---

### 5.7 VLA 时代用法 vs 原文 setup（社区差异）

| 维度 | 原文 LLDM | 2024+ VLA 论文常见 |
|------|-----------|-------------------|
| 训练 | 顺序 10/100 任务 + CL 算法 | **单任务或少量 task** 微调 |
| 指标 | FWT / NBT / AUC | **单任务 success %** |
| 模型 | ResNet-T 等中小 BC | **OpenVLA / π₀** 等大 VLA |
| 数据 | 50 demo/task 全用 | 有时 **5-shot / 10-shot** |

**共享**：**同一 130 任务语言 + 仿真场景** → 仍可横向比 **Spatial vs Goal** 哪套更低分。

**OpenVLA 典型流程（社区，非原文）**：

1. 加载 **OXE/DROID 预训练** VLA
2. 对 LIBERO **每个 task** 取 **50 或 10** demo 微调
3. 在 **该 task 初始分布** 上 roll out **N 次** 报 success
4. **四套件分别平均** → 论文 Table 中的一行

**解读分差**：Spatial 低 → **空间/视觉 grounding** 弱；Object 低 → **新物体泛化** 弱；Goal 低 → **指令-行为对齐/程序性** 弱；Long 低 → **长程规划** 弱。

*所以这一节是想说：读 VLA 表时要知道 **「LIBERO 分数」多半是微调 eval，不是 SeqL 曲线**。*

---

### 5.9 预训练实验（Q6，Fig. 5）

**设置**：在 **LIBERO-Long** 10 任务上做 CL，对比 **from scratch** vs **先在 LIBERO-90 上 BC 50 epoch 预训练**（每 5 epoch 存 checkpoint，取 **验证最优** 权重）。

**组合**：3 架构 × 多种 CL 算法（与主实验一致）。

**发现**：**朴素监督预训练常降低** 下游 LLDM 的 **FWT/AUC**——可能因为 **90 任务分布与 Long 10 任务 mismatch**，或 **预训练权重陷入 short-horizon 局部最优**。

**对 VLA 启示**：**大规模 pretrain ≠ 终身学习友好**；需要 **continual-aware pretrain** 或 **任务分布对齐**——这与 π₀/OpenVLA「先 OXE 再 LIBERO FT」的 **两阶段** 实践相关但 **目标函数不同**。

*所以这一节是想说：LIBERO 不仅提供 **考卷**，还用 Fig. 5 **警告 naive pretrain**。*

---

### 5.10 流程 ASCII

```
Ego4D 模板 → 语言指令
      ↓ PDDL (μ₀, goal predicates)
Robosuite / MuJoCo / Franka
      ↓ Spacemouse ×50 demos/task
   BC + (ResNet-T | ViT-T | …)
      ↓ 顺序任务流 T¹…T^K
 ER / EWC / PackNet / SeqL / MTL
      ↓
  FWT, NBT, AUC
```

*所以这一节是想说：从 **生成** 到 **CL 评测** 全链路开源，复现门槛低于真机基准；硬件仅需 **仿真 GPU**，无需 Franka 真机。*

---

## 关键数字（What works）

### 规模

| 项目 | 数值 |
|------|------|
| 总任务 | **130** |
| LIBERO-X | **10+10+10 = 30** |
| LIBERO-100 | **100**（**90** short + **10** long） |
| Demo / task | **50** |
| 总 demo 量级 | **130 × 50 = 6500** 轨迹 |
| 遥操作设备 | **3Dconnexion Spacemouse** |
| 仿真引擎 | **MuJoCo** via **Robosuite** |

### Table 1：架构（ER / PackNet，节选 AUC↑）

| Suite | 最佳架构趋势 |
|-------|----------------|
| LIBERO-Spatial | ResNet-T **AUC 0.56**（ER） |
| LIBERO-Object | ViT-T **AUC 0.57**（ER） |
| LIBERO-Goal | PackNet+ResNet-T **AUC 0.75** |
| LIBERO-Long | ViT-T+PackNet **AUC 0.34** |

**ResNet-T vs ResNet-RNN**：Transformer 时序 **全面优于** LSTM（FWT/AUC 常 **2× 量级** 差距）。

**SeqL 的 NBT 代价（Table 2）**：Spatial 上 SeqL **NBT 0.81**、AUC 仅 **0.20**——**学新极快但忘旧极狠**；PackNet 同 suite **NBT 0.07**、AUC **0.63**，体现 **遗忘-迁移 trade-off**。

### Table 2：算法（固定 ResNet-T，节选）

| Suite | SeqL FWT | PackNet AUC | ER AUC |
|-------|----------|-------------|--------|
| LIBERO-Spatial | **0.72** | **0.63** | 0.56 |
| LIBERO-Object | **0.78** | **0.60** | 0.44 |
| LIBERO-Goal | **0.77** | **0.75** | 0.49 |
| LIBERO-Long | **0.54** | 0.25 | **0.32** |

**SeqL FWT 全 suite 最高**；**PackNet NBT 最低**（忘得少）但 **Long 上 FWT 差**。

### Table 3：语言 embedding（LIBERO-Long, ER, ResNet-T）

| Embedding | FWT | NBT | AUC |
|-----------|-----|-----|-----|
| BERT | 0.48 | 0.32 | 0.32 |
| CLIP | 0.52 | 0.34 | 0.35 |
| GPT-2 | 0.46 | 0.34 | 0.30 |
| Task-ID | 0.50 | 0.37 | 0.33 |

**无统计显著差异**——语义 rich 描述 **≈** "Task 5" ID。论文默认仍用 **BERT**，因 **维度 768** 与实现方便。

**Fig. 4 任务顺序**：五种 permutation 下 **PackNet 方差显著**——说明 **部署顺序不可控** 时，需 **order-robust CL** 仍为开放问题。

*所以这一节是想说：数字支撑 **「架构 > CL 算法（FWT）」「PackNet 防忘但不善 Long」「语言未用好」** 三条结论。*

---

## 实验结果说明了什么

1. **程序性 vs 陈述性可分开考**：Goal suite 测 **行为遗忘**，Spatial/Object 测 **概念/位置遗忘**——attention 可视化（Appendix E.4）显示遗忘模式不同。
2. **Transformer 时序 backbone 关键**：ResNet-T / ViT-T **碾压** ResNet-RNN。
3. **CL 算法伤 FWT**：SeqL **优于** ER/EWC/PackNet 的 **forward transfer**——经典 CL **防忘但阻学新**。
4. **PackNet 双面**：LIBERO-X 上 **NBT 极低**；**LIBERO-Long** 上容量不够 **FWT 崩**。
5. **EWC 常不如 SeqL**：正则 **阻碍** LLDM 表现。
6. **语言 embedding 未发挥语义**：需 **更好 task conditioning**（对 VLA 是机会）。
7. **任务顺序敏感**（Fig. 4）：PackNet 对 ordering **显著波动**。
8. **LIBERO-90 预训练可能有害**（Fig. 5）： naive BC 预训练 **损害** 后续 LLDM——与「大数据预训练万能」直觉相反。
9. **社区复用**：VLA 在 LIBERO 上 **per-task success** 高 ≠ 解决了 **NBT**；Goal/Spatial 分差仍 **诊断泛化短板**。

10. **ViT vs ResNet 依 suite 而异**：Object 上 **ViT-T** 强（物体多样性）；ER 下 **ResNet-T** 在 Spatial/Goal **常更好**——**没有万能视觉 backbone**（Table 1 讨论）。

11. **Attention 可视化（Appendix E.4）**：遗忘时 **saliency 从 task-relevant 物体 drift**——Goal suite 上 **行为相关区域** 遗忘模式与 Spatial **不同**，支持 **知识类型解耦有效**。

12. **对 benchmark 设计的启示**：Medical-style **分科体检**（Ch21 类比）——单独 **总 success** 会掩盖 **Goal 崩而 Spatial 仍高** 的 **选择性遗忘**，投稿时应 **分套件报告**。

*所以这一节是想说：LIBERO 的价值在 **诊断 + 反直觉结论**，不只提供一个高分数字。*

---

## 你应该懂的几个新词

- **LLDM**：Lifelong Learning in Decision-Making，顺序学操纵任务，含 **程序性+陈述性** 知识。
- **Declarative / Procedural knowledge**：「是什么/在哪」vs「怎么做」。
- **FWT / NBT / AUC**：前向迁移、负向后迁移、成功率曲线下面积。
- **SeqL**：Sequential finetuning，学新任务时 **直接微调同一网络**（最易忘但 FWT 高）。
- **PackNet**：给每个任务分配 **不同子网络掩码**，防遗忘占容量。
- **PDDL**：经典 AI 规划语言，LIBERO 用来 **写目标与初始状态**。
- **BC（Behavioral Cloning）**：监督模仿 $(o,a)$ 对。
- **Robosuite**：模块化 MuJoCo 操纵仿真框架，LIBERO **构建于其上**。

*所以这一节是想说：读 OpenVLA 的 LIBERO 表前，先分清 **success vs NBT**。*

---

## 它有什么搞不定的

1. **纯仿真**：MuJoCo 与真机 **gap** 大（Ch17 sim-to-real）；90% sim success 可能 **40–50% 真机**。
2. **单 embodiment 仿真 Franka**：不测 **跨真机** 迁移。
3. **10 任务/suite 规模小**：统计方差大，**需多 seed**（论文 3 seeds）。
4. **语言未真正用语义**：BERT 句向量 ≈ bag-of-words，**低估语言条件价值**。
5. **Spacemouse 专家 demo**：与 VR/Policy 人类分布不同；**50 条** 对极难长程仍少。
6. **VLA 社区用法偏离 LLDM**：大量论文 **只报 Spatial/Object**，回避 **Goal/Long**——基准被 ** cherry-pick** 风险。
7. **预训练结论反直觉但 setup 单一**：仅 LIBERO-90 BC 预训练，**不等价** VLA web-scale pretrain。

8. **算力仍不可忽视**：原文 **A100/A40** 单卡 + 16 CPU；130×50 demo 全训 **CL 曲线** 比 **单 task VLA FT** 贵一个数量级。

9. **成功谓词依赖仿真器**：PDDL 判据与 **真实物理误差** 无关——sim success **乐观**。

*所以这一节是想说：LIBERO 是 **尺子不是食材**——只在其上训 130 任务会 **过拟合考卷**。*

---

## 它和别的几篇是什么关系

- **基础设施**：**Robosuite**、**Ego4D**（任务模板）、**BERT**（任务 embedding）。
- **对照 CALVIN**：CALVIN **长程语言** ABCD 序列；LIBERO **知识类型解耦 + CL 指标**。
- **对照 Meta-World / ContinualWorld**：Meta-World **RL 多任务**；ContinualWorld **50 任务 CL** 无 LIBERO 级语言+PDDL 生成。
- **下游 OpenVLA / π₀ / RDT-1B**：几乎 **必报 LIBERO 四套件 success**。
- **后继 SimplerEnv**：真机对齐仿真；LIBERO 仍是最 **轻量 VLA eval** 之一。
- **数据线 OXE/DROID**：真机 **训练**；LIBERO **仿真考试**——互补。

**Ch21 踩坑提醒（guide §21.4.7）**：在 OXE 上训的 VLA **aggregate success 不可严格横向比**；**LIBERO 四套件** 是 **同协议下的尺子**。读 VLA 论文时若 **只报 LIBERO-Spatial 90%+** 却省略 Goal，应对照本笔记 **§5.7 社区差异** 理解作者意图。

*所以这一节是想说：LIBERO 在生态位上是 **VLA 微调标配 + CL 研究深井**。*

---

## 和本导读的关系

对应 **[Ch21: 数据集全景](../guide/ch21-datasets.md)** §21.4.5 **LIBERO**（语言条件 + 知识解耦 + 终身学习）。建议：

1. Ch21 §21.4 理解 **仿真基准 vs 真机数据集** 分工；
2. 读 `open-x-embodiment.md` / `droid.md`（训练数据从哪来）；
3. 读本笔记 §5.2 + §5.7（四套件 + VLA 用法差异）；
4. 读 `openvla.md` 对照 **社区 LIBERO 表**；
5. sim-to-real 问题见 **Ch17**；
6. 若做 CL 研究：复现 **Table 2 SeqL vs PackNet** 理解 **FWT–NBT trade-off**。

*所以这一节是想说：Ch21 把 LIBERO 放在 **「仿真考试」** 格，与 OXE/DROID **「真机食材」** 并列。*

---

## 思考题

**Q1：为何 Spatial 用「两个同款 bowl」而不是换 plate？**

<details>
<summary>提示</summary>

控制 **物体 identity**，只变 **空间关系**——纯测 spatial declarative knowledge。

</details>

**Q2：SeqL FWT 最高但 NBT 高，部署机器人敢用吗？**

<details>
<summary>提示</summary>

SeqL **学新快但忘旧多**；实际部署要 **AUC/NBT** 或 **回放/隔离**（PackNet/ER）。

</details>

**Q3：为何 VLA 论文爱报 Spatial/Object 少报 Goal？**

<details>
<summary>提示</summary>

Goal 测 **程序性** 遗忘，大 VLA **微调后 Goal 常更低**；Spatial 更易刷分。

</details>

**Q4：LIBERO-90 预训练为何害 Long？**

<details>
<summary>提示</summary>

Fig. 5；过拟合 short task 分布 + 后续 CL **负迁移**；需 **更好 pretrain 目标**。

</details>

**Q5：Task-ID 与 BERT 打平，对 VLA 设计何启示？**

<details>
<summary>提示</summary>

Table 3；当前 BC+embedding **没用 instruction 语义**——应用 **LLM/VLM 条件** 才可能拉开差距。

</details>

**Q6：PackNet 在 Goal 上 AUC 0.75 高，但 Long 上为何不行？**

<details>
<summary>提示</summary>

子网 **容量** 限制；Long 需 **更大共享表示**。

</details>

**Q7：若只有 10-shot demo，该用原文 CL 还是单任务 FT？**

<details>
<summary>提示</summary>

社区 VLA 走 **单任务 FT + success**；CL 算法需 **50 demo × 顺序流** 才有意义。

</details>

**Q8：PDDL 目标与语言指令不一致会怎样？**

<details>
<summary>提示</summary>

成功谓词由 PDDL 判定；语言只是 **条件输入**——仿真 **ground truth 在谓词**。训练时应保证 **语言与谓词一致**，否则 BC **标签噪声**。

</details>

---

## 一些好奇心问答（FAQ）

**Q：130 和 100 怎么算？**

**A**：**30**（X 三套）+ **100**（LIBERO-100）= **130**；100 内 **90+10** 为 pretrain/eval 切分。

**Q：LIBERO-Long 只有 10 个任务够吗？**

**A**：原文用作 **长程 entangled + 预训练 ablation**；算力有限下的 **stress test**，非覆盖所有长程家务。

**Q：和 RoboMimic 啥关系？**

**A**：不同基准；LIBERO **自研任务+CL**；RoboMimic **多算法实现库**。部分实验精神类似 **BC baseline**。

**Q：OpenVLA 在 LIBERO 上 90%+ 算解决了 CL 吗？**

**A**：**不算**。高 success 是 **per-task 微调** 结果；**未报告 NBT**——模型 **未顺序学 100 任务而不忘**。

**Q：HuggingFace 能下吗？**

**A**：官网 + 社区 mirror 提供 **demo HDF5**；具体链接以 https://libero-project.github.io 为准。

*所以这一节是想说：FAQ 澄清 **任务计数、Long 角色、与 VLA eval 关系**。*

---

## 如果你想再深入

1. **官网**：https://libero-project.github.io — 代码、数据、可视化。
2. **跑 baseline**：clone **Lifelong-Robot-Learning/LIBERO**，**ResNet-T + ER** 在 **LIBERO-Object** 复现 Table 1。
3. **对照读**：`notes/openvla.md` — VLA 如何 **改写评估协议**。
4. **Ch21 续**：`notes/simpler-env.md`（待精读）— 真机对齐版 eval。
5. **Appendix C**：每套件 **10 任务** 逐条语言与 PDDL 谓词。

6. **读 NeurIPS 2023 原版 Table 8**：MTL **上界** success——理解 **SeqL 与 MTL gap** 即 **CL 可改进空间**。

*所以这一节是想说：LIBERO **最适合边跑 baseline 边读 Table 1–3**。*

---

## 原文信息

```bibtex
@inproceedings{liu2023libero,
  title={LIBERO: Benchmarking Knowledge Transfer for Lifelong Robot Learning},
  author={Liu, Bo and Zhu, Yifeng and Gao, Chongkai and others},
  booktitle={Advances in Neural Information Processing Systems (NeurIPS)},
  year={2023},
  note={arXiv:2306.03310}
}
```

- **arXiv**：https://arxiv.org/abs/2306.03310
- **Project**：https://libero-project.github.io

*所以这一节是想说：引用 LIBERO 时注明 **suite 名称**（Spatial/Object/Goal/Long）与 **指标**（success vs FWT/NBT）。*

---

## 架构一图（ASCII）

```
        ┌─────────────────────────────────────┐
        │  Ego4D → 模板 → PDDL → Robosuite    │
        │  130 tasks × 50 demos × language    │
        └──────────────┬──────────────────────┘
                       │
     ┌─────────────────┼─────────────────┐
     ▼                 ▼                 ▼
 Spatial(10)     Object(10)        Goal(10)
 位置关系           新物体            新目标/程序
     └─────────────────┬─────────────────┘
                       ▼
              LIBERO-100 (90+10 Long)
                       │
           BC + ResNet-T / ViT-T
                       │
        SeqL / ER / EWC / PackNet / MTL
                       ▼
              FWT ↑   NBT ↓   AUC ↑
```

*所以这一节是想说：一图记住 **生成→四套件→CL 算法→三指标**；VLA 社区常 **跳过最后一行只报 success**，但完整理解 LIBERO 应 **同时看 Goal 套件与 NBT 曲线**。*

---
