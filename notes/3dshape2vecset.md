---
title: "3DShape2VecSet: 3D Shape Representation for Diffusion Models"
slug: 3dshape2vecset
topic: 一. VLM 基座（3D 分支）
difficulty: ⭐⭐⭐⭐
status: auto-summary
来源: papers/3dshape2vecset/paper.pdf
generated_at: 2026-05-30
---

# 3DShape2VecSet: 3D Shape Representation for Diffusion Models

> 这是机器辅助生成的客观摘要笔记。教学版精读笔记由用户按节奏触发后单独成稿。

## 一句话讲什么（TL;DR）

把 3D 形状压成「一组 512 个向量」（无坐标的 latent set），让 diffusion 模型像生成图片一样生成 3D 模型。

## 这篇论文要解决什么问题（Why this paper）

想象你在玩"用 AI 画画"的游戏：你打字"一只戴墨镜的柯基"，几秒后屏幕就出来一张图。这种"打字 → 图"的魔法背后，是一种叫 **diffusion model（扩散模型，可以理解为先把图揉成一团雪花、再一步步擦干净的算法）** 的方法，2D 图片这边玩得飞起。

但你想"打字 → 3D 模型"呢？想要一只能在 Blender 里旋转、能 3D 打印出来的柯基？这事到 2023 年都不太行。瓶颈不在 diffusion 算法本身，而在**该用什么数据格式把"3D 形状"喂给模型**——

- **voxel（体素，可以理解为 3D 版的像素，把空间切成一个个小立方体）**：分辨率每翻一倍，内存翻 8 倍，很快爆显存
- **point cloud（点云，一团飘在空中的点）**：表面是麻麻赖赖的毛刺，不是干净的曲面
- **mesh（网格，由三角面片拼成的"纸壳模型"）**：拓扑结构（哪个三角形和哪个三角形相邻）乱七八糟，神经网络很难学

之前的尝试也不够好：

- **单个全局 latent**（OccNet 那种）：像把整栋房子压成一句话——"一个有屋顶的方盒子"。回填的时候细节全丢
- **规则 3D 网格 latent**（ConvOccNet）：像一个 8×8×8 的乐高盒子，每格存一个特征向量。分辨率太低存不下细节，要变大就训不动
- **不规则网格 latent**（3DILG）：每个 latent 还要带一个 3D 坐标 (xᵢ, fᵢ)，"形状信息"和"位置坐标"绑死，二阶段 diffusion 同时学这两件事很费劲

作者要的是一个：**紧凑（不爆内存）+ 连续（表面光滑）+ transformer 友好（能直接喂进 attention）** 的表示。

![本文的下游应用：单图重建、文本生成、点云补全、类别生成](../papers/3dshape2vecset/images/img_000.jpg)

## 用了什么方法（How）

![四种 latent 表示对比：单全局向量 / 规则网格 / 不规则网格 / 本文的 latent set](../papers/3dshape2vecset/images/img_006.jpg)

### 1) Latent Set 表示——抛掉坐标的卡片盒

类比：想象你要把一个"柯基模型"装进一个**卡片盒**，里面塞 **512 张索引卡**，每张卡记录形状的一个特征（比如"耳朵尖尖的"、"四条腿圆鼓鼓"、"尾巴卷起来"）。但**这些卡不写"我是哪里的特征"**——位置信息让网络自己去学。

技术上：把形状压成纯向量集 `{fᵢ ∈ R^512}_{i=1..512}`，抛掉所有 grid 结构和坐标 anchor。这是这篇论文最核心的设计选择。

读到这里你可能在想：抛掉坐标后，怎么知道"耳朵那张卡"对应空间里的哪个位置？答案在下一步——靠 attention 自己学出来。

### 2) 从 RBF 推导到 Cross-Attention——让网络自己学相似度

类比：传统计算机图形学里有个老方法叫 **RBF（径向基函数，Radial Basis Function）**——"用一堆带权重的小球叠加出一个曲面"。公式像 `Σ λᵢ · φ(x, xᵢ)`：查询点 x 离哪个小球近，那个小球贡献就大。距离公式 φ 是人手写死的。

作者把这个公式做了一个巧妙的改造：`Σ v(fᵢ) · φ(x, fᵢ)`——把"距离查询点的近不近"换成"**注意力（attention）该看哪几张索引卡**"，让网络学出来。这正好就是 transformer 里的 **cross-attention（交叉注意力，可以理解为"x 这个查询者去问 512 张卡片，每张卡说一句，加权汇总"）**。

读到这你可能在想：所以 cross-attention 不是凭空冒出来的炫技，而是 RBF 的可学习版本？对，作者用一整节做了这个数学推导，把"老方法"和"新方法"焊在一起，挺漂亮。

### 3) Encoder：FPS + Cross-Attention——挑代表，再让代表去学

类比：班里有 2048 个学生（输入点云的 2048 个点），但你只有 512 个名额装索引卡。怎么挑？

