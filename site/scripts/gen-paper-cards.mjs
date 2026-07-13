#!/usr/bin/env node
// 给每篇论文用结构化生成器生成定制缩略图（基于 TL;DR + topic）
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import matter from "gray-matter";
import {
  assetFingerprint,
  createAssetReceipt,
  formatAssetError,
  inspectImage,
  parseAssetReceipt,
  parseGeneratorResult,
  preflightTools,
  recordGeneratedAsset,
  writeAssetAtomically,
  writeAssetReceiptAtomically,
} from "./lib/asset-generation.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const NOTES = path.join(ROOT, "notes");
const PAPERS = path.join(ROOT, "papers");
const DEFAULT_OUT = path.join(ROOT, "site", "src", "images", "cards");
const MANIFEST = path.join(PAPERS, "provenance.json");
const GENERATOR_ID = "gen-paper-cards/v2";
const TEMPLATE_ID = "paper-card-editorial";
const PROMPT_VERSION = "paper-card-editorial-v1";
const GIT_SHA_RE = /^[a-f0-9]{40}$/;

const HOOKS = {
  "clip": "image and text vectors aligning in a shared embedding space",
  "blip": "a bootstrap loop: weak captions becoming strong via self-improvement",
  "blip-2": "a small Q-Former bridge between a frozen visual encoder and a frozen LLM",
  "flamingo": "interleaved image-text sequence flowing through a perceiver resampler",
  "siglip": "a sigmoid gate replacing softmax in image-text contrastive learning",
  "filip": "patch-level fine-grained alignment between image patches and text tokens",
  "eva-clip": "masked image modeling pretraining producing better visual encoder",
  "qwen-vl": "a Chinese-English bilingual VLM with OCR and grounding bounding boxes",
  "internvl": "scaling visual encoder to 6B parameters to match private models",
  "deepseek-vl": "a hybrid encoder for documents, charts, and scientific figures",
  "pixtral-12b": "a from-scratch native multimodal model, any resolution support",
  "florence-2": "ten vision tasks unified into one prompt-to-sequence model",
  "long-clip": "extended text token length unlocking longer captions",
  "llava-1-5": "two-layer MLP projection between vision encoder and LLM",
  "llava-next-interleave": "multi-image, video, 3D unified as interleaved sequence",
  "llava-onevision": "single recipe covering single-image, multi-image, video tasks",
  "obelics": "a web-scale dataset of interleaved image-text documents",
  "idefics-2": "a systematic ablation chart of VLM design choices",
  "llama-3-herd": "a herd of LLaMA model sizes with vision adapters",
  "rt-1": "a robotics transformer tokenizing actions for real-world control",
  "rt-2": "web knowledge transferring from VLM to robot action policy",
  "rt-trajectory": "a 2D trajectory drawn over an image as visual policy prompt",
  "octo": "an open-source generalist robot policy with diffusion head",
  "openvla-oft": "fine-tuning levers — parallel decoding, action chunking, continuous actions",
  "tinyvla": "a tiny 1.4B VLA running on edge devices",
  "3d-vla": "a 3D point cloud feeding into VLA with future world prediction",
  "dp3": "sparse 3D point clouds as input to a diffusion policy",
  "tracevla": "historical end-effector trajectories drawn over current image",
  "robomamba": "Mamba state-space model replacing Transformer for fast inference",
  "spatialvla": "ego-3D positional encoding giving VLA metric spatial awareness",
  "dexvla": "a frozen VLM with plug-in 1B diffusion expert head",
  "rdt-1b": "a 1B diffusion foundation model for bimanual manipulation",
  "gr-2": "a generative video-language-action model pretrained on 38M videos",
  "openhelix": "a dual-system VLA: high-frequency reactive plus low-frequency reasoning",
  "diffusion-policy": "iteratively denoising action sequences from random noise to smooth trajectory",
  "3d-diffusion-policy": "diffusion policy conditioned on 3D point clouds, generalizing in 10 demos",
  "consistency-policy": "a one-step consistency model accelerating diffusion policy inference",
  "dit-policy": "a Diffusion Transformer scaling to 1500-step bimanual ALOHA tasks",
  "dppo": "policy gradient applied directly to diffusion policy for RL fine-tuning",
  "pi0": "a flow-matching head attached to a VLM, foundation model for general robots",
  "pi05": "open-world generalization via cross-robot heterogeneous co-training",
  "pi0-fast": "discrete cosine transform compressing action sequences in frequency domain",
  "equibot": "a SIM(3)-equivariant diffusion policy generalizing across object poses",
  "flow-matching-manipulation": "flow matching mapping random waypoints to action trajectories",
  "flow-policy": "consistency flow matching on 3D point cloud conditioned policy",
  "gail": "generative adversarial imitation learning, discriminator vs policy",
  "dagger": "dataset aggregation: expert correcting student's mistakes iteratively",
  "ibc": "implicit behavior cloning with energy-based policy",
  "bet": "k-means quantizing continuous actions to capture multi-modal demonstrations",
  "vq-bet": "residual vector quantization replacing k-means for behavior tokenization",
  "act-aloha": "double-arm ALOHA teleoperation with action chunking transformer",
  "mobile-aloha": "ALOHA on mobile base, learning kitchen tasks from few demos",
  "aloha-2": "improved ergonomic and durable ALOHA hardware design",
  "anyteleop": "vision-only hand tracking driving any robot arm-hand teleoperation",
  "umi": "handheld gripper plus GoPro collecting in-the-wild demonstrations",
  "dexcap": "portable hand motion capture for dexterous manipulation imitation",
  "humanplus": "humanoid robot shadowing human motion in real-time",
  "idp3": "ego-centric point cloud 3D diffusion policy generalizing across scenes",
  "robocat": "self-improving generalist agent, snowballing data via own demonstrations",
  "smolvla": "a tiny VLA model running on consumer GPU using community demos",
  "world-models-ha": "VAE plus RNN learning compressed latent of game environments",
  "dreamer-v1": "imagination rollouts in latent space, value gradients flowing back",
  "dreamer-v2": "discrete categorical latent variables for world modeling on Atari",
  "dreamer-v3": "fixed hyperparameters mastering diverse domains including Minecraft diamond",
  "daydreamer": "Dreamer transferred directly to physical robot, learning to walk in 1 hour",
  "iris-world-model": "discrete tokens plus Transformer as world model for Atari100k",
  "transformer-world-model": "Transformer autoregressively predicting state, action, reward",
  "gaia-1": "a 9B autoregressive world model imagining future driving scenes",
  "unisim": "a unified diffusion model turning real videos into interactive simulator",
  "genie": "an 11B model learning latent action space from unlabeled web videos",
  "navigation-world-models": "a 1B Conditional DiT learning first-person navigation futures",
  "cosmos-world-foundation": "20M hours of video forging a universal physical AI world model",
  "1x-world-model-2025": "Wan-2.2 video model fine-tuned for humanoid robot world modeling",
  "imagebind": "six modalities binding to one shared embedding space via image",
  "anymal": "any modality (image, video, audio, IMU) augmenting LLaMA-2",
  "x-vlm": "multi-grained alignment between text and image, region, object",
  "fromage": "frozen LLM with thin linear adapters reading and generating images",
  "sparsh": "self-supervised tactile representations transferring across sensors",
  "sparsh-x": "four tactile modalities (image, audio, motion, pressure) fused",
  "tactile-vla": "tactile signals injected into VLA for force-aware contact-rich tasks",
  "tla-tactile-language-action": "sequential tactile feedback driving language-grounded policy",
  "audiopalm": "PaLM-2 text and AudioLM speech merged into one language model",
  "onellm": "eight modalities aligned with language via progressive encoder",
  "touch-vision-cross-modal": "touch and vision predicting each other across modalities",
  "millimap": "mmWave radar mapping indoor space through smoke",
  "person-in-wifi": "WiFi CSI signals estimating 2D human pose like a camera",
  "rf-pose-through-wall": "RF signals reconstructing 15-joint human skeleton through walls",
  "milliego": "single-chip mmWave radar plus IMU estimating ego-motion",
  "radarslam": "scanning radar SLAM reliable in rain, fog, snow",
  "3drimr": "deep learning reconstructing 3D shape from sparse mmWave radar",
  "radarhd": "neural network mapping low-resolution mmWave to LiDAR-grade dense point cloud",
  "rfmask": "mmWave radar producing human silhouette segmentation",
  "rfpose-ot": "optimal transport aligning RF features to pose domain",
  "panoradar": "rotating mmWave radar getting LiDAR-grade 3D imaging",
  "mmdiff": "diffusion model as pose estimator from 3D RF vision",
  "argus-mmego": "wearable lightweight mmWave reconstructing egocentric body mesh",
  "wave-former": "mmWave reconstructing fully-occluded everyday objects via shape completion",
  "whisper": "weak supervision on 680k hours of audio for zero-shot ASR",
  "conformer": "convolution module embedded in Transformer for ASR",
  "seamless-m4t": "100-language unified ASR/S2T/S2S/T2T/T2S model",
  "dprnn": "dual-path RNN: intra-block and inter-block alternating modeling",
  "conv-tasnet": "fully convolutional time-domain speech separation, no STFT",
  "soundstream": "neural audio codec at 3kbps, residual vector quantization",
  "encodec": "Meta streaming neural audio codec, multi-scale spectral discriminator",
  "audiolm": "audio discretized to semantic and acoustic tokens, autoregressive generation",
  "musiclm": "text-to-music, hierarchical seq2seq token modeling",
  "uss-weakly-labelled": "AudioSet weak labels training universal source separator",
  "stable-audio": "VAE latent diffusion generating 95-second 44kHz stereo music",
  "meta-stylespeech": "style-adaptive layer norm injecting reference audio for TTS",
  "open-x-embodiment": "22 robots from 21 institutions sharing one unified dataset format",
  "droid": "76,000 in-the-wild Franka manipulation demos from 13 countries",
  "robocasa": "120 kitchen scenes generated by AI for generalist robot training",
  "rh20t": "147 tasks with vision-force-audio multimodal trajectories",
  "bridgedata-v2": "60K WidowX manipulation demos, the de facto VLA pretraining base",
  "robomimic": "systematic ablation of offline imitation learning factors",
  "libero": "lifelong learning across spatial, object, goal, long task families",
  "simpler-env": "real-aligned simulation reproducing real-world VLA evaluation cheaply",
  "rlbench": "100 unique manipulation tasks in CoppeliaSim simulator",
  "calvin": "language-conditioned long-horizon manipulation with 34 sub-tasks",
  "meta-world": "50 MuJoCo manipulation tasks for multi-task and meta RL",
  "robosuite": "modular MuJoCo simulation framework with standard tasks",
  "isaac-gym": "GPU-based physics simulation with thousands of parallel environments",
  "isaac-lab": "ray-traced rendering plus multi-frequency sensors on GPU",
  "sapien": "first part-aware articulated object simulation environment",
  "maniskill": "manipulation benchmark on SAPIEN with rich intra-class variations",
  "habitat": "first photo-realistic 3D indoor simulation at thousands of FPS",
  "habitat-2": "physics-enabled rearrangement tasks with ReplicaCAD dataset",
  "habitat-3": "humanoid avatars and robots cohabiting with VR human-in-loop",
  "dexmv": "dexterous manipulation simulation plus human video imitation",
  "mujoco-playground": "MJX-based open-source robot learning, train policies in minutes",
  "behavior-1k": "1000 daily activities in 50 scenes with 9000 annotated objects",
  "procthor": "procedural generation of unlimited synthetic embodied AI environments",
};

