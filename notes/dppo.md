---
title: "Diffusion Policy Policy Optimization (DPPO)"
slug: dppo
topic: diffusion-policy
difficulty: ⭐⭐⭐⭐
status: auto-summary-light
来源: "https://arxiv.org/abs/2409.00588"
venue: ICLR
year: 2025
era: frontier
num: 43
generated_at: 2026-05-31
---

> 本笔记基于摘要 + 公开资料，未读全文。

## 一句话讲什么（TL;DR）

先模仿老师傅、再自己练。DPPO 把"自己练"那步拆成很多小动作，让常规 RL 也能调教扩散策略。

## 这是个什么场景

想象你跟着 1000 段老师傅炒菜的录像，照着练出一个会炒菜的机器人。它能把动作模仿得有模有样，但说白了是"死记硬背"——灶火突然忽大忽小、土豆比平时切得厚一点，它就懵了。这一步对应 Diffusion Policy 的"模仿预训练"。

要让它真正变强，正常做法是让它**自己上灶练几百次，烧糊几次、调整几次**——这就是 RL（强化学习）微调，跟小孩学骑自行车摔几跤就会了一样。

但这个机器人有个怪毛病：它出招不是"想一下就动手"，而是先在脑子里画个草稿（一团噪声），再润色 5 次、10 次，才把最终动作交给手。这 5–10 步润色，就叫"去噪步（denoising step）"。

问题来了——常规 RL 算法面对这种"出一个动作要先打 K 次草稿"的策略会很懵：菜炒砸了，到底是哪一步草稿没画好？奖励该回传给哪一步？

DPPO 的回答是：把这 K 步草稿**当成一小段连续决策**（专业说法是 MDP，马尔可夫决策过程），每润色一笔都算一次"小动作"，PPO 就能像平时一样上手了。

## 之前的人怎么做的 — 3-5 bullet

- **Diffusion Policy（Chi et al. 2023）**：用扩散模型当机器人策略，模仿学习效果非常好，但本身只做行为克隆（BC, Behavior Cloning），没回答"在线 RL 怎么继续提升"。
- **传统 PPO + 高斯策略**：策略输出一个高斯分布，log-probability 好算，PPO 直接套；但表达力远不如扩散，多模态动作（同一状态下有几种合理做法）会被压成单峰平均。
- **离线 RL + 扩散（Diffusion-QL、IDQL 等）**：用扩散建模动作分布，但走 Q-learning 路线、依赖离线数据集，不是 on-policy 在线微调。
- **Score-based / DDPM RL 早期尝试**：通过对去噪过程做策略梯度，但通常需要近似密度、对超参敏感，没有形成标准配方。
- **Reward-weighted regression / 加权 BC**：简单、稳，但样本效率和上限都不如真正的策略梯度。

## 这篇论文的关键想法

像写作文打草稿——以前 RL 只看你交上来的最终稿评分，DPPO 让老师**逐句**给你反馈：第一稿怎么改、第二稿怎么改……每一笔润色都能拿到指导。

**核心 insight 一句话**：把扩散策略每次采样要做的 K 步去噪，看成一个"内层 MDP"——每一步去噪算一次 action，最后一步去噪出来的才是真正交给环境的动作——这样整条轨迹就成了"环境步 × 去噪步"两层嵌套的大 MDP，PPO 在这个大 MDP 上就是合法的。

等等，先慢一拍 —— 这里面的"似然"和"ratio"是什么？PPO 要更新参数，需要知道"我现在这步动作和我上一版策略相比，概率涨了还是跌了"，这个比值就叫 ratio；而能不能算出 ratio，取决于动作的概率（似然）能不能写出公式。

更具体的几个观察：

1. **似然有 closed form（封闭解）**：DDPM 每一步去噪是个高斯转移 q(x_{k-1}|x_k)，log-prob 一行公式就能算，PPO 的 ratio 自然就有了，不用搞复杂的密度估计。
2. **梯度路径变短**：相比把整条 K 步去噪链当作"一次动作"再做 reparameterization 反传，把每步当独立 action 让梯度回传路径短、方差低，更好训。
3. **保留扩散的多模态优势**：RL 微调不会把策略压成单峰（同一情况只会一种做法），因为 PPO 只在每步转移上做 clip，没动扩散本身的结构。

## 它怎么做的（方法）— 3-4 段

**第一段 · 两阶段训练框架**：先用专家数据做 Diffusion Policy 风格的模仿预训练，得到一个能力下限不错的扩散策略 π_θ。然后冻结/不冻结都可以，关键是进入第二阶段 RL 微调，目标函数就是 PPO 的 clipped surrogate。

**第二段 · 内外两层 MDP 的串联**：外层 MDP 是机器人和环境交互（state s_t、env action a_t、reward r_t）；内层 MDP 是每一步要给 env 的 a_t 是怎么从噪声 x_K 一路去噪到 x_0 的，每一步 (x_k → x_{k-1}) 算一个内层 transition。reward 只在最外层最末端给（因为环境只在执行真实 action 后才反馈），中间所有去噪步的 reward 是 0，靠 GAE（Generalized Advantage Estimation）回传。

