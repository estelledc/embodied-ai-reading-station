#!/usr/bin/env node
/**
 * Insert verified paper figure references into notes (batch P0-wire-13).
 * Each entry: [img, caption] — paths relative to papers/{slug}/images/
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const NOTES = path.join(ROOT, "notes");
const PAPERS = path.join(ROOT, "papers");

/** @type {Record<string, Array<[string, string]>>} */
const WIRE = {
  "conv-tasnet": [
    ["img_000.jpg", "Figure：Conv-TasNet 编码器—分离网络—解码器整体结构"],
    ["img_002.jpg", "Figure：Conv-TasNet 与 IRM 基线的主观评分对比"],
  ],
  dagger: [
    ["img_001.jpg", "Figure：Super Mario Bros 平台上 DAgger 与 BC 轨迹对比"],
    ["img_003.jpg", "Figure：各迭代下 DAgger 行驶距离学习曲线"],
  ],
  "diffusion-policy": [
    ["img_000.jpg", "Figure 1：扩散策略从噪声迭代去噪得到动作轨迹"],
    ["img_020.jpg", "Figure 2：Diffusion Policy 整体架构（观测编码 + 1D U-Net 去噪）"],
    ["img_027.jpg", "Figure 3：多模态动作分布——同一状态下多个合理动作簇"],
  ],
  flamingo: [
    ["img_003.jpg", "Figure 3：Flamingo 架构总览（Perceiver + Gated XATTN + 冻结 LM）"],
    ["img_004.jpg", "Figure 4：Gated XATTN-DENSE 层插入冻结 LM 块之间"],
  ],
  gail: [
    ["img_000.jpg", "Figure：GAIL 生成器—判别器对抗训练与 MuJoCo 任务成功率"],
  ],
  ibc: [
    ["img_000.jpg", "Figure 1：Implicit BC 能量模型与采样动作流程"],
    ["img_012.jpg", "Figure：IBC 与 CQL/IQL 等 offline RL 基线成功率对比"],
  ],
  "meta-world": [
    ["img_006.jpg", "Figure：Meta-World 50 任务与 MT10/MT50 多任务设定示意"],
    ["img_013.jpg", "Figure：各算法在 MT10/MT50 上的泛化成功率对比"],
  ],
  millimap: [
    ["img_000.jpg", "Figure 1：milliMap 系统总览（毫米波 + 语义 + 可达性地图）"],
    ["img_005.jpg", "Figure 2：Bayesian 栅格建图三态单元（自由/障碍/未知）"],
  ],
  mmclip: [
    ["img_001.jpg", "Figure 1：mmCLIP 信号—文本对齐框架总览"],
    ["img_007.jpg", "Figure 7：未见活动类别上的零样本 HAR 效果"],
  ],
  rlbench: [
    ["img_000.jpg", "Figure：RLBench 基于 CoppeliaSim 的任务与场景 API"],
    ["img_004.jpg", "Figure：100 任务变体与评测协议示意"],
  ],
  robosuite: [
    ["img_000.jpg", "Figure 1：robosuite 程序化生成环境与统一 API"],
    ["img_016.jpg", "Figure：MuJoCo 封装层—Robot / Gripper / Controller 类图"],
    ["img_022.jpg", "Figure：单臂/双臂操作任务与观测模态示例"],
  ],
  soundstream: [
    ["img_003.jpg", "Figure：SoundStream 编解码器—量化器—解码器端到端架构"],
    ["img_004.jpg", "Figure：发送端/接收端神经音频 codec 数据流"],
  ],
  whisper: [
    ["img_008.jpg", "Figure 1：Whisper 多任务 seq2seq Transformer 与特殊 token 格式"],
    ["img_010.jpg", "Figure：训练数据规模与 WER 缩放规律"],
  ],
};

function insertFigures(slug, figures) {
  const notePath = path.join(NOTES, `${slug}.md`);
  if (!fs.existsSync(notePath)) {
    console.log(`SKIP ${slug}: no note`);
    return false;
  }
  let body = fs.readFileSync(notePath, "utf8");
  const fmEnd = body.indexOf("---", 4);
  const front = body.slice(0, fmEnd + 4);
  let content = body.slice(fmEnd + 4);

  // Remove prior auto-wired block if re-running
  content = content.replace(/\n<!-- paper-figures:begin -->[\s\S]*?<!-- paper-figures:end -->\n/g, "\n");

  const block =
    "\n<!-- paper-figures:begin -->\n" +
    figures
      .map(([file, cap]) => {
        const full = path.join(PAPERS, slug, "images", file);
        if (!fs.existsSync(full)) {
          console.warn(`  WARN ${slug}: missing ${file}`);
          return null;
        }
        return `\n![${cap}](../papers/${slug}/images/${file})\n\n*上图说明：${cap}（论文原图）。*\n`;
      })
      .filter(Boolean)
      .join("") +
    "<!-- paper-figures:end -->\n";

  const methodRe = /(## (?:\d+\.\s*)?(?:它分几步做的|方法)[^\n]*\n)/;
  const keyRe = /(## (?:\d+\.\s*)?关键数字[^\n]*\n)/;
  if (methodRe.test(content)) {
    content = content.replace(methodRe, `$1${block}`);
  } else if (keyRe.test(content)) {
    content = content.replace(keyRe, `$1${block}`);
  } else {
    console.log(`SKIP ${slug}: no anchor section`);
    return false;
  }

  fs.writeFileSync(notePath, front + content);
  const count = (block.match(/!\[/g) || []).length;
  console.log(`OK ${slug}: ${count} figures wired`);
  return true;
}

let ok = 0;
for (const [slug, figs] of Object.entries(WIRE)) {
  if (insertFigures(slug, figs)) ok++;
}
console.log(`\n=== wired ${ok}/${Object.keys(WIRE).length} notes ===`);