const TOPIC_FALLBACK = {
  "vlm-foundation": "an eye merging with text fragments, image-text alignment",
  "planning": "a tree-shaped flowchart with branching arrows",
  "vla": "a neural pathway from camera through brain to robot gripper",
  "diffusion-policy": "noisy dots gradually denoising into clean trajectories",
  "imitation": "a human hand and robotic hand mirroring each other",
  "world-model": "a thought bubble containing a miniature simulated world",
  "multimodal": "overlapping circles of senses in a Venn diagram",
  "rf": "concentric radio waves passing through a wall",
  "auditory": "sound waves with one direction highlighted",
  "dataset-eval": "a grid of small task thumbnails as an archive page",
  "sim": "a robot arm split between wireframe simulation and editorial reality",
};

function makePrompt(note) {
  const visual = HOOKS[note.slug] || `${note.title.split(":")[0].trim()} — ${TOPIC_FALLBACK[note.topic] || "abstract concept"}`;
  return `generate an image: a magazine-grade abstract editorial illustration depicting "${visual}". Composition: minimal, asymmetric, single focal element with two or three supporting shapes. NO TEXT, NO LABELS, NO LETTERS in the illustration itself. Style: warm hand-pressed paper background (#efe7d2 ivory), coral red (#ed6f5c) and mustard yellow (#e9b94a) accents, occasional olive green (#6e7448), subtle hairline rules. Pure flat editorial illustration, like Apartamento or Monocle magazine. NO photorealism, NO 3D rendering, NO text rendering. Aspect ratio 16:9. Save the image. Output the saved file path.`;
}

