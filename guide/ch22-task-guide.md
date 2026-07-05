# Ch22: Task 1 & Task 2 实战指南——从理论到交付

> [返回目录](README.md)
> 上一章：[Ch21: 数据集全景](ch21-datasets.md)

---

## 22.1 引子：从"懂了"到"做了"

### 回顾：你已经走了多远

如果你从 Ch01 一路读到 Ch21，你手里已经攒了一条完整的知识链条：

**感知层**——你知道 CLIP 如何把图像和文字对齐（[Ch08](ch08-clip.md)）、BLIP-2 和 LLaVA 如何让模型"看懂"图片并回答问题（[Ch09](ch09-blip2-llava.md)）、3D 点云如何被理解（[Ch18](ch18-multimodal.md)）、射频信号如何穿墙感知（[Ch19](ch19-rf-perception.md)）、声音如何辅助导航（[Ch20](ch20-auditory.md)）。

**规划层**——你理解了 SayCan 风格的"大模型提方案、小模型打分"范式（[Ch10](ch10-planning.md)），知道高层推理如何分解为一步步可执行动作。

**策略层**——你见过 RT-1/RT-2 的 Transformer 动作策略（[Ch11](ch11-rt1-rt2.md)）、OpenVLA 和 MLA 的视觉-语言-动作统一框架（[Ch12](ch12-openvla-vlas-mla.md)）、扩散策略的多模态动作建模能力（[Ch13](ch13-diffusion-policy.md)）、以及模仿学习的核心循环（[Ch14](ch14-imitation-learning.md)）。

**基建层**——你掌握了世界模型的想象力（[Ch15](ch15-world-models.md)）、强化学习的奖励机制（[Ch16](ch16-rl-basics.md)）、仿真到真实的迁移技巧（[Ch17](ch17-sim-to-real.md)）。

**数据层**——你扫描了从 Open X-Embodiment 到 DROID 的数据集全景（[Ch21](ch21-datasets.md)），知道"没数据什么都做不了"。

这些知识就像零件，你已经认识了发动机、变速箱、方向盘。但认识零件不等于会开车——本章就是带你组装并上路。

### 本章目标：两个可交付项目

本章将这 21 章知识转化为两个实际交付物。类比考驾照：Task 1 是笔试（理论内化 + 表达验证），Task 2 是路考（动手操作 + 系统集成）。

| | Task 1 | Task 2 基础 | Task 2 进阶 |
|---|---|---|---|
| **目标** | 论文精读 + 英文 PPT | VLM 抓取仿真复现 | 采数据 → 微调 VLA → 部署 |
| **交付物** | 10-15 页全英文 PPT | 仿真抓取 demo | 微调模型 + 评测报告 |
| **前置知识** | Ch07-Ch12 为核心 | Ch09 + Ch12 + Ch17 | Ch13-Ch14 + Ch17 + Ch21 |
| **硬件需求** | 任何能跑 PDF 阅读器的电脑 | GPU ≥ 8GB + Python + MuJoCo | 同上 + 遥操作设备(可选) |
| **时间预估** | 1-2 周 | 1-2 周 | 3-4 周 |
| **截止参考** | 6/30 | 灵活 | 灵活 |

> **核心洞察**：Task 1 和 Task 2 不是独立的。如果你 Task 1 选读 OpenVLA 论文，那么 Task 2 复现时你对架构的理解会深刻得多。反过来，Task 2 的动手经验会让你 PPT 里讲 Method 时底气十足。选题时就要考虑这个联动。

### 阅读建议

如果你时间紧，先通读 22.2 完成 Task 1 的 PPT 交付；再按 22.3 → 22.4 逐步推进 Task 2。如果你更偏实践，可以先跑通 22.3 的仿真 demo，再回头用动手经验来辅助 Task 1 的论文理解。两条路都行，关键是**先完成一个再扩展另一个**——不要并行半成品。

本章覆盖 22.1-22.9 的完整内容，从任务理解到论文汇报、VLA 微调实战、时间线管理，直到总结与寄语。

### 心态建设

开始之前，有三个心理预期要设对：

**预期一：环境搭建会占你 30% 的时间。** 不要觉得"装环境"是浪费时间——这就是真实工程。调通一个 CUDA 版本冲突，你学到的东西不比读一页论文少。

**预期二：第一次跑通的效果一定很烂。** 你的第一版 VLA 可能成功率只有 20%。这不代表你做错了——这代表你有了一个 baseline，后面每次改进都有参照物。

**预期三：卡住是正常的。** 如果一切顺利才不正常。遇到问题时先记录现象（[problems/](../../../problems/)），再系统排查，最后记录解法。这个循环本身就是核心学习。

---

## 22.2 Task 1 实战：论文精读 + 英文 PPT

Task 1 的本质：选一篇 Embodied AI 相关论文，彻底读懂它，然后用英文 PPT 向他人清晰讲解。这既验证你的理解深度，也锻炼英文技术表达——两项在研究岗位都不可或缺的能力。

### 22.2.1 选题策略

#### 推荐论文库

以下 7 个主题、13 篇论文，按你已学的章节知识分组。每篇标注了前置难度和推荐程度：

| 主题 | 论文 | 关联章节 | 难度 | 推荐度 | 备注 |
|------|------|----------|------|--------|------|
| VLM 基础 | **LLaVA** (Liu et al., 2023) | [Ch09](ch09-blip2-llava.md) | 中 | ★★★ | 结构清晰，故事完整，适合首选 |
| VLM 进阶 | **3DShape2VecSet** (Zhang et al., 2023) | [Ch18](ch18-multimodal.md) | 高 | ★★ | 3D 表示独特，但前置多 |
| 规划 | **SayCan** (Ahn et al., 2022) | [Ch10](ch10-planning.md) | 中低 | ★★★ | 叙事性强，适合讲故事 |
| VLA 核心 | **OpenVLA** (Kim et al., 2024) | [Ch12](ch12-openvla-vlas-mla.md) | 中 | ★★★ | **和 Task 2 强联动** |
| VLA 扩展 | **VLAS** (Jin et al., 2024) | [Ch12](ch12-openvla-vlas-mla.md) | 中高 | ★★ | 多模态思路新颖 |
| VLA 扩展 | **MLA** (Zhu et al., 2024) | [Ch12](ch12-openvla-vlas-mla.md) | 中高 | ★★ | 多模态对齐有深度 |
| 世界模型 | **Cosmos Policy** (NVIDIA, 2024) | [Ch15](ch15-world-models.md) | 高 | ★★ | 前沿但需视频生成基础 |
| 射频感知 | **RF-SLAM** | [Ch19](ch19-rf-perception.md) | 高 | ★☆ | 独特切入点，适合差异化 |
| 射频感知 | **mmCLIP** | [Ch19](ch19-rf-perception.md) | 高 | ★☆ | CLIP+毫米波，跨模态 |
| 射频感知 | **NLOS Imaging** | [Ch19](ch19-rf-perception.md) | 高 | ★ | 非视线成像，物理底子要求高 |
| 听觉感知 | **Proactive Hearing** | [Ch20](ch20-auditory.md) | 中高 | ★★ | 主动听觉，新方向 |
| 听觉感知 | **NeuralAids** | [Ch20](ch20-auditory.md) | 中高 | ★☆ | 助听器+神经网络 |
| 听觉感知 | **Acoustic Swarms** | [Ch20](ch20-auditory.md) | 中高 | ★☆ | 多设备声学协同 |

#### 三条选题原则

**原则一：自己感兴趣 > 导师推荐。** PPT 汇报的说服力 80% 来自你对内容的热情。如果你觉得声音感知很酷，那就选 Proactive Hearing，即使它难度偏高——兴趣会驱动你啃下去。

**原则二：已有基础 > 从零开始。** 如果你已经花了一周研究 [Ch09](ch09-blip2-llava.md) 的 LLaVA，那选 LLaVA 作为 Task 1 的论文就是自然延伸，不需要额外建立背景知识。

**原则三：和 Task 2 联动 = 加分。** 如果你 Task 2 打算复现 VLM 抓取，那 Task 1 选 OpenVLA 的论文，你的精读会直接为复现铺路；反过来复现中遇到的细节会让你的 PPT Method 部分讲得更透彻。

#### 三条推荐路线

- **求稳路线**：选 LLaVA。结构清晰、图表易懂、社区资料丰富、前置知识你在 Ch09 已经有了。
- **联动路线**：选 OpenVLA。直接和 Task 2 的 VLA 微调衔接，一石二鸟。
- **特色路线**：选 SayCan。叙事性强（机器人去厨房拿饮料的故事），PPT 容易讲得生动，观众容易被吸引。

> **踩坑提醒**：不要因为"看起来容易"就选一篇你完全不关心的论文。PPT 准备过程中你需要反复阅读同一篇 8-10 遍，如果不感兴趣，这个过程会极其痛苦。

### 22.2.2 精读工作流

选定论文后，不要上来就逐字逐句读——那是最低效的方式。参考 [Ch07 三遍法](ch07-how-to-read-papers.md)，这里给出针对 PPT 交付的四步精读流程：

#### Step 1: 鸟瞰（15 分钟）

**目标**：建立全局印象，决定是否值得深读。

操作清单：
1. 读 Abstract（摘要）：这篇解决什么问题？用什么方法？结果如何？
2. 读 Conclusion（结论）：作者自己认为最大贡献是什么？
3. 浏览所有图表：Figure 1 通常是架构总览，Table 1 通常是主实验
4. 扫 Related Work 的标题和分类

**产出**：
- 一句话总结："`<论文名>` 通过 `<核心方法>` 解决了 `<什么问题>`，在 `<基准>` 上达到了 `<什么效果>`"
- 三个问题清单：你最想知道答案的三个问题（后续精读时带着这些问题）

示例（以 LLaVA 为例）：
- 一句话："LLaVA 通过视觉指令微调将预训练 VLM 转化为可对话的多模态助手，在 Science QA 上超越此前方法"
- 三个问题：(1) 指令数据怎么生成的？(2) 视觉编码器和 LLM 怎么连接？(3) 两阶段训练为什么有效？

#### Step 2: 理解（1-2 小时）

**目标**：把 Method 部分完全拆解，能用自己的话复述。

操作清单：
1. 逐段读 Method/Approach 章节
2. 对每个组件画"输入→处理→输出"框图
3. 每遇到一个公式，翻译成一句人话（例：$L_{CE}$ = "预测下一个词的交叉熵损失"）
4. 对每个设计选择问"为什么"：为什么用 ViT 而不是 CNN？为什么分两阶段训练？

**产出**：
- 手绘/电绘架构图（后续 PPT 直接用）
- Method 每段的一句话摘要
- "不理解清单"（Step 3 需要攻克的部分）

