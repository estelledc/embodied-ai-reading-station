---
title: "InstructVLA: Vision-Language-Action Instruction Tuning from Understanding to Manipulation"
slug: instructvla
topic: vla
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2507.17520"
venue: ICLR
year: 2026
era: frontier
num: 194
generated_at: 2026-07-15
---

# InstructVLA：让 VLA 同时保留 VLM 推理和机器人动作能力

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本、arXiv / OpenReview 元数据和作者仓库能支持的结论；本站没有复现 SimplerEnv、LIBERO 或真实机器人实验，因此不会把论文报告的成功率写成本站 E4 结果。

## 一句话讲什么（TL;DR）

InstructVLA 想解决 VLA 的一个核心矛盾：如果只把 VLM fine-tune 成机器人 action generator，模型可能会忘掉原来的视觉语言推理能力；如果保留 VLM 推理，又可能动作控制不够强。论文提出 Vision-Language-Action Instruction Tuning（VLA-IT），用标准 VLM 语料和 650K VLA-IT 样本共同训练，让模型既能回答/推理，也能生成机器人动作。

架构上，InstructVLA 用一个 VLM 生成语言 reasoning 和 latent action，再用 flow matching action expert 解码真实动作；MoE adaptation 负责在“语言专家”和“动作专家”之间动态切换。评估上，它引入 SimplerEnv-Instruct，一个 80-task benchmark，专门测试高层 instruction understanding 和 closed-loop control。

如果只记一个直觉：InstructVLA 像给机器人装了两个脑区，一个负责“想明白用户到底要什么”，一个负责“把想法变成动作”，再用 instruction tuning 训练两者不要互相打架。

*所以这一节是想说：InstructVLA 的目标是把 VLM 推理能力和 VLA 动作能力放在一个可训练系统里。*

## 这是个什么场景

很多早期 VLA 模型把预训练 VLM 当初始化，然后用机器人数据 fine-tune。这样可以得到动作能力，但有一个副作用：模型可能 catastrophic forgetting，忘掉原来在 OCR、图表、常识问答、复杂指令理解上的能力。

现实机器人指令却越来越不像简单任务标签。用户可能说“洗完碗后，把篮子里的小勺放到……”；也可能说“不要拿那个，而是把字母 L 移到 V 的旁边”。这些指令需要 high-level reasoning、negation、组合、场景理解，再落到低层动作。

InstructVLA 的场景是：机器人既要能像 VLM 一样理解复杂多模态输入，又要像 policy 一样实时执行。它不满足于“OpenVLA 能做 atomic instruction”，而要测试 instruction following、situated reasoning 和 real-world reasoning tasks。

```text
普通 action-only VLA fine-tuning
  VLM backbone -> robot action
  风险: 动作变强，但 VLM 推理被遗忘

InstructVLA
  VLM reasoning -> latent action -> action expert
  目标: 推理和动作一起训练，互不牺牲
```

*所以这一节是想说：InstructVLA 面向复杂指令下的“理解 + 操作”统一问题。*

## 之前的人怎么做的，为什么不够好

第一，action-only fine-tuning 把模型训练成动作生成器，但容易牺牲原本的 multimodal reasoning。论文反复讨论 task interference 和 catastrophic forgetting。

第二，外部 System 2 方法可以让 GPT-4o 先解析指令，再交给 action expert。但这会引入闭源依赖、额外延迟和 grounding 错误。GPT-4o 也可能无法把自由语言稳定落到机器人 atomic skills。

第三，已有 VLA 数据集通常偏 manipulation action，缺少 rich multimodal supervision。模型见过“拿起可乐罐”，但未必见过解释、问答、caption、视觉推理与动作联合的样本。

第四，一些 reasoning-guided 方法依赖 rule-based decomposition 或 future video generation。前者不够端到端，后者计算开销大，不适合快速 closed-loop control。

