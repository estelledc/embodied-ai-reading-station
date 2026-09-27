"""示范数据 → LeRobotDataset → SmolVLA 的流程测试。

- 不装 lerobot 也能跑的部分：没有图像的示范数据必须被拒绝。
- 装了 lerobot（requirements-vla.txt）并设置 LAB_RENDER=1：录 3 个带图像的回合，导出后再读回来检查。
- 再设置 LAB_SLOW=1：用 CPU 跑 2 步 SmolVLA 微调 + 1 个评估回合（会下载约 2 GB 权重）。
  这只证明流程能走通，2 步训练的模型当然抓不起方块。
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

from export_lerobot import load_demos
from record_demos import record_demos

HERE = Path(__file__).resolve().parent
needs_render = pytest.mark.skipif(os.environ.get("LAB_RENDER") != "1", reason="需要渲染图像；设 LAB_RENDER=1（以及 MUJOCO_GL）再跑")
needs_slow = pytest.mark.skipif(os.environ.get("LAB_SLOW") != "1", reason="要下载约 2 GB 权重并在 CPU 上训练；设 LAB_SLOW=1 再跑")


def test_export_rejects_demos_without_images(tmp_path):
    record_demos(episodes=2, out_dir=tmp_path / "demos", seed=0, render=False)
    with pytest.raises(ValueError, match="图像"):
        load_demos(tmp_path / "demos")


@needs_render
def test_export_roundtrip(tmp_path):
    pytest.importorskip("lerobot")
    from lerobot.datasets.lerobot_dataset import LeRobotDataset

    from export_lerobot import export_lerobot

    meta = record_demos(episodes=3, out_dir=tmp_path / "demos", seed=0, render=True, image_size=(64, 64))
    export_lerobot(tmp_path / "demos", tmp_path / "lerobot", repo_id="local/pick_cube_test")
    dataset = LeRobotDataset("local/pick_cube_test", root=tmp_path / "lerobot")
    assert dataset.num_episodes == meta["success_count"] == 3
    assert dataset.num_frames == sum(episode["length"] for episode in meta["episodes"])
    frame = dataset[0]
    assert tuple(frame["observation.images.front"].shape) == (3, 64, 64)
    assert tuple(frame["observation.state"].shape) == (4,)
    assert tuple(frame["action"].shape) == (4,)
    assert frame["task"] == "pick up the red cube"


@needs_render
@needs_slow
def test_smolvla_two_step_finetune_and_evaluate(tmp_path):
    pytest.importorskip("lerobot")
    from export_lerobot import export_lerobot

    record_demos(episodes=3, out_dir=tmp_path / "demos", seed=0, render=True, image_size=(96, 96))
    export_lerobot(tmp_path / "demos", tmp_path / "lerobot")
    env = dict(
        os.environ,
        DATASET_ROOT=str(tmp_path / "lerobot"),
        OUTPUT_DIR=str(tmp_path / "train"),
        STEPS="2",
        BATCH_SIZE="2",
        DEVICE="cpu",
    )
    subprocess.run(["bash", str(HERE / "finetune_smolvla.sh")], check=True, cwd=HERE, env=env)
    checkpoint = tmp_path / "train" / "checkpoints" / "last" / "pretrained_model"
    assert (checkpoint / "policy_preprocessor.json").exists()

    result = subprocess.run(
        [sys.executable, "evaluate_smolvla.py", "--checkpoint", str(checkpoint), "--episodes", "1", "--image-size", "96", "96"],
        check=True,
        cwd=HERE,
        env=env,
        capture_output=True,
        text=True,
    )
    assert "success_rate" in result.stdout
