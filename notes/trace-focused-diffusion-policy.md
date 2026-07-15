---
title: "Trace-Focused Diffusion Policy for Multi-Modal Action Disambiguation in Long-Horizon Robotic Manipulation"
slug: trace-focused-diffusion-policy
topic: diffusion-policy
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2602.07388"
venue: arXiv
year: 2026
era: frontier
num: 190
generated_at: 2026-07-15
---

# TF-DP：把机器人历史轨迹投到图像里，解决长程任务的动作歧义

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本、arXiv 元数据和项目页能支持的结论；本站没有复现真实机器人实验，因此不会把论文报告的成功率写成本站 E4 结果。

## 一句话讲什么（TL;DR）

Trace-Focused Diffusion Policy 提出 TF-DP，用于解决 long-horizon robotic manipulation 中的 multi-modal action ambiguity，论文简称 MA2。问题是：长程任务里，视觉上很像的观察会在不同执行阶段反复出现，但对应动作不同。只看当前图像，diffusion policy 可能不知道现在该做“第一步放右边”还是“下一步放左边”。

TF-DP 的做法是显式记录 robot execution history，把 end-effector 的历史运动投影成 image-space execution trace，再生成 trace-focused field，作为 diffusion policy 的额外视觉条件。论文报告 TF-DP 相比 vanilla diffusion policy，在 MA2 任务上提升 80.56%，在 visual disturbances 下提升 86.11%，同时只增加 6.4% runtime。

如果只记一个直觉：TF-DP 给机器人动作生成加了“我刚刚走过哪条路”的记忆。当前画面看起来一样，但历史轨迹不同，模型就能知道自己处在任务的哪个阶段。

*所以这一节是想说：TF-DP 用执行历史解决长程 diffusion policy 的阶段歧义。*

## 这是个什么场景

很多机器人任务不是一步完成，而是长程顺序任务。比如按键盘、搬多个方块、从抽屉里按顺序取放物体。执行过程中，视觉画面可能反复出现相似状态：同一个桌面、同一个方块、同一个机械臂姿态附近。但不同阶段要求不同动作。

普通 diffusion policy 通常根据 instantaneous observation 生成动作。它看当前图像，如果图像和之前某个阶段很像，就可能采样到多个可能动作之一。长程任务中，这种 one-to-many observation-action mapping 会导致 temporal order 错乱。

论文把这个问题叫 multi-modal action ambiguity，MA2。这里的 multi-modal 不是多模态传感器，而是同一个观察对应多个有效动作模式。对于长程任务，当前动作必须知道历史，否则会走错阶段。

```text
MA2 直觉

同一视觉观察:
  cube 在桌面中间，机械臂靠近

阶段 A: 应该把 cube 放到右边
阶段 B: 应该把 cube 放到左边

只看当前图像 -> 两个动作都像合理
看历史 trace -> 知道已经做过哪一步
```

*所以这一节是想说：长程操作里，当前图像不够，历史执行轨迹是必要上下文。*

## 之前的人怎么做的，为什么不够好

一种常见做法是把长程任务拆成多个短程 sub-tasks，用 hierarchical policy 或 LLM planner 逐段调用短程 policy。这能避免某些阶段歧义，但会引入高层 planner 的延迟、计算成本和错误累积。

另一种做法是把历史 observation 或 history actions 直接拼到 policy 输入里。问题是历史越长，token 或 feature 越多，计算和内存成本上升，而且模型不一定知道历史中哪些部分和当前阶段相关。

普通 diffusion policy 的优势是单 policy、反应快、能建模动作分布；但它的弱点是只看当前 observation 时难以保持 temporal consistency。长程任务会让它在相似视觉状态之间混淆。

TF-DP 的判断是：不必把完整历史都塞进网络，可以把历史 end-effector motion 压缩成 explicit execution trace，并投影到图像空间。这样历史变成直观、轻量、和视觉对齐的条件。

*所以这一节是想说：旧方法要么依赖高层分解，要么历史输入太重；TF-DP 用图像化 trace 做轻量历史条件。*

## 这篇论文的新想法

第一，新想法是明确提出 MA2。论文把 long-horizon manipulation 中“视觉相似但动作不同”的问题命名为 multi-modal action ambiguity，并说明这是 single-policy diffusion model 的关键限制。

第二，新想法是 execution trace。TF-DP 累积历史 end-effector positions，把历史运动轨迹从 3D robot space 投影到 2D global camera space，生成 trace image。

