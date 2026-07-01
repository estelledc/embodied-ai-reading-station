---
title: "Universal Manipulation Interface"
slug: umi
topic: imitation
difficulty: ⭐⭐⭐
status: deep-read
task: optional
来源: "https://arxiv.org/abs/2402.10329"
venue: RSS
year: 2024
era: frontier
num: 62
generated_at: 2026-07-01
---

# UMI：给人类一只机器人手，野外示范直接变策略

> 这是一份给"完全没接触过 AI / 机器人"的读者写的精读笔记。所有专业词第一次出现都会解释清楚，并用生活场景打比方。

## 一句话讲什么（TL;DR）

做一个和机器人末端**一模一样**的手持夹爪 + GoPro（约 371 美元），人去厨房、咖啡馆随便示范；视频经视觉-惯性 SLAM 还原 6D 轨迹，再训 Diffusion Policy——**机器人不在场也能采数据**，洗碗、抛球、叠毛衣、摆咖啡杯都能零样本泛化到新环境，分布外测试综合成功率约 **72%**。

*所以这一节是想说：UMI 用"硬件镜像 + 相对轨迹 + 延迟对齐"把野外人类示范变成可部署机器人策略，是 2024 年数据采集范式的重要转折。*

---

## 这是个什么场景

你想教家里的机器人洗碗。传统做法是：

- **遥操作（teleoperation）**：人坐在实验室里用 SpaceMouse 遥控 UR5——机器人必须在场，采一条数据要搬机器、防碰撞、复位，15 分钟可能采不到几条有效示范。
- **看 YouTube 学**：数据海量，但人手 5 指、机器人 2 爪，**实体差距（embodiment gap）** 巨大，且视频里没有精确的夹爪开合和力。

UMI（Universal Manipulation Interface，通用操作接口）走第三条路：**让人拿着"机器人同款假手"去真实生活场景里干活**，GoPro 拍到的画面和机器人将来腕部相机几乎一样，示范轨迹用 SLAM 反推成机器人能执行的相对位姿序列。

论文展示的任务包括：

- **摆咖啡杯**：推、转、放，多模态（顺时针/逆时针都行）
- **动态抛掷分拣**：把球和乐高扔进对应箱子（超出静态够得到的范围）
- **双臂叠毛衣**：可形变物体 + 双臂严格同步
- **洗碗**：7 步长程 + 番茄酱 + 开水龙头

在线地址部署后，策略在 **UR5** 与 **Franka FR2** 上均可 roll out——同一 checkpoint 在 Franka 上 Cup 任务 **90%**，证明 hardware-agnostic 不只是 slogan。

*所以这一节是想说：UMI 要的是" anywhere 示范、any robot 部署"，不是把机器人绑在实验室。*

---

## 之前的人怎么做的，为什么不够好

论文归纳了 handheld gripper 路线的四个隐性坑：

| 问题 | 表现 | 后果 |
|------|------|------|
| **视觉上下文不足** | 腕部相机离物体太近，严重遮挡 | 看不清全局，规划失败 |
| **动作不精确** | 单目 SfM 有尺度模糊、运动模糊 | 只能 quasi-static 抓取 |
| **延迟不一致** | 采集时零延迟，部署时相机/推理/执行各慢一截 | 动态任务动作不同步 |
| **策略表达太弱** | MLP + 回归，吃不下人多模态示范 | 数据越多越难拟合 |

**对比其他路线**：

- **ALOHA / SpaceMouse 遥操**：数据质量高，但**必须有真机器人**，无法去咖啡馆采 1400 条。
- **纯人类视频（Ego4D 等）**：缺动作标签 + 人手≠夹爪，transfer 极难。
- **Dobb-E / 早期 handheld**：iPhone + reacher，只做 quasi-static pick-place，还要 per-environment fine-tune。

*所以这一节是想说：前人不是没想到 handheld，而是卡在"看得够广、轨迹够准、时间对齐、策略够表达力"四件事上。*

---

## 这篇论文的新想法

UMI 把问题拆成 **Demonstration Interface（示范接口）** 和 **Policy Interface（策略接口）** 两层设计：

**示范侧（HD1–HD6）**

