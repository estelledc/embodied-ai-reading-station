# 任务论文核验记录（2026-09）

这份记录列出 13 篇任务论文笔记和 LLaVA deck 在 2026-09-27 这一轮核对中改正的地方，以及还没能确认、留给人工核对的地方。

- **谁核对的**：AI agent（Cursor Cloud Agent）。做法是逐条对照仓库里的原文解析文本 `papers/<slug>/paper.md`；少数条目另查了 arXiv、Crossref 和 Hugging Face 上的公开元数据，表里写明了出处。
- **这不是人工复核**：`papers/provenance.json` 里这些笔记的 `human_verification` 仍然是 `UNVERIFIED`。只有真人逐条确认过，才能改成 `VERIFIED`。
- **只改可证伪的事实错误**：数字、名称与归属、机制描述、时间线，以及同一篇笔记里的前后矛盾。类比、讲法和篇幅没有动。
- **级别**：P0 表示核心结论、关键数字或论文身份写错了；P1 表示其余可证伪的错误，或把原文没有的数字写成了论文结果。
- **位置**：修改前的行号，对应 `main` 上提交 `7bc7584` 里的文件。

## 汇总

| 文件 | P0 | P1 | 待人工核对 |
|---|---:|---:|---:|
| [notes/llava.md](../notes/llava.md) | 9 | 16 | 8 |
| [deck/index.html](../deck/index.html) | 5 | 6 | 4 |
| [notes/saycan.md](../notes/saycan.md) | 1 | 13 | 3 |
| [notes/openvla.md](../notes/openvla.md) | 5 | 17 | 2 |
| [notes/tracevla.md](../notes/tracevla.md) | 0 | 1 | 0 |
| [notes/openvla-oft.md](../notes/openvla-oft.md) | 0 | 1 | 0 |
| [research-task.md](../research-task.md) | 0 | 1 | 0 |
| [notes/3dshape2vecset.md](../notes/3dshape2vecset.md) | 2 | 10 | 5 |
| [notes/vlas.md](../notes/vlas.md) | 1 | 13 | 4 |
| [notes/mla.md](../notes/mla.md) | 4 | 15 | 4 |
| [notes/cosmos-policy.md](../notes/cosmos-policy.md) | 6 | 13 | 4 |
| [notes/rf-slam.md](../notes/rf-slam.md) | 2 | 13 | 2 |
| [notes/mmclip.md](../notes/mmclip.md) | 6 | 13 | 8 |
| [notes/nlos-mmwave.md](../notes/nlos-mmwave.md) | 1 | 8 | 1 |
| [notes/proactive-hearing.md](../notes/proactive-hearing.md) | 4 | 12 | 2 |
| [notes/neuralaids.md](../notes/neuralaids.md) | 2 | 12 | 3 |
| [notes/acoustic-swarms.md](../notes/acoustic-swarms.md) | 3 | 7 | 10 |
| **合计** | **51** | **171** | **60** |

## 怎么用这份记录

每一行都可以当成一道小练习：打开对应的 `paper.md`，找到"依据"里的那句原文，自己判断改得对不对。

"待人工核对"里的条目更适合练手：它们要去查论文 PDF、官方代码或作者主页才能定论。核对完一条，就在这里写下你的结论、依据和日期；确认整篇笔记都核过之后，再按 [PROVENANCE.md](../PROVENANCE.md) 的流程登记 `human_verification`。

## 逐篇记录

### [notes/llava.md](../notes/llava.md)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|---|---|---|---|---|
| 1 | 123 | 人工写一条这种题要好几美元，GPT-4 自动出题只要几美分——便宜 100 倍 | 除了每类题开头那几条人工写的示范，其余题目全由 GPT-4 自动生成…（论文没有给出具体的成本对比） | papers/llava/paper.md:163-164 "we first manually design a few examples. They are the only human annotations"；全文无成本数字 | P1 |
| 2 | 124 | 只要把"复杂推理"那 77K 条去掉，分数会掉很多 | 只留对话题、把"详细描述"和"复杂推理"都去掉，总分会从 85.1 掉到 73.8（论文没有做…的实验） | papers/llava/paper.md:406 表 4 只有 "Conversation" 73.8 (-11.3) 等行，没有单独去掉复杂推理的一行 | P0 |
| 3 | 158 | 用一个 1024→4096 的数字表格（W）把每个向量翻成 4096 维 | 用一个 1024→5120 的数字表格（W）把每个向量翻成 5120 维（默认的 13B 版；7B 版是 1024→4096） | 已确认事实：lmsys/vicuna-13b-v1.3 config.json "hidden_size": 5120，7B 为 4096；paper.md:613 "our best 13B model" | P0 |
| 4 | 170 | 只用一层数字表格，参数只占整个模型的 0.03% | 只用一层数字表格（一个线性层），参数在整个模型里只占极小一部分 | 已确认事实：0.03% 无出处，按要求删除；papers/llava/paper.md 全文无此数字 | P1 |
| 5 | 171 | 作者两周内就跑完了十几组对比实验 | 论文的原话是：这种轻量设计让作者能快速迭代"以数据为中心"的实验 | papers/llava/paper.md:223-224 "lightweight, which allows us to iterate data centric experiments quickly" | P1 |
| 6 | 185 | 2. 第一阶段：用这些词造句、回答问题 | 2. 第二阶段：用这些词造句、回答问题 | notes/llava.md:184 已是"1. 第一阶段：看图认词"，第 2 步标签重复 | P1 |
| 7 | 225 | 跳过 Stage 1，分数会掉 5 个点；完全不做 Stage 2 那种指令训练，分数掉 60 多个点 | 跳过 Stage 1，ScienceQA 准确率会掉 5 个点；…LLaVA-Bench (COCO) 分数掉 60 多个点（两个数字来自不同评测…） | papers/llava/paper.md:610-611 "performance drops to 85.81% accuracy"（ScienceQA）；:406 表 4 "No Instruction Tuning" 21.5 (-63.6) | P1 |
| 8 | 251、253 | 这套打分方式被后来很多论文继续用——LLaVA 算是开了头；作者顺手发明了一套"让 AI 当裁判"的打分体系 | 这套"GPT-4 当裁判"的打分思路借鉴自 Vicuna（原文 "Inspired by [9]"）…搭出了第一个多模态指令跟随评测基准 | papers/llava/paper.md:387 "Inspired by [9], we leverage GPT-4 to measure the quality"，[9] 为 Vicuna（:687-689）；:624 "the first benchmark" | P0 |
| 9 | 275 | ScienceQA（一套从小学到高中的物理化学生物多选题）上的正确率 | ScienceQA（约 2.1 万道…多模态多选题，涵盖自然科学、社会科学、语言科学三大类）…再和纯文本 GPT-4 "合议"得到的成绩 | papers/llava/paper.md:528-529 "21k multimodal multiple choice questions … across 3 subjects"；:574-575 NAT、SOC、LAN | P1 |
| 10 | 277 | 第一次有"通用聊天 AI"在标准学术题库上赢过为这道题专门设计的方法，也赢过普通人 | LLaVA 单独答是 90.92%，已经超过普通人（88.40%），但还略低于…专门设计的方法（91.68%）；和 GPT-4 "合议"之后才以 92.53% 拿下第一 | papers/llava/paper.md:536-537 "It yields 90.92% accuracy, which is quite close to the SoTA 91.68%"；:547 合议 92.53% | P0 |
| 11 | 289 | 说明这套方法对"小模型"也很友好——你用消费级显卡也能跑 | 7B 版用消费级显卡也能跑。不过论文自己的解读是：这 1.08 分的差距"说明了模型规模的重要性"… | papers/llava/paper.md:614 "1.08% lower than 90.92%, demonstrating the importance of model scale" | P1 |
| 12 | 291、293 | 训练总耗时 ≈ 18 小时（8 卡）；Stage 1 (4h) + Stage 2 (10h) + 微调 (4h) | 训练总耗时 ≤ 14 小时（8 卡）；Stage 1 (≤4h) + Stage 2 (≤10h)。…"微调 ScienceQA (≤4h)"是换一套数据重做 Stage 2，不是再叠一步 | papers/llava/paper.md:1292-1293 "within 4 hours. Finetuning on Instruct-158K completes within 10 hours"；:294 "two specific use case scenarios" | P0 |
| 13 | 294 | 整套训练费用 $300-500。研究生用零花钱都能复现 | 不到 14 小时就能跑完（论文没有报告具体费用），这个算力量级很多高校实验室都能复现 | papers/llava/paper.md:1292 "We train all models with 8× A100s"；全文无费用数字 | P1 |
| 14 | 296 | 决定胜负的是练习题质量和多样性，不是模型有多大 | 指令练习题是前提（不做指令微调，COCO 评测直接掉 63.6 分）；模型大小也有影响（13B 换成 7B，ScienceQA 掉 1.08 分） | papers/llava/paper.md:614 "demonstrating the importance of model scale" | P1 |
| 15 | 306 | 只用对话类数据是 73.8 分，加上详细描述和复杂推理两类后涨约 7 分 | 只要再加入一小部分（5% 详细描述 + 10% 复杂推理）就涨约 7 分（到 80.5），三类全用是 85.1 | papers/llava/paper.md:406 表 4 "Conv + 5% Detail + 10% Complex" 80.5；:436 "adding a small amount of detailed description" | P1 |
| 16 | 339 | 把眼睛输出的 1024 维向量变成嘴巴认识的 4096 维向量 | …变成嘴巴认识的 5120 维向量（13B 版；7B 版是 4096 维） | 已确认事实：Vicuna-13B "hidden_size": 5120，7B 为 4096 | P0 |
| 17 | 357 | LLaVA 不是万能的，论文自己也老实交代了几个翻车场景 | 下面前三条是论文自己老实交代的翻车场景，后两条是论文没写、但读者需要知道的补充 | papers/llava/paper.md:455-462（拉面、酸奶、"bag of patches"）、:980 "Hallucination"；全文无"老师天花板"和商用条款内容 | P1 |
| 18 | 360、366 | 小字看不清…所以问"这家拉面店叫什么名字"它常常答错；小结"精细识别、小字、商用" | 细节看不清、知识不够…论文把两道题列为暴露弱点的难题…；小结改为"精细识别、知识面、商用" | papers/llava/paper.md:455-456 "a large knowledge coverage and multilingual understanding capability" | P1 |
| 19 | 377 | 这就是 PaLM-E、RT-2、OpenVLA 这些后续工作 | OpenVLA 就是这样的后续工作…PaLM-E（2023.3）比 LLaVA 还早，RT-2（2023.7）建在 PaLI-X / PaLM-E 上…不是 LLaVA 的后续 | papers/palm-e/paper.md:35 "arXiv:2303.03378v1 [cs.LG] 6 Mar 2023"；另见 papers/rt-2/paper.md:22、252，papers/openvla/paper.md:250 | P0 |
| 20 | 421 | 这也解释了 LLaVA 为什么在 OCR、细粒度识别上弱 | 论文附录也提到，OCR…在训练数据里"rarely covered"，LLaVA 却表现出不错的 OCR 能力…细粒度识别还受限于分辨率和知识面 | papers/llava/paper.md:1035-1036 "impressive OCR … which is rarely covered in our training data" | P1 |
| 21 | 448 | 13B 模型换成 7B 只掉 1.08 分（90.92% → 89.84%），但去掉指令数据掉 63.6 分 | …只掉 1.08 分（ScienceQA，90.92% → 89.84%），而去掉指令数据掉 63.6 分（LLaVA-Bench COCO，85.1 → 21.5） | papers/llava/paper.md:613-614 "This yields 89.84% accuracy"（ScienceQA）；:406 表 4 21.5 (-63.6)（LLaVA-Bench COCO） | P1 |
| 22 | 453 | 钱花在数据上，不是模型上。模型减半几乎不伤性能，说明这个任务对参数规模不敏感 | 这两个数字来自不同评测…不能直接比大小；论文还明确说这 1.08 分"说明了模型规模的重要性" | papers/llava/paper.md:614 "demonstrating the importance of model scale" | P0 |
| 23 | 474 | 图向量经过一个数字表格 → 拼到文字前面 → 当成普通聊天去训练 | 图向量经过一个数字表格 → 和文字拼在一起 → 当成普通聊天去训练 | papers/llava/paper.md:236 式 (2) 首轮 "Randomly choose" [X_q, X_v] 或 [X_v, X_q] | P1 |
| 24 | 503 | AWS 租 8 卡 A100 大约 $32/小时，整套训练 ~$580 | 论文用的是 8 张 A100：聊天版预训练 + 指令微调合计不到 14 小时（论文没有报告费用） | papers/llava/paper.md:1292-1293 "within 4 hours. Finetuning on Instruct-158K completes within 10 hours"；全文无费用 | P1 |
| 25 | 523、529 | 衍生：PaLM-E（2023）— Google 把 LLaVA 思路扩展到机器人控制：输入图 + 状态，输出动作 | 机器人方向：PaLM-E（2023.3）…比 LLaVA（2023.4）还早…输出文字形式的计划/决策，再交给底层控制程序去执行动作 | papers/llava/paper.md:111-112 "PaLM-E [13] is an LMM for embodied AI"；papers/palm-e/paper.md:282 "can translate these decisions into low-level actions" | P0 |