> **技巧**：如果某段读了三遍还是不理解，先跳过，往后读实验部分——实验设计往往会反向解释 Method 的动机。

#### Step 3: 批判（2-4 小时）

**目标**：从"理解作者"上升到"评价作者"。

操作清单：
1. **消融实验怎么读**：表格中去掉某组件后性能下降多少？下降最大的 = 最关键组件。注意看绝对值还是相对值。
2. **找局限性**：作者自己说了什么 limitation？你还能发现哪些？（例：只在仿真评估、没测真实机器人；只支持单步指令、不支持长horizon任务）
3. **和前代对比**：比 BLIP-2 好在哪？比 InstructBLIP 差在哪？好的部分是方法带来的还是数据/规模带来的？
4. **定位在主线上**：在 VLM → VLA 的演化主线（Ch05-Ch06 时间线）上，这篇处于什么位置？它的前驱是谁（站在谁肩膀上）？后续有谁引用并改进了它？

**产出**：
- 3-5 条优点 / 3-5 条局限（PPT Discussion 页直接用）
- 一句"我的观点"（PPT 结尾页的亮点）

#### Step 4: 结构化输出

把前三步的产出按 PPT 结构重新组织：

```
Cover         ← 论文标题 + 你的名字
Roadmap       ← 你要讲什么（给听众地图）
Problem       ← 为什么需要这个研究？痛点是什么？
Method 1-4    ← 架构图 + 关键公式 + 设计动机
Results       ← 主表 + 消融 + 定性可视化
Discussion    ← 优缺点 + 和相关工作的对比
My Take       ← 你自己的判断和观点
```

### 22.2.3 PPT 制作指南

#### 10-15 页模板结构

| 页码 | 内容 | 时间分配 | 要点 |
|------|------|----------|------|
| 1 | Cover | 10s | 论文标题、作者、你的名字、日期 |
| 2 | Roadmap | 30s | 本次汇报结构一览，让听众有预期 |
| 3-4 | Problem & Motivation | 2min | 为什么需要这个研究？现有方法的痛点 |
| 5-8 | Method | 5-6min | **核心**。架构图为主，文字为辅 |
| 9-11 | Results | 3-4min | 主实验表 + 1-2个消融 + 定性展示 |
| 12-13 | Discussion | 2-3min | 优缺点、vs 相关工作、未来方向 |
| 14 | My Take (可选) | 1min | 你的判断：最大贡献是什么、如果你来改进会怎么做 |
| 15 | References | - | 关键引用 3-5 篇 |

#### 排版原则

**文字密度**：每页不超过 6 行文字。如果你发现自己在一页里塞了一整段话——那说明你还没消化透，应该拆成图+关键词。

**图为主角**：Method 的每一页都应该有一张图（架构图、流程图、或论文原图标注版）。人类处理图像比文字快 60000 倍——用这个优势。

**配色**：白底 + 一个主色调（推荐深蓝或深灰）+ 一个强调色（推荐橙色或绿色标注关键部分）。不要超过三种颜色。

**字体**：标题 24-28pt，正文 18-20pt，注释 14pt。如果你需要缩到 12pt 才放得下——内容太多了，砍。

#### 英文演讲 Tips

**第一页后停 3 秒**。讲完 Cover 后不要急着翻页，停下来做眼神接触，给听众一个"准备好了吗？"的信号。这 3 秒会让你的节奏从容很多。

**Method 指图不念字**。PPT 上的文字是给忘了你说什么的人看的，你的嘴应该在描述图中的数据流："The image first goes through the ViT encoder, producing visual tokens here (指图), which are then projected into the LLM's embedding space through this linear layer (指图)."

**预设 2-3 个问答**。提前准备听众最可能问的问题：
- "Why not use `<替代方法>`?" → 准备一个 trade-off 分析
- "How does this compare to `<最新方法>`?" → 准备一个定位图
- "What are the limitations?" → 你在 Step 3 已经分析过了

**语速控制**。非母语演讲者最常犯的错误是语速过快（因为紧张）。技巧：每讲完一个关键点，喝一口水或深呼吸一次。目标语速：120-140 words/min。

#### 参考案例分析

一份好的 14 页 LLaVA PPT 通常这样组织：

```
P1:  标题页 — "LLaVA: Visual Instruction Tuning"
P2:  路线图 — "Today: Why → How → Results → Discussion"
P3:  背景痛点 — GPT-4 能看图，但开源模型不行
P4:  关键洞察 — 用 GPT-4 生成视觉指令数据
P5:  架构总览 — ViT + Projection + LLM 三模块图
P6:  Stage 1 — 预训练 Projection（冻结 ViT 和 LLM）
P7:  Stage 2 — 微调 LLM + Projection（冻结 ViT）
P8:  数据构造 — 3 类指令：对话/描述/推理
P9:  主实验 — Science QA 表格，高亮最佳结果
P10: 消融 — 去掉 Stage 1 / 减少数据 / 换 LLM 的影响
P11: 定性展示 — 2-3 个有趣的对话示例截图
P12: Discussion — 优点(数据高效) + 局限(幻觉问题)
P13: My Take — "指令微调范式比架构创新更重要"
P14: References — 5 篇关键引用
```

### 22.2.4 常见踩坑

**坑 1：翻译 ≠ 汇报。** 最常见的错误是把论文原文逐句翻译成英文放上 PPT。汇报的目标不是证明"我读了"，而是证明"我懂了并能教给你"。用自己的话重构，加上"输入→输出→为什么"的框架。

**坑 2：Related Work 别念三页。** 有人会做 3-4 页 Related Work 的综述。听众 30 秒后就会走神。正确做法：把 Related Work 浓缩到 Problem 页的一句背景里，例如 "Prior methods like BLIP-2 require two-stage pretraining, which limits..."

**坑 3：别跳过消融实验。** 消融实验是论文最有信息量的部分——它告诉你每个设计选择的真实贡献。如果你只讲最终结果而不讲消融，听众会觉得"结果好但不知道为什么好"。至少花一页讲最关键的消融。

**坑 4：时间分配失衡。** 常见错误分配：Background 40% + Method 30% + Results 30%。正确分配：Background ≤ 20%，Method 40-50%，Results + Discussion ≥ 30%。Method 是你展示理解深度的地方，Results + Discussion 是你展示批判能力的地方。

**坑 5：缺少"我的观点"。** 很多人做完 Results 就结束了。但加上一页 "My Take / Future Directions" 会让你的汇报从 B 级升到 A 级。这不需要多深刻——可以是"我认为这篇最大贡献是 X"或"如果改进，我会尝试 Y"。这证明你不是在被动接受论文，而是在主动思考。

> **总结**：Task 1 的本质是"理解 + 表达"的闭环。精读是内化，PPT 是外化。如果你 PPT 某一页讲不清楚，说明那部分你还没真正理解——回去再读。

#### Task 1 完成 Checklist

在你提交 PPT 之前，逐项确认：

- [ ] PPT 页数在 10-15 页之间
- [ ] 每页文字不超过 6 行
- [ ] Method 部分有架构图（不是纯文字）
- [ ] 至少有一页消融实验分析
- [ ] 有"My Take / Discussion"页表达个人观点
- [ ] 时间分配：Background ≤ 20%，Method 40-50%，Results+Discussion ≥ 30%
- [ ] 试讲一遍，总时长 12-15 分钟（不含 Q&A）
- [ ] 准备了 2-3 个预设问答

---

## 22.3 Task 2 基础：VLM + 抓取仿真复现

Task 2 基础部分的目标：在仿真环境中跑通一个 VLM（视觉-语言模型）引导的机器人抓取 demo。你将亲手看到——一个模型接收图像和自然语言指令（如"pick up the red cube"），然后控制机械臂完成抓取。

类比来说：如果 Task 1 是考驾照的笔试，Task 2 基础就是"坐上驾驶座，在封闭场地里转一圈"。不需要完美，但要能启动、能转弯、能停下来。

### 22.3.1 环境搭建

#### 硬件需求

| 配置 | CPU | GPU | RAM | 硬盘 | 备注 |
|------|-----|-----|-----|------|------|
| **最低** | 4 核 | GTX 1060 (6GB) | 16GB | 20GB 空闲 | 能跑但慢 |
| **推荐** | 8 核 | RTX 3060 (12GB) | 32GB | 50GB 空闲 | 流畅运行 |
| **理想** | 12+ 核 | RTX 3090/4090 (24GB) | 64GB | 100GB 空闲 | 可直接进阶到微调 |

> **GPU 内存指南**：仿真渲染本身只需 2-4GB GPU 内存。但如果你要在本地跑 VLM 推理（如 7B 参数的模型），需要额外 8-14GB。如果只是调 API（如 GPT-4V），则对本地 GPU 无要求。

**macOS Apple Silicon 用户注意**：MuJoCo 3.x 原生支持 Apple Silicon，但部分依赖库（如某些 CUDA-only 的 VLM）无法在 Mac 上运行。建议：仿真部分可以在 Mac 上开发，VLM 推理部分用远程 GPU 服务器或 API。

#### Python 环境搭建

```bash
# 1. 创建独立环境（避免污染系统 Python）
conda create -n embodied python=3.10 -y
conda activate embodied

# 2. 安装 MuJoCo（仿真引擎）
pip install mujoco==3.1.1

# 3. 验证 MuJoCo 安装
python -c "import mujoco; print(f'MuJoCo version: {mujoco.__version__}')"
# 预期输出: MuJoCo version: 3.1.1

# 4. 安装 robosuite（机器人操作任务套件）
pip install robosuite==1.4.1

# 5. 验证 robosuite
python -c "import robosuite; print(f'robosuite version: {robosuite.__version__}')"

# 6. 安装渲染相关
pip install glfw pyopengl

# 7. 安装 VLM 相关依赖
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install transformers accelerate pillow

# 8. 综合验证：跑一个最小仿真
python -c "
import robosuite as suite
env = suite.make('Lift', robots='Panda', has_renderer=False, has_offscreen_renderer=True)
obs = env.reset()
print(f'观测空间维度: {obs[\"robot0_eef_pos\"].shape}')
print('环境创建成功！')
env.close()
"
```

#### 克隆项目仓库

```bash
# 克隆 VLM 抓取交互项目
git clone https://github.com/hangtingLiu/VLM_Grasp_Interactive.git
cd VLM_Grasp_Interactive

# 安装项目依赖
pip install -r requirements.txt

# 查看项目结构
find . -maxdepth 2 -type f -name "*.py" | head -20
```

#### 常见环境问题速查

