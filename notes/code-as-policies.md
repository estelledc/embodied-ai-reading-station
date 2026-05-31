---
title: "Code as Policies: Language Model Programs for Embodied Control"
slug: code-as-policies
topic: planning
difficulty: ⭐⭐⭐
status: auto-summary
来源: papers/code-as-policies/paper.pdf
venue: ICRA
year: 2023
era: founder
num: 75
generated_at: 2026-05-31
---

# Code as Policies: Language Model Programs for Embodied Control

> 这是给"完全没碰过 AI / 机器人"的读者写的版本。专业词第一次出现都会用一两句话讲清，并尽量用日常生活打比方。

## 一句话讲什么（TL;DR）

让大语言模型（LLM，就是 ChatGPT 那种"读了一堆书的 AI"）**直接写 Python 代码**当作机器人的策略——你说"把方块叠到空碗里"，它就当场写一段 `for` 循环 + `if` 判断 + 调用感知和控制 API 的代码，然后在机器人上**直接 `exec()` 跑**。

*所以这一节是想说：把"自然语言指令"翻译成"现场写出来的代码"，让代码本身就是机器人的策略。*

---

## 这是个什么场景

想象你雇了一个**会编程的实习生**当机器人助理。你跟他说："把那些方块按颜色不同的搭配放进碗里"。

一个普通实习生会怎么做？他会拿出笔记本写：

```python
# 任务：把方块放到颜色不一样的碗里
blocks = detect_objects("blocks")
bowls  = detect_objects("bowls")
for block in blocks:
    for bowl in bowls:
        if get_color(block) != get_color(bowl):
            pick_place(block, bowl)
            break
```

写完直接跑——这就是普通程序员的工作方式。

Code as Policies（简称 CaP）想让机器人做的，**就是这件再朴素不过的事**：你说一句话，它当场写一段代码，然后跑代码。区别在于：

- 写代码的不是人，是 LLM；
- 用的 API 不是网页接口，是机器人感知（看东西的）和控制（动手脚的）；
- 写完不存档，是**直接 `exec` 在机器人本体上跑**。

这种思路适用于：桌面物体抓取（pick-and-place）、画形状（draw shapes）、移动机器人在厨房里端可乐——只要任务能被写成"看一下 → 算一下 → 动一下"的循环，就能套这个框架。

*所以这一节是想说：场景是"自然语言 → 机器人动作"，但中间桥梁是 LLM 现场写出来的可执行 Python 代码。*

---

## 之前的人怎么做的，为什么不够好

在 2022 年，让机器人理解人话主要有四条路：

- **方案 A：词法解析（lexical parsing，一种老派 NLP）**
  类比：写一本厚厚的"如果用户说 X，就跑 Y"的字典。**问题**：用户说点新花样（"稍微往左一点"）就罢工，因为字典里没收录。

- **方案 B：端到端学习（end-to-end learning）**
  类比：让机器人看几万次"指令 → 动作"的示范（专家演示），用模仿学习（imitation learning，跟着老师学）或强化学习（reinforcement learning，试错给奖励）训出来。**问题**：每个新任务都要采几万次数据，**贵到爆**，而且换个机器人就废了。

- **方案 C：LLM 当规划器（如 SayCan、Huang et al.）**
  类比：让 LLM 把任务拆成"步骤 1 拿可乐 → 步骤 2 走过去 → 步骤 3 放下"，然后从一个**预先训好的技能库**里挑一个来执行每步。**问题**：技能库是固定的——如果用户说"把可乐往右移 10 厘米"，技能库里没有"往右移 10 厘米"这个技能，就死活做不了。每个新动作都得**重新采数据 + 训新技能**。

- **方案 D：Socratic Models**
  类比：让视觉模型把看到的东西翻成文字（"桌上有一个可乐罐"），再让 LLM 基于这段文字规划。**问题**：还是只能调用预定义的技能函数，不能现场组合出新动作。