1. **腕部 GoPro = 唯一传感器**（和部署时相机位姿对齐）
2. **155° 鱼眼**保留中心分辨率 + 周边上下文（不做 pinhole 矫正）
3. **侧面小镜子**制造隐式立体视觉（主相机看不到的番茄酱在镜子里可见）
4. **GoPro 内置 IMU + ORB-SLAM3** 视觉-惯性融合，快速运动也不丢尺度
5. **连续夹爪宽度**（非开/关二值），fiducial 标记跟踪
6. **运动学过滤**：SLAM 得到全局位姿后，按目标机器人关节限位筛掉不可行轨迹

**策略侧（PD1–PD2）**

1. **推理时延迟匹配**：观测流按实测 latency 对齐；动作**提前发送**补偿执行延迟
2. **相对轨迹动作**：未来 EE 位姿相对**当前** EE，而非世界坐标或逐步 delta
3. **双臂相对位姿**作为 proprioception（双手协调关键）
4. **Diffusion Policy** 建模多模态动作分布（ACT 可作 drop-in 替代，论文全用 DP）

*所以这一节是想说：不是"换个采集设备"，而是示范硬件 + 策略 I/O 联合设计，专门消灭 transfer 路上的四个坑。*

---

## 它分几步做的（方法）

### 5.1 硬件：UMI 手持夹爪

**输入**：人触发式操作 handheld gripper（3D 打印平行夹爪 + 软指 + 扳机）。

**处理**：
- 仅 **GoPro** 录制（mp4 内嵌 IMU：加速度计 + 陀螺仪）
- 155° 鱼眼镜头；夹爪两侧物理镜；fiducial 测指宽
- 双臂 = 再拿一只，map-then-localize 共享坐标系

**输出**：单文件 mp4（视频 + IMU + 时间戳），可互联网分发。

**规格（原文）**：

| 项目 | 数值 |
|------|------|
| 重量 | 780 g |
| 外形 | 310×175×210 mm |
| 指行程 | 80 mm |
| 3D 打印 BoM | **73 USD** |
| GoPro + 附件 | **298 USD** |
| 合计 | **~371 USD**（vs ALOHA ~2 万 USD） |

整套设备可在 **2 小时内**由非专家组装（论文 claim），且单条示范存成一个 mp4，便于上传分享——这是"众包机器人数据"设想的基础设施。

*所以这一节是想说：UMI 刻意把采集端做成"轻、便宜、单文件"，换机器人本体成本。*

---

### 5.2 轨迹恢复：Map-then-Localize + VI-SLAM

**输入**：GoPro 视频 + IMU。

**处理**：
1. 新场景先拍一段 **mapping video** 建地图
2. 每条示范 **relocalize** 到同一 map → 全局 metric scale 6DoF EE 轨迹
3. **ORB-SLAM3** 视觉-惯性联合优化；运动模糊时 IMU 可短时"撑住"

**输出**：每帧 EE 位姿 + 夹爪宽度；双臂时可算 **inter-gripper relative pose**。

**精度（MoCap 基准，Fig. 12）**：

| 指标 | 误差 |
|------|------|
| 单 gripper ATE 位置 | **6.1 mm** |
| 单 gripper ATE 旋转 | **3.5°** |
| 双臂 RPE 相对位置 | **10.1 mm** |
| 双臂 RPE 相对旋转 | **0.8°** |

*所以这一节是想说：没有 MoCap 房间，靠 GoPro+SLAM 达到厘米级——这是 dynamic/bimanual 可 transfer 的前提。*

---

### 5.3 示范接口设计细节（HD1–HD6 展开）

**HD1 · 仅腕部相机**

- **输入**：GoPro 鱼眼 RGB；部署时在机器人腕部复现**相同指型 + 相同相机相对位姿**。
- **处理**：不做 camera-robot-world 外参标定；相机机械固定在指上 → 抗震动、便携、无外部静态相机。
- **输出**：与真机部署几乎 indistinguishable 的像素分布（论文原话）。
- **副作用（好处）**：移动相机 = 自然 data augmentation，策略更关注物体而非固定背景。

**HD2 · 155° 鱼眼，不矫正**

- 针孔矫正会把中心信息压到很小面积（Fig. 3）， peripheral 拉伸严重 → 学习困难。
- 鱼眼保留中心分辨率，边缘压缩上下文 → SLAM 特征更多、overlap 更大。
- 消融：矫正到 69° 方图（类比 RealSense D415）→ 成功率 **55%** vs 完整鱼眼 **100%**。

**HD3 · 侧面镜子 = 隐式立体**

- 镜子里的图 = 沿镜面对称的"虚拟相机"视角；被主相机遮挡的物体（如盘中 ketchup）可在镜中看见。
- **必须**对镜中 ROI 做数字翻转 + 左右镜交换，否则 encoder 看到相反运动方向 → 85% vs **100%**。

