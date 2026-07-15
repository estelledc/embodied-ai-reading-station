---
title: "Gaze2Act: Gaze-Conditioned Vision-Language-Action Policies for Interactive Robot Manipulation"
slug: gaze2act
topic: vla
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2605.30282"
venue: arXiv
year: 2026
era: frontier
num: 191
generated_at: 2026-07-15
---

# Gaze2Act：把人的视线变成 VLA 的动态操作意图

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本、arXiv 元数据和项目页能支持的结论；本站没有复现 Unitree G1 实验，因此不会把论文报告的成功率写成本站 E4 结果。

## 一句话讲什么（TL;DR）

Gaze2Act 想解决一个很日常但很难的机器人交互问题：用户说“把那个杯子递给我”时，房间里可能有很多杯子；用户说“抓住锤子的这里”时，语言很难精确表达“这里”；用户执行到一半又想换目标时，静态指令也跟不上。论文提出把人的 gaze（视线 / 注视点）作为 VLA policy 的动态条件：语言负责说任务，视线负责说“哪个对象、哪个部位、现在是不是换目标”。

方法上，Gaze2Act 先把智能眼镜里的第一人称 gaze 映射到机器人视角，得到目标 mask 和 fixation point；然后用两条路径注入策略：一条是在图像上画 contour / heatmap 的 perception-level prompting，另一条是把 mask 和点编码成 gaze token，作为 action-level conditioning 注入 GROOT N1.5 式的动作生成。这样，机器人不是只听语言，而是同时看用户正在看哪里。

如果只记一个直觉：Gaze2Act 像是给机器人加了“看我眼神行事”的能力。语言给出高层动作，眼神给出空间锚点；当眼神移动，空间锚点也可以更新。

*所以这一节是想说：Gaze2Act 用 gaze 补上语言无法稳定表达的动态空间意图。*

## 这是个什么场景

真实人机协作里，人很少把需求说成机器可执行的完整规范。你可能说“拿那个杯子”，但桌上有三个相似杯子；你可能说“从把手这里抓”，但“这里”在语言里很模糊；你也可能在机器人伸手过程中突然看向另一个对象，表示目标改变。语言是离散的、慢的、需要组织句子；视线是连续的、即时的、天然带空间位置。

VLA（Vision-Language-Action）模型已经能把图像和语言转成动作，但很多 VLA 默认语言是主要条件。只靠语言时，模型要自己猜指代对象、部位和时序变化。一旦语言描述不够细，或者检测器把“红橙花纹杯”识别错，动作就会走偏。

Gaze2Act 的场景是 interactive robot manipulation。用户戴 Meta Aria 这类智能眼镜，系统从第一人称视角估计 gaze 点；机器人拥有自己的外部视角。系统要把“人眼看到的点”投到“机器人看到的图像”里，再让 VLA policy 执行。

```text
用户说话              用户视线
  │                     │
  │ high-level task      │ spatial intent
  ▼                     ▼
语言指令  +  ego-view gaze point
          │
          ▼
cross-view grounding
          │
          ▼
robot-view mask + fixation point
          │
          ▼
perception prompt + action token -> robot action
```

*所以这一节是想说：Gaze2Act 面向的是语言不足以表达空间意图的实时协作操作。*

## 之前的人怎么做的，为什么不够好

第一类方法是 language-only VLA。模型接收图像和文字，例如“give me the cup with red-orange pattern”。这在目标清楚时可行，但当多个对象相似时，语言描述会变长、变脆，而且用户未必知道如何描述。

第二类方法是 language-derived mask。比如先用 Grounding DINO、SAM、GLaMM 或其他视觉语言模型，根据语言生成 box / mask，再把 mask 给 policy。它比纯语言更显式，但 mask 仍然来自语言解析。如果语言本身含糊，mask 也会含糊；如果用户中途改目标，静态 mask 也不会自然跟着变。

