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

整篇方法可以拆成 5 个递进设计，每一个都对应一个具体决策。下面逐个展开。

### 1. Latent Set 表示 — 抛掉坐标的「卡片盒」

**类比**：把柯基模型装进一个卡片盒，里面塞 512 张索引卡。每张卡只记一个特征（"耳朵尖尖"、"四条腿圆鼓鼓"），**不写"我是哪里"**——位置让神经网络自己学。

**具体在干什么**：把任意 3D 形状（mesh / 点云 / 隐式表面都行）压成一个无序、无坐标的向量集合 `{fᵢ ∈ R^512}_{i=1..512}`。和 latent grid（如 ConvOccNet 的 8×8×8）相比，没有空间结构强制；和 3DILG 的 (xᵢ, fᵢ) 不规则网格相比，去掉了显式的位置坐标。

**关键公式（人话翻译）**：
- 论文 Eq. 15 写的是 `{fᵢ ∈ R^C}_{i=1}^M` —— 翻译："形状 = 一组共 M=512 张、每张 C=512 维的卡片，没有任何下标含义。"
- 这个看似简单的去坐标化，是论文的核心 thesis，所有后续设计都在围绕它服务。

**超参**：M=512（卡片数）、C=512（每张卡维度）。

**为什么这么设计**：
- 几何上有个观察：3D 形状的"特征"和"位置"本来就纠缠（一只耳朵在头顶才是耳朵），强行解耦成 (x, f) 反而让网络多学一道映射。
- 工程上，去掉坐标后 latent 就是一个 set/sequence，**天然适配 transformer**，不需要 3D 卷积或 trilinear 插值这种为 grid 量身定做的 op。
- 第二阶段的 diffusion 就只需要在 R^(512×32) 上学，不必同时学几何特征 + 空间坐标两件事。

**消融告诉我们什么**：Table 3 显示同样网络结构下，"Point Queries"（保留输入依赖）比"Learned Queries"（学习式 query，类似 DETR）在所有 7 个大类上都更优；这说明输入相关的 query 不仅在训练时收敛快，泛化也更稳。

### 2. 从 RBF 推导到 Cross-Attention — 让网络自己学相似度

**类比**：老牌计算机图形学的 **RBF（Radial Basis Function，径向基函数）** 像"一堆带权重的小球叠加出曲面"——每个小球管自己一片区域，查询点 x 落到哪儿，由人写死的距离公式 `φ(x, xᵢ) = φ(‖x − xᵢ‖)` 决定。本文把"距离公式"换成"网络自学的相似度"。

**具体在干什么**：作者用一节数学（Sec. 4）把 cross-attention 的形式 *推导成* RBF 的可学习版本。这不是在炫技，而是为了说服读者："我们不是在硬塞一个 transformer 进 3D，是把这个领域 30 年来的老方法（RBF）写成现代形式。"

**关键公式（人话翻译）**：
- 原文 Eq. 6（RBF）：`Ô(x) = Σ λᵢ · φ(x, xᵢ)` —— "查询点 x 的占有率 = 每个锚点 xᵢ 贡献的加权和，权重靠人写的距离 φ。"
- 原文 Eq. 13（本文）：`F̂(x) = Σ v(fᵢ) · softmax(q(x)·k(fᵢ)/√d)` —— "查询点 x 的特征 = 每张卡 fᵢ 贡献的 value，权重 = softmax(query 跟 key 的内积)。query 由 x 算出，key/value 由 fᵢ 算出。"
- 对照下来，cross-attention 就是把 RBF 里手写的 φ 换成神经网络学的 q·k；λᵢ 换成 v(fᵢ)。**RBF 的"小球叠加"骨架完整保留，只把"小球的形状和权重"交给学习。**

**超参**：transformer 默认设置（多头数、前馈维度等论文按 Vaswani 2017 的标准走，没特别讲）。

**为什么这么设计**：和"先压缩再解码"的 latent diffusion 范式（Stable Diffusion）天然兼容；cross-attention 是 transformer 已经被反复验证过的模块，没必要重新发明轮子。