**HD4 · IMU-aware VI-SLAM**

- GoPro mp4 内嵌 GPMF 格式 IMU；与 ORB-SLAM3 联合优化。
- 运动模糊 / 低头看桌（纹理少）时，IMU 可短时维持 tracking → 支持 **tossing** 类高速动作。
- **Metric scale** 直接恢复 → 双臂相对位姿 PD2.3 可算。

**HD5 · 连续指宽 + 软指**

- Fiducial markers 视觉测 width；非 0/1 开合 → 抛掷 release 时刻可精确到物体宽度。
- Series-elastic 软指：通过调节变形间接记录/调节抓力。

**HD6 · 运动学过滤**

- SLAM 给出绝对 EE 轨迹后，已知目标 robot base + URDF，可离线剔除 joint limit / 不可达段。
- 采集时**不知道**将来用哪台臂，过滤在训练前按 embodiment 做。

*所以这一节是想说：六个 HD 编号不是 checklist，每个对应前人 handheld 的一个具体失败模式。*

---

### 5.4 策略接口：相对轨迹 + 延迟匹配

**观察（每步）**：原始鱼眼 RGB 序列 + 历史相对 EE 轨迹 + 夹爪宽度（+ 双臂时 inter-gripper pose）。

**动作**：未来一段 **相对 EE 轨迹**（相对当前 EE 的 SE(3) 序列）+ 夹爪宽度。

与两种 baseline 对比（Fig. 6 直觉）：

```
相对轨迹 (UMI):  [T_now→t+1, T_now→t+2, ...]  同一锚点
Delta:           [T_t→t+1, T_t+1→t+2, ...]    误差逐步累积
Absolute:        全在 robot base 坐标系         野外标定几乎不可能
```

**延迟匹配（PD1）**：

- **观测侧**：测相机、proprioception、gripper 各自 latency；以最慢流（通常相机）为基准，其他流 **线性插值对齐**。
- **动作侧**：测 robot arm / gripper **执行延迟**；策略输出后 **提前发送** command，让真实到达时刻对齐预测时间戳。
- 丢弃因 $t_{input}-t_{obs}$、推理、执行延迟而"过期"的前几步动作。

**策略骨干**：Diffusion Policy [Chi et al. RSS 2023]；观测 horizon 通常 2 帧（等效提供速度信息）。复杂任务（洗碗）fine-tune **CLIP ViT-B/16**；野外 1400 ep 实验用 **ViT-L/14**。

**PD1.1 观测延迟对齐（逐步）**：

1. 实测 RGB / EE pose / gripper width 各自 delay（Appendix §A 用 rolling QR code 测相机端到端延迟）。
2. 将 RGB 下采样到 10–20 Hz；以每帧图像时间戳 $t_{obs}$ 为锚。
3. 对 robot proprio、gripper 流做**线性插值**，对齐到 $t_{obs}$。
4. 双臂：两路 GoPro 软同步，最近邻帧对齐，最大偏差 **1/60 s**。

采集端所有流相对图像 **零延迟**（GoPro 内嵌同步 IMU + 视觉测指宽）；真机分布式 controller 则各有 delay——PD1 要补的正是这条 train/test 鸿沟。

**PD1.2 动作延迟对齐（逐步）**：

1. 策略在 $t_{input}$ 输出从 $t_{obs}$ 开始的动作序列。
2. 因观测延迟 + 推理延迟 + 执行延迟，序列前几步在执行时刻 $t_{act}$ 已过期 → **丢弃**。
3. 对 arm / gripper 分别测 execution latency，**提前**发送 command，使物理到达时刻匹配策略时间戳。
4. 抛掷 ablation：关闭匹配 → 肘速度曲线 jitter，release 与 gripper 不同步 → 87.5% → **57.5%**。

**PD2 相对轨迹（公式直觉）**：

设当前 EE 位姿为 $T_0 \in SE(3)$。UMI 动作是长度 $H$ 的序列 $\{T_0^{-1} T_t\}_{t=1}^{H}$——全部相对**同一** $T_0$（本 inference step 的"现在"）。

- **Absolute**：需 SLAM 坐标 ↔ robot base 精确标定 → 野外 25% 成功率。
- **Delta**：每步相对上一步 → SLAM 噪声逐步累积 → 80%。
- **Relative (UMI)**：对 tracking 误差、移动 robot base 更鲁棒（Fig. 10a：推 base 不影响 cup 任务）。