- **共同短板**：LLM 只能"挑"动作，不能"造"动作。**所有的逻辑、循环、空间几何运算（spatial-geometric reasoning），都被锁在那一组预训练的技能里**。一旦遇到"画一个比刚才小一点、稍微靠左的金字塔"这种需要**算坐标 + 写循环**的任务，整套方法就崩了。

论文里有一段非常精彩的对比，作者拿"把可乐罐稍微往右移一点"这个简单指令做案例：

- 老派 LLM Plan 会输出：`1. Pick up coke can / 2. Move a bit right / 3. Place coke can`——但**机器人的技能库里没有"move a bit right"这个技能**，第二步就死。
- Socratic Models 会输出：`robot.grasp(coke can) / robot.place_a_bit_right()`——同样需要存在 `place_a_bit_right` 这个预定义函数。
- CaP 会输出：

  ```python
  while not obj_in_gripper("coke can"):
      robot.move_gripper_to("coke can")
  robot.close_gripper()
  pos = robot.gripper.position
  robot.move_gripper(pos.x, pos.y+0.1, pos.z)
  robot.open_gripper()
  ```

  **直接用代码现场组合出"往右 10cm"的具体动作**，根本不需要这个技能事先存在。

*所以这一节是想说：之前的方法要么不能泛化新动作，要么虽然让 LLM 规划但只能挑现成技能，没法真正写出"新逻辑"。*

---

## 这篇论文的新想法

**让 LLM 不是挑技能，而是当场写代码。** 代码里可以：

- 调用感知 API（detect_objects, get_pos）查环境；
- 调用控制 API（pick_place, set_velocity）发指令；
- 用 `if/else` `for/while` 这些**经典编程结构**组合出全新的逻辑；
- 用 NumPy 算坐标，用 Shapely 处理几何形状（论文核心彩蛋——LLM **本来就会用这些库**）；
- **递归地定义未定义的函数**——LLM 写到一半发现需要 `is_empty(bowl)`，就再调一次 LLM 把这个辅助函数也写出来。

这种"LLM 写出来在机器人上跑的代码"，作者起名叫 **LMP（Language Model Programs，语言模型程序）**。

最关键的洞察：**Codex / GPT 已经在 GitHub 上几十亿行代码上预训练过了**，写 Python 早就熟练到包含"行为常识"——你说 "faster"，它会写 `velocity *= 2` 而不是 `velocity *= 1.001`；你说 "a bit to the left"，它会写 `+ [-0.1, 0]` 而不是 `+ [-3, 0]`。**这种"对数值的语感"是免费送的**，不用任何专门训练。

*所以这一节是想说：核心创新是"让 LLM 写代码"，免费拿到了编程语言的全部表达力 + LLM 对数字的常识感。*

---

## 方法分步拆解

CaP 的整套流程可以分成 5 个动作。

### 步骤 1：准备 Prompt（提示词）

Prompt 由两部分组成：

- **Hints（提示）**：告诉 LLM 有哪些 API 可用。比如 `from utils import get_obj_names, put_first_on_second` 和 `import numpy as np`。LLM 看到这两行，就知道"哦，可以用这些函数和 NumPy"。
- **Examples（示例）**：几对"指令 → 代码"的样例（few-shot，少样本提示——给几个例子让 AI 模仿格式）。比如：

  ```python
  # move the purple bowl toward the left.
  target_pos = get_pos('purple bowl') + [-0.3, 0]
  put_first_on_second('purple bowl', target_pos)
  ```

### 步骤 2：拼上用户的真实指令

把用户的新指令（也写成注释 `# ...`）拼到 prompt 末尾，发给 LLM。比如：

```python
# move the red block a bit to the right.
```

LLM 续写：

```python
target_pos = get_pos('red block') + [0.1, 0]
put_first_on_second('red block', target_pos)
```

注意 "a bit" → `0.1`、"a little" → `0.05`、"way" → `0.5`，这种**数字感是 LLM 自带的**。

### 步骤 3：安全检查

执行前，CaP 会扫一遍生成的代码：

- 不能有 `import` 语句（防止偷偷加载危险库）；
- 不能有 `__` 开头的特殊变量（防止访问 Python 内部）；
- 不能 `exec` / `eval`（防止套娃执行）。

