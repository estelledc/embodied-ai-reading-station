---
title: 入门综述清单
order: 3
intro: '先看整个领域全景再读专题 — 5-8 篇综述清单'
---

# 入门综述清单

> 如果你想先看到整个领域的全景图，再回头读专题论文，从这里开始。

这页列了 8 篇 2024–2025 年的 Embodied AI / VLA 综述。前几篇适合零基础先扫，后几篇等你读完站内 13 篇专题再翻。每篇都标了「零基础推荐指数」（5 星最容易，1 星最劝退），并标出和本站论文笔记的交叉引用。

---

## 一、先读这两篇（建立全景）

### 1. Aligning Cyber Space with Physical World — 具身智能全景综述

- **标题**：Aligning Cyber Space with Physical World: A Comprehensive Survey on Embodied AI
- **作者**：Yang Liu, Weixing Chen, Yongjie Bai 等（中山大学 + 鹏城实验室）
- **发表**：2024-07，arXiv（v8，多次更新到 2025）
- **arXiv**：[2407.06886](https://arxiv.org/abs/2407.06886) ｜ [PDF](https://arxiv.org/pdf/2407.06886)
- **覆盖范围**：四块拼图 — 具身感知 / 具身交互 / 具身智能体（含 MLLM、世界模型）/ Sim-to-Real。还梳理主流仿真器和数据集。
- **零基础推荐指数**：⭐⭐⭐⭐⭐
- **什么时候读**：第一篇就读它。它把"具身智能"这个大概念拆成你能拿手指点出来的四块。读完后你会知道 SayCan 属于"具身交互/任务规划"，OpenVLA 属于"具身智能体的端到端控制"，Cosmos Policy 属于"世界模型"。地图有了，再去钻每条路就不会迷。
- **本站论文交叉引用**：SayCan、OpenVLA、LLaVA（作为 MLLM 基础）几乎一定在引用列表里；世界模型一节会铺垫到 Cosmos Policy 这条线。

### 2. A Survey on Vision-Language-Action Models for Embodied AI — 第一篇 VLA 综述

- **标题**：A Survey on Vision-Language-Action Models for Embodied AI
- **作者**：Yueen Ma, Zixing Song, Yuzheng Zhuang, Jianye Hao, Irwin King（CUHK + 华为诺亚）
- **发表**：2024-05，arXiv（v8 持续更新到 2025）
- **arXiv**：[2405.14093](https://arxiv.org/abs/2405.14093) ｜ [PDF](https://arxiv.org/pdf/2405.14093)
- **覆盖范围**：VLA 模型族谱的"开山综述"。三条主线——VLA 的组件（视觉编码器、LLM 主干、动作头）、低层控制策略、高层任务规划器。配套有 [Awesome-VLA repo](https://github.com/yueen-ma/Awesome-VLA)。
- **零基础推荐指数**：⭐⭐⭐⭐
- **什么时候读**：在读完上一篇全景图后第二篇读。它会让你看清"VLA 不是一个模型，是一类范式"，并把 SayCan（高层规划）、OpenVLA（端到端控制）、VLAS（多模态指令）放在同一棵树的不同枝上。读完后你能自信判断一篇新论文属于 VLA 的哪个角落。
- **本站论文交叉引用**：直接覆盖 SayCan / OpenVLA / VLAS / LLaVA（作为 VLM 主干来源）；MLA 属于"扩展感知通道"分支的近亲。

---

## 二、补全领域细节（按需挑读）

### 3. A Survey on Robotics with Foundation Models: toward Embodied AI — 早期但精炼

- **作者**：Zhiyuan Xu, Kun Wu, Junjie Wen 等（Midea Group + 同济大学）
- **发表**：2024-02，arXiv
- **arXiv**：[2402.02385](https://arxiv.org/abs/2402.02385) ｜ [PDF](https://arxiv.org/pdf/2402.02385)
- **覆盖范围**：聚焦 manipulation（机械臂操作）。把 foundation model 拆成"高层规划 + 低层控制"两段，再分模块讨论 VLM、LLM、Diffusion Model 各自怎么嵌进去。
- **零基础推荐指数**：⭐⭐⭐⭐
- **什么时候读**：和上面 #1、#2 二选一也行——它比 #2 老 3 个月，但写得更"教科书化"，每节都解释术语。如果觉得 #2 跳得太快，回来读这篇。
- **本站论文交叉引用**：SayCan（高层规划经典案例）、OpenVLA 前身 RT-2、LLaVA（VLM 主干）。

### 4. Vision-Language-Action Models for Robotics: A Review Towards Real-World Applications — 2025 年最新全栈

- **作者**：Kento Kawaharazuka 等（Oxford + UT Austin）
- **发表**：2025-10，arXiv
- **arXiv**：[2510.07077](https://arxiv.org/abs/2510.07077) ｜ [PDF](https://arxiv.org/pdf/2510.07077)
- **覆盖范围**：作者自己定位为"full-stack review"——从软件（架构、训练范式、模态处理）到硬件（机器人平台、数据采集、增强、benchmark）一条龙。配套有 [项目页](https://vla-survey.github.io)。
- **零基础推荐指数**：⭐⭐⭐
- **什么时候读**：当你已经能区分 SayCan / OpenVLA / Cosmos Policy 之后再看。它假设你认识 VLA 这个概念，但会告诉你"想真在实验室部署，要踩哪些坑"。是从"看懂论文"过渡到"想自己跑"的桥梁。
- **本站论文交叉引用**：OpenVLA、Cosmos Policy 几乎确定在内；MLA 涉及的多感官融合也会被列为方向之一。

### 5. An Anatomy of Vision-Language-Action Models: From Modules to Milestones and Challenges — 给新人的结构化指南

- **作者**：Chao Xu, Suyu Zhang, ... Stefanos Zafeiriou, Jiankang Deng（多机构联合）
- **发表**：2025-12，arXiv
- **arXiv**：[2512.11362](https://arxiv.org/abs/2512.11362) ｜ [PDF](https://arxiv.org/pdf/2512.11362)
- **覆盖范围**：作者自报家门——"沿着研究者的自然学习路径写"。三段：基本模块 → 关键里程碑 → 五大挑战（表征 / 执行 / 泛化 / 安全 / 数据）。
- **零基础推荐指数**：⭐⭐⭐⭐
- **什么时候读**：和 #2 互补——#2 是"学术族谱"，这篇是"成长路线图"。如果你想知道"读完这些论文，下一步该想什么问题"，从这篇的 Challenges 章节倒推。
- **本站论文交叉引用**：OpenVLA、SayCan、Cosmos Policy（在世界模型 / 数据章节）。

### 6. Large VLM-based Vision-Language-Action Models for Robotic Manipulation — 操作任务专题

- **作者**：Rui Shao, Wei Li 等（HIT 哈工深 + JiuTian 实验室）
- **发表**：2025-08，arXiv
- **arXiv**：[2508.13073](https://arxiv.org/abs/2508.13073) ｜ [PDF](https://arxiv.org/pdf/2508.13073)
- **覆盖范围**：把 VLA 模型分成"单体式（monolithic）"和"分层式（hierarchical）"两条路线，重点对比近期大型 VLM 改造而来的策略模型。配套有 [项目页](https://github.com/JiuTian-VL/Large-VLM-based-VLA-for-Robotic-Manipulation)。
- **零基础推荐指数**：⭐⭐⭐
- **什么时候读**：当你想深入"机械臂"这个具体场景时——它比 #2 更专、更新，但也更窄。读 OpenVLA 笔记之前先扫这篇能让你看懂 OpenVLA 是哪一类。
- **本站论文交叉引用**：OpenVLA（核心案例之一）、VLAS、MLA。

### 7. A Comprehensive Survey on World Models for Embodied AI — 世界模型专题

- **作者**：Xinqing Li, Xin He 等（A*STAR）
- **发表**：2025-10，arXiv
- **arXiv**：[2510.16732](https://arxiv.org/abs/2510.16732) ｜ [PDF](https://arxiv.org/pdf/2510.16732)
- **覆盖范围**：把"世界模型"从 RL 时代的 Dreamer 一路写到 Sora 风格的视频生成模型，再聚焦它们怎么被嵌进具身策略里。三轴分类：功能 / 时间建模 / 空间表征。
- **零基础推荐指数**：⭐⭐⭐
- **什么时候读**：专门为 [Cosmos Policy](papers/cosmos-policy/) 这条路线读。它会告诉你"为什么大家觉得视频生成模型能直接当机器人策略用"——这是 Cosmos Policy 论文的隐藏前提。
- **本站论文交叉引用**：Cosmos Policy（直接相关）；间接关联 OpenVLA（作为对比的非世界模型路线）。

### 8. Towards Generalist Robot Learning from Internet Video — 数据视角

- **作者**：Robert McCarthy 等（UCL + Oxford）
- **发表**：2024-04，arXiv（v5 更到 2025）
- **arXiv**：[2404.19664](https://arxiv.org/abs/2404.19664) ｜ [PDF](https://arxiv.org/pdf/2404.19664)
- **覆盖范围**：从"机器人数据稀缺"这个痛点切入，专门讨论怎么把互联网视频（YouTube、HowTo100M）变成机器人训练数据。
- **零基础推荐指数**：⭐⭐
- **什么时候读**：放最后。前面综述都在讲"模型怎么搭"，这篇讲"数据从哪来"——这是 2024-2025 年所有 VLA 都在焦虑的问题。读完它你会突然明白为什么 Cosmos Policy 会去微调一个视频生成模型。
- **本站论文交叉引用**：Cosmos Policy（互联网视频驱动的策略学习直接相关）；OpenVLA 间接（数据 mixture 含视频）。

---

## 关于本站 13 篇论文的覆盖范围说明

上面 8 篇综述基本完整覆盖以下 6 篇：
**LLaVA / SayCan / OpenVLA / VLAS / MLA / Cosmos Policy / 3DShape2VecSet**（最后一篇在世界模型 / 3D 表征综述里出现）。

但本站还有两类专题论文，**主流 VLA 综述基本不覆盖**，需要找垂直综述：

- **听觉智能**（acoustic-swarms / neuralaids / proactive-hearing）→ 属于 audio AI / hearable computing 子领域，建议查 SenSys / MobiCom 系列综述，不在本页范围。
- **射频感知**（mmCLIP / mmNorm / CartoRadar）→ 属于 wireless sensing 子领域，同样不在主流 Embodied AI 综述射程内。

把它们当作"具身感知的非主流通道补充"——主流综述假设视觉是默认输入，但本站这几篇笔记告诉你声音和射频信号也能撑起独立的感知栈。

---

## 阅读顺序建议（一句话版）

1. **第一周**：读 #1 全景 + #2 VLA 族谱 → 看本站「论文集」按主题归类的 6 篇核心 VLA 论文笔记
2. **第二周**：按兴趣挑 #4（实战）/ #5（路线图）/ #6（操作专题）任一篇精读
3. **第三周及以后**：碰到 Cosmos Policy 想深挖时读 #7；想补"数据从哪来"读 #8；想看更早的教科书风格读 #3
