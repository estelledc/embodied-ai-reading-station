"""PickCubeEnv：一个最小的 MuJoCo「抓起红色方块」教学环境。

场景全部写在下面的 MJCF 字符串里，不依赖任何外部模型文件：

- 一张桌面（z = 0 的平面）；
- 一个红色方块（边长 4 cm、质量 0.05 kg、自由关节，可以被推动、被抓起）；
- 可选的蓝色 / 绿色干扰方块（``n_distractors`` = 0、1 或 2）；
- 一个「龙门式」夹爪：夹爪本体用 x / y / z 三个滑动关节平移（不能旋转），
  两根手指用滑动关节向中间夹紧。所有关节都由 position 执行器（PD 伺服）驱动；
  运动部件开启重力补偿（``gravcomp="1"``），相当于有电机托着，不会往下掉。

时间：物理步长 0.002 s；一次 ``step()`` 推进 0.1 s（50 个物理步），即 10 Hz 控制。

观测 ``obs`` 是一个字典：

- ``state``：float32 (4,) = [gripper_x, gripper_y, gripper_z, finger_opening_m]
- ``image``：uint8 (H, W, 3)，来自相机 ``front``（只有 ``render=True`` 时才有）
- ``cube_pos``：float32 (3,)，红色方块中心的真实位置。它是 **特权信息**，
  只给脚本专家和评估代码用；学习出来的策略（policy）绝不能读取它，
  因为真实机器人上没有人会直接告诉你方块的精确坐标。

动作 ``action`` 是 float32 (4,) = [dx, dy, dz, gripper]：

- dx, dy, dz：夹爪「抓取点」的位移（米），每一维裁剪到 [-0.02, 0.02]；
  目标位置 = 当前位置 + 位移，再裁剪到工作空间内；
- gripper：0.0 = 张开，1.0 = 闭合（>= 0.5 视为闭合）。
"""

from __future__ import annotations

import mujoco
import numpy as np

# ---------------------------------------------------------------------------
# 常量（单位：米 m、秒 s、千克 kg、牛顿 N）
# ---------------------------------------------------------------------------

TASK = "pick up the red cube"

TIMESTEP = 0.002  # 物理仿真步长 (s)
N_SUBSTEPS = 50  # 每次 step() 跑 50 个物理步 = 0.1 s
CONTROL_HZ = 10  # 所以控制频率是 10 Hz

MAX_DELTA = 0.02  # 每步每个方向最多移动 2 cm
GRIPPER_THRESHOLD = 0.5  # gripper 动作 >= 0.5 表示「闭合」

CUBE_HALF_SIZE = 0.02  # 方块半边长 → 边长 4 cm
CUBE_MASS = 0.05
CUBE_XY_RANGE = 0.10  # 方块中心 x、y 在 [-0.10, 0.10] 内均匀随机
MIN_CUBE_DISTANCE = 0.09  # 任意两个方块中心至少相距 9 cm，夹爪下落时不会压到别的方块

# 夹爪「抓取点」（两根手指之间、靠近指尖的中心点）允许到达的范围 [x, y, z]
WORKSPACE_LOW = np.array([-0.15, -0.15, 0.015])
WORKSPACE_HIGH = np.array([0.15, 0.15, 0.30])
HOME_POSITION = np.array([0.0, 0.0, 0.20])  # reset() 后夹爪所在的位置

# 手指几何（在夹爪坐标系里，原点 = 抓取点）
FINGER_HALF_WIDTH = 0.012  # x 方向半宽
FINGER_HALF_THICKNESS = 0.006  # y 方向半厚
FINGER_HALF_LENGTH = 0.035  # z 方向半长 → 手指长 7 cm
FINGER_BOTTOM = -0.012  # 指尖底面比抓取点低 1.2 cm
FINGER_TRAVEL = 0.04  # 每根手指最多向外张开 4 cm → 最大开口 8 cm
FINGER_FORCE = 5.0  # 每根手指的最大夹紧力 (N)：力有限，才能「捏住」而不是「压穿」

SUCCESS_LIFT = 0.05  # 方块比静止时高出 5 cm 以上，并且在两指之间 → success
SUCCESS_HOLD_STEPS = 3  # 连续 3 步 success → terminated

# 方块名字与颜色（RGBA）。第一个永远是目标红块，后两个是干扰块。
CUBES = (
    ("red_cube", "0.85 0.10 0.10 1"),
    ("blue_cube", "0.10 0.25 0.85 1"),
    ("green_cube", "0.10 0.70 0.20 1"),
)

