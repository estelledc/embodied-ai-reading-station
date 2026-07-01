---
title: "DROID"
slug: droid
topic: dataset-eval
difficulty: ⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2403.12945"
venue: RSS
year: 2024
era: frontier
num: 34
generated_at: 2026-07-01
---

# DROID：统一 Franka 硬件下的「真世界」机器人 ImageNet

> 给零基础读者的精读笔记。数字来自 arXiv:2403.12945 原文与 Table I。

## 一句话讲什么（TL;DR）

**13 家机构、18 台同款 Franka** 在 **564 个真实场景**（厨房/办公室/宿舍等）遥操作采集 **7.6 万段**示范；用 **Diffusion Policy 50/50 共训** 后，新任务成功率比「只训本域数据」和「混 Open X-Embodiment」分别平均 **高约 22%（in-distribution）与 17%（OOD）**。

*所以这一节是想说：DROID 走 **硬件统一 × 场景极度多样** 路线，补 OXE「形态异质聚合」的另一条 scaling 轴。*

---

## 这是个什么场景

小孩若只在自家厨房练擦桌子，换到奶奶家、公司茶水间，灶台高度、光线、抹布颜色全变，往往就愣住——机器人长期如此：**训练像温室**，实验室里表现好，一出真实环境就崩。

**DROID**（Distributed Robot Interaction Dataset，分布式机器人交互数据集）像「全球 18 个家庭一起录做菜视频」：

- **硬件统一**：全是 **Franka Panda** + 同款相机 + VR 遥操作，动作/观测格式一致
- **场景 wild**：**52 栋楼、564 个 workspace**——北美/亚洲/欧洲，厨房、办公室、真住户家
- **任务自下而上**：采集员自由选场景与任务，事后用 GPT-4 整理 **86 类动词** 长尾

目标：证明 **「更像真实世界分布的数据」** 能否像 ImageNet 对 CV 那样，提升操纵策略 **泛化与鲁棒性**。

**与 LLM 数据 scaling 的平行**：GPT 靠 **Common Crawl 多样性** 学会泛化语言；机器人若只有 **单实验室桌面**，就像只读 **一种文体** 的书——DROID 试图提供 **多 building、多 continent、多 room type** 的「机器人 Common Crawl 雏形」，且 **动作标签精确**（真机 proprio + 控制指令），这是纯视频（如 Ego4D）难以替代的。

*所以这一节是想说：DROID 治的是 **场景/视角/物体分布太窄**，不是再发明一个新算法。*

---

## 之前的人怎么做的，为什么不够好

- **单实验室小数据**：RT-1、ACT、Diffusion Policy 多在 **1–3 个场景、几百～几千条** 轨迹上训，多样性受限。
- **仿真大规模**：Isaac / RoboSuite 量大有 **sim-to-real 鸿沟**。
- **OXE 异质聚合**：**22 形态、~311 场景**（聚合时），但 **硬件不统一**，动作空间需粗对齐，单场景仍偏少。
- **Bridge V2**：**60k 轨迹、24 场景、82 动词**，技能长尾好，但 **场景数仍远小于 DROID**。
- **RH20T**：**33 动词、7 桌面场景**，接触丰富但 **场景 realism 有限**。
- **工具采集 DobbE**：**216 场景** 但非真机臂、腕部视角受限。

**缺口**：要么 **硬件统一但场景单一**，要么 **场景多但形态杂**——没人把 **「同款 Franka + 500+ wild 场景 + 相机标定」** 推到 **7 万级** 并系统验 **co-training 增益**。

**DobbE 等 tool-based 路线**：用 **reach-grabber 工具** 采 **216 scene** 但 **非真机 kinematics**；迁移到臂上仍有 **形态 gap**。DROID 坚持 **真 Franka 轨迹**，换得 **动作可直接执行** 但 **采集成本更高**。

*所以这一节是想说：DROID 与 OXE **互补**——OXE 答「跨形态有没有用」，DROID 答「同形态 wild 场景有没有用」。*

---

## 这篇论文的新想法

**三个支点**：

1. **分布式同款硬件栈**：可搬运升降桌 + Franka + 三相机 + Quest 2，**13 机构 18 套** 复制，保证 **跨洲控制一致**（Polymetis，**15 Hz**）。
2. **协议促多样性**：约 **每 20 分钟换场景**；GUI **随机抽任务** 防只采简单物体；定期 **扰动光照/相机/ clutter**。
3. **用 SOTA Diffusion Policy 验数据价值**：不重造算法，**50/50 batch** 混 in-domain 与 DROID/OXE，公平对比 **数据本身**。

