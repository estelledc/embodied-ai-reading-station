---
title: "3D Diffusion Policy (DP3)"
slug: dp3
topic: vla
difficulty: ⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2403.03954"
venue: RSS
year: 2024
era: classic
num: 110
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

DP3（3D Diffusion Policy）把 Diffusion Policy 的输入从 2D 图像换成稀疏 3D 点云（sparse point cloud），让机器人在仅 10 条人类示教（demonstration）的情况下，就能学会一个新任务，并且对场景外观、视角、物体位置的变化更鲁棒。核心 take-away：3D 表示比 2D 图像更"抗扰"，所以同样的扩散策略骨架，换个输入形态就能把样本效率拉高一个数量级。

## 这是个什么场景 — 日常类比

想象你教一个完全没做过家务的小孩擦桌子：

- 方法 A（2D 图像）：你只给他看你擦桌子的录像。他学会的是"画面长这样的时候手往哪挪"，一旦换了房间灯光、桌子颜色变了，他就懵。
- 方法 B（3D 点云）：你让他直接戴上一种"能看到深度"的眼镜，他记住的是"桌面在我前方 30cm 处的一片平面"——换房间也无所谓，因为平面还是平面。

DP3 就是给机器人换上方法 B 的"深度眼镜"，再用扩散模型（Diffusion Model）这种擅长生成连续动作序列的工具去预测手怎么动。

## 之前的人怎么做的 — 3-5 bullet

- **Behavior Cloning + 2D 图像**（如 BC-RNN、Robomimic 系列）：拿摄像头 RGB 图当输入，神经网络回归动作。问题是数据量需求大，泛化差。
- **Diffusion Policy（CoRL 2023）**：把动作生成建模成去噪过程（denoising），动作多模态（multimodal）问题处理得好。但仍然吃 2D 图像，对外观和视角敏感。
- **Implicit Behavior Cloning / Energy-Based Models**：能力理论上不弱，但训练不稳定，工程上不如扩散模型友好。
- **基于 3D 的方法（PerAct、C2F-ARM 等）**：用 voxel 或 point cloud + Transformer，但通常需要多视角 RGB-D + 较重的网络，且没有把"扩散"和"3D"结合起来做策略学习。
- 共同痛点：要么吃数据，要么不鲁棒，要么训练不稳定。

## 这篇论文的关键想法

一句话：**保留 Diffusion Policy 的"动作去噪"框架不动，把它的视觉编码器（visual encoder）换成一个非常轻的 3D 点云编码器**。

为什么这个组合好用：

- 扩散模型负责"动作侧"——多模态轨迹拟合得好，10 条示教也能学。
- 3D 点云负责"感知侧"——天然不受光照、纹理、相机外参（extrinsics）影响，几何特征是任务真正在乎的东西。
- 作者刻意选了**稀疏点云 + 极简 MLP 编码器**而不是重型 PointNet++ / Transformer，避免在小样本下过拟合。

可以理解为：把"硬学外观 → 学动作"的链条，缩短为"读几何 → 学动作"，链条短了，所需数据也少了。

## 它怎么做的（方法）— 3-4 段

**输入处理**：单视角 RGB-D 相机捕获的深度图反投影成点云，然后做 farthest point sampling（FPS）下采样到一个固定的稀疏数量（比如几百到一千多个点；具体数字需读原文）。点云在机器人基座坐标系下表达，相当于天然做了视角对齐。

**视觉编码器**：一个非常浅的 MLP（多层感知机）作用在每个点上，再接一个简单的池化（pooling）得到一个紧凑的几何特征向量。作者论文里反复强调：**编码器越简单，小样本下越稳**。这点和 2D 视觉里"用 ResNet-50 大力出奇迹"完全相反。

**策略主体（policy backbone）**：沿用 Diffusion Policy 的 1D 卷积 U-Net（或 Transformer 变体），把"几何特征 + 机器人本体状态（proprioception）"作为条件，去噪生成一段未来动作序列（action chunk）。训练目标是标准的 DDPM/EDM 噪声回归损失。

**部署**：推理时从纯噪声开始，迭代去噪几步（比 DDPM 原始 1000 步少很多，通常用 DDIM 或更快的采样器）得到动作序列，按 receding horizon 方式执行前若干步再重规划。

## 实验在做什么

DP3 在仿真和真机上都做了大量任务，规模具体数字需读原文，但结构大致是：