第三，新想法是 trace-focused field。它不只画轨迹，还基于轨迹生成一个 focus field，强调和历史运动相关的任务区域，抑制背景视觉干扰。

第四，新想法是保持 single policy。TF-DP 不依赖 LLM planner 或多阶段 policy，而是在一个 diffusion policy 内引入 execution-aware observations。

```text
TF-DP 输入增强

原始 observation:
  global image + side image + wrist image + end-effector pose

加入历史:
  historical end-effector trace
        │
        ▼
  trace image + trace-focused field
        │
        ▼
execution-aware observation
        │
        ▼
diffusion policy denoising
```

*所以这一节是想说：TF-DP 把历史动作变成视觉条件，而不是把长历史直接塞进模型。*

## 它分几步做的（方法）

### 第 1 步：定义历史 end-effector trace

输入是机器人执行到当前时刻的 end-effector positions，论文记为历史轨迹集合。它包含每个过去时刻的 3D 位置。

处理过程是把这些历史点组织成 compact execution trace。输出不是长视频，也不是所有历史 action tokens，而是一条历史运动路径。

这一步把“我做过什么”压缩成“我走过哪里”。对于很多 manipulation 任务，末端执行器走过的路径足以提示当前阶段。

### 第 2 步：把 3D trace 投影到 2D 图像空间

TF-DP 使用世界坐标、end-effector 坐标和 global camera 坐标之间的关系，把 3D historical trace 投影到 global camera image。

输入是 3D trace 和相机几何。处理是 projection。输出是 image-space trace image。这样历史信息和视觉 observation 对齐，模型可以在图像上直接看到过去轨迹。

这一步的直觉是给当前画面画上“运动笔迹”。同一个桌面图像，如果笔迹不同，模型就能判断不同执行阶段。

### 第 3 步：生成 trace-focused field

只有轨迹线还不够。TF-DP 进一步把 discrete trajectory points 扩展成 continuous energy field，也就是 trace-focused field。它强调和历史运动相关的区域，弱化背景。

输入是 2D trace points。处理是 field rendering，把轨迹周围变成更连续的关注区域。输出是 enhanced global view。

这一步帮助模型抵抗 visual disturbances。背景杂物或视觉干扰可能误导 policy；trace-focused field 把注意力拉回任务相关区域。

### 第 4 步：构造 execution-aware observation

最终 observation 包含 enhanced global image、side image、wrist image、trace image 和 end-effector pose。论文用这些作为 diffusion policy 的条件。

输入是原始多视角 observation 和 trace-derived images。处理是拼成 execution-aware observation。输出给 denoising policy。

这一步让 diffusion policy 在生成动作时同时看到当前场景和历史阶段。于是 visually similar observation 不再完全相同，因为 trace 不同。

### 第 5 步：closed-loop training and inference

训练时，TF-DP 学习从带 trace 的 observation 到下一步 action。推理时，机器人每执行一步，就更新 accumulated execution trace，再生成下一步动作。

输入是在线执行中的历史和当前观测。处理是持续更新 trace 并闭环调用 policy。输出是 temporally consistent actions。

这种方式不需要高层 planner，也不需要存完整历史序列，计算开销较小。

### 第 6 步：真实机器人任务评估

论文在三个 real-world manipulation tasks 上评估，因为作者认为没有现成 simulation benchmark 专门聚焦 MA2 问题。任务包括 place cube、press keyboard、pick & place cubes from drawers 等具有阶段歧义的长程任务。

论文比较原始 DP、DP-HistAct、TF-DP(trace) 和 full TF-DP。结果显示 full TF-DP 在 MA2 tasks 平均成功率 91.67%，显著高于 baseline；摘要还报告相比 vanilla diffusion policy 在 MA2 任务上提升 80.56%，在 visual disturbances 下提升 86.11%，runtime 只增加 6.4%。

*所以这一节是想说：TF-DP 的方法是把历史运动投影成视觉记忆，让单个 diffusion policy 也能做长程阶段区分。*

## 关键数字

| 数字 | 原文语境 | 这说明什么 |
|---:|---|---|
| 80.56% | 相比 vanilla diffusion policy，在 MA2 tasks 上提升 | 历史 trace 对阶段歧义有效 |
| 86.11% | visual disturbances 下的提升 | trace-focused field 提高鲁棒性 |
| 6.4% | runtime increase | 历史条件带来的推理开销较小 |
| 3 | real-world manipulation tasks | 评估集中在真实长程 MA2 场景 |
| 91.67% | full TF-DP 平均成功率表格片段 | 高于 DP / DP-HistAct / trace-only |
| 18% | GPU memory increase compared with DP | 比直接拼历史动作更轻 |
| 36% / 107% | DP-HistAct inference / training memory increase | 说明直接拼历史成本更高 |

