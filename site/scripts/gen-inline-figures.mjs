#!/usr/bin/env node
// 给每篇笔记内部生成 2 张图：场景图 + 方法图
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import matter from "gray-matter";
import { SCENE_SECTION_RE, METHOD_SECTION_RE, extractSectionParagraph } from "./figure-section-utils.mjs";
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
const DEFAULT_OUT = path.join(ROOT, "site", "src", "images", "inline");
const MANIFEST = path.join(PAPERS, "provenance.json");
const GENERATOR_ID = "gen-inline-figures/v2";
const TEMPLATE_ID = "inline-editorial";
const PROMPT_VERSION = "inline-editorial-v1";
const GIT_SHA_RE = /^[a-f0-9]{40}$/;

const STYLE = "Magazine-grade abstract editorial illustration. Style: warm hand-pressed paper background (#efe7d2 ivory), coral red (#ed6f5c) and mustard yellow (#e9b94a) accents, occasional olive green (#6e7448), subtle hairline rules. Pure flat editorial illustration, like Apartamento or Monocle magazine. NO photorealism, NO 3D rendering, NO TEXT, NO LABELS, NO LETTERS. Aspect ratio 16:9. Save the image. Output the saved file path.";


function extractScene(content) {
  return extractSectionParagraph(content, SCENE_SECTION_RE);
}

