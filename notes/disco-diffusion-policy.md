---
title: "DISCO: Language-Guided Manipulation with Diffusion Policies and Constrained Inpainting"
slug: disco-diffusion-policy
topic: diffusion-policy
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2406.09767"
venue: arXiv
year: 2024
era: frontier
num: 187
generated_at: 2026-07-15
---

# DISCO：用 VLM 生成语义 keyframe，再用 constrained inpainting 驱动 diffusion policy

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本、arXiv 元数据和作者项目页能支持的结论；本站没有复现仿真或真实机器人实验，因此不会把论文报告的成功率写成本站 E4 结果。

## 一句话讲什么（TL;DR）

DISCO 提出一个 zero-shot、open-vocabulary 的 language-guided manipulation 框架。它不直接把语言塞进 diffusion policy，而是先用现成 VLM（论文里举 ChatGPT4 / ChatGPT4o）把自然语言任务转成粗粒度 3D keyframes，再用这些 keyframes 通过 diffusion inpainting 引导动作序列生成。为了避免 VLM 生成的 keyframe 不准或超出训练分布，DISCO 进一步加入 constrained inpainting optimization，在“听语言指令”和“留在 diffusion policy 学过的动作分布里”之间做平衡。

如果只记一个直觉：DISCO 像让一个会看图说话的助手先在地图上点几个“应该经过的大概位置”，再让 diffusion policy 生成真正能执行的轨迹；但如果助手点得太离谱，系统不会硬走过去，而会找一个更像训练数据、又尽量接近指令的位置。

*所以这一节是想说：DISCO 用 VLM 语义 keyframe 解决开放语言指令，用 constrained inpainting 防止 keyframe 误导动作生成。*

## 这是个什么场景

机器人操作越来越希望听懂自然语言。用户不会只说固定标签，比如 “pick mug”；他可能说 “move the mug from the table to the cupboard”“avoid the can and pick up the mug”“grasp the handle on the right side”。这些话里有开放词汇、空间关系、避障要求和对象部位。

普通 diffusion policy 本来擅长从示范中学习连续动作分布，但它通常依赖训练集里的条件。如果训练集中没有某种语言表达，fine-tuned language-conditioned policy 很可能泛化不好。VLM 则相反，它懂开放语言和图像语义，但直接让 VLM 输出机器人轨迹又不可靠，因为机器人动作需要精确几何、速度、碰撞和动力学约束。

DISCO 的场景就是把两者拼起来：VLM 负责高层语言理解和关键点提示，diffusion policy 负责低层动作分布，constrained inpainting 负责把高层提示变成可执行轨迹。

```text
自然语言操作任务

语言: avoid the can and pick up the mug
视觉: multi-view images
       │
       ▼
VLM 生成 key steps + key points
       │
       ▼
映射成 3D action keyframes
       │
       ▼
Diffusion inpainting 生成动作序列
```

*所以这一节是想说：DISCO 面向开放词汇语言控制，而不是固定任务标签控制。*

## 之前的人怎么做的，为什么不够好

一种做法是直接训练 language-conditioned diffusion policy，把语言 embedding 和视觉 observation 一起输入模型。问题是它需要大量带语言标注的机器人 demonstrations。真实机器人数据昂贵，开放词汇表达更多，训练集很难覆盖所有说法。

另一种做法是用 VLM 或 LLM 生成轨迹、代码或 affordance。问题是这些高层模型不一定懂机器人低层动力学。它可能在图上画出看似合理的路线，但真实机械臂执行时会碰撞、绕远、抓不到、或落在训练分布之外。

还有 goal-conditioned inpainting 方法，可以把目标或已知片段固定住，让 diffusion 补全未知动作。但如果目标来自 VLM，它可能不精确。标准 inpainting 会强行贴合 keyframe，导致生成动作离训练分布太远，反而失败。

DISCO 的关键判断是：VLM 生成的 keyframe 只能当“粗提示”，不能当精确轨迹。系统要利用它的语义价值，同时用 diffusion policy 的 learned motion prior 约束动作。

*所以这一节是想说：旧方法要么不够开放，要么不够可执行；DISCO 想让语言理解和动作先验互相制衡。*

## 这篇论文的新想法

第一，新想法是用 off-the-shelf VLM 生成 semantic keyframes。VLM 先分解任务步骤，再在图像中标关键点，最后把关键点映射到机器人环境中的 action keyframe。

第二，新想法是用 diffusion inpainting 接收这些 keyframes。Inpainting 原本常用于补图，这里改成补动作序列：keyframe 是 known part，未确定的动作是 unknown part，diffusion policy 负责补全。