function loadAllNotes() {
  const result = [];
  for (const f of fs.readdirSync(NOTES).sort()) {
    if (!f.endsWith(".md")) continue;
    const slug = f.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(NOTES, f), "utf8");
    const { data, content } = matter(raw);
    if (!data.num || !data.topic) continue;
    const tldrMatch = content.match(/##\s*(?:一句话讲什么|TL;DR|tl;dr)[^\n]*\n+([^\n]+)/);
    const tldr = tldrMatch ? tldrMatch[1].trim() : "";
    result.push({
      slug,
      num: data.num,
      topic: data.topic,
      title: data.title || slug,
      tldr,
      notePath: `notes/${f}`,
      noteSha256: sha256(raw),
    });
  }
  return result;
}

function parseCli(argv = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      "dry-run": { type: "boolean", default: false },
      preflight: { type: "boolean", default: false },
      slug: { type: "string", multiple: true, default: [] },
      "output-dir": { type: "string" },
      "receipt-file": { type: "string" },
      record: { type: "boolean", default: false },
      "content-commit": { type: "string" },
      "generator-bin": { type: "string" },
      "converter-bin": { type: "string" },
    },
  });
  if (values.record && (!values["receipt-file"] || !values["content-commit"])) {
    throw new Error("--record requires --receipt-file and --content-commit");
  }
  if (values["content-commit"] && !GIT_SHA_RE.test(values["content-commit"])) {
    throw new Error("--content-commit must be 40 lowercase hexadecimal characters");
  }
  return {
    dryRun: values["dry-run"],
    preflightOnly: values.preflight,
    slugs: new Set(values.slug),
    outputDir: path.resolve(values["output-dir"] || DEFAULT_OUT),
    receiptFile: values["receipt-file"] ? path.resolve(values["receipt-file"]) : null,
    record: values.record,
    contentCommit: values["content-commit"] || null,
    generatorBin: values["generator-bin"] || process.env.CODEX_BIN || "codex",
    converterBin: values["converter-bin"] || process.env.CWEBP_BIN || "cwebp",
  };
}

