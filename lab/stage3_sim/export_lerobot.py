"""export_lerobot：把 record_demos.py 录下的示范数据转成 LeRobotDataset，给 lerobot-train 用。

用法（在 lab/stage3_sim 目录里运行，需要先 `pip install -r ../requirements-vla.txt`）：

    python record_demos.py --episodes 50 --out outputs/demos --seed 0
    python export_lerobot.py --demos outputs/demos --root outputs/lerobot_pick_cube

之后可以这样读回来检查：

    from lerobot.datasets.lerobot_dataset import LeRobotDataset
    ds = LeRobotDataset("local/pick_cube", root="outputs/lerobot_pick_cube")
    print(ds.num_episodes, ds.num_frames, ds[0].keys())

字段对应关系（左边是 .npz 里的数组，右边是 LeRobotDataset 里的特征名）：

- images  (T, H, W, 3) uint8  → observation.images.front
- states  (T, 4) float32      → observation.state   [gripper_x, gripper_y, gripper_z, finger_opening]
- actions (T, 4) float32      → action              [dx, dy, dz, gripper]
- meta.json 里的 task 文字     → 每一帧的 task（例如 "pick up the red cube"）

必须是带图像录制的示范（不能用 --no-render）：VLA 策略要靠看图知道方块在哪。
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

import numpy as np

ROBOT_TYPE = "lab_gantry_gripper"


def load_demos(demos_dir):
    """读入 meta.json 和所有 episode_XXXX.npz，返回 (meta, [数组字典, ...])。"""
    demos_dir = Path(demos_dir)
    meta_file = demos_dir / "meta.json"
    if not meta_file.exists():
        raise FileNotFoundError(f"{meta_file} 不存在：请先运行 record_demos.py。")
    meta = json.loads(meta_file.read_text(encoding="utf-8"))
    episodes = []
    for entry in meta["episodes"]:
        with np.load(demos_dir / entry["file"]) as data:
            episodes.append({key: data[key] for key in data.files})
    if not episodes:
        raise ValueError(f"{demos_dir} 里没有成功的示范回合。")
    if "images" not in episodes[0]:
        raise ValueError("示范数据里没有图像。请去掉 --no-render 重新录制：VLA 策略必须看图。")
    return meta, episodes


def build_features(image_shape, state_names, action_names):
    """LeRobotDataset 需要事先声明每个特征的类型、形状和每一维的名字。"""
    return {
        "observation.images.front": {
            "dtype": "image",
            "shape": tuple(int(x) for x in image_shape),
            "names": ["height", "width", "channels"],
        },
        "observation.state": {
            "dtype": "float32",
            "shape": (len(state_names),),
            "names": list(state_names),
        },
        "action": {
            "dtype": "float32",
            "shape": (len(action_names),),
            "names": list(action_names),
        },
    }


def export_lerobot(demos_dir, root, repo_id="local/pick_cube", overwrite=False):
    """把示范目录转成 LeRobotDataset，返回创建好的数据集对象。"""
    from lerobot.datasets.lerobot_dataset import LeRobotDataset

    meta, episodes = load_demos(demos_dir)
    root = Path(root)
    if root.exists():
        if not overwrite:
            raise FileExistsError(f"{root} 已存在。请换一个 --root，或加 --overwrite 覆盖。")
        shutil.rmtree(root)

    state_names = [item.split(":")[0].strip() for item in meta["state_semantics"]]
    action_names = [item.split(":")[0].strip() for item in meta["action_semantics"]]
    features = build_features(episodes[0]["images"].shape[1:], state_names, action_names)
    dataset = LeRobotDataset.create(
        repo_id=repo_id,
        fps=int(meta["fps"]),
        features=features,
        root=root,
        robot_type=ROBOT_TYPE,
        use_videos=False,
    )
    for episode in episodes:
        for image, state, action in zip(episode["images"], episode["states"], episode["actions"]):
            dataset.add_frame(
                {
                    "observation.images.front": image,
                    "observation.state": state.astype(np.float32),
                    "action": action.astype(np.float32),
                    "task": meta["task"],
                }
            )
        dataset.save_episode()
    dataset.finalize()
    return dataset


def main(argv=None):
    parser = argparse.ArgumentParser(description="把 PickCubeEnv 示范数据转成 LeRobotDataset")
    parser.add_argument("--demos", default="outputs/demos", help="record_demos.py 的输出目录")
    parser.add_argument("--root", default="outputs/lerobot_pick_cube", help="LeRobotDataset 的保存目录")
    parser.add_argument("--repo-id", default="local/pick_cube", help="数据集名字；只在本地使用时随便起一个即可")
    parser.add_argument("--overwrite", action="store_true", help="删除已存在的 --root 目录后重新导出")
    args = parser.parse_args(argv)

    dataset = export_lerobot(args.demos, args.root, repo_id=args.repo_id, overwrite=args.overwrite)
    print(f"已导出 {dataset.num_episodes} 个回合、{dataset.num_frames} 帧到 {Path(args.root).resolve()}")
    return dataset


if __name__ == "__main__":
    main()
