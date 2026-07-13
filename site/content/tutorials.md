---
title: 实战教程 / 跑得起来的代码
order: 4
intro: '从「不用配电脑、看视频就行」到「装 Python 跑模型」三档分级，给完全没写过代码的同学'
---

读累了想动手？这一页把所有教程按「门槛」分成三档：

- **第 0 档**：什么都不用装，打开浏览器看视频或网页就行
- **第 1 档**：用 **Colab**（谷歌提供的免费在线代码本，浏览器打开就能跑代码，自带显卡），不用配环境
- **第 2 档**：要在自己电脑上装 **Python**（一种编程语言）和一堆库，配环境约 1-2 小时

> **Colab（Google Colaboratory）**：网页上的"代码本子"。每个格子写一段代码，点运行就出结果，谷歌免费借你一台带显卡的服务器。**完全不需要在自己电脑上装任何东西，只要能科学上网。**

> **GPU（显卡 / 图形处理器）**：原本是给游戏画面渲染用的芯片，现在 AI 训练全靠它做大量并行计算。家用显卡也分高低端，跑大模型一般要专业的 A100 / H100，但 Colab 免费版给的 T4 已经够练手。

> **模型（model）**：你可以理解为"一个算好参数的复杂函数"。给它一个输入（图片/文字），它给你一个输出（标签/回答/动作）。所谓"训练模型"就是不断调整这个函数里的几亿个参数，让它越答越准。

*读到这里你应该懂了：第 0 档看视频就行，第 1 档浏览器打开 Colab 就能跑代码，第 2 档才需要折腾环境。*

---

## 几个反复出现的词，先一次性讲清

后面教程里这些词高频出现，先在这里翻译成人话，往下看就不卡壳。

> **神经网络（Neural Network）**：一堆"小函数"层层堆叠，每层接收上一层的数字，做一次加权求和再变换，最后吐出结果。形象点：每一层像考试里的一道大题，前一题的答案是后一题的输入。

> **训练 / 学习**：让模型一遍遍看「输入 → 正确答案」的样例，每次答错就调整内部参数。**像背错题本**：错一次就改一次，错得越多调得越多。

> **Loss（损失 / 扣分）**：模型这次答得有多差，用一个数字表示。**就是考试扣分总和，越小越好。** 模型学习的全部目标就是想办法让这个分往下降。

> **梯度下降（Gradient Descent）**：调参数的方法。**像下山**：站在半山腰，每一步往最陡的下坡方向迈一小步，反复迈直到走到山谷（也就是 Loss 最低点）。

> **矩阵（Matrix）**：一张排好的数字表格，有行有列。两个矩阵相乘有规则，行数列数要对齐。AI 内部所有计算几乎都是矩阵在乘来乘去。

> **向量表示 / 把东西变成一串数字**：一张图、一句话，模型会先把它变成一串数字（比如 512 个数字组成的向量）。**两个向量夹角越小（内积越大），代表它俩语义越接近**——这就是高中学过的向量内积，AI 里反复用。

> **数据集（Dataset）**：一大堆训练样例打包成的文件夹，比如"100 万张图片 + 每张图的文字描述"。

> **fine-tune（微调）**：别人已经训练好一个大模型，你只用一小撮自己的数据"补课"几小时，让它适应你的任务。**像借了学霸的复习提纲再加几道自己学校的题型。**

> **Prompt（提示词）**：你给模型的输入文字。同一个模型，prompt 写法不同，效果差很多。

> **Zero-shot（零样本）**：不给模型看过任何这个任务的例子，直接让它做。**像月考考了课本上没出现过的题型，但学生靠通识能蒙对。**

*读到这里你应该懂了：训练 = 让模型背错题本，Loss = 扣分，梯度下降 = 下山找最低点，矩阵 = 数字表格，向量夹角小 = 意思接近。*

---

## 第 0 档：不用配环境，看视频就行

什么都不用装，B 站 / YouTube 打开就看。**强烈建议第一周只做这一档。**

### 1. 3Blue1Brown · 神经网络系列