未修改（待人工核对）：

- 273 标题"数字 3：理科选择题 92.53%"：数字本身正确（与 GPT-4 合议后的成绩），按结构要求保留标题，正文第 275、277 行已说明。
- 319 "读论文标题里的"SoTA""：SoTA 出现在摘要（paper.md:22）而非标题；不在原审校条目内，未改。
- 364（及 461、491 同类表述）OpenAI 条款限制商用：仓库内无条款原文可核；357 已标明属论文外补充，条款内容待人工核对。
- 372 时间线把 Qwen-VL、InternVL 排在 LLaVA-NeXT（2024）之后：仓库内无这些模型的发布日期资料，顺序待人工核对。
- 475 "你会发现是练习题，不是模型大小"：相对比较大致成立（去掉指令数据 -63.6 对换成 7B -1.08），但两数来自不同评测，措辞待人工决定。
- 495 "LLaVA-1.5 把翻译器改成 2 层，又涨了 2 分"：按要求跳过；LLaVA 初代论文无法核对该数字。
- 539 梗图原文引语：与论文转述（paper.md:1052-1053 "Sometimes I just look at pictures of the Earth from space"）措辞有出入，原图文字待人工核对。
- 541 "它真的能解释出……"：表 9 说明（paper.md:1082 "LLaVA and GPT-4 both explain the meme and its humor"）支持大意，未改。

### [deck/index.html](../deck/index.html)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|---|---|---|---|---|
| 1 | 第 2 页，54、59 | 也是其余主题（OpenVLA / SayCan / Cosmos）默认的视觉接入范式；default visual front-end of nearly every later paper | "视觉编码器 + 投影层 + LLM"接入范式被 OpenVLA（经 Prismatic）沿用；SayCan（2022.4）早于 LLaVA，Cosmos Policy 基于视频生成模型…（英文同步） | research-task.md:33 "[2204.01691]"、:55 "Cosmos-Predict2"；papers/openvla/paper.md:241 "we build on the Prismatic-7B VLM" | P0 |
| 2 | 第 4 页，89、97 | （BLIP-2、Flamingo）…一让它"按指令回答"就退化成"描述图片"；so they fall back to plain captioning | （BLIP-2、Flamingo / OpenFlamingo）…论文实测 BLIP-2 和 OpenFlamingo，一让它们"按指令回答"就退化…（英文同步） | papers/llava/paper.md:381 "BLIP-2 and OpenFlamingo focus on describing the image"；:327 只测了这两个模型 | P1 |
| 3 | 第 7 页，162 | 把 H_v 当成几个特殊词，拼到指令文本前，端到端解码答案 | 把 H_v 当作一串视觉 token，和第一轮指令拼在一起（训练时随机放在问题前或后），端到端解码答案 | papers/llava/paper.md:223 "we have a sequence of visual tokens"；:236 式 (2) "Randomly choose" | P1 |
| 4 | 第 10 页，215 | near-GPT-4 reasoning at 1/100 the data | near-GPT-4 reasoning, from an instruction set of only ~80K unique images | papers/llava/paper.md:377-378 "a small multimodal instruction-following dataset (∼80K unique images)"；全文无 1/100 | P1 |
| 5 | 第 10 页，220 | Generated by GPT-4 — no human annotation | Generated by GPT-4 — humans wrote only a few seed examples | papers/llava/paper.md:164 "They are the only human annotations we have during data collection" | P1 |
| 6 | 第 10 页，222 | "At ~1% the data of contemporaries, the simplest possible adapter outperformed…" | "Thanks to visual instruction tuning, LLaVA achieves significantly better performance…" — Liu et al. 2023, §5.1 | papers/llava/paper.md:447-448 "Thanks to visual instruction tuning … BLIP-2 (+29%) and OpenFlamingo (+48%)"；全文无 ~1% | P0 |
| 7 | 第 12 页，261、262 | Quietly the visual front-end of every VLA that followed；悄然成为后续所有 VLA 模型的视觉接入层 | Quietly the template for the visual front-end of open VLAs like OpenVLA；悄然成为 OpenVLA 等开源 VLA 视觉接入层的模板 | papers/rt-2/paper.md:252 "PaLI-X (Chen et al., 2023a) and PaLM-E"；另见 notes/pi0.md:22（PaliGemma）、research-task.md:49、55 | P0 |
| 8 | 第 12 页，267 | OpenVLA / RT-2 / π0 都复用 "CLIP + 投影层 + LLM" 范式（投影层从单层 MLP 升级到 2-layer…） | OpenVLA 沿用"视觉编码器 + 投影层 + LLM"范式（DINOv2 + SigLIP → 2-layer MLP → Llama 2）…三者的视觉编码器都不是 CLIP | papers/openvla/paper.md:241-242 "a small 2-layer MLP projector" "pretrained SigLIP [79] and DinoV2 [25]"；papers/rt-2/paper.md:1060、1081；notes/pi0.md:22 | P0 |
| 9 | 第 12 页，268 | SayCan / PaLM-E 把 LLaVA 视觉 token 化方案当作 embodied reasoning 的简化替代 | SayCan / PaLM-E 不是下游：两者都早于 LLaVA（2022.4 / 2023.3），LLaVA 论文还把 PaLM-E 列为已有工作 | papers/llava/paper.md:111-112 "PaLM-E [13] is an LMM for embodied AI"；research-task.md:33；papers/palm-e/paper.md:35 | P0 |
| 10 | 第 12 页，274 | 成为多模态训练的标配——RT-2、OpenVLA cotraining 数据都有它的影子 | 成为多模态训练的标配（删去后半句） | papers/openvla/paper.md:498 "rather than being finetuned solely on robot data, like OpenVLA"；papers/rt-2/paper.md:302 | P1 |
| 11 | 第 13 页，293 | 13 篇论文资料就位（10 篇带图 md + 1 篇网页 + 3 篇 stub） | 13 篇论文资料就位 | 括号内 10 + 1 + 3 = 14，与"13 篇"自相矛盾 | P1 |

未修改（待人工核对）：

- 第 7 页 163 行英文类比句：不是 162 行的对译，也不含被纠正的事实，保留。
- 第 12 页 275 行"极简优于复杂（simplicity wins）成为后续 VLM 设计准则"：观点性表述，仓库资料无法核实；论文把领先归因于指令微调（paper.md:447），待人工决定。
- 第 12 页小标题"下游影响 · downstream"：268 行已改为说明 SayCan / PaLM-E 不是下游；按规则不删元素，是否移除该条待人工决定。
- 第 13 页 293 行：只删去加总为 14 的分项，6 月时资料的实际构成待人工核对后再决定是否补回。

### [notes/saycan.md](../notes/saycan.md)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|---|---|---|---|---|
| 1 | L138 | 菜单上所有 551 个技能的文字描述 | 本次实验启用的技能…（论文一共提出 551 个技能，实验只用了其中…一部分，涉及 15 种物体、5 个地点） | papers/saycan/paper.md L334–337 "we propose 551 skills… we utilize the skills that are most amenable…"；L349 15 objects、5 known locations | P1 |
| 2 | L184–185 | 每个技能都配了一个"小裁判"（价值函数 / affordance function） | 打分方式因技能而异：pick 用 RL 训出的价值函数，go to 按离目标的距离算分，done 固定给 0.1 | papers/saycan/paper.md L1501 "value functions from RL"；L1543 "based on the distance"；L1557 terminate = 0.1 | P1 |
| 3 | L308、L390、L434 | "给我点不含咖啡因的饮料"…LLM 打分时反而把相关选项的分推高了 | 论文举的例子是"bring me a snack that isn't an apple"…从底层语言模型继承来的老问题 | papers/saycan/paper.md L487 "struggles with negation (e.g., “bring me a snack that isn’t an apple”)"；L488 咖啡因是 "ambiguous references" 的例子 | P1 |
| 4 | L315 | 3. bring it to you, 4. done | 3. bring it to you, 4. put down the lime soda, 5. done | papers/saycan/paper.md L610 "3. bring it to you, 4. put down the lime soda, 5. done" | P1 |
| 5 | L318 | 减少了因为表面词汇匹配导致的错误 | 论文展示加上思维链后，模型能处理否定句和需要推理的任务 | papers/saycan/paper.md L643 "the model can handle negations and tasks that require reasoning" | P1 |
| 6 | L322、L340、L394 | 中文、法语、西语各出了 4 条指令（共 12 条），11 条规划完美；12 条非英语指令中 11 条… | 3 条英文指令分别译成中文、法语、西语（连英文共 12 条），11 条规划成功…；9 条非英语指令中 8 条… | papers/saycan/paper.md L1894–1895 Table 8 "…4-12 are the Chinese, French and Spanish translation of first 3 queries"；仅 L1887 法语一条为 0.0 | P1 |
| 7 | L337 | 自由生成 + 硬匹配 74%："打分"比"生成再匹配"更稳定 | 和"只打分、不加 affordance"（67%）差不多，都低于 SayCan 的 84%… | papers/saycan/paper.md L518–520 "The No VF and Generative approaches performed similarly, achieving 67% and 74%" | P1 |
| 8 | L339、L346、L382、L530 | PaLM 8B（极小 LLM）38%；从 PaLM 8B → 540B，规划成功率从 38% 跃升至 84% | …生成式消融里，PaLM 8B → 540B 从 38% 升到 74%（62B 已有 72%） | papers/saycan/paper.md L1787 Table 6 "Compared only with the generative outputs (no value function)"，L1783 为 74%/72%/38%/43%；84% 是 L533 的完整 PaLM-SayCan | P0 |
| 9 | L350、L390、L436 | 长程任务中 65% 的失败是 LLM 提前输出 "done"；论文报告 65% 的 LLM 失败属于这一类 | 长程任务的失败大多来自 LLM 提前输出 "done"（全部错误中 65% 来自 LLM、35% 来自 affordance） | papers/saycan/paper.md L485–486 "most failures were a result of early termination by the LLM"；L489 "65% of the errors were LLM failures" | P1 |
| 10 | L440、L511、L538、L560 | 对 551 个技能各打一次分；SayCan 用了 551 个预定义技能 | 对所有候选技能逐个打分；SayCan 论文为厨房设计了 551 个预定义技能 | papers/saycan/paper.md L1493–1494 "are not naturally part of long-horizon tasks and thus we do not utilize them" | P1 |
| 11 | L440、L560 | 后续的 RT-2 把整个流程压缩到 200 毫秒；…快了两个数量级 | 后续 RT-2 的 55B 模型约 1–3 Hz，5B 版约 5 Hz（约 200 毫秒/步） | papers/rt-2/paper.md L323–325 "RT-2-PaLI-X-55B model, can run at a frequency of 1-3 Hz… around 5 Hz" | P1 |
| 12 | L476 | LLaVA 说明…就不需要单独的 value function…→ 这正是 PaLM-E 和 RT-2 走的路 | LLaVA 代表"给 LLM 装上眼睛"的 VLM 路线…PaLM-E（2023.03，比 LLaVA 还早一个月）… | arXiv 2303.03378（PaLM-E）早于 2304.08485（LLaVA），RT-2 为 2307.15818；papers/llava/paper.md 无 robot、affordance 字样 | P1 |
| 13 | L477 | OpenVLA / VLAs / MLA（Ch12） | OpenVLA / VLAS / MLA（Ch12） | guide/ch12-openvla-vlas-mla.md L1 "# Ch12: 端到端 VLA (II)——OpenVLA / VLAS / MLA，开源与扩展" | P1 |
| 14 | L586（Huang et al. 条目） | LLM 直接自由生成步骤…SayCan 加了 affordance 乘法后性能从 67% 跳到 84% | 论文里的 Generative 基线大致就是这种做法，规划成功率 74%；SayCan（打分 × affordance）是 84% | papers/saycan/paper.md L698–699 "roughly corresponding to the “Generative” baseline"；L519 Generative 74% | P1 |