第三类方法把 gaze 用作离线监督或模块化 target selection。它们证明 gaze 和人类意图相关，但通常没有把 gaze 当作 VLA policy 在训练和推理时都可用的连续条件。换句话说，gaze 被当作提示或辅助模块，而不是动作生成过程里的显式条件。

Gaze2Act 的判断是：问题不只是缺一个目标检测器，而是缺一个能连续反映用户意图的接口。语言适合表达任务类型，gaze 适合表达空间指代，两者应该分工。

*所以这一节是想说：旧方法要么过度依赖语言，要么没有让 gaze 真正进入动作生成闭环。*

## 这篇论文的新想法

第一，新想法是把 gaze 当成 dynamic intent signal。动态的意思是它不是一次性目标点，而是在执行过程中可以重新触发、重新选择目标，用来处理 dynamic intent steering。

第二，新想法是 marker-free cross-view semantic matching。人的 gaze 在第一人称图像里，机器人动作需要机器人视角里的目标。论文不用外部 marker 或相机标定强绑定，而是用视觉 foundation model 做语义匹配，把人眼看到的目标映射到机器人观察中的 mask。

第三，新想法是 coarse-to-fine grounding。系统不只输出一个对象 mask，还输出 fixation point。mask 解决“哪个对象”，point / heatmap 解决“对象的哪个部位”。

第四，新想法是双路径注入。图像层的 contour / heatmap 让 VLM 能直接看见目标区域；动作层的 gaze token 让 diffusion / DiT action head 在生成动作时持续保留空间条件。

```text
Gaze2Act 的两条注入路径

robot observation
  │
  ├─ path A: contour / heatmap overlay -> VLM sees selected region
  │
  └─ path B: mask + point -> gaze token -> action denoising uses spatial condition

两条路径一起工作：
  overlay 让“看哪里”变成视觉提示
  gaze token 让“往哪里动”进入动作生成
```

*所以这一节是想说：Gaze2Act 的核心是 gaze grounding 加双路径策略条件化。*

## 它分几步做的（方法）

### 第 1 步：获取第一人称 gaze

输入是用户佩戴设备的 egocentric image 和 gaze coordinate。论文实验中使用 Meta Aria glasses，并用开源 gaze estimation model 得到第一人称图像上的注视点。

处理上，系统在语音关键字触发时选取当前 gaze point，表示用户此刻想指定的对象或部位。这个触发很重要，因为人眼会自然扫视，不是每个 gaze 都代表操作意图。

输出是 ego-view 中的 gaze point。此时它还不能直接控制机器人，因为机器人看到的是另一个视角。

### 第 2 步：跨视角粗粒度目标匹配

输入是第一人称图像中的 gaze point、机器人视角图像和候选 masks。系统先在人的视角里根据 gaze 找到 reference object mask，再在机器人视角里生成候选 object masks。

处理上，论文使用 DINOv3 这样的视觉特征编码器，对 reference mask 和机器人候选 mask 内的视觉特征做平均，再用 cosine similarity 找到最相似的候选 mask。直觉上，这像先在用户视角里说“我看的这个东西长这样”，再在机器人视角里找“哪块区域最像它”。

输出是机器人视角中的 coarse mask `m_t`。它解决的是“哪个对象”。

### 第 3 步：跨视角细粒度 fixation 匹配

很多任务不只要知道对象，还要知道对象内部的部位，例如锤子的 handle、head、neck。输入是 coarse mask、第一人称 gaze point 和机器人图像。

处理上，系统在 coarse mask 约束内做 fine-grained matching，得到机器人视角里的 fixation point `p_t`。约束在 coarse mask 内的好处是避免细粒度匹配被其他相似对象吸走。

输出是 `(m_t, p_t)`，即对象级 mask 加部位级点。这就是后续策略使用的 gaze-grounded representation。

### 第 4 步：perception-level gaze prompting