| 问题 | 症状 | 解决方案 |
|------|------|----------|
| MuJoCo 2.x vs 3.x 混用 | `ImportError: mujoco_py` | MuJoCo 3.x 不需要 mujoco_py，直接 `import mujoco` |
| CUDA 版本不匹配 | `CUDA driver version is insufficient` | 检查 `nvidia-smi` 版本，降级 PyTorch 或升级驱动 |
| macOS 渲染失败 | `GLFW error` / 黑屏 | 加 `export MUJOCO_GL=egl` 或用 `has_renderer=False` |
| XML 模型路径错误 | `FileNotFoundError: *.xml` | 检查 robosuite 的 models 路径，通常在 conda 环境下的 site-packages |
| 内存溢出 | `CUDA out of memory` | 减小 batch size，或用 `torch.cuda.empty_cache()` |

> **踩坑提醒**（引用 [Ch17](ch17-sim-to-real.md)）：MuJoCo 3.x 和旧版 mujoco_py 是完全不同的接口。如果项目 README 里写着 `pip install mujoco-py`，那它是为 MuJoCo 2.x 写的。你需要检查是否有人提交了 MuJoCo 3.x 的兼容补丁（通常在 issues 或 PR 里）。

### 22.3.2 项目结构理解

跑通 demo 后，别急着改代码。先花 30 分钟理解项目的三层架构。类比来说：你要先看懂"汽车发动机在哪、方向盘连着什么"才能安全上路。

#### 三层架构映射

```
┌─────────────────────────────────────────────────┐
│  Layer 3: VLM 感知层                             │
│  输入: 图像 + 文字指令                            │
│  输出: 抓取目标理解 / 动作高层描述                  │
│  对应: Ch09 BLIP-2/LLaVA 的推理能力               │
├─────────────────────────────────────────────────┤
│  Layer 2: 抓取规划层                             │
│  输入: VLM 的目标理解                             │
│  输出: 具体的抓取姿态(position + orientation)      │
│  对应: Ch10 规划 + Ch13 动作生成                   │
├─────────────────────────────────────────────────┤
│  Layer 1: MuJoCo 仿真层                         │
│  输入: 抓取姿态 → 关节角/末端位移                  │
│  输出: 物理仿真结果(成功/失败/碰撞)               │
│  对应: Ch17 仿真环境                              │
└─────────────────────────────────────────────────┘
```

#### 组件-知识-章节 对照表

| 项目组件 | 做了什么 | 对应知识 | 参考章节 |
|----------|----------|----------|----------|
| VLM 推理模块 | 看图+理解指令→输出目标属性 | 视觉-语言对齐 | [Ch09](ch09-blip2-llava.md) |
| 提示词构造 | 把任务格式化为 VLM 能理解的 prompt | 指令设计 | [Ch10](ch10-planning.md) |
| 抓取候选生成 | 从场景中生成可能的抓取位姿 | 抓取规划 | [Ch14](ch14-imitation-learning.md) |
| 目标-抓取匹配 | 用 VLM 输出筛选最佳抓取点 | 策略选择 | [Ch12](ch12-openvla-vlas-mla.md) |
| 运动规划 | 从当前位置到抓取点的轨迹 | 动作执行 | [Ch17](ch17-sim-to-real.md) |
| MuJoCo 物理引擎 | 仿真碰撞、重力、摩擦 | 仿真基础 | [Ch17](ch17-sim-to-real.md) |

#### 推荐探索顺序

**第一步：先跑 demo，不改任何代码。** 目标是看到"它能动"。哪怕输出不完美，先建立直觉。

**第二步：读 main 入口文件。** 找到 `main.py` 或 `run.py`，理解调用流程：初始化环境 → 获取观测 → VLM 推理 → 执行动作 → 循环。

**第三步：改参数观察变化。** 改一个东西看效果：换指令文本、换场景物体、调抓取阈值。建立"改什么影响什么"的因果认知。

**第四步：换指令做新任务。** 尝试用新的自然语言指令让机器人抓取不同物体。观察 VLM 是否能泛化到新指令。

### 22.3.3 运行与调试

#### 第一次运行 Checklist

```bash
# Step 1: 确认环境激活
conda activate embodied
python --version  # 应该是 3.10.x

# Step 2: 确认 GPU 可用
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
python -c "import torch; print(f'GPU: {torch.cuda.get_device_name(0)}')"

# Step 3: 确认仿真能渲染
python -c "
import mujoco
import mujoco.viewer
print('MuJoCo viewer 可用')
"

# Step 4: 运行主程序
cd VLM_Grasp_Interactive
python main.py --task pick_red_cube --render
```

如果 Step 4 成功，你应该看到：
1. 一个渲染窗口弹出，显示桌面上有物体的场景
2. 终端输出 VLM 的推理结果（如 "Target: red cube, position: [0.3, 0.1, 0.05]"）
3. 机械臂移动到目标位置并尝试抓取
4. 抓取成功/失败的结果反馈

#### 常见报错速查表

| 报错关键词 | 原因 | 快速修复 |
|------------|------|----------|
| `ModuleNotFoundError: mujoco_py` | 项目用旧版 API | 将 `import mujoco_py` 改为 `import mujoco`，并适配新 API |
| `CUDA out of memory` | VLM 模型太大 | 加 `torch_dtype=torch.float16`，或用更小模型，或用 API |
| `FileNotFoundError: ...xml` | 模型文件路径错误 | 找到正确的 xml 路径：`find . -name "*.xml"` |
| `GLFW: Failed to create window` | 无显示器/SSH 环境 | 加环境变量：`export MUJOCO_GL=egl` 并安装 `libegl1-mesa` |
| `TypeError: ...expected float32` | 数据类型不匹配 | 在传入前加 `.astype(np.float32)` 或 `.float()` |

#### 调试策略

当程序报错时，按这个顺序排查：

```python
# 1. 隔离问题：单独测试每一层
# 测试仿真层
import robosuite as suite
env = suite.make('Lift', robots='Panda', has_renderer=True)
env.reset()
for i in range(100):
    action = env.action_space.sample()  # 随机动作
    obs, reward, done, info = env.step(action)
env.close()

# 2. 测试 VLM 层
from transformers import AutoProcessor, AutoModelForVision2Seq
model = AutoModelForVision2Seq.from_pretrained("llava-hf/llava-1.5-7b-hf")
print("VLM 加载成功")

# 3. 测试连接：VLM 输出 → 动作转换
# 确认 VLM 输出格式和动作空间格式的对应关系
```

#### 验证成功标准

你的 Task 2 基础部分"完成"的标准：

1. **渲染窗口正常**：能看到桌面场景、物体、机械臂
2. **指令被理解**：VLM 能正确识别目标物体（终端 log 验证）
3. **动作被执行**：机械臂移动到目标附近（即使没抓到）
4. **抓取成功**：至少在简单场景（单个物体、无遮挡）下成功率 > 50%

如果你达到了标准 3 但没达到 4——恭喜，你已经跑通了 pipeline。抓取成功率低是正常的，这正是 Task 2 进阶要优化的方向。

> **踩坑提醒**：不要在环境搭建上花超过 2 天。如果某个依赖问题卡住了，优先考虑绕过方案（换版本、用 Docker、用云 GPU）。环境问题不是学习目标——让模型跑起来才是。

---

## 22.4 Task 2 进阶：VLA 微调 + 仿真部署

Task 2 进阶的目标：收集自己的演示数据 → 微调一个小型 VLA 模型 → 在仿真中评估性能。这是从"用别人的模型"到"训练自己的模型"的跨越。

类比来说：Task 2 基础是"用别人组装好的车在场地里开"，Task 2 进阶是"自己调校发动机参数，让车跑得更快更稳"。

### 22.4.1 数据采集

#### 为什么需要自己的数据

你可能会问：既然 Open X-Embodiment 有海量数据（[Ch21](ch21-datasets.md)），为什么还要自己采集？

原因有三：
1. **任务特异性**：公开数据集里可能没有你的具体任务（比如"把红色方块放到蓝色碗里"这种组合指令）
2. **环境匹配**：你的仿真环境（物体外观、相机角度、机器人型号）和公开数据不一致，直接用效果差
3. **学习闭环**：从采集到训练到评估的完整流程，是理解模仿学习（[Ch14](ch14-imitation-learning.md)）的最佳实践

> **核心洞察**（来自 RoboMimic 论文）：50 条高质量演示 > 500 条低质量演示。采集时的关键不是数量，而是**动作的一致性和成功率**。

#### 采集方式

| 方式 | 操作 | 适用场景 | 数据质量 |
|------|------|----------|----------|
| **键盘控制** | 方向键控制末端位移 | 快速原型验证 | 低（动作不流畅） |
| **SpaceMouse** | 6DoF 设备控制 | 中等规模采集 | 中高（流畅自然） |
| **VR 手柄** | 双手柄遥操作 | 复杂双臂任务 | 高（直觉映射） |
| **脚本生成** | 程序化生成轨迹 | 简单规则任务 | 取决于脚本质量 |

对于仿真环境中的首次尝试，推荐使用**键盘控制**或**脚本生成**起步——它们不需要额外硬件。等流程跑通后再投资 SpaceMouse（约 300-500 元）提升数据质量。

#### 采集代码示例

```python
"""
简易键盘遥操作采集脚本
按方向键控制机械臂末端移动，按 'g' 抓取，按 's' 保存当前 episode
"""
import robosuite as suite
import numpy as np
import json
import os
from datetime import datetime

# 初始化环境
env = suite.make(
    "Lift",
    robots="Panda",
    has_renderer=True,
    has_offscreen_renderer=True,
    camera_names="agentview",
    camera_heights=256,
    camera_widths=256,
)

# 数据存储
episodes = []
current_episode = []

obs = env.reset()
print("操作说明: WASD=XY平面移动, QE=升降, G=抓取, S=保存episode, R=重置")

# 主循环（简化版，实际需配合键盘监听库如 pynput）
for step in range(10000):
    # 获取键盘输入 → 转换为动作
    action = get_keyboard_action()  # 需实现：返回 7维向量 [dx,dy,dz,drx,dry,drz,gripper]
    
    # 执行并记录
    obs, reward, done, info = env.step(action)
    current_episode.append({
        "observation": {
            "image": obs["agentview_image"].tolist(),
            "eef_pos": obs["robot0_eef_pos"].tolist(),
            "gripper": obs["robot0_gripper_qpos"].tolist(),
        },
        "action": action.tolist(),
        "reward": reward,
    })
    
    if done or save_pressed:
        episodes.append(current_episode)
        current_episode = []
        obs = env.reset()
        print(f"已保存 {len(episodes)} 条 episode")
```

#### 数据量指南

| 数据量 | 适用模型 | 预期效果 | 采集时间 |
|--------|----------|----------|----------|
| 10-30 条 | SmolVLA (微调) | 基本能动，成功率 30-50% | 1-2 小时 |
| 50-100 条 | SmolVLA / Octo | 合理性能，成功率 50-70% | 3-5 小时 |
| 100-200 条 | OpenVLA (LoRA) | 较好泛化，成功率 60-80% | 1-2 天 |
| 500+ 条 | 任意 VLA (全参数) | 高性能，成功率 80%+ | 3-5 天 |