认知论与 LLM 时代一致：**generalizable policy 的第一瓶颈是数据分布**，不是缺一个 trick。论文 Discussion 亦指出：下一步需要 **更多 institutions、更多 scene types、更长 horizon 任务**——DROID 是 **scaling 曲线的数据侧首点**，而非终点。

*所以这一节是想说：DROID 的 novelty 是 **采集工程 + 多样性量化 + co-training 实证**。*

---

## 它分几步做的（方法）

### 5.1 DROID 机器人平台（III-A）

**硬件清单（全机构统一）**：

| 组件 | 型号/说明 |
|------|-----------|
| 机械臂 | **Franka Emika Panda 7-DoF** |
| 夹爪 | **Robotiq 2F-85** |
| 第三人称相机 ×2 | **ZED 2** 立体，三脚架可调 |
| 腕部相机 | **ZED Mini** 立体 |
| 遥操作 | **Meta Quest 2** 手柄控 **6D 位姿 + 连续夹爪** |
| 控制 | **Polymetis**，记录 **关节空间 + 末端空间** 动作 |
| 频率 | **15 Hz** |
| 载体 | **带轮升降桌**，单电源线，便于换场景/换楼 |

**计算**：Franka 控制箱 + NUC（Polymetis server）+ Alienware 笔记本（采集 GUI）。

**输入→输出（单次 episode）**：

- **输入**：操作员 VR 控臂 + 三相机 RGB（+ 深度）+ 机器人 proprio
- **处理**：阻抗跟随 + 同步录制 + GUI 任务/成功标记
- **输出**：一条 **successful trajectory**（另 **~16k** 条标为失败亦开源）

*所以这一节是想说：统一硬件是为 **免对齐训练**；便携是为 **564 场景 wild 采集**。*

**工程细节 — 为何选 Franka + Polymetis？** Franka 在北美/欧洲研究圈 **存量大**（13 机构多数已有），**阻抗控制** 适合 VR 遥操作「软跟随」；Polymetis 提供 **Python 友好、可远程同步** 的控制接口，使 **跨时区 18 套机** 能 rolling 同一软件版本。Robotiq 2F-85 夹爪 **行程与物体尺寸** 覆盖厨房/办公常见物体；ZED 系列给出 **硬件同步立体 RGB-D**，比单目 + 深度估计更利于 **几何一致** 的 wild 数据。

**动作空间双记录**：每条轨迹同时存 **关节角/速度** 与 **末端 6D + gripper**——下游可选 BC 空间，无需二次 FK/IK 转换。这与 OXE 的 **7D 粗对齐** 不同：DROID **原生统一** 在 Franka 栈上。

---

### 5.2 采集协议（III-B）

**流程**：

1. **换场景**：鼓励 clutter、多物体、多可采任务
2. **摆相机**：第三人称视角需 **看见操作区**；**外参标定**（OpenCV + 棋盘格）
3. **录入任务列表**：GUI 选预设或 **自由文本** 指令
4. **逐 episode**：GUI **随机抽任务**；定期 **scene augmentation**（推底座、挪相机、改光照、增减物体）
5. **换场景阈值**：通常 **≤100 条 / ~20 分钟** 即换下一 workspace

**人员**：**50 名**采集员，**12 个月**，**18 台**机器人。

**语言标注（后处理）**：**tasq.ai** 众包，每 episode **最多 3 条**独立自然语言指令。

**规模汇总**：

| 项目 | 数值 |
|------|------|
| 成功轨迹 | **76k** |
| 时长 | **~350 小时** |
| 场景 | **564**（**52** 栋楼） |
| 任务（动词） | **86** |
| 第三人称视角 unique | **1417**（含内外参） |

*所以这一节是想说：协议设计 **防偏置**（随机任务 + 短驻场景）是 diversity 的来源，不是事后清洗。*

**Scene augmentation 清单（原文 III-B）**：除换任务外，GUI 会周期性要求：（1）**轻推移动底座** 改变 robot-base 相对布局；（2）**挪动并重新标定** 第三人称相机；（3）**开关灯或拉窗帘** 改光照；（4）**增减 clutter 物体**。这些扰动 **刻意打破**「固定机位实验室」假设，直接贡献 **1417 viewpoints** 与 **interaction location** 覆盖（Fig. 3–4）。