**消融**：本节没有专门的消融，但第 8 节整体证明了"basic cross-attn 解码"已经能把 IoU 从 OccNet 的 0.781 推到 0.963。

### 3. Encoder 设计 — FPS 选代表 + Cross-Attention 聚合

![两种 encoder query 设计：左为 learnable query（DETR 风格），右为 point query（FPS 子采样）](../papers/3dshape2vecset/images/img_017.jpg)

**类比**：班里 2048 个学生（输入点云），只有 512 个名额装索引卡。两种选法：(A) 让 512 个空槽自学"我代表谁"——可这些槽和输入无关，每张图都用同一组槽；(B) 用 **FPS（Farthest Point Sampling，最远点采样）** 从 2048 个点里挑出空间分布最分散的 512 个，让它们去 attend 全部 2048 个点。

**具体在干什么**：
- 输入：mesh 表面均匀采 2048 点。
- FPS 选 M=512 个代表 → 拿这 512 个的 positional embedding 作 query。
- Cross-attention 让 query 去 attend 整个 2048 点的 positional embedding（K, V）。
- 输出：512×512 的 latent set。

**关键公式（人话翻译）**：
- 原文 Eq. 17：`Enc_points(X) = CrossAttn(PosEmb(X₀), PosEmb(X))` —— "把 FPS 选出的 512 个点的位置编码当 query，去问全部 2048 个点的位置编码（key 和 value），cross-attention 出 512 张卡片。"
- 注意 Q/K/V 都来自 *position embedding* 而不是原始坐标——这一步把"坐标"翻译成了"特征"。

**超参**：N=2048（输入点数）、M=512（输出卡数）、C=512（每张卡通道）；注意 M 不是越大越好，作者自陈"M strongly affects training time"，512 是计算预算妥协。

**为什么这么设计**：input-dependent query 的好处是 query 包含了"这只柯基大致长啥样"的先验，cross-attention 只需要做"细化"，比让随机 query 从零学起更稳。FPS 比随机采样的好处是分布均匀，避免 query 全挤在一只耳朵上。

**消融告诉我们什么**：Table 3 在 7 个类上 Point Queries 全面优于 Learned Queries（例如 chair 类 IoU 0.954 vs 0.948，差距虽小但稳定）。这里再次印证"让输入参与 query"是有效的归纳偏置（inductive bias）。

### 4. KL 正则压通道 — 让第二阶段 diffusion 训得动

![KL regularization 模块：FCμ 和 FCσ 把 C=512 通道压到 C₀=32](../papers/3dshape2vecset/images/img_018.jpg)

**类比**：512 张卡，每张 512 个数字 = 26 万个数字。让 diffusion 在 26 万维空间里学，相当于让你在一本字典里盲打——理论可行实际崩溃。所以再压一道：**每张卡只留 32 个数字**（C₀=32），整个形状压到 16384 维。

**具体在干什么**：
- 在 encoder 输出（512×512）后，加一个 VAE 风格的 KL 瓶颈：两条线性层分别预测 μᵢ 和 log σᵢ²。
- reparametrize：`z_i = μᵢ + σᵢ · ε`，ε ~ N(0,1)。
- 给 KL loss 一个权重 0.001（很小，主要为了让 latent 分布"软性靠近"高斯）。
- 解码时再线性升回 C=512，接 self-attention 和 cross-attention decoder。

**关键公式（人话翻译）**：
- 原文 Eq. 20（KL loss）：`L_reg = (1/(M·C₀)) · Σᵢⱼ ½(μᵢⱼ² + σᵢⱼ² − log σᵢⱼ²)` —— "把每个 latent 元素的 (μ, σ) 拉向 (0, 1)，使整个 latent 分布近似标准正态。"
- 加权进总 loss 的形式是 `L_total = L_recon + 0.001 · L_reg`——重建是主菜，KL 是调味。