- **任务集**：覆盖多个仿真 benchmark（如 Adroit、MetaWorld、DexArt 之类的灵巧操作任务）和真机任务，强调任务多样性。
- **样本效率**：每个任务只用 10 条人类示教，对比 baseline（2D Diffusion Policy、BC-RNN、IBC 等）在同等数据下的成功率。
- **泛化测试**：换场景、换物体颜色/纹理、换相机视角、加干扰物，看成功率下降多少。这是 3D 表示最能体现优势的地方。
- **消融（ablation）**：换不同点云编码器（轻 MLP vs PointNet vs 重 Transformer）、不同点数、是否加颜色信息等。一个反直觉的结论是"加颜色反而变差"——再次印证小样本下少即是多。

## 你应该懂的几个新词 — 4-6 个

- **Point cloud（点云）**：一组 3D 点的集合，每个点至少有 (x, y, z)。从 RGB-D 相机的深度图反投影就能得到。
- **Farthest Point Sampling (FPS)**：从一团点里挑出"互相离得最远"的若干个，做下采样。比随机采样更能保留几何结构。
- **Diffusion Policy**：把策略学习建模成"从噪声里去噪出动作序列"的扩散模型，CoRL 2023 那篇是 SOTA 之一。
- **Action chunk / Receding horizon**：一次预测未来若干步动作（比如 16 步），但只执行前几步（比如 8 步），然后重新预测。借鉴自 ACT/MPC 思想。
- **Proprioception（本体感知）**：机器人自己关节角度、末端位姿等状态，不依赖外部传感器。
- **DDIM / EDM**：扩散模型的快速采样器，把推理步数从 1000 降到几十甚至个位数，部署关键。

## 它和其他论文什么关系

- **直接前作**：[Diffusion Policy](diffusion-policy.md)——DP3 把它的视觉输入换掉，骨架保留。读 DP3 之前必须先理解 DP。
- **后作 / 同期 3D 系列**：[iDP3](idp3.md)（Improved DP3）进一步在人形机器人上做大规模真机；[Equibot](equibot.md) 把等变性（equivariance）加进 3D 策略。
- **2D 同期对手**：ACT（[Mobile ALOHA](mobile-aloha.md)、[ACT (ALOHA)](act-aloha.md)）走的是 Transformer + 双臂 + 大量数据的路线，思路和 DP3"小样本 + 3D"几乎正交。
- **VLA 大模型路线**：[OpenVLA](openvla.md)、[π0](pi0.md) 用大模型 + 海量数据卷泛化；DP3 代表的是另一条路——结构化感知 + 小数据。两条路线在 2024-2026 之间是 manipulation 领域的两大风格。
- **3D 表示派系**：和 PerAct、RVT 那种 voxel 路线相比，DP3 选稀疏点云 + 极轻编码器，是"反向工程化"的代表。

## 我建议这样读 — 3-4 步

1. **先读 [diffusion-policy.md](diffusion-policy.md)**：DP3 几乎所有动作侧设计都是继承的，没这个底子读 DP3 会看不懂为什么 U-Net 那么搭。
2. **看 DP3 论文 Section 3（方法）+ Figure 2（pipeline）**：重点看点云怎么进、编码器多简单、条件怎么注入扩散模型。
3. **跳到实验里的"泛化"和"消融"两节**：这是 DP3 真正值钱的部分——为什么 3D 比 2D 鲁棒、为什么不加颜色、为什么轻编码器更好。
4. **可选**：扫一眼 [iDP3](idp3.md) 看 2024 下半年这条线怎么发展到人形机器人，理解 DP3 的影响力。

## 为什么值得读

- **样本效率的存在性证明**：在"机器人学习要 10 万条数据"的叙事下，DP3 用 10 条示教做到一些任务，这本身是个强信号——表示形式比数据量更关键。
- **反直觉的"少即是多"**：轻编码器 > 重编码器、纯几何 > 几何+颜色。这两个发现在小样本机器人学习里反复被后续工作复现。
- **工程友好**：单视角 RGB-D + 一个 MLP + 一个 U-Net，组件都不重，复现门槛低，是入门 3D manipulation 的极好起点。
- **占位**：在 VLA / 大模型路线之外，DP3 代表了"结构化先验 + 小数据"这条路。理解机器人学习全景必须读它。