#### 质量控制

采集完数据不要直接训练——先做质量控制：

```bash
# 1. Replay 验证：回放每条轨迹确认动作正确
python replay_episode.py --episode_dir ./data/episodes/ --episode_id 0

# 2. 统计分析：检查动作分布是否合理
python analyze_data.py --data_dir ./data/
# 检查: 动作范围、episode 长度分布、成功率

# 3. 过滤失败的 episode
python filter_episodes.py --data_dir ./data/ --min_reward 1.0
```

> **踩坑提醒**：采集时容易犯的错误是"为了凑数量，把失败的 episode 也留下"。模仿学习是"学人做"——如果数据里有很多失败案例，模型也会学到失败的模式。**只保留成功的 episode。**

### 22.4.2 SmolVLA 微调

#### 架构回顾

SmolVLA 是一个轻量级 VLA（Vision-Language-Action）模型，特别适合首次微调实验：

```
SmolVLA 架构（简化）:
┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│ SmolVLM      │───▶│ Action Head  │───▶│ Action Chunks    │
│ (500M params)│    │ (Diffusion)  │    │ (Tp=16, Ta=8)    │
│ 视觉+语言理解 │    │ 动作生成      │    │ 16帧观测→8步动作  │
└──────────────┘    └──────────────┘    └──────────────────┘
```

**关键参数解释**：
- **SmolVLM (500M)**：视觉-语言骨干网络，理解图像和指令（比 7B 的 LLaVA 小得多，适合微调）
- **Diffusion Action Head**：用扩散模型生成动作（回忆 [Ch13](ch13-diffusion-policy.md)），比直接回归更擅长多模态动作分布
- **Tp=16**：观测窗口 = 过去 16 帧图像作为上下文
- **Ta=8**：动作 chunk = 一次预测未来 8 步动作（减少推理频率）

#### LeRobot 框架实操

LeRobot（by HuggingFace）是目前最友好的 VLA 训练框架。以下是完整的微调流程：

```bash
# 1. 安装 LeRobot
git clone https://github.com/huggingface/lerobot.git
cd lerobot
pip install -e ".[smolvla]"

# 2. 验证安装
python -c "import lerobot; print(lerobot.__version__)"
```

```bash
# 3. 数据格式转换（将你的数据转为 LeRobot 格式）
python lerobot/scripts/push_dataset_to_hub.py \
    --raw-dir ./my_data/episodes/ \
    --raw-format robosuite \
    --repo-id your-username/my-lift-task \
    --local-dir ./data/lerobot_format/
```

```bash
# 4. 启动训练
python lerobot/scripts/train.py \
    policy=smolvla \
    dataset_repo_id=your-username/my-lift-task \
    training.num_epochs=100 \
    training.batch_size=32 \
    training.lr=1e-4 \
    policy.chunk_size=8 \
    policy.n_obs_steps=16 \
    policy.diffusion_steps=10 \
    wandb.enable=true \
    wandb.project=my-smolvla-finetune
```

#### 超参数指南

| 超参数 | 推荐值 | 范围 | 说明 |
|--------|--------|------|------|
| `lr` (学习率) | 1e-4 | 5e-5 ~ 3e-4 | 太大发散，太小不收敛 |
| `batch_size` | 32 | 8-64 | 受 GPU 内存限制，12GB 约跑 batch=16 |
| `Tp` (观测步数) | 16 | 4-32 | 更长 = 更多上下文，但更慢 |
| `Ta` (动作步数) | 8 | 4-16 | 更长 = 推理更少，但精度可能降 |
| `diffusion_steps` | 10 | 5-20 | 推理时的去噪步数，更多更准但更慢 |
| `epochs` | 50-200 | 取决于数据量 | 30条数据约200epoch，100条约50-100epoch |

#### 训练监控

训练过程中需要关注的三个信号：

```python
# 在训练日志或 wandb 中关注:

# 1. Loss 曲线 —— 应该稳定下降
#    如果震荡剧烈 → lr 太大
#    如果完全不降 → lr 太小或数据有问题

# 2. 梯度范数 —— 应该在 0.1-10 之间
#    如果 > 100 → 梯度爆炸，加 gradient clipping
#    如果 ≈ 0   → 梯度消失，检查冻结设置

# 3. 定期 rollout 成功率 —— 每 10 epoch 跑一次评估
#    epoch 10: 成功率 10% (正常，模型刚开始学)
#    epoch 50: 成功率 40% (有进步)
#    epoch 100: 成功率 60%+ (可以停了)
#    如果 epoch 50 后成功率不再涨 → 可能需要更多/更好数据
```

> **踩坑提醒**：第一次训练最常见的失败是"loss 降了但 rollout 成功率为 0"。这通常意味着动作归一化有 bug——模型学到了正确的相对关系，但绝对数值全偏了。检查你的 action normalization 代码。

### 22.4.3 替代方案对比

SmolVLA 不是唯一选择。以下是三个主流方案的对比：

| 维度 | SmolVLA | OpenVLA | Octo |
|------|---------|---------|------|
| **参数量** | ~500M | ~7B | ~93M |
| **视觉骨干** | SmolVLM | Prismatic VLM | ViT (预训练) |
| **动作表示** | Diffusion chunks | 离散 token | Diffusion chunks |
| **微调方式** | 全参数 / LoRA | LoRA (否则太大) | 全参数 |
| **最低 GPU** | 12GB (全参数) | 24GB (LoRA) / 48GB (全参数) | 8GB |
| **数据量需求** | 30-100 条起步 | 100-500 条起步 | 50-200 条起步 |
| **优势** | 轻量快速，适合迭代 | 语言理解最强，泛化好 | 最小最快，多 embodiment |
| **劣势** | 语言能力弱于 OpenVLA | 资源需求大 | 语言能力有限 |

#### 建议路径

**起步阶段**（前 2 周）：用 SmolVLA。快速迭代、快速试错、快速看到结果。即使结果不完美，你已经跑通了"数据→训练→评估"全流程。

**进阶阶段**（第 3-4 周）：如果计算资源允许，尝试 Octo。它的架构设计精巧（[Ch13](ch13-diffusion-policy.md) 的 Diffusion Policy 思想），且 93M 参数让你可以全参数微调而不是只做 LoRA。

**拔高阶段**（如果有 24GB+ GPU）：尝试 OpenVLA 的 LoRA 微调。它的语言理解能力最强，适合需要复杂指令理解的任务（如"先拿起红色方块，放到碗里，再把碗推到桌子右边"）。

### 22.4.4 部署到仿真

训练完模型后，需要写一个推理循环（inference loop）将模型接入仿真环境：

#### 推理循环代码

```python
"""
VLA 模型仿真部署 — 推理循环
"""
import torch
import numpy as np
from lerobot.common.policies.smolvla.modeling_smolvla import SmolVLAPolicy

# 加载训练好的模型
policy = SmolVLAPolicy.from_pretrained("./outputs/smolvla-my-lift-task/")
policy.eval()
policy.cuda()

# 初始化仿真环境
import robosuite as suite
env = suite.make(
    "Lift",
    robots="Panda",
    has_renderer=True,
    has_offscreen_renderer=True,
    camera_names="agentview",
    camera_heights=256,
    camera_widths=256,
)

# 推理主循环
def evaluate(env, policy, instruction="pick up the red cube", n_episodes=50):
    successes = []
    
    for ep in range(n_episodes):
        obs = env.reset()
        obs_history = []  # 存储过去 Tp 帧
        done = False
        step = 0
        
        while not done and step < 300:  # 最多 300 步
            # 1. 预处理观测
            image = obs["agentview_image"]  # (256, 256, 3)
            image_tensor = preprocess_image(image)  # → (1, 3, 256, 256) normalized
            obs_history.append(image_tensor)
            
            # 保持窗口长度 = Tp
            if len(obs_history) > 16:
                obs_history.pop(0)
            
            # 2. 模型推理（每 Ta 步推理一次）
            if step % 8 == 0:  # Ta = 8
                with torch.no_grad():
                    action_chunk = policy.predict(
                        images=torch.stack(obs_history[-16:]),  # (Tp, 3, H, W)
                        instruction=instruction,
                    )  # → (Ta, action_dim) = (8, 7)
                chunk_idx = 0
            
            # 3. 执行当前 chunk 中的动作
            action = action_chunk[chunk_idx].cpu().numpy()
            action = denormalize_action(action)  # 还原到环境动作空间
            chunk_idx += 1
            
            # 4. 环境步进
            obs, reward, done, info = env.step(action)
            step += 1
        
        successes.append(reward > 0)
        print(f"Episode {ep+1}/{n_episodes}: {'成功' if reward > 0 else '失败'}")
    
    success_rate = np.mean(successes)
    std = np.std(successes)
    print(f"\n最终结果: 成功率 = {success_rate:.1%} ± {std:.1%} (N={n_episodes})")
    return success_rate, std

# 运行评测
evaluate(env, policy, instruction="pick up the red cube", n_episodes=50)
```

#### 评测协议

正式评测时需要遵循的规范：

- **Episode 数量**：N = 50-100。太少（<20）统计意义弱，太多（>200）时间不值。50 是平衡点。
- **报告格式**：成功率 ± 标准差。例如 "68.0% ± 4.7% (N=50)"。
- **随机种子**：固定 3 个不同种子各跑 50 episodes，报告均值和标准差。
- **对照实验**：至少和一个 baseline 对比（如随机动作、脚本策略、或不微调的预训练模型）。

#### 常见部署问题

| 问题 | 症状 | 解决方案 |
|------|------|----------|
| **推理延迟过高** | 动作执行明显"卡顿" | 减少 diffusion_steps（10→5），或用 DDIM 加速采样 |
| **动作归一化错误** | 机械臂乱飞/不动 | 检查训练时的 norm stats 是否和推理时一致 |
| **观测预处理不一致** | 模型输出无意义 | 确保推理时的 image resize、normalize 和训练时完全相同 |
| **chunk 边界抖动** | 每 Ta 步有跳变 | 使用 temporal ensemble（对重叠 chunk 做加权平均） |
| **越界动作** | 报 joint limit 错误 | 在 `denormalize_action` 后加 `np.clip` |

> **踩坑提醒**：最隐蔽的 bug 是"训练和推理的预处理不一致"。例如训练时图像 normalize 用了 ImageNet 均值 [0.485, 0.456, 0.406]，但推理时忘了加——模型看到的分布完全不同，自然输出垃圾。建议：把预处理代码封装成一个函数，训练和推理共用同一份。