未修改（待人工核对）：
- L198（空手时 place 的 affordance ≈0.0）：论文自相矛盾，L1464–1465 称 place 用 "an affordance based on the gripper state"，L1552 又称 "We assume place is always possible"（取 1.0），无法判定实验实际用哪种。
- L294、L438（换厨房、换场景就要重新标定 value function）：论文未提及；L1530 只说校准参数 "determined empirically"，既不能证实也不能证伪。
- L386（"说明策略对训练环境的依赖性很强"）：84%/74%、81%/60% 数字正确，但论文 L414–415 的解读是 "generalize reasonably well to the full kitchen"，与笔记相反，是否改写需人工判断。

### [notes/openvla.md](../notes/openvla.md)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|---|---|---|---|---|
| 1 | L22、L292 | 用 7B 参数全面打败闭源 55B 的 RT-2-X；在真机器人上全面超越闭源大哥 | …在 29 个任务上平均比…RT-2-X 高 16.5 个百分点（只有语义泛化略逊）；总体超过闭源大哥（语义泛化除外…） | papers/openvla/paper.md L59–60 "by 16.5% in absolute task success rate across 29 tasks"；L415 "in all categories except for semantic generalization" | P0 |
| 2 | L68 | 在 Google 内部的机器人数据上微调 | 在 Open X-Embodiment 机器人数据（约 35 万条轨迹）上微调 | papers/openvla/paper.md L193 "RT-2-X [1] trains a 55B-parameter VLA policy on the Open X-Embodiment"；L501 "vs. 350k for RT-2-X" | P1 |
| 3 | L71 | 权重不公开，代码不公开，API 都没有 | 只有有限开放的推理 API，而且不支持微调 | papers/openvla/paper.md L572 "fine-tuning of RT-2-X is not supported through its inference API"；L745–746 "alpha access to the RT-2-X API" | P1 |
| 4 | L156 | 256 = 2^8，计算效率高。精度约 0.04mm 级别，对桌面操作足够 | 论文说明 256 档是沿用 RT-2（Brohan et al.）的做法…每档约 0.22/0.32/0.26 毫米 | papers/openvla/paper.md L266–268 "Following Brohan et al. [7]… 256 bins… between the 1st and 99th quantile"；HF openvla/openvla-7b config.json norm_stats.bridge_orig：x/y/z 的 q01–q99 区间 5.70/8.26/6.63 cm | P1 |
| 5 | L242 | 显存需求：从 >200GB 降到 60GB（单卡 A100 可做） | 全量微调 163.3GB（要 2 张卡用 FSDP 分片）→ LoRA 59.7GB（单张 80GB A100 可做） | papers/openvla/paper.md Table 1 L660 "Full FT … 163.3 GB*"，L652 "Sharded across 2 GPUs with FSDP"；L666 LoRA rank=32 59.7 GB | P1 |
| 6 | L248、L487 | RTX 4070（12GB）就能跑；4-bit 量化后约 7GB（RTX 4070 够） | 按显存算，12GB 显存的显卡就放得下（论文没有在 RTX 4070 这类显卡上实测） | papers/openvla/paper.md Table 2（img_057）int4 VRAM 7.0 GB；全文无 "4070" | P1 |
| 7 | L256–257 | A100 ~8 Hz；4-bit 量化 4070 ~4 Hz | A100（bf16）约 3 Hz（Fig. 6 读图）；A5000（4-bit）~3 Hz | papers/openvla/paper.md Fig. 6（img_057）A100 bf16 柱高约 3；L707 "4-bit quantized models can run at 3Hz on the A5000" | P1 |
| 8 | L259 | 改完只多几百万参数，存盘只多几十 MB | rank=32 时约多 9760 万（97.6M）可训练参数，约占总参数的 1.4% | papers/openvla/paper.md Table 1 L666 "LoRA, rank=32 … 97.6"（×10^6）；L643 "fine-tuning only 1.4% of the parameters" | P1 |
| 9 | L275–276（及表下新增注） | Octo/RT-1-X：Bridge 24.7%/18.8%，Google —/49.2% | Octo/RT-1-X：Bridge 20.0%/18.5%，Google 26.7%/33.3%；表下注明 Google 上两者相当 | papers/openvla/paper.md Table 4 L1735；Table 6 L1891 均值 33.3/26.7/78.3/85.0，L1869 "bold the mean success rate for both" | P1 |
| 10 | L277–278 | 语义泛化 60% vs 80%；语言定位 83% vs 67%（OpenVLA vs RT-2-X） | 语义泛化（Bridge 新概念，4 任务）36.3% vs 38.8%；语言定位（…3 任务）90.0% vs 85.0% | papers/openvla/paper.md Table 4 L1726–1732 逐任务求均值：语义泛化 14.5/40 vs 15.5/40，语言定位 27/30 vs 25.5/30 | P0 |
| 11 | L284 | 在 7 个新任务上 LoRA 微调后的 OpenVLA 比从零训练的 Diffusion Policy 高 20.4% | 全量微调后的 OpenVLA…平均高 20.4 个百分点（Fig. 5：63.8% vs 43.4%）；LoRA 另在 Table 1 中测过… | papers/openvla/paper.md L514 "full finetuning of all model parameters"；Fig. 5（img_054）标注 63.8% 与 43.4% | P1 |
| 12 | L302 | 高 46 个百分点（70.6% vs 24.7%） | 高 50.6 个百分点（70.6% vs 20.0%） | papers/openvla/paper.md Table 4 L1735 "Mean Success Rate"：Octo 20.0 ± 2.6%，OpenVLA 70.6 ± 3.2% | P1 |
| 13 | L306 | (1) 更大更干净的训练数据…(3) 解冻视觉编码器让模型适应机器人视角 | (2) 更仔细的数据清洗（如去掉 Bridge 里的全零动作）；(3) 融合 SigLIP + DINOv2 的双视觉编码器… | papers/openvla/paper.md L501–503 "more careful cleaning… filtered out all-zero actions… a fused vision encoder" | P1 |
| 14 | L314、L465 | （如识别 Taylor Swift）上更强（80% vs 60%）；在语义泛化上输给 RT-2-X（60% vs 80%） | 略强（Bridge 语义泛化 38.8% vs 36.3%；…Taylor Swift 任务 3/5 vs 2/5）；L465 为 36.3% vs 38.8% | papers/openvla/paper.md Table 4 L1726–1729 语义泛化 4 任务 RT-2-X 15.5/40、OpenVLA 14.5/40；Table 6 L1888 Taylor Swift 3 vs 2 | P0 |
| 15 | L358、L499 | 穿针（需要 50+ Hz）；穿针、缝纫需要 30+ Hz | 穿针、剥鸡蛋（需要快速反应）做不了；…需要快速反应的灵巧操作（如穿针、缝纫） | 两处数字互相矛盾（50+ Hz 与 30+ Hz），papers/openvla/paper.md 没有给出穿针、缝纫所需的控制频率 | P1 |
| 16 | L362 | 环状/透明/反光物体是盲区…这是视觉编码器在互联网数据中对这类物体见得少导致的 | 多数策略抓白色胶带卷这种环形物体时，常把末端直接伸进中间的空洞…透明、反光物体论文没有测过 | papers/openvla/paper.md L1571–1572 "most policies struggle to grasp objects with this ring structure"；全文无 transparent、reflective、glass | P1 |
| 17 | L392、L394–395 | VLAs (Embodied AI Survey)：综述了整个 VLA 范式…；MLA (Manipulate-Anything)：…替代路线 | VLAS（语音指令 VLA）：把语音直接接入 VLA…Voice RAG…；MLA（多感官语言-动作模型）：融合 2D 图像、3D 点云和触觉… | papers/vlas/paper.md L21 "integrates speech recognition directly into the robot policy model"，L314 Voice RAG；papers/mla/paper.md L20–23 "encoder-free… 2D images, 3D point clouds, and tactile tokens" | P0 |
| 18 | L421–427 | Ch12: 开源 VLA——OpenVLA / VLAs 综述 / MLA；VLAs 综述提供全景视角；MLA…不需要大规模预训练的替代路线 | Ch12: 端到端 VLA (II)——OpenVLA / VLAS / MLA，开源与扩展；…VLAS 扩展输入模态…；MLA 走无编码器的多感官路线 | guide/ch12-openvla-vlas-mla.md L1 标题；L721 "OpenVLA（开源民主化）、VLAS（语音自然交互）、MLA（encoder-free 新范式）" | P0 |
| 19 | L438（Q1 提示） | 假设工作空间是 50cm，256 档的每档精度 ≈ 50/256 ≈ 2mm。对 PCB 插件（需要 0.1mm）远远不够 | 动作是每一步的末端位移增量，不是工作空间里的绝对坐标…每档约 0.2–0.3 毫米/步…控制频率只有约 6 Hz… | papers/openvla/paper.md L602–603 "all other methods use relative position control"；L377–378 "approximately 6Hz"；HF norm_stats.bridge_orig 每档约 0.22–0.32 mm | P1 |
| 20 | L446（Q2 提示） | 破坏编码器已学到的通用视觉表征 → 语义泛化下降（论文实验确认了这一点） | 可能破坏…（这只是推测：论文附录 D.3 实测解冻后成功率反而更高，80.0% vs 46.7%…） | papers/openvla/paper.md L2355 "80.0% average success versus 46.7% average success from leaving it frozen" | P1 |
| 21 | L454（Q3 提示） | 作者发现 27 epoch 时测试性能仍在上升 | 真机表现会一直提升，直到训练集上的动作 token 准确率超过 95%；最终训练跑了 27 个 epoch | papers/openvla/paper.md L364–365 "continually increasing until training action token accuracy surpasses 95%" | P1 |
| 22 | L462（Q4 提示） | 论文实验也证实在数据极少时 LoRA 效果接近全量微调 | 论文的 LoRA 实验（两个任务分别用 50 和 150 段演示）…但没有专门测只有 10 段演示的情况 | papers/openvla/paper.md L2093–2095 "two FrankaTabletop tasks… (50 and 150, respectively)" | P1 |

未修改（待人工核对）：
- L243（"单卡 5~15 小时"）：论文对应句在解析文本中不完整，img_057 顶部只剩 "an 8x reduction in compute compared to full fine-tuning."；L612 的 5–15 小时是全量微调 "8 A100 GPUs for 5-15 hours per task"，LoRA 单卡时长无法确认。
- L358、L521（OpenVLA-OFT "提到 30 Hz"、"速度 6→30 Hz"）：papers/ 下没有 OpenVLA-OFT 原文，notes/openvla-oft.md L21 写的是"动作吞吐量提高 26 倍"，具体 Hz 需对照 OFT 原文核实。

### [notes/tracevla.md](../notes/tracevla.md)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|---|---|---|---|---|
| 1 | L271 | [Ch12: 开源 VLA——OpenVLA / VLAs 综述 / MLA] | [Ch12: 端到端 VLA (II)——OpenVLA / VLAS / MLA，开源与扩展] | guide/ch12-openvla-vlas-mla.md L1 "# Ch12: 端到端 VLA (II)——OpenVLA / VLAS / MLA，开源与扩展" | P1 |

未修改（待人工核对）：
- 无

### [notes/openvla-oft.md](../notes/openvla-oft.md)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|---|---|---|---|---|
| 1 | L302 | [Ch12: 开源 VLA——OpenVLA / VLAs 综述 / MLA] | [Ch12: 端到端 VLA (II)——OpenVLA / VLAS / MLA，开源与扩展] | guide/ch12-openvla-vlas-mla.md L1 "# Ch12: 端到端 VLA (II)——OpenVLA / VLAS / MLA，开源与扩展" | P1 |

未修改（待人工核对）：
- 无

### [research-task.md](../research-task.md)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|---|---|---|---|---|
| 1 | L40 | 基于 Llama-3 和 SigLIP 的 7B 参数开源模型。 | 原文不改，句末追加：（注：论文实际使用 Llama 2 7B 语言骨干 + DINOv2/SigLIP 双视觉编码器…） | papers/openvla/paper.md L241–242 "7B-parameter Llama 2 language model backbone"；"pretrained SigLIP [79] and DinoV2 [25] models" | P1 |

未修改（待人工核对）：
- 无