**成功/失败标注**：采集员在 GUI 标记 episode 是否成功；**76k success** 用于主统计，**~16k fail** 仍随数据集发布——可用于研究 **失败模式分布**，但论文 co-train **排除 fail** 以防噪声标签。

**与 Bridge V2 采集哲学对比**：Bridge 强调 **低成本 WidowX + 单实验室扩展**；DROID 强调 **跨洲复制标准栈 + 短驻多 scene**。Bridge **动词长尾** 与 DROID 相当，但 **scene 数 24 vs 564** 是数量级差（Table I）。

---

### 5.3 多样性分析轴（Section IV）

论文沿 **5 轴** 对比 Bridge V2 / RT-1 / RH20T / OXE：

| 轴 | DROID 要点 | 对比结论 |
|----|-----------|----------|
| **Task** | GPT-4 去重 **动词** 长尾 | 仅 Bridge V2 动词长尾可比，但场景少 |
| **Object** | 语义解析 + 类别分布（Fig. 1 下） | 日常物体覆盖广 |
| **Scene** | **564** scenes，10 类 scene type（GPT-4V 标注） | **数量级 >** 其他真机大数据集 |
| **Viewpoint** | **1417** 第三人称视角 + **标定** | 固定机位数据集视角窄 |
| **Interaction location** | 首次 **gripper close** 的 3D 点分布 | 覆盖 **更大 workspace 体积**（非单一桌面带） |

**Scene 定义（重要）**：换 **房间/厨房角落/ substantially 新 workspace** 才算新 scene；**只换桌布或物体摆放** 不算。

**Task 定义**：用 **指令动词** 数（可扩展），而非人工枚举 task ID。

*所以这一节是想说：DROID 的「多样」是可 **量化轴**，不是 slogan——每轴都有 figure 支撑。*

**10 类 scene type（Fig. 2）**：含 **Kitchen、Bedroom、Office、Bathroom、Laboratory、Lobby、Dining、Garage、Store、Other** 等（以 Appendix C GPT-4V prompt 为准）。DROID 在 **Kitchen + Office** 外仍有 substantial **Bedroom/Bathroom** 等 home 场景——这是 prior tabletop 数据集少见的 **真实住户分布**。

**Verb 长尾解读（Fig. 1 上）**：纵轴 **对数刻度** 强调「有没有覆盖」而非「某动词 1000 vs 2000 条」；**pick/place/open/close** 等高频动词仍占 bulk，但 **wipe/pour/turn on** 等长尾对 **长程 policy**（Cook Lentils）至关重要。

**Interaction location（Fig. 4）**：以 **首次 gripper close** 的 3D 点可视化——DROID 点在 **base frame** 下 spread 到 **更高 z、更广 xy**，反映 **升降桌 + 非标准桌高**；对比 RT-1/Bridge 等 **窄桌面带**。

---

### 5.4 策略训练配方（V-A Policy）

**算法**：**Diffusion Policy**（Robomimic 实现），**非**新算法。

**输入**：

- 两路 **外部 RGB**（128×128，**ImageNet ResNet-50**）
- **DistilBERT** 语言 embedding（**冻结**）
- 机器人 **proprio**

**输出**：**绝对 EEF 平移/旋转 + 夹爪**；扩散头预测 **16 步动作序列**，部署 **open-loop 执行 8 步** 再 re-infer。

**Co-training 混合**：

| 方法 | Batch 构成 |
|------|------------|
| No Co-training | 100% in-domain demo |
| **DROID** | **50%** in-domain + **50%** DROID（排除失败轨迹） |
| **OXE** | **50%** in-domain + **50%** OXE（Octo mix，**去掉 Language Table 5%**） |

*所以这一节是想说：实验 **只改数据 mixture**，Diffusion Policy 架构全程固定。*

**网络结构（输入→输出链）**：

1. 两路 128×128 RGB → **ResNet-50**（ImageNet 预训练）→ 视觉 embedding
2. 语言指令 → **DistilBERT**（冻结）→ 文本 embedding
3. 拼接 **proprio** → MLP 融合
4. 融合特征 → **U-Net diffusion head** → 去噪得到 **16 步** $(T_{ee}, R_{ee}, gripper)$ 轨迹
5. 环境执行 **前 8 步** open-loop → 重新观测 → 循环