STATE_SEMANTICS = (
    "gripper_x [m]: grasp point x in the world frame",
    "gripper_y [m]: grasp point y in the world frame",
    "gripper_z [m]: grasp point height above the table",
    "finger_opening [m]: distance between the inner finger faces (0.08 = fully open)",
)
ACTION_SEMANTICS = (
    "dx [m]: grasp point x delta, clipped to [-0.02, 0.02]",
    "dy [m]: grasp point y delta, clipped to [-0.02, 0.02]",
    "dz [m]: grasp point z delta, clipped to [-0.02, 0.02]",
    "gripper: 0.0 = open, 1.0 = closed (values >= 0.5 close the fingers)",
)


# ---------------------------------------------------------------------------
# 场景描述（MJCF）
# ---------------------------------------------------------------------------


def _cube_xml(name: str, rgba: str, x: float) -> str:
    """一个带自由关节（6 自由度：能被推、被抓、被翻）的方块。真正的位置在 reset() 里设置。"""
    h = CUBE_HALF_SIZE
    return f"""
    <body name="{name}" pos="{x:g} 0.3 {h:g}">
      <freejoint name="{name}_joint"/>
      <geom name="{name}_geom" type="box" size="{h:g} {h:g} {h:g}" mass="{CUBE_MASS:g}" rgba="{rgba}"/>
    </body>"""