function readManifest() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  if (manifest?.schema_version !== "2.0.0" || !Array.isArray(manifest.notes)) {
    throw new Error("papers/provenance.json must use schema 2.0.0");
  }
  return manifest;
}

function snapshotPreflight(contentCommit, notes) {
  for (const args of [["cat-file", "-e", `${contentCommit}^{commit}`], ["merge-base", "--is-ancestor", contentCommit, "HEAD"]]) {
    const result = spawnSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_TRACE2: "0", GIT_TRACE2_EVENT: "0", GIT_TRACE2_PERF: "0" },
    });
    if (result.error || result.signal || result.status !== 0) return false;
  }
  for (const note of new Map(notes.map((item) => [item.notePath, item])).values()) {
    const result = spawnSync("git", ["cat-file", "blob", `${contentCommit}:${note.notePath}`], {
      cwd: ROOT,
      shell: false,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_TRACE2: "0", GIT_TRACE2_EVENT: "0", GIT_TRACE2_PERF: "0" },
    });
    if (result.error || result.signal || result.status !== 0 || sha256(result.stdout) !== note.noteSha256) return false;
  }
  return true;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function repoPath(filePath) {
  const relative = path.relative(ROOT, path.resolve(filePath));
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
  return relative.split(path.sep).join("/");
}