**为何不用 RT-2-X 55B？** 论文定位是 **dataset paper**；Diffusion Policy 是 **Robomimic 生态成熟、社区易复现** 的 SOTA IL 基线。用大 VLA 会混淆 **数据 vs 架构** 贡献——后续 OpenVLA 等工作用 DROID **放大到 VLA 规模**。

**OXE mix 细节**：采用 **Octo Team curated split**（prior work 验证有效）；**移除 Language Table**（占 Octo mix **5%**）因 **重复 scene layout + 任务** 且 **raw size 过大** 拖慢 infra——这一取舍说明 **大数据 co-train 也要 curation**，非无脑全喂。

---

### 5.5 评测任务与 OOD 设计（V-A Tasks）

**6 任务 × 4 地点**（Fig. 5），均用 **DROID 硬件** 评测：

| 任务 | 设定 | Demo 数 | OOD 扰动 |
|------|------|---------|----------|
| Close Waffle Maker | 实验室 | 70 | 加干扰物 |
| Place Chips on Plate | 实验室 | 50 | 换芯片袋 / 更多干扰 |
| Put Apple in Pot | 实验室 | 60 | 加干扰盘 |
| Toasting | 实验室 | 150 | **新物体**进烤箱 |
| Clean up Desk | 办公室 | 50 | 桌上/抽屉内干扰物 |
| Cook Lentils | **真厨房** | 50 | 干扰物 + **相机 shift** |

每设置 **10 rollouts** A/B 对比；分 **in-distribution**（位置噪声）与 **OOD** 两档。

*所以这一节是想说：评测刻意覆盖 **短/中/长 horizon** 与 **lab→office→home**。*

**Rollout 协议**：每 (task, method, ID/OOD) **10 次** rollout；报告 **平均成功率 ± 标准误**（Fig. 6）。**In-distribution** 仅对 **初始 robot/object 位姿加噪声**，不改变物体 identity；**OOD** 按上表 **加 distractor / 换 object / 相机 shift**。

**定性观察（Fig. 7, V-B）**：

- **Close Waffle Maker OOD**：仅 DROID co-train ** consistently 伸向 waffle maker**；no co-train / OXE 常被 clutter **吸引注意力**
- **Cook Lentils**：baseline **1–2 步失败**（如未揭盖、未倒豆）；DROID co-train **完成揭盖→倒豆→开火** 全流程，动作 **更平滑**

**与 OXE emergent skills 实验对照**：OXE 测 **跨 embodiment 新技能**；DROID 测 **同 Franka 新 scene/OOD**——二者 **正交**，现代 foundation model 常 **同时需要**。

---

### 5.6 场景多样性消融（V-C）

控制 **7k 轨迹** 规模：

- **DROID (7k, 20 Scenes)**：选 demo 最多的 **20 个 scene**，共 **7362** 条
- **DROID (7k, Diverse Scenes)**：**均匀随机 7362** 条，保留高 scene diversity

同样 **50/50 co-training**。**Diverse Scenes** 在 **OOD** 上 consistently 优于 **20 Scenes**；**全量 DROID** ≥ 子采样。

*所以这一节是想说：增益不只来自 **条数**，**564 scene 的覆盖** 是独立因素。*

**Fig. 8 三任务 OOD 对比（原文 V-C）**：在 **Waffle Maker / Chips on Plate / Cook Lentils** 的 OOD 设置下，**Diverse 7k** 成功率 **高于 20-scene 7k**；且 **Full DROID 76k** 在多数 task 上 **≥ Diverse 7k**——暗示 **规模 + diversity 双驱动**，非仅其一。

---

### 5.7 数据流 ASCII

```
13 institutions × 18 Franka stacks
        │ VR teleop + 3× stereo RGB-D + calib
        ▼
76k success (+16k fail) trajectories
        │ crowdsourced lang ×3
        ▼
Co-train Diffusion Policy (50/50)
        │
   ┌────┴────┬──────────┐
   ▼         ▼          ▼
In-domain  +DROID    +OXE
only       (ours)    (baseline)
        ▼
6 tasks × ID/OOD × 10 rollouts
```

*所以这一节是想说：pipeline 从 **硬件复制** 到 **batch 混合** 全开源（CC BY 4.0）。*

---

## 关键数字（What works）

### 数据集（Table I 与正文）