通过检查就放行。

### 步骤 4：用 `exec` 跑

在受控的命名空间里：

```python
exec(generated_code, globals_dict, locals_dict)
```

- `globals_dict` 装好了所有可用的感知/控制 API；
- `locals_dict` 是一个空字典，跑完会装满 LLM 定义的变量和函数；
- 如果指令期望返回值，就从 `locals_dict["ret_val"]` 里取出来。

### 步骤 4.5：维持会话（session）

CaP 还支持把"上一条指令 + 上一段生成代码"留在 prompt 里，让下一条指令能引用前面的上下文。比如：

```python
# move the red block to the left.
target_pos = get_pos('red block') + [-0.2, 0]
put_first_on_second('red block', target_pos)
# undo the last action.
target_pos = get_pos('red block') + [0.2, 0]
put_first_on_second('red block', target_pos)
```

这种"指令历史拼回 prompt"的做法，让 LLM 自动获得**简单的上下文记忆**——不需要专门的 memory 模块。

### 步骤 5：分层代码生成（hierarchical code-gen，本文最大的工程亮点）

LLM 写代码时常会**调用一个还没定义的函数**，比如：

```python
def stack_objs_in_order(obj_names):
    for i in range(len(obj_names) - 1):
        put_first_on_second(obj_names[i + 1], obj_names[i])
```

`stack_objs_in_order` 不在 API 列表里——它是 LLM **自己临时构造出来的子任务**。CaP 用 Python 的 AST（抽象语法树，就是把代码拆成结构化的树）找出这些"未定义的函数"，**再调一次 LLM** 让它写函数体。

这个过程**深度优先递归**：A 调用 B，B 调用 C，那就先写 C，再写 B，再写 A。

类比：写论文先写大纲（顶层 LMP），再展开每章（中层 LMP），最后写具体段落（叶子函数）。LLM 不需要一次性把所有细节铺平——可以**先打个草稿，再补细节**。

### 整体串起来

```
用户指令 → [Prompt = Hints + Examples + 指令] → LLM 续写代码
       → 安全检查 → exec
       → 遇到未定义函数 → 再次调 LLM 写它 → 加进 scope → 继续 exec
       → 把这次的指令+代码追加到 prompt → 等下一条指令
```

整个系统**没有训练、没有微调、没有梯度反传**——所有"智能"都来自 prompt 的设计 + LLM 的预训练知识。这种架构有个昵称叫 "training-free"（免训练）方法。

*所以这一节是想说：方法本质是"prompt → exec → 递归补函数 → 拼历史"，没有任何模型训练。*

---

## 关键数字（这些数让人记一下）

- **HumanEval（标准代码生成基准）通过率**：扁平（flat）生成 34.9% P@1，分层（hierarchical）生成 39.8% P@1——分层比扁平涨 **5 个百分点**，这在 HumanEval 上是显著进步。
- **RoboCodeGen（论文新出的机器人代码基准，37 道题）**：
  - GPT-3 6.7B：扁平 3% / 分层 5%
  - GPT-3 175B：扁平 68% / 分层 84%（**+16 点**）
  - Codex davinci：扁平 81% / 分层 95%（**+14 点**）
  - 结论：模型越大，分层增益越大；小模型分层反而帮不上忙。
- **桌面操作模拟实验（每个任务 50 次试验）**：
  - 见过的属性 + 见过的指令、长视野任务：CLIPort 78.8% / NL Planner 86.4% / **CaP 97.2%**
  - 没见过的属性 + 没见过的指令、空间几何任务：CLIPort **0.01%** / **CaP 62%**
  - 结论：泛化到全新任务时，端到端的 CLIPort（用 30k 演示训练的模仿学习模型）**几乎完全崩溃**，CaP 还有 60+ 分。
- **演示平台**：UR5e 桌面臂、移动机械臂（kitchen 任务）、画图机器人——一套方法跨多种 embodiment（具身——机器人本体）。
- **训练成本**：**0**——CaP 不训任何模型，全靠 prompt。

