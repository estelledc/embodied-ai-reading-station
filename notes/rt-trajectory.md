---
title: "RT-Trajectory: Robotic Task Generalization via Hindsight Trajectory Sketches"
slug: rt-trajectory
topic: vla
difficulty: 3
status: deep-read
来源: papers/rt-trajectory/paper.md
venue: ICLR
year: 2023
era: classic
num: 113
generated_at: 2026-06-25
---

## TL;DR

教机器人做新动作，光说话不够、给一张完成图也不够。这篇论文说：在画面上画一条"手该走的路"——机器人立刻照着做。核心贡献是提出 RT-Trajectory，用 2D 轨迹草图（trajectory sketch）作为策略条件（policy conditioning），在同样的训练数据和模型骨架下，把新任务成功率从 17%（语言条件）/ 26%（目标图条件）提升到 67%（2.5D 轨迹条件）。

*所以这一节是想说：把任务表达从"语义层"降到"几何层"，泛化新任务一下就上来了。*

---

## 这是个什么场景

想象你在教朋友打羽毛球，他学会了"挥拍这个动作"。第二天你让他打网球。如果你只甩一句"打网球啊"——他可能反应不过来，因为"羽毛球"和"网球"在文字上是两件事。但如果你直接拿手比划一道弧线："手要这样划过去"——他立刻就懂了。**动作和动作之间，比文字和文字之间更像**。

机器人的烦恼一模一样。论文里这只机械臂站在桌前，桌上摆着可乐罐、薯片袋、香蕉。它训练时学过 8 类活儿（捡、放近、立起来、推倒、开抽屉、关抽屉、放进容器、从容器拿出来），共 542 个具体任务、约 73K 条人类遥操作示教。

现在你让它做一件全新的事：**把毛巾对折**。它没见过"折毛巾"这三个字，也没见过这个动作。但仔细想——"拎起一角拉到另一边"和"把可乐罐挪到百事罐旁边"，在机械爪的运动路径上几乎一模一样：抓住、划一道弧、放下。

问题出在**任务是用语言描述的**。"折毛巾"和"挪可乐罐"在文字上离得很远，模型没法把已经学会的肌肉记忆迁过来。RT-Trajectory 的核心观察：**画一条曲线，比说一句话更接近"动作本身"**。

具体实验环境：Google DeepMind 的移动操作机器人（Everyday Robots），7 自由度机械臂 + 两指夹爪 + 移动底座，头部装有 RGB 摄像头。桌面操作场景，训练时机器人底座和摄像头位置固定不动。

*所以这一节是想说：机器人对"新任务"水土不服的根因，是任务描述方式离动作太远。*

---

## 之前的人怎么做

文中把已有的"任务条件"（policy conditioning）方式按"具体度"从低到高排列（参见论文 Fig 2）：

**档 1：one-hot 任务编号**
- 早期做法（Kalashnikov et al., 2021）：每个任务给个 ID 编号，模型按编号查表执行。
- 缺点：完全没法泛化，新任务 = 新编号 = 完全没见过。one-hot 向量无法表达两个任务之间的"相似性"。

**档 2：语言条件（language-conditioned）**
- 代表作：RT-1（Brohan et al., 2023b）、RT-2（Brohan et al., 2023a）、BC-Z（Jang et al., 2021/2022）。
- 把任务说成自然语言："move pepsi can near rxbar blueberry"。
- 优点：能泛化"换种说法"——同一个任务你换措辞它也认；语言嵌入空间有一定插值能力。
- 缺点：**对新动作类型不敏感**。"折毛巾"和"挪罐子"在语言嵌入空间里距离很远，即使底层的末端执行器轨迹非常相似，模型也找不到借鉴对象。论文把这种情况叫 **under-specified on the end state**（末态欠定）——光说"折"，不知道折成什么样、怎么折。

**档 3：目标图条件（goal-image conditioned）**
- 代表作：RT-1-Goal、Lynch et al. 2019。
- 给一张"做完后的画面"当目标。
- 优点：能描述语言难表达的视觉细节。
- 缺点：**末态过定（over-specified）**。整张目标图里绝大部分像素跟任务无关（背景、光照、不相关物体），模型容易被这些干扰像素带偏。而且要在新场景下提供这张"未来完成图"很麻烦——你得先用某种方法生成一张还没发生的画面。论文实验中 RT-1-Goal 的整体成功率只有 26%。

**档 4：视频条件**
- 给一段完整的演示视频（Chane-Sane et al., 2023）。
- 缺点：等于对整条轨迹的每一帧都过度指定（over-specification over the entire trajectory of states）。高维视频在 transformer 里编码困难、学起来也困难。

**中间地带的探索**
- CLIPort（Shridhar et al., 2021）：2D 像素空间的 attention，但描述的是目标位置而不是运动轨迹。
- PerAct（Shridhar et al., 2022）：3D voxel grid 表达动作，计算开销大。
- VIMA（Jiang et al., 2023）：多模态 prompt（图 + 文字），方向类似但不够精简。
- Code as Policies（Liang et al., 2022）：LLM 写代码输出 waypoint，但它是"给 IK 解算器执行"的，不是给学习策略当条件的。

论文 Fig 2 用一张横轴为"具体度"的光谱图做了总结：左端是语言（最模糊），右端是视频（最啰嗦）。RT-Trajectory 想插在中间偏右的位置——比语言具体得多（明确说了走什么路），又比视频抽象得多（只是一条曲线加几个标记点，没有逐帧像素）。

*所以这一节是想说：现有方案要么模糊得没法学新动作，要么具体得没法跨场景，中间地带是空的——RT-Trajectory 就填这个空。*

---

## 新想法

一句话：**用 2D 轨迹草图（trajectory sketch）当任务描述**。

具体长什么样？想象拿着摄像头的初始画面，在上面画一条彩色曲线，曲线的颜色随时间渐变（编码"什么时候走到哪里"），曲线上某些点画圆圈表示"在这里夹紧"或"在这里松开"。

这个表达有几个微妙的好处：

1. **是几何层的，不是语义层的**。"折毛巾的轨迹"和"挪罐子的轨迹"在像素空间里都是"从 A 弧线到 B"，模型能识别其中的相似性。这直接解决了"语言嵌入空间离动作太远"的核心问题。
2. **训练标签不用人工标注**。已有的示教数据里都记了机械爪的 3D 位置，把它通过摄像头标定参数投影到 2D 像素坐标就行——叫 **hindsight（事后）** 是因为是事后回看已有轨迹再画的标签，零额外标注成本。
3. **推理时人也能画**。给个画图 GUI，鼠标拖一下就行。
4. **跟图像生成模型天然兼容**。曲线本身就是 RGB 图，理论上可以用 PaLM-E / ViT-VQGAN 这类模型自动生成。
5. **粒度恰到好处**。比语言具体（明确了路径几何），又比整帧目标图或整段视频抽象（只保留了轨迹和交互点），给 policy 留了"看情况微调"的空间——论文叫这种特性"coarse enough to allow the learned policy to interpret the trajectory sketch in the context of situational visual observations"。

类比：之前的任务描述像 GPS 输入"目的地名称"（语言）或者"目的地照片"（目标图），现在变成在地图上**画一条路线**——既告诉你去哪儿，也告诉你大概走哪条路、哪里转弯，但不管你用几档速度、哪个车道。

*所以这一节是想说：曲线既具体到能描述动作、又抽象到能跨任务复用，是描述粒度的甜点。*

---

## 方法分步

整个 pipeline 分三步：训练标签怎么来、模型怎么训、推理时曲线从哪搞到。这是论文最核心的内容。下面按照输入→处理→输出的格式逐步拆解，确保每个子步骤的数据流都清晰可追踪。

### 系统总览（Fig 1 对照）

先建立全局画面再钻细节。整个系统的数据流如下：

```
训练阶段：
  已有示教数据 (73K episodes)
    → [Hindsight Labeling] → 每条示教生成一张 trajectory sketch
    → [Policy Training] → 以 (RGB帧序列, sketch) 为输入训练 RT-1 骨架

推理阶段：
  新场景初始画面
    → [Sketch Generator] → 从人画/视频/LLM/图像模型获取一张 sketch
    → [Trained Policy] → 实时输出动作 token → 执行
```