def build_scene_xml(n_distractors: int = 0) -> str:
    """返回整个场景的 MJCF（XML 字符串）。n_distractors 决定放几个干扰方块。"""
    cubes = "".join(
        _cube_xml(name, rgba, x=0.1 * i) for i, (name, rgba) in enumerate(CUBES[: 1 + n_distractors])
    )
    lo, hi = WORKSPACE_LOW, WORKSPACE_HIGH
    t = FINGER_HALF_THICKNESS
    finger_size = f"{FINGER_HALF_WIDTH:g} {t:g} {FINGER_HALF_LENGTH:g}"
    finger_center_z = FINGER_BOTTOM + FINGER_HALF_LENGTH
    palm_half_height = 0.01
    palm_center_z = FINGER_BOTTOM + 2 * FINGER_HALF_LENGTH + palm_half_height  # 手掌正好压在手指顶上
    arm_gains = 'kp="2000" kv="60" forcerange="-60 60"'
    finger_gains = f'kp="300" kv="10" forcerange="-{FINGER_FORCE:g} {FINGER_FORCE:g}"'
    return f"""
<mujoco model="pick_cube">
  <option timestep="{TIMESTEP:g}" integrator="implicitfast" cone="elliptic" impratio="10"/>

  <visual>
    <headlight ambient="0.3 0.3 0.3" diffuse="0.3 0.3 0.3" specular="0 0 0"/>
    <quality shadowsize="1024"/>
  </visual>

  <asset>
    <texture name="sky" type="skybox" builtin="gradient" width="128" height="128"
             rgb1="0.60 0.72 0.88" rgb2="0.20 0.24 0.30"/>
    <texture name="table_tex" type="2d" builtin="checker" width="256" height="256"
             rgb1="0.85 0.80 0.72" rgb2="0.74 0.69 0.62"/>
    <material name="table_mat" texture="table_tex" texrepeat="6 6" specular="0"/>
  </asset>

  <default>
    <!-- 所有几何体共用的接触参数。condim 4 = 滑动摩擦 + 扭转摩擦；
         friction 1.5 很「粘」，solref / solimp 让接触更硬、穿透更小，抓取更可靠。 -->
    <geom condim="4" friction="1.5 0.02 0.0001" solref="0.01 1" solimp="0.95 0.99 0.001"/>
  </default>

  <worldbody>
    <!-- 灯在正上方：影子落在物体正下方，图像里能看出夹爪离桌面有多高。 -->
    <light name="lamp" pos="0 0 1.5" dir="0 0 -1" diffuse="0.5 0.5 0.5"/>
    <geom name="table" type="plane" size="0.5 0.5 0.01" material="table_mat"/>

    <!-- front：从桌子前方斜向下看工作区；top：从正上方往下看。 -->
    <camera name="front" pos="0 -0.5 0.38" xyaxes="1 0 0 0 0.514 0.857"/>
    <camera name="top" pos="0 0 0.8" xyaxes="1 0 0 0 1 0"/>
{cubes}

    <!-- 龙门式夹爪。body 原点就是「抓取点」，三个滑动关节让它沿 x / y / z 平移。 -->
    <body name="gripper" gravcomp="1">
      <joint name="gripper_x" type="slide" axis="1 0 0" range="{lo[0]:g} {hi[0]:g}"/>
      <joint name="gripper_y" type="slide" axis="0 1 0" range="{lo[1]:g} {hi[1]:g}"/>
      <joint name="gripper_z" type="slide" axis="0 0 1" range="{lo[2]:g} {hi[2]:g}"/>
      <geom name="palm" type="box" size="0.02 0.065 {palm_half_height:g}" pos="0 0 {palm_center_z:g}"
            mass="0.3" rgba="0.35 0.35 0.40 1"/>
      <!-- 只用来显示的竖杆（不参与碰撞、没有质量），表示夹爪挂在龙门架上。 -->
      <geom name="mast" type="cylinder" size="0.008 0.15" pos="0 0 {palm_center_z + 0.16:g}"
            contype="0" conaffinity="0" mass="0" rgba="0.60 0.60 0.65 1"/>

      <!-- 左指：滑动方向 +y；关节值 = 左指内侧面到抓取点的距离。 -->
      <body name="left_finger" pos="0 {t:g} 0" gravcomp="1">
        <joint name="left_finger" type="slide" axis="0 1 0" range="0 {FINGER_TRAVEL:g}"/>
        <geom name="left_finger" type="box" size="{finger_size}" pos="0 0 {finger_center_z:g}"
              mass="0.05" rgba="0.15 0.15 0.15 1"/>
      </body>
      <!-- 右指：滑动方向 -y；关节值 = 右指内侧面到抓取点的距离。 -->
      <body name="right_finger" pos="0 -{t:g} 0" gravcomp="1">
        <joint name="right_finger" type="slide" axis="0 -1 0" range="0 {FINGER_TRAVEL:g}"/>
        <geom name="right_finger" type="box" size="{finger_size}" pos="0 0 {finger_center_z:g}"
              mass="0.05" rgba="0.15 0.15 0.15 1"/>
      </body>
    </body>
  </worldbody>

  <contact>
    <exclude body1="left_finger" body2="right_finger"/>
  </contact>

  <actuator>
    <!-- position 执行器 = PD 伺服：力 = kp * (目标 - 当前) - kv * 速度，再限制在 forcerange 内。 -->
    <position name="gripper_x" joint="gripper_x" {arm_gains} ctrlrange="{lo[0]:g} {hi[0]:g}"/>
    <position name="gripper_y" joint="gripper_y" {arm_gains} ctrlrange="{lo[1]:g} {hi[1]:g}"/>
    <position name="gripper_z" joint="gripper_z" {arm_gains} ctrlrange="{lo[2]:g} {hi[2]:g}"/>
    <!-- 两根手指收到同一个命令：目标 0 = 闭合，目标 {FINGER_TRAVEL:g} = 张开。 -->
    <position name="left_finger" joint="left_finger" {finger_gains} ctrlrange="0 {FINGER_TRAVEL:g}"/>
    <position name="right_finger" joint="right_finger" {finger_gains} ctrlrange="0 {FINGER_TRAVEL:g}"/>
  </actuator>
</mujoco>
"""


# ---------------------------------------------------------------------------
# 环境
# ---------------------------------------------------------------------------


