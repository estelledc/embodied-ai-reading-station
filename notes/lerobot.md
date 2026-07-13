---
title: "LeRobot: An Open-Source Library for End-to-End Robot Learning"
slug: lerobot
topic: dataset-eval
difficulty: ⭐⭐⭐
status: auto-summary
来源: "https://arxiv.org/abs/2602.22818"
venue: ICLR
year: 2026
era: frontier
num: 157
generated_at: 2026-07-13
---

# LeRobot：把机器人学习从“散装工具箱”变成一条能跑的流水线

> 这是一份给“完全没接触过机器人学习，只知道 Python / ChatGPT 一点点”的读者看的精读笔记。术语首次出现都会翻成人话；本文只记录公开论文、OpenReview、GitHub release 与固定 tag 源码能支持的结论。本站尚未本地跑通 LeRobot 训练、评估或真机部署，因此不把任何命令写成 E4 复现实验结果。

## 一句话讲什么（TL;DR）

LeRobot 不是某一个“机器人大脑”，而是一整套把机器人学习串起来的开源流水线：左边接真实机器人和遥操作，中间把数据存成统一格式，右边训练、评估、部署 ACT / Diffusion / SmolVLA / π0 等策略。它解决的核心问题不是“提出一个新模型”，而是“让普通研究者不用为每台机器人、每份数据、每个训练脚本都重造轮子”。

*所以这一节是想说：LeRobot 的价值在工程地基。它把硬件、数据、模型、评估和部署放进同一套 Python / Hugging Face 生态，让后面的 SmolVLA 微调和 Task 2 实践有了统一入口。*

---

## 这是个什么场景

想象你想教一个机械臂“把红方块放进盒子”。你以为自己只需要一个模型，其实第一天就会撞上五件事：

1. 机器人怎么连接？不同电机、相机、夹爪都有自己的 SDK。
2. 人怎么示范？键盘、手柄、leader arm、VR 控制器，每种遥操作输入都不一样。
3. 数据怎么存？一边是相机视频，一边是关节状态和动作，还要对齐时间戳。
4. 模型怎么训？ACT、Diffusion Policy、SmolVLA、π0 的配置、依赖、batch 格式都不同。
5. 训练完怎么部署？模型可能跑在 GPU 机器上，机器人控制循环却在另一台低功耗设备上。

传统做法像“每次搬家都重新造水电系统”：每篇论文都有自己的脚本，每个实验室都有自己的数据格式，每台机器人都写一套胶水代码。论文能看懂，不代表你能把代码真的跑起来。

LeRobot 的目标更像“给机器人学习建一套标准厨房”：水、电、灶台、冰箱都有统一接口。你可以先从最简单的菜开始，比如加载数据集、跑 `lerobot-info`、训练 ACT；以后再换成 SmolVLA、π0 或真实 SO 系列机械臂。

> **机器人学习（robot learning）**：让机器人从数据里学策略。最常见的是人演示一批轨迹，模型学习“看到什么状态时该做什么动作”。
>
> **端到端（end-to-end）**：从观测直接到动作，中间尽量少用人工写死的规则。类比：不是让三个人接力喊“看到了、想到了、动一下”，而是一个系统直接“看完就动”。

*所以这一节是想说：LeRobot 面对的是机器人学习的工程碎片化。没有统一流水线，读懂 VLA 论文也很难走到真实训练和部署。*

---

## 之前的人怎么做的，为什么不够好

论文在 Introduction 和 Background 里把问题讲得很清楚：机器人学习正在从“显式模型”转向“隐式模型”，但工具生态没有跟上。

- **显式模型路线**：经典机器人会手写运动学、动力学、接触模型和规划器。优点是可解释，缺点是换场景就要重新建模。厨房、卧室、杂乱桌面这种开放环境里，手工规则会越写越脆。
- **隐式模型路线**：现代 robot learning 直接从数据学策略。比如模仿学习从人类示范里学，强化学习从奖励里学。优点是数据和算力增加时可以扩展，缺点是对数据格式、训练框架、评估流程要求很高。
- **旧工具链问题**：中间件、数据集和训练脚本彼此不兼容。数据可能是 ROS bag、TFDS、JSON、视频文件夹；机器人可能是 SO-100、ALOHA、Unitree、Reachy；模型可能是 ACT、Diffusion、VLA。每一层都能卡住新手。