关键设计决策：训练时 sketch 来自"回看已有数据"（免费），推理时 sketch 来自"外部源"（灵活）。这种"训练和推理时输入来源不同"的设计是 hindsight 方法的典型范式。

### 第 1 步：Hindsight 轨迹打标签（Section 3.2）

**输入**：一条人类遥操作示教 `tau = {(o_t, a_t)}`，包含每帧 RGB 画面 + 机械爪的 3D 位置（机器人本体感知数据）。
**输出**：一张和原画面同分辨率的 RGB 图，叫 trajectory sketch。
**处理流程**：三个基本要素叠加。

类比：好比你跑完步把手机轨迹截图——**事后回看走了哪条路**，就有了一张免费的"答案图"。

#### 要素 (a)：2D 轨迹提取

- 每一帧拿到机械爪中心（end-effector center）的 3D 位置，坐标系是机器人基座坐标系（robot base frame）。
- 用摄像头的外参矩阵 `[R|t]`（描述摄像头相对于世界坐标系的位姿）和内参矩阵 `K`（描述焦距、像素尺寸等）做 3D → 2D 投影：`pixel = K * [R|t] * P_3D`，得到每一帧对应的一个 2D 像素点。
- 相邻时间步的 2D 点用直线连起来，得到一条曲线。
- 把这条曲线画在一张空白图（全黑背景）上。

**关键假设**：摄像头和机器人底座在一段示教内不动（"stationary manipulation"）。桌面操作场景下这个假设成立。如果底座移动了，投影矩阵 `[R|t]` 每帧都不同，画出来的曲线就不是在同一个像素坐标系下的连贯路径了。

**具体例子**：假设一条"挪可乐罐"的示教有 150 帧（约 5 秒），机械爪从画面右上角出发、下降到桌面、抓住罐子、弧线移到左边、放下。投影后得到约 150 个 2D 像素点，相邻点连线后就是一条从右上到左下的带拐弯的曲线。在空白图上，这条曲线占据了画面中间偏右到偏左的区域——直观地表达了"从这里到那里"的运动意图。

#### 要素 (b)：Color Grading（颜色编码时空信息）

好比给地图路线"按时间渐变上色"，看一眼就知道先走哪段后走哪段。

**红色通道（R）编码时间进度**：
- 在时间步 t，红色值 = `(t+1) / T`，其中 T 是这条示教的总帧数。
- 效果：曲线起始端红色淡（值接近 0），结束端红色浓（值接近 1）。
- 人话：看一眼颜色深浅就知道"先走哪后走哪"、"走得快还是慢"（相邻点间距 / 颜色跳跃越大 = 速度越快）。

**绿色通道（G）编码高度信息（仅 2.5D 版本）**：
- 在时间步 t，绿色值 = `(h_{t+1} - h_min) / (h_max - h_min)`。
- h 是机械爪中心相对于机器人基座的 z 轴高度，h_min 和 h_max 是整条轨迹的高度极值。
- 效果：绿色越亮 = 高度越高；绿色越暗 = 高度越低。
- 为什么要加这个？因为 2D 投影有本质模糊性——看一条 2D 曲线分不清"机械爪是往里走还是往上抬"。把高度塞进绿色通道就是加了 "2.5 维" 信息来消歧。
- 为什么叫"2.5D"而不是"3D"？因为它只编码了 z 轴高度（一个标量），不是完整的 3D 坐标重建。你知道"相对有多高"但不知道"绝对在哪个 3D 点"。
- **具体数值示例**：假设某段示教中机械爪最低下降到桌面（h_min = 0.05m）、最高抬到桌面以上 30cm（h_max = 0.35m）。在 t=50 帧机械爪高度是 0.20m，则绿色值 = (0.20 - 0.05) / (0.35 - 0.05) = 0.5，即绿色通道中等亮度。在 2D sketch 中这一段曲线表现为"中等绿 + 一定红"的混合色——人眼看就是偏黄色。

**蓝色通道（B）**：在 2D 和 2.5D 版本中都没有被利用来编码轨迹本身的信息。蓝色通道被保留给了 Interaction Markers（蓝色圆圈表示松开动作）。这意味着 sketch 的 RGB 三通道各有分工：R=时间、G=高度、B=交互标记。整个设计充分利用了图像的三通道容量而没有浪费。

#### 要素 (c)：Interaction Markers（交互标记）

好比在地图上贴俩图钉：这里上车、那里下车。机器人的"上下车"就是"开始抓 / 开始松"。

**判断逻辑**（论文的公式翻译成人话）：
- 计算每一帧夹爪的"目标位置与实际位置之差" `delta_t = p_hat_t - p_t`。
- 如果 `delta_t > 0` 且 `p_hat_t > epsilon`（阈值），说明系统在发送"闭合"指令但夹爪还没合到位 → 正在用力夹东西。
- 检测状态跳变的瞬间：前一帧不在夹 + 这一帧开始夹 = "closing key step"；反过来就是 "opening key step"。
- 在该时刻对应的 2D 像素位置画**绿色圆圈**（开始抓）或**蓝色圆圈**（开始松）。

**为什么不直接用夹爪指令当标签？** 因为指令和实际状态之间有延迟和弹性——发了"闭合"指令后夹爪可能要几帧才真正接触到物体。论文的判断方法（看目标 vs 实际位置差）能精确定位到"真正在和物体交互"的那一帧，而不是"发出指令"的那一帧。这种细粒度的时间对齐对学习"什么时候该抓"至关重要。

**圆圈的大小**：论文中画的圆圈比曲线线宽更大（几个像素半径），确保在低分辨率输入中仍然可以被 CNN 检测到。

#### 完整 sketch 生成的伪代码

把上面三个要素合起来，一条示教的 sketch 生成过程可以概括为：

```
输入：episode τ = {(o_1,a_1), ..., (o_T,a_T)}, 相机参数 K, [R|t]
输出：sketch 图像 S (H x W x 3)

S ← 全零黑色图像
for t = 1 to T:
    p_3d ← 机械爪中心 3D 位置（本体感知）
    p_2d ← K * [R|t] * p_3d  # 投影到像素坐标
    if t > 1:
        在 S 上画线段 (prev_p2d → p_2d)
        线段颜色: R = (t+1)/T, G = normalize(height_t), B = 0
    检测 gripper 交互状态跳变:
        if closing_start: 在 p_2d 画绿色圆圈
        if opening_start: 在 p_2d 画蓝色圆圈
    prev_p2d ← p_2d
return S
```

这个过程对 73K 条示教批量执行一次，即得到全部训练标签。不需要训练任何模型、不需要人工介入。

#### 两种最终格式

| 版本 | 包含要素 | 信息量 |
|------|---------|--------|
| RT-Trajectory (2D) | 2D 曲线 + 时间颜色编码（R 通道）+ 交互标记 | 知道路线和时间顺序 |
| RT-Trajectory (2.5D) | 上述 + 高度颜色编码（G 通道） | 额外知道每个位置的高度 |

#### 设计取舍分析：为什么这样编码？

这一步有几个值得深想的设计决策：

**为什么用连续曲线而不是离散路径点？** 如果只标注几个关键 waypoint（比如起点、拐点、终点），信息量大幅减少，模型可能无法区分"缓慢弧线"和"快速直线"——但这两者在实际操作中对力度和速度的要求完全不同。连续曲线保留了速度信息（相邻点的像素距离 / 颜色变化率 = 运动速度）。

**为什么选择"画在黑色背景上"而不是"叠加到 RGB 画面上"？** 训练时 sketch 是和 RGB 沿通道拼接的（concat），如果 sketch 背景是原始画面，那 sketch 通道实质上包含了场景信息的冗余副本，增加了学习负担。黑色背景确保 sketch 通道只传递"运动路径"这一种信号——信息正交性最大化。

**为什么时间编码在红色通道而不是用 alpha 通道或额外灰度图？** 因为论文选择把 sketch 表示为标准 3 通道 RGB 图——这使得它可以直接和原始 RGB 帧沿通道维 concat（3+3=6），也使得图像生成模型（ViT-VQGAN）可以直接输出 sketch。如果用 4 通道（RGBA）或灰度图就需要额外的编码/解码步骤。

