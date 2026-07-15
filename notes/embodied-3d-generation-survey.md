---
title: "3D Generation for Embodied AI and Robotic Simulation: A Survey"
slug: embodied-3d-generation-survey
topic: sim
difficulty: ⭐⭐⭐⭐
status: deep-read
来源: "https://arxiv.org/abs/2604.26509"
venue: arXiv
year: 2026
era: frontier
num: 186
generated_at: 2026-07-15
---

# 3D Generation for Embodied AI：从好看模型走向可交互仿真世界

> 这是一份面向零基础读者的结构化研究笔记。本文只记录公开论文文本、arXiv 元数据和项目页能支持的结论；本站没有复现任何 3D 生成、仿真或 sim-to-real 实验，因此不会把 survey 中的方向判断写成本站实验结论。

## 一句话讲什么（TL;DR）

这篇 survey 讨论 3D generation 如何服务 embodied AI and robotic simulation。它不是普通“3D 生成技术综述”，而是从机器人需要什么出发，把 3D generation 分成三个角色：Data Generator、Simulation Environments、Sim2Real Bridge。

论文的核心判断是：embodied AI 需要的 3D 生成不只是“看起来真实”。生成物体要有 articulation、mass、friction、material、kinematics，生成场景要支持 interaction and task execution，生成世界还要能帮助 robot learning 从 simulation 转到 real world。字段里出现 URDF、MJCF、USD、GLB、physics parameters、digital twin 等，都是因为机器人要在仿真器里真正动起来。

如果只记一个直觉：普通 3D 生成像“画漂亮家具”，embodied 3D generation 要生成“门能打开、杯子能抓、布会变形、机器人能在里面训练”的世界。

*所以这一节是想说：本文把 3D 生成从视觉逼真推进到交互和仿真可用。*

## 这是个什么场景

机器人学习很依赖仿真。真实世界训练成本高、慢、危险；仿真可以并行生成大量任务、失败不会损坏设备，也方便控制变量。但仿真世界要有足够多样、真实、可交互的 3D assets 和 environments。

传统 3D generation 关注外观：形状像不像、纹理好不好、渲染是否真实。但机器人不只看外观。机器人要推门，需要门有铰链；要拖布，需要布能变形；要抓杯子，需要杯子有可接触几何；要移动椅子，需要质量、摩擦和碰撞体。

这篇 survey 的问题是：3D generation 怎样从“视觉内容生成”变成“具身训练基础设施”？它把整个领域整理成 object-level asset creation、scene-level environment synthesis、simulation-to-reality transfer 三条线。

```text
普通 3D 生成 vs 具身 3D 生成

普通目标：外观逼真
  ├─ mesh / texture / image quality
  └─ 人看起来像真的

具身目标：交互可用
  ├─ articulation / kinematics
  ├─ mass / friction / material
  ├─ URDF / MJCF / simulator compatibility
  └─ robot can perceive, plan, act, and learn
```

这个场景和本站的 simulation、world model、dataset-eval 都有关。3D generation 是给机器人造训练世界，simulation 是让世界运行起来，world model 是学习世界变化，policy learning 是在世界里学动作。

*所以这一节是想说：embodied AI 里的 3D 生成必须服务动作和物理，而不只是服务渲染。*

## 之前的人怎么做的，为什么不够好

已有 3D generation surveys 很多，但多按模型技术组织，比如 NeRF、3DGS、diffusion、VAE、GAN、text-to-3D、image-to-3D。这样的综述适合计算机视觉或图形学读者，却不一定回答机器人最关心的问题：这个 3D asset 能不能被仿真器加载？能不能碰撞？能不能开关？能不能产生训练数据？

已有 scene generation surveys 也很多，但它们常关注室内布局、视觉一致性或图形质量。机器人需要的 scene 不只是“沙发在客厅里”，还要支持导航、操作、任务目标、可达性和物理约束。