```python
# 好的做法：统一预处理函数
def preprocess_image(image_np):
    """训练和推理共用此函数，保证一致性"""
    image = torch.from_numpy(image_np).float() / 255.0  # [0,1]
    image = image.permute(2, 0, 1)  # (H,W,C) → (C,H,W)
    image = transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )(image)
    return image.unsqueeze(0)  # (1, C, H, W)
```

---

## 22.5 评测与分析

训练完模型之后，最容易犯的一个错误是"跑了一次 rollout，成功了，就觉得学会了"。这和考试只做一道题就以为能得满分一样不靠谱。评测的核心目标是：**用统计量告诉你模型到底行不行，以及不行在哪里。**

本节介绍两个主流仿真评测平台（LIBERO 和 SimplerEnv）的实操方法，然后讲怎么设计消融实验和系统性地分析失败原因。

---

### 22.5.1 仿真评测协议

#### LIBERO 评测实操

LIBERO（详见 [Ch21 §21.6.2](ch21-datasets.md)）是目前 VLA 微调评测的事实标准。它提供四套 suite，每套考察不同类型的知识迁移能力：

| Suite | 考什么 | 任务数 | 难度参考 |
|-------|--------|--------|----------|
| LIBERO-Spatial | 相同物体、不同空间关系 | 10 | 入门——90% 成功率算及格 |
| LIBERO-Object | 相同场景、不同物体 | 10 | 中等——80% 算不错 |
| LIBERO-Goal | 相同初始状态、不同目标 | 10 | 中等偏难——70% 算好 |
| LIBERO-100 | 上面三种混合 + 全新任务 | 100 | 困难——50% 已经是 SOTA 水平 |

**跑评测的流程：**

1. 加载训练好的模型 checkpoint
2. 对每个任务 rollout N 次（每次随机初始化环境状态）
3. 判断每次 rollout 是否成功（LIBERO 有内置的 success 判定函数）
4. 成功率 = 成功次数 / N

**N 取多少？** 这取决于你的目的：

- 快速迭代阶段：N=50。跑一个 suite 大约 10-20 分钟，足够判断调参方向对不对。
- 正式报告/写论文：N=100。方差更小，结论更可靠。论文里通常报告 3 个种子的平均值 ± 标准差。

**一个直觉：** 如果你跑 50 次得到 80% 成功率，真实性能大约在 72%-88% 之间（95% 置信区间）。跑 100 次能收紧到 75%-85%。这就是为什么正式评测需要更多 rollout。

```python
# 伪代码：LIBERO 评测循环
import numpy as np

success_counts = []
for task_id in range(num_tasks):
    env = make_libero_env(suite="spatial", task_id=task_id)
    successes = 0
    for episode in range(N):
        obs = env.reset()  # 随机初始化
        done = False
        while not done:
            action = model.predict(obs)
            obs, reward, done, info = env.step(action)
        if info["success"]:
            successes += 1
    success_counts.append(successes / N)

mean_sr = np.mean(success_counts)
std_sr = np.std(success_counts)
print(f"Success rate: {mean_sr:.1%} ± {std_sr:.1%}")
```

#### SimplerEnv 评测

SimplerEnv（详见 [Ch21 §21.6.1](ch21-datasets.md)）解决的是另一个问题：**你在仿真里跑出的分数，能多大程度代表真机表现？**

这个问题为什么重要？因为仿真评测的最终目的是预测真机性能。如果你的仿真分数和真机分数没有相关性，那你所有的仿真调参都是在"自嗨"——在仿真里调到最优并不意味着真机也最优。SimplerEnv 就是为了解决这个"仿真分数到底能不能信"的问题而设计的。

SimplerEnv 的核心设计哲学是"对齐 > 逼真"——它不追求物理模拟的极端精确，而是追求仿真排名和真机排名的一致性。如果模型 A 在仿真里比模型 B 好，那真机上也应该如此。用一个类比：你不需要天气预报精确到 0.1 度，你只需要它能正确预测"明天比今天热还是冷"。

**两种评测模式：**

- **Visual Matching（视觉匹配）**：用真实照片作为仿真场景的背景纹理，尽可能还原真机视角。适合你只有一套标准硬件的情况。优点是视觉域差距小，缺点是可能对特定背景过拟合。

- **Variant Aggregation（变体聚合）**：在多种视觉变体（不同桌面颜色、光照、干扰物）上跑评测，取平均。对单一变体的过拟合会被摊平。更接近真机的"不确定性"。论文推荐在正式报告中使用这个模式。

**安装和使用要点：**

SimplerEnv 基于 SAPIEN 引擎（不是 MuJoCo），安装时注意 Python 版本（推荐 3.10）和 GPU 驱动。它原生支持 RT-1、RT-1-X、Octo、OpenVLA 四种模型的评测接口。如果你用 SmolVLA，需要自己写一个 adapter 把模型输出转成 SimplerEnv 期望的 action 格式——主要是把 diffusion head 输出的 action chunk 按照环境的控制频率拆分成单步动作。

```bash
# SimplerEnv 安装（示意）
git clone https://github.com/simpler-env/SimplerEnv.git
cd SimplerEnv
pip install -e .
# 注意：SAPIEN 需要 Vulkan 支持，无头服务器需要额外配置
```

**对齐度验证：** SimplerEnv 论文报告了仿真 vs 真机的 Pearson 相关系数约 0.9。这意味着仿真分数可以作为真机性能的可靠代理指标——但不是完美替代。如果你的仿真成功率是 70%，真机可能在 55%-85% 之间，取决于具体任务和 sim-to-real gap 的大小。

**物理参数回调（back-tuning）：** SimplerEnv 会根据真机实验结果反向调整仿真中的物理参数（如摩擦系数、物体质量），使仿真行为更贴近真机。这是一个持续的校准过程——随着你积累更多真机数据，你可以进一步提高对齐度。

**什么时候用 LIBERO vs SimplerEnv？**
- 你在做 VLA 微调研究、比较不同训练策略 → 用 LIBERO（任务丰富、社区基准多）
- 你关心真机部署、想预测真机性能 → 用 SimplerEnv（对齐度高）
- 理想情况下两个都用——LIBERO 做开发迭代，SimplerEnv 做最终验证

#### 评测结果怎么读

拿到一组成功率数字之后，怎么判断"好不好"？需要结合任务难度来看：

**绝对基准线：**
- LIBERO-Spatial 90% → 及格水平，你的模型基本学会了空间关系
- LIBERO-Object 80% → 不错，能区分不同物体
- LIBERO-Goal 70% → 很好，能理解不同目标指令
- LIBERO-100 50% → 非常好，已经接近 SOTA

**方差大说明什么？**
- 如果同一个任务的 50 次 rollout 里成功率忽高忽低（比如有的任务 90% 有的只有 20%），这通常意味着：
  - 策略对初始条件敏感（物体放的位置稍微偏一点就失败）
  - 存在"临界行为"——模型在某些状态附近犹豫不决
  
- 如果 3 个种子之间差异大（比如一个种子 75%，另一个 55%），这说明：
  - 训练不稳定，模型对随机初始化敏感
  - 可能需要更多数据或更长训练

---

### 22.5.2 消融实验设计

消融实验（Ablation Study）的本质是"控制变量法"——一次只改一个东西，看对结果的影响。作为初学者，你不需要做特别复杂的消融，三个最有价值的实验如下：

**消融 1：数据量 Scaling**

固定其他所有超参数，只改训练数据量：

- 10 条演示 → 25 条 → 50 条 → 100 条 → 200 条

然后画一条 scaling curve。这条曲线会告诉你：更多数据还有没有帮助？在哪个点收益递减？

对于 VLA 微调（OpenVLA/SmolVLA），通常的规律是：10 条太少（随机水平）、50 条开始有效（30-50% 成功率）、100 条接近饱和（对简单任务够了）。

**消融 2：Action Chunk 长度**

Diffusion Policy 和 SmolVLA 的关键超参数是预测步长 Tp（prediction horizon）。尝试：

- Tp = 4（短视，反应快但缺乏规划）
- Tp = 8（默认值，平衡点）
- Tp = 16（长视，规划好但如果预测错则错很久）
- Tp = 32（过长，通常性能下降）

最优值取决于任务的时间结构。抓取类任务 Tp=8 通常够了，长序列操作（比如"打开抽屉 → 取出物体 → 放到桌上"）可能需要 Tp=16。

**消融 3：微调策略**

对比三种微调方式的性价比：

- 全参数微调：效果最好，但 GPU 占用大，容易过拟合小数据
- LoRA（rank=32）：效果接近全参数，GPU 占用减半，推荐首选
- 只训动作头（冻结 VLM backbone）：最快最省，但效果有上限

**画图规范：**

```
X 轴 = 你控制的变量（数据量 / chunk 长度 / 微调策略）
Y 轴 = 成功率（0-100%）
误差棒 = 3 个随机种子的标准差
每个实验点 = 跑 3 次训练 × 每次 50 rollout 评测
```

总共需要的计算量不小——这就是为什么建议先在 LIBERO-Spatial（最简单的 suite）上做消融，确认趋势之后再在更难的 suite 上验证。

**消融结果怎么报告？**

一个好的消融实验表格长这样：

| 数据量 | LIBERO-Spatial | LIBERO-Object | LIBERO-Goal |
|--------|---------------|---------------|-------------|
| 10 | 15.2 +/- 8.3 | 12.0 +/- 6.1 | 8.5 +/- 5.2 |
| 50 | 62.4 +/- 5.1 | 48.3 +/- 7.2 | 35.0 +/- 6.8 |
| 100 | 85.6 +/- 3.2 | 72.1 +/- 4.5 | 58.3 +/- 5.1 |
| 200 | 88.1 +/- 2.8 | 75.4 +/- 3.9 | 61.2 +/- 4.7 |

从这张表你能读出什么？100 条到 200 条的提升很小（3-5 个百分点），说明在这个量级上数据量已经不是瓶颈。而 LIBERO-Goal 始终比 Spatial 低 20+ 个百分点，说明目标理解是当前模型的主要弱项——这就指明了下一步改进方向。

---

### 22.5.3 分析框架

模型失败了，不要只是"再训一版试试"。先搞清楚到底哪个环节出了问题。这里提供一个三步诊断法：

**第一步：观测端——模型看到了什么？**

问题可能出在输入。检查方法：
- 把模型"看到"的图像存下来，肉眼确认是否正常（有没有全黑、色彩偏移、裁切错误）
- 如果用了 VLM，打印它生成的内部 caption 或 token，看是否正确识别了场景
- 渲染 attention map：模型注意力是否集中在任务相关的物体上，还是在看无关区域

**第二步：决策端——模型预测了什么？**

问题可能出在策略本身。检查方法：
- 可视化预测的 action chunk（画成 3D 末端轨迹）和专家演示的 action 叠加对比
- 看预测动作的分布：是否过于集中在某个方向（mode collapse）？还是太发散？
- 对比不同时间步的预测：模型是否在某个状态"卡住"了（连续输出相同动作）

