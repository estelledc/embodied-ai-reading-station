# 实践工作区：从读到做

这个目录只放**能运行的东西**和**真实的运行记录**。站点里的笔记和导读是"读"；这里是"做"。

读完一篇论文的笔记，不等于懂了这篇论文。能用代码回答自己的问题、能亲手跑出一个数、能说清楚一次失败的原因，才算真的懂。这里的四个阶段，每一个的出口都是"你拿出了什么"，而不是"你看完了什么"。

## 四个阶段

| 阶段 | 做什么 | 出口（做到这些才算完成） | 目录 |
|---|---|---|---|
| 1 | 用代码回答你自己的两个问题：图片在 AI 眼里是什么数字？动作在电脑里长什么样？ | 两个自己补全、测试通过的练习，加上半页用自己的话写的解释 | [`stage1_image_tokens/`](stage1_image_tokens/)、[`stage1_action_tokens/`](stage1_action_tokens/) |
| 2 | 跑通 Task 2 基础项 VLM_Grasp_Interactive | 一段"说一句话、机械臂抓起物体"的录屏，一份踩坑记录 | [`stage2_vlm_grasp/`](stage2_vlm_grasp/) |
| 3 | 在仿真里录示范数据、微调 SmolVLA、放回仿真评估 | 一个你自己测出来的成功率，加上几段失败录像和原因分析 | [`stage3_sim/`](stage3_sim/) |
| 4 | 把前面的结果变成一个小研究问题 | 一页纸：问题、做法、数据、结论（结果不好也算） | 写在 [`logs/`](logs/) 里 |

阶段 4 可以从这些问题里挑一个：

- **模块化还是端到端？** 同一个抓取场景里，"VLM + 抓取规划"的流水线（阶段 2）和 SmolVLA（阶段 3）谁更强？比成功率、换物体/换位置/换说法后的表现、推理速度、失败的样子。这正是 SayCan 路线和 OpenVLA 路线之争。
- **示范要多少条？** SmolVLA 用 10、25、50、100 条示范分别能做到多少成功率？
- **语音这一环会不会拖后腿？** 阶段 2 的流水线先把语音转成文字，这正是 VLAS 想替代的做法。口音、噪声造成的转写错误，会怎样变成抓取失败？

## 装环境

阶段 1 的练习和阶段 3 的仿真只需要几个轻量的包，CPU 就能跑：

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r lab/requirements.txt
python -m pytest -q lab            # 应该全部通过（有几项需要额外条件的会显示 skipped）
```

要跑真实的 CLIP、导出 LeRobotDataset、微调 SmolVLA，再装：

```bash
pip install -r lab/requirements-vla.txt
```

它会装 LeRobot 0.6.0（要求 Python ≥ 3.12）和 PyTorch。没有 NVIDIA 显卡时，PyTorch 可以装 CPU 版：先运行 `pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu`，再装 `requirements-vla.txt`。

阶段 2 的 VLM_Grasp_Interactive 要单独建一个 Python 3.10 的环境，见 [`stage2_vlm_grasp/README.md`](stage2_vlm_grasp/README.md)。

## 谁跑过什么

这张表只记录真实发生过的运行。AI agent 跑过的，只能说明"代码能跑"；**你自己跑过、并写了记录的，才是你的证据**。

| 日期 | 谁 | 环境 | 跑了什么 | 结果 |
|---|---|---|---|---|
| 2026-09-27 | AI agent（Cursor Cloud Agent） | Ubuntu 24.04 云主机，4 核 CPU，无 GPU，Python 3.12.3，MuJoCo 3.14.0，LeRobot 0.6.0，torch 2.11.0+cpu | 全部自动化测试，包括 `LAB_RENDER=1 LAB_SLOW=1` | 全部通过 |
| 2026-09-27 | AI agent | 同上 | `inspect_clip.py`（真实 CLIP ViT-L/14） | 输出形状 (1, 257, 1024)，LLaVA 取 (1, 256, 1024) |
| 2026-09-27 | AI agent | 同上 | 脚本专家在种子 0～99 上评估 | 100/100 成功；随机策略 0/100 |
| 2026-09-27 | AI agent | 同上 | 录 3 个回合 → 导出 LeRobotDataset → SmolVLA 在 CPU 上微调 2 步 → 评估 2 个回合 | 流程走通；2 步训练的模型成功率 0/2（这是预期的，它还没学） |
| 2026-09-27 | AI agent | 同上 | VLM_Grasp_Interactive | **没有运行**：这台机器没有 NVIDIA 显卡 |
| — | 你 | | | |

## 怎么用 AI 帮你，而不是替你

- **先自己写，再问 AI。** 练习里的 `TODO` 自己补；卡住超过半小时再看参考答案，或者让 AI 给提示，而不是直接要答案。
- **报错先自己读一遍。** 把报错的最后几行读懂了再去搜、再去问；解决之后把原因记进 `logs/`。
- **让 AI 出题、追问、挑错。** 比如："我对 patchify 的理解是……，哪里不对？"
- **AI 说的数字要回原文核对。** 这个仓库的笔记在 2026-09 的核验里改正了 200 多处错误，大多是看起来很专业、其实原文没有的数字。
