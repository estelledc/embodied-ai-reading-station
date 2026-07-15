---
title: "Towards Generalizable Vision-Language Robotic Manipulation: A Benchmark and LLM-guided 3D Policy"
slug: gembench
topic: dataset-eval
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2410.01345"
venue: ICRA
year: 2025
era: frontier
num: 196
generated_at: 2026-07-15
---

# GEMBench：专门拷问视觉语言机器人操作“泛化能力”的 benchmark

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本、arXiv 元数据和项目页能支持的结论；本站没有复现 RLBench / GemBench 或真实机器人实验，因此不会把论文报告的成功率写成本站 E4 结果。

## 一句话讲什么（TL;DR）

GEMBench 的出发点很直接：很多 vision-language robotic manipulation benchmark 主要测训练中见过的任务，或者只测轻微扰动，无法真正回答“机器人能不能泛化到新任务”。论文提出 GEMBench，一个基于 RLBench 的仿真 benchmark，用 16 个训练任务、31 个训练 variations 和 44 个测试任务、92 个测试 variations，分四级评估泛化：新摆放、新刚体物体、新关节物体、长程任务组合。

论文还提出 3D-LOTUS 和 3D-LOTUS++。3D-LOTUS 是一个 language-conditioned point cloud transformer，擅长执行 seen tasks 和 Level 1；3D-LOTUS++ 把 LLM 的 task planning、VLM 的 object grounding 和 3D-LOTUS 的 motion control 组合起来，在更难的 Level 2–4 上提升泛化。

如果只记一个直觉：GEMBench 像给机器人设置了四级考试。第一级只是换位置，第二级换刚体物体，第三级换带关节的物体，第四级要求把多个已学动作组合成长程任务。它不只问“会不会做训练题”，而是问“换题型还能不能做”。

*所以这一节是想说：GEMBench 把语言条件操作的泛化拆成可测的四级难度。*

## 这是个什么场景

机器人如果只会训练任务，实际价值很有限。用户不会每次都给机器人和训练集一样的物体、位置、颜色和任务组合。真实环境里，杯子颜色会变，抽屉位置会变，门把手形状会变，任务还会从“打开抽屉”变成“打开抽屉，把几个东西按顺序放进去”。

很多已有 benchmark 有价值，但常常偏向 seen-task evaluation。模型可能在 benchmark 上分数高，是因为测试任务和训练任务结构太像，而不代表它能处理 novel rigid objects、articulated objects 或 long-horizon combinations。

GEMBench 的场景是 vision-language robotic manipulation generalization。它使用 RLBench 作为物理仿真基础，保留语言指令、视觉输入和机器人操作任务，同时系统性构造训练/测试 split。

```text
GEMBench 的四级泛化考试

训练: 16 tasks / 31 variations / 7 primitives
       │
       ▼
Level 1: Novel placements
Level 2: Novel rigid objects
Level 3: Novel articulated objects
Level 4: Novel long-horizon tasks
```

*所以这一节是想说：GEMBench 面向的是“真正换任务、换物体、换组合”的泛化评估。*

## 之前的人怎么做的，为什么不够好

第一，许多 benchmark 测的是同一任务分布内的表现。例如 RLBench-18Task 可以评估多任务操作，但测试和训练任务高度相关，不能充分反映新任务泛化。

第二，一些 benchmark 只做视觉扰动或位置扰动。这能测 robustness，但不能测结构性泛化，比如从“打开抽屉”迁移到“把多个东西放进抽屉再关闭”。

第三，已有方法常对 pick-and-place 比较友好，但对旋转、螺丝、打开/关闭、推拉、长程组合等任务支持弱。真实操作需要多种 action primitives，而不是只拿和放。

第四，foundation model 组合方法能规划，但常缺少系统 benchmark 证明它在哪一级泛化有效、哪里失败。没有分级 benchmark，就很难定位失败来自 grounding、planning 还是 motion control。

GEMBench 的判断是：泛化不能笼统地说“新任务”。必须拆成清晰层级和变化类型，才能让模型比较有意义。

*所以这一节是想说：旧评估不够系统，GEMBench 试图把泛化难度拆开测。*

## 这篇论文的新想法

第一，新想法是构造四级测试 split。Level 1 是 novel placements，Level 2 是 novel rigid objects，Level 3 是 novel articulated objects，Level 4 是 novel long-horizon tasks。

第二，新想法是覆盖七种 action primitives：press、pick、push、screw、close、open、put。这比只测 pick/place 更接近复杂操作。

第三，新想法是 3D-LOTUS。它使用 3D point cloud 和 language-conditioned transformer，把语言条件操作从 2D 图像扩展到更几何化的 3D 表示。

