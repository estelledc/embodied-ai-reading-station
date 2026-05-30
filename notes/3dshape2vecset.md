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

现实里有什么麻烦：2D 图片用 diffusion 已经生成得很好（Stable Diffusion 那一套），但 3D 形状一直追不上。卡点在「3D 该用什么数据格式喂给模型」——voxel（体素）太占内存（分辨率立方增长），point cloud（点云）容易长出毛刺、不是干净的曲面，mesh（网格）拓扑乱七八糟难学。

为什么之前的方法不够：

- 单个全局 latent（OccNet 那种）：像把整个房子压成一句话描述，细节全丢
- 规则 3D 网格 latent（ConvOccNet）：像一个 8×8×8 的乐高盒子，分辨率太低存不下细节，再大就训不动
- 不规则网格 latent（3DILG）：每个 latent 还要带一个 3D 坐标 (x_i, f_i)，结构耦合复杂，二阶段 diffusion 难训

作者要的是：紧凑、连续、表面光滑、还能 plug 进 transformer 的表示。

## 用了什么方法（How）

![Latent set 表示对比](../papers/3dshape2vecset/images/img_006.jpg)

- **Latent Set 表示** → 类比一本 512 张索引卡的卡片盒，每张卡记录形状的一个"特征"，但不写"这是哪里的特征"——位置信息让网络自己去学。这一步抛掉了所有 grid 结构和坐标 anchor，把形状压成纯向量集 `{f_i ∈ R^512}_{i=1..512}`。
- **从 RBF 推导到 Cross-Attention** → 类比传统的"用一堆带权重的小球叠加出一个曲面"（径向基函数 RBF）。作者把 RBF 公式 `Σ λ_i · φ(x, x_i)` 改造成 `Σ v(f_i) · φ(x, f_i)`，相似度 φ 用 cross-attention 算——也就是说"查询点 x 该看哪几张索引卡"由网络学出来，而不是人工按距离写死。
- **Encoder：FPS + Cross-Attention** → 类比从 2048 个采样点里先用最远点采样（FPS）挑出 512 个代表点当 query，再让它们去 attend 全部 2048 个点，把信息压进 512 个 latent。比"学一组可学习 query"（DETR/Perceiver 风格）效果更好，因为 query 来自输入本身。
- **KL 正则压通道** → 类比 Stable Diffusion 的 VAE 中间瓶颈。把 latent 通道从 C=512 再压到 C₀=32，让二阶段 diffusion 训得动。
- **Latent Set Diffusion（二阶段）** → 在压缩后的 512×32 latent set 上跑 EDM 风格的 diffusion，denoiser 是纯 transformer（self-attn 学 latent 之间关系，cross-attn 注入条件：类别 / 单视图图片用 ResNet-18 / 文本用 BERT / 部分点云用同一个 shape encoder）。

![Shape autoencoding pipeline](../papers/3dshape2vecset/images/img_018.jpg)

## 关键实验结果（What works）

- **IoU 0.963（C₀=32, ShapeNet 55 类平均）** — 比 3DILG 等 baseline 显著接近上限 1.0
- **Chamfer 0.038** — 重建误差，从 M=64 的 0.049 降到 M=512 的 0.038
- **Rendering-FID 17.08（无条件生成）** — 比 3DILG 24.83、Grid-8³ 32.78 大幅领先；比点云 diffusion PVD 的 270.64 强一个数量级
- **Surface-FPD 0.76（C₀=32）** — 在四档 C₀ 里最好，C₀=64 反而退化（说明压得不够 diffusion 反而更难训）

## 我读完后该懂的几个术语

- **neural field（神经场）** — 一个把坐标 x 映射到属性（如 occupancy、SDF）的神经网络。类比"用一个会算的公式代替一张查找表"。
- **occupancy（占有率）** — 给定 3D 坐标 x，输出 0~1 的"这点在物体内部吗"。类比"扫描某点是不是在土豆里面"。
- **cross-attention（交叉注意力）** — query 从一组 token 来，key/value 从另一组来。这里就是"查询点 x 去问 512 张 latent 卡片"的机制。
- **latent set** — 论文核心：一组无序、无坐标的潜向量集合。和 latent grid 的差别是没有空间结构强制。
- **KL regularization / VAE bottleneck** — 让 latent 分布接近标准高斯，方便 diffusion 训练。类比"把笔记纸都裁成同一尺寸再装订"。
- **EDM** — Karras 2022 的 diffusion 训练范式，本文 denoiser 沿用其 noise schedule 和损失。
- **Marching Cubes** — 把 occupancy 网格转成三角网格的经典算法。生成阶段在 128³ 网格上跑这个出表面。

## 这篇论文的局限 / 我看出的疑点

- 两阶段训练成本高：autoencoder 在 8×A100 上训 1600 epoch，diffusion 在 4×A100 上训 8000 epoch。换数据集要重训第一阶段。
- M=512 是计算预算妥协，不是上限——更大 M 能更好但作者训不动；说明"latent set 越多越准"这件事还有上探空间。
- 评测主要在 ShapeNet（人造物体），对自然物体 / 关节物体 / 大场景的迁移性论文没回答。
- Rendering-FID/KID 是把 3D 渲成 2D 图再算 FID，作者自己也提到"这本质是从 2D 理解 3D 的妥协"，所以补了 PointNet++ 特征的 FPD/KPD。

## 与其他 12 篇的关联

- **VLM 基座（3D 分支）的代表作**：和 LLaVA、SigLIP 这种 2D vision encoder 不同，本文是给 3D 几何专门设计的 latent space。后续做 3D-aware VLA / embodied agent 时，"形状如何压成 token 序列"是必须答的问题，这篇给了一个 transformer-friendly 的答案。
- **和 Diffusion Policy 类工作的方法学呼应**：都是"先把模态压到 latent set / sequence，再在 latent 上跑 diffusion"。Diffusion Policy 处理的是动作序列，这里处理的是形状。

## 为什么值得读 / 不值得读

3D 生成 / 3D 表征方向必读——它定义了"latent set + cross-attention 解码"这个被后续 3D 大模型（如 CLAY、Michelangelo、TripoSR 系）反复借用的范式。如果只做 2D VLA / 语言驱动的 manipulation，主线偏远，了解一句话 TL;DR 即可。
