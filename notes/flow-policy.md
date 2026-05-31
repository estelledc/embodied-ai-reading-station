---
title: "FlowPolicy: 3D Flow-based Policy via Consistency Flow Matching"
slug: flow-policy
topic: diffusion-policy
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2412.04987"
venue: AAAI
year: 2025
era: frontier
num: 45
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

让机器人不再"在脑子里画 100 张草稿才动手"，而是看一眼立体世界就一步给出动作 — 又快又稳，真机能跑得动。

## 这是个什么场景

想象你让朋友帮你"把桌上的杯子放到杯垫上"。这事儿对人来说简单到不用想 — 但对机器人，每一帧（每秒 10-50 次）都要重新决定"手往哪挪、张多大"。决策慢一拍，杯子就摔了。

老一代 Diffusion Policy 干这事像一个"过度纠结的画家"：每要动一下手，先在脑子里打 100 张草稿，从最模糊的一张一点点修到最清晰，看到第 100 张才真的动手。画得很稳，但太慢 — 真放到机器人手臂上，控制频率根本跟不上。

后来有人提出 Consistency Models（一致性模型），思路是："别画 100 张了，能不能学个本事 — 看一眼模糊的草稿直接跳到最终清晰图？"于是 100 步压成 1 步。

FlowPolicy 再往前一步：连"画草稿"这个比喻都嫌啰嗦了。它用"流匹配"（Flow Matching）— 想象从一团乱码到正确动作之间有一条最短的直线路径，模型直接学怎么沿着这条路走；再加一个"一致性"约束，保证从路上任何一点出发跳到终点都给同一个答案。所以机器人能"一步直达"。

而它看世界的方式也升级了：不是 RGB 摄像头拍的平面照片，而是 3D 点云 — 像你戴 AR 眼镜看到的"立体世界"，杯子在哪、手该伸向哪个方向，几何关系一目了然。

## 之前的人怎么做的 — 3-5 bullet

- **Diffusion Policy（Chi 等，2023）**：用 DDPM 把动作序列当成噪声去噪问题，质量好、能处理多模态行为，但推理需要 10-100 步去噪，实时性是瓶颈
- **3D Diffusion Policy / DP3（Ze 等，2024）**：把条件从 2D 图像换成 3D 点云，几何感知更强，少样本学习更好；但仍然受限于 diffusion 推理慢
- **Consistency Policy（Prasad 等，2024）**：用 Consistency Models（Song 等）蒸馏 Diffusion Policy，把多步去噪压成 1-2 步，但依赖一个已训练好的 teacher diffusion 模型 — 两阶段训练，复杂
- **iDP3（Improved 3D Diffusion Policy）**：在 3D 输入上做了点云编码、camera pose 等改进，但底层还是多步 diffusion
- **Flow Matching 类方法（Lipman 等，2023）**：把生成建模重新表述成学一个"速度场"，比 diffusion 更直接、训练更稳，但默认仍需 ODE 多步求解

FlowPolicy 想同时拿走"3D 点云的几何感知"（来自 DP3）+"一致性的一步推理"（来自 Consistency Models）+"流匹配的训练简洁性"，三件好事合一。

## 这篇论文的关键想法

两步走。

**第一步：换底座 — 从"擦黑板"换成"导航"。**
老的 Diffusion 像反复擦黑板：先涂满噪声，再一笔一笔擦回到正确动作。Flow Matching 换了个思路 — 像导航：直接学一张"速度地图" v(x, t)，告诉你站在中间任何位置、任何时刻，下一步该朝哪个方向走多远。沿着这张地图走（数学上叫"解 ODE"），就能从乱码走到动作。训练 loss 是简单的回归（"下一步该走的方向"和"真实方向"求差），不用搞复杂的噪声调度。

**第二步：套上"一致性"约束 — 让一步直接到终点。**

> 等等，先慢一拍 — 什么叫"一致性"？