class PickCubeEnv:
    """抓起红色方块的最小教学环境，接口仿照 Gymnasium（reset / step / close）。

    参数：
        seed：随机种子；相同种子 → 相同的方块摆放 → 相同的仿真结果。
        image_size：(高, 宽)，相机图像的像素尺寸。
        render：是否渲染相机图像。关掉以后更快，也不需要任何图形库。
        n_distractors：干扰方块个数（0、1 或 2）。
        max_steps：一个回合最多多少步，到了就 truncated。
    """

    task = TASK

    def __init__(self, seed=None, image_size=(256, 256), render=True, n_distractors=0, max_steps=80):
        if n_distractors not in (0, 1, 2):
            raise ValueError(f"n_distractors 必须是 0、1 或 2，收到 {n_distractors!r}")
        if max_steps < 1:
            raise ValueError(f"max_steps 必须 >= 1，收到 {max_steps!r}")

        self.n_distractors = n_distractors
        self.max_steps = max_steps
        self.image_size = (int(image_size[0]), int(image_size[1]))
        self.render_enabled = bool(render)
        self.cube_names = [name for name, _ in CUBES[: 1 + n_distractors]]

        self.model = mujoco.MjModel.from_xml_string(build_scene_xml(n_distractors))
        self.data = mujoco.MjData(self.model)
        self._rng = np.random.default_rng(seed)
        self._renderer = self._make_renderer() if self.render_enabled else None

        self._steps = 0
        self._success_streak = 0
        self._rest_height = CUBE_HALF_SIZE
        self._episode_over = True  # 必须先 reset() 才能 step()

    # ----- 公开接口 -------------------------------------------------------

    def reset(self, seed=None):
        """开始新回合：随机摆放方块，夹爪张开回到 home 位置。返回第一帧观测。"""
        if seed is not None:
            self._rng = np.random.default_rng(seed)
        mujoco.mj_resetData(self.model, self.data)
        self._set_gripper(HOME_POSITION, FINGER_TRAVEL)
        for name, xy in zip(self.cube_names, self._sample_cube_xy()):
            self._set_cube_pose(name, xy)
        mujoco.mj_forward(self.model, self.data)
        self._settle()

        self._rest_height = float(self._cube_position()[2])
        self._steps = 0
        self._success_streak = 0
        self._episode_over = False
        return self._get_obs()

    def step(self, action):
        """执行一个 4 维动作，推进 0.1 s。返回 (obs, reward, terminated, truncated, info)。

        reward：这一步 success 就是 1.0，否则 0.0。
        terminated：连续 3 步 success（任务完成）。
        truncated：用完 max_steps 步还没完成。
        info：success、cube_height（红块中心离桌面的高度）、lift_height（比静止时高了多少）、
              cube_between_fingers（红块是否在两指之间）、steps（本回合已走的步数）。
        """
        if self._episode_over:
            raise RuntimeError("请先调用 reset()：新回合开始前、或上一回合结束后都要 reset。")
        action = self.clip_action(action)
        self._apply_action(action)
        for _ in range(N_SUBSTEPS):
            mujoco.mj_step(self.model, self.data)
        self._steps += 1

        success = self._is_success()
        self._success_streak = self._success_streak + 1 if success else 0
        terminated = self._success_streak >= SUCCESS_HOLD_STEPS
        truncated = self._steps >= self.max_steps and not terminated
        self._episode_over = terminated or truncated

        reward = 1.0 if success else 0.0
        return self._get_obs(), reward, terminated, truncated, self._get_info(success)

    def render(self, camera="front"):
        """从指定相机（"front" 或 "top"）渲染一张 uint8 (H, W, 3) 图像。"""
        if self._renderer is None:
            raise RuntimeError("这个环境是用 render=False 创建的（或已经 close），不能渲染图像。")
        self._renderer.update_scene(self.data, camera=camera)
        return self._renderer.render()

    def close(self):
        """释放渲染器占用的图形资源。close 之后不要再使用这个环境。"""
        if self._renderer is not None:
            self._renderer.close()
            self._renderer = None

    @staticmethod
    def clip_action(action):
        """检查并裁剪动作：位移裁剪到 [-0.02, 0.02]，gripper 裁剪到 [0, 1]。"""
        action = np.asarray(action, dtype=np.float32)
        if action.shape != (4,):
            raise ValueError(f"action 必须是形状 (4,) 的数组 [dx, dy, dz, gripper]，收到形状 {action.shape}")
        if not np.all(np.isfinite(action)):
            raise ValueError(f"action 里有 NaN 或无穷大：{action}")
        clipped = action.copy()
        clipped[:3] = np.clip(clipped[:3], -MAX_DELTA, MAX_DELTA)
        clipped[3] = np.clip(clipped[3], 0.0, 1.0)
        return clipped

    def cube_positions(self):
        """所有方块中心的位置，字典 {名字: array(3,)}。用于检查和调试，不是策略输入。"""
        return {name: self._cube_position(name) for name in self.cube_names}

    # ----- 内部工具 -------------------------------------------------------

    def _make_renderer(self):
        height, width = self.image_size
        # 离屏渲染缓冲区不能比图像小
        self.model.vis.global_.offheight = max(self.model.vis.global_.offheight, height)
        self.model.vis.global_.offwidth = max(self.model.vis.global_.offwidth, width)
        return mujoco.Renderer(self.model, height=height, width=width)

    def _set_gripper(self, position, finger_travel):
        """直接把夹爪「摆」到某个位置（只在 reset 里用），并让执行器目标与之一致。"""
        for axis, value in zip("xyz", position):
            self.data.joint(f"gripper_{axis}").qpos[0] = value
            self.data.actuator(f"gripper_{axis}").ctrl[0] = value
        for side in ("left", "right"):
            self.data.joint(f"{side}_finger").qpos[0] = finger_travel
            self.data.actuator(f"{side}_finger").ctrl[0] = finger_travel

    def _set_cube_pose(self, name, xy):
        """自由关节的 qpos 有 7 个数：位置 [x, y, z] + 姿态四元数 [qw, qx, qy, qz]。"""
        qpos = self.data.joint(f"{name}_joint").qpos
        qpos[:] = [xy[0], xy[1], CUBE_HALF_SIZE, 1.0, 0.0, 0.0, 0.0]

    def _sample_cube_xy(self):
        """先采样红块（保证它在范围内均匀分布），再用「拒绝采样」放干扰块，避免互相重叠。"""
        positions = [self._rng.uniform(-CUBE_XY_RANGE, CUBE_XY_RANGE, size=2)]
        attempts = 0
        while len(positions) < len(self.cube_names):
            attempts += 1
            if attempts > 10_000:
                raise RuntimeError("找不到互不重叠的方块位置，请检查 CUBE_XY_RANGE 与 MIN_CUBE_DISTANCE")
            candidate = self._rng.uniform(-CUBE_XY_RANGE, CUBE_XY_RANGE, size=2)
            if all(np.linalg.norm(candidate - p) >= MIN_CUBE_DISTANCE for p in positions):
                positions.append(candidate)
        return positions

    def _settle(self, n_substeps=100):
        """reset 后先空跑 0.2 s，让方块稳稳落在桌面上（夹爪保持在 home 不动）。"""
        for _ in range(n_substeps):
            mujoco.mj_step(self.model, self.data)

    def _apply_action(self, action):
        """把（已裁剪的）动作翻译成 5 个执行器的目标值。"""
        target = np.clip(self._gripper_position() + action[:3], WORKSPACE_LOW, WORKSPACE_HIGH)
        finger_target = 0.0 if action[3] >= GRIPPER_THRESHOLD else FINGER_TRAVEL
        for axis, value in zip("xyz", target):
            self.data.actuator(f"gripper_{axis}").ctrl[0] = value
        for side in ("left", "right"):
            self.data.actuator(f"{side}_finger").ctrl[0] = finger_target

    def _gripper_position(self):
        return np.array([self.data.joint(f"gripper_{axis}").qpos[0] for axis in "xyz"])

    def _finger_opening(self):
        """两根手指内侧面之间的距离 = 左指关节值 + 右指关节值。"""
        return self.data.joint("left_finger").qpos[0] + self.data.joint("right_finger").qpos[0]

    def _cube_position(self, name="red_cube"):
        return self.data.joint(f"{name}_joint").qpos[:3].copy()

    def _lift_height(self):
        return self._cube_position()[2] - self._rest_height

    def _cube_between_fingers(self):
        """红块中心是否夹在两根手指的内侧面之间（夹爪不会旋转，直接用相对坐标判断）。"""
        rel = self._cube_position() - self._gripper_position()
        left = self.data.joint("left_finger").qpos[0]  # 左指内侧面在 y = +left
        right = self.data.joint("right_finger").qpos[0]  # 右指内侧面在 y = -right
        inside_y = -right <= rel[1] <= left
        inside_x = abs(rel[0]) <= FINGER_HALF_WIDTH + CUBE_HALF_SIZE
        inside_z = FINGER_BOTTOM - CUBE_HALF_SIZE <= rel[2] <= FINGER_BOTTOM + 2 * FINGER_HALF_LENGTH
        return bool(inside_x and inside_y and inside_z)

    def _is_success(self):
        return bool(self._lift_height() >= SUCCESS_LIFT and self._cube_between_fingers())

    def _get_obs(self):
        state = np.append(self._gripper_position(), self._finger_opening()).astype(np.float32)
        # cube_pos 是特权信息：只给脚本专家和评估代码看，学习出来的策略不能用。
        obs = {"state": state, "cube_pos": self._cube_position().astype(np.float32)}
        if self.render_enabled:
            obs["image"] = self.render("front")
        return obs

    def _get_info(self, success):
        return {
            "success": bool(success),
            "cube_height": float(self._cube_position()[2]),
            "lift_height": float(self._lift_height()),
            "cube_between_fingers": self._cube_between_fingers(),
            "steps": self._steps,
        }
