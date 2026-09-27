"""record_demos：让脚本专家跑若干回合，把成功的回合保存成示范数据（.npz）。

用法（在 lab/stage3_sim 目录里运行）：

    python record_demos.py --episodes 20 --out outputs/demos --seed 0
    python record_demos.py --episodes 20 --out outputs/demos --seed 0 --no-render   # 不要图像，更快

输出目录里会有：

- episode_0000.npz、episode_0001.npz …：每个成功回合一个文件，包含
  images (T, H, W, 3) uint8（只有渲染时才有）、states (T, 4) float32、actions (T, 4) float32。
  第 t 行是「第 t 步看到的观测」和「第 t 步做出的动作」。
- meta.json：帧率、任务文字、state / action 每一维的含义、用到的种子、成功数等。

特权信息 cube_pos 不会被保存：示范数据只包含策略被允许看到的东西。
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import mujoco
import numpy as np

from pick_env import ACTION_SEMANTICS, CONTROL_HZ, STATE_SEMANTICS, TASK, PickCubeEnv
from scripted_expert import ScriptedExpert


def record_episode(env, expert, seed):
    """用专家跑一个回合。返回 (数组字典, 是否成功)。"""
    obs = env.reset(seed=seed)
    expert.reset()
    images, states, actions = [], [], []
    while True:
        action = env.clip_action(expert.act(obs))  # 记录环境真正执行的（裁剪后的）动作
        if "image" in obs:
            images.append(obs["image"])
        states.append(obs["state"])
        actions.append(action)
        obs, _, terminated, truncated, _ = env.step(action)
        if terminated or truncated:
            break
    arrays = {"states": np.stack(states), "actions": np.stack(actions)}
    if images:
        arrays["images"] = np.stack(images)
    return arrays, bool(terminated)


def prepare_output_dir(out_dir, overwrite):
    """创建输出目录。如果里面已经有旧的示范数据，默认报错，加 overwrite=True 才删除旧文件。"""
    out_dir.mkdir(parents=True, exist_ok=True)
    old_files = sorted(out_dir.glob("episode_*.npz"))
    meta_file = out_dir / "meta.json"
    if not old_files and not meta_file.exists():
        return
    if not overwrite:
        raise FileExistsError(f"{out_dir} 里已经有旧的示范数据。请换一个 --out 目录，或加 --overwrite 覆盖。")
    for old_file in old_files:
        old_file.unlink()
    meta_file.unlink(missing_ok=True)


def record_demos(
    episodes=20,
    out_dir="outputs/demos",
    seed=0,
    render=True,
    *,
    n_distractors=0,
    max_steps=80,
    image_size=(256, 256),
    overwrite=False,
):
    """录制示范数据，返回写进 meta.json 的字典。第 i 个回合使用种子 seed + i。"""
    out_dir = Path(out_dir)
    # 先创建环境：如果渲染配置有问题，在动任何文件之前就报错
    env = PickCubeEnv(render=render, image_size=image_size, n_distractors=n_distractors, max_steps=max_steps)
    expert = ScriptedExpert()
    saved, failed_seeds = [], []
    try:
        prepare_output_dir(out_dir, overwrite)
        for i in range(episodes):
            episode_seed = seed + i
            arrays, success = record_episode(env, expert, episode_seed)
            if not success:
                failed_seeds.append(episode_seed)
                continue
            filename = f"episode_{len(saved):04d}.npz"
            np.savez_compressed(out_dir / filename, **arrays)
            saved.append({"file": filename, "seed": episode_seed, "length": len(arrays["actions"])})
    finally:
        env.close()

    meta = {
        "task": TASK,
        "fps": CONTROL_HZ,
        "generator": "ScriptedExpert in lab/stage3_sim/scripted_expert.py",
        "mujoco_version": mujoco.__version__,
        "episodes_attempted": episodes,
        "success_count": len(saved),
        "success_rate": len(saved) / episodes if episodes > 0 else 0.0,
        "seed_start": seed,
        "seeds": [seed + i for i in range(episodes)],
        "failed_seeds": failed_seeds,
        "render": render,
        "camera": "front" if render else None,
        "image_size_hw": list(image_size) if render else None,
        "n_distractors": n_distractors,
        "max_steps": max_steps,
        "state_semantics": list(STATE_SEMANTICS),
        "action_semantics": list(ACTION_SEMANTICS),
        "arrays": {
            "images": "(T, H, W, 3) uint8 camera 'front' image seen at step t (only when render=true)",
            "states": "(T, 4) float32 state seen at step t",
            "actions": "(T, 4) float32 action taken at step t (already clipped)",
        },
        "privileged_info": "cube_pos is NOT saved; policies trained on these demos must not use it",
        "episodes": saved,
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return meta


def main(argv=None):
    parser = argparse.ArgumentParser(description="用脚本专家录制 PickCubeEnv 示范数据")
    parser.add_argument("--episodes", type=int, default=20)
    parser.add_argument("--out", default="outputs/demos", help="输出目录（outputs/ 已被 git 忽略）")
    parser.add_argument("--seed", type=int, default=0, help="第 i 个回合使用种子 seed + i")
    parser.add_argument("--no-render", action="store_true", help="不渲染图像（更快，也不需要图形库）")
    parser.add_argument("--distractors", type=int, choices=[0, 1, 2], default=0, help="干扰方块个数")
    parser.add_argument("--image-size", type=int, nargs=2, default=[256, 256], metavar=("H", "W"))
    parser.add_argument("--overwrite", action="store_true", help="删除输出目录里旧的示范数据后再录制")
    args = parser.parse_args(argv)

    meta = record_demos(
        episodes=args.episodes,
        out_dir=args.out,
        seed=args.seed,
        render=not args.no_render,
        n_distractors=args.distractors,
        image_size=tuple(args.image_size),
        overwrite=args.overwrite,
    )
    print(
        f"成功率 success_rate = {meta['success_rate']:.1%} "
        f"({meta['success_count']}/{meta['episodes_attempted']})，"
        f"已保存到 {Path(args.out).resolve()}"
    )
    if meta["failed_seeds"]:
        print(f"失败的种子（没有保存）：{meta['failed_seeds']}")
    return meta


if __name__ == "__main__":
    main()
