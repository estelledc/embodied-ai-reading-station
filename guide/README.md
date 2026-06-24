# 具身智能导读

> 本导读基于 156 篇论文笔记（覆盖 11 个主题方向）和 13 篇导师指定精读论文的研读，面向零基础读者，系统性讲解具身智能（Embodied AI）的完整技术版图。配套 [Embodied AI Reading Station](https://estelledc.github.io/embodied-ai-reading-station/) 在线阅读。

## 目录结构

本导读共分六大部分：

| 部分 | 章节 | 核心问题 |
|------|------|----------|
| **Part 1: 导读总纲** | Ch01-Ch03 | 这本导读是什么？怎么读？需要什么前置知识？ |
| **Part 2: 全景概念** | Ch04-Ch07 | 具身 AI 到底在解决什么问题？11 个主题怎么串起来？ |
| **Part 3: 核心主线精读** | Ch08-Ch14 | VLM → VLA → 扩散策略 → 模仿学习，一步步造出机器人的大脑和手 |
| **Part 4: 训练与部署基建** | Ch15-Ch17 | 世界模型、强化学习、仿真与 Sim-to-Real——从训练到落地 |
| **Part 5: 感知模态扩展** | Ch18-Ch20 | 多模态生态、射频感知、听觉智能——给机器人装上更多感官 |
| **Part 6: 横切主题与实战** | Ch21-Ch22 | 数据集全景、Task 1/2 实战指南 |

## 章节详细目录

### Part 1: 导读总纲

- [Ch01: 为什么需要具身智能——从屏幕里的 AI 到走出来的机器人](ch01-why-embodied-ai.md)
- [Ch02: 阅读路线图——三条路径任你选](ch02-reading-paths.md)
- [Ch03: 前置知识检查清单](ch03-prerequisites.md)

### Part 2: 全景概念（从零开始）

- [Ch04: 11 个主题全景图——一个机器人的 11 个器官](ch04-landscape.md)
- [Ch05: 两条技术路线——模块化流水线 vs 端到端一体化](ch05-two-paradigms.md)
- [Ch06: 具身 AI 的时间线——2021-2025 关键里程碑](ch06-timeline.md)
- [Ch07: 从论文到机器人——理解学术论文的结构与读法](ch07-how-to-read-papers.md)

### Part 3: 核心主线精读（VLM → VLA → 策略）

- [Ch08: VLM 地基 (I)——CLIP，教 AI 同时认图和认字](ch08-clip.md)
- [Ch09: VLM 地基 (II)——从 BLIP-2 到 LLaVA，给 AI 装上对话能力](ch09-blip2-llava.md)
- [Ch10: 高层规划——SayCan / Code-as-Policies / Inner Monologue](ch10-planning.md)
- [Ch11: 端到端 VLA (I)——RT-1 / RT-2，把动作变成 token](ch11-rt1-rt2.md)
- [Ch12: 端到端 VLA (II)——OpenVLA / VLAS / MLA，开源与扩展](ch12-openvla-vlas-mla.md)
- [Ch13: 扩散策略——Diffusion Policy / 3D-DP / π0，像擦噪声一样擦出动作](ch13-diffusion-policy.md)
- [Ch14: 模仿学习——DAgger / ACT-ALOHA / UMI，你做给它看](ch14-imitation-learning.md)

### Part 4: 训练与部署基建

- [Ch15: 世界模型——World Models / Dreamer / Genie / Cosmos Policy](ch15-world-models.md)
- [Ch16: 强化学习基础——PPO / SAC / Reward Shaping](ch16-rl-basics.md)
- [Ch17: Sim-to-Real——仿真训练与真机部署](ch17-sim-to-real.md)

### Part 5: 感知模态扩展

- [Ch18: 多模态生态——ImageBind / AnyMAL / 3DShape2VecSet](ch18-multimodal.md)
- [Ch19: 射频感知——RF-Pose / milliMap / PanoRadar / RF-SLAM / mmCLIP](ch19-rf-perception.md)
- [Ch20: 听觉智能——Whisper / AudioLM / Proactive Hearing / NeuralAids / Acoustic Swarms](ch20-auditory.md)

### Part 6: 横切主题与实战

- [Ch21: 数据集全景——Open X-Embodiment / DROID / BridgeData V2 / LIBERO](ch21-datasets.md)
- [Ch22: Task 1 & Task 2 实战指南——从理论到交付](ch22-task-guide.md)

## 阅读建议

- **Task 1 路径**（2 周，6/30 截止）：Ch01→Ch03→Ch04→Ch08→Ch09→Ch10→Ch12→Ch22
- **全景学习路径**（4 周）：顺序通读 Part 1-6
- **按主题跳读路径**（灵活）：Ch01→Ch04→跳到你感兴趣的主题章节

## 配套材料

本导读基于以下已有研究笔记，可交叉参阅：

- [156 篇论文笔记](../notes/)——每篇 300-450 行精读，含 TL;DR、场景类比、逐段拆解
- [62 个术语词典](../notes/glossary.json)——零基础友好的术语速查
- [11 个主题元数据](../notes/topics.json)——每个主题的入门三连和学习路线
- [导师指定 13 篇论文清单](../research-task.md)——Task 1 & Task 2 任务说明
- [LLaVA 英文汇报 Deck](../deck/)——14 页 atelier-zero 风格演示文稿
- [学习进度日记](../progress.md)——当前进度和下一步计划