**PD2.3 双臂 inter-gripper pose**：

- 输入 policy：除各腕图像外，还有 $\text{pose}_{L \leftarrow R}(t)$ 相对位姿。
- 来源：两 gripper 视频 relocalize 到**同一 map** → 共享世界系 → 逐帧算相对。
- 消融：去掉 → 叠毛衣 **30%** vs **70%**；典型失败 = 提衣摆双臂不同步。

*所以这一节是想说：UMI 的策略创新不在扩散公式，而在"相对坐标 + 毫秒级时间对齐 + 双臂显式协调"让野外数据能直接上真机。*

---

### 5.5 数据流总览（ASCII）

```
人持 UMI ──▶ GoPro mp4 (+IMU)
                │
                ▼
         ORB-SLAM3 建图/重定位
                │
                ▼
    (鱼眼图, 相对位姿, 指宽) × T  ──▶ Diffusion Policy 训练
                │
                ▼
真机 UR5/Franka + 同款指+GoPro  ──▶ 延迟匹配推理 ──▶ 执行
```

*所以这一节是想说：全 pipeline 机器人只在最后一环出现——这是和 ALOHA 的根本分野。*

---

### 5.6 四个能力实验在测什么

| 任务 | 难点维度 | 数据 |
|------|----------|------|
| Cup arrangement | 预hensile + 非预hensile 推杯；多模态旋转方向 | 305 ep |
| Dynamic tossing | 高速 + release timing；bin 超出静态工作空间 | 280 ep |
| Bimanual cloth | 可形变 + 双臂严格同步 | 250 ep |
| Dish washing | 7 步长程；流体/非牛顿流体；articulated faucet；语义"干净" | 258 ep |

**Cup 成功定义**：Espresso 杯 upright 在 saucer 上，handle 朝向机器人左侧 **±15°**。

**Tossing 成功定义**：6 个 YCB 物体——球类进圆 bin，乐高进方 bin；共 120 次 object-level 评测。

**Dish 七步**：开水龙头 → 拿盘 → 拿海绵 → 洗擦至 ketchup 清除 → 放盘 → 放海绵 → 关龙头；含 recovery 示范（中途加酱继续擦）。

**评测协议**：narrow-domain 实验对**所有方法**使用同一组人工对齐的初始状态（overlay 参考图），每任务 **20 episodes**（tossing 为 120 object trials）；避免"换 seed 洗结果"。

*所以这一节是想说：四个 task 分别压 dynamic / bimanual / deformable / long-horizon，不是四个 pick-place 变体。*

---

## 关键数字（What works）

### 能力实验（narrow-domain，20 trials unless noted）

| 任务 | 数据量 | UMI 成功率 | 关键消融 |
|------|--------|------------|----------|
| **Cup Arrangement** | 305 ep, 2 人 | **20/20 (100%)** | 无鱼眼 55%；绝对坐标 25%；delta 80%；镜面需数字翻转才 100% |
| **Cross-robot (Franka)** | 同上 checkpoint | **18/20 (90%)** | 2 例关节限位 |
| **Dynamic Tossing** | 280 ep | **105/120 (87.5%)** 物体级 | 无延迟匹配 → **57.5%** |
| **Bimanual Cloth Fold** | 250 ep | **14/20 (70%)** | 无 inter-gripper pose → **30%** |
| **Dish Washing** | 258 ep, 7 步 | **14/20 (70%)** | ResNet-34 从零 → **0/10** |

### 野外泛化（Cup Arrangement 扩展）

| 设置 | 结果 |
|------|------|
| 12 人时 × 3 人 × 30 地点 × 15 种杯子 | **1400** demonstrations |
| 未见环境 + 未见杯子 OOD 测试 | **43/60 ≈ 71.7%**（训练杯 70%，测试杯 75%） |
| 仅 narrow-domain 数据 + 同 ViT 骨干 | **0%**（机器人甚至不朝杯子动） |

### 采集效率（15 分钟计时，含复位）

| 任务 | 人手 | UMI | SpaceMouse 遥操 |
|------|------|-----|-----------------|
| Cup arrangement | 基准 | **48%** 人手速度 | **<UMI 的 1/3** |
| Dynamic tossing | 基准 | **64%** 人手速度 | **0 条成功示范** |

*所以这一节是想说：延迟匹配和 inter-gripper 不是锦上添花；野外数据是 71% OOD 的必要条件，单靠大 ViT 不够。*