这些数字全部是论文报告，不是本站复现实验。后续人工核验应回到 Table 1、Table 2 和 runtime 图确认。

*所以这一节是想说：TF-DP 的证据重点是长程阶段歧义和视觉干扰下的成功率提升。*

## 实验结果说明了什么

实验说明，执行历史是解决 MA2 的强信号。只看当前 observation，DP 和 DP-HistAct 都容易在类似视觉阶段采样错动作；加上 trace 后，模型能恢复正确 temporal order。

Trace-focused field 的 ablation 也有意义。TF-DP(trace) 只加入显式 motion trace，full TF-DP 再加入 focus field。论文报告 full version 在多个任务上进一步提升，说明背景抑制和任务区域强调确实有帮助。

Runtime 对比说明，TF-DP 的历史条件比较轻。它增加 0.02s action chunk prediction time 和 1.2ms TFF rendering time，整体 +6.4%。相比 DP-HistAct 的 36% inference increase 和 107% training memory increase，trace 投影更实用。

但实验边界也很清楚：任务数量是三个真实任务，虽然针对 MA2 很直接，但还需要更多任务、更多机器人和更多扰动验证。

TF-DP 的结果还说明，历史信息不一定要以 token 序列形式输入。很多人看到“需要历史”，第一反应是把过去帧、过去动作全部拼进去。但机器人控制里历史会快速增长，直接拼接会带来计算和显存压力。Trace projection 的优势是把长历史压缩成空间图案，让视觉 backbone 用熟悉的图像方式处理历史。

同时，trace 不是万能记忆。它主要记录“末端走过哪里”，适合区分空间路径和任务阶段。如果任务关键状态是“夹爪里是否真的夹住了透明物体”或“软体物体内部应变”，单条末端轨迹可能不够。未来更完整的系统可能把 trace、object state、force sensing 和 language subgoal 结合起来。

*所以这一节是想说：TF-DP 证明了图像化历史轨迹是低成本、有效的长程条件。*

## 术语表

- MA2：Multi-modal Action Ambiguity，同一观察在不同阶段对应多个可能动作。
- Execution trace：机器人末端执行器历史运动轨迹。
- Trace-focused field：由历史轨迹生成的连续关注场，强调任务相关区域。
- DP-HistAct：把历史 actions 作为额外输入的 baseline。
- End-effector：机器人实际执行操作的末端，比如夹爪。
- Global camera / wrist camera：外部全局视角和手腕视角相机。
- Temporal consistency：动作顺序随时间保持一致。

*所以这一节是想说：TF-DP 的关键词是历史轨迹、阶段上下文和长程一致性。*

## 局限和边界

第一，TF-DP 依赖 end-effector trace。如果任务关键历史不是末端路径，比如物体内部状态或隐藏接触，trace 可能不够。

第二，投影依赖相机标定和坐标变换。标定误差会让 trace image 偏移。

第三，trace-focused field 适合强调运动相关区域，但可能忽略非运动但重要的上下文，例如目标物体状态变化。

第四，实验任务数量有限。三个真实任务针对性强，但不足以证明所有长程 manipulation 都能解决。

第五，TF-DP 不是语言规划方法。它解决阶段歧义，不负责把开放语言拆成任务。

第六，trace 本身也可能积累执行误差。如果机器人实际路径已经偏离任务目标，历史轨迹会忠实记录错误进度，后续 policy 仍需要恢复机制。

*所以这一节是想说：TF-DP 是很实用的历史条件方法，但它只覆盖部分长程记忆问题。*

## 和其他论文的关系

和 `disco-diffusion-policy` 相比，TF-DP 不处理开放语言 keyframe，而处理长程执行历史。DISCO 是语义条件，TF-DP 是历史条件。

和 `time-unified-diffusion-policy` 相比，TUDP 关注 denoising efficiency，TF-DP 关注 observation-action ambiguity。

和 `primitive-skill-diffusion-policy` 相比，SDP 用当前 primitive skill 表示阶段，TF-DP 用过去执行轨迹表示阶段。

和原始 `diffusion-policy` 相比，TF-DP 保留单 policy 优势，但增加 explicit trace memory。