### [notes/3dshape2vecset.md](../notes/3dshape2vecset.md)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|---|---|---|---|---|
| 1 | 478–479、495 | IoU 0.963 vs 0.949，Chamfer 0.038 vs 0.043；表格差值 +1.4%、-12% | IoU 0.965 vs 0.953，Chamfer 0.038 vs 0.040…；表格差值 +1.3%、-5% | papers/3dshape2vecset/paper.md:1091–1104 Table 3（img_020.jpg）“mean (all)”行：3DILG 0.953、0.040，Point Queries 0.965、0.038；0.949 全文无出处 | P0 |
| 2 | 481 | 生成 Surface-FPD ↓，0.76，3DILG: 4.03，5.3x 好 | 生成 Surface-FPD ↓，0.76，3DILG: 1.89，约 2.5x 好 | papers/3dshape2vecset/paper.md:1431–1433 Table 6 列序“Grid-8 [3] 3DILG”，“Surface-FPD ↓ 4.03 1.89 2.71 1.87 0.76 0.97”（4.03 属 Grid-8³） | P0 |
| 3 | 245、249–250；355、359–360 | 消融实验（论文 Table 5）；C'=1、4 的生成 FID 为"崩了""可以" | 注明 FID 来自 Table 6；C'=1、4 改为"未报告"；补 C'=8（28.25）、16（27.26） | papers/3dshape2vecset/paper.md:1417–1423 Table 5 只有 IoU、Chamfer；1432–1435 Table 6 只测“C0 = 8 … C0 = 64”，“Rendering-FID ↓ … 28.25 27.26 17.08 24.24” | P1 |
| 4 | 480 | 生成 Rendering-FID ↓，17.08，最强对手 PVD: 270.64，16x 好，生成质量碾压 | 最强对手 3DILG: 24.83，约 1.45x 好（比…PVD 的 270.64 好约 16x…）；生成质量明显更好 | papers/3dshape2vecset/paper.md:1435 Table 6“Rendering-FID ↓ 32.78 24.83 … 17.08”（24.83 为 3DILG）；1447 Table 7“Rendering-FID ↓ 270.64 17.08” | P1 |
| 5 | 482–483 | 多样性 Recall ↑，0.86，NeuralWavelet: 0.57，+51%（未注明只含 chair 类） | Recall ↑（Table 9，chair 类）0.86，3DILG: 0.65，+32%（483 同注） | papers/3dshape2vecset/paper.md:1464–1466 Table 9 chair 列序“3DILG 3DShapeGen AutoSDF NW Ours”，“Recall ↑ 0.65 0.45 0.23 0.57 0.86” | P1 |
| 6a | 446–447 | 一览表"2. 解码"在前、"3. KL 压缩"在后 | 按数据流调换为"2. KL 压缩"在前、"3. 解码"在后 | papers/3dshape2vecset/paper.md:577 Fig. 3“(optional) compression and KLregularization … Finally, the self-attention” | P1 |
| 6b | 321 后（新增） | （原无说明）步骤 4：KL 正则化压缩块 — 再瘦身一道 | 注：这一节和步骤 3 讲的是同一个 KL 压缩模块…它发生在编码之后、解码之前（论文 Fig. 3…） | papers/3dshape2vecset/paper.md:577 Fig. 3“encode them into a set of latent codes … Next, we perform (optional) compression” | P1 |
| 7 | 433 | 在压缩后的卡片盒（16,384 个数字）上做扩散，比在原始点云（几十万个坐标）上做扩散高效得多 | 在经过 KL 规整的卡片盒…上做扩散…更容易学好（Table 7：…17.08 vs…PVD 的 270.64） | papers/3dshape2vecset/paper.md:1251“we use the point cloud of size 2048 as input”；1447 Table 7“Rendering-FID ↓ 270.64 17.08” | P1 |
| 8 | 581 | 2022  Stable Diffusion / 3DILG / Perceiver / EDM | 2021  Perceiver；2022  Stable Diffusion / 3DILG / EDM | papers/3dshape2vecset/paper.md:1657–1658“Joao Carreira. 2021. Perceiver: General perception with iterative attention” | P1 |
| 9 | 604 | 和 Ch08 CLIP 共享"对比学习 + 跨模态对齐"的底层思想 | 都涉及"把图像/文字编码成向量、再拿来当条件"的思路，但本文不做对比学习：条件向量…通过交叉注意力注入去噪网络 | papers/3dshape2vecset/paper.md:948“The cross attention is for injecting condition”；960–962 条件编码器为 ResNet-18、BERT；全文无“contrastive” | P1 |
| 10 | 575、627、714 | CLAY (2024, 同一作者)；627"论文作者后续的"；714"本文作者的续作" | 另一团队（Longwen Zhang 等）的后续工作，沿用本文的卡片盒（VecSet）表示；627、714 同改 | 已确认事实：CLAY 作者为 Longwen Zhang、Ziyu Wang、Qixuan Zhang、Qiwei Qiu 等，https://arxiv.org/abs/2406.13897；本文作者见 papers/3dshape2vecset/paper.md:3–6 | P1 |
| 11 | 200 | 本文用的是正弦/余弦位置编码，和 Transformer 原论文一样。 | 论文只说用一个"逐列"（column-wise）的位置编码函数把 3D 坐标映射成 C 维向量，没有写明具体形式。 | papers/3dshape2vecset/paper.md:775–776“PosEmb : R^3 → R^C is a column-wise positional embedding function” | P1 |

未修改（待人工核对）：
- 97、441 行："6 个子步骤"与"五步一览表"数目不一，且 266、318 行有两个"步骤 4"；按要求不改标题，只做了 6a、6b 两项调整。
- 485 行"在重建和生成两个维度都大幅超越同期方法"：重建 IoU 只比 3DILG 高 0.012（Table 3），"大幅"属措辞强度判断；"好了一个数量级"与 Table 7（270.64 vs 17.08）相符。
- 503 行"（继续加边际收益极低）"：论文只说 M 越大重建越好、受算力所限没有试更大的 M（papers/3dshape2vecset/paper.md:1286–1289），这是笔记对 Table 4 趋势的外推，无法证实或证伪。
- 575、714 行 CLAY"15 亿参数 + 百万级 3D 数据""当前最强开源 3D 生成模型之一"，627 行"CLAY 确实增加了潜向量数量"：仓库内没有 CLAY 原文，未核实。
- 446–447 行一览表"3. 解码"的输入仍写"512 张卡片"：解析版论文只描述了降维投影 FC_μ、FC_σ（papers/3dshape2vecset/paper.md:826），没写解码前是否升回 C 维，未改。

### [notes/vlas.md](../notes/vlas.md)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|---|---|---|---|---|
| 1 | 128 | 这个 5 倍压缩比是实验选出来的甜蜜点——压得更狠（比如到 75 个）会把声音的意思也压没。 | 这个 5 倍压缩沿用的是语音领域的常用做法，论文没有专门对压缩倍数做实验（附录 B.5…），…效果可能还能再提升 | papers/vlas/paper.md:1397–1398（附录 B.5）“we used the x = 5. … we did not perform additional related analyses”；另见 779–780 | P0 |
| 2 | 340、376 | 说明两者的差距完全来自记忆模块而非其他设计；376 行"论文承认这是…的唯一原因" | 论文据此认为两者的差距主要来自记忆模块；376 行改为"论文认为这是…的主要原因" | papers/vlas/paper.md:1306–1307“slightly behind RoboFlamingo mainly due to lack of historical information” | P1 |
| 3a | 182 | 还比纯文字 VLA 的 19.2% 还低——说明模型在训练时已经"习惯"了有档案伴随… | 还低一点。论文只说 Voice RAG 在推理阶段接入，没有说明训练时是否带档案…（另补 VLA+RAG 82.0%） | papers/vlas/paper.md:243“During the inference phase, the output RAG(s) … is also tokenized”；590 Table 2 VLA+RAG 为 82.0% | P1 |
| 3b | 430 | 论文说"去掉 RAG 后 VLAS 性能比从未见过 RAG 的纯文字 VLA 还差…" | Table 2 显示…VLAS 只有 16.0%，比…纯文字 VLA（19.2%）还低一点（论文没有解释这个差别） | papers/vlas/paper.md:619–620 原文只说“when the RAG module is removed, the performance of VLAS significantly degrades” | P1 |
| 3c | 435 | 这是典型的训练-推理分布不匹配（distribution shift）。VLAS 在训练时总是… | 一种可能的解释是训练-推理分布不匹配…；并注明"…没有说明训练时是否带档案，所以这只是推测" | papers/vlas/paper.md:243“During the inference phase, the output RAG(s) … is also tokenized”，未提训练时是否使用 RAG | P1 |
| 4 | 336 | 结论四：定制化任务的三个层次难度递增。…94.7% → …84.6% → Compound… | 结论四：难点集中在偏好任务和多阶段任务的第二阶段。…Compound（复合任务，单阶段）100% | papers/vlas/paper.md:1238“mainly occur in the preference task and the second phase of the compound task”；587 Table 2 Compound 为 100.0% | P1 |
| 5 | 470 | Q7：VLAS 和 RoboFlamingo 的作者都认为两者可以叠加。 | Q7：VLAS 作者认为自己的方法和 RoboFlamingo 的历史建模完全正交、可以叠加。 | papers/vlas/paper.md:1309–1310（附录 B.2）“we can leverage similar approaches … these two methods are completely orthogonal”；仓库无 RoboFlamingo 原文 | P1 |
| 6 | 501 | 这是论文公开承认的工程缺口。 | 论文没有讨论声纹库如何构建，这是本笔记指出的工程缺口。 | papers/vlas/paper.md:320–321 只写“This voiceprint serves as a key to query an external database”，未讨论数据库如何构建 | P1 |
| 7 | 224 | 原因是多卡同步通信的开销大于并行带来的收益，在这种只更新一小部分参数的场景下，单卡更高效。 | 论文只报告了这个经验现象（单卡效果更好），没有解释原因。 | papers/vlas/paper.md:1164–1165“We empirically found that employing a single GPU … yields better performance” | P1 |
| 8 | 20 | 勾勒出 2024 年 VLA 领域"开源化 → 模态扩展 → 轻量化"三条主线 | 勾勒出 2024–2025 年 VLA 领域"开源化 → 模态扩展 → 轻量化"三条主线 | papers/vlas/paper.md:1“Published as a conference paper at ICLR 2025”；MLA 为 2025 年工作（papers/mla/paper.md:736、747 引用 2025 年文献） | P1 |
| 9 | 303 | 整个循环以约 2.5 Hz 运行。 | 机器人每秒大约执行 2.5 个动作（Table 9…）；…整个"推理→执行"循环大约 0.5 Hz（约 2 秒一轮） | papers/vlas/paper.md:1411–1417 Table 9“Actions / Sec (Hz)”VLAS (r=5) 为 2.50；1157–1158“actions from 5 time steps into a single training label” | P1 |
| 10 | 206 | OpenVLA…推理频率约 6 Hz；VLAS…推理频率 2.5 Hz。VLAS 更慢是因为它多了语音编码的开销… | 两者的速度不能直接比：OpenVLA 的约 6 Hz 出自它自己的论文（单张 RTX 4090），硬件和实现都不同… | papers/openvla/paper.md:377–378“runs at approximately 6Hz on one NVIDIA RTX 4090 GPU”；papers/vlas/paper.md:1417 Table 9 同实现下 VLA+ (r=5) 3.60、VLAS (r=5) 2.50 | P1 |
| 11 | 280 | 论文测试了 10 个真人录音，定制化任务准确率从 86.5% 降到 78.6%（Table 2） | 论文用真人录音做了评测…（CALVIN 部分的真人录音来自 10 个人，得分 3.70→3.61，Table 1） | papers/vlas/paper.md:558“real speech instructions recorded from 10 individuals for evaluation”（CALVIN 部分，Table 1 为 3.70、3.61）；618 定制化部分未给人数 | P1 |
| 12 | 221 | 数据：LibriSpeech train-clean-360（干净英文有声书朗读数据）。 | 句末加注：（注：这是论文正文的说法；附录 A 写的正好相反…需以官方代码为准。） | papers/vlas/paper.md:489 正文 Stage I 用“LibriSpeech-360”（499 Stage II 用 -100）；1152 附录 A“Stage I on the train-clean-100 split”（1155 Stage II 用 -360） | P1 |

未修改（待人工核对）：
- 200、320、504 行"推理频率 2.5 Hz"：论文自己把 Table 9 的 Actions/Sec 叫作 "inference speed"（papers/vlas/paper.md:1431），笔记也写明是每秒动作数，未改；只改了 303 行"整个循环"的说法。
- 262 行"直接跳到第三阶段会失败"：论文没有做跳过前两阶段的消融，无法证实也无法证伪。
- 332 行"差 0.06，在统计意义上可以忽略"：Table 1 只给平均值，没有方差或显著性检验。
- 501 行"从代码和实验设置推断"：仓库内没有 VLAS 代码，无法核对。