**超参**：KL 权重 = 0.001；C₀ 推荐值 = 32（消融过 1, 2, 4, 8, 16, 32, 64）；FC_μ / FC_σ / FC_up 都是单层线性。

**为什么这么设计**：
- 第一阶段不加 KL 也能重建得很好（IoU 0.964 @ C₀=64），但 latent 分布"散"；第二阶段 diffusion 在散分布上学不动。
- 加 KL 后 latent 落在标准正态附近，diffusion 的 noise schedule（设计针对高斯）就生效了。这是 Stable Diffusion 的同款 trick。

**消融告诉我们什么（Table 5）**：
- C₀=1: IoU 0.727（崩了）；C₀=4 起就达 IoU 0.957（够用）；C₀=64 顶到 0.964。
- 关键反转在第二阶段：C₀=32 的 Rendering-FID = 17.08（最佳），C₀=64 反而退化到 24.24。
- **结论：第一阶段重建越压越损，但损失幅度很小；第二阶段 diffusion 越压越好（在某个甜点位前），过这个甜点位再压才会双输。**32 就是这个 U 型曲线的底。

### 5. Latent Set Diffusion — 在卡片盒上跑扩散

**类比**：之前 4 步是"把柯基塞进卡片盒"，这一步是"教模型怎么从一堆雪花生成新的卡片盒，再解码出新柯基"。和 Stable Diffusion 在 64×64 latent grid 上跑 diffusion 是同一个套路，只是 latent space 换成了 512×32 的 set。

**具体在干什么**：
- 在压缩后的 z ∈ R^(512×32) 上跑 EDM（Karras et al. 2022）风格 diffusion。
- Denoiser 是**纯 transformer**（无 U-Net）：每层 = self-attention + (可选) cross-attention。
- 条件 C 通过 cross-attention 注入：
  - 类别 → 55 个 learnable embedding 选一个
  - 单视图图片 → ResNet-18 提的全局特征向量
  - 文本 → BERT 的 [CLS] / 全局特征向量
  - 部分点云（shape completion）→ 同一个 shape encoder（Sec 5.1）输出的 latent set
- 采样时只需 18 步（EDM 的 ODE/SDE solver）。

**关键公式（人话翻译）**：
- 原文 Eq. 23（denoising loss）：`L = E_{n_i ~ N(0, σ²I)} (1/M) · Σᵢ ‖Denoiser({zᵢ + nᵢ}, σ, C)ᵢ − zᵢ‖²` —— "随机加噪声，让网络去掉噪声还原原 z，每个噪声强度 σ 都要训。"
- 翻译：跟图像 diffusion 一模一样，只是 z 从 2D feature map 换成无序 set。

**超参**：4×A100、batch 256、T=8000 epochs、lr 线性 warmup 到 1e-4（前 800 epoch）后 cosine 退火到 1e-6；EDM 默认 σ schedule、loss 加权、Heun solver；采样 18 步。

**为什么这么设计**：
- 用 transformer 而非 U-Net，是因为 latent 是 set 不是 grid，U-Net 的局部性偏置反而是错的。
- 用 EDM 而非 DDPM 经典版本，是因为 EDM 在 2D 也是当时 SOTA 的训练范式（noise schedule 更稳、采样更省）。
- 用 cross-attention 注条件，是 Stable Diffusion 同款；条件 encoder（ResNet-18 / BERT）都是预训练模型直接拿来用，论文不重训。

**消融告诉我们什么**：Table 6 同时调 C₀（latent 大小）和方法选择，证明 (a) 本文 latent set 比 Grid-8³ 强、(b) C₀=32 在生成阶段最优、(c) Rendering-FID 17.08 vs PVD 270.64 的 16× 差距说明 *latent 比直接在点云上跑 diffusion 强一个数量级*。

## 关键实验结果（What works）

每条数据 4 行：**具体设置 / 数字 / 对比 / 现实意义**。

### IoU 0.963（重建质量）