function receiptBoundary(receiptFile) {
  if (repoPath(receiptFile)) return ROOT;
  let cursor = path.dirname(receiptFile);
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  const stat = fs.lstatSync(cursor);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("receipt requires a trusted existing parent directory");
  return cursor;
}

function recordsByPath(record) {
  return new Map((record?.generated_assets || []).map((asset) => [asset.path, asset]));
}

function buildPlan({ notes, manifest, outputDir, slugs }) {
  const knownSlugs = new Set(notes.map((note) => note.slug));
  for (const slug of slugs) {
    if (!knownSlugs.has(slug)) throw new Error(`unknown --slug: ${slug}`);
  }
  const manifestBySlug = new Map(manifest.notes.map((record) => [record.slug, record]));
  return notes.filter((note) => slugs.size === 0 || slugs.has(note.slug)).map((note) => {
    const prompt = makePrompt(note);
    const full = path.join(outputDir, `${note.slug}.webp`);
    const compact = path.join(outputDir, `${note.slug}-800.webp`);
    const manifestRecord = manifestBySlug.get(note.slug);
    const recordMap = recordsByPath(manifestRecord);
    const outputs = [
      { role: "full", path: full, repoPath: repoPath(full), args: ["-q", "85", "-m", "6"] },
      { role: "compact", path: compact, repoPath: repoPath(compact), args: ["-q", "80", "-m", "6", "-resize", "800", "0"] },
    ].map((output) => ({
      ...output,
      exists: fs.existsSync(output.path),
      record: output.repoPath ? recordMap.get(output.repoPath) : null,
    }));
    const paperImage = path.join(PAPERS, note.slug, "images", "img_000.jpg");
    let state = "candidate";
    let reason = "missing output pair";
    if (!manifestRecord) {
      state = "error-manifest";
      reason = "note is absent from papers/provenance.json";
    } else if (fs.existsSync(paperImage)) {
      state = "skip-paper-image";
      reason = "paper img_000.jpg remains the preferred card source";
    } else if (outputs.some((output) => output.exists) && outputs.every((output) => !output.record)) {
      state = "skip-legacy";
      reason = outputs.every((output) => output.exists)
        ? "existing unregistered legacy pair"
        : "existing unregistered partial legacy pair";
    } else if (outputs.some((output) => output.exists || output.record)) {
      if (outputs.every((output) => output.exists && output.record)) {
        state = "candidate-check";
        reason = "registered pair requires an idempotence check";
      } else {
        state = "error-drift";
        reason = "registered output pair is partial or missing";
      }
    }
    if (state.startsWith("candidate") && outputs.some((output) => (
      !output.repoPath
      || !new RegExp(`^site/src/images/cards/${note.slug}(?:-800)?\\.webp$`).test(output.repoPath)
    ))) {
      state = "error-path";
      reason = "receipt-backed cards require the canonical repository output directory";
    }
    return { note, prompt, outputs, state, reason };
  });
}

function generationInputs({ jobs, contentCommit, generatorVersion, converterVersion, outputMetadata }) {
  const promptHashes = jobs.map((job) => ({ kind: "card", sha256: sha256(job.prompt) }));
  return {
    slug: jobs[0].note.slug,
    input_content_commit: contentCommit,
    sources: [...new Map(jobs.map((job) => [job.note.notePath, {
      path: job.note.notePath,
      sha256: job.note.noteSha256,
    }])).values()].sort((a, b) => a.path.localeCompare(b.path, "en")),
    prompt_sha256: promptHashes.length === 1 ? promptHashes[0].sha256 : sha256(JSON.stringify(promptHashes)),
    template: { id: TEMPLATE_ID, version: PROMPT_VERSION },
    generator: { id: GENERATOR_ID, version: generatorVersion },
    converter: { id: "cwebp", version: converterVersion },
    parameters: { adapter: "codex-exec-json-v1", output_format: "webp" },
    outputs: [...outputMetadata].sort((a, b) => a.path.localeCompare(b.path, "en")),
  };
}

