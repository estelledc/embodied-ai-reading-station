---
title: "OpenVLA: An Open-Source Vision-Language-Action Model"
slug: openvla
topic: 三. 端到端 VLA
difficulty: ⭐⭐⭐
status: auto-summary
来源: papers/openvla/paper.pdf
generated_at: 2026-05-30
---

# OpenVLA: An Open-Source Vision-Language-Action Model

> 这是机器辅助生成的客观摘要笔记。教学版精读笔记由用户按节奏触发后单独成稿。

## 一句话讲什么（TL;DR）

把一个 7B 视觉语言模型直接微调成会动机械臂的开源通用策略，比 55B 的 RT-2-X 还强。

## 这篇论文要解决什么问题（Why this paper）

让机器人"看一眼场景 + 听一句指令"就能动手，是机器人学习的核心难题。之前已经有 RT-2 这类 VLA（Vision-Language-Action，视觉-语言-动作模型），借助互联网规模预训练得到很强的泛化能力，但有两个现实麻烦：

- **闭源**：RT-2 / RT-2-X 这类 SOTA 模型不放权重、不公开数据配方、不公开训练代码——研究者拿不到，等于只能远观。
- **没人教怎么微调**：要把通用策略迁到自家实验室的机械臂上，需要一套高效的 fine-tune 配方，但已有论文几乎不讨论。

类比：好比有人造了一辆很厉害的赛车（RT-2），但既不卖给你，也不告诉你怎么改装去跑你家门口的山路。OpenVLA 的目标就是开一台可买、可改、可跑在家用 GPU 上的开源版本。

## 用了什么方法（How）

![Architecture](../papers/openvla/images/img_028.jpg)

- **三段式 VLM 骨架（Prismatic-7B）→ 类比"眼睛 + 翻译官 + 大脑"**：视觉编码器（DINOv2 + SigLIP 双路拼接，分别管"空间细节"和"语义"）→ 2 层 MLP projector 投影到语言空间 → Llama 2 7B 当大脑。解决了"靠单一视觉编码器空间感不够"的痛点。
- **动作 token 化 → 类比"把方向盘角度翻译成单词"**：把 7 维连续动作（机械臂位姿+夹爪）每一维按训练数据 1%–99% 分位数离散成 256 个 bin，再覆盖 Llama tokenizer 里 256 个最少用的 token。这样动作就被当成普通文字，整套 LLM 训练基础设施直接复用。
- **970k 轨迹大杂烩（Open-X Embodiment）→ 类比"全国各地学车视频混训"**：从 70+ 机器人数据集筛出符合"单臂 + 至少一个第三人称相机"的子集，按 Octo 的混合权重平衡场景多样性。
- **Vision encoder 必须解冻 → 反直觉发现**：常规 VLM 训练冻结视觉编码器更好，但 VLA 必须放开微调，否则抓不到动作所需的精细空间细节。
- **LoRA + 4-bit 量化 → 类比"给大模型装可拆卸的小补丁"**：rank=32 的 LoRA 只训 1.4% 参数就能匹敌全量微调；4-bit 推理把显存砍到一半还不掉点，让消费级 GPU（4090）能跑。

## 关键实验结果（What works）

- **+16.5% 绝对成功率**：OpenVLA (7B) vs RT-2-X (55B)，跨 29 个任务、两种机械臂——参数少 7 倍反而更强。
- **+20.4% vs Diffusion Policy**：在涉及多物体、需要语言指代的 fine-tune 任务上明显领先。
- **LoRA rank=32 = 68.2% vs Full FT 69.7%**：用 1.4% 参数、59.7GB 显存（vs 163.3GB）就追平全量微调。
- **6Hz 推理 on RTX 4090，bfloat16 仅 15GB 显存**：4-bit 量化下显存再砍半、性能几乎不掉，部署门槛被打到消费级。

## 我读完后该懂的几个术语

- **VLA（Vision-Language-Action Model，视觉-语言-动作模型）**：直接把"看图 + 听指令 → 输出机械臂动作"端到端打成一个网络的范式。类比：一个会一边看路一边听导航一边踩油门的司机大脑。
- **Open-X Embodiment**：70+ 机器人数据集合并成的统一格式大集合，2M+ 轨迹。类比：机器人界的 ImageNet。
- **DINOv2 / SigLIP**：两个预训练视觉编码器。DINOv2 偏空间几何（"东西在哪、什么形状"），SigLIP 偏语义（"这是什么"）。类比：一个看构图、一个看内容的双摄。
- **Action Token / 动作离散化**：把连续的动作维度切成 256 格，每格当成 LLM 词表里的一个词。类比：把音量旋钮的连续刻度改成 256 档按键。
- **LoRA（Low-Rank Adaptation，低秩适配）**：冻结主网络，只训练几个小矩阵作为补丁。类比：给西装只换领口和袖口，不重做整件。
- **Quantization（量化）**：把权重从 16-bit 浮点压成 8-bit / 4-bit 整数省显存。类比：把高清照片压成小图发朋友圈。

## 这篇论文的局限 / 我看出的疑点

- **只支持单帧图像输入**：没历史帧、没 proprioception（本体感觉，比如关节角度），论文自己承认这是后续工作。
- **6Hz 推理对高频任务不够用**：像 ALOHA 双臂操作要 50Hz，OpenVLA 远达不到，需要 action chunking 或 speculative decoding 这类加速。
- **可靠性天花板还偏低**：大部分任务成功率 < 90%，离工业级"几乎不出错"还有距离。
- **DROID 数据集没拟合好**：训练后期不得不把 DROID 从混合中剔除，提示当前模型/数据规模仍不足以吸收所有数据多样性。

## 与其他 12 篇的关联

- **直接对标 RT-2-X**：同是 VLA 范式，OpenVLA 用 1/7 参数 + 970k 数据 + 双视觉编码器 + 全开源把它打过；可以视作"RT-2 的开源平民版"。
- **借鉴 Diffusion Policy**：fine-tune 阶段把 Diffusion Policy 当强基线对比，并指出后者的 action chunking 可能是 OpenVLA 提升精细度的方向。
- **数据复用 Octo / Open-X Embodiment**：训练数据和 mixture 权重直接沿用 Octo，可以看作"换更大骨架 + 端到端微调"的升级路线。

## 为什么值得读 / 不值得读

VLA 入门必读。开源、配方齐全（数据/代码/checkpoint/notebook）、消费级 GPU 可复现，是后续所有 VLA 论文（包括 π0、Helix、RDT-1B 等）默认对照的基线之一。