第三，新想法是 constrained inpainting optimization。它不是硬性满足 keyframe，而是要求生成动作既尽量接近 keyframe，又不要离训练数据分布太远。论文用 negative log-likelihood constraint 来表达“不要跑出高支持区域”。

第四，新想法是 zero-shot open-vocabulary transfer。DISCO 不要求为每个新语言任务重新 fine-tune policy，而是用 VLM 解释新指令，再用已有 diffusion policy 做动作生成。

```text
标准 inpainting 和 DISCO 的区别

标准 inpainting:
  VLM keyframe -> 强制贴合 -> 可能 OOD / 失败

DISCO constrained inpainting:
  VLM keyframe -> 尽量贴合
               -> 同时保持 high-likelihood motion prior
               -> 更稳的动作序列
```

*所以这一节是想说：DISCO 的核心不是“VLM 画点”，而是“粗语义点 + 动作分布约束”。*

## 它分几步做的（方法）

### 第 1 步：VLM delineates key steps

输入是自然语言 task description 和 multi-view observations。VLM 先把任务拆成关键步骤。例如 “avoid the can and pick up the mug” 可以拆成从罐子右侧接近杯子、抓住杯柄并抬起。

处理过程是 prompt VLM，让它用图像和语言共同推理。输出不是动作，而是 key steps，类似“先做什么、再做什么”的语义计划。

这一步的作用是把开放语言转成更结构化的中间表示。它利用 VLM 的常识和视觉理解，但还没有进入机器人执行层。

### 第 2 步：VLM maps key points on observations

第二步让 VLM 在图像上标 key points。论文特别说明使用 points 而不是 paths，因为初步测试发现当前 VLM 生成 key points 比生成完整 paths 更可靠。

输入是 key steps 和图像 observation；处理是让 VLM 标出与步骤对应的图像点；输出是 image-space key points。比如抓杯柄，就标杯柄附近的点。

这些 key points 不是精确 grasp point，也不是最终路径。它们只是 coarse guidance，告诉 diffusion policy “大概往哪里去”。

### 第 3 步：把 key points 转成 3D action keyframes

图像上的点不能直接给机器人执行。DISCO 需要把 key points 映射到环境里的 3D position 或其他 action representation。

输入是多视角图像点、机器人当前状态和环境标定；处理包括从 image keypoint 到 3D position 的映射、inverse kinematics 或任务相关转换；输出是 action keyframe，例如 end-effector position、velocity 或 grasp pose。

这一步是 VLM 语义和机器人几何之间的桥。没有这一步，VLM 点再准也只是图片上的像素。

### 第 4 步：用 keyframes 做 conditional diffusion inpainting

Diffusion policy 生成的是 action sequence。Inpainting 的思想是把某些动作位置当成 known part，让模型补全其他 unknown actions。

输入是 observation、keyframes、inpainting mask 和 diffusion policy。处理是在反向 diffusion 过程中，把 keyframe 条件注入动作序列生成。输出是满足 keyframe guidance 的动作序列。

如果 keyframe 在训练分布附近，标准 inpainting 就可以工作。但如果 keyframe 不准，强制贴合会让轨迹变得不自然。

### 第 5 步：constrained inpainting optimization

DISCO 的关键修正是：当 keyframe 可能落在 low-likelihood region，系统不强行到达它，而是在约束下优化动作。目标是减小和 keyframe 的距离，同时保持动作处在 diffusion policy 的高支持区域。

输入是 keyframe distance、diffusion model 对动作的 likelihood estimate、约束超参数 gamma。处理是求解一个受约束优化问题。输出是更接近训练动作分布的 action sequence。

直觉上，这像导航时用户说“从那里过去”，但如果那里是墙，机器人不会撞墙，而是在附近找一条可行路。

### 第 6 步：在仿真和真实机器人中评估

论文在多种 simulation environments 中评估，包括 language-guided block pushing、object grasping、Franka Kitchen、CALVIN 等，也做 real-robot language-guided grasping。

评估问题主要有两个：VLM-generated keyframes 是否能有效引导语言任务完成；constrained inpainting 是否比 vanilla inpainting 更稳，尤其是在 novel task descriptions 上。

论文报告 DISCO 在 seen tasks 上可达到 comparable performance，在 unseen/open-vocabulary tasks 上明显优于 fine-tuned language-conditioned baselines，并能 zero-shot transfer 到真实机器人 grasping。

*所以这一节是想说：DISCO 的方法是“语言到 keyframe，再从 keyframe 到受约束动作生成”。*

## 关键数字