InstructVLA 的判断是：需要一个新的训练范式，不是只加更多 action data，而是把 VLM 语料、VLA instruction data、latent action 和 action expert 放在同一目标下训练。

*所以这一节是想说：旧方法不是忘推理，就是动作弱，或者依赖外部解释器。*

## 这篇论文的新想法

第一，新想法是 VLA-IT。它不是普通 instruction tuning，而是专门为 vision-language-action 设计的数据和训练范式。论文使用标准 VLM corpora 加 650K VLA-IT 样本，联合优化 embodied reasoning 和 action generation。

第二，新想法是 MoE adaptation。VLM backbone 不直接全量变成一个动作模型，而是通过 LoRA experts 和 gating 系数，在语言 response 和 latent action generation 之间切换。

第三，新想法是 latent action + flow matching action expert。VLM 先产生 latent action intention，低层 action expert 再结合 DINOv2 features、proprioception 和 noisy actions 解码最终动作。

第四，新想法是 SimplerEnv-Instruct。它把评估从简单 atomic instruction 推到 80 个需要高层指令理解和 closed-loop control 的任务。

```text
InstructVLA 推理/动作流程

image + instruction
        │
        ▼
VLM backbone + MoE adaptation
        │
        ├─ language response / reasoning
        │
        └─ latent action tokens
                 │
                 ▼
      flow matching action expert
                 │
                 ▼
          N × 7 robot actions
```

*所以这一节是想说：InstructVLA 的核心是 VLA-IT 数据、MoE 切换和动作专家解码。*

## 它分几步做的（方法）

### 第 1 步：保留 VLM 的语言与视觉推理输出

输入是图像、问题或机器人指令。VLM backbone 需要继续能生成文本回答，例如识别图中餐具、解释图像、处理多模态 benchmark。

处理上，模型对 language output 使用 cross-entropy loss，让预训练 VLM 的表达能力不会在 action fine-tuning 中完全丢掉。

输出是可读的 language response。它在机器人任务中可以作为 reasoning，也在普通 multimodal tasks 中保持能力。

### 第 2 步：生成 latent action

输入是 VLM hidden states 和 learnable action queries。模型不是直接从 VLM token 输出真实动作，而是先抽取 `N` 个 latent action representations。

处理上，action queries attend to VLM hidden states，提取和任务相关的 latent action。它们像是高层动作意图，比真实控制量更抽象。

输出是 latent action `C`。这一步把语言理解和低层动作解码隔开，减少两者互相干扰。

### 第 3 步：MoE adaptation 调和推理和执行

输入是 VLM 隐状态。MoE adaptation 里有多个 LoRA experts，scalar head 根据上下文预测 gating coefficients。

处理上，当模型需要语言解释时，语言相关 expert 更重要；当模型需要生成 latent action 时，动作相关 expert 更重要。论文附录还分析了不同任务下 expert activation 的直观模式。

输出是根据任务动态调制后的 hidden states。这个设计的价值是效率和分工：不必全量重写 VLM，也不让一个 LoRA 同时承担所有模式。

### 第 4 步：flow matching action expert 解码真实动作

输入是 latent actions、DINOv2 visual features、noisy action embeddings 和可选 proprioception。Action expert 是一个更低层的动作生成模块。

处理上，它用 FiLM 调制视觉特征，用 transformer 结构融合输入，并用 flow matching objective 学习从噪声到动作的生成过程。输出是 `N × 7` robot actions。

人话理解：VLM 负责“我要做什么”，action expert 负责“每一步手该怎么动”。

### 第 5 步：VLA-IT 数据构造与训练

输入是原始 robot datasets、general multimodal datasets 和由 VLA-IT pipeline 生成的 annotations。论文提到 curated 650K-sample VLA-IT dataset，包含 embodied reasoning、captioning、QA、instruction response 等。

处理上，训练不是只用动作 loss，而是混合 multimodal learning 和 action learning。这样模型在学动作的同时，还不断被提醒要保持视觉语言理解。