function extractMethod(content) {
  let text = extractSectionParagraph(content, METHOD_SECTION_RE);
  if (!text) {
    // fallback: TL;DR + 新想法
    const tldr = extractSectionParagraph(content, /##\s*(?:\d+\.\s*)?(?:一句话讲什么|TL;DR)[^\n]*/);
    const idea = extractSectionParagraph(content, /##\s*(?:\d+\.\s*)?(?:这篇论文的新想法|新想法)[^\n]*/);
    text = [tldr, idea].filter(Boolean).join(" ").slice(0, 400);
  }
  return text || null;
}

function makeScenePrompt(slug, title, scene) {
  // 场景图：用日常事物表达"这论文要解决的现实问题"
  return `a real-life situation that this paper addresses: ${scene.slice(0, 250)}. Show this as a metaphor with everyday objects (kitchen utensils, school items, factory tools, household scenes), not technical illustration. Single focal scene with one or two supporting elements`;
}

function makeMethodPrompt(slug, title, method) {
  // 方法图：技术 pipeline 抽象表达
  return `a pipeline or architecture diagram for "${title.split(":")[0].trim()}": ${method.slice(0, 250)}. Show this as flowing geometric shapes with arrows connecting input to output, no text or labels. Use 2-3 stages with clear directional flow`;
}

function loadAllNotes() {
  const result = [];
  for (const f of fs.readdirSync(NOTES).sort()) {
    if (!f.endsWith(".md")) continue;
    const slug = f.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(NOTES, f), "utf8");
    const { data, content } = matter(raw);
    if (!data.num || !data.topic) continue;
    const scene = extractScene(content);
    const method = extractMethod(content);
    result.push({
      slug,
      num: data.num,
      topic: data.topic,
      title: data.title || slug,
      scene,
      method,
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
  const plan = [];
  for (const note of notes.filter((candidate) => slugs.size === 0 || slugs.has(candidate.slug))) {
    const manifestRecord = manifestBySlug.get(note.slug);
    const recordMap = recordsByPath(manifestRecord);
    for (const role of ["scene", "method"]) {
      const sourceText = role === "scene" ? note.scene : note.method;
      const promptBody = role === "scene"
        ? (sourceText ? makeScenePrompt(note.slug, note.title, sourceText) : null)
        : (sourceText ? makeMethodPrompt(note.slug, note.title, sourceText) : null);
      const prompt = promptBody ? `generate an image: ${promptBody}. ${STYLE}` : null;
      const kind = role === "scene" ? "inline-scene" : "inline-method";
      const full = path.join(outputDir, `${note.slug}-${role}.webp`);
      const compact = path.join(outputDir, `${note.slug}-${role}-800.webp`);
      const outputs = [
        { role: "full", path: full, repoPath: repoPath(full), args: ["-q", "85", "-m", "6"] },
        { role: "compact", path: compact, repoPath: repoPath(compact), args: ["-q", "80", "-m", "6", "-resize", "800", "0"] },
      ].map((output) => ({
        ...output,
        exists: fs.existsSync(output.path),
        record: output.repoPath ? recordMap.get(output.repoPath) : null,
      }));
      let state = "candidate";
      let reason = "missing output pair";
      if (!manifestRecord) {
        state = "error-manifest";
        reason = "note is absent from papers/provenance.json";
      } else if (!prompt) {
        state = "skip-no-source";
        reason = "no source paragraph";
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
        || !new RegExp(`^site/src/images/inline/${note.slug}-${role}(?:-800)?\\.webp$`).test(output.repoPath)
      ))) {
        state = "error-path";
        reason = "receipt-backed inline figures require the canonical repository output directory";
      }
      plan.push({ note, role, kind, prompt, outputs, state, reason });
    }
  }
  return plan;
}

function generationInputs({ jobs, contentCommit, generatorVersion, converterVersion, outputMetadata }) {
  const promptHashes = jobs.map((job) => ({ kind: job.kind, sha256: sha256(job.prompt) }))
    .sort((a, b) => a.kind.localeCompare(b.kind, "en"));
  return {
    slug: jobs[0].note.slug,
    input_content_commit: contentCommit,
    sources: [...new Map(jobs.map((job) => [job.note.notePath, {
      path: job.note.notePath,
      sha256: job.note.noteSha256,
    }])).values()].sort((a, b) => a.path.localeCompare(b.path, "en")),
    prompt_sha256: sha256(JSON.stringify(promptHashes)),
    template: { id: TEMPLATE_ID, version: PROMPT_VERSION },
    generator: { id: GENERATOR_ID, version: generatorVersion },
    converter: { id: "cwebp", version: converterVersion },
    parameters: { adapter: "codex-exec-json-v1", output_format: "webp" },
    outputs: [...outputMetadata].sort((a, b) => a.path.localeCompare(b.path, "en")),
  };
}

function finalizeRegisteredJobs(plan, versions, contentCommit, options) {
  const bySlug = new Map();
  for (const job of plan.filter((candidate) => candidate.state === "candidate-check")) {
    if (!bySlug.has(job.note.slug)) bySlug.set(job.note.slug, []);
    bySlug.get(job.note.slug).push(job);
  }
  let receipt = null;
  if (bySlug.size > 0 && options.slugs.size === 1 && options.receiptFile && fs.existsSync(options.receiptFile)) {
    receipt = parseAssetReceipt(fs.readFileSync(options.receiptFile));
  }
  const finalized = new Map();
  for (const [slug, jobs] of bySlug) {
    if (!receipt || receipt.slug !== slug || receipt.generator !== GENERATOR_ID) {
      for (const job of jobs) finalized.set(job, { ...job, state: "error-receipt-required", reason: "registered assets require their portable receipt" });
      continue;
    }
    const expected = new Map(jobs.flatMap((job) => job.outputs.map((output) => [output.repoPath, job.kind])));
    if (receipt.outputs.length !== expected.size || receipt.outputs.some((output) => expected.get(output.path) !== output.kind)) {
      for (const job of jobs) finalized.set(job, { ...job, state: "error-receipt", reason: "receipt does not contain the canonical inline pairs" });
      continue;
    }
    const receiptOutputs = new Map(receipt.outputs.map((output) => [output.path, output]));
    const metadata = [];
    let drift = null;
    for (const job of jobs) {
      for (const output of job.outputs) {
        const inspected = inspectImage(output.path);
        const receiptOutput = receiptOutputs.get(output.repoPath);
        if (
          inspected.format !== "webp"
          || inspected.sha256 !== output.record.sha256
          || receiptOutput?.sha256 !== inspected.sha256
          || receiptOutput.width !== inspected.width
          || receiptOutput.height !== inspected.height
        ) {
          drift = `registered bytes drifted: ${output.repoPath}`;
          break;
        }
        metadata.push({
          kind: job.kind,
          path: output.repoPath,
          parameters: { argv: output.args },
        });
      }
      if (drift) break;
    }
    if (drift) {
      for (const job of jobs) finalized.set(job, { ...job, state: "error-drift", reason: drift });
      continue;
    }
    const inputs = generationInputs({
      jobs,
      contentCommit: receipt.inputs.input_content_commit,
      generatorVersion: versions.generator.version,
      converterVersion: versions.converter.version,
      outputMetadata: metadata,
    });
    const fingerprint = assetFingerprint(inputs);
    const current = jobs.every((job) => job.outputs.every((output) => (
      output.record.generator === GENERATOR_ID
      && output.record.input_fingerprint === fingerprint
      && receipt.input_fingerprint === fingerprint
      && output.record.content_commit === contentCommit
    )));
    for (const job of jobs) finalized.set(job, current
      ? { ...job, state: "skip-current", reason: "fingerprint and output hashes match provenance" }
      : { ...job, state: "error-stale", reason: `registered ${slug} assets conflict with the current generator inputs` });
  }
  return plan.map((job) => finalized.get(job) || job);
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
    script: "gen-inline-figures",
    mode,
    generator: versions.generator?.version || "not-needed",
    converter: versions.converter?.version || "not-needed",
    counts,
  }));
  for (const job of plan) {
    if (job.state === "skip-legacy") console.warn(`SKIP legacy ${job.note.slug}-${job.role}: ${job.reason}`);
    else if (!job.state.startsWith("skip-")) console.log(JSON.stringify({
      slug: job.note.slug,
      kind: job.kind,
      state: job.state,
      outputs: job.outputs.map((output) => output.repoPath),
    }));
  }
}

