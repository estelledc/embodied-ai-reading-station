"""evaluate：在一组固定的随机种子上评估策略的成功率。

用法（在 lab/stage3_sim 目录里运行）：

    python evaluate.py --policy expert --episodes 20     # 脚本专家（基线上限）
    python evaluate.py --policy random --episodes 20     # 随机策略（基线下限）

以后评估你自己的策略：写一个函数 policy_fn(obs, task) -> action，然后

    from evaluate import evaluate
    result = evaluate(policy_fn, episodes=20, seed=0, render=True)
    print(result["success_rate"])

默认会把特权信息 obs["cube_pos"] 从观测里删掉再交给策略，保证评估公平；
只有脚本专家这种「允许作弊的参考答案」才传 allow_privileged=True。
"""

from __future__ import annotations

import argparse

import numpy as np

from pick_env import MAX_DELTA, PickCubeEnv
from scripted_expert import ScriptedExpert

PRIVILEGED_KEYS = ("cube_pos",)


class RandomPolicy:
    """每一步随机乱动：位移在 [-0.02, 0.02] 内均匀采样，gripper 在 [0, 1] 内均匀采样。"""

    def __init__(self, seed=0):
        self._rng = np.random.default_rng(seed)

    def reset(self):
        pass

    def __call__(self, obs, task):
        delta = self._rng.uniform(-MAX_DELTA, MAX_DELTA, size=3)
        gripper = self._rng.uniform(0.0, 1.0)
        return np.array([delta[0], delta[1], delta[2], gripper], dtype=np.float32)


def hide_privileged(obs):
    """返回一个去掉特权信息（cube_pos）的观测副本。"""
    return {key: value for key, value in obs.items() if key not in PRIVILEGED_KEYS}


def run_episode(env, policy_fn, seed, allow_privileged=False):
    """用 policy_fn 跑一个回合，返回这个回合的结果字典。"""
    obs = env.reset(seed=seed)
    if hasattr(policy_fn, "reset"):
        policy_fn.reset()
    max_lift = 0.0
    while True:
        policy_obs = obs if allow_privileged else hide_privileged(obs)
        action = policy_fn(policy_obs, env.task)
        obs, _, terminated, truncated, info = env.step(action)
        max_lift = max(max_lift, info["lift_height"])
        if terminated or truncated:
            break
    return {
        "seed": seed,
        "success": bool(terminated),
        "steps": info["steps"],
        "max_lift_height": max_lift,
    }


def evaluate(
    policy_fn,
    episodes=20,
    seed=0,
    render=False,
    *,
    n_distractors=0,
    max_steps=80,
    image_size=(256, 256),
    allow_privileged=False,
):
    """评估 policy_fn(obs, task) -> action，第 i 个回合使用种子 seed + i。

    如果 policy_fn 有 reset() 方法，每个回合开始时会调用它。
    返回字典：success_rate、n_success、n_episodes、seed_start、per_episode（每回合结果列表）。
    """
    env = PickCubeEnv(render=render, image_size=image_size, n_distractors=n_distractors, max_steps=max_steps)
    try:
        per_episode = [run_episode(env, policy_fn, seed + i, allow_privileged) for i in range(episodes)]
    finally:
        env.close()
    n_success = sum(result["success"] for result in per_episode)
    return {
        "success_rate": n_success / episodes if episodes > 0 else 0.0,
        "n_success": n_success,
        "n_episodes": episodes,
        "seed_start": seed,
        "per_episode": per_episode,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description="评估策略在 PickCubeEnv 上的成功率")
    parser.add_argument("--policy", choices=["expert", "random"], default="expert")
    parser.add_argument("--episodes", type=int, default=20)
    parser.add_argument("--seed", type=int, default=0, help="第 i 个回合使用种子 seed + i")
    parser.add_argument("--distractors", type=int, choices=[0, 1, 2], default=0, help="干扰方块个数")
    parser.add_argument("--max-steps", type=int, default=80)
    parser.add_argument("--render", action="store_true", help="同时渲染相机图像（看图像的策略才需要）")
    args = parser.parse_args(argv)

    if args.policy == "expert":
        policy, allow_privileged = ScriptedExpert(), True
    else:
        policy, allow_privileged = RandomPolicy(seed=args.seed), False

    result = evaluate(
        policy,
        episodes=args.episodes,
        seed=args.seed,
        render=args.render,
        n_distractors=args.distractors,
        max_steps=args.max_steps,
        allow_privileged=allow_privileged,
    )
    for episode in result["per_episode"]:
        status = "成功 success" if episode["success"] else "失败 failure"
        print(
            f"seed {episode['seed']:4d}  {status}  steps={episode['steps']:3d}  "
            f"max_lift={episode['max_lift_height'] * 100:5.1f} cm"
        )
    print(
        f"policy={args.policy}  成功率 success_rate = {result['success_rate']:.1%} "
        f"({result['n_success']}/{result['n_episodes']})"
    )
    return result


if __name__ == "__main__":
    main()