- **方案 A（学习式 query，DETR/Perceiver 风格）**：让 512 个 query 自己学"我代表谁"，但 query 跟输入无关，每次都一样
- **方案 B（FPS + cross-attn，本文）**：用 **FPS（Farthest Point Sampling，最远点采样，可以理解为"从 2048 个点里挑出空间分布最分散的 512 个"）** 选 512 个代表点，让它们去 attend 全部 2048 个点

方案 B 的好处：query 来自输入本身（input-dependent），实验上比 A 好。论文 Table 3 里 "Point Queries" 一列就是这个版本。

### 4) KL 正则压通道——让 diffusion 训得动

类比：你写好了 512 张索引卡，但每张卡上有 512 个数字（C=512）——总共 26 万个数字。让 diffusion 在这么大空间里生成，太费劲。所以再压一道：**每张卡只留 32 个数字**（C₀=32）。

技术上：用 **KL regularization（KL 正则，可以理解为"让 latent 分布接近标准正态分布"）** 给中间加一个 VAE 风格的瓶颈，这是 Stable Diffusion 同款套路。压完之后是一个 512×32 的小阵列。

读到这你可能在想：压这么狠不会丢信息吗？作者做了消融实验（C₀ ∈ {8, 16, 32, 64}）：32 是甜点位，64 反而退化——因为 diffusion 更难在更大空间里学，压得不够反而坏事。

### 5) Latent Set Diffusion——在卡片盒上跑扩散

在压缩后的 512×32 latent set 上跑 **EDM（Karras et al. 2022 的 diffusion 训练范式）** 风格的 diffusion。Denoiser 是一个**纯 transformer**（不用 U-Net）：

- **self-attention**：让 512 张卡互相聊天，建模卡和卡之间的关系
- **cross-attention**：注入条件——
  - 类别用 embedding
  - 单视图图片用 ResNet-18 提特征
  - 文本用 BERT
  - 部分点云（用于 shape completion）用同一个 shape encoder

![Shape autoencoding pipeline：左 encoder，右 decoder](../papers/3dshape2vecset/images/img_018.jpg)

## 关键实验结果（What works）

- **IoU 0.963（C₀=32, ShapeNet 55 类平均）** — IoU（交并比）满分是 1.0，0.963 已经非常接近上限。3DILG 同条件下大概在 0.92 附近，这个差距听起来小，但在 3D 重建里"再往上 0.04"通常意味着曲面平滑度肉眼可见的提升。
- **Chamfer 距离从 0.049 降到 0.038（M 从 64 加到 512）** — Chamfer 距离是"重建表面和真实表面之间的平均距离"，越小越好。从 64 张卡加到 512 张卡，误差降了 22%；说明 latent 数量是有效的扩展轴。
- **Rendering-FID 17.08（无条件生成）** — FID 是"生成的图和真图分布有多像"，越小越好。对比同期方法：3DILG 24.83，Grid-8³ 32.78，点云 diffusion PVD 高达 270.64。本文不仅赢，而且比点云 diffusion 强**一个数量级**——这相当于从"勉强看得出是椅子"跳到"挑不出毛病的椅子"。
- **Surface-FPD 0.76（C₀=32）** — 在 C₀ ∈ {8, 16, 32, 64} 四档里最好。这条数据的意义不在数字大小，而在**它证明了"压缩比"是个 U 型曲线**：压得不够 diffusion 学不动，压得太狠信息丢失。

![无条件生成 FID/KID 对比表](../papers/3dshape2vecset/images/img_001.jpg)

## 我读完后该懂的几个术语

- **neural field（神经场）** — 一个把坐标 x 映射到属性（如 occupancy、SDF）的神经网络。类比"用一个会算的公式代替一张查找表"。本文 decoder 输出的就是 occupancy field。出现在：方法 1 推导、第 3 节。
- **occupancy（占有率）** — 给定 3D 坐标 x，输出 0~1 的"这点在物体内部吗"。类比"扫描某点是不是在土豆里面"。出现在：decoder 输出层、Marching Cubes 的输入。
- **cross-attention（交叉注意力）** — query 从一组 token 来，key/value 从另一组来。本文是"查询点 x 去问 512 张 latent 卡片"的机制。出现在：Encoder（FPS 点 attend 输入点）、Decoder（任意查询点 attend latent set）、Diffusion（latent set attend 条件 token）。
- **latent set** — 论文核心：一组无序、无坐标的潜向量集合。和 latent grid 的差别是没有空间结构强制。出现在：标题、整篇文章主语。
- **RBF（Radial Basis Function，径向基函数）** — 老牌的"用带权重的小球叠加出曲面"算法。本文用它做引入，把 cross-attention 解读成"可学习的 RBF"。出现在：方法 2 的数学推导。
- **FPS（Farthest Point Sampling，最远点采样）** — 从一堆点里挑出空间分布最分散的一个子集的算法。出现在：Encoder 选 query 时（从 2048 个采样点选 512）。
- **KL regularization / VAE bottleneck** — 让 latent 分布接近标准高斯，方便 diffusion 训练。类比"把笔记纸都裁成同一尺寸再装订"。出现在：通道压缩 C → C₀ 那一步。
- **EDM（Karras et al. 2022）** — diffusion 训练的工程范式，提供 noise schedule、损失加权、采样器等一整套。出现在：第二阶段 diffusion 训练，本文沿用其设置。
- **Marching Cubes** — 把 occupancy 网格转成三角网格的经典算法。本文生成时在 128³ 的 occupancy 网格上跑这个算法得出最终 mesh。