*所以这一节是想说：CaP 在新任务上的泛化能力远超模仿学习基线，且分层代码生成同时提升机器人和通用代码任务。*

---

## 应该懂的新词（看完这节再看正文不晕）

- **LLM（Large Language Model，大语言模型）**：在海量文本上预训练的神经网络，能续写文字。GPT-3、Codex、ChatGPT 都是。
- **Codex / code-davinci-002**：OpenAI 把 GPT 在 GitHub 代码上专门微调过的版本，写 Python 特别在行。本文默认实验用的就是它，温度（temperature）= 0（最稳，每次输出固定）。
- **few-shot prompting（少样本提示）**：不训练模型，只在 prompt 里放几个例子，让 AI 看着例子模仿。CaP 完全靠这个。
- **policy（策略）**：机器人学里的术语——一个从"观测"映射到"动作"的函数。CaP 让 LLM 现写一段 Python 代码当作 policy，所以叫 "Code as Policies"。
- **embodiment（具身）**：机器人本体。同一个 CaP prompt 框架，换不同 embodiment 只需换 API 列表。
- **LMP（Language Model Program）**：本文造的术语，泛指"LLM 生成、由系统执行"的程序。
- **hierarchical code-gen（分层代码生成）**：上层代码调用下层未定义函数，递归地让 LLM 也把下层函数写出来。
- **AST（Abstract Syntax Tree，抽象语法树）**：代码被解析后变成的树状结构，方便程序自己分析自己。CaP 用它找未定义函数。
- **open-vocabulary detection（开放词表检测）**：能识别任意词描述的物体的视觉模型，比如 ViLD、MDETR。CaP 调它来做感知。
- **CLIPort**：本文用作基线的模仿学习模型，把 CLIP 视觉表征 + Transporter 动作预测拼起来，用大量演示训出来。
- **HumanEval**：OpenAI 推出的代码生成评测集，164 道 Python 编程题。
- **RoboCodeGen**：本文新出的基准，37 道机器人主题代码题，鼓励用 NumPy 和未定义函数。
- **P@k**：生成 k 个候选答案里至少一个通过测试的概率。
- **chain-of-thought（思维链）**：让 LLM 一步步推理的提示技巧。本文认为分层代码生成 + 起好变量名 = "用代码写出来的思维链"。

*所以这一节是想说：CaP 的核心词汇就这十来个，理解了 LMP / 分层 / few-shot 就读得懂正文。*

---

## 搞不定的（论文自己承认的局限）

- **感知 API 决定能力上限**：感知模块只能描述"有哪些物体、在哪"——它**说不出**"轨迹是不是颠簸的""形状是不是 C 形的"。CaP 没法处理超出感知 API 表达能力的指令。
- **控制 API 决定动作上限**：能调的参数就那么几个（pick_place 的目标位置、set_velocity 的方向）。复杂动作（比如"用方块搭一个房子"）需要的低层控制不在 API 里，CaP 也搭不出来。
- **prompt 太长会崩**：每多放一个例子，prompt 就长一点；token 上限（当时 4k-8k）很快被填满。**例子数有上限 → 风格覆盖有上限**。
- **指令复杂度有限**：远超示例难度的指令（"build a house with the blocks"——示例里只有 pick-and-place）会让 LLM 当场翻车。
- **可行性盲区**：CaP 假设所有指令都是能做的——它**没法事先判断指令是否合理**（比如"把月亮从天上摘下来"它也会硬写代码）。
- **跨具身泛化脆弱**：换个机器人，需要换一整套 API 文档/示例。论文说大模型"开始有点这个能力"，但还很粗糙。
- **没有反馈环路**：代码跑一次就完了，**没有像 Inner Monologue 那样把执行结果再喂回 LLM 的机制**。这是 CaP 留给后续工作的空间。

*所以这一节是想说：CaP 的天花板被 API 设计、prompt 长度和指令复杂度三件事卡住，且不会自我纠错。*

---

## 与别篇的关系

CaP 的精神祖辈和近亲：

