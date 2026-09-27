"""check_env：在动手装 VLM_Grasp_Interactive 之前，先看看这台机器缺什么。

用法（在你准备跑那个项目的机器、那个 conda 环境里运行）：

    python check_env.py

它只检查、不安装任何东西。每一项的结果是：
  ok   = 满足
  warn = 可能有问题，建议处理
  fail = 按那个项目的 README 肯定跑不起来，要先解决
全部没有 fail 时退出码为 0。
"""

from __future__ import annotations

import importlib.metadata
import importlib.util
import platform
import shutil
import subprocess
import sys

# 那个项目 README 里要求的 Python 包：(导入名, pip 包名, 用途)
PACKAGES = [
    ("torch", "torch", "深度学习框架；README 用 1.12.1+cu113"),
    ("mujoco", "mujoco", "物理仿真；README 用 3.3.1"),
    ("cv2", "opencv-python", "读写和处理图像"),
    ("open3d", "open3d", "点云处理（graspnet-baseline 需要）"),
    ("graspnetAPI", "graspnetAPI", "GraspNet 的数据与抓取位姿工具"),
    ("ultralytics", "ultralytics", "SAM 分割模型"),
    ("whisper", "openai-whisper", "语音转文字"),
    ("openai", "openai", "调用 Qwen 等兼容 OpenAI 接口的多模态模型"),
    ("sounddevice", "sounddevice", "从麦克风录音"),
    ("spatialmath", "spatialmath-python", "位姿与坐标变换"),
    ("roboticstoolbox", "roboticstoolbox-python", "机械臂运动学"),
]


def _result(name, status, detail):
    return {"name": name, "status": status, "detail": detail}


def _run(command):
    try:
        completed = subprocess.run(command, capture_output=True, text=True, timeout=20, check=False)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return (completed.stdout or completed.stderr).strip()


def check_python():
    version = platform.python_version()
    if sys.version_info[:2] == (3, 10):
        return _result("Python", "ok", version)
    return _result("Python", "warn", f"{version}；那个项目用 Python 3.10（torch 1.12.1 没有 3.11 及以上版本的安装包），建议 conda create -n vlm_graspnet python=3.10")


def check_os():
    system = platform.system()
    if system == "Linux":
        return _result("操作系统", "ok", f"{system} {platform.release()}")
    return _result("操作系统", "fail", f"{system}；PointNet++ 和 k-NN 要编译 CUDA 算子，需要 Linux + NVIDIA 显卡（macOS 没有 CUDA）")


def check_gpu():
    if not shutil.which("nvidia-smi"):
        return _result("NVIDIA 显卡", "fail", "找不到 nvidia-smi：这台机器没有 NVIDIA 显卡或没装驱动。可以找导师/学长要实验室服务器，或租云 GPU")
    output = _run(["nvidia-smi", "--query-gpu=name,driver_version,memory.total", "--format=csv,noheader"])
    return _result("NVIDIA 显卡", "ok" if output else "warn", output or "nvidia-smi 没有输出")


def check_nvcc():
    if not shutil.which("nvcc"):
        return _result("CUDA 编译器 nvcc", "warn", "找不到 nvcc：编译 PointNet++ / k-NN 算子需要和 torch 对应版本的 CUDA Toolkit（README 用 cu113）")
    output = _run(["nvcc", "--version"]) or ""
    last = output.splitlines()[-1] if output else "无输出"
    return _result("CUDA 编译器 nvcc", "ok", last)


def check_packages():
    results = []
    for module, dist, purpose in PACKAGES:
        if importlib.util.find_spec(module) is None:
            results.append(_result(dist, "warn", f"未安装（{purpose}）"))
            continue
        try:
            version = importlib.metadata.version(dist)
        except importlib.metadata.PackageNotFoundError:
            version = "已安装"
        results.append(_result(dist, "ok", f"{version}（{purpose}）"))
    return results


def check_numpy_for_old_torch():
    """torch 1.12 是用 NumPy 1.x 编译的，和 NumPy 2.x 放在一起会在导入时报错。"""
    try:
        numpy_version = importlib.metadata.version("numpy")
        torch_version = importlib.metadata.version("torch")
    except importlib.metadata.PackageNotFoundError:
        return None
    if torch_version.startswith("1.") and int(numpy_version.split(".")[0]) >= 2:
        return _result("numpy 与 torch 1.x", "fail", f"numpy {numpy_version} + torch {torch_version}：请改装 numpy<2")
    return _result("numpy 与 torch", "ok", f"numpy {numpy_version}，torch {torch_version}")


def check_torch_cuda():
    if importlib.util.find_spec("torch") is None:
        return None
    try:
        import torch
    except Exception as error:  # 导入失败本身就是要报告的问题
        return _result("torch 能否使用 GPU", "fail", f"import torch 失败：{error}")
    if torch.cuda.is_available():
        return _result("torch 能否使用 GPU", "ok", f"torch {torch.__version__}，CUDA {torch.version.cuda}，{torch.cuda.get_device_name(0)}")
    return _result("torch 能否使用 GPU", "fail", f"torch {torch.__version__} 看不到 GPU（CUDA 版本 {torch.version.cuda}）")


def collect():
    results = [check_python(), check_os(), check_gpu(), check_nvcc()]
    results.extend(check_packages())
    for extra in (check_numpy_for_old_torch(), check_torch_cuda()):
        if extra is not None:
            results.append(extra)
    results.append(_result("多模态模型 API", "warn", "脚本不检查：记得在 vlm_process.py 里填上你自己的 api_key 和 base_url，不要把密钥提交到 GitHub"))
    return results


def main():
    results = collect()
    width = max(len(item["name"]) for item in results)
    for item in results:
        print(f"[{item['status']:>4}] {item['name']:<{width}}  {item['detail']}")
    failures = [item for item in results if item["status"] == "fail"]
    print()
    print("没有 fail，可以开始按 README 安装。" if not failures else f"有 {len(failures)} 项 fail，先解决它们再装。")
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