论文把这种问题叫做 fragmentation（碎片化）。碎片化带来的不是小麻烦，而是“偶然复杂度”：你明明想研究策略，却把大部分时间花在转格式、调相机、对齐依赖、改脚本路径上。

一个直观例子：本站前一轮刚修过 `site/content/tutorials.md`，原因就是 LeRobot v0.6.0 已经不再把 dataset / training 依赖塞进默认 `pip install lerobot`，旧博客里的 examples 路径也不能再当稳定入口。版本一变，教程如果不跟着锁 release，就会把读者带进旧路径。

*所以这一节是想说：LeRobot 不是为了“再发明一个算法”，而是为了把算法真正放进可复现、可扩展、可教学的工程环境里。*

---

## 这篇论文的新想法

LeRobot 的新想法可以概括为一句话：**把机器人学习的全栈接口统一起来，让数据、模型、机器人和部署都讲同一种语言。**

论文把 LeRobot 的纵向集成拆成四块：

1. **统一机器人接口**：用一致的 Python API 接真实机器人，覆盖低成本机械臂到更复杂平台。重点不是“只支持某一台机器人”，而是让新 embodiment 能按同一套 Robot interface 接进来。
2. **标准化数据集**：用 LeRobotDataset 存机器人数据，把视频、状态、动作、语言任务等信息组织成可流式读取、可上传 Hugging Face Hub、可复用的格式。
3. **优化推理栈**：把高算力模型推理和低层控制循环解耦。模型可以在更强的机器上算动作，机器人侧保持控制频率，不必每一步都等大模型卡住。
4. **可复用算法实现**：用 PyTorch 实现 ACT、Diffusion、VLA、World Model、Reward Model 等策略，让训练、评估、部署走统一 CLI，而不是每篇论文一套脚本。

整体关系可以画成这样：

```text
          人类遥操作 / 真机 / 仿真
                    │
                    ▼
        ┌───────────────────────┐
        │ Robot / Teleop / Camera│
        │ 统一硬件与控制接口      │
        └───────────┬───────────┘
                    ▼
        ┌───────────────────────┐
        │ LeRobotDataset         │
        │ 视频 + 状态 + 动作 + 语言│
        └───────────┬───────────┘
                    ▼
        ┌───────────────────────┐
        │ Policies               │
        │ ACT / Diffusion / VLA  │
        └───────────┬───────────┘
                    ▼
        ┌───────────────────────┐
        │ Eval / Rollout / Deploy│
        │ 仿真评测 + 真机部署      │
        └───────────────────────┘
```

这里最重要的是“同一种语言”。如果你的数据、模型和部署都用 LeRobot 的对象和 CLI，后续换模型就不会从零开始。先用 ACT 跑通小任务，再切到 SmolVLA 或 π0，就像先学会用同一个厨房做煎蛋，再换复杂菜谱。

*所以这一节是想说：LeRobot 的贡献是系统设计。它把机器人学习里分散的工具统一到一条可教学、可复查、可复用的路径上。*

---

## 它分几步做的（方法）

### 第 1 步：统一机器人和遥操作接口

**输入**：真实机器人、相机、leader arm、键盘、手柄、手机或其他遥操作设备。

**处理**：LeRobot 把这些东西抽象成统一的 Robot / Teleoperator / Camera 组件。README 里列出的硬件包括 SO100、LeKiwi、Koch、HopeJR、OMX、EarthRover、Reachy2、Gamepads、Keyboards、Phones、OpenARM、Unitree G1、reBot B601 等。固定 release `v0.6.0` 的 README 也强调：这些设备是原生集成的，但库本身允许你实现自己的 Robot interface。

**输出**：上层训练和数据采集代码不必关心底层硬件细节，只要读 observation、发 action。

类比一下：以前每台机器人像不同国家的插头，你每次都要买转接头。LeRobot 想做的是统一插座标准，让策略训练代码不用为每台机器改一遍。

### 第 2 步：用 LeRobotDataset 固定数据格式

**输入**：相机视频或图像、机器人状态、动作、episode 元数据、语言任务描述。