**第三步：执行端——执行结果如何？**

问题可能出在物理执行。检查方法：
- 回放 rollout 视频，观察是否有碰撞、滑脱、超出工作空间
- 检查动作是否被 clipping 了（说明预测的动作超出了关节限制）
- 关节力矩曲线是否有尖峰（说明碰到了刚性约束）

**结合已学知识的分析角度：**

- **正迁移 vs 负迁移**（参考 [Ch21 §21.6.3](ch21-datasets.md)）：预训练帮了还是害了？如果微调后成功率反而低于从头训练，说明预训练数据和目标任务存在分布冲突——考虑减少预训练权重的影响（降低 LoRA rank、用更高学习率"覆盖"预训练知识）。

- **四类知识解耦**（参考 LIBERO 设计）：空间、物体、目标、长序列——你的模型在哪个维度上最弱？针对性地增加对应类型的训练数据。

- **数据质量 vs 数据数量**（参考 [Ch21 §21.4 RoboMimic](ch21-datasets.md) 结论）：如果 200 条数据的效果和 100 条差不多，问题大概率不在"量"而在"质"。回去检查你的演示数据——是否存在大量犹豫、回退、错误操作。

**分析报告模板：**

当你做完一轮评测和分析之后，建议按以下格式整理成文档：

```markdown
## 实验分析：[日期] [实验名称]

### 配置
- 模型：SmolVLA / OpenVLA (LoRA r=32)
- 数据：100 条演示，来源 [xxx]
- 训练：200 epochs, lr=1e-4, batch_size=32

### 结果
| Suite | 成功率 | 和上次对比 |
|-------|--------|-----------|
| Spatial | 82.3% (+5.1%) | 上升 |
| Object | 65.0% (-2.3%) | 下降 |

### 失败模式分析
- 主要失败类型：[观测端/决策端/执行端]
- 具体表现：[描述]
- 疑似原因：[分析]

### 下一步计划
- [ ] 尝试 [具体改动]
- [ ] 验证 [具体假设]
```

这种格式化的记录能帮助你追踪实验进展，也方便和导师或同事讨论时有据可依。

---

## 22.6 调试手册：常见 Pitfalls

这一节是纯实用的"坑位指南"。你在实操中大概率会遇到这些问题——不是因为你做错了什么，而是因为这个领域的工具链还在快速演进，兼容性问题比比皆是。

提前知道这些坑在哪里，能帮你把"搜索问题→尝试修复→确认解决"的循环从 3 小时压缩到 30 分钟。下面按照"环境→数据→训练→部署"的顺序排列，每个问题给出症状、根因和解决方案。

---

### 22.6.1 环境问题

| 问题 | 症状 | 根因 | 解决 |
|------|------|------|------|
| MuJoCo 版本混乱 | `import mujoco_py` 报错 `ModuleNotFoundError` | 新版 MuJoCo（>=2.3）已不需要 mujoco-py | 卸载 `mujoco-py`，直接 `pip install mujoco>=3.0`，代码里用 `import mujoco` |
| CUDA 版本不匹配 | `RuntimeError: CUDA error: no kernel image is available` | PyTorch 编译时的 CUDA 版本和你显卡驱动不一致 | 运行 `nvidia-smi` 看驱动支持的最高 CUDA 版本，去 pytorch.org 选对应版本安装 |
| 无头服务器渲染失败 | `GLFW error: No display` 或 `GLFWError` | 服务器没有显示器，MuJoCo 默认用 GLFW 需要 display | 在脚本开头加 `export MUJOCO_GL=egl`（推荐）或 `export MUJOCO_GL=osmesa` |
| Apple Silicon 训练问题 | MuJoCo 能跑仿真但 PyTorch GPU 训练极慢或不工作 | MPS 后端对很多操作不完整，不适合大规模训练 | 本地只做推理和调试（MuJoCo 在 ARM 上很快），训练用 Linux 远程服务器 |
| conda 环境污染 | 各种 `ImportError`、版本冲突 | 装了太多包，依赖关系打架 | 用干净的 `conda create -n embodied python=3.10` 重新来，按顺序装：PyTorch → mujoco → robosuite → lerobot |
| robosuite 版本不兼容 | LIBERO 跑不起来 | LIBERO 依赖 robosuite 特定版本 | 查看 LIBERO 的 `requirements.txt`，用它指定的 robosuite 版本 |

**一个实用建议：** 在环境搭建阶段，把每一步的安装命令和输出记录到一个 `setup-log.md` 里。下次换机器或者环境崩了，你能在 10 分钟内重建一切。

**推荐的安装顺序（避免依赖冲突）：**

```bash
# 1. 创建干净环境
conda create -n embodied python=3.10 -y
conda activate embodied

# 2. 先装 PyTorch（根据你的 CUDA 版本选择）
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# 3. 装 MuJoCo
pip install mujoco

# 4. 装 robosuite（LIBERO 依赖）
pip install robosuite

# 5. 装训练框架
pip install lerobot  # 或者 clone LeRobot 仓库

# 6. 装辅助工具
pip install wandb imageio[ffmpeg] h5py matplotlib

# 7. 验证
python -c "import mujoco; import robosuite; print('OK')"
```

按这个顺序装，依赖冲突的概率最低。如果哪一步报错，先解决这一步再往下走——不要跳过。

---

### 22.6.2 数据问题

| 问题 | 症状 | 根因 | 解决 |
|------|------|------|------|
| 动作空间不匹配 | 训练 loss 正常收敛但 rollout 全失败 | 训练数据中 action 的归一化范围和部署时不一致（比如训练用 [-1,1] 但环境期望真实关节角度） | 检查 action normalization 的 mean/std 或 min/max，确保训练和推理用相同的缩放 |
| 图像预处理不一致 | 模型在评测中表现接近随机 | 训练时 resize 到 224x224 + ImageNet normalize，推理时忘了 normalize | 把预处理逻辑封装成函数，训练和推理共用同一份代码 |
| 数据格式错误 | `KeyError: 'observation/image'` 或 `shape mismatch` | HDF5/RLDS 文件的 key 命名和代码期望的不一致 | 用 `h5py` 或 `tfds` 打开数据集文件，打印所有 key 和 shape，逐一对齐 |
| 演示质量差 | 能训练但效果很差，成功率一直上不去 | 原始演示中包含大量犹豫、回退、甚至失败的轨迹 | replay 每条轨迹（渲染成视频），手动标记并过滤掉质量差的 |
| 坐标系混乱 | 动作方向反了（想向前伸手却往后缩） | 世界坐标系、机器人基坐标系、末端执行器坐标系没对齐 | 画出坐标轴方向，检查 action 的每个维度对应哪个方向，必要时加负号或交换轴 |
| 时间步对齐问题 | 动作滞后一拍或者快一拍 | 图像采集和动作记录的时间戳没对齐 | 检查数据采集脚本的 observation-action 配对逻辑，确保 obs[t] 对应 action[t] |

**数据问题的通用调试策略：** 先跑一个最简单的 baseline（比如只有 10 条数据的 BC），确认整个 pipeline 是通的。如果 10 条数据训出来的模型至少"知道往物体方向移动"（哪怕不能完成任务），说明数据格式没问题。如果完全随机，那问题一定在数据处理环节。

---

### 22.6.3 训练问题

| 问题 | 症状 | 根因 | 解决 |
|------|------|------|------|
| loss 不降 | 训了 100 epoch loss 还在初始值附近 | 学习率太低、数据加载有 bug（每次读的是同一条数据）、或梯度被冻结了 | 先检查 DataLoader（打印前 10 个 batch 确认不重复），再试提高 lr 一个数量级 |
| loss 降了但 rollout 差 | 训练 loss 很低但评测成功率极低 | 过拟合：模型记住了训练轨迹但没学到泛化策略 | 加数据、加 dropout/weight decay、提前停止、或用 action chunking 增加时序约束 |
| 梯度爆炸 | loss 突然变成 NaN | 学习率太高或者数据中有异常值 | 加 `torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)` |
| OOM（显存不足） | `CUDA out of memory` | batch size 太大或模型参数量超出显卡容量 | 依次尝试：降 batch_size → gradient accumulation → mixed precision (fp16/bf16) → 换更大显卡 |
| 训练太慢 | 1 epoch 跑超过 1 小时 | DataLoader 瓶颈（CPU 预处理跟不上 GPU）或磁盘 I/O 慢 | 增加 `num_workers`（设为 CPU 核心数的一半）、数据放 SSD、用 `prefetch_factor=2` |
| Diffusion loss 震荡 | loss 上下波动不收敛 | Diffusion 训练本身方差较大，加上小 batch 更严重 | 这是正常现象——看 moving average（窗口 100 步），只要趋势向下就没问题 |

**训练问题的黄金法则：** 先确保在一条数据上能过拟合（loss 降到接近 0）。如果连一条数据都过拟合不了，说明模型结构或优化器配置有问题，和数据量无关。

---

### 22.6.4 部署问题

| 问题 | 症状 | 根因 | 解决 |
|------|------|------|------|
| 推理太慢 | 控制频率 < 5Hz（机械臂动作迟滞、不连贯） | Diffusion 去噪步数太多（默认 100 步 DDPM）| 换 DDIM 采样（10 步即可），或用 consistency distillation 蒸馏到 1-4 步 |
| 控制频率不匹配 | 训练数据是 10Hz 但部署环境要求 20Hz | 频率不一致导致动作执行太快或太慢 | 用 action chunk 的执行步长 Ta 来调节：如果训练 10Hz 部署 20Hz，设 Ta=2（每两个控制步执行一个预测步） |
| 动作抖动 | 机械臂细微震颤，尤其在接近目标时 | 相邻 action chunk 之间不连续 | 用 Temporal Ensemble：同时保留最近 K 个 chunk 的预测，对重叠时间步做指数加权平均 |
| 关节越界 | 机械臂撞到自己或桌面，仿真里报碰撞错误 | 模型预测的动作超出安全范围 | 加 action clipping（限制每个关节的角度范围）+ 笛卡尔空间安全框约束 |
| 夹爪控制异常 | 夹爪一直开着或一直闭着 | 夹爪动作维度的阈值设置不对 | 检查 gripper action 的语义：通常 >0 是开、<0 是闭（或反过来），确认和训练数据一致 |

**部署调试的优先级：** 先保证安全（不撞东西），再保证频率（够快），最后优化平滑度。如果机械臂在评测时做出危险动作，立刻停下来检查 action clipping 设置。

---

### 22.6.5 调试心态与方法论

在具身 AI 这个领域做实验，bug 的密度比纯软件项目高很多。因为你同时在和物理引擎、深度学习框架、机器人控制库三个复杂系统打交道，每一个都有自己的"暗坑"。

**二分法定位问题：**