输入是机器人图像、mask 和 point。处理是把 gaze 结果画回图像：对象级任务画 contour，部位级任务画 contour 加 Gaussian heatmap。

输出是带视觉提示的观察图 `o'_t`。VLM 或视觉 backbone 看到的不再是裸图，而是“目标边界被标出来 / 注视点附近有热力提示”的图。

人话理解：这一步是在机器人眼前贴便利贴，说“看这里”。它适合让模型更容易从图像中注意到目标。

### 第 5 步：action-level gaze conditioning

只在图像上画线还不够，因为动作生成时空间条件可能被视觉特征稀释。论文进一步构造 gaze token：位置路径编码 fixation point，对象路径用冻结 DINOv3 object encoder 编码目标 crop，然后合成 compact spatial token。

处理上，gaze token 通过新增的 cross-attention 分支注入动作模型。原来的 attention 仍处理语言和视觉上下文，新分支专门处理 gaze-derived spatial constraints。

输出是受 gaze 条件约束的动作序列。这里的重点是，gaze 不只是给视觉模块看的标记，而是动作 denoising / action head 的显式条件。

### 第 6 步：稳定注入，避免破坏预训练策略

新增 gaze 分支可能一开始扰乱已有动作先验。论文采用 zero initialization，让新分支的输出投影初始为 no-op，也就是刚加入时几乎不改变原模型。

处理上，模型在训练中逐渐学习 gaze 分支应该如何影响动作。论文报告该设计只带来约 4.95% 额外参数。

输出是更稳定的 fine-tuning 过程。直觉上，这像给老系统加一个新控制杆，但初始时控制杆不生效，等模型学会后再慢慢接管部分决策。

### 第 7 步：在静态和动态任务里评估

输入是七类任务、16 个真实机器人任务、Unitree G1 humanoid、GROOT N1.5 backbone 和多个 baselines。处理包括 object-level disambiguation、part-level interaction、compositional task 和 dynamic intent steering。

输出是 intent accuracy、task success 和 ablation 结果。论文特别区分静态目标选择和执行中目标切换，因为后者更能体现 gaze 的连续性。

*所以这一节是想说：Gaze2Act 的方法链是 gaze 获取 -> 跨视角 grounding -> 图像提示 -> 动作条件化。*

## 关键数字

| 数字或设置 | 原文语境 | 这说明什么 |
|---|---|---|
| 7 categories / 16 real-robot tasks | Unitree G1 humanoid 评估范围 | 论文不是只测单个 pick-and-place |
| 15 tasks | main table 覆盖的实验任务数 | object、part、compositional、dynamic 等多类场景 |
| 50 trials per task | 主表统计设置 | 成功率是论文按任务重复试验报告 |
| 96% / 88% intent accuracy | 两个 compositional tasks | gaze 能同时绑定操作对象和放置目标 |
| 94% / 84% task success | 同上 | 意图正确还要转成完整动作成功 |
| 80.4% / 72.4% | part-level 平均 intent / success | gaze point 对部位级操作有帮助 |
| 14/30 vs 4/30、5/30 | dynamic intent steering | 目标中途切换时 Gaze2Act 优于两个 mask baseline |
| 55/60、39/60 | full model ablation | 双路径在 Pick Bread Place Bowl 和 Hammer 上最好 |
| 4.95% extra parameters | gaze conditioning 额外参数 | 额外模块相对轻量 |

这些数字都是论文报告，不是本站复现。特别是 dynamic steering 仍低于半数成功，说明 gaze 能改善但没有彻底解决长程动态控制。

*所以这一节是想说：Gaze2Act 的亮点在空间意图提升，难点仍在动态执行稳定性。*

## 实验结果说明了什么

实验第一层说明，language-only 在相似对象和隐式指代下不稳。Vanilla GROOT 即使用更具体的属性描述，在 Ambiguous Obj. 上也只到论文报告的 34.0% intent accuracy。Gaze2Act 因为目标来自 gaze，而不是从语言属性猜出来，所以在对象选择行上更高。