### [notes/mla.md](../notes/mla.md)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|---|---|---|---|---|
| 1a | 76 | 对比 VLAs Survey 的分类体系，MLA 属于"带辅助预测任务的端到端 VLA" | 从分类上看，MLA 属于"带辅助预测任务的端到端 VLA" | papers/mla/paper.md 全文无“survey”；仓库内各 survey 笔记都没有提到 MLA 或这一分类 | P0 |
| 1b | 381 | 和 VLAs Survey 的关系（VLA 三连第 2 篇）：在 VLAs Survey 的分类体系中… | 和 VLAS 的关系（VLA 三连第 2 篇）…一个"加组件"，一个"减组件" | notes/vlas.md:20“本篇是"VLA 三连"的第二篇”；notes/vlas.md:522“MLA（VLA 三连第三篇）” | P0 |
| 2a | 169–174 | 第 32 层：最差——最后一层已经在同时优化动作输出和未来预测，再加对齐任务导致"任务打架" | 第 4 层"约 64%，四个位置里最差"；第 32 层"约 68%，收益有限…"；另补 8、12 层数值 | papers/mla/paper.md:537 Fig. 6b（img_006.jpg）柱顶标注 4/8/12/32 层依次为 64、70、65、68；566“applying selfsupervision at the 32nd layer yields limited gains” | P0 |
| 2b | 311 | 对比层位置：第 8 层最好，第 32 层最差，中段是甜区 | 第 8 层最好（约 70%，Fig. 6b）；第 4 层最差（约 64%）…；偏浅的第 8 层是甜区 | papers/mla/paper.md:564–565“8th layer yields the best performance … features at relatively shallow layers” | P0 |
| 3 | 327 | 消融实验显示，去掉图像预测掉 X%，去掉点云预测掉 Y%，去掉触觉预测也掉 | …完整 MLA 约 70%，去掉图像预测降到约 60%，去掉点云预测降到约 62%，去掉触觉预测降到约 64% | papers/mla/paper.md:537 Fig. 6c（img_006.jpg）柱顶标注“MLA 70”“w/o 2D 60”“w/o 3D 62”“w/o Tac 64”；591–592“from any modality leads to a drop in accuracy” | P1 |
| 4a | 12、547 | year: 2024；年份：2024/2025 | year: 2025；年份：2025 | notes/mla.md:556 BibTeX“year={2025}”；papers/mla/paper.md:736、747 引用 2025 年文献，824 引用 2026 年文献 | P1 |
| 4b | 383 | 同为 2024 年的 2D VLA SOTA | 2024 年的 2D VLA SOTA（删去"同为"） | MLA 为 2025 年工作：notes/mla.md:556 BibTeX“year={2025}” | P1 |
| 5 | 48 | 这类模型在接触密集任务上的成功率比 MLA 低 12-24 个百分点 | 纯 2D 的 pi0 平均比 MLA 低 12 个百分点，…3D 输入的 SpatialVLA 也低 24 个百分点 | papers/mla/paper.md:515“outperforming π0 and SpatialVLA by an average of 12% and 24%, respectively”；OpenVLA 只出现在 RLBench 仿真部分（587、650） | P1 |
| 6a | 307 | 外挂 3D 编码器不如无编码器 | 论文归因于未来多感官状态生成 | papers/mla/paper.md:522–523“relative to SpatialVLA, MLA’s advantage arises from … future multisensory states” | P1 |
| 6b | 325 | 因为 SpatialVLA 的 3D 编码器和 LLM 之间存在"翻译断层"：编码器没和 LLM 一起预训练过… | 论文对这 24 个点的解释是：MLA 能生成未来多感官状态…；"外挂编码器会掉点"的直接证据则来自消融…下降 7% | papers/mla/paper.md:522–523 把对 SpatialVLA 的优势归因于未来状态生成；572–573“introducing extra encoders not only decreases performance (–7%)” | P1 |
| 6c | 385 | 结果 MLA 赢了 24 个百分点，直接证明了"加编码器不一定好" | 结果 MLA 赢了 24 个百分点；不过论文把这部分优势主要归因于未来多感官状态生成，…直接证据来自消融…下降 7% | papers/mla/paper.md:572–573“introducing extra encoders not only decreases performance (–7%)”；另见 522–523 | P1 |
| 7a | 261 | 输出：7 维（或 14 维）连续动作向量 | 输出：未来 H 步的 7 维（双臂 14 维）连续动作序列 a_{t:t+H} | papers/mla/paper.md:213–214“predicts both the immediate action sequence a_{t:t+H}”；221–226 单臂 7-DoF、双臂 14-DoF | P1 |
| 7b | 271 | 预测步数：1 步动作（但训练时有预测未来关键帧的辅助任务） | 一段动作序列 a_{t:t+H}（训练时另有预测未来关键帧的辅助任务） | papers/mla/paper.md:213–214“predicts both the immediate action sequence a_{t:t+H}” | P1 |
| 8a | 112 | 法向力（按了多紧）、切向力（横向摩擦有多大）、力的方向（两个分量） | 法向力（按了多紧）、切向力（横向摩擦有多大）、切向力方向三项，每项各 2 个分量 | papers/mla/paper.md:261–262“tangential force, and tangential force direction (two components each)” | P1 |
| 8b | 198 | 输出未来关键帧的低维触觉向量（6 个数字） | 输出未来关键帧的低维触觉嵌入（论文没给具体维度） | papers/mla/paper.md:423“the decoder outputs a low-dimensional tactile embedding” | P1 |
| 9 | 507 | 再逐步引入新感官，每次只加一种新东西 | 再在 SFT 阶段一次性加入点云和触觉并启用对比对齐，最后在后训练阶段加入未来多感官预测 | papers/mla/paper.md:444“all multisensory modalities are introduced”（SFT 阶段）；200 后训练阶段做未来状态预测 | P1 |
| 10a | 383 | pi0 也用扩散动作头，但只有 2D 视觉输入 | pi0 用的是流匹配（flow matching）动作头，和 MLA 的 DDPM 扩散头…不是同一种方法 | papers/mla/paper.md:714“A vision-language-action flow model”；440 MLA 用“a standard DDPM objective” | P1 |
| 10b | 395、529、535 | (2D SOTA, 扩散动作)；扩散动作头的详细机制；扩散动作头的教科书式实现 | (2D SOTA, 流匹配动作)；流匹配（flow matching）动作头的详细机制；流匹配动作头的代表性实现 | papers/mla/paper.md:714“pi0: A vision-language-action flow model for general robot control” | P1 |
| 11 | 519 | Manipulate-Anything（2024，Ren et al.） | Manipulate-Anything（2024，Duan et al.） | 已确认事实：第一作者为 Jiafei Duan，https://arxiv.org/abs/2406.18915 | P1 |

未修改（待人工核对）：
- 234 行"每阶段只加一点新东西"：SFT 阶段其实一次加入点云和触觉（papers/mla/paper.md:444–446），但这是章节小结的概括说法，不构成硬性矛盾，留人工判断。
- 171、173 行对第 4 层、第 12 层的解释（"出题太早""开始分化成语言特有表征"）：论文只解释了第 8 层和第 32 层（papers/mla/paper.md:564–567），这两条是笔记自己的推测。
- 547 行年份按指示改为 2025，但 arXiv 首版日期未核实；解析版参考文献已引用 2026 年的 arXiv:2601.05248（papers/mla/paper.md:824），说明该版本不早于 2026 年 1 月。
- notes/openvla.md:395 把 MLA 写成"MLA (Manipulate-Anything)"：不在本次可编辑范围，未改。

