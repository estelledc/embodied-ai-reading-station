## 学习进度

我是初学者，零编程基础，靠 AI 一句一句陪我读论文、查名词。这页不是工作汇报，是我自己的学习日记。

> **具身智能（Embodied AI）**：让机器人像人一样，能看、能听、能听懂话再动手做事。

> **论文（paper）**：研究者把一项新发现写成的几十页学术文章，里面会讲他们做了什么、用了什么办法、效果有多好。

读到这里你应该懂了：13 篇论文 = 我这个学期要啃的 13 篇大作文。

### 站点进展

- [x] 建成 156 篇论文笔记静态学习站（[在线访问](https://estelledc.github.io/embodied-ai-reading-station/)）
- [x] 22 章导读完成（guide/ch01 ~ ch22）
- [x] 11 主题 × 3 篇 primer 入门体系
- [x] 站点功能：30 天路径 / 主题 / Timeline / Graph / Heatmap / 搜索 / PWA
- [x] 笔记质量提升：**2026-07-01 完成 156/156 全部升级为 deep-read**（见 `DEEPREAD-BATCH.md`）

### 先打基础（5 篇入门轨道，learn track）

类比：把 13 篇论文当高考压轴大题，那这 5 篇就是先把课本和公式表过一遍。

- [x] 前置知识地图 — 我现在还缺什么数学和计算机基础，列了一张清单
- [x] 名词小词典（glossary）— 把"向量""夹角""波长"这种词整理成查得到的字典
- [ ] 综述类文章（surveys）— 研究者写给入门者看的"领域全景图"，等我读完前 3 篇论文再回头看
- [ ] 在线小教程（tutorials）— 用浏览器就能跑的代码作业，类似化学实验的虚拟版
- [ ] 学术社区入口（community）— 找哪些公众号 / 论坛 / 大学课程在持续讲这块

### 13 篇论文（按主题分组）

读法：每篇先让 AI 帮我画"一句话讲清这篇在干嘛"，再决定要不要逐段精读。

> **VLM**：Vision-Language Model，看图说话的 AI，类似你给它看猫的照片它能写"一只橘猫"。
> **VLA**：Vision-Language-Action，看图听话还能动手的 AI，比 VLM 多了"动作"这一步。

主线三连（6 月 30 日前必须挑一篇做英文汇报）：

- [x] **LLaVA** — VLM 最经典入门款（✅ 已完成 14 页英文 deck → `deck/index.html`）
- [ ] SayCan — 让机器人把"我想喝水"拆成"走过去 → 拿杯子 → 倒水"（deep-read 笔记已就绪，等本人消化）
- [ ] OpenVLA — 端到端的 VLA，看图听话直接出动作（deep-read 笔记已就绪，等本人消化）

3D 与多模态扩展：

- [ ] 3DShape2VecSet — 怎么把一个 3D 物体压成一串数字让 AI 看懂（deep-read 笔记已就绪，等本人消化）
- [ ] MLA — 给机器人装"多模态大脑"的方案（deep-read 笔记已就绪，等本人消化）
- [ ] VLAS — VLA 的另一种做法（deep-read 笔记已就绪，等本人消化）

世界模型（最难，最后啃）：

- [ ] Cosmos Policy — 让 AI 在脑内"预演"动作再决定怎么做（deep-read 笔记已就绪，等本人消化）

射频感知（用电磁波看东西，类似蝙蝠用超声波）：

- [ ] CartoRadar (RF-SLAM) — 用 wifi 一样的电磁波画屋子地图（deep-read 笔记已就绪，等本人消化）
- [ ] mmCLIP — 让 AI 既看图又"听"电磁波回声（deep-read 笔记已就绪，等本人消化）
- [ ] mmNorm (NLOS mmWave) — 隔着墙看人（deep-read 笔记已就绪，等本人消化）

听觉感知（让 AI 像戴耳机一样听清楚目标声音）：

- [ ] Proactive Hearing — 主动选你想听的人（deep-read 笔记已就绪，等本人消化）
- [ ] NeuralAids — 神经网络助听器（deep-read 笔记已就绪，等本人消化）
- [ ] Acoustic Swarms — 一群小麦克风协作分离声音（deep-read 笔记已就绪，等本人消化）

### Task 1 状态

- [x] 选定论文：**LLaVA (Visual Instruction Tuning)**
- [x] 完成 14 页英文 deck（`deck/index.html`，atelier-zero 风格，中英双语）
- [ ] 找学长（张瑞杰 or 王宁）约汇报时间
- [ ] 汇报完成

### 下一步（今天最好奇的两个问题）

1. LLaVA 是怎么做到"既看懂图、又听懂话"的？图片在 AI 眼里到底变成了什么样的一串数字？
2. OpenVLA 让机器人"出动作"，那"动作"在电脑里长什么样？是一串坐标还是别的东西？