| 项目 | DROID | Bridge V2 | OXE（聚合） |
|------|-------|-----------|-------------|
| 轨迹 | **76k** | 60.1k | **1.4M** |
| 动词/任务 | **86** | 82 | 217 |
| 场景 | **564** | 24 | ~311 |
| 语言指令 | ✓ | ✓ | (部分) |
| 相机标定 | **✓** | ✗ | ✗ |
| 公开机器人 | ✓ | ✓ | (混合) |

### Co-training 主结果（Fig. 6）

| 对比 | In-distribution | Out-of-distribution |
|------|-----------------|---------------------|
| DROID vs 次优（OXE co-train） | **+22%** 绝对成功率（跨任务平均） | **+17%** |
| 定性 | 动作 **更平滑精确** | **Cook Lentils** 等长程 **唯一稳定完成三步** |

### 其他

| 项目 | 数值 |
|------|------|
| 控制频率 | **15 Hz** |
| 扩散 chunk | **16** 步，执行 **8** 步 open-loop |
| 采集周期 | **12 个月** |
| 机构 | **13**（**18** 实验室参与叙事，**18** robots） |

**Table I 定位**：DROID 在 **#Scenes（564）** 与 **Cam. Calibration** 列 **唯一双高**；轨迹数 **小于 OXE 1.4M** 但 **单 embodiment 真机 wild 场景密度** 最高——这是与 OXE **互补** 而非 **替代** 的表格证据。

*所以这一节是想说：DROID **轨迹数不是最大**，但 **scene/viewpoint/calib** 组合在 Table I 中独特。*

---

## 实验结果说明了什么

1. **Wild scene co-training 有效**：同算法、同 in-domain 数据，**+DROID** 系统性胜过 **only** 与 **+OXE**。
2. **OOD 增益更大**：No co-training 在 OOD **几乎崩**；DROID co-train **最稳**——数据 diversity 直接对应 **鲁棒性**。
3. **OXE 不能替代 DROID**：OXE 更大但 **单 scene 仍少、无统一标定**；操纵 **3D 几何与视角** 需要 DROID 式 coverage。
4. **Scene diversity 可 ablate**：同 **7k 条**，**564 scene 采样 > 20 scene 大户**——说明 **不是简单堆轨迹**。
5. **长程 kitchen 任务是试金石**：**Cook Lentils** 上 baseline **1–2 步就失败**，DROID co-train **能完成全流程**（Fig. 7）。
6. **与导航/自驾类比成立**：操纵领域 first step toward **in-the-wild generalization** 类似 KITTI / 自驾 wild 数据路线。

7. **Camera calibration 是隐藏资产**：多数 prior 数据集 **无 per-scene 外参**；DROID 使 **multi-view 3D / stereo** 研究可直接在 **wild** 上开展，价值可能超出 BC 本身。

8. **Language ×3 标注**：三条独立 crowdsourced 指令支持 **language-conditioned** 策略与 **caption diversity** 研究，而非单一 templated 句。

*所以这一节是想说：实验回答「DROID 值得混训吗」为 **值得**，且 **场景多样性是机制之一**。*

---

## 你应该懂的几个新词

- **Teleoperation（遥操作）**：人用 VR/手柄实时控臂，录 $(o,a)$ 示范。
- **In-the-wild**：非实验室布景的真实建筑环境采集。
- **Co-training**：in-domain 与大数据 **同一训练阶段 50/50 混 batch**（非先预训再微调）。
- **Diffusion Policy**：用扩散模型生成 **动作轨迹**；DROID 实验的固定 backbone。
- **OOD（Out-of-distribution）**：测试时加 **训练未见干扰物/物体/相机 shift**。
- **Polymetis**：Franka 的 **开源实时控制栈**，DROID 跨机构复现关键。
- **Extrinsic calibration（外参标定）**：相机相对机器人/base 的位姿——DROID **逐 scene 标定**，利于 3D 感知研究。

*所以这一节是想说：读 DROID 后应能解释为何 OpenVLA/π₀ **把 DROID 列为预训练源**。*

---

## 它有什么搞不定的

