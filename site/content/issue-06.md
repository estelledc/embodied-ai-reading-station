---
title: "Issue Nº 06 — Bodies that learn"
order: 105
intro: '第六期 · 硬件视角看 VLA · humanoid / legged / dexterous / wearable'
issue_number: VI
issue_date: 2026 · Summer
---

## 编辑前言

前五期都在讲软件——VLA 模型、扩散策略、世界模型、多模态对齐。

但具身 AI 之所以叫"具身"，是因为它有**身体**。这一期我们换个视角：156 篇里，**机器人本体设计**这条线一直被低估。从 ALOHA 双臂到 HumanPlus 全身，从 ANYmal 四足到 RF-Pose 穿墙感知——硬件才是把"AI"和"现实物理"连起来的那座桥。

## 双臂 manipulation 的硬件革命

### [ALOHA → ALOHA 2 → Mobile ALOHA](/papers/act-aloha/)

斯坦福 2023 一份"双臂遥操作平台 + 数据集 + 模型"的全套开源工作。
- **ALOHA**：2 个 leader 机器臂（人手控制）+ 2 个 follower 机器臂（执行）
- **ALOHA 2**：耐久性升级，30+ 小时连续作业
- **Mobile ALOHA**：装到带轮子的底座上，能跑厨房做饭

**为什么重要**：在 ALOHA 之前，所有机器人 manipulation 数据要么用 Spacemouse（不直观），要么用 VR controller（贵且笨）。ALOHA 把"教机器人做事"的成本降到本科生实验室水平。

### [UMI](/papers/umi/) · 手持夹爪 + GoPro 走野外

CMU 2024 的极简设计：一只手持式夹爪，配一个 GoPro。研究员拿着它在自家厨房演示开抽屉、削苹果——**机器人不在场**。回实验室回放 GoPro 视频 + 夹爪轨迹，机器人在仿真里学。

**为什么重要**：野外数据不再需要带机器人出去。

### [DexCap](/papers/dexcap/) · 灵巧手动捕

把人手戴上 12 个 IMU + 多个相机，捕捉精细五指动作。机器人 dexterous hand 直接抄。

## 全身人形：HumanPlus 的捷径

### [HumanPlus](/papers/humanplus/)

斯坦福 2024，让人形机器人**实时影子模仿**人类全身动作。穿戴动捕服，机器人同步走、挥手、叠衣服。

**核心创新**：不是离线训练再部署，而是 online retargeting + 强化学习微调，几小时内就能学会新技能。

## 四足腿式：从 ANYmal 到 Daydreamer

### [ANYmal](/papers/anymal/) · 工业级四足

苏黎世联邦理工 ETH 2016 起步，2020 商业化。山地巡检、地下勘探都在用。

### [Daydreamer](/papers/daydreamer/)

把 [Dreamer V2](/papers/dreamer-v2/) 直接搬到真四足机器人上。**1 小时内学会走路**，不用仿真预训练。世界模型自己脑补样本。

## 触觉作为新感官

### [Sparsh / Sparsh-X](/papers/sparsh/)

Meta 2024。触觉传感器（DIGIT/GelSight）从来没有像 CLIP 那样的基础模型。Sparsh 把触觉视为"新模态"，自监督训练出第一个 tactile foundation model。

### [Tactile-VLA / TLA](/papers/tactile-vla/)

把触觉信号注入 VLA 决策——力反馈一旦感知到"打滑"，VLA 立即调整握紧力度。一年内出现的多篇 tactile + language 工作显示这条赛道正在爆发。

## 射频感知：穿墙 + 抗烟雾

普通摄像头怕黑、怕烟、怕遮挡。射频不怕。

### [RF-Pose Through Wall](/papers/rf-pose-through-wall/) · MIT

WiFi 信号穿墙重建人体 15 关节骨架。

### [milliMap](/papers/millimap/) · CMU

毫米波雷达画出室内 SLAM 地图，烟里也能用。

### [PanoRadar](/papers/panoradar/)

旋转 mmWave 做到 LiDAR 级 3D 成像，但价格 1/10。

## Wearable 趋势：硬件越来越小

### [Argus mmEgo](/papers/argus-mmego/)

把 mmWave 雷达塞进可穿戴设备，重建第一人称身体网格。家里没装 LiDAR 也能做 motion capture。

### [Wave-Former](/papers/wave-former/)

mmWave 重建被完全遮挡的日常物体形状（看不见的桌下、柜里）。

## 趋势观察

读完这些硬件论文你会发现两个清晰的方向：

1. **遥操作越做越便宜**：ALOHA → UMI → DexCap 一路降成本，目标是"任何人都能采数据"
2. **被动感知越做越敏锐**：Sparsh 触觉 / RF 系列穿透 / Wearable 微型化——感知端在补 VLA 的眼睛之外的"其他感官"

如果说前 5 期讲的是"机器人怎么思考"，第 6 期就是讲"机器人长什么样、怎么感受世界"。**硬件不是 VLA 的附庸，硬件是 VLA 的物理边界。**

## 编后语

下一期可能聚焦"训练数据"——OXE / DROID / BridgeData 这一线，看看具身 AI 这一年的"数据炼狱"究竟克服了什么、还有什么没解。

如果你在做 robotics 创业、或选 PhD 方向，这一期的 14 篇是必读。

---

*◼ End of Issue Nº VI.*