输出是 InstructVLA generalist。它可以在普通 VLM 任务和机器人 manipulation 任务之间切换。

### 第 6 步：SimplerEnv-Instruct 评估

输入是 80-task benchmark，任务需要 closed-loop control 和 high-level instruction understanding。论文把任务分成 task aggregation 和 situated reasoning 等类型。

处理上，比较 fine-tuned OpenVLA、GPT-4o-aided action expert、Magma、CogACT 等 baselines。评估不是只问“能不能拿可乐罐”，还问模型能否理解复杂语义和场景条件。

输出是论文报告的提升：InstructVLA 在 in-domain SimplerEnv 上比 SpatialVLA 提升 33%，在 SimplerEnv-Instruct 上比 fine-tuned OpenVLA 高 96%，比 GPT-4o-aided action expert 高 29%。

### 第 7 步：真实机器人与多模态能力评估

输入包括 simulator evaluations、real-world tasks 和 VLM benchmarks。论文还测 inference-time scaling，例如启用 textual reasoning 是否能提升 manipulation。

处理上，模型在多个设置中比较保留 multimodal ability 和 action success 的平衡。附录还报告训练配置、A100 评估、real-world training settings 等。

输出是一个更完整的证据链：不是只在单个机器人任务上高，而是试图证明“保留推理 + 生成动作”可以共存。

*所以这一节是想说：InstructVLA 的方法是 VLM 推理、latent action、MoE 和 action expert 的分层协作。*

## 关键数字

| 数字或设置 | 原文语境 | 这说明什么 |
|---|---|---|
| 650K | curated VLA-IT dataset | 训练数据不只是动作，还含 embodied reasoning 等标注 |
| 80 tasks | SimplerEnv-Instruct benchmark | 专门评估复杂 instruction understanding |
| 33% | in-domain SimplerEnv over SpatialVLA | 论文报告的相对提升 |
| 96% | SimplerEnv-Instruct over fine-tuned OpenVLA | 复杂指令泛化提升 |
| 29% | over GPT-4o-aided action expert | 不依赖外部解释器也更强 |
| Eagle2-2B | VLM backbone | 不是靠极大 backbone 堆规模 |
| N × 7 | action output shape | 每步动作通常是 7 维控制 |
| 8 A100 GPUs | simulator evaluation | 评估成本较高 |
| 12 hours | VLA-IT phase 报告训练耗时 | 论文给出训练开销线索 |

这些数字全部来自论文报告，不是本站复现实验。相对提升的基线和评估设置要回到原文表格核验，不能脱离上下文引用。

*所以这一节是想说：InstructVLA 的数字围绕数据规模、复杂指令 benchmark 和相对提升展开。*

## 实验结果说明了什么

第一，action-only fine-tuning 会有遗忘风险。论文通过 multimodal benchmarks 和 OpenVLA ablation 说明，单纯把模型调到动作上，不一定保留 VLM 能力。

第二，VLA-IT 的多样性有帮助。论文提到加入 QA、captioning 等 multimodal data 能改善 SimplerEnv-Instruct 泛化。这说明复杂指令操作需要语言和视觉理解的底座。

第三，MoE 和 action expert 的分工有价值。去掉 action expert 视觉输入会带来大幅性能下降，说明低层动作模块不能只靠 VLM 抽象意图，还需要细粒度视觉。

第四，GPT-4o 作为外部 System 2 并非万能。它能解析一些指令，但容易在 physical grounding、连贯性和 atomic skill 对齐上出错。InstructVLA 的端到端训练避免了部分接口错配。

第五，真实世界仍有边界。论文承认 SimplerEnv-Instruct 和真实设置还需要扩展到更多 dexterous skills，也提到 dataset bias 和 safety。

*所以这一节是想说：实验支持“推理能力要和动作训练一起保留”，但离开放真实部署仍有距离。*