- **Codex（Chen et al. 2021）**：CaP 的引擎。如果没有"在代码上预训练的 LLM"，整个方法不存在。
- **SayCan（Ahn et al. 2022）**：典型的"LLM 当规划器，从固定技能里挑"。CaP 直接挑战：不要挑，让 LLM 自己写。
- **Huang et al. 2022（Language Models as Zero-Shot Planners）**：让 LLM 把任务拆成自然语言步骤，再去技能库里查。CaP 的对比基线 "NL Planner" 就是它的实现。
- **Inner Monologue（Huang et al. 2022b）**：和 CaP 同一时期同一队，但走另一条路——把感知/执行结果**拼回 prompt** 形成"内心独白"。CaP 是"写代码"，Inner Monologue 是"边做边汇报"。**两者其实可以叠加**——后续 PaLM-E、ChatGPT-Robotics 等工作就在做这个组合。
- **Socratic Models（Zeng et al. 2022）**：让多模态模型互相对话生成计划。本文把它列为对比对象，结论是 CaP 在数值精确任务上更强（因为代码能算 `+ [0.1, 0]`，自然语言不行）。
- **CLIPort（Shridhar et al. 2022）**：模仿学习基线。CaP 在见过的任务上和它打平，在没见过的任务上**碾压**。

下游 / 后续：

- **PaLM-E（2023）**：把视觉直接进 LLM，规划+控制更紧密。
- **RT-2（2023）**：把动作直接编码成 tokens，端到端 vision-language-action（VLA）模型。和 CaP 走相反方向——CaP 主张"分层 + 代码"，RT-2 主张"端到端 + tokens"。
- **VoxPoser（2023）**、**Code-as-Policies++** 类工作：把 CaP 的 prompt 思路扩展到 3D 体素、价值地图等。

*所以这一节是想说：CaP 是 SayCan 路线的延伸（从"挑技能"到"写代码"），与 Inner Monologue 互补，与 RT-2 类 VLA 模型分别代表两条道路。*

---

## 阅读顺序建议（如果你只有 30 分钟）

1. **先看 Fig. 1 + Fig. 2**（论文第 1 页 + 第 3 页）——三分钟搞清"输入是什么、输出是什么、跨多少机器人"。
2. **跳到 Section III.A、III.B**（方法的 prompt 长什么样）——读 5-10 个示例代码块，体会"hint + example + 指令 → 代码"的模式，这是论文的 90% 价值。
3. **看 Section III.C 的分层例子**——尤其 `parse_obj` + `get_objs_bigger_than_area_th` 那段，是分层代码生成的经典模式。
4. **快速扫 Table I、Table II、Table III**——看到几个关键数（HumanEval 39.8、RoboCodeGen 95、UA UI 长视野 80）就够了。
5. **必读 Section V（Discussion and Limitations）**——作者自己承认的短板比方法本身更值得记下来。
6. **附录 B-J 是 prompt 全文**——遇到具体问题时翻这里抄 prompt。第一次读可以跳。
7. **References 里挑 [1] [17] [18] [22] [36] 看摘要**——分别对应 Codex、SayCan、Inner Monologue、InstructGPT、CLIPort，构成 CaP 的整个上下文坐标系。

*所以这一节是想说：30 分钟读法是 Fig. 1 → 几段 prompt 例子 → 三张表 → 局限性章节。*

---

## FAQ（你可能会问）

**Q1：CaP 会不会被 LLM 写错代码搞崩？**
会。论文里也说了——尤其遇到不在示例里的复杂指令时。但因为代码可读，**人能直接看代码 debug**，比黑箱模仿学习更可控。

**Q2：跑一次要多少钱 / 多少时间？**
论文用的是 OpenAI Codex API（当时免费/低价）。每条指令调用一次 LLM 大约 1-5 秒，分层时多调几次。**没有训练成本**——这是 CaP 最大的卖点之一。

**Q3：能换成开源 LLM 吗？**
可以，但效果会下降。表 I 显示 GPT-3 175B 比 6.7B 高 60+ 分——**模型大小决定能力**。换成 7B 量级的开源模型（当时还没 Llama）成功率会跳水。