| 项目 | 说明 |
|---|---|
| 平台 | YouTube |
| 链接 | https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi |
| 语言 | 英文（YouTube 自动中文字幕能看） |
| 时长 | 约 2 小时（7 集，每集 15-25 分钟） |
| 需要英文阅读吗 | 不强制，开自动字幕即可 |
| 好玩瞬间 | 第 3 集会用动画演示"梯度下降下山"，看到蓝色小球一路滚到山谷的瞬间，前面所有抽象数学一下就具象了 |

- **为什么先看这个**：把"神经网络怎么从数字识别一步步变成 ChatGPT 背后的 Transformer"用动画讲清楚，**没有任何编程门槛**
- 看完你会理解前面那些术语（神经网络 / Loss / 梯度下降）到底长什么样

### 2. 跟李沐学 AI · 动手学深度学习

| 项目 | 说明 |
|---|---|
| 平台 | B 站 |
| 链接 | https://www.bilibili.com/video/BV1if4y147hS/ |
| 语言 | 中文 |
| 时长 | 单集 1-2 小时（共 70+ 集，先看前 10 集就够） |
| 需要英文阅读吗 | 不需要 |
| 好玩瞬间 | 第 8 集左右第一次用代码画出"模型预测的直线慢慢贴近真实数据点"的动图 |

- **为什么推荐**：编程零基础学 AI 最稳的中文路径，李沐是行业内顶级讲师，配套书在 https://zh.d2l.ai/ 免费看
- 计划：**只先看前 10 集**（线性回归 → 多层感知机 → 卷积神经网络），不要贪多

### 3. Two Minute Papers

| 项目 | 说明 |
|---|---|
| 平台 | YouTube |
| 链接 | https://www.youtube.com/@TwoMinutePapers |
| 语言 | 英文（自动字幕够用） |
| 时长 | 每集 5-10 分钟 |
| 需要英文阅读吗 | 不需要 |
| 好玩瞬间 | 看到一篇"AI 生成会跳舞的人体"或"机器狗在沙地翻跟头"的视频，5 分钟看完会觉得这个领域真的在飞速进步 |

- **作用**：累了换换脑子，每集挑一篇前沿论文用动画讲一遍
- **不要尝试自己复现**，就当看科技新闻

*读到这里你应该懂了：先把这三个看完，建立"AI 是什么样子"的直觉，再去碰代码。*

---

## 第 1 档：用 Colab 浏览器跑（不用配环境）

打开链接 → 登录谷歌账号 → 点"运行全部"→ 等出结果。**全程不在自己电脑上装任何东西。**

> **前置说明**：Colab 在国内需要科学上网。免费版给的显卡是 T4，跑前沿小模型都够。每次连接最多 12 小时，关掉浏览器就断。

### 4. CLIP 官方 Colab：图文匹配第一课

| 项目 | 说明 |
|---|---|
| 平台 | Google Colab（OpenAI 官方） |
| 链接 | https://colab.research.google.com/github/openai/clip/blob/master/notebooks/Interacting_with_CLIP.ipynb |
| 语言 | 英文（注释为主，照着点运行就行） |
| 时长 | 30 分钟 |
| 需要英文阅读吗 | 略需要看懂注释，不会就丢翻译 |
| 好玩瞬间 | 上传一张你自己的照片，模型在「猫 / 狗 / 飞机 / 日落」里挑一个最匹配的标签——它真的能挑对 |

> **CLIP**：OpenAI 2021 年的模型。它干的事是把"图"和"对应的文字描述"都变成同一个空间里的向量，**图和文字的向量夹角越小越是同一回事**。后面所有看图说话的 AI 几乎都拿它当眼睛。

- **为什么推这个**：第一次跑多模态 AI 的最低门槛
- 配套笔记：[mmCLIP 笔记](../notes/mmclip.md)

### 5. CLIP Prompt Engineering：换句话能涨多少分

| 项目 | 说明 |
|---|---|
| 平台 | Google Colab（OpenAI 官方） |
| 链接 | https://colab.research.google.com/github/openai/CLIP/blob/master/notebooks/Prompt_Engineering_for_ImageNet.ipynb |
| 语言 | 英文 |
| 时长 | 1 小时 |
| 需要英文阅读吗 | 略需要 |
| 好玩瞬间 | 同一张图，prompt 从 "cat" 改成 "a photo of a cat"，准确率涨好几个点——你会第一次直观感觉到"AI 也是会偏科的考生" |