实验第二层说明，part-level cue 需要比 object mask 更细的条件。RoboGround 和 ControlVLA 可以给对象 mask，但无法表达“同一个锤子的哪个部位”。Gaze2Act 的 fixation point / heatmap 正好补上这个信息。

实验第三层说明，执行中改目标很难。Gaze2Act 的 14/30 比 4/30 和 5/30 高，但仍不到一半。这是诚实的边界：gaze 更新可以提供新目标，但机器人已经开始的动作、遮挡、动力学惯性和 policy state 都会影响最终能否改向。

实验第四层说明，perception prompt 和 action conditioning 是互补的。Hammer 更依赖视觉提示，Pick Bread Place Bowl 更受益于动作层条件。full model 在两个任务都最好，说明单一路径不够。

*所以这一节是想说：gaze 的价值是真实的，但只有同时进视觉和动作层才比较稳。*

## 你应该懂的几个新词

- Gaze：人的注视方向或图像上的注视点，近似表示注意力和操作意图。
- Egocentric view：第一人称视角，例如智能眼镜看到的画面。
- Exocentric / robot view：机器人或外部相机看到的视角。
- Cross-view grounding：把一个视角里的目标对应到另一个视角。
- Mask：图像中目标区域的分割结果。
- Fixation point：视线具体落在对象里的点。
- Perception-level prompting：在视觉输入上画 contour / heatmap，让模型看见提示。
- Action-level conditioning：把条件直接注入动作生成，而不是只改图像。
- Dynamic intent steering：执行过程中目标改变，策略需要跟随新意图。

*所以这一节是想说：读懂 Gaze2Act 要区分视角映射、视觉提示和动作条件化。*

## 它有什么搞不定的

第一，gaze 不总等于意图。人可能看一眼干扰物、检查环境、或在思考时扫视。论文用 voice trigger 缓解，但真实交互仍需要更强的意图确认。

第二，跨视角 grounding 会受遮挡、相似物体、透明物体和视角差影响。论文中的 transparent rows 也提示检测 / 匹配仍可能退化。

第三，动态 steering 成功率仍有限。14/30 是明显进步，但不是可靠系统级能力。

第四，系统依赖智能眼镜和 gaze estimation。部署时需要额外硬件、校准和延迟控制。

第五，实验建立在特定 backbone 和任务集上。换机器人、换场景、换眼镜后，是否同样稳定还需要更多验证。

*所以这一节是想说：Gaze2Act 是交互接口突破，不是万能人机协作解决方案。*

## 它和别的几篇是什么关系

和 `instructvla` 相比，Gaze2Act 解决的是“空间意图来自哪里”；InstructVLA 解决的是“怎样保留 VLM 推理并生成动作”。前者像交互输入层，后者像模型训练范式。

和 `villa-x` 相比，Gaze2Act 用 gaze 作为外部动态条件；villa-X 用 latent action 从视频变化中学习动作中间表示。一个偏人机交互，一个偏视频预训练和 latent action。

和 `lacy` 相比，Gaze2Act 把人的 gaze 接入动作；LACY 让模型在 language->action 和 action->language 之间自我循环。一个强调在线空间指代，一个强调双向 grounding 和自改进。

和 Batch 7 的 diffusion-policy 论文相比，Gaze2Act 也在给动作生成补条件，但条件来源从语言 keyframe / trace / skill 变成了人的 gaze。

*所以这一节是想说：Gaze2Act 把 VLA 从“听懂指令”推进到“读懂人的空间注意力”。*

## 和本导读的关系

这篇适合放在 VLA 和 human-in-the-loop manipulation 的交叉位置。读者如果已经读过 OpenVLA、SpatialVLA、ControlVLA 或 diffusion policy，会发现 Gaze2Act 的独特性不是更大模型，而是更自然的交互通道。