- **设置**：ShapeNet-v2 55 类全集；deterministic autoencoder（不带 KL）；M=512 latent；Point Queries 模式；测试集 50k 占有率查询点。
- **数字**：averaged IoU 0.963；7 大类（airplane / chair / table / car / sofa / bench / lamp）单类都在 0.95 以上。
- **对比**：OccNet 0.781 → ConvOccNet 0.884 → IF-Net 0.924 → 3DILG 0.949 → 本文 0.963。和 3DILG（前 SOTA）的差距是 +0.014，看似小，但 IoU 接近 1 时每 0.01 都极难。
- **现实意义**：IoU 高于 0.95 意味着重建的占有率分布和真实分布几乎重合，配合 Marching Cubes 出来的 mesh 在 Blender 里肉眼挑不出明显毛病；这是后续 diffusion 训练的"地基"——地基不稳第二阶段也立不起来。

### Chamfer 距离从 0.049 降到 0.038（M 消融，Table 4）

- **设置**：固定 C=512、Point Queries、ShapeNet-55 全集；只变 M ∈ {64, 128, 256, 512}。
- **数字**：M=64 → 0.049；M=128 → 0.043；M=256 → 0.039；M=512 → 0.038。
- **对比**：从 64 翻到 512（8×）误差降 22%，但 256→512（2×）只降 2.5%——明显的边际递减。
- **现实意义**：M=512 是计算预算的甜点，不是物理上限。如果你有 16×A100 而不是 8×，理论上可以试 M=1024，但收益要打折。**对个人开发者：这意味着开源权重的"分辨率上限"基本锁死在 512**。

### C₀=32 是双阶段的最优甜点（Table 5 + Table 6）

- **设置**：autoencoder 阶段比 IoU；diffusion 阶段比 Rendering-FID / Surface-FPD。
- **数字**：第一阶段 IoU C₀=8/16/32/64 = 0.960/0.962/0.963/0.964（差距小到忽略）；第二阶段 Rendering-FID = 28.25/27.26/**17.08**/24.24（C₀=32 最优，64 反而退化）。
- **对比**：单看 autoencoder 重建质量"越大越好"，单看 diffusion 生成质量"32 最好"。这两条曲线交叉点决定了 C₀=32 的最佳压缩比。
- **现实意义**：这是论文最有指导价值的发现——**latent diffusion 的瓶颈维度是个非平凡 U 型曲线**。如果你迁移到自己的数据，C₀ 不能照抄 32，得自己扫一遍。

### Rendering-FID 17.08（无条件生成，对比 5 个 baseline）

- **设置**：ShapeNet-55 无条件 unconditional generation；每个 shape 渲染 10 个视角算 FID；与 baseline 同样 protocol 重训。
- **数字**：本文 17.08（C₀=32）；3DILG 24.83；Grid-8³ 32.78；PVD（point cloud diffusion）**270.64**；Surface-FPD 同样 0.76 vs 3DILG 1.89 vs PVD（无 normal 的版本）2.65。
- **对比**：比同期 3DILG 强 1.45×；比 Grid-8³ 强 1.92×；比 PVD 强 **15.85×**（一个完整数量级）。
- **现实意义**：1.5× 的差距在论文里是 incremental win，15× 是范式胜利。这条数字基本宣告了"不要在原始点云上跑 diffusion，要在 latent set 上跑"——后续 3D 大模型（CLAY / Michelangelo / TripoSR）也都遵循这条结论。

### Category-conditioned Recall 0.86（Table 9，多样性指标）

- **设置**：chair 类，category-conditioned generation；用 Precision/Recall 评估生成多样性（Sajjadi 2018 框架）。
- **数字**：本文 Precision 0.86 / Recall **0.86**；3DILG 0.87 / 0.65；NeuralWavelet 0.89 / 0.57；AutoSDF 0.42 / 0.23。
- **对比**：Precision 大家都接近天花板（0.85+）说明谁都能生成"看起来像椅子"的东西；Recall 拉开 0.20+ 的差距说明只有本文能覆盖训练集大部分多样性。
- **现实意义**：高 Recall 意味着模型不是 mode collapse 到几把"标准椅子"。这对下游 embodied agent 重要——机器人遇到的椅子样式是 long-tail 的，覆盖能力比平均质量更关键。