- **跑通第 4 个再来跑这个**
- 学到的是"提示词工程"的雏形

### 6. MuJoCo 官方 Python Tutorial：让物体在屏幕里掉下来

| 项目 | 说明 |
|---|---|
| 平台 | Google Colab（DeepMind 官方） |
| 链接 | https://colab.research.google.com/github/google-deepmind/mujoco/blob/main/python/tutorial.ipynb |
| 语言 | 英文 |
| 时长 | 1.5 小时 |
| 需要英文阅读吗 | 略需要 |
| 好玩瞬间 | 写几行 XML 描述"一个球 + 一个斜面"，然后看球真的从斜面滚下来——第一次感受到"用代码捏物理世界" |

> **仿真器（Simulator）**：在电脑里"假造"一个有重力、有摩擦、有碰撞的世界。机器人在真实世界训练太贵又危险，先在仿真里练熟了再搬到真机。**MuJoCo** 是 DeepMind 维护的物理仿真器，业界标配。

- **作用**：后面要做"机器人"相关的项目都绕不开仿真，这是入门第一步
- 这个跑通之后，看后面 SayCan / VLA 项目的代码不会蒙

### 7. SayCan 官方 Colab：让大语言模型指挥机器人

| 项目 | 说明 |
|---|---|
| 平台 | Google Colab（Google Research 官方） |
| 链接 | https://github.com/google-research/google-research/tree/master/saycan |
| 语言 | 英文 |
| 时长 | 1 小时 |
| 需要英文阅读吗 | 需要看懂 prompt 的英文 |
| 好玩瞬间 | 你打字 "把可乐递给我"，机器人手臂在仿真里依次完成「找到可乐 → 抓起来 → 放到你旁边」——大语言模型第一次"指挥"了一个会动的东西 |

- **配套笔记**：[SayCan 笔记](../notes/saycan.md)
- 看 LLM 怎么给每个动作打分，再和"我现在到底能不能做这个动作"相乘选最优

> **LLM（Large Language Model，大语言模型）**：就是 ChatGPT、文心一言这一类。给它一段文字，它接着写。

*读到这里你应该懂了：第 1 档的 4 个 Colab 全跑完，你就摸过了"图文匹配 + 物理仿真 + LLM 指挥机器人"三件事。*

---

## 第 2 档：自己电脑装 Python（配环境 1-2 小时）

要在自己电脑装 Python，第一次配环境约 1-2 小时。**强烈建议先把第 0、1 档过一遍再来这档。**