*所以这一步是想说：利用已有示教数据中记录的机械爪 3D 位置，事后投影到 2D 画面画成彩色曲线当训练标签——完全免费、自动化。每个设计细节（连续线、黑底、RGB 三通道分工）都有明确的工程理由。*

---

### 第 2 步：训练 policy（Section 3.3）

**输入**：6 帧 RGB 历史画面 + trajectory sketch（一张 RGB 图）。
**输出**：离散化的机器人动作 token。
**处理流程**：基于 RT-1 的 Transformer behavior cloning。

类比：像让一个原本只会"看图"的学徒，加一张"路线小抄"在旁边——他要学会瞄一眼小抄、再看画面，决定手怎么动。

**骨架沿用 RT-1**：

RT-1 的结构（详见 [Ch11](../guide/ch11-rt1-rt2.md)）：一个 Transformer-based 的 behavior cloning 模型——用 EfficientNet 做图像 tokenizer、用 TokenLearner 压缩 token 数量、用 causal Transformer 做序列建模、最后用离散化的 action token 做输出。

**RT-Trajectory 的修改**：

1. **Sketch 注入方式**：把 trajectory sketch 沿通道维度（channel dimension）拼接到每帧 RGB 上。
   - 原本每帧是 3 通道（R, G, B）。
   - 加上 sketch 的 3 通道后变成 6 通道。
   - 6 帧输入序列中的每一帧都拼上同一张 sketch。

2. **EfficientNet-B3 改造**：ImageNet 预训练的 EfficientNet-B3 做 image tokenizer。
   - 第一个卷积层原本接 3 通道输入，现在要接 6 通道。
   - **新增的 3 个输入通道对应的卷积权重初始化为全 0。** 这个设计很精妙：训练开始时，模型假装 sketch 不存在（零权重 = 输出不受影响），不破坏预训练的视觉特征。然后随着训练推进，这些权重从零慢慢学出有意义的值——相当于"渐进式"地引入新通道信息。

3. **移除 FiLM 层**：RT-1 原本用 Feature-wise Linear Modulation (FiLM) 把语言 embedding 注入视觉特征。RT-Trajectory 不用语言了（任务信息全在 sketch 里），所以把 FiLM 拆掉。

**训练目标**：标准 Behavior Cloning——最大化动作的对数似然 `log P(a_t | o_t, c_traj)`。
- 人话：模型看到当前画面 + 轨迹草图，预测下一步动作；让预测尽量贴近示教数据里的真实动作。
- 本质上是监督学习，loss 是交叉熵（因为动作被离散化成了 token）。

**训练数据**：沿用 RT-1 的全部 73K 条示教，只是把原本的语言标签替换成了 hindsight trajectory sketch。不需要额外数据采集。

**数据流总结（policy training 阶段）**：

```
一条训练样本:
  RGB 帧序列 [o_{t-5}, ..., o_t]  (每帧 3 通道, 300x300)
  + trajectory sketch c_traj     (3 通道, 300x300)
  ↓ [沿通道拼接: 每帧 3ch → 6ch]
  → EfficientNet-B3 (per-frame)   → 每帧得到 visual tokens
  → TokenLearner                  → 压缩 token 数量
  → causal Transformer            → 序列建模
  → 离散动作 token 输出            → 7DoF 关节动作 + 夹爪开合
```

**零初始化的深层含义**：这个技巧在多模态学习中被反复使用（类似于 LoRA 中 B 矩阵初始化为零、LLaVA 中视觉 adapter 的初始化）。核心思想是：引入新模态时不能打破已学到的旧模态表示。如果新通道的权重随机初始化，第一个 batch 的梯度就会把 EfficientNet 的预训练权重带跑偏。零初始化保证了"起跑时什么都没变"，然后梯度慢慢把新通道的信息"渗透"进模型。

**动作空间的离散化**：和 RT-1 一样，7 自由度的连续关节速度被均匀离散化为 256 个 bin，加上夹爪的开/合状态。每个时间步输出 8 个 token（7 个关节 + 1 个夹爪），用自回归方式逐个预测。这意味着 loss 是 8 个分类交叉熵之和。

**一个微妙的工程选择**：sketch 是在 t=0 时生成的（对应整条轨迹），然后在所有时间步都作为条件输入。这意味着 policy 在执行第 50 帧时看到的 sketch 仍然是"整条路线的全貌"——它需要自己判断"我现在走到哪一段了"。这和 GPS 导航类似：地图一直显示全程路线，司机自己根据当前位置知道该关注哪一段。模型怎么知道"我到哪了"？靠 6 帧 RGB 历史中的视觉信息——当前画面中机械爪的位置暗含了"我在曲线哪一段"的线索。

**与 RT-1-Goal 的架构对比**（Appendix B.4）：

RT-1-Goal 和 RT-Trajectory 的网络结构完全相同——同样是把条件图像沿通道 concat 到 RGB 帧上。唯一区别是 concat 的内容：Goal 版本是"任务完成后的末帧画面"（整张 RGB 图），Trajectory 版本是"轨迹 sketch"（黑底上的彩色曲线）。这使得两者的对比极其纯粹：同样的架构、同样的数据、同样的训练方式——唯一变量就是"条件图像里画的是什么"。26% vs 67% 的差距完全归因于 sketch 比 goal image 更适合传达"怎么做"的信息。

**训练时不需要 curriculum 或分阶段**：

论文没有提到任何特殊的训练策略——不需要先训练 RGB-only 再加 sketch 通道（零初始化已经保证了平滑过渡），不需要数据增强（hindsight sketch 本身就是从真实轨迹生成的，不存在分布偏差），不需要对不同任务加权。这种"简单到几乎什么都没改"的方法论是本文最令人印象深刻的地方之一——效果的巨大提升来自一个极其简洁的想法。

*所以这一步是想说：模型改动非常小——在 RT-1 基础上拼一个通道、零初始化、拆掉 FiLM，训练目标不变。效果的提升几乎全部来自 conditioning 方式的改变，而非架构革新。和 RT-1-Goal 的对比是本文最有力的消融实验——架构一样，只换条件图像内容，就从 26% 跳到 67%。*

---

### 第 3 步：推理时怎么搞到 sketch（Section 3.4）

训练完了，真上战场——这条曲线谁来画？论文给了四种"画师"，从最朴素到最自动化都覆盖。

#### 来源 1：人手画（GUI）

- 给一个画板界面（论文 Fig 13），用户对着初始画面拖鼠标画曲线。
- 还能选几个像素标注"这点高度多少"（用于 2.5D 版本），剩下的点线性插值。
- 可以点击画面添加绿色/蓝色圆圈标记抓/松。
- 优点：最直觉、最可控。
- 缺点：需要人在环；不 scalable。

#### 来源 2：从人类示教视频抠

- **输入**：第一人称人类手部操作视频。
- **处理**：
  1. 用 MediaPipe 检测每帧人手的 21 个关键点。
  2. 选取拇指和食指的 4 个关键点代表平行夹爪。
  3. 用深度图把 2D 关键点升到 3D。
  4. 从 4 个点插值出末端执行器位姿。
  5. 手动标注"抓"和"松"的关键帧。
  6. 把估计出的末端轨迹投影到机器人摄像头视角，画成 trajectory sketch。
- 优点：可以从现有的人类演示视频获取曲线。
- 缺点：需要深度图、需要手动标注关键帧、人手和机器人夹爪的运动学不完全对应。

#### 来源 3：LLM + Code as Policies

- **输入**：任务语言描述 + VLM 检测到的场景中物体标签 + 机器人约束信息。
- **处理**：用 GPT-4 写 Python 代码生成一系列 3D waypoint（原本是给 IK 解算器直接执行的），把这些 3D 点重投影到摄像头画面画成曲线。
- 优点：全自动、可以处理语言描述的任务。
- 缺点：LLM 生成的路径通常是直线段连接的 waypoint，比训练时的曲线更"生硬"（论文原话："precise and linear"）。

#### 来源 4：图像生成模型

