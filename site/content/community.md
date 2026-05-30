---
title: 社区 / 持续追踪
order: 5
intro: '论文是慢变量，社区是快变量 — 每日 / 每周 / 每月看什么'
---

> 论文是慢变量，社区是快变量。这里告诉你每天 / 每周 / 每月该看什么。

刚入门别一上来就订阅 30 个 newsletter。先从「每日 1 个 + 每周 2 个 + 每月 1 次」开始，跑顺了再加。

---

## 1. 顶会 / 期刊（每月看一次截稿/接收名单）

具身智能跨学科：机器人会议（CoRL/RSS/ICRA/IROS）+ 视觉/学习会议（CVPR/NeurIPS/ICLR）+ 系统/感知会议（SIGCOMM/MobiCom/SenSys）。

| 会议 | 一般召开时间 | 投稿截止 | 与具身智能 / VLA 的关联度 | 一句话定位 |
|---|---|---|---|---|
| **CoRL** (Conference on Robot Learning) | 11 月 | 6 月 | 极高（机器人 + 学习的主场，VLA / 模仿学习 / Sim2Real 集中地） | 必看，每年 11 月集中扫一遍 oral |
| **RSS** (Robotics: Science and Systems) | 7 月 | 1-2 月 | 极高（机器人顶会，重 system 和理论） | 必看，质量高、量少 |
| **ICRA** (IEEE Int'l Conf on Robotics and Automation) | 5-6 月 | 9 月 | 高（IEEE 旗舰，量大；操作 / 导航 / 控制 全覆盖） | 关注，挑感兴趣 session |
| **IROS** (IEEE/RSJ Int'l Conf on Intelligent Robots and Systems) | 10 月 | 3 月 | 高（与 ICRA 互补，更偏系统） | 关注，挑 workshop |
| **CVPR** | 6 月 | 11 月 | 中高（VLM / 3D / 感知部分跟具身强相关） | 关注 robotics workshop 和 VLA tag 论文 |
| **NeurIPS** | 12 月 | 5 月 | 中高（基础模型 / RL / 表征学习；具身专题 workshop 多） | 关注 12 月集中扫 |
| **ICLR** | 5 月 | 9-10 月 | 中（基础模型层，VLA 训练方法常出现） | 关注，OpenReview 可提前看 |
| **SIGCOMM** | 8-9 月 | 1-2 月 | 低（网络顶会，感知 / 6G / 边缘计算偶尔涉及） | 看 Mingmin Zhao / Adib 组论文 |
| **MobiCom** | 9-10 月 | 3 月 / 8 月 | 低中（移动感知顶会，毫米波 / WiFi 感知集中地） | 看「无线感知 + 行为识别」类论文 |
| **SenSys** / IMWUT | 11 月 / 全年 | 5 月 / 滚动 | 中（传感 + 机器学习交叉，可穿戴 / 环境感知） | 偶尔翻一翻 |

**优先级建议**：
- 真正必看：CoRL + RSS（机器人学习两大顶会）
- 强相关：CVPR（感知）、NeurIPS（基础模型）、ICRA（机器人主流）
- 弱相关但偶尔出大文章：SIGCOMM / MobiCom（无线感知系列论文）

---

## 2. 关键实验室 / 教授（每月看一次新论文）

按领域分组。每个 PI 给一句话定位，看主页比看推特靠谱（推特是噪声，主页是信号）。

### 机器人学习 / VLA 主流派系

**Sergey Levine — UC Berkeley**
- 主页：https://people.eecs.berkeley.edu/~svlevine/
- 代表作：RT-2、Octo、CrossFormer、PI0 系列；BAIR 实验室核心
- 推特：@svlevine
- 定位：端到端机器人学习的旗手，几乎每月都有大模型 / 数据集 / 基准发布

**Pieter Abbeel — UC Berkeley**
- 主页：https://people.eecs.berkeley.edu/~pabbeel/
- 代表作：Dreamer 系列、World Models、Robot Brain；Covariant 创始人
- 推特：@pabbeel
- 定位：RL + 机器人创业派，关注他的播客 The Robot Brains

**Chelsea Finn — Stanford**
- 主页：https://ai.stanford.edu/~cbfinn/
- 代表作：MAML、ALOHA、Mobile ALOHA、Open X-Embodiment（合作）
- 推特：@chelseabfinn
- 定位：低成本机器人 + 元学习；ALOHA 让人形操作进入大众视野

**Fei-Fei Li — Stanford**
- 主页：https://profiles.stanford.edu/fei-fei-li
- 代表作：BEHAVIOR、ImageNet、World Labs（spatial intelligence）
- 推特：@drfeifei
- 定位：「空间智能」概念提出者，World Labs 是当下最热具身创业之一

**Deepak Pathak — CMU**
- 主页：https://www.cs.cmu.edu/~dpathak/
- 代表作：好奇心驱动 RL、Dreamer 系列、人形机器人 Dreamer Policy
- 推特：@pathak2206
- 定位：人形机器人控制 + 自监督；CMU 机器人实验室明星

**Russ Tedrake — MIT**
- 主页：https://groups.csail.mit.edu/locomotion/russt.html
- 代表作：Diffusion Policy、Underactuated Robotics（公开课）、TRI 合作
- 推特：@russtedrake
- 定位：Diffusion Policy 作者；从经典控制到学习的桥梁人物

### 视觉 + 多模态 + 大模型派

**RT-X / Open X-Embodiment 团队 — Google DeepMind**
- 项目主页：https://robotics-transformer-x.github.io/
- 代表作：RT-1、RT-2、RT-X、SayCan、PaLM-E
- 推特：@GoogleDeepMind 官方账号；个人推荐 @QuanVng（Quan Vuong）、@xf1280（Fei Xia）
- 定位：VLA 主流路线的产业代表，数据规模 + 模型规模双驱动

**NVIDIA Robotics / GEAR Lab — Jim Fan / Linxi Fan**
- 主页：https://research.nvidia.com/labs/gear/
- 代表作：Eureka、Voyager、Cosmos World Model、GR00T 人形大模型
- 推特：@DrJimFan、@LinxiFan（同一人）
- 定位：仿真 + 大模型，Cosmos 在 13 篇里出现；推特活跃，输出密度高

### 无线感知 / 系统感知派（13 篇里多次出现）

**Mingmin Zhao — UPenn**
- 主页：https://www.cis.upenn.edu/~mingminz/
- 代表作：mmWave 感知系列、SIGCOMM/MobiCom 多篇；非视觉感知接入具身的关键人
- 定位：如果你对「不只用摄像头」的感知方向感兴趣，必看

**Fadel Adib — MIT**
- 主页：https://www.mit.edu/~fadel/
- 代表作：Signal Kinetics 实验室；穿墙感知、水下通信
- 推特：@FadelAdib
- 定位：MIT Media Lab 系，无线 + 物理 + AI 跨界

**Dina Katabi — MIT**
- 主页：https://people.csail.mit.edu/dina/
- 代表作：RF-Pose、医疗无线监测、Emerald 项目
- 定位：把无线信号变成"超人感知"的代表人物

### 中国 / 亚洲核心团队

**清华叉院 / 高阳团队**
- 主页：https://gaoyang.online/
- 代表作：ALOHA 中国版、ViLa、Diffusion Policy 复现 + 改进
- 定位：国内 VLA 复现 + 创新一线，开源率高

**北大董豪 / Hao Dong**
- 主页：https://zsdonghao.github.io/
- 代表作：Genh2r、机器人操作大模型、ManiSkill 系列合作
- 定位：北大具身实验室代表；国内学生想读博常去的组

**上交卢策吾 / Cewu Lu**
- 主页：https://www.mvig.org/
- 代表作：HOI 检测、AnyGrasp、机器人抓取大规模数据集
- 定位：抓取 / 具身感知方向，AnyGrasp 是国内出圈的代表

**港中文（深圳）韩晓光 / Xiaoguang Han**
- 主页：https://gaplab.cuhk.edu.cn/
- 代表作：3D 视觉 + 数字人 + 具身 3D 表征
- 定位：3D 表征派的代表

**Shanghai AI Lab（OpenRobotLab）**
- 主页：https://github.com/OpenRobotLab
- 代表作：GRUtopia 仿真平台、PointLLM、机器人多模态系列
- 定位：上海 AI Lab 的具身分支，工程力强、开源完整

---

## 3. Newsletter / 博客（每周看 1-2 个）

### 中文

| 名称 | 形式 | 频率 | 一句话 |
|---|---|---|---|
| **机器之心** | 公众号 + 网站 | 每日 | 综合 AI 媒体，具身板块覆盖中等；适合扫标题 |
| **量子位** | 公众号 | 每日 | 同上，互补阅读 |
| **PaperWeekly** | 公众号 + 网站 | 每周 | 论文导读偏深度，具身专题不少 |
| **深蓝学院** | 公众号 + 课程 | 每周 | 偏机器人 + 自动驾驶，有付费课但订阅免费推送 |
| **将门创投 TechBeat** | 公众号 | 每周 | 直播 + 论文解读，具身专题偶尔出现 |

刚开始建议：机器之心（每日扫标题）+ PaperWeekly（每周一深读）。

### 英文

| 名称 | 作者 | 频率 | 一句话 |
|---|---|---|---|
| **The Batch** | Andrew Ng / DeepLearning.AI | 每周 | AI 综合周报，具身覆盖较少但是入门必读 |
| **Ahead of AI** | Sebastian Raschka | 每月 | 深度技术综述，常涉及多模态 / VLM |
| **Import AI** | Jack Clark | 每周 | 政策 + 研究 + 趋势综合，密度高 |
| **The Robot Report** | 行业媒体 | 每日 | 偏机器人产业新闻，看公司动向 |
| **The Robot Brains Podcast** | Pieter Abbeel | 双周 | 顶尖学者访谈，听比读省力 |

刚开始建议：The Batch（每周）+ Import AI（每周）+ Robot Brains（双周通勤听）。

### 具身智能专项

- **Embodied AI Workshop**（CVPR / NeurIPS 附属）：年度 workshop 集合，主页 https://embodied-ai.org/，每年看一次综述报告
- **OpenRobotLab 公众号**：上海 AI Lab 子账号，国内具身方向更新最频繁的之一
- **The Humanoid**（Substack）：人形机器人专项 newsletter，覆盖 Tesla Optimus / Figure / Unitree 等动态

---

## 4. Discord / Slack / 微信群

### 国际

| 社区 | 入口 | 一句话 |
|---|---|---|
| **HuggingFace Discord** | https://discord.gg/huggingface | 「lerobot」「robotics」频道是核心；遇 LeRobot 报错先来这 |
| **LeRobot 社区** | HuggingFace 旗下 | 全球低成本机器人 DIY 集散地；每周有 office hour |
| **EleutherAI Discord** | https://discord.gg/eleutherai | 偏基础模型，但 multi-modal / embodied 频道有讨论 |
| **CoRL Slack** | 注册 CoRL 后获取 | 会议期间最热，平时低活跃；存档值得翻 |

### 国内

- **机器之心读者群**：扫公众号底部二维码，按方向（具身 / VLM / RL）分群
- **量子位 AI 大本营**：类似上面
- **VLA / 具身智能技术交流群**：在知乎 / B 站找具身博主拉群（高阳 / 王鹤 / 张林峰 等学生运营的居多）
- **HuggingFace 中文社区**：B 站 + Discord 双入口

刚开始建议：HuggingFace Discord（潜水 1 个月）+ 1 个国内具身微信群（看真实人怎么聊）。

---

## 5. 每日刷什么（核心 30 分钟流程）

最低成本日常追踪 = 每天 30 分钟，覆盖 80% 信号。

### 早上 10 分钟：arxiv 扫标题

- 入口：https://arxiv.org/list/cs.RO/recent + https://arxiv.org/list/cs.LG/recent
- 推荐工具：**arxiv-sanity-lite**（http://arxiv-sanity-lite.com/）按你 star 的论文推相似
- 关键词订阅：在 arxiv-sanity / Google Scholar Alert 设关键词「Vision-Language-Action」「Diffusion Policy」「Embodied」「Manipulation」

### 中午 10 分钟：Twitter / X List

建一个具身专属 list，只放 15-20 个账号：
- @svlevine、@chelseabfinn、@pabbeel、@pathak2206、@russtedrake
- @DrJimFan、@QuanVng、@xf1280
- @drfeifei、@FadelAdib
- @AdaRob（Karol Hausman / RT 系列作者）
- @skydiver_yang（Yang Zhou，前 DeepMind）
- @karpathy（虽然不是具身，但他的视野能借）

list 而不是 follow，是为了不被他们日常推文淹没。

### 晚上 10 分钟：HuggingFace Daily Papers

- 入口：https://huggingface.co/papers
- 它每天选 ~10 篇社区投票最高的论文，具身 / VLA 命中率高，自带摘要

### 每周一次：Group meeting / 公开讲座

- **Stanford AI Lab seminars**（https://ai.stanford.edu/events/）：录像会发 YouTube
- **MIT CSAIL Robotics Seminar**：YouTube 频道 MIT CSAIL
- **CMU RI Seminar**：CMU Robotics Institute YouTube 频道
- **国内 VALSE 在线讲座**（https://valser.org/）：每周一次，含具身专场

刚开始建议：每周看 1 个，专心看完比看 10 个走神强。

### 每月一次：综述 + Awesome list

- https://github.com/GT-RIPL/Awesome-LLM-Robotics（持续更新）
- https://github.com/jonbarron/website 看 Jon Barron 怎么维护研究主页
- 每月看一遍，看新加了什么综述、什么基准

---

## 上手节奏（给零基础学习者）

第 1-2 周：**先消化 13 篇论文**，社区先放着不订阅
第 3-4 周：开始订阅「机器之心 + The Batch」+ 关注 5 个推特账号
第 2 个月：加 HuggingFace Daily Papers + 进 1 个微信群潜水
第 3 个月：建 Twitter list、设 arxiv 关键词、看 1 个 group meeting
第 6 个月：能挑出「这周值得读的 3 篇」时，节奏就跑通了

订阅是手段，不是目的。**信号密度比信源数量重要**。