function finalizeRegisteredJobs(plan, versions, contentCommit, options) {
  const checks = plan.filter((job) => job.state === "candidate-check");
  let receipt = null;
  if (checks.length > 0 && options.slugs.size === 1 && options.receiptFile && fs.existsSync(options.receiptFile)) {
    receipt = parseAssetReceipt(fs.readFileSync(options.receiptFile));
  }
  return plan.map((job) => {
    if (job.state !== "candidate-check") return job;
    if (!receipt || receipt.slug !== job.note.slug || receipt.generator !== GENERATOR_ID) {
      return { ...job, state: "error-receipt-required", reason: "registered assets require their portable receipt" };
    }
    const expectedPaths = new Set(job.outputs.map((output) => output.repoPath));
    if (receipt.outputs.length !== 2 || receipt.outputs.some((output) => output.kind !== "card" || !expectedPaths.has(output.path))) {
      return { ...job, state: "error-receipt", reason: "receipt does not contain the canonical card pair" };
    }
    const metadata = [];
    const receiptOutputs = new Map(receipt.outputs.map((output) => [output.path, output]));
    for (const output of job.outputs) {
      const inspected = inspectImage(output.path);
      const receiptOutput = receiptOutputs.get(output.repoPath);
      if (
        inspected.format !== "webp"
        || inspected.sha256 !== output.record.sha256
        || receiptOutput?.kind !== "card"
        || receiptOutput.sha256 !== inspected.sha256
        || receiptOutput.width !== inspected.width
        || receiptOutput.height !== inspected.height
      ) {
        return { ...job, state: "error-drift", reason: `registered bytes drifted: ${output.repoPath}` };
      }
      metadata.push({
        kind: "card",
        path: output.repoPath,
        parameters: { argv: output.args },
      });
    }
    const inputs = generationInputs({
      jobs: [job],
      contentCommit: receipt.inputs.input_content_commit,
      generatorVersion: versions.generator.version,
      converterVersion: versions.converter.version,
      outputMetadata: metadata,
    });
    const fingerprint = assetFingerprint(inputs);
    if (job.outputs.every((output) => (
      output.record.generator === GENERATOR_ID
      && output.record.input_fingerprint === fingerprint
      && receipt.input_fingerprint === fingerprint
      && output.record.content_commit === contentCommit
    ))) {
      return { ...job, state: "skip-current", reason: "fingerprint and output hashes match provenance" };
    }
    return { ...job, state: "error-stale", reason: "registered pair conflicts with the current generator inputs" };
  });
}