打个比方：导航地图原本要你一格一格走，每格都查一次。一致性约束相当于强行要求 — 不管你现在在路上哪一点（刚出发还是快到了），都得能"瞬移"到同一个终点。Consistency Flow Matching（CFM，一致性流匹配）就是把这条规矩写进训练目标里：从 t=0.1 跳和从 t=0.9 跳，模型必须给出同一个最终动作。学会这个本事后，推理时一步就能搞定。

把这两步组合起来，再把"条件输入"接上 3D 点云编码器（沿用 DP3 的设计），就得到了 FlowPolicy：3D 点云进，一步生成的动作序列出，质量接近多步 Diffusion Policy。

直觉上这是把 Consistency Policy 的"两阶段蒸馏"（先训一个 teacher，再让 student 抄作业）改成了"端到端单阶段训练"— 不需要 teacher 了，CFM 本身就把"一致性"写进 loss，工程上更清爽。

## 它怎么做的（方法）— 3-4 段

**1）3D 观测编码。**
输入是机器人当前帧的彩色点云（来自单个或多个 RGB-D 相机），通常会做体素降采样到几百到几千个点。然后用一个轻量点云编码器（DP3 用的是 simplified PointNet）把点云编成一个 condition embedding。这部分基本沿用 DP3 / iDP3 的工程实践，不是这篇论文的主要创新点，但是 3D 输入是它优于纯图像方法的来源。

**2）动作表示与噪声化。**
动作 a 是一段未来 H 步（比如 H=8 或 16）的 end-effector 位姿/关节序列。训练时按 Flow Matching 的标准做法，在 t∈[0,1] 上采样一个时间，把噪声 ε 和真实动作 a_0 线性混合得到 x_t = (1-t)·ε + t·a_0（或类似的插值），并定义这条直线流的速度场 v* = a_0 - ε。

**3）一致性流匹配训练。**
模型 f_θ(x_t, t, c) 接收当前噪声状态、时间步和点云条件 c。训练 loss 包含两个部分：
- Flow Matching loss：让 f_θ 预测出的"终点动作"在所有 t 上都尽量接近 a_0（或者等价地，让其速度场预测接近 v*）
- Consistency loss：对相邻两个时间步 t1 < t2，模型从 x_{t1} 和 x_{t2} 出发预测的终点应该一致 — 一般用 EMA target network 实现这个自一致约束

具体的损失权重、时间采样策略、EMA decay 等超参数细节，**具体数字需读原文**。

**4）推理。**
给定当前观测点云 c，采样一个噪声 x_1 ~ N(0, I)，调用 f_θ(x_1, t=1, c) 一次，直接得到预测动作 a_0。可选地做 1-2 步迭代细化以提升质量。然后按 Diffusion Policy 的 receding horizon 范式，执行前几步动作，下一帧再重新预测。

## 实验在做什么

从摘要和这一类方法的常规做法推测，FlowPolicy 的实验大致覆盖：

- **仿真基准**：Adroit、MetaWorld、RLBench、或 LIBERO 这类标准 manipulation 套件，对比 success rate
- **真机实验**：少数物理任务（pick-and-place、pouring、articulated object 操作等），观察成功率和决策延迟
- **对比基线**：Diffusion Policy（多步）、Consistency Policy（蒸馏 1 步）、3D Diffusion Policy（3D 多步）、可能还有一个纯 Flow Matching 多步版本作为消融
- **核心指标**：成功率（保持或超过 DP3）+ 推理步数/延迟（远低于 diffusion 类）+ 训练成本（不需要两阶段蒸馏）

具体在哪个 benchmark 上提了多少个百分点、推理 ms 数对比，**具体数字需读原文**。

定性上要看的是："1 步推理是否真的没有掉点？"如果掉点很小（< 2%）但延迟降一个数量级，这个工作就成立了。

## 你应该懂的几个新词 — 4-6 个