---

## 实验结果说明了什么

1. **鱼眼 > 针孔矫正**：69° 裁剪版即使物体在视野内也 jitter——中心分辨率被压扁，策略被迫过度多模态。
2. **相对轨迹 >> 绝对坐标**：绝对动作 25% 成功率，根因是 SLAM 坐标与 robot base 标定误差——野外根本不现实。
3. **动态任务吃延迟**：抛掷无 latency matching 从 87.5% 跌到 57.5%，肘关节速度曲线明显抖动。
4. **双臂必须显式相对位姿**：视觉 overlap 小时，30% vs 70%——靠两路独立相机难以隐式学同步。
5. **长程 + 流体 + 形变可以 BC**：洗碗 70% 说明 UMI 管线不只适合 pick-place；但依赖 CLIP 级视觉预训练。
6. ** decentralize 数据可行**：1400 ep / 12 人时可支撑 OOD；mp4 单文件便于众包。

7. **采集效率有 quantified 优势**：15 分钟内 UMI 采 cup 数据约为 SpaceMouse 遥操的 **3 倍以上**；tossing 任务遥操 **15 分钟 0 条成功**，UMI 仍可行——说明接口人体工学本身解锁新 action 类型。

*所以这一节是想说：论文用大量 ablation 证明每个设计选择对应一个可测 failure mode，不是堆 demo。*

---

## 你应该懂的几个新词

- **Embodiment gap（实体差距）**：示范者身体/传感器与部署机器人不一致导致的迁移损失。
- **Visual SLAM**：只用相机（+IMU）估计自身 6D 位姿并建图；UMI 用 ORB-SLAM3。
- **Relative trajectory（相对轨迹）**：动作 = 相对当前 EE 的未来位姿序列，无全局坐标依赖。
- **Latency matching（延迟匹配）**：训练假设与部署时各传感器/执行器时间戳对齐。
- **Diffusion Policy（扩散策略）**：用扩散模型生成动作序列；UMI 的策略引擎。
- **Inter-gripper proprioception**：双臂 policy 输入两夹爪相对位姿，促同步。
- **Fisheye observation**：策略直接吃畸变鱼眼图，保留中心像素密度。
- **In-the-wild data**：在实验室外多样环境采集的数据。

*所以这一节是想说：UMI 论文一半在机器人学，一半在"接口设计 + 系统时序"。*

---

## 它有什么搞不定的

1. **环境纹理**：SLAM 需要足够视觉特征；大白墙仍困难（作者建议未来加第三人称相机/fiducial）。
2. **采集仍慢于人手**：Cup 任务 UMI 只有人手 **48%** 吞吐；设备 780g 偏重。
3. **事后运动学过滤**：采时不知目标机器人，不可行轨迹只能丢弃，不能"软修正"。
4. **无 force/tactile 显式标签**：靠软指 + 连续指宽隐式力，极限接触任务受限。
5. **Dexterous 任务**：平行夹爪 vs 人手 DoF——扣衬衫扣子类任务不在范围。
6. **依赖 DP + 大 ViT**：洗碗 ResNet-34 全灭；算力与工程门槛高于"纯 MLP BC"。
7. **SLAM 失败 = 整条轨迹废**：需 operator 保证 mapping 质量。

*所以这一节是想说：UMI 解放的是"机器人到场"约束，不是"示范零成本"或"任意灵巧手"。*

---

## 它和别的几篇是什么关系

- **策略引擎 · Diffusion Policy**：UMI 是 DP 的"野外数据飞轮"；先读 `diffusion-policy.md` 再读 UMI 更顺。
- **对照 · ACT/ALOHA**：ALOHA 要真机器人、joint-space 示范、ACT 输出；UMI 不要机器人、EE 相对轨迹 + DP。Ch14 模仿学习双路线。
- **对照 · Mobile ALOHA**：同团队（Tony Zhao）延伸 ALOHA 到移动家务；与 UMI 采集哲学相反，可互补（UMI 采多样性，ALOHA 采精细双臂）。
- **上游 · Open X-Embodiment / DROID**：大数据集解决 scale；UMI 解决"数据从哪来、怎么 cheap 扩"。
- **后续 · DexCap / AnyTeleop**：2024–2025 handheld 系列多延伸 UMI 框架。

*所以这一节是想说：读 UMI = 读懂"去中心化机器人数据"这条线的起点。*

---

## 和本导读的关系