![无条件生成 FID/KID 对比表 + category-conditioned 生成示例](../papers/3dshape2vecset/images/img_001.jpg)

![Category-conditioned generation 可视化：飞机 / 椅子 / 桌子](../papers/3dshape2vecset/images/img_002.jpg)

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

## 数据集 / 实验设置详情

### 主数据集
- **ShapeNet-v2**（Chang et al. 2015）：55 类人造物体，约 5 万个 3D mesh 模型。本文是核心 benchmark。
- **train/val/test split**：沿用 3DILG（Zhang et al. 2022）的划分。论文未给出绝对数量，按 3DILG 大致是 70/10/20。
- **预处理**（沿用 OccNet）：每个 mesh → watertight mesh → 归一化到 [-1, 1]³ 包围盒 → 表面采样 500k 点 → 体内随机采样 500k 点（带 occupancy 标注）+ 近表面采样 500k 点。
- **autoencoder 输入**：每次 iteration 取 N=2048 表面点；query 点 1024 个来自整个 [-1,1]³ + 1024 个来自近表面。

### 任务-specific 数据
- **Single-view 重建**：3D-R2N2（Choy et al. 2016）的 2D 渲染，每个 shape 24 个随机视角，分辨率 224×224。
- **Text-to-3D**：ShapeGlot（Achlioptas et al. 2019）的文本提示。注意本文也吐槽这是最弱的一条线，因为 ShapeGlot 文本太稀疏。
- **Shape completion**：partial point cloud 通过对原 point cloud 切片（patch sampling）人工合成。

### 硬件 / 训练时长
| 阶段 | GPU | batch | epoch | 学习率 | 时长（论文未明说，按经验估） |
|---|---|---|---|---|---|
| Stage 1: autoencoder | 8×A100 | 512 | 1600 | warmup→5e-5（前 80 ep），cosine 退火→1e-6 | ~3-5 天 |
| Stage 2: diffusion | 4×A100 | 256 | 8000 | warmup→1e-4（前 800 ep），cosine 退火→1e-6 | ~5-7 天 |
| 采样 | 单卡 | - | - | - | EDM solver 18 步 |

### Baseline
- **重建 baseline**：OccNet（global latent）/ ConvOccNet（regular grid）/ IF-Net（multiscale grid）/ 3DILG（irregular grid）。这条线代表 latent 表示 4 种典型路线。
- **生成 baseline**：PVD（point cloud diffusion）/ 3DILG（autoregressive）/ NeuralWavelet（frequency-domain diffusion）/ Grid-8³（latent grid 类比 AutoSDF）/ AutoSDF / 3DShapeGen。
- **图像/文本条件 baseline**：OccNet / IM-Net（image conditioned）；AutoSDF（text conditioned，本文实际上没真正的对手，因为本文是首个 text-to-3D diffusion）。

### 评测指标
- **重建**：IoU（占有率交并比）/ Chamfer 距离 / F-score。
- **生成**：Rendering-FID/KID（每形状渲染 10 视角进 Inception 算 FID/KID）+ Surface-FPD/KPD（用 PointNet++ 提的 4096 点特征算 FPD/KPD，绕开 2D 视角妥协）+ Precision/Recall（Sajjapdi 2018）+ MMD-CD/EMD + COV-CD/EMD（点云距离类指标）。

## 关键公式 / 算法（人话翻译版）

### 公式 1：RBF 表示（Eq. 6）— 起点

```
Ô_RBF(x) = Σᵢ λᵢ · φ(x, xᵢ)        其中 φ(x, xᵢ) = φ(‖x − xᵢ‖)
```

**人话翻译**：要预测查询点 x 的占有率 Ô，方法是把所有锚点 xᵢ 的"贡献"加起来。每个锚点贡献 = 它的权重 λᵢ × 它跟 x 的距离函数 φ。这个 φ 是人写死的（高斯核 / thin-plate spline 等）。