第四，新想法是 3D-LOTUS++。它不是纯端到端 policy，而是用 LLM 做 task planning、VLM 做 object grounding、3D-LOTUS 做 motion controller。模块化让它更适合 novel tasks，但也暴露 grounding 和 planning 的瓶颈。

```text
3D-LOTUS++ 模块分工

language instruction
       │
       ▼
LLM task planner -> step-by-step actionable plan
       │
       ▼
VLM object grounding -> locate objects mentioned in plan
       │
       ▼
3D-LOTUS motion controller -> generate 3D action trajectory
```

*所以这一节是想说：GEMBench 不只是数据集，也提出了“LLM/VLM + 3D policy”的泛化基线。*

## 它分几步做的（方法）

### 第 1 步：从 RLBench 中选择训练任务

输入是 RLBench 的任务库。论文选择 16 个训练任务、31 个 variations，覆盖七类 action primitives。

处理上，它不是随机选任务，而是希望训练集既有多技能覆盖，又不把所有测试结构都提前暴露。训练任务包括 press、pick、push、screw、close、open、put 等基本操作。

输出是一个多技能训练 split。这个 split 是后续测试泛化的起点。

### 第 2 步：构造四级测试任务

输入是训练任务和 RLBench / 新脚本任务资源。处理上，测试集包含 44 个 tasks、92 个 variations，其中 23 个来自原 RLBench 100 tasks，21 个是新脚本任务。

Level 1 测 novel placements：任务类型相同，但对象位置变化。Level 2 测 novel rigid objects：换刚体物体、颜色、形状或类别。Level 3 测 novel articulated objects：换带关节或可开合对象。Level 4 测 long-horizon：需要组合多个已学动作完成长任务。

输出是渐进式泛化 benchmark。它让研究者知道模型到底在哪一级崩。

### 第 3 步：训练 3D-LOTUS

输入是 point cloud、语言指令和动作数据。3D-LOTUS 的全名是 Language-cOnditioned poinT cloUd tranSformer。

处理上，模型利用 3D 信息做 action prediction。相比只用 2D 图像，3D point cloud 更直接表达物体位置、几何和空间关系。

输出是一个强 motion policy。论文显示 3D-LOTUS 在 RLBench-18Task 和 GemBench Level 1 等 seen/near-seen 设置上表现强、训练效率好。

### 第 4 步：发现 3D-LOTUS 的泛化瓶颈

当任务进入 Level 2–4，3D-LOTUS 会明显下降。原因主要不是低层动作完全不会，而是 novel task 需要 planning 和 object grounding。

例如长程任务要求“先打开抽屉，再依次拿多个物体放进去”，端到端 policy 需要分解子任务；新物体要求模型把语言里的对象正确定位到场景里。

输出是问题诊断：motion controller 很强，但新任务泛化需要外部 planning / grounding 支撑。

### 第 5 步：构建 3D-LOTUS++

输入是自然语言任务、视觉观察、3D 场景和 3D-LOTUS policy。处理上，LLM 把任务分解成 action steps，VLM 定位每一步涉及的对象，3D-LOTUS 执行 primitive-level motion。

输出是模块化泛化系统。它不要求 3D-LOTUS 自己从端到端隐式学会所有新组合，而是把高层规划和视觉 grounding 交给 foundation models。

### 第 6 步：仿真和真实机器人评估

论文在 GemBench 四级上比较 Hiveformer、RVT-2、PolarNet、3D Diffuser Actor、3D-LOTUS 和 3D-LOTUS++ 等方法。每个任务 variation 多次评估，总体使用 success rate。

此外，论文还做真实机器人实验，比较 seen tasks 和 unseen tasks。结果片段显示 3D-LOTUS 在 seen real tasks 平均 8.1/10，3D-LOTUS++ 在 unseen real tasks 平均 7.9/10。

输出是两个结论：3D policy 有强执行能力，foundation model 组合能提升新任务泛化，但 object grounding 和 motion control 仍是瓶颈。

*所以这一节是想说：GEMBench 方法是“构造分级 benchmark + 用 3D-LOTUS++ 作为泛化 baseline”。*

## 关键数字

| 数字或设置 | 原文语境 | 这说明什么 |
|---|---|---|
| 16 training tasks | GemBench 训练任务 | 覆盖多技能训练 |
| 31 training variations | 训练 variations | 每个任务有不同变体 |
| 44 testing tasks | 测试任务 | 泛化测试规模更大 |
| 92 testing variations | 测试 variations | 四级泛化覆盖更多条件 |
| 7 action primitives | press/pick/push/screw/close/open/put | 不只 pick-and-place |
| 4 levels | placement/rigid/articulated/long-horizon | 泛化难度可分层诊断 |
| 20 × 5 × 92 episodes | GemBench 评估 episode 规模片段 | 每个 variation 多次评估 |
| 8.1/10 | 3D-LOTUS seen real tasks 平均成功数片段 | 真实 seen task 执行能力 |
| 7.9/10 | 3D-LOTUS++ unseen real tasks 平均成功数片段 | 模块化组合提升 unseen task |