还有 embodied AI surveys 通常把 3D assets 当成现成基础设施。它们讨论 policy、VLA、simulator、benchmark，却不深入讨论这些 assets 从哪里来、质量怎么评估、怎样变成 URDF/MJCF、怎样进入 sim-to-real pipeline。

因此，旧综述之间有断层：3D 生成懂外观，机器人综述懂任务，仿真综述懂平台，但很少有一篇把“生成内容如何变成机器人可用世界”作为主问题。

*所以这一节是想说：本文补的是 3D generation 和 embodied simulation 之间的接口。*

## 这篇论文的新想法

第一，新想法是三角色 taxonomy。Data Generator 把 3D generation 当作 simulation-ready objects and assets 的生产器；Simulation Environments 把 3D generation 当作 interactive worlds 的构建器；Sim2Real Bridge 把 3D generation 当作真实世界和仿真世界之间的连接器。

第二，新想法是强调 simulation-ready。论文反复提到 URDF、MJCF、physics parameters、kinematic structure、material properties、affordance-related semantics。这些不是视觉指标，而是仿真和机器人交互指标。

第三，新想法是指出 field 正在从 visual realism 转向 interaction readiness。外观真实仍然重要，但具身系统更需要 generated content 能被机器人使用。

第四，新想法是把 open challenges 归纳为 limited physical annotations、gap between geometric quality and physical validity、fragmented evaluation、persistent sim-to-real divide 等。它不是只罗列方法，而是指出为什么 3D generation 还不能稳定成为 embodied intelligence 的基础设施。

```text
三角色 taxonomy

┌──────────────────────┐
│ Data Generator        │
│ 生成可仿真的物体资产    │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Simulation Environment│
│ 生成可执行任务的世界    │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Sim2Real Bridge       │
│ 连接真实数据和仿真训练  │
└──────────────────────┘
```

*所以这一节是想说：本文用三角色框架重新组织 3D generation for embodied AI。*

## 它分几步做的（方法）

### 第 1 步：先定义 simulation-ready 需要什么

输入是一个 3D object 或 scene。普通 3D generation 可能只输出 mesh、point cloud、radiance field 或 texture。具身系统还需要更多东西：kinematic structure、collision mesh、mass、friction、joint limits、material properties、affordance semantics。

处理过程是把外观资产转换成仿真器能理解的结构。比如 URDF 可以描述树状机器人或物体关节结构，MJCF 可以描述 MuJoCo 的 bodies、joints、tendons、actuators、contact parameters。输出是 simulator-compatible asset。

这一步的难点是外观和物理不自动一致。一个柜子看起来像柜子，不代表门能按正确轴旋转；一个杯子 mesh 很漂亮，不代表碰撞体稳定；一块布视觉真实，不代表接触和变形物理正确。

### 第 2 步：Data Generator 生成可交互资产

Data Generator 角色关注 object-level asset creation。它包括 articulated objects、physically grounded objects、deformable objects 和 end-to-end simulation-ready pipelines。

输入可以是 text、image、mesh、point cloud 或 demonstration。处理可以用 diffusion、LLM/VLM、3DGS、structured latent、procedural rules 等方法。输出要尽量变成可被物理引擎使用的 asset，比如带 articulation 的 URDF、带 material 的 MJCF、带 collision 的 mesh。

这一类方法的核心问题是“物体能不能被机器人操作”。Articulation 让门、抽屉、剪刀有运动结构；physical grounding 让物体有质量和摩擦；deformable modeling 让布料、软体和组织能变形；end-to-end pipeline 让用户从图像或文本直接得到可仿真资产。

### 第 3 步：Simulation Environments 生成任务世界

Simulation Environments 角色关注 scene-level environment synthesis。它不只生成单个物体，而是生成机器人能进入、导航、操作、完成任务的世界。

输入可能是 task description、layout graph、object list、language instruction 或 agent goal。处理可以是 structure-aware scene synthesis、controllable generation、agentic environment generation。输出是一个可加载到 simulator 的交互场景。