**Q4：感知模块出错怎么办？**
CaP 假设感知给的位置是对的。如果 ViLD/MDETR 看错了，代码就跑错——**论文不解决这个问题**。后续 Inner Monologue 系工作把执行反馈接回来才部分缓解。

**Q5：和 ChatGPT 写代码有什么区别？**
没本质区别！CaP 本质就是"针对机器人 API 设计的 ChatGPT-Code-Interpreter"。只不过：(a) prompt 更结构化（Hints + Examples），(b) 多了安全检查和分层递归，(c) 直接 `exec` 在机器人上而不是沙箱。

**Q6：可以用在仿真环境吗？**
完全可以。论文 IV-D 就是在 Ravens 仿真器（继承自 [16] [18]）做的定量评估。

**Q7：为什么不直接让 LLM 输出动作 token，要绕一道代码？**
因为 (a) 代码可读、可调试、可重用；(b) 代码自带控制流（if/while），LLM 用编程语言比用自然语言更精确；(c) 写代码免费拿到 NumPy/Shapely 这些库的全部能力。后来 RT-2 选了相反路线（直接输出动作 token），各有取舍。

**Q8：和 SayCan 到底差在哪？**
SayCan 的技能集是**封闭的**（30-100 个预训练技能）。CaP 的"技能集"是**开放的**——任何能用代码 + API 写出来的逻辑都能现场组合。SayCan 不能做"往右移 10 厘米"，因为它库里没这个技能；CaP 可以，因为 `+ [0.1, 0]` 是普通 NumPy 操作。

**Q9：分层代码生成具体能涨多少？**
HumanEval 上 P@1 +5 点（34.9 → 39.8），RoboCodeGen 上 +14-16 点。**模型越大涨幅越明显**——小模型反而拉低（GPT-3 6.7B 的分层只比扁平好 2 点）。

**Q10：CaP 是不是已经过时了？**
方法本身没过时——你今天用 GPT-4o/Claude 跑 CaP 的 prompt 框架，效果会比 2022 年的 Codex 强很多。**思想已经融进现代 agent 框架**：Claude Code、Codex CLI、SWE-agent 等本质都在做"LLM 写代码 + exec + 看反馈"。CaP 是这条路线在机器人领域的奠基工作。

*所以这一节是想说：CaP 的方法很简单，关键问题都来自"LLM 不可靠 + 感知/控制 API 受限"，但思想本身没过时。*

---

## 延伸阅读

按重要性排：

- **必读**：[Codex 原论文 (Chen et al. 2021, arXiv:2107.03374)](https://arxiv.org/abs/2107.03374)——理解 CaP 的引擎。
- **配套读**：[SayCan (Ahn et al. 2022)](https://say-can.github.io/)、[Inner Monologue (Huang et al. 2022)](https://innermonologue.github.io/)——同期工作的另外两条路线，对比着看才完整。
- **下游**：[VoxPoser (Huang et al. 2023)](https://voxposer.github.io/)——把 CaP 思路扩展到 3D 价值地图。
- **下游**：[PaLM-E (Driess et al. 2023)](https://palm-e.github.io/)——视觉语言一体化的下一代规划器。
- **对照**：[RT-2 (Brohan et al. 2023)](https://robotics-transformer2.github.io/)——走端到端 VLA 路线，和 CaP 是路线之争的两极。
- **官方资源**：[code-as-policies.github.io](https://code-as-policies.github.io/) 有所有视频、Colab 笔记本和完整 prompt——**强烈建议跑一遍 Colab，比读 paper 快**。
- **本仓库相关笔记**：
  - [inner-monologue.md](inner-monologue.md)——闭环反馈版的同类工作
  - [openvla.md](openvla.md)、[rt-2.md](../papers/rt-2/)——VLA 路线对照
  - [saycan.md](saycan.md)（如已生成）——直接前驱

*所以这一节是想说：把 Codex 论文 + SayCan + Inner Monologue + RT-2 串起来看，CaP 在 2022-2023 年这场"LLM 怎么用到机器人"路线之争里的位置就清楚了。*