function runRecord(options) {
  const receipt = parseAssetReceipt(fs.readFileSync(options.receiptFile));
  if (receipt.generator !== GENERATOR_ID || receipt.outputs.some((output) => !["inline-scene", "inline-method"].includes(output.kind))) {
    throw new Error(`receipt does not belong to ${GENERATOR_ID}`);
  }
  for (const role of ["scene", "method"]) {
    const outputs = receipt.outputs.filter((output) => output.kind === `inline-${role}`);
    const expected = new Set([
      `site/src/images/inline/${receipt.slug}-${role}.webp`,
      `site/src/images/inline/${receipt.slug}-${role}-800.webp`,
    ]);
    if (outputs.length !== 0 && (outputs.length !== 2 || outputs.some((output) => !expected.has(output.path)))) {
      throw new Error(`inline receipt must contain a complete canonical ${role} full/800 pair`);
    }
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
    script: "gen-inline-figures",
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
    for (const job of unsafe) console.error(`FAIL ${job.note.slug}-${job.role}: ${job.reason}`);
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
  const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eai-inline-figure-"));
  try {
    const generated = jobs.map((job, index) => {
      const stagingDir = path.join(stagingRoot, String(index));
      fs.mkdirSync(stagingDir);
      return { job, image: runGenerator(job, stagingDir, options.generatorBin) };
    });
    const dimensions = new Map();
    const flatOutputs = generated.flatMap(({ job, image }) => job.outputs.map((output) => ({ job, image, output })));
    const outputSpecs = flatOutputs.map(({ image, output }) => ({
      targetPath: output.path,
      boundary: ROOT,
      expectAbsent: true,
      writeTemp: (tempPath) => runConverter(options.converterBin, image.path, tempPath, output.args),
      validateTemp: ({ tempPath, sha256: outputSha }) => {
        const inspected = inspectImage(tempPath);
        if (inspected.format !== "webp" || inspected.sha256 !== outputSha) throw new Error("cwebp output validation failed");
        if (output.role === "compact" && inspected.width > 800) throw new Error("compact inline figure exceeds 800 pixels");
        dimensions.set(path.resolve(output.path), inspected);
      },
    }));
    const installed = writeAssetAtomically({
      outputs: outputSpecs,
      commitMetadata: (results) => {
        const outputFacts = results.map((result, index) => {
          const { job, output } = flatOutputs[index];
          const inspected = dimensions.get(path.resolve(output.path));
          return {
            receipt: { kind: job.kind, path: output.repoPath, sha256: result.sha256, width: inspected.width, height: inspected.height },
            input: {
              kind: job.kind,
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
        const receipt = createAssetReceipt({
          slug: jobs[0].note.slug,
          generator: GENERATOR_ID,
          inputs,
          outputs: outputFacts.map((fact) => fact.receipt),
        });
        assertReceiptAbsent(options.receiptFile);
        writeAssetReceiptAtomically(options.receiptFile, receipt, {
          boundary: receiptBoundary(options.receiptFile),
        });
        return () => {
          try { fs.unlinkSync(options.receiptFile); } catch (error) { if (error?.code !== "ENOENT") throw error; }
        };
      },
    });
    console.log(`OK ${jobs[0].note.slug}: wrote ${installed.length} inline assets and receipt ${path.basename(options.receiptFile)}`);
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