这里的关键是 task-oriented。一个漂亮房间不一定适合训练机器人。如果杯子永远放在不可达位置，抽屉无法打开，导航路径被穿模家具堵住，场景对 robot learning 就没有用。

### 第 4 步：Sim2Real Bridge 连接真实和仿真

Sim2Real Bridge 角色关注 real-to-sim、sim-to-real 和 closed-loop data lifecycle。它把真实世界观察转换成 digital twin，或者用仿真生成数据增强，再让 learned policy 迁移回真实世界。

输入可能是 RGB-D、video、point cloud、action trajectory、force data 或真实机器人 demonstration。处理是 reconstruction、digital twin construction、domain randomization、data augmentation、synthetic demonstrations、world model simulation。输出是更接近真实部署的训练和评估环境。

这一步解决的是“仿真里学到的东西能不能到真实世界用”。如果 generated assets 只在仿真里好看，但真实机器人一碰就失败，sim-to-real bridge 就断了。

### 第 5 步：整理 datasets 和 evaluation

Survey 还讨论 datasets and evaluation protocols。对 3D generation 来说，传统指标可能是 FID、Chamfer distance、CLIP score、visual quality；对 embodied AI 来说，还需要 simulator compatibility、task success、physical validity、interaction readiness、sim-to-real success rate。

输入是生成资产和任务评测。处理是用几何、物理、语义和任务指标综合评估。输出是更贴近机器人使用的质量判断。

论文指出 evaluation fragmented 是瓶颈。不同论文用不同 simulator、不同任务、不同资产格式，很难横向比较。

### 第 6 步：总结挑战和未来方向

最后，论文把挑战归纳为几个方向：physical annotation 不足、geometry quality 与 physical validity 的 gap、deformable/dynamic assets 支持不足、evaluation standards fragmented、sim-to-real divide 持续存在。

这些挑战说明，未来的 3D generation for embodied AI 可能会走向统一 generation-simulation foundation，把生成、仿真、任务评估和真实反馈放进闭环。

*所以这一节是想说：本文方法不是提出单一模型，而是建立“生成内容如何进入机器人仿真”的系统框架。*

## 关键数字

| 数字或概念 | 原文语境 | 这说明什么 |
|---|---|---|
| 3 roles | Data Generator / Simulation Environments / Sim2Real Bridge | survey 的主分类框架 |
| 2023 to 2026 | 方法表覆盖近期快速发展阶段 | 领域正处在快速扩张期 |
| URDF / MJCF | simulator-compatible formats | 具身 3D 生成必须输出可执行结构 |
| 4 requirements | geometry、semantics、physics、simulator compatibility 等要求 | 外观之外还有物理和任务约束 |
| 4 bottlenecks | physical annotations、geometry-physics gap、fragmented evaluation、sim-to-real divide | 当前最主要挑战 |
| 3DGen4Robot project page | 作者提供项目页 | 便于继续追踪 taxonomy 和论文列表 |

这篇是 survey，不以单一 benchmark 刷分为主。它的数字更多是分类、范围和挑战结构，而不是一个模型的成功率。

*所以这一节是想说：本文的证据是 taxonomy 和领域归纳，不是单模型实验。*

## 实验结果说明了什么

作为 survey，本文没有像模型论文那样报告一个新算法的主实验。它的“结果”是结构化综述：通过整理文献，说明 embodied AI 需要的 3D generation 正在从 visual realism 转向 interaction readiness。

Data Generator 部分说明，物体生成已经开始加入 articulation、physical parameters、URDF/MJCF export。Simulation Environments 部分说明，场景生成开始变得 task-conditioned、controllable、agentic。Sim2Real Bridge 部分说明，生成技术正在进入 digital twin、data augmentation、synthetic demonstration 和 real-to-sim-to-real loop。

这些整理支持一个判断：未来机器人训练世界不是人工手写全部资产，也不是只靠固定 simulator 数据集，而是会越来越多地由 generative models 生成、检查、修正和闭环使用。

