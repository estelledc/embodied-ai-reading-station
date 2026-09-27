#!/usr/bin/env bash
# 用自己录的 PickCubeEnv 示范数据微调 SmolVLA（lerobot 0.6.0）。
#
# 用法（在 lab/stage3_sim 目录里运行）：
#   bash finetune_smolvla.sh                    # 用下面的默认值
#   STEPS=2 BATCH_SIZE=2 DEVICE=cpu bash finetune_smolvla.sh   # 只跑 2 步，检查流程能不能走通
#
# 要真正学会抓方块，需要一块 NVIDIA 显卡（DEVICE=cuda），步数和批大小按显存调；
# 这里的默认值只是起点，不是调好的配方。
set -euo pipefail

DATASET_ROOT="${DATASET_ROOT:-outputs/lerobot_pick_cube}"
OUTPUT_DIR="${OUTPUT_DIR:-outputs/train/smolvla_pick_cube}"
STEPS="${STEPS:-20000}"
BATCH_SIZE="${BATCH_SIZE:-32}"
DEVICE="${DEVICE:-cuda}"

# smolvla_base 预训练时的相机叫 camera1/camera2/camera3，我们的数据只有一个 front 相机，
# 所以要告诉 lerobot：把 front 当成 camera1。缺的另外两个相机会被直接跳过。
lerobot-train \
  --policy.path=lerobot/smolvla_base \
  --dataset.repo_id=local/pick_cube \
  --dataset.root="${DATASET_ROOT}" \
  --rename_map='{"observation.images.front": "observation.images.camera1"}' \
  --batch_size="${BATCH_SIZE}" \
  --steps="${STEPS}" \
  --save_freq="${STEPS}" \
  --log_freq=10 \
  --policy.device="${DEVICE}" \
  --policy.push_to_hub=false \
  --wandb.enable=false \
  --output_dir="${OUTPUT_DIR}" \
  --job_name=smolvla_pick_cube