对应 **[Ch14: 模仿学习](../guide/ch14-imitation-learning.md)** §3 **UMI** 段与路线图表格"降低数据成本"一行。建议顺序：

1. Ch14 §2 BC/DAgger 背景；
2. 本笔记 `act-aloha.md`（机器人必须在场的精细路线）；
3. 本笔记 UMI Method §5.3 延迟与相对轨迹；
4. Ch13 Diffusion Policy 细节。

Ch14 叙事强调 UMI 与 Diffusion Policy 部署端结合；本笔记补 Table 级数字与 ablation。

*所以这一节是想说：Ch14 讲"为什么 UMI"，本笔记讲"每个 HD/PD 编号对应什么机制"。*

---

## 思考题

**Q1：为什么腕部相机对齐比第三人称固定相机更适合 transfer？**

<details>
<summary>提示</summary>

想部署时 observation distribution：机器人执行中相机随动，handheld 与 wrist mount 应 indistinguishable。

</details>

**Q2：侧面镜子为什么要"数字翻转"才 100%？**

<details>
<summary>提示</summary>

镜像是虚像，物体运动方向与主相机相反；CNN 平移等变性会被 confuse。

</details>

**Q3：相对轨迹为何比 delta 更抗 SLAM 噪声？**

<details>
<summary>提示</summary>

Fig. 6：delta 每步相对上一步，噪声逐步累积；相对轨迹共锚当前 EE。

</details>

**Q4：Dynamic tossing 无延迟匹配时，为什么 grasp 还行、throw 不行？**

<details>
<summary>提示</summary>

抓握容错大；抛掷需要 release 时刻与速度矢量精确对齐，ms 级不同步致命。

</details>

**Q5：1400 条野外数据 + ViT-L 能 OOD，305 条 lab 数据 + 同 ViT 为何 0%？**

<details>
<summary>提示</summary>

不是 backbone 魔法，是训练分布是否覆盖黑桌、流水、行人 distractor。

</details>

**Q6：UMI 和 ALOHA 你会选哪个采"穿扎带"数据？**

<details>
<summary>提示</summary>

精度、双臂同步、是否必须真机 fidelity；两论文任务侧重不同。

</details>

**Q7：map-then-localize 对双臂 inter-gripper pose 为什么必要？**

<details>
<summary>提示</summary>

两路视频分别 relocalize 到同一 map，才能算同一时刻相对位姿。

</details>

---

## 一些好奇心问答（FAQ）

**UMI 名字的含义？**  
Universal Manipulation Interface——强调"接口"而非单一算法：硬件 + SLAM 管线 + policy I/O 标准。

**和 Diffusion Policy 论文作者重叠吗？**  
是的，一作 Cheng Chi 同为 Diffusion Policy 作者；UMI 是同一研究线的系统延伸。DP 解决"怎么生成动作序列"，UMI 解决"序列表从哪来、怎么对齐真机时钟"。

**必须 UR5 吗？**  
不必；论文用 UR5 + Franka FR2 部署同一 checkpoint（Cup 90%），靠相对轨迹 + 同款指/相机几何。

**数据格式？**  
标准 mp4（GoPro 内嵌 IMU），利于互联网分发——作者愿景是"机器人界的 YouTube 数据集"。

---

## 如果你想再深入

1. **官网 + 视频**：https://umi-gripper.github.io — 抛掷、洗碗必看。
2. **开源**：硬件 CAD + SLAM + 训练代码全开。
3. **先修**：`diffusion-policy.md`（策略）、`act-aloha.md`（遥操对照）。
4. **Follow-up**：Mobile ALOHA、DexCap、AnyTeleop。
5. **Appendix 精读**：§A latency 测量协议、§D SLAM 细节——复现关键。

---

## 原文信息

```bibtex
@inproceedings{chi2024umi,
  title     = {Universal Manipulation Interface: In-The-Wild Robot Teaching Without In-The-Wild Robots},
  author    = {Cheng Chi and Zhenjia Xu and Chuer Pan and Eric Cousineau and Benjamin Burchfiel and Siyuan Feng and Russ Tedrake and Shuran Song},
  booktitle = {Robotics: Science and Systems (RSS)},
  year      = {2024},
  url       = {https://arxiv.org/abs/2402.10329}
}
```

- **arXiv**：[2402.10329](https://arxiv.org/abs/2402.10329)
- **Project**：https://umi-gripper.github.io
- **机构**：Stanford, Columbia, Toyota Research Institute