function runGenerator(job, stagingDir, generatorBin) {
  const schemaPath = path.join(stagingDir, "output-schema.json");
  const resultPath = path.join(stagingDir, "result.json");
  fs.writeFileSync(schemaPath, `${JSON.stringify({
    type: "object",
    additionalProperties: false,
    required: ["output_path"],
    properties: { output_path: { type: "string" } },
  }, null, 2)}\n`);
  const adapterPrompt = `${job.prompt}\nSave exactly one PNG below the current working directory. Return only JSON matching {"output_path":"relative/path.png"}.`;
  const result = spawnSync(generatorBin, [
    "exec",
    "--sandbox", "workspace-write",
    "--skip-git-repo-check",
    "--ephemeral",
    "--json",
    "--output-schema", schemaPath,
    "-o", resultPath,
    "-C", stagingDir,
    adapterPrompt,
  ], {
    encoding: "utf8",
    shell: false,
    timeout: 180_000,
    maxBuffer: 4 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.signal || result.status !== 0) {
    const failure = result.error
      ? `launch failed (${result.error.code || "UNKNOWN"})`
      : `failed (${result.signal || result.status})`;
    throw new Error(`generator ${failure}`);
  }
  if (!fs.existsSync(resultPath)) throw new Error("generator did not write its structured result file");
  return parseGeneratorResult(fs.readFileSync(resultPath), { stagingDir });
}

function runConverter(converterBin, pngPath, destination, args) {
  const result = spawnSync(converterBin, [...args, pngPath, "-o", destination], {
    encoding: "utf8",
    shell: false,
    timeout: 120_000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.signal || result.status !== 0) {
    const failure = result.error
      ? `launch failed (${result.error.code || "UNKNOWN"})`
      : `failed (${result.signal || result.status})`;
    throw new Error(`cwebp ${failure}`);
  }
}

function assertReceiptAbsent(receiptFile) {
  if (!fs.existsSync(receiptFile)) return null;
  const stat = fs.lstatSync(receiptFile);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("existing receipt must be a regular non-symlink file");
  throw new Error("receipt file already exists; refusing to overwrite pending evidence");
}

function printPlan(plan, versions, mode) {
  const counts = {};
  for (const job of plan) counts[job.state] = (counts[job.state] || 0) + 1;
  console.log(JSON.stringify({
    script: "gen-paper-cards",
    mode,
    generator: versions.generator?.version || "not-needed",
    converter: versions.converter?.version || "not-needed",
    counts,
  }));
  for (const job of plan) {
    if (job.state === "skip-legacy") console.warn(`SKIP legacy ${job.note.slug}: ${job.reason}`);
    else if (!job.state.startsWith("skip-")) console.log(JSON.stringify({
      slug: job.note.slug,
      state: job.state,
      outputs: job.outputs.map((output) => output.repoPath),
    }));
  }
}

function runRecord(options) {
  const receipt = parseAssetReceipt(fs.readFileSync(options.receiptFile));
  if (receipt.generator !== GENERATOR_ID || receipt.outputs.some((output) => output.kind !== "card")) {
    throw new Error(`receipt does not belong to ${GENERATOR_ID}`);
  }
  const expected = new Set([
    `site/src/images/cards/${receipt.slug}.webp`,
    `site/src/images/cards/${receipt.slug}-800.webp`,
  ]);
  if (receipt.outputs.length !== 2 || receipt.outputs.some((output) => !expected.has(output.path))) {
    throw new Error("card receipt must contain the canonical full/800 pair");
  }
  if (options.slugs.size > 0 && (!options.slugs.has(receipt.slug) || options.slugs.size !== 1)) {
    throw new Error("--slug must select exactly the receipt slug in --record mode");
  }
  const checks = preflightTools({
    tools: [
      { name: "git", command: "git", versionArgs: ["--version"] },
      { name: "image-probe", command: "ffprobe", versionArgs: ["-version"] },
    ],
    outputPaths: [{ path: path.dirname(MANIFEST), boundary: ROOT }],
  });
  if (!checks.ok) {
    for (const error of checks.errors) console.error(`PREFLIGHT ${error.code}: ${formatAssetError(error.message)}`);
    process.exitCode = 2;
    return;
  }
  const result = recordGeneratedAsset({
    root: ROOT,
    receipt,
    contentCommit: options.contentCommit,
    checkOnly: options.dryRun || options.preflightOnly,
  });
  console.log(JSON.stringify({
    script: "gen-paper-cards",
    mode: "record",
    slug: receipt.slug,
    changed: result.changed,
    check_only: result.check_only,
    manifest_sha256: result.manifest_sha256,
  }));
}

function runGeneration(options) {
  const manifest = readManifest();
  const contentCommit = options.contentCommit || manifest.content_commit;
  if (!GIT_SHA_RE.test(contentCommit || "")) throw new Error("a valid content commit is required");
  let plan = buildPlan({ notes: loadAllNotes(), manifest, ...options });
  const needsTools = plan.some((job) => job.state.startsWith("candidate"));
  const checks = preflightTools({
    tools: needsTools ? [
      { name: "generator", command: options.generatorBin, versionArgs: ["--version"] },
      { name: "converter", command: options.converterBin, versionArgs: ["-version"] },
    ] : [],
    outputPaths: needsTools ? [
      { path: options.outputDir, boundary: ROOT },
      ...(options.receiptFile ? [{ path: path.dirname(options.receiptFile), boundary: receiptBoundary(options.receiptFile) }] : []),
    ] : [],
  });
  if (!checks.ok) {
    for (const error of checks.errors) console.error(`PREFLIGHT ${error.code}: ${formatAssetError(error.message)}`);
    process.exitCode = 2;
    return;
  }
  if (needsTools && !snapshotPreflight(contentCommit, plan.filter((job) => job.state.startsWith("candidate")).map((job) => job.note))) {
    console.error("PREFLIGHT content commit must contain the exact note inputs and be an ancestor of HEAD");
    process.exitCode = 2;
    return;
  }
  plan = finalizeRegisteredJobs(plan, checks.tools, contentCommit, options);
  printPlan(plan, checks.tools, options.preflightOnly ? "preflight" : options.dryRun ? "dry-run" : "generate");
  const unsafe = plan.filter((job) => job.state.startsWith("error-"));
  if (unsafe.length > 0) {
    for (const job of unsafe) console.error(`FAIL ${job.note.slug}: ${job.reason}`);
    process.exitCode = 1;
    return;
  }
  const jobs = plan.filter((job) => job.state === "candidate");
  if (jobs.length > 0 && (options.slugs.size !== 1 || !options.receiptFile)) {
    console.error("PREFLIGHT a non-empty generation plan requires exactly one --slug and --receipt-file");
    process.exitCode = 2;
    return;
  }
  if (options.receiptFile && jobs.some((job) => job.outputs.some((output) => path.resolve(output.path) === options.receiptFile))) {
    console.error("PREFLIGHT --receipt-file must not collide with an asset output");
    process.exitCode = 2;
    return;
  }
  if (jobs.length > 0) assertReceiptAbsent(options.receiptFile);
  if (jobs.length === 0 || options.dryRun || options.preflightOnly) return;

  fs.mkdirSync(options.outputDir, { recursive: true });
  fs.mkdirSync(path.dirname(options.receiptFile), { recursive: true });
  const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eai-paper-card-"));
  try {
    const generated = jobs.map((job, index) => {
      const stagingDir = path.join(stagingRoot, String(index));
      fs.mkdirSync(stagingDir);
      return { job, image: runGenerator(job, stagingDir, options.generatorBin) };
    });
    const dimensions = new Map();
    let writtenReceipt = null;
    const flatOutputs = generated.flatMap(({ job, image }) => job.outputs.map((output) => ({ job, image, output })));
    const outputSpecs = flatOutputs.map(({ image, output }) => ({
      targetPath: output.path,
      boundary: ROOT,
      expectAbsent: true,
      writeTemp: (tempPath) => runConverter(options.converterBin, image.path, tempPath, output.args),
      validateTemp: ({ tempPath, sha256: outputSha }) => {
        const inspected = inspectImage(tempPath);
        if (inspected.format !== "webp" || inspected.sha256 !== outputSha) throw new Error("cwebp output validation failed");
        if (output.role === "compact" && inspected.width > 800) throw new Error("compact card exceeds 800 pixels");
        dimensions.set(path.resolve(output.path), inspected);
      },
    }));
    const installed = writeAssetAtomically({
      outputs: outputSpecs,
      commitMetadata: (results) => {
        const outputFacts = results.map((result, index) => {
          const { output } = flatOutputs[index];
          const inspected = dimensions.get(path.resolve(output.path));
          return {
            output,
            receipt: { kind: "card", path: output.repoPath, sha256: result.sha256, width: inspected.width, height: inspected.height },
            input: {
              kind: "card",
              path: output.repoPath,
              parameters: { argv: output.args },
            },
          };
        });
        const inputs = generationInputs({
          jobs,
          contentCommit,
          generatorVersion: checks.tools.generator.version,
          converterVersion: checks.tools.converter.version,
          outputMetadata: outputFacts.map((fact) => fact.input),
        });
        writtenReceipt = createAssetReceipt({
          slug: jobs[0].note.slug,
          generator: GENERATOR_ID,
          inputs,
          outputs: outputFacts.map((fact) => fact.receipt),
        });
        assertReceiptAbsent(options.receiptFile);
        writeAssetReceiptAtomically(options.receiptFile, writtenReceipt, {
          boundary: receiptBoundary(options.receiptFile),
        });
        return () => {
          try { fs.unlinkSync(options.receiptFile); } catch (error) { if (error?.code !== "ENOENT") throw error; }
        };
      },
    });
    console.log(`OK ${jobs[0].note.slug}: wrote ${installed.length} card assets and receipt ${path.basename(options.receiptFile)}`);
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

let options;
try {
  options = parseCli();
} catch (error) {
  console.error(`USAGE ${formatAssetError(error)}`);
  process.exitCode = 2;
}
if (options) {
  try {
    if (options.record) runRecord(options);
    else runGeneration(options);
  } catch (error) {
    console.error(`FAIL ${formatAssetError(error)}`);
    process.exitCode = process.exitCode || 1;
  }
}