- **输入**：语言指令 + 初始画面。
- **处理**：用 PaLM-E 风格模型输出 ViT-VQGAN 的 token，detokenize 后得到 trajectory sketch 图像。
- 优点：完全自动、端到端。
- 缺点：目前生成质量噪声较大（论文 Fig 7 可见生成的曲线"noisy and quite different from training"），但作者认为随着图像生成模型进步，这条路会越来越好走。

**关键发现**：四种来源生成的 sketch 和训练时的 hindsight sketch 在分布上都有差异（更弯曲、更生硬、更噪声），但 policy 对这些差异有一定鲁棒性。这说明 trajectory sketch 作为中间表示的"粒度"选对了——粗到足以容忍输入噪声，细到足以传递有用信息。

#### 四种来源的对比总结

| 来源 | 自动化程度 | sketch 质量 | 适合场景 | 论文实验中的表现 |
|------|-----------|------------|---------|----------------|
| 人手画 | 最低（需要人在环） | 最好（意图精确） | 实验室评测 | 主实验全部用这种 |
| 人类视频 | 中等（需要深度图 + 手动标注关键帧） | 中等（"more squiggly"） | 跨模态迁移 | Pick 94%, Fold 75% |
| LLM + CaP | 较高（只需文本描述） | 中等（过于直线） | 已知任务的文本描述 | Pick 89%, Open Drawer 60% |
| 图像生成模型 | 最高（端到端） | 最低（噪声大） | 未来全自动流水线 | 仅定性展示，未定量 |

#### 推理时的"Prompt Engineering"

这是论文中一个被低估但实际部署极其重要的发现（Section 4.4 / Appendix E.1）：

- 和 LLM 对同一个问题换不同措辞会得到不同质量的回答一样，RT-Trajectory 对同一个场景换不同形状的 sketch 也会得到不同质量的执行。
- 论文 Fig 19 展示了一个案例：要把苹果放到高台上，画一条直接平移的曲线会失败，但画一条先升高再下降的抛物线形曲线就能成功。
- 这开启了"视觉 prompt engineering"的研究方向——一种全新的人机交互范式：你不需要重新训练模型或收集新数据，只需要换一条画得更好的曲线。
- 论文实际评测时的做法（Appendix B.2）：用一个 held-out policy 反复尝试不同曲线，保存第一次成功的那条作为后续评测的标准输入。这相当于"用暴力搜索找到好 prompt"。

#### 涌现能力：Retry Behavior

训练数据中并没有"失败后重试"的标注，但 RT-Trajectory 在实际执行中展现出了重试行为（Fig 20）：给一条"拉开抽屉"的 sketch，机器人第一次尝试抓手柄失败后，自动切换到抓抽屉边缘——最终成功拉开。这说明学习策略相比 IK 直接执行的根本优势：它不是机械地跟随路径点，而是"理解了运动意图"并根据实际情况灵活调整执行细节。

*所以这一节是想说：训练标签自动出，推理时曲线来源极其灵活——人画、视频、LLM、图像生成都行，policy 都能用。方法的工程价值在于这种灵活性和涌现的鲁棒行为。*

---

### 第 4 步：评测协议设计（Section 4.1）

严格来说评测协议不是"方法"的一部分，但它影响如何解读结果，而且论文在评测设计上有几个重要的非标准做法：

**评测数据的构建**：
- 7 个新任务，每个任务收集一组"场景"（固定的物体初始摆放），每个场景用相机拍一张初始画面。
- 评测时先把物体摆回初始位置，然后运行 policy。
- 每个 policy 在每个场景跑若干次（约 64 次总试验），统计成功率。

**baseline 的公平性处理**：
- RT-1 和 RT-2 收到的是新任务的语言描述（如 "fold towel"），即使这些语言从未在训练中出现过。
- RT-1-Goal 收到的是某次成功执行的末帧画面作为目标图。
- RT-Trajectory 收到的是人画的 sketch。
- 关键差异：**sketch 包含的信息量介于语言和目标图之间**，所以对比不是完全"apple to apple"。但论文的论点恰恰是：正是因为 sketch 在信息量/粒度上选了更好的甜点，所以效果更好。公平性不在于"输入信息量相等"，而在于"每种方法都用了自己最自然的输入方式"。

**新任务的设计逻辑**（Table 3）：
- Upright and Move / Move within Drawer：测试"组合已见技能形成新技能"的能力。
- Restock Drawer：测试"精确放置"能力（对轨迹末端精度要求高）。
- Place Fruit：测试"迁移到新容器"能力。
- Pick from Chair：测试"在未见过的高度/工作空间"操作能力。
- Fold Towel：测试"全新运动模式"（柔性物体操控）。
- Swivel Chair：测试"欠驱动系统交互"（推动有轮子的椅子）。

这 7 个任务覆盖了"动作泛化"的不同维度，设计上有互补性。

### 第 5 步：运动泛化的定量度量（Section 4.5）

论文不仅要证明"方法有效"，还要回答一个元层面的问题：**评测任务真的是"新"的吗？** 也就是说，会不会 RT-Trajectory 成功只是因为新任务的轨迹碰巧和训练数据里某些轨迹很像（retrieval）而非真正学到了泛化能力（generalization）？

**度量工具：离散 Frechet 距离**

选择 Frechet 距离（而非更简单的欧几里得平均距离）的原因：
- 保序性：两个"行者"只能前进不能后退，保证了时间对齐。
- 最坏情况导向：取的是"在保持时间顺序约束下的最大点对点距离"。对机器人操作来说，"某一段偏了 3 厘米"就意味着任务失败——最坏情况比平均情况更有诊断价值。

**递归公式**（Appendix C.1）：

给定两条轨迹 `tau = {rho_0, ..., rho_m}` 和 `tau' = {rho'_0, ..., rho'_n}`，Frechet 距离递归定义为：

`FD(tau, tau') = max(d(rho_0, rho'_0), min{FD(tau[1:], tau'[1:]), FD(tau, tau'[1:]), FD(tau[1:], tau')})`

人话翻译：两个人同时出发，每一步可以选择"我走一步 / 你走一步 / 咱俩都走"，求所有可能步调安排中"绳子最短"的那个方案——那个最短的绳子长度就是 Frechet 距离。

**分析方法**：
- 对每条评测轨迹，计算它和训练集中所有 73K 条轨迹的 Frechet 距离，找出 top-10 最相似的。
- 从三个维度分析这 top-10：(1) 形状相似度分布（Fig 12）；(2) 语义技能分布（Fig 10）——最像的训练轨迹是什么任务类型？(3) 首次交互高度差异（Fig 11）——关键抓取点的 z 坐标差多少？

**关键发现**：
- 即使 2D 形状很像的轨迹（如 "place fruit" 和某些 "move X near Y"），在高度维度上差异显著——说明模型必须外推到新的 z 范围。
- 新任务的最近邻训练轨迹在语义上通常是不同技能——如 "place fruit" 的最近邻是 "move near"。模型不是在匹配"同类任务"，而是在借用"形状相似但语义不同"的运动模式。
- 这正是 trajectory sketch 能泛化的机制：它把语义距离远但几何距离近的任务"拉到一起"，让模型能互相借用运动经验。

*所以这一步是想说：Frechet 距离分析不仅是实验的验证环节，更揭示了 trajectory conditioning 泛化的内在机制——几何空间中的"近邻"比语义空间中的"近邻"对动作学习更有用。*

### 推理时 sketch 来源的工程选择（Section 4.3 + B.2）

训练时 sketch 是自动标注的（hindsight），但推理时必须"提前"给——因为动作还没发生，怎么画未来的轨迹？论文探索了四种来源：

| 来源 | 优点 | 缺点 | 实际效果 |
|------|------|------|----------|
| 人类手绘 | 精确、可控 | 不 scalable；需要用户理解任务 | 最高（人在回路） |
| 视频提取 | 直接从人类操作视频中提取 | 需要深度图做 3D 重建 | 中等 |
| LLM waypoints | Code as Policies 输出关键点 | 只有稀疏 waypoints，缺中间路径 | 变化大（Open Drawer 71% 直接 IK 执行 vs 60% 经 RT-Traj） |
| 图像生成模型 | 全自动 | 噪声大、形状不精确 | 最低 |