## 你应该懂的几个新词

- Instruction tuning：用指令-回答格式训练模型遵循人类指令。
- VLA-IT：Vision-Language-Action Instruction Tuning，面向 VLA 的指令微调。
- Catastrophic forgetting：新任务训练导致旧能力被遗忘。
- MoE adaptation：用多个专家模块和 gating 动态调节模型行为。
- LoRA：低秩适配器，用较少参数微调大模型。
- Latent action：高层动作意图表示，不直接等同真实控制量。
- Flow matching：一种生成建模目标，把噪声逐步变成目标动作。
- Action expert：专门负责低层动作生成的模块。
- SimplerEnv-Instruct：论文提出的复杂指令机器人评估 benchmark。

*所以这一节是想说：InstructVLA 的关键词是 VLA-IT、MoE、latent action 和 action expert。*

## 它有什么搞不定的

第一，数据生成和标注仍可能有 bias。650K 样本很大，但质量、覆盖范围和合成方式会影响模型行为。

第二，复杂 dexterous skills 仍不足。论文也提到需要把 SimplerEnv-Instruct 扩展到更灵巧、更真实的技能。

第三，MoE 和 action expert 增加系统复杂度。模块越多，调参、诊断和部署成本越高。

第四，安全问题没有被彻底解决。模型能理解指令，不代表会拒绝危险动作或处理异常环境。

第五，评估仍主要在特定 benchmark 和平台上。泛化到家庭、工厂、医疗等高风险场景还需要更强证据。

*所以这一节是想说：InstructVLA 是训练范式进步，不是安全可靠通用机器人终点。*

## 它和别的几篇是什么关系

和 `gaze2act` 相比，InstructVLA 关注模型内部如何同时推理和动作；Gaze2Act 关注外部 gaze 如何表达空间意图。

和 `lacy` 相比，两者都关心语言和动作的语义连接。LACY 用 L2A/A2L/L2C 做闭环自改进；InstructVLA 用 VLA-IT 和 MoE 让推理与动作联合训练。

和 `villa-x` 相比，两者都有 latent action，但 villa-X 重点是从视频学 latent action，InstructVLA 重点是从 instruction tuning 中生成 latent action 并交给 action expert。

和 OpenVLA / SpatialVLA 相比，InstructVLA 更强调复杂指令、reasoning 保留和 benchmark 扩展，而不仅是 atomic manipulation。

*所以这一节是想说：InstructVLA 是 Batch 8 中最大规模、最偏 generalist instruction-following 的一篇。*

## 和本导读的关系

本导读的 VLA 主线可以用一句话概括：模型要从“看图听话做动作”走向“理解复杂意图并可靠执行”。InstructVLA 正是在这个转折点上：它把 VLM 的语言/视觉能力当成必须保留的资产，而不是 fine-tuning 时可以牺牲的初始化。

这篇也提醒读者，benchmark 设计会塑造研究方向。Simple pick-and-place 很容易掩盖复杂指令问题；SimplerEnv-Instruct 则把 negation、composition、situated reasoning 这些真实用户会说的话拉进评估。

*所以这一节是想说：InstructVLA 是理解 VLA 从动作模型走向指令智能体的重要节点。*

## 思考题

**Q1：为什么 action-only fine-tuning 可能导致 VLM 能力退化？**

<details>
<summary>提示</summary>

训练目标只奖励动作，不再持续监督文字、问答、OCR、推理等能力，模型参数会向动作任务偏移。
</details>

**Q2：MoE adaptation 为什么适合这类模型？**

<details>
<summary>提示</summary>

因为语言推理和动作生成是两种模式。MoE 可以让不同 expert 在不同模式下发挥作用。
</details>

**Q3：latent action 为什么要放在 VLM 和 action expert 之间？**

<details>
<summary>提示</summary>

它是高层意图和低层控制之间的缓冲层，减少直接从文字 token 到连续动作的冲突。
</details>