*所以这一节是想说：TF-DP 是 Batch 7 里“历史记忆增强 diffusion policy”的代表。*

## 和本导读的关系

本站学习 diffusion policy 时，常关注动作分布和去噪过程。TF-DP 提醒我们，长程任务还有另一个问题：同一画面在不同时间意义不同。没有历史，动作分布会变得歧义。

它适合和 memory、world model、skill policy 一起读。读者可以用它理解为什么机器人 policy 不能只看当前帧，也不能无限堆历史，而要设计合适的历史表示。

*所以这一节是想说：TF-DP 补齐了 diffusion policy 的长程执行记忆视角。*

## 思考题

1. 什么是 MA2？它和普通多模态传感器有什么不同？
2. 为什么同一视觉观察在长程任务中可能对应不同动作？
3. Execution trace 为什么比直接拼接全部历史 action 更轻？
4. Trace-focused field 如何帮助抵抗背景视觉干扰？
5. 哪些任务只靠 end-effector trace 可能不够？

## FAQ

**Q：TF-DP 是不是把所有历史图像都喂给模型？**
A：不是。它把历史 end-effector motion 压缩成 trace，并投影到图像空间。

**Q：它需要 LLM planner 吗？**
A：不需要。TF-DP 的目标是在 single diffusion policy 内解决 MA2。

**Q：80.56% / 86.11% 是本站复现的吗？**
A：不是。它们是论文报告的相对提升。

**Q：为什么 trace 投影到图像里，而不是保留 3D 坐标？**
A：图像投影能和视觉 observation 对齐，让 CNN/视觉编码器直接利用历史空间线索，也更轻量。

## 进一步读什么

- `diffusion-policy`：理解基本动作扩散。
- `primitive-skill-diffusion-policy`：理解用 skill 表示阶段。
- memory in embodied AI：理解短期历史和任务状态。
- long-horizon manipulation benchmark：理解阶段歧义如何导致失败。

## 精读补充：trace 为什么是“任务进度条”，不是普通轨迹可视化

TF-DP 的 trace 看起来像在图像上画一条轨迹，但它真正表达的是任务进度。长程任务里，机器人看到的场景可能回到类似状态，但历史路径不会完全一样。轨迹告诉模型：我已经从中间放到右边，还是还没做这一步；我已经按过前几个键，还是刚开始执行。

这和普通 path visualization 不同。普通轨迹图给人看，TF-DP 的 trace 是给 policy 用的条件。它被投影到 global camera view，并和当前 observation 一起进入网络，参与下一步动作 denoising。也就是说，trace 是模型输入的一部分，不是论文图里的解释性插图。

Trace-focused field 进一步把离散轨迹变成连续关注区域。这样做有两个好处：第一，轨迹点之间也能形成空间线索；第二，背景干扰会被相对弱化。对视觉 clutter 很多的真实桌面任务来说，这比只拼历史动作向量更贴近视觉 policy 的处理方式。

但 trace 也有盲区。它记录的是末端执行器在哪里走过，不一定记录物体是否已经被抓住、抽屉内部是否打开、柔性物体是否变形。如果任务状态主要体现在物体内部或隐藏接触上，trace 可能需要和 object state、force、language subgoal 或 memory module 结合。

*所以这一节是想说：TF-DP 的 trace 是轻量任务进度记忆，但不是完整世界状态。*

## 后续核验清单

如果之后要把本文从 `UNVERIFIED` 提升到人工核验状态，应逐项核对：MA2 定义、trace projection 公式、TFF rendering、三个真实任务设置、TF-DP(trace) 与 full TF-DP ablation、80.56% / 86.11% / 6.4% / 91.67% / 18% / 36% / 107% 对应原文表格和图。

## 原文信息

- arXiv: [2602.07388](https://arxiv.org/abs/2602.07388)
- PDF: [https://arxiv.org/pdf/2602.07388](https://arxiv.org/pdf/2602.07388)
- Project: [https://ntumars.github.io/project/TFDP](https://ntumars.github.io/project/TFDP)

```bibtex
@article{hu2026tracefocused,
  title = {Trace-Focused Diffusion Policy for Multi-Modal Action Disambiguation in Long-Horizon Robotic Manipulation},
  author = {Hu, Yuxuan and Chen, Xiangyu and Zhou, Chuhao and Liu, Yuxi and Li, Gen and Jia, Jindou and Yang, Jianfei},
  journal = {arXiv preprint arXiv:2602.07388},
  year = {2026}
}
```