1. **单一 embodiment**：全是 **Franka**——不能替代 OXE 的 **跨形态** 问题。
2. **遥操作成本**：**350 小时 × 50 人** 量级，扩展仍贵；无互联网式 **零边际成本** 爬取。
3. **失败轨迹占 ~16k**：开源但未计入 76k；如何利用 **失败数据** 原文未系统实验。
4. **Co-training 配方单一**：仅 **50/50**；最优比例、curriculum **未网格搜索**。
5. **任务定义依赖 NLP**：动词/物体由 **GPT-4 解析**，与人工 task ID **不完全可比**。
6. **未训 VLA 级基础模型**：实验是 **Diffusion Policy**，非 RT-2-X 规模；DROID 对 **55B VLA** 的 scaling law **留待后续**（OpenVLA 等已部分回答）。
7. **安全与可重复性**：wild 场景 **难严格复现** 同一 kitchen layout。

8. **地理与文化偏差**：13 机构主要在 **北美/东亚/欧洲** 城市建筑；发展中国家 home layout、物体 **覆盖未知**。

9. **仅 manipulation fixed-base**：无 **mobile manipulator** 大规模 wild 数据——与 whole-home 机器人愿景仍有距离。

*所以这一节是想说：DROID 是 **操纵数据里程碑**，不是「下载就 AGI」的终局。*

---

## 它和别的几篇是什么关系

- **对照 OXE**：OXE **异质 22 形态**；DROID **同质 564 场景**——现代 VLA 常 **两者混用**（如 π₀ mixture）。
- **承接 Bridge V2**：Bridge 是 **UCB 低成本 widows**；DROID 是 **标准化 Franka wild**；Bridge 亦在 OXE 内。
- **下游 OpenVLA / Octo / π₀**：DROID 列为 **关键 co-pretrain 源**；Octo 的 OXE mix **去掉 Language Table** 的决策即受 DROID 对比启发。
- **算法侧 Diffusion Policy**：DROID **选用 DP 验数据**；算法创新在 `diffusion-policy.md`，数据创新在本文。
- **Mobile ALOHA 路线对照**：ALOHA **小数据高质量**；DROID **大数据标准硬件**——2024 真机数据 **两条互补路径**。
- **RH20T**：RH20T **接触/多模态**  rich；DROID **scene/type 覆盖** 更广。

**在 Ch21 数据生态中的位置**：若 OXE 是 **breadth across embodiments**，DROID 是 **depth across scenes for one embodiment**；OpenVLA 训练 mix 常同时引用二者，形成 **「异质规模 + 同质 wild」** 双支柱。读 `pi0.md` 时注意到 π₀ mixture **OXE 仅占 9.1%** 而 **私有 dexterous 为主**——DROID 是社区可复现的 **wild 部分** 的重要组成。

*所以这一节是想说：读 Ch21 应 **OXE + DROID 成对读**，才完整理解「2024 数据 scaling」。*

---

## 和本导读的关系

对应 **[Ch21: 数据集全景](../guide/ch21-datasets.md)** §21.3 **DROID**（统一硬件的极端场景多样性）。建议：

1. 先读 `open-x-embodiment.md`（异质聚合）；
2. 再读本笔记 §5.1–5.3（硬件与 wild 协议）；
3. 读 `bridgedata-v2.md` 理解 **动词长尾 vs 场景数** 权衡；
4. 读 `openvla.md` 看 DROID 如何进入 **VLA 预训练 mix**。

*所以这一节是想说：Ch21 把 DROID 放在 **「真机 wild 场景 scaling」** 支线上。*

---

## 思考题

**Q1：为何 DROID 坚持 Franka 统一，而 OXE 保留 22 形态？**

<details>
<summary>提示</summary>

DROID 赌 **scene/viewpoint diversity**；OXE 赌 **cross-embodiment transfer**——问题分解不同。

</details>

**Q2：50/50 co-training 会不会「冲掉」小 in-domain 数据集？**

<details>
<summary>提示</summary>

论文发现 **仍显著增益**；但最优比例未知——想微调时这是首要 ablation。

</details>

**Q3：1417 视角 + 外参标定对哪类下游算法价值最大？**

<details>
<summary>提示</summary>

3D 感知、立体深度、geometric reasoning；固定机位数据集学不到。

</details>

**Q4：为何 OXE co-train 输给 DROID，尽管 OXE 更大？**

<details>
<summary>提示</summary>

Table I scene 数、相机标定、操纵 workspace 覆盖；「大」不等于「wild」。

</details>

**Q5：20 scenes vs diverse 7k 消融说明什么？**

<details>
<summary>提示</summary>

同轨迹数下 **scene coverage** 驱动 OOD；堆同一厨房 7000 条 ≠ wild。

</details>

**Q6：Cook Lentils 为何是最好 stress test？**

<details>
<summary>提示</summary>