**处理**：LeRobotDataset 把视觉数据存成同步视频（MP4 或图片），把状态/动作等结构化数据存成 Parquet，并和 Hugging Face Hub 打通。README 里给了最小示例：`LeRobotDataset("lerobot/aloha_mobile_cabinet")` 直接从 Hub 加载数据。

**输出**：训练脚本可以用统一 dataset API 流式读取数据，不必先把每个数据集转成自定义文件夹。

这一步对新手特别关键。很多机器人论文最难复现的不是模型，而是“数据到底长什么样”。如果数据格式统一，后面的训练、评估、可视化才有稳定入口。

### 第 3 步：用统一 CLI 训练和评估策略

**输入**：一个 dataset repo_id、一份 policy 配置、可选的环境配置。

**处理**：LeRobot v0.6.0 的 `pyproject.toml` 暴露了多个 CLI script，例如 `lerobot-info`、`lerobot-record`、`lerobot-replay`、`lerobot-train`、`lerobot-eval`、`lerobot-dataset-viz` 等。README 的训练示例是：

```bash
lerobot-train \
  --policy.type=act \
  --dataset.repo_id=lerobot/aloha_mobile_cabinet
```

**输出**：训练好的策略、可上传 Hub 的 checkpoint、可用于评估或部署的模型路径。

注意：v0.6.0 release 明确说默认 `pip install lerobot` 不再包含 dataset 或 training 依赖。训练前要按需装 extras，例如 `lerobot[training]`。`pyproject.toml` 还写明 `requires-python = ">=3.12"`，这和许多 MuJoCo / robosuite / LIBERO 环境常见的 Python 3.10 不同，所以不要把所有实验硬塞进一个环境。

### 第 4 步：把评估和部署也收进同一条链路

**输入**：训练好的 policy、仿真环境或真实机器人。

**处理**：README 展示了 `lerobot-eval` 在 LIBERO 上评估策略的入口；v0.6.0 release blog 进一步说明新增 `lerobot-rollout`，把部署从旧的记录流程里拆出来，支持 base、sentry、highlight、episodic、dagger 等策略。DAgger 模式下，人可以在策略失败时介入，记录纠正数据，再回到下一轮 fine-tune。

**输出**：仿真评估结果、真实部署数据、失败纠正样本，形成“部署 -> 发现失败 -> 收集新数据 -> 再训练”的闭环。

这就是 release blog 说的 “closing the robot learning loop”。机器人学习不是训练一次就结束，而是不断从失败里回收数据，让下一版策略更好。

```text
  训练 policy
      │
      ▼
  仿真/真机 rollout
      │
      ├── 成功：记录指标和 artifact
      │
      └── 失败：人工接管 / 标注 / 纠正
              │
              ▼
          新数据进入 LeRobotDataset
              │
              ▼
          下一轮 fine-tune
```

*所以这一节是想说：LeRobot 的方法不是单点，而是四段式流水线：硬件接口统一、数据格式统一、训练评估统一、部署反馈统一。*

---

## 关键数字（What works）

| 事实 | 数字 / 状态 | 来源与证据边界 |
|---|---:|---|
| 论文 arXiv ID | `2602.22818` | arXiv abs，E2 |
| arXiv 提交时间 | 2026-02-26 | arXiv abs，E2 |
| 会议状态 | ICLR 2026 Poster | OpenReview `CiZMMAFQR3`，E2 |
| OpenReview 发布时间 | 2026-01-26 | OpenReview 页面，E2 |
| GitHub release | `v0.6.0` | GitHub release，E3 |
| release commit | `30da8e687a6dfc617fcd94afc367ac7071c376ce` | GitHub release，E3 |
| Python 要求 | `>=3.12` | `v0.6.0` `pyproject.toml`，E3 |
| PyTorch 版本范围 | `torch>=2.7,<2.12.0` | `v0.6.0` `pyproject.toml`，E3 |
| 默认安装变化 | `pip install lerobot` 不再包含 dataset/training 依赖 | v0.6.0 release，E3 |
| 训练 extra | `lerobot[training]` | `v0.6.0` `pyproject.toml`，E3 |
| 公开 CLI | `lerobot-info`、`lerobot-train`、`lerobot-eval` 等 | `v0.6.0` `pyproject.toml`，E3 |
| 本站本地复现 | 未保存 E4 artifact | 本站约束；不得写成已跑通 |