### [notes/cosmos-policy.md](../notes/cosmos-policy.md)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|------|--------|--------|------|------|
| 1 | L2 | title: "…Video Models for Visuomotor Control" | title: "…Video Models for Visuomotor Control and Planning" | papers/cosmos-policy/paper.md:1「COSMOS POLICY: … FOR VISUOMOTOR CONTROL AND PLANNING」 | P1 |
| 2 | L12、L467、L485、L632、L639、L642 | year: 2025…2025：Cosmos Policy…kim2025cosmospolicy | year: 2026…2026：Cosmos Policy…kim2026cosmospolicy | research-task.md:54「[2601.16163] Cosmos Policy: … Visuomotor Control and Planning」 | P1 |
| 3 | L463、L465 | 2024：OpenVLA（VLA 范式标杆）…2025：π0、π0.5（VLA 巅峰） | 2024：OpenVLA（VLA 范式标杆）、π0…2025：π0.5（VLA 巅峰） | papers/cosmos-policy/paper.md:658–659「pi0: A vision-language-action flow model … 2024」 | P1 |
| 4 | L50、L54、L65、L131、L370 | 看了几亿张"图配文字"…几亿小时视频上…几亿小时视频训练出来的 | 看了海量"图配文字"…海量视频上…从数以百万计的视频里学到的 | papers/cosmos-policy/paper.md:56「…and motion patterns from millions of videos」 | P1 |
| 5 | L50、L64 | VLA 还有一个毛病：它输出动作用的是"取平均"的方式（L1 回归） | 有的 VLA…比如 OpenVLA-OFT+…（论文推测…π0 则是流匹配模型，不走 L1 回归） | papers/cosmos-policy/paper.md:534「we hypothesize that its L1 regression of actions leads」 | P1 |
| 6 | L65 | 从头训视频…UWM, UniVLA | 从头训视频…UWM, UVA | papers/cosmos-policy/paper.md:68「unified video-action models (Li et al., 2025a; Zhu et al., 2025)」 | P1 |
| 7 | L183 | 离成功越近的画面分数越高…离失败越近越低 | 成功的轨迹里，离终点越近的画面分数越高…失败的轨迹…每一步都是 0 分 | papers/cosmos-policy/paper.md:212「labeling each transition in a rollout with the observed return」 | P0 |
| 8 | L217、L231、L508、L586 | 暴跌 22.7 分…直接掉 22 分…"去掉预测价值"只掉 0.5 分 | 暴跌 18.1 分（…累计掉了 22.7 分）…18 分…只掉 1.5 分 | papers/cosmos-policy/paper.md:1311 Table 5「67.1 66.6 64.0 62.5 44.4」 | P0 |
| 9 | L223 | 两个都去掉的"裸奔版"只有 94.6 分 | 两个互相独立的消融…掉 3.9 分（94.6 分）…论文没有做"两个都去掉"的版本 | papers/cosmos-policy/paper.md:1214「two independent ablations」；1226「98.5 97.0 94.6」 | P0 |
| 10 | L250、L430、L574 | 648 条 rollout 数据是基础策略自己跑出来的 | 505 条是之前各方法…评测时积累的，143 条是 Cosmos Policy 为"装糖入袋"额外跑的 | papers/cosmos-policy/paper.md:579–580「aggregated 505 policy rollouts across all policies」 | P1 |
| 11 | L293 | 输入维度更高（多了未来状态的信息） | 输入维度更高（要同时看当前状态 s 和动作 a，而 V(s') 只看未来状态 s'） | papers/cosmos-policy/paper.md:589–590「V(s′) (mask out (s, a)) or Q(s, a) (mask out s′)」 | P1 |
| 12 | L343 | 最弱的方法 100 次有 66 次失败，最强的 100 次只失败 7 次 | 完成进度分…Diffusion Policy 平均 33.6 分，Cosmos Policy 平均 93.6 分 | papers/cosmos-policy/paper.md:1131「Each score represents what percent of the task has been successfully completed」 | P0 |
| 13 | L351 | 不带规划 78 分，带规划 90.5 分 | 按论文 Fig.7…不带规划平均约 59.5 分，带基于模型的规划约 72.0 分 | papers/cosmos-policy/images/img_011.jpg（Fig.7）标注「59.5 61.3 72.0」；paper.md:597「12.5-point average score increase」 | P0 |
| 14 | L374、L434 | 从零训不如预训练但差距不算大 | 离不开预训练底座，真机上差距更明显…从零训只拿 80.8 分（比完整版低 18.7 分） | papers/cosmos-policy/paper.md:545–546「80.8 on the “fold shirt” task, which is 18.7 points lower」 | P1 |
| 15 | L378、L428 | π0.5 训练时看过几亿条机器人轨迹 | π0.5 预训练时用了大量机器人模仿数据（论文没给具体数量） | papers/cosmos-policy/paper.md:506「pretrained on large amounts of robotic imitation data」 | P1 |
| 16 | L428 | 换个新厨房就不灵…换没见过的颜色衬衫、没见过的厨房风格，分数就掉得多 | 没见过的粉色衬衫照样叠到 100 分，掉分主要在"放糖入碗"（分布内 100 → OOD 74.0） | papers/cosmos-policy/paper.md:1192 OOD「Cosmos Policy 100.0 100.0 74.0 83.3 89.3」 | P0 |
| 17 | L281 | 只用在"慢活"上——折衣服、装糖 | 只适合"慢活"——论文也只在放糖入碗、装糖入袋这两个任务上用了它 | papers/cosmos-policy/paper.md:573「(“put candies in bowl” and “put candy in ziploc bag”)」 | P1 |
| 18 | L331 | 数据效率高 60 倍——别人用 300-3000 条才到 50-66 分 | 多数对手每任务用 300 条（UWM 用 1000 条、DP-VLA 用 3000 条）…UVA 是 50.0 分 | papers/cosmos-policy/paper.md:469–471 表格「# Training Demos per Task」「Average SR (%)」两列：UVA 50 / 50.0，DP-VLA 3000 / 57.3，UWM 1000 / 60.8 | P1 |
| 19 | L214–L215 | 策略只学 p(a, s' 竖线 s)…p(a 竖线 s)（竖线未转义，62.5%、44.4% 被挤出表格） | 竖线改为转义写法，两行恢复为 3 列，成功率正常显示 | papers/cosmos-policy/paper.md:1311 Table 5「… 62.5 44.4」 | P1 |

未修改（待人工核对）：
- L362、L594「只比 5 步版低 0.5 分」：Table 5 是 67.1 与 66.4（差 0.7），但论文正文自己写 (-0.5%)（paper.md:1307、1311–1312），属论文内部不一致。
- L103、L121「256x256 → 32x32x16」：论文没给输入分辨率，只说 Wan2.1 把 H、W 各压 8 倍、16 通道（paper.md:161–162），具体数字无法确认。
- L487「第一个用大规模预训练视频模型…做底座的世界模型方法」：论文没有这样的首创声明，需查相关工作确认。
- L137「ALOHA…潜帧序列有 11 帧」：论文的 11 帧示例对应"两台第三人称相机 + 腕部相机"的平台（paper.md:244–251），不是 ALOHA；按 ALOHA 3 台相机推算帧数一致，措辞需人工确认。

### [notes/rf-slam.md](../notes/rf-slam.md)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|------|--------|--------|------|------|
| 1 | L14 | year: 2023 | year: 2025 | papers/rf-slam/paper.md:46「Haowen Lai, Zhiwei Zheng, and Mingmin Zhao. 2025.」 | P1 |
| 2 | L8、L569、L617 | (Best Artifact Award)…获得了 MobiCom 2025 Best Artifact Award | venue: MobiCom 2025…论文正文没有提到获奖情况…奖项：论文正文未提及 | papers/rf-slam/paper.md:48–49「(ACM MOBICOM ’25), November 4–8, 2025, Hong Kong, China」；全文无 award 字样 | P1 |
| 3 | L90 | 做出了比 9000 美元 LiDAR 还精细的 3D 地图 | 做出了接近 9000 美元 LiDAR 水平的 3D 地图（论文正是拿这台 LiDAR 当"标准答案"） | papers/rf-slam/paper.md:971–972「close to those achieved by a 3D LiDAR (Ouster OS0-64 costing $9,000)」 | P0 |
| 4 | L377 | 76% (90th 百分位)…从 1.32m 降到 0.43m | 均值和 90th 百分位均降 ≥76%…均值误差减少 0.43 m，90th 百分位误差减少 0.89 m | papers/rf-slam/paper.md:1443–1446「mean error decreases by 0.43 m … drop by 0.89 m … at least 76%」 | P0 |
| 5 | L374 | 28.09 (iPad) | 24.99 (ZED) | papers/rf-slam/paper.md:892「ZED-sdk (ZED) … 24.55 24.99 39.88」 | P1 |
| 6 | L282、L376、L391 | 加入不确定性后…（提升 14%）…12%+ 的精度提升…+12% (Acc.), +10% (Comp.) | 在已做联合位姿优化的前提下…至少提升 12.3%…+13.2% (Acc.), +12.3% (Comp.) | papers/rf-slam/paper.md:1204–1205「enhances both mapping accuracy and completion by at least 12.3%」 | P1 |
| 7 | L177 | 时间只比跑 1 次多约 40%（不是 16 倍） | 论文测得从 16 次加到 32 次，推理时间只增加约 40%（不是翻倍） | papers/rf-slam/paper.md:1156–1158「Doubling the sample number … to 32 … increase in the inference time by 40%」 | P1 |
| 8 | L439、L589 | 速度上限 0.6 m/s…因为雷达靠步进电机旋转采集数据…是硬件限制 | 只验证到 0.6 m/s…这是实验小车（用摇杆手动遥控）的最高速度…没有分析速度上限来自哪里 | papers/rf-slam/paper.md:859–860「controlled manually with a joystick and has a maximum speed of 0.6 m/s」 | P1 |
| 9 | L49、L469、L483 | 后续的 mmCLIP 会在此之上加语义理解…递进互补…在它之上构建更高层的能力 | 另外两篇是不同团队的独立工作，并不建立在它之上…互补…分工互补 | papers/mmclip/paper.md:7「Purdue University」；papers/nlos-mmwave/paper.md:5「Massachusetts Institute of Technology」 | P1 |
| 10 | L449、L466、L469 | 用 mmCLIP 这样的方法来补充语义…给蓝图上的每个物体贴标签…mmCLIP 给地图加语义 | 另外加相机…雷达前的人在做什么动作（零样本识别）…mmCLIP 识别人的动作 | papers/mmclip/paper.md:1「mmCLIP: Boosting mmWave-based Zero-shot HAR via Signal-Text Alignment」 | P1 |
| 11 | L565 | 占据场网络非常小——2 层 MLP，每层 64 个神经元，参数量不到 1 MB | 占据场的解码部分很小…前面还有一个可学习的稠密网格编码，论文没有给总参数量 | papers/rf-slam/paper.md:873「learnable dense grid encoding」；901「2-layer MLP, each hidden layer comprising 64 neurons」 | P1 |
| 12 | L397 | 相机因为视角窄（约 70 度）漏掉了很多区域 | 相机因为视场角有限漏掉了很多区域 | papers/rf-slam/paper.md:944「Due to the limited FOV」（未给度数） | P1 |
| 13 | L577 | 雷达原始分辨率只有 5-15 度角分辨率 | 单颗雷达芯片的原始角分辨率很低（论文没给具体度数） | papers/rf-slam/paper.md:851–853「sweep from 77 to 81 GHz … maximum sensing range of 10 m」（未给角分辨率） | P1 |
| 14 | L389、L441 | 在正常办公楼里…5 栋办公楼里 | 在正常的室内建筑里…5 栋楼里 | papers/rf-slam/paper.md:861–863「14 floors across 5 separate buildings … from 1906 to 2006」 | P1 |
| 15 | L467 | 看到拐角/墙后面的东西…在蓝图上标出"墙后面还有人" | 重建被纸箱、布料等挡住的物体的 3D 形状…不拆快递箱就"看清"里面东西的形状 | papers/nlos-mmwave/paper.md:47「objects in closed boxes and beneath occlusions」 | P1 |

未修改（待人工核对）：
- L23、L49、L90、L111、L573 雷达价格（几百块、300 美元、300-500 美元，以及"便宜了 20 倍""贵了 10 倍"）：论文只给了 LiDAR 价格（paper.md:202「$9k」、972「$9,000」），没给雷达价格，需查 TI 报价。
- L2 frontmatter 标题带 "CartoRadar:" 前缀：论文标题是 "RF-Based 3D SLAM Rivaling Vision Approaches"，CartoRadar 是系统名；是否保留前缀需人工决定（原文信息与 BibTeX 标题已正确）。

### [notes/mmclip.md](../notes/mmclip.md)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|------|--------|--------|------|------|
| 1 | L55、L56 | 直接把雷达图当图片喂 CLIP…准确率约 31%…经典零样本 ZSL（CADA-VAE 等）…约 53–58% | Tent：把雷达点云和 CLIP 文本嵌入对齐…只用合成数据（论文的 Syn 基线） | papers/mmclip/paper.md:894「Tent [64] is a pioneering work designed for zero-shot human activity recognition」 | P0 |
| 2 | L230、L231、L319、L366 | 直接 CLIP 图像编码器…31.2%…CADA-VAE / f-CLSWGAN…52.8% / 58.1% | Tent / Real 基线…明显低于 mmCLIP（Fig.5，正文没给具体数值）…Syn 基线…Fig.5 中最低 | papers/mmclip/paper.md:1016–1017「the Real baseline closely mirrors that of Tent」；全文无 CADA、31.2 | P0 |
| 3 | L145、L150–L154、L157 | 三张 64×64 热力图…各关节 3D 坐标…按关节 RCS…权重叠加…高斯核扩散 | 用 HPR 算法找出雷达"看得见"的三角面…所有可见面的 IF 信号相加，再加高斯白噪声 | papers/mmclip/paper.md:657「Hidden Point Removal (HPR) algorithm」；775「introduce Gaussian white noise」 | P0 |
| 4 | L111–L112、L168、L173–L178、L181 | [CLS]…5 个并行 MLP head…ResNet-18 约 70.1%…共享 head 约掉 5 个点 | 各自过 2 层 Transformer…5 个可学习的属性 token…6 层 Transformer（8 个注意力头） | papers/mmclip/paper.md:843「2-layer transformer block for initial extraction in each branch」「6-layer transformer block with 8 attention heads」 | P0 |
| 5 | L61、L237、L301、L407 | TI IWR1443, 77 GHz…单 GPU 训练 | AWR1843 BOOST + DCA1000，77–80.9 GHz…（论文用 NVIDIA A100） | papers/mmclip/paper.md:722–725「TI AWR1843 BOOST mmWave radar … from 77 GHz to 80.9 GHz」；850 | P0 |
| 6 | L238、L249、L407 | 12 人，3 房间…跨房间掉点约 3–5%…Room A 训练、Room B/C 测试 | 8 人，3 个环境（两间会议室 + 一处休息区）…从 76.4% 变成 72.4% 和 75.3% | papers/mmclip/paper.md:862「We recruited 8 subjects」；1252–1253「76.4%, 72.4%, and 75.3%」 | P0 |
| 7 | L204、L236 | （~12K / 4.8M），避免小样本全量微调过拟合…12K 可训练参数 | （论文原话；微调阶段可训练参数约 500K…）…（论文称灾难性遗忘） | papers/mmclip/paper.md:1353–1354「reduced to 500K, with the text branch accounting for 30K」；1192 | P1 |
| 8 | L75、L107、L133 | 只训练一个雷达信号编码器…MLP 融合…5 个拼接后再 MLP 压回 512 维 | 主要训练雷达信号编码器…自注意力聚合…可学习的 [CLS] token…单层自注意力模块 | papers/mmclip/paper.md:599「lightweight self-attention network to recompose the attribute embeddings」 | P1 |
| 9 | L201、L202 | ~50 万合成样本，120+ 动作类…每类 ~50 条…LoRA (rank=4) + MLP 最后一层 | 约 30 小时合成数据（来自 AMASS，覆盖 200 多类日常动作）…论文没给 rank 值 | papers/mmclip/paper.md:832–833「30 hours of high-quality paired synthetic text-radar samples」；255–257 | P1 |
| 10 | L193、L195、L337、L342 | τ=0.07…比融合后只对比一次高约 8%…属性级比全局高约 8% | τ 是温度系数（论文没给具体数值）…论文两种对比都算…没有报"只用全局对比" | papers/mmclip/paper.md:542「τ is the temperature parameter」；623「L_F = λα L_attr + λβ L_cls」 | P1 |
| 11 | L251、L385、L390 | Leave-one-subject-out，标准差 < 4%…从 4 提到 16…rank=4 是正则与适配的平衡点 | 论文没有做"留一人测试"…论文没有报告不同 rank 的实验，也没给所用的 rank 值 | papers/mmclip/paper.md:1248–1249「with the same set of subjects」；788「the rank r ≪ min(m,n)」 | P1 |
| 12 | L350、L358、L390 | ~50 条/类…覆盖 120+ 动作…每类仅 ~50 条 | （默认 50 类）…覆盖 200 多类动作（AMASS）…很少（8 人共约 6 小时） | papers/mmclip/paper.md:743「more than 200」；865「approximately 6 hours of real-world sensing data」 | P1 |
| 13 | L19、L303、L305、L382 | 回答「人在哪」…回答「隔墙人在哪」…「隔墙有体」…输出多人轨迹与位置 | 回答「机器人在哪、房间长什么样」…「被挡住的物体长什么样」…并不追踪人 | papers/rf-slam/paper.md:76「(a) localize the robot and (b) build a 3D map」；papers/nlos-mmwave/paper.md:47 | P1 |
| 14 | L432 | 同实验室 RF 栈 | RF 三连（三个不同团队）…（UPenn）…（MIT）…（Purdue 等） | papers/rf-slam/paper.md:6「University of Pennsylvania」；papers/nlos-mmwave/paper.md:5「Massachusetts Institute of Technology」 | P1 |
| 15 | L319 | Tent 等工作对齐 IMU/多传感器与语言 | Tent 等工作把毫米波、LiDAR、视频等多种传感器对齐到 CLIP 文本空间 | papers/mmclip/paper.md:895「including mmWave, LiDAR, and video, with CLIP’s text embedding」 | P1 |
| 16 | L160 | 论文 Fig.6 对比显示真实 TD 图更「脏」 | 论文 Fig.12 把真实和合成的热力图并排放，作者强调的是两者「看起来很像」 | papers/mmclip/paper.md:1306「The visual similarity between the real and simulated signals」；991 为 Fig.6 | P1 |
| 17 | L93、L95 | Figure 7：未见活动类别上的零样本 HAR 效果 | Figure 5：整体零样本性能（mmCLIP 与各基线对比） | papers/mmclip/images/img_007.jpg 图内图注「…gure 5: Overall Zero-shot Performance」（左侧被裁切）；paper.md:1011「As demonstrated in Fig. 5」 | P1 |
| 18 | L219 | 单次前向约 7 ms（GPU），可边缘部署 | 在台式机 GPU（NVIDIA A6000）上单次前向约 7 ms，能实时运行（论文没有在边缘设备上测试） | papers/mmclip/paper.md:1357–1360「an NVIDIA A6000 GPU … approximately 7 ms」 | P1 |
| 19 | L247 | 主实验（Table 1） | 主实验（论文 Fig.5） | papers/mmclip/paper.md:1011「As demonstrated in Fig. 5, our proposed」；全文没有编号表格（Table） | P1 |

未修改（待人工核对）：
- L135「完整系统 76.4% vs 只用类别名 61.3%」「去掉任一维或减到 3 维都会掉点」：论文 Fig.8a 只画了属性数 1→5 的趋势（paper.md:1062–1064），正文无数值，也没有逐个去掉某一维的实验，需对照原图。
- L204、L234「去掉 LoRA：62.1%（-14.3）」：Fig.9 比较的是 LoRA 与"混合数据从头训""全量微调"（paper.md:1181–1184），没有"去掉 LoRA"这一条件，正文也无数值。
- L232、L233、L235「61.3%（-15.1）」「58.7%（-17.7）」「只用 TD 68.2%，三图融合 +8.2」：正文没有这些数值，只可能来自无数值标注的柱状图，需对照原图读数。
- L241「各贡献约 14–18 点」：由上面未核实的数值推出。
- L253「消融（Table 4 精神）」及 L255–L257、L259（+15.1%、+17.7%、TD 68.2%、纯合成掉 15–20 点），L358「去掉合成预训练掉 17.7 点」：论文没有编号表格（Table），这些数值正文均未出现。
- L204、L236「0.25%」：保留论文原话（paper.md:1193），但与论文自己给的 500K / 20M ≈ 2.5% 对不上，属论文内部不一致。
- L310「SLAM 定位 + mmCLIP 语义」组合愿景：CartoRadar 定位的是机器人而不是人，属笔记作者设想，未改。
- L93、L95 图注已在笔记中改正，但生成它的 site/scripts/wire-paper-images.mjs 第 51 行仍是旧图注，重跑该脚本会把错误改回来（该脚本不在本次可写范围内）。

位置均为修改前（HEAD）的行号；表内公式的双竖线写作 ‖，以免破坏表格。

### [notes/nlos-mmwave.md](../notes/nlos-mmwave.md)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|------|--------|--------|------|------|
| 1 | L14 | year: 2023 | year: 2025 | papers/nlos-mmwave/paper.md L39："(MobiSys ’25), June 23–27, 2025" | P0 |
| 2 | L167 | w_{i,j} = Re{I_j(v_i)} * Re{S(v_i)} + … / ‖S(v_i)‖（分子未加括号） | w_{i,j} = (Re{I_j(v_i)} * Re{S(v_i)} + …) / ‖S(v_i)‖ | papers/nlos-mmwave/paper.md L584–590："magnitude of the projection of individual voxel values onto the final sum"，式 (6) 分子整体除以 ‖S(v_i)‖ | P1 |
| 3 | L360、L509、L611 | 雷达约 200 美元 + 数据采集板约 600 美元。对比需要 >10 GHz 带宽的军用级雷达，成本差了两个数量级 | 低成本商用现货（笔记估价约 200 + 600 美元，论文未给价格）…只供政府和军方使用；L509、L611 同改 | papers/nlos-mmwave/paper.md L873–874 硬件清单无价格；L1496："such bandwidth is reserved only for government and military use" | P1 |
| 4 | L362、L370、L607 | 在民用便宜雷达（4 GHz 带宽）上…；同样的物理约束（4 GHz 带宽） | 本文实际扫频 3 GHz，商用上限约 4 GHz；L370 改为"3 GHz 扫频带宽"，L607 同改 | papers/nlos-mmwave/paper.md L908："512 samples from 77.5GHz-80.5GHz"；L130："a bandwidth of at most about 4GHz" | P1 |
| 5 | L370 | mmNorm 用 200 美元雷达做出了比用昂贵设备的干涉法还好的效果 | 在同一套低成本商用雷达平台上，做出了比干涉法基线（作者复现）还好的效果 | papers/nlos-mmwave/paper.md L1009："We implemented two state-of-the-art baselines."；L1017–1018："Interferometric[20] … small bandwidths" | P1 |
| 6 | L444 | 芥末瓶身和瓶盖之间的 90 度折痕，两边各自重建得对，但过渡被圆滑掉了 | 瓶身大部分位置都贴合，但在瓶盖处明显偏离真值；瓶身和瓶盖被归进同一个 RSDF 分量 | papers/nlos-mmwave/paper.md L1589–1590："closely matches at many points … it deviates at the bottle’s cap"；L1598–1599："within one RSDF component" | P1 |
| 7 | L452、L558、L585、L615 | 扫一片 60x45 cm 区域要几分钟（雷达走速 0.1 m/s），计算也要分钟级 | 雷达以约 0.1 m/s 扫过 60x45 cm 的网格…论文没报告具体耗时，把实时化列为未来工作；其余三处同改 | papers/nlos-mmwave/paper.md L878–879："The robot scans at ∼0.1 m/s"；L1609–1610："enabling real-time scanning and computation" | P1 |
| 8 | L454 | 局限六：依赖精确位姿 | 局限六：依赖精确位姿（笔记补充，论文未列） | papers/nlos-mmwave/paper.md L1560–1609 §8 Limitations 只列 "Metal Occlusions … Computational Complexity and Scanning Time" 六项，无位姿一项 | P1 |
| 9 | L549 | RSDF 中心假设…只有当物体恰好位于体素空间的正中央时才成立 | 每个 RSDF 分量里取最大值和最小值的中点当作表面…这和物体放在体素空间的哪里无关 | papers/nlos-mmwave/paper.md L1349–1351："center (vertically) of each RSDF component … average of the maximum and minimum" | P1 |

未修改（待人工核对）：
- L619、L640 RF-Pose 归属（"MIT 同组的其他工作（RF-Pose 系列）"，以及 Signal Kinetics 工作列表里的 RF-Pose）：论文未提 RF-Pose；它是否出自 Adib 组，用户已确认尚未核定，按要求保持原样。

### [notes/proactive-hearing.md](../notes/proactive-hearing.md)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|------|--------|--------|------|------|
| 1 | L12–13 | year: 2024；venue: UIST | year: 2025；venue: EMNLP | 用户确认：arXiv 2511.11473 注释 "Accepted at EMNLP 2025 Main Conference"（arxiv.org/abs/2511.11473） | P0 |
| 2 | L486、L668 | ★ 本文：Proactive Hearing (UIST 2024)；发表：UIST 2024 | …(EMNLP 2025)；…EMNLP 2025（Main Conference）；arXiv 2511.11473 | 同上（arxiv.org/abs/2511.11473）；research-task.md L71："[2511.11473] Proactive Hearing Assistants that Isolate Egocentric Conversations" | P0 |
| 3 | L677–682 | …hu2024proactive…(UIST)}, year={2024}, organization={ACM} | …hu2025proactive…(EMNLP 2025…)}, year={2025}；删 organization | 用户确认的 BibTeX：booktitle 为 EMNLP 2025 (Main Conference)，year 2025，四位作者不变（arxiv.org/abs/2511.11473） | P0 |
| 4 | L330、L338、L621 | 端到端总延迟：约 30ms，低于人耳可感知阈值（约 50ms）；千元级硬件上以 30ms 延迟实时运行 | 端到端总延迟：论文没有报告；只说音频要按 10~20 ms 的小块处理…；L338 删去 30ms，L621 重写 | papers/proactive-hearing/paper.md L208–209："in small chunks of 10–20 ms to maintain a latency below the perceptual threshold"（全文无端到端延迟数字） | P0 |
| 5 | L490–492、L527、L635–637、L648 | LlamaPIE 列在本文之后；"它的后续工作 LlamaPIE"；"本文的直接后续" | 移到本文之前并标"本文引用的同组工作"；各处改为"同组相关工作（不是后续）"，与本文互补 | papers/proactive-hearing/paper.md L168–169："conversational guidance (Chen et al., 2025) … complementary to our task"；L934 参考文献 Llamapie（ACL Findings 2025） | P1 |
| 6 | L259、L325 | 蓝牙传输优化：…只需要通过蓝牙传输那个 32 维的嵌入向量——数据量极小 | 拆分部署：慢模型晚 T=1 秒处理故可远程运行；传递的是 32 x F x L 的对话嵌入 E，链路和开销论文未分析 | papers/proactive-hearing/paper.md L299–300："T seconds behind … allows these models to run remotely"；L1320："time-varying conversation embedding"，即 E ∈ R^{D×F×L}；L1345："D = 32" | P1 |
| 7 | L314、L613 | 8 张 L40s GPU，batch size=16；8 张 L40s GPU（约 $2/卡/时）训了…Stage 3 | Stage 1/2 用 8 张 L40s，Stage 3 用 2 张 A100；L613 加"论文没报告训练时长和费用" | papers/proactive-hearing/paper.md L1653："a batch size of 16 on 8 L40s"；L1670–1671："a batch size of 4 on 2 A100 GPUs" | P1 |
| 8 | L311 | Stage 2：在空间化数据上继续训练 | 在空间化数据上联合训练（慢模型沿用 Stage 1 权重，快模型从头初始化） | papers/proactive-hearing/paper.md L1645–1647："slow model … pretrained weights from Stage 1 … fast model … from scratch" | P1 |
| 9 | L502 | 脑电波解码 NeuroHEED 的实时性：接近实时 | 缺乏实时部署能力 | papers/proactive-hearing/paper.md L159–160："Pan et al., 2024) … lack real-time deployment capabilities" | P1 |
| 10 | L633 | 但这种情况只占 11.3% 的时间 | 但只有约 11.3% 的换人时刻会遇到这种情况（按轮次统计，不是按时长） | papers/proactive-hearing/paper.md L835–836："11.3% of turns have gaps under 1 second" | P1 |
| 11 | L451 | 新人刚开口的前 2 秒有延迟。每个新加入对话的人前 2 秒 SISDRi 只有 4.77 dB | 对方每次刚开口的前 2 秒有延迟…对话伙伴每一轮刚开口的前 2 秒，SISDRi 平均只有 4.77 dB | papers/proactive-hearing/paper.md L812–813："a 2-second sliding window over each non-wearer turn" | P1 |
| 12 | L584 | 论文明确说了三个原因：… | 论文明确给了两个原因；"更鲁棒"和原第 (3) 点改标为笔记的推断 | papers/proactive-hearing/paper.md L305–307："reduces computational load on the fast model and ensures … turn-taking" | P1 |
| 13 | L120 | 17.4 万个参数（比一张 100x100 的彩色图片的像素数还少） | 17.4 万个参数（约等于一张 240x240 彩色图片的 RGB 数值总数） | papers/proactive-hearing/paper.md L1390："a lightweight beamformer with 174K parameters"（100×100×3 = 3 万；240×240×3 ≈ 17.3 万） | P1 |
| 14 | L199、L323、L617 | …Orange Pi 5B（约 600 元）+ … SP15C 双耳麦克风 + 手机…不到 2000 元 | 价格标为笔记估价；L617：SP15C 接手机用于录音，快模型跑 Orange Pi 5B、慢模型跑 Apple M2 | papers/proactive-hearing/paper.md L746–747："(Sonic Presence SP15C) and connected it to a smartphone"；推理设备见 L397–398；全文无价格 | P1 |
| 15 | L357 | 基线 DeepFilterNet2 (空间化) | 基线 DeepFilterNet2 (SpokenWOZ OOD，空间化) | papers/proactive-hearing/paper.md L538："SpokenWoz (OOD) … -3.45 (3.78) 16.8% 9.2% -0.16 (0.21)" | P1 |
| 16 | L344、L421 | 每多 3 dB，听感大约响一倍 | 每多 3 dB，目标声音与残留干扰的能量比大约翻一倍 | papers/proactive-hearing/paper.md L421："Scale-Invariant Signal-to-Distortion Ratio improvement"；10·log10(2) ≈ 3.01 dB，即 3 dB 对应能量比 2 倍，不等于听感响度翻倍（论文未作此换算） | P1 |