论文最终评测实际采用的是"oracle replay"方法：先用 held-out policy 跑多次直到成功，把成功轨迹的 sketch 提取出来作为条件输入——这其实是一种上界估计。实际部署时需要解决"首次 sketch 从哪来"的自举问题，这是未来工作的重要方向。

---

## 关键数字

### 训练数据规模

| 指标 | 数值 |
|------|------|
| 示教轨迹数 | ~73,000 条 |
| 任务数（seen） | 542 个 |
| 技能类别 | 8 类 |
| 涉及物体种类 | 17 种厨房物品 |
| 数据采集方式 | 人类遥操作 |

### 新任务评测：整体成功率（Table 4）

7 个全新任务（训练时未见过），每个任务约 64 次试验。

| 方法 | 整体成功率 |
|------|-----------|
| RT-1（语言条件） | 16.7% |
| RT-2（语言 + VQA 网络数据） | 11.1% |
| RT-1-Goal（目标图条件） | 26% |
| **RT-Trajectory (2D)** | **50%** |
| **RT-Trajectory (2.5D)** | **67%** |

### 新任务评测：逐项细分（Table 4）

| 任务 | RT-Traj (2D) | RT-Traj (2.5D) | RT-1 | RT-2 | RT-1-Goal |
|------|-------------|----------------|------|------|-----------|
| Place Fruit | 75% | 75% | 0% | 33% | 8% |
| Upright and Move | 33% | 50% | 17% | 0% | 0% |
| Move within Drawer | 67% | 100% | 33% | 0% | 17% |
| Restock Drawer | 92% | 67% | 42% | 17% | 42% |
| Pick from Chair | 0% | 38% | 0% | 0% | 17% |
| Fold Towel | 75% | 75% | 0% | 0% | 0% |
| Swivel Chair | 0% | 70% | 17% | 0% | 50% |

### 不同轨迹来源的成功率（Table 1）

**人类视频来源：**

| 方法 | Pick | Fold Towel |
|------|------|-----------|
| IK Planner（直接执行） | 42% | 25% |
| RT-Trajectory (2D) | 94% | 75% |
| RT-Trajectory (2.5D) | 100% | 75% |

**LLM (Code as Policies) 来源：**

| 方法 | Pick | Open Drawer |
|------|------|------------|
| IK Planner（直接执行） | 83% | 71% |
| RT-Trajectory (2D) | 89% | 60% |
| RT-Trajectory (2.5D) | 89% | 60% |

*所以这一节是想说：数字差距不是 5%、10% 的水平，是从 17% 跳到 67%——同样的数据、同样的骨架，conditioning 方式一换就是代差。*

---

## 实验结果说明了什么

### 1. 轨迹条件在"动作泛化"上碾压语言条件

RT-Trajectory (2.5D) 的 67% 对比 RT-1 的 17%，差距约 4 倍。核心原因：7 个评测任务都涉及"从未见过的运动模式"，而不仅仅是"从未见过的物体名词"。在运动模式的相似性上，几何轨迹比语言嵌入更有表达力。Fold Towel 和 Swivel Chair 两个 baseline 为 0% 的极端案例最有说服力——语言完全无法帮模型借鉴已有经验。

### 2. 2.5D 比 2D 好，但优势集中在"高度关键"的任务

- Pick from Chair：2D 版 0%，2.5D 版 38%。椅子高度和桌面不同，纯 2D 投影分不清。
- Swivel Chair：2D 版 0%，2.5D 版 70%。不知道是"推"还是"拉"，深度信息救场。
- Move within Drawer：2D 版 67%，2.5D 版 100%。抽屉是凹陷的，需要知道进去多深。

但在高度不关键的任务上（如 Fold Towel），两者表现一样（75% vs 75%）。这说明绿色通道的高度编码不是万能的，它只在特定几何条件下起作用。

### 3. RT-2 比 RT-1 还差——VLM 的语义先验在新动作任务上帮倒忙

RT-2 的 11.1% 甚至低于 RT-1 的 16.7%。RT-2 用了 PaLI-X 55B 参数的 VLM + 网络规模数据。为什么更差？因为这些"新动作"任务（fold towel, swivel chair）在网络数据里几乎没有对应的机器人操作语义。VLM 的强项是"识别 Taylor Swift 然后执行相关指令"——那是语义泛化。动作泛化的战场上，更大的语言模型反而因为过度依赖语义信号而欠拟合底层的运动模式。

### 4. 学习策略比直接执行更鲁棒

从 Table 1 可以看到：人类视频 → RT-Traj 的 Pick 成功率 94%，而 IK Planner 直接执行只有 42%。原因是 IK Planner 机械地跟随转换后的轨迹，遇到定位误差或物体朝向变化就失败；RT-Traj 的策略会根据实时视觉观察微调动作——论文原话 "ability to adapt motion to the scene nuances like object orientation"。

### 5. 推理时的 sketch 不必完美

四种来源（人画、视频、LLM、图像生成）的 sketch 和训练时的 hindsight sketch 在分布上有显著差异（人画的更弯弯绕、LLM 的过于直线、图像生成的有噪声），但 policy 仍然能跟随并成功。这验证了轨迹作为中间表示的 "粗粒度容错" 特性。

### 6. Frechet 距离分析证实了泛化的真实性

论文 Section 4.5 用离散 Frechet 距离衡量评测轨迹和训练集中最相似轨迹之间的差距。结果显示：新任务的评测轨迹和最近邻训练轨迹之间的 Frechet 距离显著大于"见过的任务"内部的距离，尤其在高度维度上差异更明显。这排除了"模型只是在做 retrieval 而非 generalization"的质疑。

*所以这一节是想说：实验不仅证明了方法有效，还解释了为什么有效（几何相似性 > 语义相似性），以及回答了审稿人可能的质疑（确实是泛化不是检索）。*

---

## 你应该懂的几个新词

- **policy conditioning**（策略条件）：告诉模型"现在该执行哪个任务"的输入信号。one-hot / 语言 / 目标图 / 轨迹都是不同的 conditioning 方式。RT-Trajectory 的核心贡献就是换了一种 conditioning。

- **hindsight labeling**（事后标签）：训练数据已经存在，回头看一遍生成新的标签。这个词在强化学习里很常见（Hindsight Experience Replay, HER：把"没达到的目标"当成"已达到的目标"来学），这里的用法是"过去的机械爪轨迹投影到画面当 sketch 标签"。

- **end-effector**（末端执行器）：机械臂最末端和环境直接交互的部件——在这里就是两指夹爪。论文里 trajectory 指的是 end-effector 中心点的运动路径，不是整个机器人。

- **camera extrinsics / intrinsics**（外参 / 内参）：把 3D 世界点投影到 2D 像素的两组参数。外参 = 摄像头在世界中的位置和朝向（旋转 + 平移矩阵）；内参 = 摄像头本身的光学属性（焦距、主点偏移、像素尺寸）。投影公式：`pixel = K * [R|t] * P_world`。

- **behavior cloning (BC)**（行为克隆）：模仿学习中最简单的一种——直接把人类示教当监督信号做有监督学习。优点是简单直接；缺点是遇到训练数据没覆盖到的状态容易累积误差（compounding error）。

- **FiLM layers**（Feature-wise Linear Modulation）：一种条件化机制。公式：`FiLM(x) = gamma * x + beta`，其中 gamma 和 beta 由条件信号（如语言 embedding）生成。RT-1 用它把语言注入视觉特征；RT-Trajectory 拆掉了它因为不再需要语言。

- **VQGAN / ViT-VQGAN**：把图像编码成离散 token 的模型。VQ = Vector Quantization（向量量化），把连续特征映射到最近的 codebook 向量。论文里图像生成模型通过预测这些离散 token 来"画"出 trajectory sketch。

- **Code as Policies (CaP)**：让 LLM 写 Python 代码控制机器人的范式（Liang et al., 2022）。原本输出是 3D waypoint 给 IK 解算器。RT-Trajectory 把它降级成"sketch 生成器"。

