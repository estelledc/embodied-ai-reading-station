# 阶段 3 仿真小实验：用 MuJoCo 抓起红色方块

这是一个**最小的教学场景**：桌上有一个红色小方块，一个夹爪从上方下来把它夹起、抬高。整个项目只有几个 Python 文件，目的是让你亲手看到机器人学习里最基本的闭环：

```text
观测（看到什么） → 策略（决定怎么动） → 动作（发给机器人） → 物理仿真（世界发生变化） → 新的观测 …
```

## 先说清楚：它是什么，不是什么

- **是**：一个用 [MuJoCo](https://mujoco.org/) 物理引擎搭的最小抓取场景，外加一个「脚本专家」、录制示范数据的工具、评估工具和自动化测试。
- **不是**：它**不是** VLM_Grasp_Interactive 项目里的 UR5e 机械臂场景，也不能代替那个场景。这里没有真实机械臂的关节和运动学，夹爪只能平移、不能旋转，也没有任何语言模型或视觉模型。
- 物理参数（摩擦系数 1.5、比较硬的接触、每根手指 5 N 的夹紧力）是为了「抓得稳、适合教学」专门调过的，真实世界里的物体没有这么好抓。
- 脚本专家是**作弊**的：它直接读取方块的真实坐标。它的 100% 成功率只说明「这个场景抓得起来」，不代表任何学习算法的水平。

## 场景里有什么

从正前方看，场景大概是这样：

```text
              │   ← 竖杆（只是画出来，表示夹爪挂在龙门架上）
            ┌─┴─┐ ← 手掌
            ▌   ▐ ← 两根手指：沿左右方向张开 / 夹紧
       ■           ■       ■
     红块         蓝块     绿块（蓝、绿是可选的干扰方块）
  ═════════════════════════════════  桌面（高度 z = 0）
```

- **桌面**：一块高度为 0 的平面，带棋盘格花纹。
- **红色方块**：边长 4 厘米，质量 50 克。每个回合开始时随机摆放，中心的 x、y 坐标都在 -10 厘米到 +10 厘米之间。
- **蓝色、绿色方块**：干扰物，可以放 0、1 或 2 个。任意两个方块的中心至少相距 9 厘米，保证夹爪下来时不会压到它们。
- **夹爪**：「龙门式」。想象天花板上有一台吊车，可以前后、左右、上下移动，吊着一个两指夹子。三个方向的移动和两根手指都由「位置伺服电机」驱动（你告诉它目标位置，它自己用力跟过去）；运动部件开了重力补偿，所以夹爪不会自己往下掉。
- **相机**：`front` 从桌子斜前方往下看（观测里的图像就来自它）；`top` 从正上方往下看（调试用）。
- **时间**：物理引擎每一小步算 0.002 秒；你每调用一次 `env.step()`，仿真前进 0.1 秒（50 小步），也就是每秒做 10 次决定（10 Hz）。

坐标方向（站在 `front` 相机的位置看）：**x 向右为正，y 往远处为正，z 向上为正**，单位都是米。

## 安装

1. 需要 Python 3.10 或更新的版本（这里用 Python 3.12 测试过）。
2. 打开终端（命令行窗口），进入本目录：

   ```bash
   cd lab/stage3_sim
   ```

3. 建一个「虚拟环境」（一个独立的 Python 小房间，装的包不会影响系统），然后安装依赖：

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate        # Windows 用：.venv\Scripts\activate
   pip install mujoco numpy pytest imageio
   ```

   - 如果 Ubuntu 提示 `externally-managed-environment`，说明系统不让直接往系统 Python 里装包，照上面先建虚拟环境就行。
   - 如果 `python3 -m venv` 报错说缺 `ensurepip`，先运行 `sudo apt install python3-venv`（或对应版本，比如 `python3.12-venv`）。

4. **只有需要相机图像时**才要关心图形库。在没有显示器的 Linux 服务器上：

   ```bash
   sudo apt-get install -y libegl1 libosmesa6
   export MUJOCO_GL=egl        # 如果 egl 不行，换成：export MUJOCO_GL=osmesa
   ```

   两种方式在没有显卡的机器上都测试通过。如果忘了设置，程序会停下来提示你设置 `MUJOCO_GL`。有显示器的 Windows / macOS 电脑一般不用设置；如果渲染报错，再去查 MuJoCo 文档里关于 `MUJOCO_GL` 的说明。

## 跑测试

在本目录里运行：

```bash
pytest -q
```

（在仓库根目录运行 `pytest -q lab/stage3_sim` 也可以。）应该看到类似 `29 passed, 2 skipped` 的结果。每个点 `.` 是一个通过的测试；`s` 表示「跳过」，被跳过的是两个需要渲染图像的测试。想把它们也跑上：

```bash
LAB_RENDER=1 MUJOCO_GL=egl pytest -q
```

这时应该是 `31 passed`。（Windows PowerShell 的写法是 `$env:LAB_RENDER=1; pytest -q`。）

测试检查了这些事情：观测和动作的形状与类型、动作裁剪、夹爪不会跑出工作空间、同一个种子两次运行结果完全一样、脚本专家在种子 0～19 上至少成功 18 次（带不带干扰方块都测）、随机乱动几乎不可能成功、录制的数据文件齐全、没有显示器时会给出看得懂的提示，以及（渲染测试里）图像不是一张纯色图。

## 运行专家、评估、录制示范

以下命令都在本目录里运行。

**评估脚本专家**（上限参考）和**随机乱动**（下限参考）：

```bash
python evaluate.py --policy expert --episodes 20
python evaluate.py --policy random --episodes 20
```

每行是一个回合（episode）：用了哪个随机种子、成功还是失败、走了多少步、方块最高被抬起多少厘米；最后一行是成功率。「随机种子」（seed）是一个整数：同一个种子每次摆出来的方块位置都一样，所以结果可以复现；第 i 个回合用的种子是 `--seed` + i。我们在 MuJoCo 3.14.0 上实测：

- 脚本专家在种子 0～99 上成功 100/100（放 1 个或 2 个干扰方块时也是 100/100），平均约 17 步完成；
- 随机乱动在种子 0～99 上成功 0/100。

**录制示范数据**（给以后的模仿学习用）：

```bash
python record_demos.py --episodes 20 --out outputs/demos --seed 0
python record_demos.py --episodes 20 --out outputs/demos_no_images --seed 0 --no-render   # 不要图像，更快
```

程序会打印成功率，只保存成功的回合。`outputs/` 目录已经被 git 忽略，生成的数据不会被提交。实测录 20 个带 256×256 图像的回合大约 3 秒、占 7 MB 左右。如果输出目录里已经有旧数据，程序会停下来提醒你；确定要覆盖就加 `--overwrite`。

其他常用参数：`--distractors 2`（放两个干扰方块）、`--image-size 128 128`（图像的高和宽）、`--seed 100`（换一批随机摆放）。

**把一个回合存成 GIF 动图看看**（需要先用带图像的方式录制）：

```python
import numpy as np
import imageio.v2 as imageio

data = np.load("outputs/demos/episode_0000.npz")
imageio.mimsave("outputs/episode_0000.gif", list(data["images"]), duration=100, loop=0)  # 每帧 100 毫秒
```

**在 Python 里自己驱动环境**：

```python
from pick_env import PickCubeEnv
from scripted_expert import ScriptedExpert

env = PickCubeEnv(render=False)      # 不要图像；要图像就写 render=True
expert = ScriptedExpert()
obs = env.reset(seed=0)
while True:
    action = expert.act(obs)
    obs, reward, terminated, truncated, info = env.step(action)
    print(obs["state"], info["success"])
    if terminated or truncated:
        break
env.close()
```

- `terminated`：任务完成（连续 3 步都满足「成功」）。
- `truncated`：步数用完（默认 80 步）还没完成。
- 「成功」的定义：红块比它静止在桌上时高出至少 5 厘米，并且它在两根手指之间。这一步成功时 `reward` 是 1.0，否则是 0.0。

## 状态向量（state）是什么意思

`obs["state"]` 是 4 个数（float32）：

| 位置 | 名字 | 单位 | 含义 |
| --- | --- | --- | --- |
| 0 | `gripper_x` | 米 | 夹爪「抓取点」的 x 坐标（左右） |
| 1 | `gripper_y` | 米 | 抓取点的 y 坐标（前后） |
| 2 | `gripper_z` | 米 | 抓取点离桌面的高度 |
| 3 | `finger_opening` | 米 | 两根手指内侧之间的距离 |

- 「抓取点」是两根手指之间、比指尖底部高 1.2 厘米的那个点。抓取点对准方块中心时，手指正好夹在方块两侧。
- `finger_opening`：完全张开是 0.08（8 厘米）；夹住 4 厘米的方块时约 0.04；什么都没夹就闭合时接近 0。
- 回合开始时，夹爪在 (0, 0, 0.20)，手指完全张开。

## 动作向量（action）是什么意思

每一步你要给出 4 个数：`[dx, dy, dz, gripper]`。

| 位置 | 名字 | 单位 | 含义 |
| --- | --- | --- | --- |
| 0 | `dx` | 米 | 这一步让抓取点沿 x 方向移动多少 |
| 1 | `dy` | 米 | 沿 y 方向移动多少 |
| 2 | `dz` | 米 | 沿 z 方向（上下）移动多少 |
| 3 | `gripper` | 无 | 0.0 = 张开，1.0 = 闭合（大于等于 0.5 就算闭合） |

- `dx`、`dy`、`dz` 每一个都会被限制在 -0.02 到 +0.02 米之间，所以每个方向最快每秒走 20 厘米。
- 目标位置 = 当前位置 + (dx, dy, dz)，然后再限制在工作空间里：x、y 在 -0.15 到 0.15 米之间，z 在 0.015 到 0.30 米之间。
- 这是一种「末端位移（delta）」动作：你说的是「往哪边挪一点」，而不是「每个电机转多少度」。

**和 OpenVLA 的关系**：OpenVLA 每一步输出 7 个数：x/y/z 三个方向的平移、绕三个轴的旋转、夹爪开合（见本站的 [OpenVLA 笔记](../../notes/openvla.md)）。本场景的夹爪不能旋转，所以相当于**去掉了三个旋转维度**，只剩 `[dx, dy, dz, gripper]` 这 4 个数。另外有两点不同：

1. OpenVLA 把每一维切成 256 档，变成语言模型能输出的 token；这里直接用以米为单位的小数。
2. 不同数据集对夹爪数值的约定不一样。比如在 OpenVLA 的训练数据处理里，夹爪一般用 1 表示张开、0 表示闭合，正好和这里相反。以后混用不同来源的数据时，一定要先核对这种约定。

## `cube_pos` 是什么？为什么策略不能用它？

`obs["cube_pos"]` 是红色方块中心在世界里的精确坐标 (x, y, z)。只有仿真器这个「上帝」才知道这个数。

- 真实的机器人没有这个数字。它只能通过相机图像（加上自己夹爪的状态）去「看」方块在哪里。
- 如果一个策略偷看了 `cube_pos`，它在仿真里会表现得很好，一到真实世界就完全不能用。这叫「特权信息泄漏」。
- 所以：脚本专家可以用它（专家是用来生成示范数据的「参考答案」）；`evaluate()` 默认会先把 `cube_pos` 从观测里删掉再交给策略，只有专家评估时才打开 `allow_privileged=True`；录制的示范数据里也不保存它。
- 一个重要的推论：`state` 里只有夹爪自己的信息，**只看 state 的策略不可能知道方块在哪**。想学会这个任务，策略必须看图像。这正是 VLA（视觉-语言-动作）模型要「看」的原因。

## 示范数据的格式

每个成功的回合保存成一个 `episode_XXXX.npz`（用 `numpy.load` 打开），`T` 是这个回合的步数：

- `images`：(T, 256, 256, 3)，uint8，`front` 相机的彩色图像（用 `--no-render` 录制时没有这一项）；
- `states`：(T, 4)，float32，每一步看到的状态；
- `actions`：(T, 4)，float32，每一步做出的动作（已经裁剪过）。

第 t 行的图像、状态、动作是同一时刻的：「看到 `images[t]` 和 `states[t]`，于是做出 `actions[t]`」。

`meta.json` 里记录了：帧率 `fps`（10）、任务文字 `task`、state / action 每一维的含义、用到的种子 `seeds`、失败的种子 `failed_seeds`、成功数 `success_count`、每个文件对应的种子和长度 `episodes`，以及 MuJoCo 版本等。

## 自己动手的实验点子

1. **加干扰物**：`python evaluate.py --policy expert --episodes 100 --distractors 2`。专家应该还是全部成功，想想为什么（提示：看 `MIN_CUBE_DISTANCE`）。
2. **摩擦实验**：在 `pick_env.py` 里找到 `friction="1.5 0.02 0.0001"`，把 1.5 改小再评估专家。我们用 30 个种子试过：0.2 时还能全部成功，0.1 时方块会从手指间滑掉，全部失败。
3. **夹紧力实验**：把 `FINGER_FORCE = 5.0` 改小。我们用 30 个种子试过：0.5 N 还能全部成功，0.3 N 就全部夹不住了。算一算：方块静止时，两根手指的摩擦力（约等于 2 × 摩擦系数 × 夹紧力）至少要大于方块的重量 0.05 kg × 9.8 ≈ 0.5 N；可夹爪每一步都是突然加速往上提，这时需要的力比静止时大得多，所以实际需要的夹紧力比这个静态估算要大。
4. **手不稳会怎样**：给专家的动作加一点随机误差。

   ```python
   import numpy as np
   from evaluate import evaluate
   from scripted_expert import ScriptedExpert

   NOISE = 0.005                    # 每一维加标准差 5 毫米的随机误差
   rng = np.random.default_rng(0)

   class NoisyExpert(ScriptedExpert):
       def act(self, obs):
           action = super().act(obs)
           action[:3] += rng.normal(0.0, NOISE, size=3)
           return action

   print(evaluate(NoisyExpert(), episodes=100, seed=0, allow_privileged=True)["success_rate"])
   ```

   我们试过：3 毫米时 100%，5 毫米时 99%，1 厘米时只剩 27%。为什么误差大了专家会卡住？（提示：看 `scripted_expert.py` 里的 `xy_tolerance`。）
5. **你的第一个学习实验**：用录下来的示范数据做「行为克隆」（让一个小神经网络模仿专家的动作）。先想一想：只用 `states` 能学会吗？再试试用 `images` + `states`。
6. **换个目标**：把任务改成「pick up the blue cube」。需要改 `pick_env.py` 里的任务文字和成功判断，还有专家要去的位置。这就是「听语言指令做事」的雏形。
7. **让方块随机转个角度**：改 `_set_cube_pose` 里的四元数，看专家还能不能抓起来。

## 文件列表

| 文件 | 作用 |
| --- | --- |
| `pick_env.py` | 环境 `PickCubeEnv`：场景描述（MJCF）、`reset` / `step` / `render` / `close` |
| `scripted_expert.py` | 脚本专家 `ScriptedExpert`：接近 → 下降 → 闭合 → 抬起 → 保持 |
| `record_demos.py` | 录制示范数据（`.npz` + `meta.json`） |
| `evaluate.py` | 评估函数 `evaluate(policy_fn, episodes, seed, render)` 和命令行工具 |
| `test_pick_env.py` | 自动化测试 |
| `pytest.ini` | 让 pytest 把缓存留在本目录 |
| `.gitignore` | 忽略 `outputs/`、虚拟环境和缓存 |

## 已知局限

- 这是一个最小教学场景，不是 VLM_Grasp_Interactive 的 UR5e 场景：没有机械臂运动学，夹爪不能旋转，也没有语言理解。
- 物理参数是为了抓取稳定而调的，真实物体没这么「粘」、这么好抓。
- 夹爪的位置伺服很「硬」：每一步开始时会猛地加速（实测往上提时峰值约 9 g），真实机械臂不会这样动。
- 相机图像没有噪声、没有光照变化，比真实相机「干净」很多。
- 专家使用了特权信息，它的成功率不能拿来和学习出来的策略直接比较。
- 上面的实测数字来自 Linux 上的 MuJoCo 3.14.0；换版本或换平台后，数字可能有很小的差别。