未修改（待人工核对）：
- L183、L324、L336 把 Apple M2 写成手机芯片（"手机（Apple M2 芯片）""手机或笔记本""一个开发板 + 一部手机"）：论文只写 "Apple M2 silicon"（L398、L1679），未说明设备类型（L300 另说慢模型可远程跑在 "say a smartphone" 上）；M2 能否算手机芯片属论文外事实，NHC 未核定，保持原样。
- L461 "日本人的沉默间隔比美国人长"：论文未讨论不同文化的停顿长短；该说法可能与笔记 L651 引用的 Stivers 2009 结论相反，需人工查证后再改。

### [notes/neuralaids.md](../notes/neuralaids.md)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|------|--------|--------|------|------|
| 1 | L12 | year: 2024 | year: 2025 | papers/neuralaids/paper.md L144–146："(ACM MOBICOM ’25), November 4–8, 2025" | P0 |
| 2 | L228、L250、L292、L296 | 时间阶段…用单向 GRU 处理；把原来的 LSTM 模块全部换成 GRU 模块；缓存 4：GRU 的隐藏状态 | 时间阶段是因果单向 LSTM，只有频率阶段换成 GRU；缓存 4 存时间阶段 LSTM 的隐藏状态和细胞状态 | papers/neuralaids/paper.md L992："hidden and cell states of the temporal unidirectional LSTM"；L888–890 只替换 spectral module | P0 |
| 3 | L395、L401–404、L447、L578 | 只比原始浮点版（8.65 dB）低 0.57 dB；表中差距 -10.35 / -7.75 / -0.46… | 改以 bfloat16 版 8.76 dB 为基准：-10.46 / -7.86 / -0.57；各处同改 | papers/neuralaids/paper.md L1634："Our model BFLOAT16 8.76"；L1500–1502："our model suffers a 10.46 dB decline" | P1 |
| 4 | L73、L670 | TinyDenoiser（2020）…几十 KB 的小 LSTM 网络；(Fedorov et al., 2020) | Rusci 等，2022/2023；约 1.1~1.2 MB；前身是 Fedorov 2020 的 TinyLSTM | papers/neuralaids/paper.md L267–268："TinyLSTM [19] and its successor TinyDenoiser [45]"；L1629–1630 内存 1135.2 / 1195.9 kB | P1 |
| 5 | L71 | ClearBuds（CHI 2022，同实验室前作）…耳机录音，手机处理，再传回耳机 | ClearBuds（MobiSys 2022）…录下佩戴者自己的声音…用来打电话，延迟预算是 100~200 毫秒 | papers/neuralaids/paper.md L2365–2369："2022. ClearBuds … In MobiSys"；L1950："telephony, with delay constraints of 100–200 ms" | P1 |
| 6 | L426 | TinyDenoiser 0.58 ms（但算法延迟 25 ms） | TinyDenoiser 0.58 ms（已改成 10 ms 算法延迟的对比版本） | papers/neuralaids/paper.md L1415："we modify its algorithmic latency to 10ms"；L1630 runtime 0.58 ms | P1 |
| 7 | L157 | 三个 PDM 麦克风以 48 kHz 采样，经过 SFU 做 64 倍抽取后降到 16 kHz | PDM 以 3.072 MHz 时钟输出，64 倍抽取得 48 kHz，再重采样到 16 kHz；三个麦克风只用一个 | papers/neuralaids/paper.md L582–592："3.072 MHz audio clock … 64× decimation … 48 kHz … downsampled to 16 kHz"；L650–651 | P1 |
| 8 | L45 | 整个过程必须在 10 毫秒（千分之一秒）以内 | 端到端要低于 20 毫秒，其中算法延迟不超过 10 毫秒（百分之一秒） | papers/neuralaids/paper.md L682–685："end-to-end latency of less than 20 ms … algorithmic latency of 10 ms or less" | P1 |
| 9 | L543 | 麦克风数量：6 个（耳机上）…7 个机器人各 7 个 | 2 个（一对双耳麦克风）…7 个机器人各 2 个 | papers/proactive-hearing/paper.md L746："a pair of binaural microphones"；papers/acoustic-swarms/paper.md L11："each robot contains a pair of microphones" | P1 |
| 10 | L95、L660 | 这篇要做一份开源的…完整样本；一套开源的、可复现的方法 | 方法公开…的完整样本；公开发表了一套完整方法（代码和硬件设计目前未公开，见 Q3） | papers/neuralaids/paper.md 全文无开源或发布声明（"open-source" 只在 L2043 指他人平台）；与本笔记 L640、L717 矛盾 | P1 |
| 11 | L24 | 拆骨瘦身 100 倍 | 拆骨大幅瘦身 | papers/neuralaids/paper.md 全文没有 100 倍或 100× 之类的模型压缩倍数，只有频率维度压缩，如 L1433–1435："We apply 4× frequency compression on the spectral module" | P1 |
| 12 | L294 | 四个缓存总共约 30 KB——只占 GAP9 的 128 KB L1 内存的不到四分之一 | 四个缓存各占多大论文没有单独报告；整个模型（L1 + L2）约 299 kB，L1 只有 128 KB | papers/neuralaids/paper.md L396："299 kB of memory"；L1117："128 KB of L1 memory" | P1 |
| 13 | L428 | 对比基准：手机端同类模型上百 mW | 论文设定的功耗预算 < 100 mW | papers/neuralaids/paper.md L240："learning power consumption must be below 100 mW" | P1 |
| 14 | L505、L652 | 5 块 PCB 叠起来…比耳塞大 3-4 倍 | 比耳塞明显更大（论文没给具体尺寸） | papers/neuralaids/paper.md L2263–2268："behind-the-ear hearing aid form factor … earbud-form-factor"；全文无外形尺寸 | P1 |