**每一项的来源**：
- `xᵢ ∈ R³`：表面采样点（人手工或 FPS 选）
- `λᵢ ∈ R`：解一个线性方程组得到，使得 Ô(xⱼ) ≈ ground truth occupancy
- `φ`：图形学经典选择，本文不用，只用来引入

**为什么提它**：作者要把"老方法"摆在前面，让读者意识到 cross-attention 不是凭空冒出来的。

### 公式 2：3DILG 的 kernel regression（Eq. 10）— 上代 SOTA

```
fx = Σᵢ fᵢ · φ(x, xᵢ) / Z(x, {xᵢ})        Ô_3DILG(x) = MLP(fx)
```

**人话翻译**：3DILG 把 RBF 升级成"特征版"——每个锚点 xᵢ 不再只存一个权重 λᵢ，而是存一个 C 维特征向量 fᵢ。查询点 x 的特征 fx = 所有锚点特征按距离加权汇总，再过 MLP 出占有率。

**每一项的来源**：
- `(xᵢ, fᵢ)`：3DILG encoder 通过 KNN + autoregressive 学出来的不规则网格
- `φ(x, xᵢ)`：仍然是手写距离函数
- `Z`：归一化因子（让权重和为 1）
- `MLP`：神经网络，把 C 维特征映射到 [0, 1] 占有率

**为什么提它**：作为本文要"超越"的对照组——"我们继承了它的 latent 形式，但把手写 φ 换成可学的 cross-attention，并且砍掉了 xᵢ 这个累赘。"

### 公式 3：本文的 cross-attention 表示（Eq. 13 + 14）— 终点

```
F̂(x) = Σᵢ v(fᵢ) · exp(q(x)·k(fᵢ)/√d) / Z(x, {fᵢ})
Ô(x) = FC(F̂(x))
```

**人话翻译**：和 3DILG 比，三处变化：
1. 加权函数从手写 φ 换成 `softmax(q(x)·k(fᵢ)/√d)`——cross-attention 的标准形式。
2. 锚点特征 fᵢ 上加一个 v(·) 投影，让网络可以重新组合。
3. **彻底丢掉了 xᵢ**——查询点 x 不再去问"哪个锚点离我近"，而是问"哪张卡片跟我语义上像"。

**每一项的来源**：
- `q(·), k(·), v(·)`：三个独立的线性投影层（attention 标配）
- `fᵢ`：encoder 输出的 latent set，无空间含义
- `q(x)`：x 先过 PosEmb（位置编码，把 3D 坐标编成高维向量），再过 q
- `FC`：单层 fully connected，把 d 维特征映射到占有率 ∈ [0, 1]
- `√d`：scaled dot-product attention 的标准缩放

**为什么这么写**：保留 RBF / 3DILG 的"加权汇总"骨架，把所有手写的"距离 / 相似度"全部交给学习。**这一步是论文的精髓**——所有性能提升都源于它。

### 公式 4：KL 正则（Eq. 20）— 第二阶段能跑的前提

```
L_reg = (1/(M·C₀)) · Σᵢⱼ ½ · (μᵢⱼ² + σᵢⱼ² − log σᵢⱼ²)
```

**人话翻译**：让每个 latent 元素的 (μ, σ) 都向 (0, 1) 靠拢——这个公式本质是把 latent 分布 N(μ, σ) 和标准正态 N(0, 1) 的 KL 散度展开（去掉常数项）。

**每一项的来源**：
- `μᵢⱼ, σᵢⱼ`：encoder 输出 fᵢⱼ 经 FC_μ, FC_σ 投影
- `M=512, C₀=32`：归一化因子，让 loss 量级和数据集大小无关
- 总 loss：`L = L_recon + 0.001 · L_reg`，权重 0.001 是经验值

### 公式 5：EDM denoising loss（Eq. 23）— 第二阶段训练目标