长 horizon + 真厨房 + OOD 干扰 + 相机 shift；短 pick-place 掩蔽 baseline 差距。

</details>

**Q7：若你只有 50 条新任务 demo，最省力的 DROID 用法？**

<details>
<summary>提示</summary>

论文 recipe：**50/50 Diffusion Policy co-train** + 排除 DROID 失败轨迹；先复现 Fig. 6 协议。若算力有限，可先 **filter 与目标任务 scene type 相近** 的 DROID 子集（如 kitchen）再混训，原文未系统 ablation 但符合 diversity 直觉。

</details>

**Q8：15 Hz 控制是否限制 fast manipulation？**

<details>
<summary>提示</summary>

低于 π₀ 50 Hz dexterous；DROID 面向 **general pick-place / articulation** 而非高频叠衣。频率是 **数据与平台权衡**，非论文主要 claim。

</details>

---

## 一些好奇心问答（FAQ）

**Q：76k 和 350 小时怎么换算？**

**A**：平均每轨迹 **~16–17 秒**有效交互（350h ≈ 1.26M 秒 / 76k）；长程 task 单条更长，短 task 更短。

**Q：失败 16k 条能用来训吗？**

**A**：数据集中 **标注 release**，但主实验 **只用 success**；失败数据可用于 **对比学习/RL** 等，论文未展开。

**Q：DROID 和 OXE 选哪个训 OpenVLA？**

**A**：OpenVLA 等通常 **两者都混**；单选时 OXE **量大跨形态**，DROID **wild 几何/视角**——互补而非替代。

**Q：DROID 表格里 13 机构 vs 18 实验室？**

**A**：正文写 **13 institutions** 部署 **18 robot units**（部分机构多台）；**50 collectors** 跨这些站点——以 **Table I 与 Section III** 为准，不必强行统一为一个数字。

**Q：能否用 DROID 预训练再 OXE 微调？**

**A**：论文 **未测** 此顺序；逻辑上 **先 wild Franka 再 cross-embodiment** 可能互补，但 compute 与 alignment 成本需自行 ablation。

*所以这一节是想说：FAQ 聚焦 **与 OXE 分工、co-train 用法、场景定义** 三个易混点。*

---

## 如果你想再深入

1. **官网 + 可视化**：https://droid-dataset.github.io — 交互浏览 564 scenes。
2. **硬件复现指南**：同站 **Hardware Setup** — 13 机构验证过的 BOM 与 Polymetis 栈。
3. **先修**：`notes/diffusion-policy.md` — 理解 co-train 用的 backbone。
4. **对照**：`notes/open-x-embodiment.md` — 异质 vs 同质路线。
5. **下游**：`notes/openvla.md` — DROID 进入 **开源 VLA** 的实际 mix 比例。

6. **视频**：官网 supplementary **rollout 对比**（DROID co-train vs OXE vs none）——Fig. 7 静态图的最佳补充，建议先看 **Cook Lentils OOD** 再读 Method。

*所以这一节是想说：DROID 最适合 **浏览可视化 + 跑 Robomimic co-train + 看 rollout 视频** 三线入门。*

---

## 原文信息

```bibtex
@article{khazatsky2024droid,
  title={DROID: A Large-Scale In-The-Wild Robot Manipulation Dataset},
  author={Khazatsky, Alexander and Pertsch, Karl and others},
  journal={Robotics: Science and Systems (RSS)},
  year={2024},
  note={arXiv:2403.12945}
}
```

- **arXiv**：https://arxiv.org/abs/2403.12945
- **数据集**：https://droid-dataset.github.io
- **License**：**CC BY 4.0**

*所以这一节是想说：DROID 开源 **数据 + 训练代码 + checkpoint + 硬件指南**，是可复现性高于平均的 dataset paper。*

---

## 架构一图（ASCII）

```
   ┌──────────────────────────────────────────┐
   │  DROID: 18× Franka @ 564 scenes (wild)  │
   │  76k traj · 1417 views · calib · lang×3  │
   └────────────────────┬─────────────────────┘
                        │ 50/50 batch mix
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
     In-domain     + DROID       + OXE
     only          (+22% ID)     (次优)
                        │
                        ▼
              Diffusion Policy → 6 tasks
              ID / OOD · lab / office / home
```

*所以这一节是想说：一张图记住 **统一 Franka wild 数据 → co-train → 超 OXE 的 ID/OOD 增益**。*