> **Python**：一种编程语言。AI 圈几乎全用它。安装方式推荐 [Miniconda](https://docs.conda.io/projects/miniconda/en/latest/)（一个包管理工具）。

> **包 / 库（Package / Library）**：别人写好的代码合集，直接拿来用。装库的命令长这样：`pip install xxx`。**国内装库慢就用清华源**：`pip install xxx -i https://pypi.tuna.tsinghua.edu.cn/simple`

> **PyTorch**：Facebook 主推的 AI 框架（一大堆现成函数）。本档项目几乎全建在它上面。

### 8. SmolVLA：能在自己笔记本上跑通的"机器人大脑"

| 项目 | 说明 |
|---|---|
| 平台 | HuggingFace Blog + LeRobot GitHub |
| 链接 | https://huggingface.co/blog/smolvla |
| 语言 | 英文 |
| 时长 | 先预留 3-5 小时做官方教程和短跑验证；真实微调时间取决于数据量、显卡和 batch |
| 需要英文阅读吗 | 需要，配翻译 |
| 是否要 GPU | 推理和小规模训练优先按官方配置短跑；显存需求随策略、batch 和图像分辨率变化 |
| 好玩瞬间 | 按官方教程短跑成功后，你能第一次看到"图像 + 指令 → 动作"这条链路在本机形成闭环 |

> **VLA（Vision-Language-Action 模型）**：眼睛看图（V）+ 耳朵听指令（L）+ 手做动作（A）三合一的模型，给机器人当大脑。

> **证据边界（2026-07-13）**：SmolVLA 的 450M、公开社区数据和 LeRobot 集成来自 `arxiv-2506.01844` 与 Hugging Face 官方博客；下面 LeRobot 入口按 GitHub release `v0.6.0`（commit `30da8e687a6dfc617fcd94afc367ac7071c376ce`）和该 tag 下 `pyproject.toml` / README 写。本站尚未保存本地微调或真机执行的 E4 artifact，所以这里是入门路径建议，不是“本站已跑通”的实验报告。

- **作用**：约 450M 参数的小型 VLA，目标是把训练和推理门槛降到消费级硬件；是否能在你的机器上跑通，要以本机短跑日志为准
- **配套笔记**：[OpenVLA 笔记](../notes/openvla.md) + [VLA 大盘](../tracks/vla-mcp-overview.md)

### 9. HuggingFace LeRobot 官方教程

| 项目 | 说明 |
|---|---|
| 平台 | HuggingFace Space |
| 链接 | https://huggingface.co/spaces/lerobot/robot-learning-tutorial |
| 语言 | 英文 |
| 时长 | 4-6 小时 |
| 需要英文阅读吗 | 需要 |
| 是否要 GPU | 数据查看、遥操和格式理解可以先轻量跑；训练 / 评估按具体策略决定 |
| 好玩瞬间 | 用键盘"遥操"一个仿真机械臂去抓木块，自己录数据，再训一个模型让它自己抓 |

- **作用**：HuggingFace 官方机器人学习课程，覆盖 LeRobotDataset、遥操/采集、训练和评估的基本链路
- **v0.6.0 环境提醒**：`pyproject.toml` 写明 `requires-python = ">=3.12"`；`pip install lerobot` 是轻量默认安装，不再自动带齐 dataset / training 依赖，训练前按需装 extras，例如：

```bash
conda create -n lerobot-v06 python=3.12 -y
conda activate lerobot-v06
pip install "lerobot[training]"
lerobot-info
```

- **当前稳定入口**：先用 `lerobot-info` 看本机暴露了哪些 CLI；采集/回放优先查 `lerobot-record`、`lerobot-replay`，训练/评估优先查 `lerobot-train`、`lerobot-eval`。不要把旧文章里的 `examples/2_evaluate_pretrained_policy.py`、`examples/3_train_policy.py` 当成 v0.6.0 的稳定公共入口。

### 10. LeRobot 中文教程（飞书文档）

| 项目 | 说明 |
|---|---|
| 平台 | 飞书 Wiki（社区翻译） |
| 链接 | https://zihao-ai.feishu.cn/wiki/space/7589642043471924447 |
| 语言 | 中文 |
| 时长 | 2-4 小时 |
| 需要英文阅读吗 | 不需要 |
| 是否要 GPU | 跑训练时需要 |
| 好玩瞬间 | 中文文档下顺利跑通"训练扩散策略"那一节，没卡在英文 |

- **作用**：上一个英文教程读不动了来这里
- 重点看「训练扩散策略」章节

### 11. PyBullet 入门：另一个免费仿真器

| 项目 | 说明 |
|---|---|
| 平台 | 官方文档 + GitHub examples |
| 链接 | https://docs.google.com/document/d/10sXEhzFRSnvFcl3XxNGhnD4N2SedqwdAvK3dsihxVUA |
| 语言 | 英文 |
| 时长 | 4-5 小时 |
| 需要英文阅读吗 | 需要 |
| 是否要 GPU | 不需要 |
| 好玩瞬间 | 看到一个 URDF 描述的机械臂在 PyBullet 里挥舞 |

- **作用**：MuJoCo 跑通后想换换看，PyBullet 装起来更简单（一行 `pip install pybullet`），机器人模型库更丰富

*读到这里你应该懂了：第 2 档的核心是 SmolVLA + LeRobot——能在自己电脑上摸到一个真正的机器人模型。*

---

## 第 3 档：先别碰，等有 GPU 服务器再说

下面这些都是大模型，**家用显卡跑不动，需要 A100 / H100 这种专业卡**。现在不必跑，看视频和论文为主。

| 项目 | 链接 | 显存要求 | 一句话 |
|---|---|---|---|
| OpenVLA 完整训练 | https://github.com/openvla/openvla | 单卡 LoRA 微调要 27GB；完整训要 8 张 A100 | 真的能用的开源 VLA，门槛是 GPU |
| NVIDIA Cosmos | https://github.com/NVIDIA/Cosmos | A100/H100 推荐 | 世界模型 + 后训练，**前沿但门槛高** |
| LLaVA | https://github.com/haotian-liu/LLaVA | 推理单卡 24GB；训练 8 张 A100 | "看图说话"模型代表 |
| NVIDIA Isaac Lab | https://github.com/isaac-sim/IsaacLab | RTX 30 系以上 + Linux | 大规模仿真训练框架 |

> **LoRA（Low-Rank Adaptation）**：微调大模型的省钱招。原模型有几十亿参数，全调一遍训不动；LoRA 只在旁边加一小撮参数，**只调这一小撮**，省 90% 显存。

> **后训练（Post-training）**：在已经训好的模型上，再用一小批高质量数据"做题强化"，让它更对齐人类偏好或某个具体任务。

*读到这里你应该懂了：第 3 档现在只用看，不用跑。等到你有云服务器或学校实验室的显卡再说。*

---

## 推荐路径（编程零基础版）

```
第 1 周：3Blue1Brown 神经网络（看视频）→ 李沐前 10 集（看视频）
第 2 周：CLIP 两个 Colab（浏览器跑）→ MuJoCo Tutorial（浏览器跑）
第 3 周：SayCan Colab（浏览器跑）→ 装 Python → SmolVLA（自己电脑跑）
第 4 周：LeRobot 官方教程（自己电脑跑）
第 5 周后：有 GPU 再去碰 OpenVLA / Cosmos
```

**重点提醒**：

- 不要跳级。直接啃 OpenVLA 训练代码，会卡 80% 的时间在配环境上，反而学不到任何概念
- **每跑通一个就在 [problems/](../../../../problems/) 记一笔**，至少写"今天遇到 XX 报错，搜了 XX 解决"
- **每懂一个新概念就在 [learnings/](../../../../learnings/) 写一篇**，用自己的话解释一遍

*读到这里你应该懂了：从看视频到自己跑模型大约需要 4-5 周，不要急。*

---

## 仓库可用性快速参考

| 论文 / 项目 | GitHub | 维护状态 | 一句话 |
|------|--------|---------|-------|
| OpenVLA | https://github.com/openvla/openvla | 活跃，2025 年还在更新 | 能跑，主要难在 GPU 不够 |
| LeRobot / SmolVLA | https://github.com/huggingface/lerobot | 非常活跃，HuggingFace 官方维护 | 能跑，强烈推荐 |
| LLaVA | https://github.com/haotian-liu/LLaVA | 已有 NeXT 版接班 | 能跑，建议直接用 LLaVA-NeXT |
| SayCan | https://github.com/google-research/google-research/tree/master/saycan | 仅 Colab 演示 | 能跑 demo，不能复现训练 |
| Cosmos | https://github.com/NVIDIA/Cosmos | 活跃，NVIDIA 官方 | 能跑推理，门槛高 |
| CartoRadar | 未公开（MIT 实验室） | 论文公开，代码未开源 | 不能跑，等开源 |
| 大量硬件相关论文 | 多无开源代码 | - | 读论文为主，硬件复现不现实 |

*读到这里你应该懂了：不是每篇论文都有代码可跑，但本页推荐的入门项目都已亲测能跑通。*

---

## 跑代码遇到问题怎么办

- 先 grep 看 [problems/](../../../../problems/) 有没有人踩过同一个坑
- 报错信息直接复制到搜索引擎或 ChatGPT，90% 都有现成答案
- 国内下载慢就换镜像源（清华 / 阿里）
- 模型权重下载不动就用 [HuggingFace 镜像站](https://hf-mirror.com)
- 解决了就回来记一笔到 [problems/](../../../../problems/)，下次自己或别人能直接用

*读到这里你应该懂了：遇坑不可怕，记下来就是经验。*

---

## 能跑得起来的开源项目（按"能不能上手"排序）

> 下面这些是 2026-07 重新核过入口的一批活跃开源项目：优先选官方文档清楚、学习路径明确、硬件门槛可控的项目。从最适合第一次尝试的开始；“能否跑通”必须以你自己的命令和日志为准。

## 术语速查（首次出现给类比，不重复解释）

- **VLA（Vision-Language-Action）模型**：吃图片 + 文字指令，吐出机器人动作的"大脑"。类比：把 ChatGPT 装进机械臂里，告诉它"把红方块拿过来"它就会动。
- **仿真器（simulator）**：电脑里的虚拟物理世界，让机器人先在里面摔一万次再上真机。类比：F1 车手先在赛车游戏里练。
- **Imitation Learning（模仿学习）**：人手把手示范几十次，机器人学着做。类比：师傅带徒弟。
- **RL（Reinforcement Learning）**：机器人自己反复试错，做对了给奖励。类比：训狗。
- **BOM（Bill of Materials）**：清单 + 总价。买齐这些零件就能搭一台机器。
- **Colab T4**：Google Colab 免费档配的 GPU，16GB 显存，能力约等于 2018 年的卡。能跑小模型推理，跑不动大模型训练。
- **RTX 3060 / 4090 / A100**：消费级 → 发烧级 → 数据中心级 GPU。显存依次约 12GB / 24GB / 80GB，价格依次约 ¥2k / ¥15k / ¥15w。

---

## 第一梯队：入门读者首选（⭐ 难度 1-2）

### 1. HuggingFace LeRobot

- **链接**：<https://github.com/huggingface/lerobot>
- **一句话定位**：具身智能界的"HuggingFace Transformers"——下载预训练策略 / 数据集 / 跑微调，全套工具链
- **状态**：GitHub release `v0.6.0`（2026-07-06）/ Apache-2.0 / 极活跃；`main` 可能继续向前滚动，学习时先固定 release
- **门槛**：⭐⭐ 纯软件部分可以先从官方教程和数据格式跑起；真实硬件是可选项，具体 BOM 与支持清单以 LeRobot 硬件文档为准
- **支持硬件**：README 列出 SO100、LeKiwi、Koch、HopeJR、OMX、EarthRover、Reachy2、Gamepads、Keyboards、Phones、OpenARM、Unitree G1、reBot B601 等；新增或改名硬件要回到当前 release 文档核对
- **入门路径**：
  - Hugging Face Spaces 上的免费 [Robot Learning Tutorial](https://huggingface.co/spaces/lerobot/robot-learning-tutorial)
  - 官方 README 的最小链路：`pip install lerobot` → `lerobot-info`
  - 需要训练时安装 `lerobot[training]`，再用 `lerobot-train --policy.type=... --dataset.repo_id=...`
  - 需要评估时从 `lerobot-eval` 开始，并按策略和环境补对应 extra
  - 中文社区教程可作为辅助，但命令行入口仍以当前 release 文档为准
- **推荐时机**：**第一站**。先确认 LeRobotDataset 和 CLI 能跑，再进入 SmolVLA / ACT / Diffusion 策略训练；这样比直接啃 VLA 大模型代码更容易获得正反馈

### 2. MuJoCo Menagerie

- **链接**：<https://github.com/google-deepmind/mujoco_menagerie>
- **一句话定位**：DeepMind 维护的高质量机器人模型仓库——免费的 3D 机器人"贴纸册"
- **状态**：3.5k stars / 持续更新
- **门槛**：⭐ MuJoCo 本身 pip 一行装好；纯 CPU 就能跑，**Colab 完全可用**
- **包含模型**：Unitree H1/G1/Go2 / Franka Panda / UR5e / Boston Dynamics Spot / Shadow Hand / Stretch 3 等几十款
- **入门路径**：
  - `pip install mujoco` → 打开任意 XML 文件即可加载渲染
  - DeepMind [MuJoCo tutorial.ipynb](https://github.com/google-deepmind/mujoco/blob/main/python/tutorial.ipynb)（Colab 一键跑）
- **推荐时机**：想直观感受"机器人模型长什么样"时；做仿真前的"逛博物馆"

### 3. ManiSkill 3

- **链接**：<https://github.com/haosulab/ManiSkill>
- **一句话定位**：UC San Diego 出品的 GPU 加速操作仿真平台——SAPIEN 引擎 + 数十个 RL/IL 任务
- **状态**：2.9k stars / v3.0.1（2026-04-21）/ 活跃
- **门槛**：⭐⭐ 官方提供 [Colab 快速上手 notebook](https://maniskill.readthedocs.io/)，免费档可跑；本地需要 NVIDIA GPU + Linux
- **亮点**：高端 GPU 上 RGBD 数据采集可达 30000+ FPS，比传统 CPU 仿真快 10-100 倍
- **推荐时机**：跑通 LeRobot 后想做大规模训练 / 数据采集时

---

## 第二梯队：有 GPU 的进阶玩家（⭐ 3）

### 4. Robosuite

- **链接**：<https://github.com/ARISE-Initiative/robosuite>
- **一句话定位**：MuJoCo 之上的模块化机器人学习框架——**模仿学习论文最常用的 benchmark 之一**
- **状态**：2.4k stars / v1.5.2（2025-12-24）
- **门槛**：⭐⭐ CPU 也能跑（慢），GPU 渲染加速；无 Colab 官方支持但社区有 notebook
- **配套**：常和 [robomimic](https://github.com/ARISE-Initiative/robomimic) 一起用做 IL 实验
- **推荐时机**：想复现 ALOHA / Diffusion Policy / ACT 论文时

### 5. RLBench

- **链接**：<https://github.com/stepjam/RLBench>
- **一句话定位**：基于 CoppeliaSim 的 100+ 操作任务集——视觉/语言条件策略论文的常客
- **状态**：1.8k stars / v1.1.0（2021-05，更新慢但论文还在用）
- **门槛**：⭐⭐⭐ 装 CoppeliaSim 麻烦；headless 跑需要 X server 配置
- **推荐时机**：复现 PerAct / RVT / 3D Diffuser Actor 等论文时

### 6. Habitat-Lab

- **链接**：<https://github.com/facebookresearch/habitat-lab>
- **一句话定位**：Meta 出品的具身导航仿真平台（人形 + 机器人 + 室内场景）
- **状态**：3.0k stars / v0.3.4（2026-05-07）/ **Meta 内部已停止官方维护**（注意）
- **门槛**：⭐⭐⭐ Docker 装；NVIDIA GPU 必备；社区有 Colab tutorial 但需自己改
- **推荐时机**：研究**导航 / 家务机器人 / 人机交互**时；想跑 manipulation 用 ManiSkill

---

## 第三梯队：需要 4090+ 或云 GPU（⭐ 4-5）

### 7. Physical Intelligence π0 / π0.5（OpenPI）

- **链接**：<https://github.com/Physical-Intelligence/openpi>
- **一句话定位**：**π0 已开源**！能"听懂自然语言指令、在新家也能干活"的真·VLA 基础模型
- **状态**：12.1k stars / 2025-09 加 PyTorch 支持 + π0.5 / Apache 2.0
- **GPU 门槛**：

| 任务 | 显存 | 大概什么卡 |
|------|------|----------|
| 推理 | >8 GB | RTX 4090 / 3090 |
| LoRA 微调 | >22.5 GB | RTX 4090 |
| 全量微调 | >70 GB | A100 / H100（云上租） |

- **Colab T4 能跑吗**：勉强能跑推理（要 8bit 量化）；微调跑不动
- **入门路径**：README 的 "easy inference" 几行代码就能跑通假数据
- **推荐时机**：把 LeRobot / ManiSkill 玩透之后；想看"真正的 VLA 大脑"长什么样

### 8. OpenVLA

- **链接**：<https://github.com/openvla/openvla>
- **一句话定位**：开源 7B VLA 模型——**很多 VLA 论文的对比基线**
- **状态**：6.3k stars / 持续更新（OFT / FAST 更新到 2025-03）
- **GPU 门槛**：推理 ~16GB（4090 行）；LoRA 微调 ~72GB A100；全量需 8×A100
- **Colab T4 能跑吗**：勉强（8bit 量化推理）
- **入门路径**：HuggingFace AutoModel 两行代码加载预训练模型
- **推荐时机**：读 VLA 论文时拿来对照基线效果

### 9. NVIDIA Isaac Lab

- **链接**：<https://github.com/isaac-sim/IsaacLab>
- **一句话定位**：NVIDIA 官方的 GPU 加速机器人学习框架（建立在 Isaac Sim 上，**取代已弃用的 Isaac Gym**）
- **状态**：7.3k stars / v3.0.0-beta（2026-03-17）/ Apache 2.0
- **GPU 门槛**：⭐⭐⭐⭐ 必须 RTX 卡（要 RT Cores），推荐 RTX 3070+；**Colab 不支持**（需要 X server 显示环境）
- **官方推荐**：RTX 3070 起步 / 32GB RAM / Ubuntu 22.04
- **入门路径**：[Isaac Lab 文档](https://isaac-sim.github.io/IsaacLab/)有 30+ 即开即用环境
- **推荐时机**：有 NVIDIA 工作站 + 想做大规模 RL（如四足机器人步态）时

### 10. Mobile ALOHA / ALOHA 2（硬件）

- **链接**：
  - Mobile ALOHA：<https://github.com/MarkFzp/mobile-aloha>（4.4k stars / Stanford）
  - 项目主页：<https://aloha-2.github.io/>（DeepMind ALOHA 2）
- **一句话定位**：双臂遥操作机器人——能折衣服、煎虾、铺床的**全开源硬件平台**
- **BOM 成本**：
  - 自组 Mobile ALOHA ≈ **$32,000**（4 个 Interbotix 臂 + AgileX 移动底盘 + 相机）
  - Trossen Robotics 预装套件 $30k-$45k
  - ALOHA 2 静态版 $20k-$32k
- **门槛**：⭐⭐⭐⭐⭐ 给个人玩家不现实；适合实验室 / 公司
- **推荐时机**：作为"目标海报"——想象一下你做完 LeRobot 教程后能玩什么

---

## 入门读者的"跑通"路线推荐

### 周 1-2：零成本起步
1. 跑通 [MuJoCo Colab tutorial](https://github.com/google-deepmind/mujoco)（看到机器人动起来）
2. 跑通 LeRobot `lerobot-info` 和官方 Robot Learning Tutorial 的数据查看 / 最小训练路径

### 周 3-4：加点深度
3. 用 `lerobot-train --policy.type=act` 或 `--policy.type=diffusion` 训练自己第一个小策略
4. ManiSkill quickstart Colab（感受 GPU 并行仿真）

### 月 2+：可选硬件
5. 如果真的喜欢，再按 LeRobot 硬件文档选 SO 系列或其他低成本平台；价格、套件和兼容性以购买时官方/厂商页面为准
6. 用真机录 50 条数据 → 上传 HuggingFace Hub → 训练 → 部署

### 月 3+：大模型实战
7. 租 4090（autodl / vast.ai 一小时 ¥1-3）跑 OpenPI π0 推理
8. 复现一篇你最喜欢的 VLA 论文

---

## "什么卡能跑什么"速查表

| 项目 | Colab T4 (16GB) | RTX 3060 (12GB) | RTX 4090 (24GB) | A100 (80GB) |
|------|---|---|---|---|
| MuJoCo Menagerie | OK | OK | OK | OK |
| LeRobot 推理/训练（小） | 看策略和 extra | OK | OK | OK |
| ManiSkill 仿真 | OK | OK | OK | OK |
| Robosuite | OK | OK | OK | OK |
| Habitat-Lab | 需配置 | OK | OK | OK |
| Isaac Lab / Sim | NO | 勉强 | OK | OK |
| OpenPI π0 推理 | 8bit 量化 | 8bit 量化 | OK | OK |
| OpenPI π0 LoRA 微调 | NO | NO | OK | OK |
| OpenPI π0 全量微调 | NO | NO | NO | OK |
| OpenVLA 推理 | 8bit | 8bit | OK | OK |

---

## 总结一句话

- **明天就能开跑**：MuJoCo Menagerie + LeRobot 官方教程 / CLI 最小链路
- **有点 GPU 想做研究**：ManiSkill / Robosuite / RLBench 三选一
- **真要搞 VLA 大模型**：OpenPI（π0 已开源是 2025 年最大利好）
- **想买真机**：先查 LeRobot 当前硬件文档和 BOM，再决定是否从 SO 系列入门；ALOHA 级平台属于实验室预算
- **企业级仿真**：Isaac Lab（但有学习曲线，不是入门首选）