当整个 pipeline 跑出来的结果不对时，不要从头到尾检查一遍——先把 pipeline 切成两半，测试中间输出是否正常：

1. 先检查数据加载是否正确（打印一个 batch 的 shape 和数值范围）
2. 如果数据没问题，检查模型前向传播是否正确（用固定输入测试输出是否合理）
3. 如果前向传播没问题，检查评测环境是否正确（用录好的专家动作回放）

这个方法能帮你快速缩小问题范围，而不是盲目猜测。

**建立"已知正确"的参考点：**

在开始你自己的实验之前，先确保你能复现别人报告的结果。比如：用 LeRobot 官方的 SmolVLA checkpoint 在 LIBERO-Spatial 上评测，看能不能得到论文里报告的数字（允许 3-5 个百分点的偏差）。如果连复现都做不到，说明你的评测流程本身有问题——解决这个问题比开始训练更优先。

**记录每一次实验：**

哪怕只是"试试看"的实验，也记下：时间、改了什么、结果如何。三天后你会忘记"上次跑的那个实验到底改了哪个参数"。推荐用 wandb 自动记录训练配置，用一个简单的电子表格记录评测结果。

---

## 22.7 时间规划建议

前面的章节告诉了你"做什么"和"怎么做"，这一节告诉你"什么时候做什么"。一个好的时间规划能帮你避免最常见的失败模式：前两周觉得"时间还多"慢慢看论文，第三周发现环境还没搭好，最后一周通宵赶工出一个半成品。

### 总体原则

Task 1（论文精读 + 汇报）和 Task 2（动手实验）的前半段可以并行——上午读论文，下午搭环境。但后半段必须各自集中：PPT 需要整块时间打磨逻辑和视觉表达，训练和评测需要连续的计算时间和不被打断的调试环境。

关键认知：**环境搭建是最大的隐性时间黑洞。** 新手普遍低估这一步的耗时。预留 2-3 天专门搞环境，不要期望半天搞定。

---

### 推荐时间表（基于 4 周假设）

| 周 | Task 1（论文精读 + 汇报） | Task 2（动手实验） |
|---|---|---|
| Week 1 | 选题 + 第一遍速读 + 第二遍精读 | 环境搭建 + 跑通官方 demo |
| Week 2 | 第三遍批判性阅读 + 画架构图 + PPT 初稿 | 数据采集 50-100 条 + 训练第一版 |
| Week 3 | PPT 修改（自己过 3 遍）+ 练演讲 | SmolVLA/OpenVLA 微调 + 评测 |
| Week 4 | deck 定稿 + 口头演练 | 消融实验 + 写实验报告 |

如果你只有 2 周，砍掉消融实验和 PPT 修改轮次，但保留"跑通 demo"和"至少一次完整评测"这两个底线。

如果你有更多时间（6-8 周），可以在 Week 5-6 尝试更复杂的实验：比如跨任务迁移（在 LIBERO-Spatial 上训练，测 LIBERO-Object 的零样本性能）、比较不同预训练模型的迁移效率、或者尝试从 OXE 子集做预训练再微调到 LIBERO。

---

### 每日节奏建议

一天的最佳分配：

**上午（理论时段）：** 读论文或读导读章节。读的时候用纸笔画架构图、标注不懂的地方。不要试图一次读懂——标记"不懂"的地方，下午动手时自然会理解一部分。

**下午（动手时段）：** 跑代码、采数据、训练。这个时段需要整块时间（至少 2 小时不被打断），因为调试 bug 需要保持上下文。训练脚本跑起来之后，可以切回去看论文。

**晚上（整理时段）：** 把今天学到的东西记下来。哪怕只写三行——"今天搞定了什么"、"遇到了什么坑"、"明天打算做什么"。这些记录在一周后回顾时价值巨大。

**一个反直觉的建议：** 下午如果训练脚本正在跑（可能需要 1-2 小时），不要干等——切回上午没读完的论文，或者开始写 PPT。GPU 在工作的时候你的大脑也应该在工作。充分利用"等待时间"是提高效率的关键。

**关于精力管理：** 调试 bug 是最消耗精力的活动。如果你发现自己盯着同一个报错信息超过 30 分钟没有进展，站起来走走。很多时候答案会在你放松的时候突然出现——这不是玄学，是大脑的默认模式网络在后台处理问题。

---

### 里程碑检查点

每个里程碑都有明确的"验收标准"——如果你做到了标准里描述的事情，就可以放心往下走：

| 里程碑 | 验收标准 | 建议 Deadline |
|--------|---------|--------------|
| M1: 选题确定 | 能用 3 句话说清楚：这篇论文要解决什么问题、用了什么方法、效果如何 | Day 3 |
| M2: 精读完成 | 能画出完整的模型架构图（含数据流向），能列出 3 个创新点和 2 个局限 | Day 7 |
| M3: PPT 初稿 | 10+ 页 slides，能从头到尾讲一遍不卡壳（哪怕讲得不好） | Day 14 |
| M4: 环境跑通 | MuJoCo 窗口里能看到机械臂执行预录动作（不要求自己的策略） | Day 7 |
| M5: 数据就绪 | 100+ 条演示轨迹，replay 验证成功率 > 95%（确认数据没坏） | Day 14 |
| M6: 微调完成 | loss 收敛 + 至少一个任务 rollout 成功率 > 50% | Day 21 |
| M7: deck 定稿 | 14 页 slides 定稿，能从头到尾讲一遍不卡壳 | Day 28 |

**如果某个里程碑没按时完成怎么办？**

- M4 延期：环境问题。优先解决，因为它阻塞了 Task 2 后续所有步骤。参考 §22.6.1 的环境问题速查表。
- M5 延期：数据采集比预期慢。降低目标到 50 条先跑通一版，后续再补数据。
- M6 延期：训练没收敛。回到 §22.6.3 的训练问题检查清单，先确保能在小数据上过拟合。

---

### 风险预案

实际执行中，几乎不可能完全按照计划来。以下是三种最常见的意外以及应对策略：

**风险 1：环境搭建卡了 3 天以上**

这是新手最常遇到的问题。建议的应对：

- 不要独自死磕——去 GitHub Issues 搜索你的报错信息，大概率有人遇到过
- 如果本地环境实在搞不定，考虑用云端 GPU 实例（Colab Pro / Lambda / AutoDL），那里的环境往往更干净
- 最坏情况下切换到另一个更容易安装的框架（比如从 LIBERO 切到 LeRobot 的内置仿真）

**风险 2：训练资源不够（没有 GPU 或 GPU 太小）**

- SmolVLA（500M 参数）在 16GB 显存的 GPU 上用 mixed precision 可以跑
- OpenVLA（7B 参数）LoRA 微调需要至少 24GB 显存（A100 / RTX 4090）
- 如果只有笔记本电脑：专注于 Task 1，Task 2 用云端资源或者只做数据准备和评测分析

**风险 3：做到一半发现选的模型/任务不合适**

- 如果 Week 2 结束时成功率还是 0%，不要继续硬啃——先检查是否是 bug，不是的话考虑换一个更简单的任务或更小的模型
- "跑通一个简单任务"远比"在困难任务上失败"有价值——你能学到完整的方法论

---

## 22.8 资源汇总与交叉引用

这一节是整本导读的"索引页"。当你在实操中遇到"我记得哪里讲过这个但忘了在哪一章"的情况时，来这里查。

---

### 知识地图：从实操步骤到参考章节

| 你正在做的事 | 需要的核心知识 | 参考章节 | 一句话 takeaway |
|-------------|---------------|---------|----------------|
| 理解 VLM 是什么 | CLIP 对比学习 → BLIP-2 Q-Former → LLaVA 视觉指令微调 | [Ch08](ch08-clip.md), [Ch09](ch09-blip2-llava.md) | 图片和文字被映射到同一个向量空间，模型学会了"看图说话" |
| 理解 VLA 是什么 | RT-1 离散化动作 → RT-2 VLM 直接输出动作 → OpenVLA 开源 7B | [Ch11](ch11-rt1-rt2.md), [Ch12](ch12-openvla-vlas-mla.md) | VLM + 动作输出 = VLA，感知和决策端到端 |
| 理解扩散动作头 | DDPM 去噪原理 → Diffusion Policy 输出 action chunk | [Ch13](ch13-diffusion-policy.md) | 从随机噪声逐步"雕刻"出一段动作序列，能表达多模态分布 |
| 理解模仿学习 | BC 行为克隆 → DAgger 在线纠正 → 数据质量理论 | [Ch14](ch14-imitation-learning.md) | 数据质量比数据量更重要；差的演示不如不要 |
| 理解仿真训练 | MuJoCo 物理引擎 / robosuite 框架 / Isaac Gym 大规模并行 | [Ch17](ch17-sim-to-real.md) | 仿真是免费的试错场；真机迁移需要 domain randomization |
| 理解数据集生态 | OXE 跨形态聚合 / DROID 场景多样性 / LIBERO 评测设计 | [Ch21](ch21-datasets.md) | 用 RLDS 格式统一异构数据；LIBERO 是"VLA 的标准考卷" |
| 理解高层规划 | SayCan 可行性评分 / Code as Policies 代码生成 | [Ch10](ch10-planning.md) | LLM 负责"做什么"，底层策略负责"怎么做" |
| 掌握论文精读方法 | 三遍阅读法 / 7 段结构解剖 | [Ch07](ch07-how-to-read-papers.md) | 第一遍鸟瞰（5 min）→ 第二遍理解（1 hr）→ 第三遍批判（2-3 hr） |
| 确定学习路径 | 三条路径选择 / 时间预算评估 | [Ch02](ch02-reading-paths.md) | 选适合自己时间和目标的路径，不必从头到尾线性阅读 |

---

### 工具链速查

| 工具 | 用途 | 安装命令 | 备注 |
|------|------|----------|------|
| MuJoCo | 物理仿真引擎 | `pip install mujoco` | 3.0+ 不再需要 license 文件 |
| robosuite | 机器人操作仿真框架 | `pip install robosuite` | LIBERO 依赖它 |
| LIBERO | VLA 微调评测 | `pip install libero` 或 clone 仓库 | 注意 robosuite 版本兼容性 |
| LeRobot | HuggingFace 的 VLA 训练框架 | `pip install lerobot` | SmolVLA 在这里训练 |
| Hugging Face Transformers | 加载预训练模型 | `pip install transformers` | OpenVLA/SmolVLA 的模型权重在 HF Hub |
| Hugging Face Datasets | 加载 RLDS 格式数据 | `pip install datasets` | OXE 数据集用这个加载 |
| PyTorch | 深度学习框架 | 去 pytorch.org 按 CUDA 版本选 | 先装这个，再装其他 |
| wandb | 训练过程监控 | `pip install wandb` | 免费账户够用，能看 loss 曲线和系统资源 |
| h5py | 读写 HDF5 数据 | `pip install h5py` | RoboMimic/LIBERO 数据格式 |
| imageio | 渲染 rollout 视频 | `pip install imageio[ffmpeg]` | 调试时必备——看模型在干什么 |