*所以这一节是想说：LeRobot 的论文事实和 release / CLI / 依赖事实可以写入；但“本机已跑通”“训练成功率”“部署效果”必须等真实日志和 artifact。*

---

## 实验结果说明了什么

这篇论文和很多模型论文不一样：它不是拿一个新策略去刷某个 benchmark 的 SOTA，而是论证一套开源库能覆盖机器人学习的关键链路。论文正文和附录展示了真实机器人 API、数据集使用、模型训练、预训练模型使用、远程推理和动作流式传输等示例；README 和 v0.6.0 release 则显示这个库已经继续扩展到更多策略、benchmark、reward model、世界模型和部署 CLI。

因此它的“实验结果”更像工程能力证明：

- **能接硬件**：统一 Robot class，把底层硬件差异藏到接口后面。
- **能管数据**：LeRobotDataset 支持视频/图像 + Parquet，能上传和流式读取 Hub 数据。
- **能训策略**：`lerobot-train` 支持 ACT、Diffusion、VLA 等不同 policy family。
- **能评估**：`lerobot-eval` 把 LIBERO、MetaWorld 和 v0.6.0 新增 benchmark 放到统一入口下。
- **能部署并回收失败**：`lerobot-rollout` 和 DAgger-style correction 让部署过程也变成下一轮训练数据来源。

但也要小心：这些是官方报告的能力，不等于本站已经在本机验证。比如 `lerobot-eval --env.type=libero` 能否在你的机器跑起来，还取决于 Linux / CUDA / simulator / extra dependency / dataset 权限。本站目前只把它作为 E2/E3 证据写入，不把它升级成 E4。

*所以这一节是想说：LeRobot 的结果证明“流水线可组合”，不是证明本站已经跑通某个具体机器人任务。真正的 Task 2 成功率还要等本地实验日志。*

---

## 你应该懂的几个新词

- **Middleware（中间件）**：连接硬件和上层程序的胶水层。类比：操作系统驱动，让应用不必直接和硬件说电信号。
- **LeRobotDataset**：LeRobot 的机器人数据格式，把视频、状态、动作、语言任务组织成可训练、可上传、可流式读取的数据集。
- **Teleoperation（遥操作）**：人通过手柄、键盘、VR 或 leader arm 控制机器人示范动作。类比：你用游戏手柄开一辆遥控车，车的轨迹被记录下来给模型学习。
- **Policy（策略）**：机器人“大脑”的动作函数。输入观察，输出动作。
- **Rollout（展开执行）**：让策略在环境或真机里跑一段 episode，观察它做得怎样。
- **DAgger**：一种“边跑边纠正”的模仿学习思路。模型先尝试，人发现它跑偏就接管，纠正数据再喂回训练。
- **Extras**：Python 包的可选依赖集合。`lerobot[training]` 表示安装 LeRobot 时顺带安装训练需要的额外库。
- **E4 artifact**：本地真实运行留下的环境、命令、退出码、日志、指标、配置和原始产物。没有这些，就不能写“已复现”。

*所以这一节是想说：理解 LeRobot 要先分清数据、策略、遥操作、部署和证据等级。它们是 Task 2 后续每一步都会遇到的基础词。*

---

## 它有什么搞不定的

1. **它降低门槛，但不消除硬件复杂度。** 真实机器人仍有电机、相机、标定、安全、线缆、延迟和磨损问题。统一 API 不能替你检查夹爪是否会夹到人。
2. **它统一入口，但不同 extra 仍可能冲突。** v0.6.0 `pyproject.toml` 已经把很多依赖拆成 feature-scoped extras，原因正是机器人生态依赖树复杂。LIBERO、RoboCasa、RoboMME 等环境仍有各自安装约束。
3. **它支持很多策略，但不是每个策略都适合新手。** ACT / Diffusion 适合先跑通小数据闭环；SmolVLA、π0、GR00T、MolmoAct2 等 VLA 涉及更大的模型和显存预算。
4. **它不能替代实验记录。** 官方 README 能告诉你命令入口，但你自己的成功率、失败案例和训练时间必须由本机 E4 artifact 支撑。
5. **release 演进很快，教程容易漂移。** v0.6.0 已经有 breaking changes，`main` 还会继续前进。学习时必须固定 release 或 commit，不要混用旧博客和新源码。