但 survey 也提醒我们，现在的 bottleneck 很实在。很多生成结果视觉上可用，但物理上不可用；很多方法能生成单个 object，但不能稳定生成可交互场景；很多评估指标能测几何相似，却不能测真实任务成功。

*所以这一节是想说：survey 的结论是方向性证据，告诉我们生成世界要变成机器人基础设施还差哪些环节。*

## 术语表

- Simulation-ready：可以被仿真器加载、碰撞、运动和交互的资产状态。
- Data Generator：把 3D generation 当作可仿真资产生产器。
- Simulation Environments：把生成模型用于构建任务场景和交互世界。
- Sim2Real Bridge：用生成和重建连接真实数据、仿真训练和真实部署。
- URDF：Unified Robot Description Format，常用于描述机器人或关节物体结构。
- MJCF：MuJoCo XML Format，MuJoCo 使用的物理仿真描述格式。
- Digital twin：真实物体或场景的仿真副本。
- Interaction readiness：生成内容能否支持机器人真实交互，而不只是看起来真实。

*所以这一节是想说：这篇 survey 的术语都围绕“生成物能不能进仿真器并服务机器人”。*

## 局限和边界

第一，survey 本身不提供一个可直接使用的新 3D generator。它整理领域，而不是发布模型。

第二，taxonomy 很有帮助，但不同方法可能跨多个角色。例如 digital twin 既是 Sim2Real Bridge，也可能是 Data Generator 的输入。

第三，simulation-ready 的评价还没有统一标准。URDF/MJCF 可导出不等于物理准确，task success 也受 controller 和 policy 影响。

第四，deformable 和 dynamic assets 仍然困难。布料、软体、液体、组织等对机器人很重要，但生成和仿真都更难。

第五，sim-to-real divide 仍然存在。生成世界越复杂，越需要真实反馈校准，否则仿真偏差会被放大。

*所以这一节是想说：本文建立了框架，但真正的统一生成仿真基础设施还没完成。*

## 和其他论文的关系

和 `mimo-embodied` 相比，3D generation survey 关注训练世界，而 MiMo 关注跨具身推理模型。一个造环境，一个训练脑。

和 `open-h-embodiment` 相比，Open-H 汇聚真实医疗机器人数据，本文讨论如何生成仿真资产和环境。真实数据和生成仿真可以互补：真实数据校准仿真，仿真扩展训练覆盖。

和 `alanavlm` 相比，AlanaVLM 理解第一视角视频，本文讨论如何生成可交互世界。未来可以把生成场景用于训练 first-person embodied QA。

和 `habitat`、`maniskill`、`isaac` 等 simulator 笔记相比，本文更上游。它问的是 simulator 里的 object、scene、digital twin 从哪里来。

*所以这一节是想说：本文连接了 simulation、dataset、world model 和 robot policy 四条线。*

## 和本导读的关系

本站的 simulation 主题以前多关注 Habitat、MuJoCo、Isaac Gym、SIMPLER、ManiSkill 等平台。3D Generation Survey 提醒我们，平台之外还有一个更上游的问题：训练世界的内容如何规模化产生。

它适合放在 sim 主题，也适合和 world-model、dataset-eval、VLA 主题一起读。读者可以用它理解为什么“更多仿真”不只是开更多环境，还要生成可交互、可评估、能迁移的 3D 内容。

*所以这一节是想说：这篇 survey 补齐本站从仿真平台到生成式仿真内容的链路。*

## 思考题

1. 为什么外观逼真的 3D object 不一定适合机器人训练？
2. URDF 和 MJCF 在 embodied 3D generation 中为什么重要？
3. Data Generator、Simulation Environments、Sim2Real Bridge 三个角色有什么区别？
4. 为什么 geometry quality 和 physical validity 之间会有 gap？
5. 如果你要训练开柜门机器人，生成世界至少需要哪些非视觉信息？

## FAQ