- **Flow Matching**：用"学速度场"代替"学去噪"的生成建模。训练 loss 是回归式（预测速度向量），推理是 ODE 积分。比 diffusion 更直接，是 2023 年后扩散生成的"下一代"框架
- **Consistency Models**：Song et al. 2023 提出，让模型在生成 ODE/SDE 的轨迹上"任何一点都能直达终点"，从而实现 1-2 步采样。原本是图像生成领域的工作
- **Consistency Flow Matching (CFM)**：把 Consistency Models 的思路套到 Flow Matching 上 — 一致性约束 + 速度场预测的合体，训练更简洁
- **3D Diffusion Policy (DP3)**：把 Diffusion Policy 的图像观测换成 3D 点云观测的工作；FlowPolicy 在条件输入上沿用了它的设计
- **Receding horizon control**：每次预测 H 步动作，但只执行前 k 步，下一帧重新预测 — Diffusion Policy 系都用这个范式做闭环控制
- **EMA target network**：训练时维护一份模型参数的指数滑动平均副本，用它产生"自一致"的监督目标 — Consistency Models 训练的关键技巧

## 它和其他论文什么关系

- **直接继承**：3D Diffusion Policy（点云条件） + Consistency Models（一步生成）+ Flow Matching（训练目标）
- **直接对比**：Diffusion Policy（图像 + 多步）、Consistency Policy（图像 + 蒸馏 1 步）、DP3（点云 + 多步）
- **同期/并行**：dit-policy、smolvla 这类用更强 backbone 但还是 diffusion 推理的工作；π0 这类大模型 + flow matching 的 VLA
- **下游影响**：把"一步流匹配"作为机器人策略推理后端的可行性证据 — 后续 VLA / world-model based policy 都可能借用这个思路压低决策延迟

如果按"机器人策略生成模型"这条主线串：BC → ACT → Diffusion Policy → DP3 / iDP3 → Consistency Policy → **FlowPolicy** → π0（更大规模 + flow matching）→ Cosmos Policy（世界模型 + 策略一体化）。

## 我建议这样读 — 3-4 步

1. **先垫底子**：如果 Diffusion Policy 和 DP3 没看过，先看那两篇的核心机制（receding horizon、点云编码、噪声预测目标）— 否则 FlowPolicy 的"动作表示"和"条件输入"会完全是黑盒
2. **补 Flow Matching 速通**：去看 Lipman 等 2023 的 Flow Matching 一图：训练目标和 diffusion 的对比。不需要看完整证明，理解"学速度场 vs 学噪声"的差异即可
3. **重点读方法节**：找文中关于 Consistency Flow Matching 的 loss 公式 — 通常会有一个 flow matching loss + 一个 consistency loss 的组合，搞清这两项分别管什么、EMA 在哪生效
4. **看实验表对比**：直接对比 FlowPolicy(1 step) vs Diffusion Policy(N step) vs Consistency Policy(1 step) 三栏，看 success rate 差距和推理时间。如果 1 步 FlowPolicy 已经追平多步 Diffusion Policy，本文论点就成立了

## 为什么值得读

- **生成式策略的推理瓶颈是真问题**：机器人控制频率经常要求 10-50 Hz，多步 diffusion 在低端 GPU 上很难达标。一步推理是产业落地的硬需求
- **CFM 本身是一个 transferable 的训练范式**：把"流匹配 + 一致性"端到端训练，不需要 teacher 蒸馏，工程上比 Consistency Policy 简洁。这种思路可以套到很多其他动作生成场景
- **3D 条件 + 一步生成的组合点**：是 2024-2025 年 manipulation policy 的"双重升级"小结点，看完它能把"3D 表征 + 高效推理"两条线合并理解
- **承上启下**：往前接 Diffusion Policy / DP3 / Consistency Policy 一系列工作，往后接 π0 / RDT / Cosmos Policy 等 flow matching 大模型策略，是这条技术线上一个干净的中间节点