```
L = E_{nᵢ ~ N(0, σ²I)} (1/M) · Σᵢ ‖Denoiser({zᵢ + nᵢ}, σ, C)ᵢ − zᵢ‖²
```

**人话翻译**：随机抽一个噪声强度 σ（从 EDM 的分布里抽，重点采样高难度区间）→ 给每个 zᵢ 加噪声 nᵢ → 让 transformer denoiser 去噪还原 zᵢ → 算 MSE。条件 C（类别 / 图 / 文 / 部分点云）通过 cross-attention 注入 denoiser。

**每一项的来源**：
- `zᵢ`：第一阶段训好的、KL 正则后的 latent
- `nᵢ`：高斯噪声，方差由 σ 控制
- `σ`：EDM 的 log-normal 噪声 schedule，σ ∈ [0.002, 80]（按 EDM 默认）
- `Denoiser`：纯 transformer，每层 = self-attn + (有条件时) cross-attn
- `C`：可选条件信息

## 实操 FAQ（如果你想复现）

### 这模型多大？显存要多少？

- 论文未给参数量。粗略估算：autoencoder 8 个 self-attention 层 × C=512 维 ≈ 50-100M 参数；diffusion denoiser 类似规模。整个 pipeline 大概 100-200M 参数。
- 训练显存：8×A100（80GB）batch 512 表明单卡需要 ~40-50GB；batch 64 单卡 ≈ 6-10GB（粗估）。
- 推理：M=512、C₀=32 的 latent 加上 18 步采样，单 A100 可以单卡跑，应该 < 24GB。
- 想在 RTX 3090 / 4090 上推理：可行（采样阶段）；想训练：需要多卡 + 大量耐心。

### 数据在哪？要授权吗？