**Q：这篇论文是不是提出了新的 3D 生成模型？**
A：不是。它是一篇 survey，主要贡献是 taxonomy、文献整理和挑战归纳。

**Q：simulation-ready 是不是只要导出 URDF 就够？**
A：不够。URDF/MJCF 是格式，物理参数、碰撞体、关节、材料和任务可用性都要验证。

**Q：为什么 3D generation 和 sim-to-real 有关系？**
A：生成技术可以创建 digital twin、增强数据、生成 demonstrations，但这些仿真内容必须和真实世界对齐，才能帮助迁移。

**Q：本站有没有跑 3D generation？**
A：没有。这里只记录 survey 的分类和观点，不写成本地复现实验。

## 进一步读什么

- Habitat / AI2-THOR / ManiSkill / MuJoCo：理解生成资产最终要进入什么仿真平台。
- URDF-Anything / URDFormer：理解从视觉到可动关节描述的路线。
- RoboTwin / RoboCasa：理解生成式仿真环境如何服务 robot learning。
- `open-h-embodiment`：理解真实数据如何补充仿真和生成。

## 精读补充：为什么 simulation-ready 比 visual realism 更难

这篇 survey 最值得反复记住的转向，是从 visual realism 到 interaction readiness。视觉逼真主要服务人眼判断，simulation-ready 则服务机器人训练。人看到一个柜子，会默认门能打开；仿真器不会默认知道这件事。它需要 joint axis、joint limit、collision mesh、mass、friction、contact model 等显式信息。

这种差异解释了为什么 3D generation for embodied AI 不能只沿用图形学指标。一个模型的 Chamfer distance 很低，说明几何接近；纹理很漂亮，说明渲染质量高。但如果抽屉没有正确滑轨，机器人 policy 在仿真里学到的开抽屉动作就会错误。几何质量和物理有效性之间的 gap，正是论文反复强调的 bottleneck。

URDF 和 MJCF 也不只是文件格式。它们代表生成结果能否进入机器人软件栈。URDF 更常见于机器人结构描述，MJCF 更贴近 MuJoCo 物理仿真。一个生成 pipeline 如果能输出这些结构，就从“给人看的模型”更接近“给机器人训练用的资产”。但格式正确仍不等于物理正确，参数还需要校准和验证。

未来更理想的系统可能是闭环的：从真实世界扫描或语言任务生成初始 3D asset，放进 simulator 跑机器人交互，发现碰撞、关节或材料不合理，再把失败反馈回生成器修正。只有这种 generate-simulate-validate loop 成熟后，3D generation 才可能真正成为 robot foundation model 的训练世界工厂。

*所以这一节是想说：simulation-ready 难在物理、格式、任务和验证闭环，而不只是模型外观。*

## 后续核验清单

如果之后要把本文从 `UNVERIFIED` 提升到人工核验状态，应逐项核对：三角色 taxonomy 是否为 Data Generator、Simulation Environments、Sim2Real Bridge；simulation-ready 相关要求是否包含 kinematics、physics、URDF/MJCF 等；四类 bottleneck 是否按原文表述；project page 是否为 `https://3dgen4robot.github.io`；不要把 survey 观点写成本站实验结论。

## 原文信息

- arXiv: [2604.26509](https://arxiv.org/abs/2604.26509)
- PDF: [https://arxiv.org/pdf/2604.26509](https://arxiv.org/pdf/2604.26509)
- Project: [https://3dgen4robot.github.io](https://3dgen4robot.github.io)

```bibtex
@article{ye2026generationembodied,
  title = {3D Generation for Embodied AI and Robotic Simulation: A Survey},
  author = {Ye, Tianwei and Mao, Yifan and Liao, Minwen and Liu, Jian and Guo, Chunchao and Du, Dazhao and Shou, Quanxin and Zhu, Fangqi and Guo, Song},
  journal = {arXiv preprint arXiv:2604.26509},
  year = {2026}
}
```