| 数字或设置 | 原文语境 | 这说明什么 |
|---|---|---|
| 3 steps | VLM 生成 keyframe：分解步骤、标图像点、生成 action keyframe | 语义到动作提示的流水线 |
| multi-view | DISCO 使用多视角观察生成 3D keyframe | 单视角不一定足以定位 |
| 3 × 1000 trials | CALVIN 中 DISCO 结果统计设置 | 论文对 benchmark 做重复试验 |
| 50 trials | simulation zero-shot unseen tasks 成功率统计 | 评估开放语言泛化 |
| 25% | real-world cluttered unseen grasping 成功率片段 | 论文报告能在真实机器人上有一定 zero-shot 信号 |
| gamma | constrained inpainting 的分布支持约束 | 平衡 keyframe adherence 和 motion prior |

这些数字全部是论文报告，不是本站复现实验。DISCO 的表格被 PDF 文本抽取得不够整齐，后续人工核验时应回到原 PDF 表格逐项确认。

*所以这一节是想说：DISCO 的数字重点在 zero-shot/open-vocabulary 评估和 constrained inpainting ablation。*

## 实验结果说明了什么

实验说明 VLM-generated keyframes 可以把开放语言任务转成 diffusion policy 能利用的中间约束。相比直接 fine-tune language-conditioned policy，DISCO 在 unseen instructions 上更有优势，因为 VLM 本身有更广的语言和视觉常识。

实验也说明 constrained inpainting 比 vanilla inpainting 更稳。Vanilla inpainting 强制贴合 keyframe，如果 keyframe 不准，就会把动作拖向 OOD 区域；constrained version 会保持在 diffusion policy 学到的动作支持区域附近。

真实机器人测试说明，DISCO 的结构有 sim-to-real 信号，至少能把语言、视觉 keyframe 和 grasp pose 生成连起来。但 25% 这类结果也提醒我们：zero-shot open-vocabulary 操作仍然不稳定，远不是通用家务机器人。

实验边界也很明显：VLM keyframe 质量是上限之一，多视角标定和 3D 映射会引入误差，diffusion policy 的训练分布决定了可执行动作范围。

*所以这一节是想说：DISCO 证明了语义 keyframe 很有用，但真实操作仍受 VLM、几何映射和动作先验共同限制。*

## 术语表

- Open-vocabulary：指令不局限在固定标签表里，可以用自然语言自由描述。
- Keyframe：动作序列中的关键状态或关键点，提供粗粒度引导。
- Inpainting：给定部分已知内容，让生成模型补全未知内容；这里补的是动作序列。
- Constrained optimization：带约束的优化，既追目标又不能违反边界。
- Motion prior：模型从训练数据中学到的“什么动作像可行动作”的先验。
- OOD：Out-of-distribution，超出训练分布。
- CALVIN：语言条件长程机器人操作 benchmark。

*所以这一节是想说：DISCO 的关键词是 keyframe、inpainting 和分布约束。*

## 局限和边界

第一，DISCO 依赖 VLM 生成 keyframes。VLM 如果误解语言、看错图像或标错点，后续 diffusion policy 会受到影响。

第二，keypoint 到 3D action keyframe 的映射依赖标定和环境表示。现实里相机误差、遮挡和深度不准都会影响执行。

第三，constrained inpainting 需要选择合适的 gamma 等超参数。约束太松会被坏 keyframe 带偏，太紧又可能忽略语言指令。

第四，真实机器人 zero-shot 成功率还不高，不能把它解释成可靠通用操作系统。

第五，DISCO 主要在已有 diffusion policy 能覆盖的动作分布内工作。如果训练 policy 没见过某类动作，VLM 再聪明也很难凭空创造可执行技能。

*所以这一节是想说：DISCO 是开放语言到动作的桥，但桥的两端都有限制。*

## 和其他论文的关系

和 `time-unified-diffusion-policy` 相比，DISCO 关注语言泛化和 keyframe 条件；TUDP 关注 denoising efficiency 和 action discrimination。

和 `primitive-skill-diffusion-policy` 相比，DISCO 的中间层是 VLM keyframes，SDP 的中间层是 primitive skills。一个把语言转空间关键点，一个把语言转可解释技能。

和 `trace-focused-diffusion-policy` 相比，DISCO 处理开放指令，TF-DP 处理长程执行阶段歧义。两者都在给 diffusion policy 补额外上下文。

和原始 `diffusion-policy` 相比，DISCO 不改变 diffusion policy 的核心优势，而是在条件生成上加入 VLM 语义接口。

*所以这一节是想说：DISCO 是 Batch 7 里“语言条件扩展 diffusion policy”的代表。*

## 和本导读的关系