这些数字全部是论文报告，不是本站复现实验。GEMBench 的表格很多，精确引用某模型某级分数时应回到原 PDF 表格核验。

*所以这一节是想说：GEMBench 的价值主要来自结构化泛化 split 和大量 variations。*

## 实验结果说明了什么

第一，Level 1 比 Level 2–4 容易。只换位置时，许多强 policy 还能工作；换对象、换关节结构、换长程组合后，成功率明显下降。

第二，Level 4 最难。论文指出长程任务中很多 SOTA 方法成功率接近 0，这说明单步或短程 manipulation 能力不能自动扩展到多步任务组合。

第三，3D-LOTUS 有强 motion execution，但泛化不充分。它在 seen task 和 Level 1 上强，说明 3D 几何表示有帮助；但 novel tasks 暴露出 planning 和 grounding 缺口。

第四，3D-LOTUS++ 的模块化让错误更可诊断。LLM、VLM 和 motion controller 分工明确，ablation 可以看出 object grounding 是关键瓶颈，motion control 在复杂场景中也会限制上限。

第五，benchmark 本身推动研究方向。它迫使模型不只追求训练分布内成功率，而要面对“泛化是哪一级失败”的问题。

*所以这一节是想说：GEMBench 让泛化失败从模糊评价变成可定位诊断。*

## 你应该懂的几个新词

- Benchmark：统一测试集和评估协议，用来比较方法。
- Generalization level：泛化难度层级，不同层级改变不同变量。
- RLBench：机器人操作仿真 benchmark，提供多种任务和示范生成。
- Action primitive：基础动作类型，如 pick、push、open。
- Point cloud：三维点云，比 2D 图像更直接表达几何。
- Task planning：把高层任务拆成可执行步骤。
- Object grounding：把语言里的对象定位到视觉/3D 场景中。
- Long-horizon task：需要多个子动作组合的长程任务。

*所以这一节是想说：读 GEMBench 要关注 benchmark 设计语言，而不只是模型分数。*

## 它有什么搞不定的

第一，它仍然是仿真 benchmark。RLBench 物理和视觉比真实世界可控，sim-to-real 差距仍然存在。

第二，3D-LOTUS++ 依赖 LLM/VLM 的可靠性。LLM 分解错步骤、VLM 定位错对象，motion controller 再强也会失败。

第三，Level 4 仍然很难。论文也承认 3D-LOTUS++ 在长程任务上表现并不完美。

第四，benchmark 的任务集合仍然有限。真实世界的 deformable objects、工具使用、人机协作和安全约束没有完全覆盖。

第五，模块化方法引入额外延迟和工程复杂度。LLM/VLM 调用、3D perception 和 motion control 需要稳定接口。

*所以这一节是想说：GEMBench 解决评估缺口，但不等于真实世界泛化已经解决。*

## 它和别的几篇是什么关系

和 `language-conditioned-manipulation-survey` 相比，GEMBench 是具体 benchmark 和方法；survey 是整个领域的 taxonomy。

和 `discrete-policy` 相比，GEMBench 测泛化任务，Discrete Policy 改动作表示。一个是评测问题，一个是策略建模问题。

和 `safeembodai` 相比，GEMBench 关注任务泛化，SafeEmbodAI 关注 LLM-integrated robot 的安全和 prompt injection。

和 VLA 类论文相比，GEMBench 提醒我们：新模型不只要在 seen tasks 上高，还要按层级报告 generalization。

*所以这一节是想说：GEMBench 是 Batch 9 中“评估基准和泛化诊断”的核心论文。*

## 和本导读的关系

本站读了很多 VLA、diffusion policy、latent action 和 instruction tuning。GEMBench 提供了一个很重要的视角：如果没有好 benchmark，模型改进可能只是训练分布内更强。

它适合放在 dataset-eval 主题下，与 RLBench、LIBERO、CALVIN、SIMPLER 等一起读。读者可以用它检查任何新 VLA 论文：它是在 Level 1 换位置强，还是在 Level 4 长程组合也强？

*所以这一节是想说：GEMBench 帮助读者从“模型故事”转向“泛化证据”。*

## 思考题

**Q1：为什么只测 seen tasks 会高估机器人能力？**

<details>
<summary>提示</summary>

因为测试题和训练题太像，模型可能记住任务模式，而不是学会泛化。
</details>

**Q2：Level 2 和 Level 3 的区别是什么？**

<details>
<summary>提示</summary>

Level 2 换刚体物体，Level 3 换带关节的物体。后者涉及开合、旋转等结构差异。
</details>