**Q4：为什么 GPT-4o 外部解释器不一定比端到端模型好？**

<details>
<summary>提示</summary>

外部解释器可能不懂机器人 atomic skills，也可能在物理 grounding 上出错，还会增加接口和延迟。
</details>

**Q5：SimplerEnv-Instruct 比普通 SimplerEnv 多考了什么？**

<details>
<summary>提示</summary>

它更强调高层指令理解、组合、否定、场景推理和 closed-loop control，而不是固定任务标签。
</details>

## 一些好奇心问答（FAQ）

**Q：InstructVLA 是不是只靠更多数据赢？**

不是只靠更多数据。论文重点还包括 MoE adaptation、latent action、action expert 和 benchmark 设计。当然，650K VLA-IT 数据是重要条件。

**Q：它还能做普通 VLM 问答吗？**

论文目标之一就是保留这类能力，并通过多模态数据混合训练减轻遗忘。

**Q：action expert 为什么不用 VLM 自己做？**

VLM 擅长语义和 token 生成，连续控制需要细粒度视觉、proprioception 和生成式动作建模，专门 expert 更合适。

**Q：这篇最容易被误读的点是什么？**

不要把论文报告的相对提升当成跨所有机器人场景的结论；它们绑定具体 benchmark、baseline 和训练设置。

**Q：它和 ChatGPT 控机器人有什么关系？**

它不是让外部聊天模型发命令，而是把推理和动作放进同一个 VLA 训练系统，减少外部接口错配。

## 如果你想再深入

1. 读 OpenVLA / SpatialVLA，理解 InstructVLA 的主要比较对象。
2. 读 MoE / LoRA 相关资料，理解为什么 adaptation 可以分专家。
3. 读 Flow Matching / Diffusion Policy，理解 action expert 的生成式控制背景。
4. 查看 SimplerEnv-Instruct 的任务示例，判断复杂指令到底难在哪里。

*所以这一节是想说：InstructVLA 是学习 VLA instruction tuning 和 reasoning-action 协同的核心材料。*

## 精读补充：为什么它不直接让 VLM 输出动作

一个常见疑问是：既然 VLM 已经能看图、读文字、生成 token，为什么不让它直接输出机器人动作？原因是动作不是普通文本。文本 token 的错误通常只是语义偏差，而动作 token 的小偏差可能让夹爪撞到桌面、错过目标或在闭环控制中累积。机器人控制还需要高频视觉、proprioception、轨迹平滑和噪声到动作的生成过程，这些都不是 VLM 最擅长的部分。

InstructVLA 的分层设计因此很有工程意味：VLM 保留推理、指令理解和 latent action 规划；action expert 专心处理低层连续控制。MoE adaptation 则像调度器，让模型知道什么时候应该“说话思考”，什么时候应该“进入动作模式”。这种分工避免把所有能力都压在同一个输出头上，也减少了推理能力和动作能力互相覆盖的问题。

从学习路线看，这篇论文提醒我们：generalist robot model 不等于一个巨大模型直接包办一切。更现实的路线往往是把语义、计划、动作、验证拆成可协作的模块，再通过统一训练让模块之间对齐。

## 原文信息

- arXiv: https://arxiv.org/abs/2507.17520
- PDF: https://arxiv.org/pdf/2507.17520
- OpenReview: https://openreview.net/forum?id=tsxwloasw5
- Code: https://github.com/InternRobotics/InstructVLA

```bibtex
@inproceedings{yang2026instructvla,
  title={Vision-Language-Action Instruction Tuning: From Understanding to Manipulation},
  author={Yang, Shuai and Li, Hao and Wang, Bin and Chen, Yilun and Tian, Yang and Wang, Tai and Wang, Hanqing and Zhao, Feng and Liao, Yiyi and Pang, Jiangmiao},
  booktitle={International Conference on Learning Representations},
  year={2026}
}
```