本站已有 diffusion policy 基础笔记，重点是动作扩散、receding horizon 和视觉条件。DISCO 往前走一步：如果用户说的是开放语言，怎么把语言变成 diffusion policy 能用的条件？

它适合和 VLA、affordance、RT-Trajectory、primitive skill 等笔记一起读。读者可以把它当成“VLM 负责语义，DP 负责动作”的一个工程组合例子。

*所以这一节是想说：DISCO 补齐了 diffusion policy 面向开放语言指令的一条路线。*

## 思考题

1. 为什么 VLM 直接生成完整机器人轨迹不可靠？
2. Keyframe 为什么比完整 path 更适合作为 VLM 输出？
3. Vanilla inpainting 为什么可能被不准的 keyframe 带偏？
4. Constrained inpainting 中“留在训练分布内”为什么重要？
5. DISCO 和 skill-conditioned diffusion policy 的中间表示有什么不同？

## FAQ

**Q：DISCO 需要为每个新语言任务重新训练吗？**
A：论文目标是 zero-shot open-vocabulary。它利用 VLM 解释新指令，再用已有 diffusion policy 和 inpainting 执行动作生成。

**Q：VLM 标出的 keyframe 是精确 grasp point 吗？**
A：不是。论文强调它是 coarse guidance，不是精确轨迹或抓取点。

**Q：DISCO 是不是低层控制器？**
A：它生成动作序列或 grasp pose，但仍依赖已有 diffusion policy、环境映射和机器人控制栈。

**Q：本站复现了真实机器人 grasping 吗？**
A：没有。这里只记录论文报告。

## 进一步读什么

- `diffusion-policy`：理解动作扩散基础。
- RT-Trajectory：理解 VLM 轨迹提示和机器人执行之间的关系。
- `primitive-skill-diffusion-policy`：比较 keyframe 中间层和 skill 中间层。
- `trace-focused-diffusion-policy`：理解 long-horizon diffusion policy 的历史上下文问题。

## 精读补充：为什么 DISCO 不把 VLM 当成动作模型

读 DISCO 时，最重要的边界是：VLM 负责语义，不负责最终动作。VLM 的强项是看图、理解语言、找出关键对象和大致区域；弱项是连续控制、碰撞约束、机器人几何和动作分布。把这两类能力混在一起，就容易误以为“GPT-4V 画一个点，机器人就能抓”。实际系统必须经过 keypoint 到 3D keyframe、再到 diffusion action sequence 的多级转换。

DISCO 的工程智慧在于承认 VLM 输出是粗糙的。它没有把 keyframe 当成必须严格满足的目标，而是把它当成可商量的条件。Constrained inpainting 里的 likelihood constraint 就是在说：如果这个 keyframe 离训练分布太远，policy 应该在附近找一个更合理的动作，而不是为了听话牺牲可执行性。

这也解释了为什么 DISCO 适合 open-vocabulary，但不等于 open-skill。用户可以说新的对象名、新的空间描述、新的任务句式，VLM 能帮助解释；但底层 diffusion policy 仍然只会它训练过或相近分布里的动作。开放语言扩大了“说法”的范围，不自动扩大“技能”的范围。

对真实机器人部署来说，DISCO 还需要额外安全层。VLM 可能看错，3D 映射可能错，diffusion policy 可能生成碰撞动作。因此实际系统应该有碰撞检测、动作限幅、失败恢复和人工接管。论文展示的是语言到动作生成的研究路线，而不是完整安全产品。

*所以这一节是想说：DISCO 的关键是把 VLM 的开放语义能力限制在 keyframe 层，再让动作先验负责可执行性。*

## 后续核验清单

如果之后要把本文从 `UNVERIFIED` 提升到人工核验状态，应逐项核对：DISCO 全称、三步 keyframe generation、constrained inpainting 公式和 gamma 约束、simulation environments、CALVIN 设置、真实机器人 grasping 的 25% 相关表述、seen/unseen task 结果是否按原文表格准确转写。

## 原文信息

- arXiv: [2406.09767](https://arxiv.org/abs/2406.09767)
- PDF: [https://arxiv.org/pdf/2406.09767](https://arxiv.org/pdf/2406.09767)
- Project: [https://disco2025.github.io/](https://disco2025.github.io/)

```bibtex
@article{hao2024disco,
  title = {DISCO: Language-Guided Manipulation with Diffusion Policies and Constrained Inpainting},
  author = {Hao, Ce and Lin, Kelvin and Xue, Zhiwei and Luo, Siyuan and Soh, Harold},
  journal = {arXiv preprint arXiv:2406.09767},
  year = {2024}
}
```