**Q3：为什么 Level 4 最难？**

<details>
<summary>提示</summary>

它要求组合多个已学动作，还要保持顺序、状态记忆和错误恢复。
</details>

**Q4：3D-LOTUS++ 为什么要用 LLM 和 VLM？**

<details>
<summary>提示</summary>

LLM 做高层步骤分解，VLM 做新对象 grounding，3D-LOTUS 做低层 motion。
</details>

**Q5：GEMBench 对读论文有什么帮助？**

<details>
<summary>提示</summary>

它让你问清楚模型到底在哪种泛化上强，而不是只看平均成功率。
</details>

## 一些好奇心问答（FAQ）

**Q：GEMBench 是真实机器人 benchmark 吗？**

主要是基于 RLBench 的仿真 benchmark，论文另外做了真实机器人实验。

**Q：为什么要分四级？**

因为“泛化”太笼统。换位置、换对象、换关节结构、换长程组合是不同难度。

**Q：3D-LOTUS++ 是端到端模型吗？**

不是纯端到端，它是 LLM/VLM/3D policy 的模块化组合。

**Q：3D 方法一定比 2D 方法好吗？**

不一定。3D 对空间几何有帮助，但依赖点云质量，也可能增加工程成本。

**Q：这篇最值得学习的地方是什么？**

benchmark 设计比单个方法更长期有价值，因为它定义了社区如何测泛化。

## 如果你想再深入

1. 阅读 RLBench 和 LIBERO，比较不同 benchmark 的任务 split。
2. 查看 GEMBench project page 的任务可视化，理解四级泛化。
3. 读 3D Diffuser Actor、PolarNet、RVT-2，比较 2D/3D 操作策略。
4. 思考如何把安全、失败恢复、人机协作加入类似四级 benchmark。

*所以这一节是想说：GEMBench 是学习机器人操作泛化评估的好入口。*

## 精读补充：为什么四级泛化比一个平均分更有用

如果一个论文只给一个平均 success rate，我们很难知道模型到底强在哪里。一个模型可能在 Level 1 的位置扰动上很强，但一碰到新 articulated object 就失败；另一个模型可能在短任务不突出，但在长程组合上更稳。如果把这些全部平均，研究者会失去诊断信息。

GEMBench 的四级设计把失败原因拆开了。Level 1 更多考空间位置鲁棒性；Level 2 开始考对象类别和视觉 grounding；Level 3 增加 articulated object 的结构理解；Level 4 则要求规划、记忆和多步执行。这样，模型失败时可以更具体地问：是看错对象、不会打开关节、不会组合动作，还是低层控制不稳定？

对工程团队来说，这种分层也更适合制定 roadmap。比如一个家庭机器人项目如果 Level 1 已稳定，下一步不一定是盲目加模型规模，而可能是补充新物体 grounding 数据；如果 Level 4 失败，则可能需要任务分解、状态机、replanning 或错误恢复。Benchmark 的价值就在于把“模型不泛化”变成“哪一种泛化不行”。

```text
平均分的问题:
  Avg success = 45%
  不知道失败来自哪里

四级诊断:
  Level 1 位置泛化       -> 几何鲁棒性
  Level 2 刚体新物体     -> object grounding
  Level 3 关节新物体     -> 结构和 affordance
  Level 4 长程组合       -> planning + memory + recovery
```

另一个容易忽略的点是，GEMBench 的设计不是为了制造“更难的排行榜”而已。它把任务、variation、episode 数和成功率统计固定下来，降低了不同论文之间各说各话的空间。对研究者来说，固定协议可以让 ablation 更有意义；对读者来说，它能帮助判断一篇方法是不是只挑了有利任务展示。尤其在 VLA 领域，demo 视频很容易让人觉得模型已经通用，但 benchmark 会追问同一个模型在未见物体、未见结构和长程组合里是否仍然可靠。

所以，GEMBench 的长期价值可能不止 3D-LOTUS++ 这一条 baseline，而是提供了一个可复用的“泛化压力测试”模板。未来如果加入安全、真实机器人和人类干预维度，它还可以演化成更接近部署验收的 benchmark。

## 原文信息

- arXiv: https://arxiv.org/abs/2410.01345
- PDF: https://arxiv.org/pdf/2410.01345
- Project: https://www.di.ens.fr/willow/research/gembench/
- Code: https://github.com/vlc-robot/robot-3dlotus

```bibtex
@inproceedings{garcia2025gembench,
  title={Towards Generalizable Vision-Language Robotic Manipulation: A Benchmark and LLM-guided 3D Policy},
  author={Garcia, Ricardo and Chen, Shizhe and Schmid, Cordelia},
  booktitle={IEEE International Conference on Robotics and Automation},
  year={2025}
}
```