- **IK（Inverse Kinematics, 逆运动学）**：给定末端目标位姿，反算各个关节该转多少度。是机器人控制的经典方法，不涉及学习。

- **Frechet distance**（弗雷歇距离）：衡量两条曲线相似度的度量。直觉：你和狗各走一条曲线、中间牵着绳子，两人都只能往前走不能回头，绳子需要的最短长度就是 Frechet 距离。它在乎的是"在保持时间顺序的约束下，最坏情况的点对点距离"——比简单算平均距离更严格、更适合比较轨迹。

*所以这一节是想说：术语听起来花哨，核心就三件事——把 3D 投到 2D 当标签、用 Transformer BC 学策略、用 Frechet 距离量泛化程度。*

---

## 搞不定的

### 作者明确承认的局限

1. **假设机器人底座不动**。论文只在桌面操作场景做实验，摄像头位置固定。如果是移动操作（mobile manipulation），底座移动导致摄像头视角变化，事后投影出来的曲线不再在同一个像素坐标系下——整个 hindsight labeling 方法就失效了。作者写道需要"extending the idea to mobile-manipulation scenarios that allow the robot to manipulate with whole-body control"。

2. **策略只是"尽力"跟随轨迹，不能强制约束**。如果你画的曲线绕开了易碎品，但策略可能为了完成任务还是会走过去碰到。论文承认需要后续工作支持"不同区域的硬约束"——某些位置的 guidance 应该被严格遵守（如避障），某些位置可以灵活调整。

3. **推理时 sketch 来源仍是瓶颈**。人画不 scalable；视频来源需要深度图和手动标注；LLM 来源精度不够；图像生成来源噪声太大。论文 Section B.2 透露他们实际评测时用的是"prompt engineering"方法——用一个 held-out policy 跑很多次，找到成功的那条曲线再拿去评测。这在实际部署中不可行。

### 读者应该自己看到的局限

4. **依赖摄像头标定精度**。所有的 3D → 2D 投影依赖已知的相机内外参。任何一次摄像头移动（哪怕轻微碰撞）、焦距变化、标定误差都会让 sketch 和实际场景错位。在工业部署中维护精确标定是个持续的工程负担。

5. **2D/2.5D 投影的本质信息损失**。即使是 2.5D 版本，高度信息也只是"归一化到 0~1 的相对值"——不知道绝对深度。如果新场景的高度范围（h_min 到 h_max）和训练数据完全不同（比如从桌面操作迁移到地面操作），绿色通道的语义就变了。Pick from Chair 的 2.5D 也只有 38% 就反映了这种局限。

6. **单一末端轨迹无法表达复杂任务**。一条曲线 + 几个圆圈的表达力有上限：
   - 多步骤任务："先打开抽屉、再拿出东西、再关上"需要多条曲线串联，论文未解决。
   - 条件分支："如果东西是玻璃的就轻放"——曲线表达不出 if-else。
   - 双手协调：只跟踪一个 end-effector，双臂任务没法用。
   - 长时序记忆：曲线在 t=0 时一次性给定，无法动态更新。

7. **与 RT-2 的对比有失公允**。RT-2 是语言条件的 VLA，它的强项是"知识泛化"（从网络规模数据学到新概念），而非"动作泛化"。两者在不同维度上优化。11% 这个数字不能简单理解为"RT-Trajectory 比 RT-2 强 6 倍"——如果评测改成"识别从未见过的物体并执行已有动作"，RT-2 很可能反超。

8. **数据成本看着低，实际不低**。"hindsight labeling 零成本"听起来 free，但前提是你已经有 73K 条高质量示教数据。这些数据本身是人类花了大量时间遥操作采集的。如果从零开始建一个新场景的数据集，采集成本是隐形的巨大成本。

9. **缺乏 sim-to-real 验证**。论文全部实验在真机上做（很有说服力），但没有展示从仿真到真机的迁移。如果想在仿真中大量生成 sketch 训练，再部署到真机——渲染差异、物理差异都可能导致 sketch 分布漂移。

10. **评测规模有限**。7 个新任务，每个约 64 次试验。67% 的整体成功率背后有较大方差——比如 Pick from Chair 只有 38%、Restock Drawer 的 2.5D 版反而比 2D 低（67% vs 92%，论文未解释为什么多了信息反而差了）。统计显著性未报告置信区间。

*所以这一节是想说：trajectory sketch 是降维打击没错，但它把一类问题（同底座同视角的新动作泛化）做好了，另一类问题（移动操作、约束满足、长程任务、语义泛化）原封不动。*

---

## 与别篇的关系

**直接前作：RT-1**
- RT-Trajectory 的 backbone 完全是 RT-1，连数据集都共享（73K 示教）。区别只在 conditioning 方式：语言 → 轨迹 sketch。
- 读 RT-Trajectory 之前最好先理解 RT-1 的架构（FiLM-EfficientNet → TokenLearner → causal Transformer → discretized action tokens）。

**直接对照：RT-2**
- RT-2 是用 PaLI-X 55B 做语言 → 动作的 VLA（详见 [Ch11](../guide/ch11-rt1-rt2.md)）。
- 有趣的实验发现：RT-2 在新动作任务上比 RT-1 还差（11% vs 17%）。说明 VLM 的语义先验在这个维度上不仅没帮忙，还可能因为"语言嵌入空间把运动相似的任务推远了"而误导模型。
- 这是 VLA 圈一个经典反例：**更多语义不一定更好，有时几何信号更直接**。

**同族：RT-1-Goal**
- 和 RT-Trajectory 架构相同（都是 sketch 位置拼通道），但输入是 goal image 而非 trajectory sketch。
- 论文中作为最强 baseline 出现（26%），说明"视觉条件"本身有价值，但粒度选错了——整帧图像信息过载。

**思想同源：CLIPort / PerAct / VoxPoser**
- CLIPort 把 CLIP 特征贴到像素上做 2D attention——描述的是"目标位置"。
- PerAct 用 3D voxel grid——描述的是"目标体素"。
- VoxPoser（Huang et al., 2023）用 LLM 生成 3D value map——另一种"几何中间表示"。
- 它们和 RT-Trajectory 的共同点是"不用语言直接指定动作"；不同点是 RT-Trajectory 描述的是"运动路径"而不是"目标位置/区域"。

**方法前驱：Code as Policies (CaP)**
- CaP 让 LLM 写代码生成 3D waypoint，本身可以独立执行（IK 解算器直接跟随）。
- RT-Trajectory 把 CaP 降级成"sketch 生成器"——LLM 产出的 waypoint 不直接执行，而是画成 sketch 喂给学习策略。好处是学习策略能根据视觉反馈做微调，比 IK 盲执行更鲁棒。

**后续影响**
- RT-H（Belkhale et al., 2024）：在 RT-1 之上加"动作 hierarchy"，跟 trajectory sketch 一样用中间表示当桥梁。
- PIVOT（Nasiriany et al., 2024）：把"在画面上画箭头/曲线"作为 VLM 输出的标准 prompt 形式。
- Magma / TraceVLA：2024 年后出现的一系列"trajectory-as-prompt"变体。

*所以这一节是想说：在 RT 家族里 RT-Trajectory 是"换 conditioning"那一支，跟"换骨架"（RT-2 加 VLM）和"换数据"（Open X-Embodiment）是平行的探索方向。*

---

## 和本导读的关系

RT-Trajectory 在本导读体系中的位置：

- **Ch11（RT-1 / RT-2）** 讲了 VLA 的基本范式：Transformer + 动作 token 化 + behavior cloning。RT-Trajectory 共享这个范式的骨架（RT-1），但在"任务条件"这个正交维度上做文章。读完 Ch11 后看本篇，你会发现 RT-Trajectory 的贡献和 RT-2 的贡献是正交的：RT-2 升级了模型（VLM 55B），RT-Trajectory 升级了输入信号（trajectory sketch）。两者理论上可以叠加。

- **Ch12（OpenVLA / VLAS / MLA）** 讲的是"从闭源到开源、从 55B 到 7B"的效率革命。RT-Trajectory 和它们在另一个维度上互补：OpenVLA 等关注"同样的语言条件下怎么做得更小更快"，RT-Trajectory 关注"同样的模型大小下换什么条件能泛化更好"。如果 OpenVLA 的框架支持 trajectory sketch conditioning，理论上可以得到"开源 + 小模型 + 轨迹条件"的组合。