- **ShapeNet-v2**：[shapenet.org](https://shapenet.org)，注册学术账号免费下载；商用需联系作者。
- **3D-R2N2 渲染**：作者主页有 link，开源。
- **ShapeGlot 文本**：Achlioptas 主页开源。
- 注意：ShapeNet 协议有学术-only 限制，做产品落地不能直接用。

### 代码 repo 在哪？

- 官方主页：[https://1zb.github.io/3DShape2VecSet/](https://1zb.github.io/3DShape2VecSet/)（论文 abstract 末尾给的链接）
- GitHub repo（推断）：[https://github.com/1zb/3DShape2VecSet](https://github.com/1zb/3DShape2VecSet)（PyTorch 实现）
- 含训练脚本、预处理 ShapeNet 的代码、预训练 checkpoint。

### 训练一次烧多少卡时？

- Stage 1 autoencoder：8×A100 × 1600 epoch ≈ **3-5 天**（按 batch 512、ShapeNet-55 全集估算），即 **600-1000 GPU-hours**。
- Stage 2 diffusion：4×A100 × 8000 epoch ≈ **5-7 天**，即 **480-700 GPU-hours**。
- 合计 ~1100-1700 GPU-hours / 一次完整训练，按 A100 公开租赁价 $1.5-3/h 估，**单次成本 $1.5k-5k**。
- 想换数据集：第一阶段必须重训（autoencoder 是 dataset-specific），第二阶段也要重训。
- 原文未明说时长，以上为按 epoch 数 + batch size + ShapeNet 规模的工程估算。

### 上手最快的路径？

1. 直接 clone repo + 跑预处理好的 ShapeNet 子集（airplane 一类 ≈ 4000 个 mesh）。
2. 先在单类上 train autoencoder（1-2 天单卡），看 IoU 能不能上 0.95。
3. 上不了说明数据预处理 / 环境有问题，对照 README debug。
4. 跑通后再扩到全 55 类 + diffusion 阶段。

## 失败案例与边界

论文里没有专设 failure case 节，但综合 §8.8 Limitations + 几张图 + 我读论文的判断：

### 论文明示的失败 / 局限

- **第一阶段训练时间长**：autoencoder 训 1600 epoch on 8×A100 已经很重，作者也说"first stage might require retraining if the shape data in consideration changes"。换数据就重训，对学术界是接受范围内，对工业界几乎不可行。
- **第二阶段也很重**：diffusion 训 8000 epoch on 4×A100，比图像 diffusion 还久（对比 SD v1.5 训了 ~150k iter on 256×A100）。
- **M=512 是上限不是下限**：作者明确写"limited by computation time to work with larger M"——意味着想拿到比论文更精细的形状要自己重训第一阶段。

### 我从图 / 表里看出的失败模式

- **薄结构（thin structure）虽然论文 Fig. 8 表现不错，但极端情况（ShapeGlot 文本里的"a chair with very thin legs"）依然是软肋**——cross-attention 在表面剧烈变化的区域容易"模糊"。
- **Text-to-3D 是论文最弱的一条线**——Fig. 11 的 text-to-3D 跟 AutoSDF 比是赢了，但生成的结果离 stable diffusion 那种"惊艳"差很远。原因是 ShapeGlot 文本本身稀疏（每个 shape 只有几句简单描述）+ BERT 提的特征跟几何空间没对齐。
- **离 ShapeNet 域的迁移性论文没回答**：所有实验都在 55 类人造物体上。自然物体（树 / 石头）/ 关节物体（人 / 动物）/ 大场景（房间 / 街景）的表现完全未知。
- **Rendering-FID 是 2D-via-3D 的妥协指标**：作者自己也承认"essentially designed to understand 3D shapes from 2D images"，所以补了 PointNet++ 特征空间的 FPD/KPD。两个一起看才靠谱。

### 边界（这模型不适合做什么）

- **大场景重建**：M=512 个 latent 装一个椅子刚刚好，装一整间房间会爆。
- **动态形状 / 关节体**：本文是 static shape，没建模时间维度。
- **物理合理性**：生成的椅子可能"看起来对"但腿粗细不一致、重心不稳。3D 生成普遍痛点。
- **纹理 / 材质**：本文只生成几何（occupancy field），不带颜色 / 材质——下游应用需要再补一个 texture diffusion 模型。

## 这篇论文之后的延伸阅读

按"和本文关系"分三档：

### 前传（理解本文必读）
1. **3DILG**（Zhang et al. 2022, NeurIPS）—— 同一作者团队的前作，本文的直接对照组。读完你才知道"去掉坐标"是多么大的简化。
2. **Stable Diffusion / Latent Diffusion**（Rombach et al. 2022, CVPR）—— 本文的范式来源。两阶段训练 + KL 瓶颈 + cross-attention 注条件，全是 SD 套路。
3. **Perceiver / Perceiver IO**（Jaegle et al. 2021）—— 用 cross-attention 做 set-to-set 的源头。本文的 encoder（Eq. 16 学习式 query）就是 Perceiver 风格。

### 续作（基于本文骨架的扩展）
4. **CLAY**（Zhang et al. 2024, SIGGRAPH）—— 同一作者的"工业版"，把 latent set 思想 scale 到 1.5B 参数 + 几百万 mesh，是当前开源 3D 生成最强模型之一。如果你只读一个续作，读这个。
5. **Michelangelo**（Zhao et al. 2023, NeurIPS）—— 把本文 latent set 跟 CLIP 对齐，做 text/image-to-3D；解决了本文 text 那条线弱的问题。
6. **TripoSR**（Tochilkin et al. 2024）—— image-to-3D 的工业实现，用类似 latent set 思路 + transformer，但优化到秒级推理。

### 竞争对手（不同思路解决同一问题）
7. **NeuralWavelet**（Hui et al. 2022, SIGGRAPH Asia）—— 不用学习表示，直接在小波系数上跑 diffusion。本文 baseline，结果输了但思路有趣。
8. **TriplaneDiffusion / Diffusion-SDF**（Shue et al. 2022 / Chou et al. 2022）—— 同期在 triplane（三个正交 2D feature plane）上跑 diffusion，是 latent set 的另一种"伪 2D"妥协。

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
