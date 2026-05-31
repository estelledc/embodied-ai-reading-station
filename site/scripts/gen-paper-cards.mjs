#!/usr/bin/env node
// 给每篇论文用 codex 生成定制缩略图（基于 TL;DR + topic）
import fs from "node:fs";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const NOTES = path.join(ROOT, "notes");
const PAPERS = path.join(ROOT, "papers");
const OUT = path.join(ROOT, "site", "src", "images", "cards");
fs.mkdirSync(OUT, { recursive: true });

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
  for (const f of fs.readdirSync(NOTES)) {
    if (!f.endsWith(".md")) continue;
    const slug = f.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(NOTES, f), "utf8");
    const { data, content } = matter(raw);
    if (!data.num || !data.topic) continue;
    const tldrMatch = content.match(/##\s*(?:一句话讲什么|TL;DR|tl;dr)[^\n]*\n+([^\n]+)/);
    const tldr = tldrMatch ? tldrMatch[1].trim() : "";
    result.push({ slug, num: data.num, topic: data.topic, title: data.title || slug, tldr });
  }
  return result;
}

const notes = loadAllNotes();
console.log(`scanned ${notes.length} notes`);

const todo = notes.filter(n => {
  const real = path.join(PAPERS, n.slug, "images", "img_000.jpg");
  if (fs.existsSync(real)) return false;
  const out = path.join(OUT, `${n.slug}.webp`);
  if (fs.existsSync(out)) return false;
  return true;
});
console.log(`待生成: ${todo.length}`);

let done = 0, failed = 0;
const start = Date.now();
for (const n of todo) {
  done++;
  const elapsed = Math.round((Date.now() - start) / 60000);
  const eta = done > 1 ? Math.round((Date.now() - start) / (done - 1) * (todo.length - done + 1) / 60000) : "?";
  console.log(`\n[${done}/${todo.length}] ${n.slug} (${n.topic}) — elapsed ${elapsed}min, ETA ${eta}min`);
  const prompt = makePrompt(n);
  console.log(`  prompt: ...${prompt.slice(60, 200)}...`);

  const r = spawnSync("codex", ["exec", "--skip-git-repo-check", prompt], {
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 180_000,
    encoding: "utf8",
  });
  const stdout = r.stdout || "";
  const m = stdout.match(/\/Users\/jason\/\.codex\/generated_images\/[^\s]+\.png/);
  if (!m) {
    console.error(`  FAIL no PNG path`);
    failed++;
    continue;
  }
  const png = m[0];
  if (!fs.existsSync(png)) {
    console.error(`  FAIL PNG missing`);
    failed++;
    continue;
  }

  const out = path.join(OUT, `${n.slug}.webp`);
  try {
    execSync(`cwebp -q 85 -m 6 "${png}" -o "${out}"`, { stdio: "pipe" });
    const out800 = path.join(OUT, `${n.slug}-800.webp`);
    execSync(`cwebp -q 80 -m 6 -resize 800 0 "${png}" -o "${out800}"`, { stdio: "pipe" });
    const sz = Math.round(fs.statSync(out).size / 1024);
    console.log(`  OK ${sz}KB`);
  } catch (e) {
    console.error(`  cwebp FAIL: ${e.message}`);
    failed++;
  }
}
console.log(`\n=== done: ${done}, failed: ${failed} ===`);