**第三段 · PPO 在去噪步上的具体形式**：对每个去噪 transition，定义 ratio = π_θ(x_{k-1}|x_k, s) / π_{θ_old}(x_{k-1}|x_k, s)，按 PPO 标准 clip(ratio, 1-ε, 1+ε) × A 取 min。Advantage A 来自 critic V(s) 在外层 step 上估计，再均匀/按调度分摊到内层去噪步。一个工程细节：去噪步数 K 通常远小于训练时的扩散步数（比如训练 100 步，推理用 5–10 步的 DDIM 调度），这样 RL 才跑得动。

**第四段 · 工程配方**：论文重点不在新理论，而在"哪些 trick 让它真的稳"。包括但不限于（具体数字需读原文）：noise schedule 的选择、KL 正则化的强度、value function 的 warm-up、在仿真和真机上不同的 batch size 与 rollout 长度、对探索温度的退火等。这些组合在一起才是"DPPO recipe"。

## 实验在做什么

- **基准任务**：覆盖常见的机器人操作 benchmark，估计涉及 Robomimic、D4RL、Adroit、Meta-World、机械臂操作 / 灵巧手等套件，以及若干真机或类真机仿真任务（具体覆盖范围需读原文）。
- **对比对象**：Diffusion Policy 纯 BC（不做 RL）、其他扩散 + RL 方案（如 DIPO、QSM、DPO 风格的 reward-weighted 微调）、传统高斯策略 + PPO。
- **关心的指标**：成功率（success rate）、样本效率（达到某个性能所需 env steps）、对分布外初始化的鲁棒性、对 reward 信号稀疏程度的敏感度。
- **典型结论**：DPPO 比"BC only"显著提升、比其他扩散 RL 方案更稳更高、对超参不那么敏感；并且**保留了扩散策略的多模态行为**，没有崩成单峰。具体数字（提升百分比、所需 step 数）需读原文。

## 你应该懂的几个新词 — 4-6 个

- **Diffusion Policy**：把动作生成当成扩散模型的去噪过程，给定观测 s，从纯噪声开始去噪 K 步得到动作 a。表达力强，特别适合多模态示范数据。
- **PPO（Proximal Policy Optimization）**：当前 RL 工业标准之一，关键是用 ratio clip 限制每次更新幅度，防止策略一步走太远塌掉。
- **去噪步（denoising step）**：扩散模型推理时把 x_K（噪声）一步步变成 x_0（动作）的中间步，每一步是一次小高斯采样。
- **内外层 MDP**：DPPO 的核心建模——外层是 env 步、内层是去噪步，PPO 在内层 transition 上算 ratio 和 clip。
- **Advantage / GAE**：评价某个动作"比平均好多少"。GAE 是常用的 advantage 估计器，控制 bias-variance 权衡。
- **Behavior Cloning（BC）**：最朴素的模仿学习——直接监督学习 (s, a) 对，不和环境交互。Diffusion Policy 的预训练就是 BC。

## 它和其他论文什么关系

- **直接前置**：[Diffusion Policy](diffusion-policy.md)。DPPO 假设你已经有一个 BC 训出来的扩散策略，回答"下一步怎么用 RL 把它推得更好"。
- **同样关心扩散加速 / 去噪步少**：[Consistency Policy](consistency-policy.md)、[3D Diffusion Policy](3d-diffusion-policy.md)、[iDP3](idp3.md) 这些工作降低去噪步数或换骨架，DPPO 的 RL 阶段也强烈依赖"去噪步数 K 不能太多"。
- **替代路线**：传统 [VQ-BeT](vq-bet.md) / [BeT](bet.md) 用离散 token 表达多模态动作；DPPO 走的是"用扩散保留多模态 + 用 PPO 微调"。
- **下游可能影响**：[OpenVLA](openvla.md)、[RT-2](rt-2.md) 等大模型策略未来如果接扩散 head（已有这趋势），DPPO 的配方就直接可复用。
- **方法论亲缘**：和 RLHF 中"PPO 微调一个预训练策略"的范式同构——只不过那边是语言模型 + token 级 PPO，这边是扩散策略 + 去噪步级 PPO。

## 我建议这样读 — 3-4 步

1. **先读 Diffusion Policy**：如果还没看过 [diffusion-policy](diffusion-policy.md)，先把"扩散模型怎么当机器人策略"这件事吃透；不然 DPPO 第 3 节会很懵。
2. **再补 PPO 基础**：理解 ratio、clip、GAE 这三件事。Sutton & Barto 第 13 章 + 任意 PPO 博客即可。
3. **看 DPPO 第 3 节"内外层 MDP"**：这是全文最核心的建模一页，看懂这页其余都是工程细节。
4. **最后扫实验和附录的"trick 表"**：这篇论文的真正贡献是工程配方；想自己复现的话附录的超参和 ablation 比正文有用。

## 为什么值得读

- **范式价值**：它把"BC 预训练 + PPO 微调"这套在 LLM 上验证过的成熟范式，第一次干净地搬到了扩散策略上，给整个领域一个能直接套的 recipe。
- **桥接作用**：连接了"扩散派"（强表达、模仿好）和"RL 派"（在线提升、能突破示范上限）两条之前不太对话的路线。
- **工程参考价值高**：即使你不做扩散策略，里面"如何把一个有内部多步采样过程的策略接进 PPO"这个思路也能迁移——比如未来给 LLM 接 chain-of-thought 做 RL 微调时，思路是一致的。
- **难度适中**：理论上不需要新工具（PPO + DDPM 都是已知组件），主要难点是把建模写干净 + 调出稳定配方，对工程导向的读者友好。