*所以这一节是想说：LeRobot 是地基，不是魔法。它把正确路径铺出来，但真实实验仍需要环境锁定、逐步验证和安全边界。*

---

## 它和别的几篇是什么关系

- **和 [SmolVLA](smolvla.md)**：SmolVLA 是策略模型，LeRobot 是训练、数据和部署框架。SmolVLA 要吃 LeRobot 社区数据，训练入口也落在 LeRobot 生态里。
- **和 [OpenVLA](openvla.md)**：OpenVLA 是开源 VLA 模型代表；LeRobot 更像“把不同模型放进同一工程流水线”的框架。两者一个偏模型，一个偏系统。
- **和 [Octo](octo.md)**：Octo 也是开源通用机器人策略，强调可下载、可微调；LeRobot 则进一步关注机器人接口、数据格式、评估和部署闭环。
- **和 [Diffusion Policy](diffusion-policy.md)**：Diffusion Policy 是动作生成方法；LeRobot README 把 Diffusion 作为可训练 policy family 之一。
- **和 [LIBERO](libero.md)**：LIBERO 是评测基准；LeRobot 通过 `lerobot-eval --env.type=libero` 把它纳入统一评估入口。
- **和 [MuJoCo Playground](mujoco-playground.md)** / simulation 线：LeRobot 不等于仿真器，它可以调用 benchmark/env；仿真器解决“在哪里跑”，LeRobot 解决“数据、策略和命令怎么统一”。

*所以这一节是想说：LeRobot 是连接器。它把模型、数据集、评测和机器人硬件串起来，让这些论文不再只是并排阅读，而是能走向同一条实践路径。*

---

## 和本导读的关系

本笔记对应导读里的两条线：

- [Ch12: OpenVLA / VLAs / MLA](../guide/ch12-openvla-vlas-mla.md)：理解 VLA 为什么需要开放模型、开放数据和低门槛训练工具。
- [Ch22: Task 2 Guide](../guide/ch22-task-guide.md)：理解“MuJoCo / LeRobot / SmolVLA / LIBERO”为什么要拆环境、锁版本、先跑小闭环。

如果你按 Task 2 路线走，LeRobot 的位置大概是：

```text
先读 VLA 概念
   │
   ▼
理解数据格式：LeRobotDataset
   │
   ▼
跑小策略：ACT / Diffusion
   │
   ▼
换 VLA：SmolVLA / π0 / 其他 policy
   │
   ▼
仿真或真机 rollout
   │
   ▼
失败数据回流，再训练
```

本站后续如果新增 Lab，不应该先写“LeRobot 已跑通”的漂亮教程，而应该先保存环境、命令、日志、错误和修复。实践日志必须来自真实运行，不能从 README 改写出“实验结果”。

*所以这一节是想说：LeRobot 是本站从“读论文”走向“做实验”的桥。它应该先帮我们跑小闭环，再承接 SmolVLA 微调和部署。*

---

## 思考题

**Q1：为什么 LeRobot 不是“又一个 VLA 模型”？**

<details>
<summary>提示</summary>

看它的输入输出：它管理机器人接口、数据格式、训练、评估、部署，而不是只定义一个 neural network。
</details>

**Q2：LeRobotDataset 解决的是哪类痛点？**

<details>
<summary>提示</summary>

想想相机视频、关节状态、动作、语言任务如果各存各的，训练脚本会怎样读取和对齐。
</details>

**Q3：为什么 v0.6.0 的 `pip install lerobot` 变轻量反而是好事？**

<details>
<summary>提示</summary>

机器人生态依赖复杂。默认安装越重，越容易因为你根本不用的硬件或仿真依赖而失败。
</details>

**Q4：为什么本站不能把 README 示例写成“我们已跑通 LeRobot”？**

<details>
<summary>提示</summary>

README / release 是 E3；本地跑通要 E4，包括环境、命令、日志、退出码、指标和 artifact。
</details>

**Q5：如果你要做 Task 2，为什么应先用 ACT / Diffusion 跑小闭环，再上 SmolVLA？**

<details>
<summary>提示</summary>

小策略更容易暴露数据格式、训练脚本、评估环境问题；这些问题没解决前，上大 VLA 只会更难排查。
</details>

**Q6：`lerobot-rollout` 和 DAgger-style correction 为什么重要？**

<details>
<summary>提示</summary>