---

### 论文速查表

| 论文 | 核心贡献一句话 | 对你的实操意义 | 相关章节 |
|------|--------------|---------------|---------|
| CLIP (2021) | 对比学习把图片和文字对齐到同一空间 | VLA 的视觉编码器几乎都用 CLIP 或其变体 | Ch08 |
| LLaVA (2023) | 用视觉指令微调让 LLM 学会看图 | 理解 VLA 怎么从 VLM 演化来的 | Ch09 |
| RT-1 (2022) | 第一个大规模真机训练的机器人 Transformer | VLA 的起源——证明了 Transformer 能控制机器人 | Ch11 |
| RT-2 (2023) | 让 VLM 直接输出机器人动作 token | VLA 范式的确立——感知和动作端到端 | Ch11 |
| OpenVLA (2024) | 开源 7B VLA + 256-bin 动作 tokenizer | 你实操的候选模型之一，LoRA 微调友好 | Ch12 |
| SmolVLA (2024) | 500M 轻量 VLA + Diffusion 动作头 | 你实操的首选模型——小、快、效果好 | Ch13 |
| Diffusion Policy (2023) | 用扩散模型生成 action chunk | SmolVLA 动作头的理论基础 | Ch13 |
| Octo (2024) | 模块化通用策略 + diffusion head | 27M-93M 参数，资源有限时的备选 | Ch12 |
| LIBERO (2023) | 四类知识解耦的 VLA 微调评测基准 | 你评测模型时用的"标准考卷" | Ch21 |
| Open X-Embodiment (2023) | 22 个机器人形态、160 万条轨迹聚合 | 预训练数据的来源——理解 VLA 为什么需要大数据 | Ch21 |
| SimplerEnv (2024) | 仿真-真机对齐度验证 | 判断你的仿真分数能多大程度代表真机性能 | Ch21 |

---

### 概念关系图（文字版）

如果你觉得上面的表格还是太散，这里用文字画一条从"基础"到"实操"的依赖链：

```
CLIP (视觉-语言对齐)
  → LLaVA (视觉指令微调)
    → RT-2 (VLM 输出动作)
      → OpenVLA (开源 VLA，7B)
        → 你的 Task 2：LoRA 微调 OpenVLA 在 LIBERO 上

Diffusion Model (去噪生成)
  → Diffusion Policy (动作序列生成)
    → SmolVLA (轻量 VLA + Diffusion Head)
      → 你的 Task 2：LeRobot 框架训练 SmolVLA

模仿学习理论 (BC / 数据质量)
  → 数据采集策略 (遥操作 / scripted policy)
    → OXE / LIBERO 数据集
      → 你的 Task 2：数据准备和评测
```

每一步都建立在前一步之上。如果某一步卡住了，往上一层看看是不是基础概念没理解透。

---

### 常见问题与建议阅读顺序

根据你可能遇到的具体困惑，这里给出"遇到 X 问题时去读哪里"的速查：

| 你的困惑 | 建议去读 | 原因 |
|---------|---------|------|
| "VLA 和普通视觉模型到底有什么区别？" | Ch11 §11.2（RT-1 架构）→ Ch12 §12.1（VLA 定义） | 区别在于输出端：VLM 输出文字，VLA 输出动作 |
| "Diffusion Policy 的噪声到底是什么意思？" | Ch13 §13.2（去噪过程）→ §13.4（action chunk） | 噪声是随机初始化的动作序列，去噪是逐步修正 |
| "为什么我的模型训练 loss 低但 rollout 差？" | Ch14 §14.3（分布偏移）→ 本章 §22.6.3 | 行为克隆的固有问题：训练分布 ≠ 测试分布 |
| "数据集太大下载不了怎么办？" | Ch21 §21.3（数据集规模）→ 本章 §22.4 | 先用子集实验，确认方法可行后再用全量 |
| "仿真里成功了但真机会不会失败？" | Ch17 §17.3（domain gap）→ 本章 §22.5.1 SimplerEnv | sim-to-real gap 存在但可以量化和缓解 |
| "不知道选哪个模型来做实验" | Ch12 对比表 → 本章 §22.4 模型选择 | 资源少选 SmolVLA，资源多选 OpenVLA |

---

## 22.9 结语：从这里出发

### 你走过的路

从 [第一章](ch01-why-embodied-ai.md) 问出那个问题开始——"为什么 AI 需要一个身体？"——到现在，你已经走过了 22 章的路程。这不是一段短路——从视觉基础到数据集生态，从理论推导到动手调参，你经历了一个完整的知识建构过程。

回头看看这条路：

第一章到第六章，我们建立了全景认知。你知道了具身智能不是一个单点技术，而是视觉、语言、规划、控制、仿真、数据等十几个子领域交织而成的系统工程。你在 11 个主题的地图上找到了自己的位置，选择了适合自己时间和兴趣的阅读路径。

第七章到第九章，你学会了读论文的方法，理解了机器人如何"看"和"理解语言"。CLIP 教会了机器对齐视觉和文字，LLaVA 教会了大模型真正看图——这两项技术是后面一切的地基。

第十章到第十四章是这本导读的核心地带。你理解了机器人如何把感知转化为行动：从 SayCan 的高层规划，到 RT-1/RT-2 证明 Transformer 能控制真机器人，到 OpenVLA 把这项能力开源出来，到 Diffusion Policy 用去噪过程生成流畅的动作序列，再到模仿学习的理论基础告诉你"数据质量比数据量重要"。这条线串起来就是：看到什么 → 理解什么 → 决定做什么 → 怎么做。

第十五章到第十七章，你理解了虚拟世界如何帮助真实世界的机器人训练。世界模型让机器人能"想象"行动后果，强化学习提供了不需要人类演示的学习方式，Sim-to-Real 技术则解决了"仿真中学到的东西能不能用在真机上"这个关键问题。

第十八章到第二十章扩展了感知的维度——多模态融合、射频感知、听觉智能。机器人不只用眼睛看世界，它还能"听"到指令中的情感、"感知"墙后的物体。

第二十一章梳理了整个领域的数据生态。你理解了为什么数据是瓶颈、社区如何协作共建、以及怎么用标准基准公平评测不同方法。

而这第二十二章，把前面所有知识落地为两个你能动手做的项目。论文精读让你真正理解一个方法"为什么这么设计"；动手实验让你亲自跑通从数据到部署的全流程。

### 接下来做什么

走到这里，你已经不再是零基础了。你有了全景视野、有了方法论、有了动手经验。接下来有三个方向可以选择——不需要都走，选一个最让你兴奋的：

**方向一：深度。** 选一个子领域深入下去。比如：VLA 架构设计（怎么设计更高效的动作生成头？能不能用 flow matching 替代 diffusion？）、扩散策略优化（怎么把推理从 10 步压到 1 步？consistency model 行不行？）、Sim-to-Real（怎么让仿真训练出来的策略在真机上不打折？domain randomization 的极限在哪？）、多模态感知（触觉/力反馈怎么融入决策？能不能让机器人"感觉"到物体的材质？）。深度方向适合你打算在这个领域做研究或写论文。

具体的入门方式：找到你感兴趣的子领域最近一年的 3 篇代表性论文，用 Ch07 的三遍阅读法精读，然后尝试复现其中一篇的核心实验。复现的过程中你会遇到论文里没写的细节——这些细节就是你可以改进的方向。

**方向二：广度。** 跟踪领域最新进展，保持对前沿的感知。具身 AI 是一个进展极快的领域——2024 年一年的论文量可能超过 2020 年之前十年的总和。订阅 arXiv 的 cs.RO 和 cs.AI、关注 Robotics 相关的 RSS feed、每周花一小时扫一遍顶会（CoRL、RSS、ICRA、IROS）的新接收论文。广度方向适合你想保持技术敏感度但日常工作不在这个方向。

具体的做法：每周花 30 分钟扫 arXiv robotics 板块的新论文标题，遇到感兴趣的读摘要，每月精读 1-2 篇。建立一个 reading list，标注"已读/待读/感兴趣"。半年后你会发现自己对这个领域的发展趋势有了很强的直觉。

**方向三：实践。** 参与开源项目或启动自己的机器人项目。LeRobot 社区活跃、对新人友好，你可以从修一个 bug 或加一个小功能开始。OpenVLA 的 fine-tuning 教程有很多人在复现和改进——加入讨论，分享你的结果。如果条件允许，买一个低成本机械臂（比如 Koch v1.1 或 SO-100），把仿真里学到的东西搬到真机上。实践方向适合你想把技能转化为可展示的成果。

具体的第一步：去 LeRobot 的 GitHub 仓库，找标着 "good first issue" 的 issue，挑一个看起来你能做的。即使最终没有提交 PR，阅读相关代码的过程本身就是很好的学习。

无论选哪个方向，有一个习惯值得保持：**学一个记一个**。你在这本导读中建立的笔记系统——daily 记录每天做了什么、learnings 记录学会了什么、problems 记录解决了什么——这个系统的价值会随时间复利增长。三个月后回头看，你会惊讶于自己走了多远。

### 写在最后

在这本导读开始的时候，我们说过：AI 正在从屏幕里走出来。

过去几十年，AI 的战场在比特世界——文字、图像、代码，都是数字信号。但从 2022 年开始，一些东西在发生变化。当 RT-2 证明一个大语言模型可以直接控制一条机械臂，当 Diffusion Policy 证明生成模型能输出平滑的物理动作，当 Open X-Embodiment 证明跨机器人的数据共享能带来正迁移——一个新的可能性正在变得具体：AI 不再只是"理解"世界，它开始"触碰"世界。

你现在理解了这件事为什么重要、它是怎么逐步发生的、以及你自己能做什么来参与其中。

这个领域还很年轻。2024 年的 SOTA 在 2025 年就可能成为 baseline。你今天学到的具体技术细节（某个模型的参数量、某个框架的 API）可能很快就会过时。但你学到的方法论——怎么读论文、怎么做实验、怎么调试、怎么分析失败——这些不会过时。它们是你在任何快速变化的技术领域里站稳脚跟的底座。

这就够了。剩下的，去动手。

---

> 上一章：[Ch21: 数据集全景](ch21-datasets.md)
> [返回目录](README.md)

<!-- papers: openvla, llava, saycan, 3dshape2vecset, cosmos-policy, rf-slam, mmclip, nlos-mmwave, proactive-hearing, neuralaids, acoustic-swarms, vlas, mla, rt-1, rt-2, diffusion-policy, clip, blip-2, droid, open-x-embodiment, robosuite -->