- **Ch13（Diffusion Policy）** 讲的是动作生成机制的改造（用 diffusion 采样代替离散 token 预测）。RT-Trajectory 完全没动"怎么生成动作"这一侧——它改的是"给什么输入"。两者的改进维度互不冲突，理论上可以做一个"trajectory sketch 条件 + diffusion 动作头"的模型。

- **Ch10（SayCan / Code as Policies / Inner Monologue）** 中的 Code as Policies 在本文中有直接复用——作为 sketch 的四种推理来源之一。但 CaP 在 Ch10 中的角色是"直接控制机器人的高层接口"，在本文中降级为"sketch 生成器"。这个角色转变本身就反映了端到端学习（Ch11-12）和模块化规划（Ch10）之间的张力。

阅读建议：先读完 Ch11 的 RT-1 部分（理解骨架），再读本篇会非常顺畅。如果你对"VLA 的不同改进维度"感兴趣，可以把 RT-Trajectory（改 conditioning）、RT-2（改模型）、Diffusion Policy（改动作头）三者做平行比较——它们分别改了"输入"、"backbone"和"输出"这三个正交方向。

*所以这一节是想说：RT-Trajectory 在导读体系中属于 Ch11 的延伸实验——用最小的改动（换 conditioning）验证了"任务表达方式对泛化能力影响巨大"这一洞察。*

---

## 思考题

**Q1：假设你有一个已经训练好的 RT-Trajectory (2.5D) policy，现在要让它执行"把书从桌子上放到旁边的书架第二层"。你会怎么画这条 trajectory sketch？需要标注哪些信息？**

<details>
<summary>提示</summary>

想想这个任务涉及哪些关键动作阶段：抓取（需要 closing marker）、抬起（高度信息变化）、横向移动（可能需要拐弯绕过障碍）、下降到特定高度（书架第二层）、松开（opening marker）。2.5D 版本需要你在 GUI 中标注几个关键点的高度值——桌面高度、书架第二层高度。思考：如果不给高度信息（纯 2D），policy 怎么知道该放到第二层而不是第三层？
</details>

**Q2：论文中 RT-2 在新动作任务上比 RT-1 还差。如果你要设计一个"既能做语义泛化又能做动作泛化"的模型，你会怎么结合 RT-2 和 RT-Trajectory 的思路？**

<details>
<summary>提示</summary>

考虑双条件化（dual conditioning）：一个分支接收语言描述（处理语义泛化），另一个分支接收 trajectory sketch（处理动作泛化）。训练时两种条件都给，推理时可以只给一种或两种都给。但这引出一个新问题：两种条件冲突时怎么办？比如语言说"轻轻放"但曲线画得很急——policy 该听谁的？
</details>

**Q3：论文假设摄像头位置固定。如果要把 RT-Trajectory 扩展到移动机器人（摄像头随底座移动），你觉得最大的技术挑战是什么？你有什么思路？**

<details>
<summary>提示</summary>

核心挑战：摄像头移动后，trajectory sketch 的像素坐标系随之变化，之前画好的曲线在新视角下就"错位"了。两种可能的思路：(1) 改为在 BEV（鸟瞰图）坐标系下定义 sketch，这样不受视角变化影响；(2) 每一帧实时重投影——但这需要 SLAM 级别的实时定位。哪种方案更实际？各自的 trade-off 是什么？
</details>

**Q4：Fold Towel 任务中，所有语言/目标图 baseline 成功率为 0%，而 RT-Trajectory 达到 75%。请分析：这个 75% 的成功来源于什么？剩下 25% 的失败可能是什么原因？**

<details>
<summary>提示</summary>

成功来源：折叠动作的轨迹（抓起一角 → 弧线 → 放到另一边）和训练数据中某些 "move X near Y" 任务的轨迹在几何形状上高度相似——模型能"借用"已学的运动模式。失败可能的原因：(1) 毛巾是柔性物体，变形方式不可预测，导致夹取失败；(2) 精确的放置位置（两角对齐）需要比 sketch 提供的信息更精细的视觉反馈；(3) prompt engineering 选出的"好曲线"不一定对所有初始状态都适用。
</details>

**Q5：论文用 Frechet 距离来衡量"评测轨迹和训练轨迹的差异"。为什么选 Frechet 距离而不是更简单的欧几里得平均距离？在什么情况下两者会给出截然不同的结论？**

<details>
<summary>提示</summary>

Frechet 距离保持时间顺序（两个"行者"只能前进不能后退），而且取的是"最坏情况"而非平均。假设两条轨迹大部分很像，但在某一段（比如高度维度）有很大偏差——欧几里得平均会被"大部分相似"淹没掉那段关键差异；Frechet 距离则会被那段差异主导。对于机器人操作来说，"关键一段偏了几厘米"（比如抓取高度错了）可能意味着任务完全失败——Frechet 距离更能反映这种"一个关键错误就致命"的实际情况。
</details>

**Q6：Code as Policies 生成的 waypoint 直接交给 IK 执行（Open Drawer 任务）成功率是 71%，而交给 RT-Trajectory 只有 60%。为什么在这个任务上 RT-Trajectory 反而更差？这告诉了我们什么关于学习策略的局限？**

<details>
<summary>提示</summary>

Open Drawer 是一个"见过的任务"（训练集中有 3 个 Open Drawer 变体），而且动作路径相对简单（直线拉动）。CaP 生成的 waypoint 本来就是为 IK 设计的精确直线轨迹。IK 直接执行精确路径在简单直线任务上天然有优势——不需要"理解"，只需要"跟"。而 RT-Trajectory 把精确轨迹"降分辨率"成了像素坐标的 sketch，再让 policy "解读"这个 sketch——多了一层"翻译"反而引入了误差。教训：学习策略的优势在于处理不确定性和视觉复杂场景，但在确定性高、路径简单的任务上，经典控制方法可能更直接高效。
</details>

**Q7：如果让你用 RT-Trajectory 的思路做一个"视频预测模型"——给定初始帧和 trajectory sketch，预测后续帧——这在技术上可行吗？和直接做 video prediction 相比有什么优势？**

<details>
<summary>提示</summary>

可行性：trajectory sketch 提供了"物体运动路径"的强约束，可以作为视频生成的条件信号——类似于 ControlNet 在图像生成中的作用。优势：(1) 降低视频预测的不确定性（不用猜物体会往哪走，sketch 已经告诉了）；(2) sketch 是轻量的控制信号，比完整视频条件容易编码。但挑战是：sketch 只描述 end-effector 轨迹，不描述被操作物体的变形/旋转。想想 Fold Towel——毛巾的形变过程需要物理模拟才能准确预测，光靠夹爪路径不够。
</details>

**Q8：论文的"prompt engineering"做法（用 held-out policy 跑很多次找成功的曲线）暴露了一个根本问题。如果你是这篇论文的后续工作者，你会怎么设计一个"自动找到好 sketch"的系统？**

<details>
<summary>提示</summary>

几种思路：(1) 训练一个 "sketch quality predictor"——输入 sketch + 初始画面，输出预测成功率，然后用它筛选/优化候选 sketch；(2) 把 sketch 生成建模为优化问题——定义一个目标函数（任务完成度），用梯度或进化算法搜索 sketch 空间；(3) 闭环反馈——执行一步后观察结果，动态修改剩余 sketch（但这需要实时更新能力，论文当前架构不支持）。哪种最实际？哪种最有可能在短期内实现？
</details>

---

## 一些好奇心问答（FAQ）

**Q1：为什么 trajectory sketch 比语言更通用？语言不是更抽象吗？**

A：抽象不等于通用。语言的抽象是压缩——把动作压成"含义"，含义之间的距离不一定反映动作的实际相似性。"折毛巾"和"挪可乐罐"含义差十万八千里，但末端执行器的运动轨迹几乎一样。trajectory sketch 直接在几何空间表达，就把这种"语义不像但动作像"的迁移机会暴露给了模型。通用性的维度不同：语言在"语义泛化"维度通用，轨迹在"动作泛化"维度通用。