## 这篇论文的局限 / 我看出的疑点

- **两阶段训练成本高**：autoencoder 在 8×A100 上训 1600 epoch，diffusion 在 4×A100 上训 8000 epoch。换数据集（比如想做家具之外的物体）要重训第一阶段——对学术界算力还行，对个人开发者基本劝退。
- **M=512 是计算预算妥协，不是上限**：作者在论文里直说"更大 M 能更好但训不动"。这意味着用户实际拿到的"开源权重"上限就锁死在 512 张卡，想做更精细的形状要自己重训。
- **评测主要在 ShapeNet（人造物体）**：椅子、桌子、车、飞机这种规整工业品。对自然物体（树、石头）、关节物体（人、动物）、大场景（房间、街景）的迁移性论文没回答。embodied agent 真实场景里这是大问题——机器人要抓的可能是软的、毛茸茸的、会动的东西。
- **Rendering-FID/KID 的妥协**：把 3D 渲染成 2D 图再算 FID，作者自己也提到"这本质是从 2D 理解 3D 的妥协"。所以又补了 PointNet++ 特征空间的 FPD/KPD。两个都看才比较踏实。
- **没有显式的语义对齐**：latent set 是几何的，不直接和语言/视觉的语义空间对齐。要做"文本→3D"是靠 cross-attn 把 BERT embedding 注入 diffusion，质量取决于数据集的文字标注密度——ShapeNet 文本很稀疏，所以 text-to-3D 这条线本文偏弱。

## 与其他 12 篇的关联

- **VLM 基座（3D 分支）的代表作**：和 LLaVA、SigLIP 这种 2D vision encoder 不同，本文是给 3D 几何专门设计的 latent space。后续做 3D-aware VLA / embodied agent 时，"形状如何压成 token 序列喂给 transformer"是必须答的问题，这篇给了一个 transformer-friendly 的答案——后续工作（CLAY、Michelangelo、TripoSR 系）几乎都在这个 "latent set + cross-attention 解码" 的骨架上扩展，区别只在数据规模和条件类型。
- **和 Diffusion Policy 类工作的方法学呼应**：都是"先把模态压到 latent set / sequence，再在 latent 上跑 diffusion"。Diffusion Policy 处理的是动作序列（机器人关节角度），本文处理的是形状。这个"先压再扩"的思路同样源自 Stable Diffusion 的 latent diffusion 范式——可以说 Rombach 2022 影响了一整代下游工作。
- **和 Stable Diffusion 的关系**：直接抄了 latent diffusion 两阶段训练 + KL 正则瓶颈的结构。区别在 latent space 的形状：SD 是 2D 网格（H×W×C），本文是无序集合（N×C）。
- **和 DETR / Perceiver 的关系**：cross-attention 把任意查询点解码成属性这个套路源自 Perceiver IO；学习式 query 的对照实验也直接对标 DETR 风格的 query 设计。

## 我建议的阅读顺序

面向零基础读者：

1. **先看摘要 + Fig. 1（img_000.jpg）**——看一眼"这玩意能干啥"：单图重建、文本生成、点云补全。明确"有什么用"再深入。
2. **跳到 Fig. 2（img_006.jpg）四种 latent 表示对比**——这是全文最关键的一张图，看完你就懂"latent set" 和前人方案的区别在哪。
3. **读第 4 节（Method）的 4.1-4.2**——RBF → cross-attention 的推导，是整篇的"思想核心"。如果数学卡住，记住一句话：cross-attention 是"可学习的 RBF"。
4. **读 Fig. 6（img_018.jpg）autoencoding pipeline + 第 5 节训练设置**——把抽象方法落到代码层级。
5. **跳过 7.2-7.3 的实验细节，直接看 Table 3 + Table 4 + Fig. 11**——拿数字感受一下方法的强弱即可。
6. **回头看 2 节相关工作**——读完方法再看 related work，比一开始读它信息量大十倍。

## 为什么值得读 / 不值得读

3D 生成 / 3D 表征方向**必读**——它定义了"latent set + cross-attention 解码"这个被后续 3D 大模型（CLAY、Michelangelo、TripoSR、3DTopia 等）反复借用的范式。

如果你**只能读 1 篇 3D 生成论文**：选这篇，因为它把 RBF→attention 的推导写得最清楚，且代码开源、实验扎实。

如果你**只能读 3 篇**：这篇 + Stable Diffusion（latent diffusion 范式源头）+ NeRF（neural field 入门）。

如果你**只做 2D VLA / 语言驱动的 manipulation**：主线偏远，了解一句话 TL;DR 即可——知道"3D 那边也在用 latent + diffusion 的套路"就够了，不需要深入。