未修改（待人工核对）：
- L227、L244、L246、L252、L648 "257 个频率 bin"：论文没有出现 257，也没给 FFT 点数；16 ms 窗口在 16 kHz 下是 256 点，频点数取决于 FFT 长度，无法从原文核实。
- L75、L89 AirPods Pro "至少把一部分计算扔回手机"：论文 L2010–2020 举的商业例子是 Google Pixel Buds（Tensor A1）和 Phonak，没提 AirPods，该说法无法从原文核实。
- L683 Cohen et al. "也是在 GAP9 上做的"：论文只说 [16] "is neither causal nor real-time"（L2141–2142），没说明它跑在什么硬件上。

### [notes/acoustic-swarms.md](../notes/acoustic-swarms.md)

| # | 位置 | 原说法 | 修正为 | 依据 | 级别 |
|---|------|--------|--------|------|------|
| 1 | L13 | venue: Nature | venue: Nature Communications | Crossref DOI 10.1038/s41467-023-40869-8：Nature Communications 14, 5684 (2023) | P0 |
| 2 | L688、L690 | iravantchi2023creating；author={Iravantchi…Gollakota…} | itani2023creating；author={Itani…Chen…Yoshioka…Gollakota…} | Crossref DOI 10.1038/s41467-023-40869-8：作者 Malek Itani, Tuochao Chen, Takuya Yoshioka, Shyamnath Gollakota；卷 14、文章号 5684 与原条目一致，未改 | P0 |
| 3 | L222、L124、L205–210 | 为什么锚点要在一条直线上？轨道上的多个标记点排成一条直线…破镜像歧义 | 为什么锚点不能排成一条直线？轨道弯折、标记点不共线，共线锚点破不了镜像歧义；L124、L205–210 补上旋转歧义 | papers/acoustic-swarms/paper.md L13："a grooved, meandered track"；L29："resolve the rotation and flipping ambiguity" | P0 |
| 4 | L454、L470 | 比 IRM oracle +4.8dB（放在真实环境一行）；SI-SDRi 在 2 人场景下超过…IRM 4.8 dB | 标明是仿真 5 人场景；L470 改为"5 人场景" | papers/acoustic-swarms/paper.md L87："outperformed the ideal ratio mask (IRM) … by 4.8 dB … for the five-speaker case" | P1 |
| 5 | L393 | 机器人按照散开的反序一台台进入底座 | 机器人按照散开时的同一顺序一台台进入底座 | papers/acoustic-swarms/paper.md L49："in the same order they exited during dispersal" | P1 |
| 6 | L682–683 | Proactive Hearing（UIST 2024）；NeuralAids（MobiCom 2024） | Proactive Hearing（EMNLP 2025）；NeuralAids（MobiCom 2025） | 用户确认 EMNLP 2025（arxiv.org/abs/2511.11473）；papers/neuralaids/paper.md L144–146："(ACM MOBICOM ’25), November 4–8, 2025" | P1 |
| 7 | L478、L455、L462、L573 | 把 7 台机器人挤在一个直径 10 cm 的圆环里 | 把同样数量的麦克风集中到一个直径 10 cm 的圆形阵列里、重新训练模型；表格、小结和思考题 Q1 同改 | papers/acoustic-swarms/paper.md L95："re-trained and tested our models on a co-located circular microphone array" | P1 |
| 8 | L84、L86 | 解决"在极端资源约束下也能分离"的计算问题；NeuralAids 在边缘设备上实时跑分离算法 | 改为"实时降噪"，并注明分离类能力论文留作未来工作 | papers/neuralaids/paper.md L2298–2300："for real-time speech enhancement and denoising"；L2211–2212："we do not demonstrate the feasibility" | P1 |
| 9 | L647 | 机器人本地只做录音和 Opus 压缩 | 机器人本地除了录音和 Opus 压缩，还要跑双麦克风 chirp 到达时间检测、IMU 导航和桌沿/碰撞检测 | papers/acoustic-swarms/paper.md L27："a dual-microphone algorithm that runs on each robot"；IMU 导航与桌沿/碰撞检测见 L37、L45 | P1 |
| 10 | L284 | 留在底座的"灯塔机器人"收到 chirp 后测距 | 留在底座里的其余机器人都充当"灯塔"（地标），收到 chirp 后测距 | papers/acoustic-swarms/paper.md L37："the remaining robots at the base station cooperate by becoming landmarks" | P1 |

未修改（待人工核对）：
- L123、L155、L183、L197、L294、L546、L602 "超声波 chirp"：现有部分原文只说 chirp 以 62.5 kHz 采样（L19），频段细节在缺失的 Methods 里，无法确认是否属于超声波。
- L635 "论文没有明确报告参数量…几十 M 到 100 M"：L97 说模型细节 "for detail see Methods"，Methods 不在现有原文中，无法核实。
- L115、L246 "360°/(N-1) 等分"：原文说 "equally-partitioned angles"（L37），7 台机器人对应 6 个 milestone（L43），与 N-1 一致，但现有原文没写 360° 范围。
- L193、L626 双麦克风算法"利用相位差"：原文只说 "combine the chirps received across two microphones"（L27），细节在缺失的 Methods 里。
- L470、L639 "LibriSpeech、VCTK 等"：现有原文没写合成数据用了哪些语料。
- L458、L647 "大模型 > 3 秒"：原文只给小模型中位 1.82 s、90 分位 2.46 s（L97），大模型耗时只在图 7A 中。
- L454 "SepFormer +5dB"：原文只说 "showed improvement across a range of input SI-SDR values"（L87），没有具体数字。
- L511 "从 < 20 cm 飙到 > 50 cm""低 10+ dB"：原文只说朝向在 135° 以内时误差低（L117），这些数字不在正文。
- L157、L216 "3D 打印的塑料轨道/底座"：原文 L11 的 "3D-printed plastic base" 指机器人自身的底壳，底座站只写 "plastic base station"（L13）。
- L546 "把工作距离推到 1+ 米"：现有原文没有测距量程数字。