**Q2：那是不是任何"几何中间表示"都能起这作用？**

A：不一定。目标图（goal image）也是几何的，但因为信息量太大、太多无关像素，反而比 trajectory sketch 差（26% vs 67%）。3D voxel（PerAct）也是几何的，但计算成本太高且不适合 2D 摄像头输入。trajectory sketch 的妙处在于**几何 + 稀疏 + 时序**——只画轨迹和交互点，没有干扰像素，同时保留了时间顺序（通过颜色渐变）。

**Q3：训练时用机械爪的 3D 位置投到 2D，推理时人画的曲线和训练里的曲线"分布"一样吗？**

A：不完全一样。论文观察到推理时的人画曲线"more squiggly than the ones for training"（比训练的更弯弯绕）。但好在 trajectory 的表达粒度比较粗，policy 能容忍这种分布差异。Section 4.3 的实验验证了这一点：人类视频抠出来的曲线（比训练曲线更嘈杂）、LLM 生成的直线曲线（比训练曲线更僵硬）都能跑。这种鲁棒性来源于 policy 在训练时学会了"读取曲线的大致意图"而非"像素级精确匹配"。

**Q4：2.5D 版本只比 2D 多了一个绿色通道编码高度，为什么效果差这么多？**

A：因为"高度"在桌面操作里是高频关键信号——抓东西的高度差几厘米就抓不到，移动时"往里走"还是"往上抬"完全是两个动作。2D 版只能靠透视投影"猜"高度（靠近画面底部 = 更近/更低？不一定），遇到"在桌子之外的高度"（椅子上、抽屉凹陷里）就完全失灵。一个绿色通道加了半维信息，就打开了"区分上下"的能力。

**Q5：为什么 RT-2 比 RT-1 还差？这反常识。**

A：这是论文中最重要的反直觉发现之一。RT-2 在"语义泛化"上确实强（识别新物体、理解新指令），但这些测试的是"新动作泛化"——全新的运动模式。VLM 的海量网络知识在这里没帮忙，反而因为：(1) 模型更大、更容易过拟合语义信号而忽略底层运动模式；(2) 训练时混合了大量非机器人的网络数据，稀释了底层运动学习。提醒：**模型选型要看任务维度**，不是越大越好。

**Q6：这工作和 Diffusion Policy 是什么关系？**

A：方向正交。Diffusion Policy 是换"动作生成机制"（用扩散模型采样连续动作），改的是输出侧。RT-Trajectory 是换"任务输入方式"（轨迹 sketch 代替语言），改的是输入侧。骨架（Transformer BC）和训练方式（behavior cloning）都没变。两者理论上可以叠加：做一个"trajectory sketch 条件 + diffusion 动作头"的模型——sketch 提供粗粒度运动指导，diffusion 负责生成精细的多模态动作分布。

**Q7：Frechet distance 那一节有什么用？跟方法不直接相关啊？**

A：这是元层面（meta-level）的论证，回应的是审稿人最可能的质疑："你说你泛化到新任务了，会不会其实只是新任务的轨迹碰巧跟训练数据里某些轨迹很像、相当于 retrieval 而不是 generalization？" Frechet 距离分析证明：评测任务轨迹和训练集最近邻轨迹之间仍有显著差距（特别在高度维度），因此确实是学到了插值/外推能力，而非简单的最近邻匹配。

**Q8：人画曲线这件事 scale 上得来吗？**

A：短期内上不来，论文也承认。他们实际评测时的做法是"prompt engineering"——让一个 held-out policy 反复试验不同曲线，找到成功的那条。长期路线图是让图像生成模型自动产出 sketch——论文展示了初步结果（Fig 7），虽然目前噪声大，但作者相信随着图像生成模型进步，这条路会自然打通。另一个方向是 PIVOT（Nasiriany et al., 2024）——让 VLM 直接在画面上"画"出操作提示。

*所以这一节是想说：这篇论文经得起追问，但每个回答都暴露了一个"下一个论文该做的事"的缺口。*

---

## 如果你想再深入

**前置必读（理解骨架）**
- RT-1（Brohan et al., 2023b）：本文的 Transformer 骨架来源。不读 RT-1 就看不懂 EfficientNet → TokenLearner → Transformer 这条数据通路。
- BC-Z（Jang et al., 2022）：goal-conditioned BC 的代表，本文 baseline 思路从这一脉来。

**同期对照（不同 conditioning 思路）**
- RT-2（Brohan et al., 2023a）：语言 conditioning 的旗舰 VLA。对比读有助于理解"改 conditioning 还是改 backbone"的选择。
- VIMA（Jiang et al., 2023）：多模态 prompt 思路，跟 trajectory sketch 相似但允许更复杂的混合输入。
- VoxPoser（Huang et al., 2023）：用 LLM + 3D value map 当条件，另一种"几何中间表示"但工作在 3D 空间。
- CLIPort（Shridhar et al., 2021）：2D pixel-space attention 的早期工作，可视为 RT-Trajectory 的思想远祖。

**后续工作（接力）**
- RT-H（Belkhale et al., 2024）：在 RT-1 之上加"动作 hierarchy"，跟 trajectory sketch 一样用中间表示当桥梁。
- PIVOT（Nasiriany et al., 2024）：把"在画面上画箭头/曲线"作为 VLM 输出的标准 prompt 形式——从人画走向模型自动画。
- TraceVLA：trajectory sketch 思路在新一代 VLA 中的延续。

**工具背景**
- MediaPipe（Lugaresi et al., 2019）：本文人手姿态估计用的库。
- Code as Policies（Liang et al., 2022）：本文 LLM 路径生成的方法。
- ViT-VQGAN（Yu et al., 2022）：本文图像生成模型的 backbone。
- PaLM-E（Driess et al., 2023）：本文图像生成模型的训练范式。

**阅读顺序建议**

如果你赶时间只能读原文 4 个 section：Abstract + Fig 1 → Fig 2（具体度光谱）→ Section 3.2 + Fig 3（hindsight labeling 方法）→ Table 4（对比数字）。这四块就包含了全部核心信息。

如果你要复现，重点啃 Section 3.2 的公式 + Appendix B.1（GUI 实现）+ Appendix B.3（视频轨迹提取）+ Appendix C.1（Frechet 距离计算）。

*所以这一节是想说：把这篇放在 RT 家族 + 多模态 prompt 谱系里看，它是"几何中间表达"思路的一个干净样本——后续 PIVOT / TraceVLA 都在延续这条线。*

---

## 原文信息

**标题**: RT-Trajectory: Robotic Task Generalization via Hindsight Trajectory Sketches

**作者**: Jiayuan Gu, Sean Kirmani, Paul Wohlhart, Yao Lu, Montserrat Gonzalez Arenas, Kanishka Rao, Wenhao Yu, Chuyuan Fu, Keerthana Gopalakrishnan, Zhuo Xu, Priya Sundaresan, Peng Xu, Hao Su, Karol Hausman, Chelsea Finn, Quan Vuong, Ted Xiao

**机构**: Google DeepMind, UC San Diego, Stanford University, Intrinsic

**发表**: ICLR 2024 (arXiv: 2311.01977, November 2023)

**项目页面**: https://rt-trajectory.github.io/

```bibtex
@inproceedings{gu2024rt-trajectory,
  title={RT-Trajectory: Robotic Task Generalization via Hindsight Trajectory Sketches},
  author={Gu, Jiayuan and Kirmani, Sean and Wohlhart, Paul and Lu, Yao and Gonzalez Arenas, Montserrat and Rao, Kanishka and Yu, Wenhao and Fu, Chuyuan and Gopalakrishnan, Keerthana and Xu, Zhuo and Sundaresan, Priya and Xu, Peng and Su, Hao and Hausman, Karol and Finn, Chelsea and Vuong, Quan and Xiao, Ted},
  booktitle={International Conference on Learning Representations (ICLR)},
  year={2024}
}
```

*所以这一节是想说：这篇是 Google DeepMind 的 RT 团队出品，和 RT-1/RT-2 同一批人，发在 ICLR 2024。*