它也能帮助理解导读里“输入接口决定任务边界”的思想：语言、点击、轨迹、mask、gaze 都是给机器人表达目标的方式。不同接口的成本、精度、实时性不同，模型设计要围绕接口特性展开。

*所以这一节是想说：Gaze2Act 是理解 VLA 交互接口设计的好样本。*

## 思考题

**Q1：为什么语言描述在相似对象场景里容易失败？**

<details>
<summary>提示</summary>

想想“那个杯子”在多杯子场景里缺少什么信息。语言要补足它，需要颜色、形状、位置等很多属性；gaze 直接给空间位置。
</details>

**Q2：perception-level prompting 和 action-level conditioning 的区别是什么？**

<details>
<summary>提示</summary>

前者改模型看到的图像，后者改动作生成时使用的条件。一个像画圈提醒，一个像把目标坐标接入控制器。
</details>

**Q3：为什么动态目标切换比静态选择更难？**

<details>
<summary>提示</summary>

机器人动作已经开始，手可能遮挡目标，policy 内部状态也已经朝旧目标滚动。新 gaze 不一定能完全覆盖旧动作惯性。
</details>

**Q4：如果 gaze 估计错了，系统可能发生什么？**

<details>
<summary>提示</summary>

错误会先影响 mask / point，再影响视觉提示和 action token，最终可能抓错对象或抓错部位。
</details>

**Q5：为什么论文要 zero-initialize 新的 gaze 分支？**

<details>
<summary>提示</summary>

为了不要一开始破坏预训练动作模型。新分支先像不存在，训练中再逐步学会影响动作。
</details>

## 一些好奇心问答（FAQ）

**Q：Gaze2Act 是不是读心术？**

不是。它只是把 gaze 当作概率很高的空间意图信号。人看哪里通常和想操作哪里相关，但不总是相同。

**Q：没有智能眼镜能用吗？**

论文的交互部署需要 gaze 设备。离线训练可用标注的 mask 和 fixation point，但真实互动仍需要获取 gaze。

**Q：为什么不用鼠标点击或手指指向？**

可以。gaze 的优势是低负担、连续、自然；但点击和指向可能更确定。不同场景可以组合多模态意图。

**Q：它能解决所有开放语言指令吗？**

不能。Gaze2Act 主要解决空间指代和动态意图，不负责复杂任务规划、常识推理或长时记忆。

**Q：这篇论文最值得借鉴的工程点是什么？**

把新交互信号分成“视觉层显式提示”和“动作层条件注入”两条路径，同时用 zero init 控制新分支风险。

## 如果你想再深入

1. 读 GazeVLA / GazeVLM，理解 gaze 作为监督信号和意图信号的区别。
2. 读 ControlVLA / RoboGround，比较 language-derived mask 和 human-derived gaze mask。
3. 读 SpatialVLA / OpenVLA，理解 VLA backbone 如何把视觉语言转成动作。
4. 观察真实机器人视频，特别看动态 target switch 时机器人何时改向、何时失败。

*所以这一节是想说：Gaze2Act 最适合作为 VLA 人机交互接口的深入入口。*

## 原文信息

- arXiv: https://arxiv.org/abs/2605.30282
- PDF: https://arxiv.org/pdf/2605.30282
- Project: https://zuo-kuangji.github.io/Gaze2Act/

```bibtex
@article{zuo2026gaze2act,
  title={Gaze2Act: Gaze-Conditioned Vision-Language-Action Policies for Interactive Robot Manipulation},
  author={Zuo, Kuangji and Li, Gen and Lyu, Bofan and Lu, Yanshuo and Ma, Boyu and Han, Shijia and Zhou, Xinyu and Yuan, Xichen and Zhou, Chuhao and Bai, Jiaqi and Li, Geng and Yang, Jianfei},
  journal={arXiv preprint arXiv:2605.30282},
  year={2026}
}
```