真实部署一定会失败。关键不是避免失败，而是把失败变成下一轮训练数据。
</details>

*所以这一节是想说：能回答这些问题，说明你已经把 LeRobot 看成“实践流水线”，而不是只记住几个命令。*

---

## 一些好奇心问答（FAQ）

**Q：我是不是直接 `pip install lerobot` 就能开始训练？**

A：不一定。v0.6.0 默认安装更轻量，训练通常需要 extra，例如 `lerobot[training]`。如果要数据、硬件、可视化或特定 policy，还要按文档补对应 extra。

**Q：LeRobot 需要 Python 几？**

A：固定 tag `v0.6.0` 的 `pyproject.toml` 写的是 `requires-python = ">=3.12"`。这和部分 MuJoCo / robosuite / LIBERO 环境常见 Python 3.10 不同，所以建议拆环境。

**Q：它能在 Mac 上跑吗？**

A：README 说明 LeRobot 可从 PyPI 安装，部分轻量路径可以先尝试；但具体训练、评估和硬件支持取决于 policy、extra、设备和系统。不要把“能安装”直接等同于“能训练所有模型”。

**Q：LeRobot 和 Hugging Face Hub 是什么关系？**

A：LeRobotDataset、模型 checkpoint 和教程都和 Hub 深度集成。它的生态价值很大一部分来自“数据和模型能共享、下载、复用”。

**Q：为什么这篇放在 dataset-eval 主题，而不是 VLA 主题？**

A：因为 LeRobot 本身是基础设施。它支持 VLA，但也支持 imitation learning、reinforcement learning、world models、reward models、benchmarks 和 dataset workflow。

**Q：下一步该读什么？**

A：如果想理解模型，读 [SmolVLA](smolvla.md)、[OpenVLA](openvla.md)、[Octo](octo.md)。如果想理解评测，读 [LIBERO](libero.md)。如果想动手，回到 [Ch22 Task Guide](../guide/ch22-task-guide.md)，先从环境拆分和小闭环开始。

*所以这一节是想说：LeRobot 是入口，不是终点。真正学会它，要在小任务里把数据、训练、评估、部署都走一遍。*

---

## 如果你想再深入

1. 读 LeRobot 论文的 Introduction 和 Features，理解它为什么强调 vertical integration。
2. 固定到 GitHub release `v0.6.0`，对照 README 和 `pyproject.toml` 看 CLI / extras / Python 版本。
3. 先不碰真机，跑 `lerobot-info` 和官方 Robot Learning Tutorial，确认本机环境能启动。
4. 用公开 LeRobotDataset 训练一个小 ACT 或 Diffusion 策略，保存完整命令和日志。
5. 再把同一数据流换成 SmolVLA 或其他 VLA，比较环境、显存和训练时间差异。

*所以这一节是想说：深入 LeRobot 的正确顺序是“先锁版本和入口，再跑小闭环，最后再上大模型和真机”。*

---

## 原文信息

- arXiv：https://arxiv.org/abs/2602.22818
- OpenReview：https://openreview.net/forum?id=CiZMMAFQR3
- GitHub：https://github.com/huggingface/lerobot
- v0.6.0 release：https://github.com/huggingface/lerobot/releases/tag/v0.6.0
- v0.6.0 release blog：https://huggingface.co/blog/lerobot-release-v060

```bibtex
@inproceedings{cadenelerobot2026,
  title={LeRobot: An Open-Source Library for End-to-End Robot Learning},
  author={Cadene, Remi and Alibert, Simon and Capuano, Francesco and Aractingi, Michel and Zouitine, Adil and Kooijmans, Pepijn and Choghari, Jade and Russi, Martino and Pascal, Caroline and Palma, Steven and Shukor, Mustafa and Moss, Jess and Soare, Alexander and Aubakirova, Dana and Lhoest, Quentin and Gallouedec, Quentin and Wolf, Thomas},
  booktitle={The Fourteenth International Conference on Learning Representations},
  year={2026},
  url={https://arxiv.org/abs/2602.22818}
}
```

*所以整篇是想说：LeRobot 把机器人学习最难的新手门槛从“每层工具都重新接线”降成“沿着一条统一流水线逐段验证”。它不替你完成实验，但它让实验终于有一条能被记录、复查和迭代的路。*
