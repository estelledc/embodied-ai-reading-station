"""ScriptedExpert：用特权信息 ``cube_pos`` 写死的「专家」抓取脚本。

它不是学出来的策略，而是人写的状态机，用来：
1. 证明这个场景「抓得起来」（物理参数合理）；
2. 录制示范数据（record_demos.py），给以后的模仿学习用；
3. 作为评估时的上限参考（evaluate.py --policy expert）。

注意：专家可以看 ``cube_pos``，学习出来的策略不可以。
"""

from __future__ import annotations

import numpy as np

from pick_env import MAX_DELTA

OPEN = 0.0
CLOSED = 1.0


class ScriptedExpert:
    """按阶段（phase）执行的抓取脚本：

    approach → 移到方块正上方 approach_height 处（夹爪张开）
    descend  → 竖直下降到抓取高度（抓取点对准方块中心）
    close    → 原地闭合夹爪 close_steps 步
    lift     → 夹着方块升到 lift_z
    hold     → 保持不动（夹紧）
    """

    def __init__(self, approach_height=0.10, lift_z=0.20, close_steps=3, xy_tolerance=0.003, z_tolerance=0.004):
        self.approach_height = approach_height
        self.lift_z = lift_z
        self.close_steps = close_steps
        self.xy_tolerance = xy_tolerance
        self.z_tolerance = z_tolerance
        self.reset()

    def reset(self):
        """每个新回合开始前调用，回到第一个阶段。"""
        self.phase = "approach"
        self._close_count = 0

    def act(self, obs):
        """根据观测返回动作 [dx, dy, dz, gripper]（float32，已裁剪到 ±0.02 m）。"""
        gripper = np.asarray(obs["state"][:3], dtype=np.float64)
        cube = np.asarray(obs["cube_pos"], dtype=np.float64)
        self._update_phase(gripper, cube)
        if self.phase == "close":
            self._close_count += 1
        target, grip = self._target_for_phase(gripper, cube)
        delta = np.clip(target - gripper, -MAX_DELTA, MAX_DELTA)
        return np.array([delta[0], delta[1], delta[2], grip], dtype=np.float32)

    def __call__(self, obs, task=None):
        """让专家也符合 evaluate.py 要求的 policy_fn(obs, task) 形式。"""
        return self.act(obs)

    # ----- 内部工具 -------------------------------------------------------

    def _reached(self, gripper, target):
        xy_error = np.linalg.norm(target[:2] - gripper[:2])
        z_error = abs(target[2] - gripper[2])
        return xy_error < self.xy_tolerance and z_error < self.z_tolerance

    def _update_phase(self, gripper, cube):
        """检查是否满足进入下一阶段的条件。"""
        above_cube = cube + np.array([0.0, 0.0, self.approach_height])
        if self.phase == "approach" and self._reached(gripper, above_cube):
            self.phase = "descend"
        if self.phase == "descend" and self._reached(gripper, cube):
            self.phase = "close"
        if self.phase == "close" and self._close_count >= self.close_steps:
            self.phase = "lift"
        if self.phase == "lift" and gripper[2] >= self.lift_z - self.z_tolerance:
            self.phase = "hold"

    def _target_for_phase(self, gripper, cube):
        """当前阶段想让抓取点去哪里，以及夹爪要张开还是闭合。"""
        if self.phase == "approach":
            return cube + np.array([0.0, 0.0, self.approach_height]), OPEN
        if self.phase == "descend":
            return cube, OPEN
        if self.phase == "close":
            return gripper, CLOSED
        if self.phase == "lift":
            return np.array([gripper[0], gripper[1], self.lift_z]), CLOSED
        return gripper, CLOSED  # hold
