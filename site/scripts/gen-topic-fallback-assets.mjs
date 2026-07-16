#!/usr/bin/env node
/**
 * Generate one card pair and two inline pairs from a tracked topic image.
 * Generation and provenance recording are separate, fail-closed stages.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import matter from "gray-matter";
import {
  createAssetReceipt,
  formatAssetError,
  inspectImage,
  parseAssetReceipt,
  preflightTools,
  recordGeneratedAsset,
  writeAssetAtomically,
  writeAssetReceiptAtomically,
} from "./lib/asset-generation.mjs";

export const GENERATOR_ID = "cwebp-fallback/topic-assets/v2";
export const RECIPE_VERSION = "topic-asset-fallback-v2";

const TOKEN_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GIT_SHA_RE = /^[a-f0-9]{40}$/;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

export function pathsForRoot(root = ROOT) {
  const absolute = path.resolve(root);
  return {
    root: absolute,
    notes: path.join(absolute, "notes"),
    manifest: path.join(absolute, "papers", "provenance.json"),
    topics: path.join(absolute, "site", "src", "images", "topics"),
    cards: path.join(absolute, "site", "src", "images", "cards"),
    inline: path.join(absolute, "site", "src", "images", "inline"),
    receipts: path.join(absolute, ".tmp-receipts"),
  };
}

function isWithin(boundary, candidate) {
  const relative = path.relative(boundary, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function repoPath(root, filePath) {
  const relative = path.relative(root, filePath);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("path must stay inside the repository");
  }
  return relative.split(path.sep).join("/");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath, fsImpl = fs) {
  return sha256(fsImpl.readFileSync(filePath));
}

function pathExists(filePath, fsImpl = fs) {
  try {
    fsImpl.lstatSync(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function assertToken(value, label) {
  if (typeof value !== "string" || !TOKEN_RE.test(value)) {
    throw new Error(`${label} must use lowercase kebab-case`);
  }
  return value;
}

function assertCommit(value) {
  if (typeof value !== "string" || !GIT_SHA_RE.test(value)) {
    throw new Error("--content-commit must be 40 lowercase hexadecimal characters");
  }
  return value;
}

function assertRegularRepositoryFile(filePath, paths, label, fsImpl = fs) {
  const absolute = path.resolve(filePath);
  if (!isWithin(paths.root, absolute)) throw new Error(`${label} must stay inside the repository`);
  const stat = fsImpl.lstatSync(absolute);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`${label} must be a regular non-symlink file`);
  const rootReal = fsImpl.realpathSync(paths.root);
  const fileReal = fsImpl.realpathSync(absolute);
  if (!isWithin(rootReal, fileReal)) throw new Error(`${label} resolves outside the repository`);
  return absolute;
}

function assertRegularDirectory(directory, paths, label, fsImpl = fs) {
  const absolute = path.resolve(directory);
  if (!isWithin(paths.root, absolute)) throw new Error(`${label} must stay inside the repository`);
  const stat = fsImpl.lstatSync(absolute);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`${label} must be an existing non-symlink directory`);
  const rootReal = fsImpl.realpathSync(paths.root);
  const directoryReal = fsImpl.realpathSync(absolute);
  if (!isWithin(rootReal, directoryReal)) throw new Error(`${label} resolves outside the repository`);
  return absolute;
}

function outputSpecs(paths, slug) {
  return [
    { kind: "card", role: "full", maxWidth: 1672, quality: 85, path: path.join(paths.cards, `${slug}.webp`) },
    { kind: "card", role: "compact", maxWidth: 800, quality: 80, path: path.join(paths.cards, `${slug}-800.webp`) },
    { kind: "inline-method", role: "full", maxWidth: 1672, quality: 85, path: path.join(paths.inline, `${slug}-method.webp`) },
    { kind: "inline-method", role: "compact", maxWidth: 800, quality: 80, path: path.join(paths.inline, `${slug}-method-800.webp`) },
    { kind: "inline-scene", role: "full", maxWidth: 1672, quality: 85, path: path.join(paths.inline, `${slug}-scene.webp`) },
    { kind: "inline-scene", role: "compact", maxWidth: 800, quality: 80, path: path.join(paths.inline, `${slug}-scene-800.webp`) },
  ].map((output) => ({ ...output, repoPath: repoPath(paths.root, output.path) }));
}

function readManifest(paths, fsImpl = fs) {
  assertRegularRepositoryFile(paths.manifest, paths, "provenance manifest", fsImpl);
  let document;
  try {
    document = JSON.parse(fsImpl.readFileSync(paths.manifest, "utf8"));
  } catch {
    throw new Error("provenance manifest must contain valid JSON");
  }
  if (document?.schema_version !== "2.0.0" || !Array.isArray(document.notes)) {
    throw new Error("provenance manifest must use schema 2.0.0");
  }
  return document;
}

export function planTopicFallback(options, paths = pathsForRoot(), { fsImpl = fs } = {}) {
  const slug = assertToken(options.slug, "--slug");
  const topic = assertToken(options.topic, "--topic");
  const contentCommit = assertCommit(options.contentCommit);
  const receiptFile = path.resolve(options.receiptFile || "");
  const canonicalReceipt = path.join(paths.receipts, `${slug}-assets.json`);
  if (receiptFile !== canonicalReceipt) {
    throw new Error(`--receipt-file ${receiptFile} must be .tmp-receipts/${slug}-assets.json`);
  }

  assertRegularDirectory(paths.notes, paths, "notes directory", fsImpl);
  assertRegularDirectory(paths.topics, paths, "topic directory", fsImpl);
  assertRegularDirectory(paths.cards, paths, "card directory", fsImpl);
  assertRegularDirectory(paths.inline, paths, "inline directory", fsImpl);
  assertRegularDirectory(paths.receipts, paths, "receipt directory", fsImpl);

  const notePath = assertRegularRepositoryFile(path.join(paths.notes, `${slug}.md`), paths, "note", fsImpl);
  const note = matter(fsImpl.readFileSync(notePath, "utf8"));
  if (note.data.topic !== topic) throw new Error(`note topic does not match --topic ${topic}`);
  const sourcePath = assertRegularRepositoryFile(path.join(paths.topics, `${topic}.webp`), paths, "topic source", fsImpl);
  const manifest = readManifest(paths, fsImpl);
  if (!manifest.notes.some((entry) => entry?.slug === slug)) {
    throw new Error("slug is absent from the provenance manifest");
  }

  const outputs = outputSpecs(paths, slug);
  const existing = outputs.filter((output) => pathExists(output.path, fsImpl));
  if (existing.length > 0) {
    throw new Error(`all six output paths must be absent; found ${existing.length}`);
  }
  if (pathExists(receiptFile, fsImpl)) throw new Error("receipt file already exists; refusing to overwrite it");

  return {
    slug,
    topic,
    contentCommit,
    receiptFile,
    notePath,
    noteRepoPath: repoPath(paths.root, notePath),
    sourcePath,
    sourceRepoPath: repoPath(paths.root, sourcePath),
    sourceSha256: sha256File(sourcePath, fsImpl),
    outputs,
  };
}

function gitEnvironment() {
  return { ...process.env, GIT_TRACE2: "0", GIT_TRACE2_EVENT: "0", GIT_TRACE2_PERF: "0" };
}

function gitText(root, args, execFileSyncImpl = execFileSync) {
  return String(execFileSyncImpl("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: gitEnvironment(),
  })).trim();
}

function gitBytes(root, args, execFileSyncImpl = execFileSync) {
  return Buffer.from(execFileSyncImpl("git", args, {
    cwd: root,
    encoding: null,
    stdio: ["ignore", "pipe", "pipe"],
    env: gitEnvironment(),
    maxBuffer: 32 * 1024 * 1024,
  }));
}

export function verifyContentSnapshot(plan, paths = pathsForRoot(), { execFileSyncImpl = execFileSync, fsImpl = fs } = {}) {
  try {
    if (gitText(paths.root, ["cat-file", "-t", plan.contentCommit], execFileSyncImpl) !== "commit") throw new Error("not a commit");
    execFileSyncImpl("git", ["merge-base", "--is-ancestor", plan.contentCommit, "HEAD"], {
      cwd: paths.root,
      stdio: ["ignore", "pipe", "pipe"],
      env: gitEnvironment(),
    });
  } catch {
    throw new Error("content commit must identify an available ancestor of HEAD");
  }
  for (const [repoFile, currentFile] of [
    [plan.noteRepoPath, plan.notePath],
    [plan.sourceRepoPath, plan.sourcePath],
  ]) {
    let tree;
    try { tree = gitText(paths.root, ["ls-tree", plan.contentCommit, "--", repoFile], execFileSyncImpl); }
    catch { tree = ""; }
    if (!/^(?:100644|100755) blob [a-f0-9]{40,64}\t/.test(tree)) {
      throw new Error(`content commit lacks a regular input blob: ${repoFile}`);
    }
    const snapshot = gitBytes(paths.root, ["show", `${plan.contentCommit}:${repoFile}`], execFileSyncImpl);
    if (sha256(snapshot) !== sha256File(currentFile, fsImpl)) {
      throw new Error(`current input differs from content commit: ${repoFile}`);
    }
  }
}

function generationPreflight(plan, paths, options, deps) {
  const checks = (deps.preflightToolsImpl || preflightTools)({
    tools: [
      { name: "cwebp", command: options.converterBin, versionArgs: ["-version"], versionPattern: /^\d+\.\d+\.\d+/ },
      { name: "git", command: "git", versionArgs: ["--version"], versionPattern: /^git version \S+/ },
      { name: "ffprobe", command: "ffprobe", versionArgs: ["-version"], versionPattern: /^ffprobe version \S+/ },
    ],
    outputPaths: [
      ...plan.outputs.map((output) => ({ path: output.path, boundary: paths.root })),
      { path: plan.receiptFile, boundary: paths.root },
    ],
    spawnSyncImpl: deps.toolSpawnSyncImpl || spawnSync,
  });
  if (!checks.ok) {
    const error = new Error(checks.errors.map((entry) => `${entry.code}: ${entry.message}`).join("; "));
    error.exitCode = 2;
    throw error;
  }
  return checks;
}

export function buildReceiptInputs(plan, cwebpVersion) {
  return {
    slug: plan.slug,
    input_content_commit: plan.contentCommit,
    sources: [{ path: plan.sourceRepoPath, sha256: plan.sourceSha256 }],
    prompt_sha256: null,
    template: { id: "topic-asset-fallback", version: RECIPE_VERSION },
    generator: { id: GENERATOR_ID, version: cwebpVersion },
    converter: { id: "cwebp", version: cwebpVersion },
    parameters: { codec: "webp", group_atomic: true, pair_atomic: true, source_priority: ["topic"] },
    outputs: plan.outputs.map((output) => ({
      kind: output.kind,
      path: output.repoPath,
      parameters: {
        max_width: output.maxWidth,
        quality: output.quality,
        role: output.role,
        source_path: plan.sourceRepoPath,
      },
    })),
  };
}

export function runCwebp({ binary, source, destination, maxWidth, quality, spawnSyncImpl = spawnSync }) {
  const result = spawnSyncImpl(binary, [
    "-quiet", "-q", String(quality), "-resize", String(maxWidth), "0", source, "-o", destination,
  ], { encoding: "utf8", shell: false, timeout: 120_000 });
  if (result?.error || result?.signal || result?.status !== 0) {
    throw new Error("cwebp conversion failed");
  }
}

export function generateTopicFallback(plan, paths, options, checks, deps = {}) {
  const fsImpl = deps.fsImpl || fs;
  const inspectImageImpl = deps.inspectImageImpl || inspectImage;
  const validation = new Map();
  let receipt = null;
  let writtenReceipt = null;
  const transaction = (deps.writeAssetAtomicallyImpl || writeAssetAtomically)({
    outputs: plan.outputs.map((output) => ({
      targetPath: output.path,
      boundary: paths.root,
      expectAbsent: true,
      writeTemp: (tempPath) => runCwebp({
        binary: options.converterBin,
        source: plan.sourcePath,
        destination: tempPath,
        maxWidth: output.maxWidth,
        quality: output.quality,
        spawnSyncImpl: deps.converterSpawnSyncImpl || spawnSync,
      }),
      validateTemp: ({ tempPath }) => {
        const image = inspectImageImpl(tempPath);
        if (image.format !== "webp" || image.width !== output.maxWidth || image.height < 1) {
          throw new Error(`${output.repoPath} must be a ${output.maxWidth}px-wide WebP`);
        }
        validation.set(output.path, image);
      },
    })),
    commitMetadata: () => {
      const inputs = buildReceiptInputs(plan, checks.tools.cwebp.version);
      receipt = createAssetReceipt({
        slug: plan.slug,
        generator: GENERATOR_ID,
        inputs,
        outputs: plan.outputs.map((output) => {
          const image = validation.get(output.path);
          return {
            kind: output.kind,
            path: output.repoPath,
            sha256: image.sha256,
            width: image.width,
            height: image.height,
          };
        }),
      });
      writtenReceipt = (deps.writeAssetReceiptAtomicallyImpl || writeAssetReceiptAtomically)(
        plan.receiptFile,
        receipt,
        { boundary: paths.root, fsImpl },
      );
      return () => {
        if (!pathExists(plan.receiptFile, fsImpl)) return;
        if (sha256File(plan.receiptFile, fsImpl) !== writtenReceipt.sha256) {
          throw new Error("receipt changed during rollback");
        }
        fsImpl.unlinkSync(plan.receiptFile);
      };
    },
    fsImpl,
  });
  return { transaction, receipt };
}

function readCombinedReceipt(options, paths, fsImpl = fs) {
  const slug = assertToken(options.slug, "--slug");
  assertCommit(options.contentCommit);
  const receiptFile = path.resolve(options.receiptFile || "");
  if (receiptFile !== path.join(paths.receipts, `${slug}-assets.json`)) {
    throw new Error(`--receipt-file ${receiptFile} must be .tmp-receipts/${slug}-assets.json`);
  }
  assertRegularRepositoryFile(receiptFile, paths, "receipt", fsImpl);
  return { receiptFile, receipt: parseAssetReceipt(fsImpl.readFileSync(receiptFile)), slug };
}

export function validateCombinedReceipt(receipt, slug, paths = pathsForRoot()) {
  if (receipt.slug !== slug) throw new Error("receipt slug does not match --slug");
  if (receipt.generator !== GENERATOR_ID) throw new Error("receipt was not created by gen-topic-fallback-assets");
  if (receipt.inputs.template?.id !== "topic-asset-fallback" || receipt.inputs.template?.version !== RECIPE_VERSION) {
    throw new Error("receipt template version is invalid");
  }
  if (!GIT_SHA_RE.test(receipt.inputs.input_content_commit || "")) throw new Error("receipt content commit is invalid");
  if (receipt.inputs.sources.length !== 1 || !/^site\/src\/images\/topics\/[a-z0-9-]+\.webp$/.test(receipt.inputs.sources[0].path)) {
    throw new Error("receipt must bind exactly one topic source");
  }
  const expected = new Map(outputSpecs(paths, slug).map((output) => [output.repoPath, output.kind]));
  if (
    receipt.outputs.length !== expected.size
    || receipt.outputs.some((output) => expected.get(output.path) !== output.kind)
    || new Set(receipt.outputs.map((output) => output.path)).size !== expected.size
  ) {
    throw new Error("receipt must contain the exact six combined outputs");
  }
  return receipt;
}

export function recordTopicFallback(options, paths = pathsForRoot(), deps = {}) {
  const fsImpl = deps.fsImpl || fs;
  const { receipt, slug } = readCombinedReceipt(options, paths, fsImpl);
  validateCombinedReceipt(receipt, slug, paths);
  const checks = (deps.preflightToolsImpl || preflightTools)({
    tools: [
      { name: "git", command: "git", versionArgs: ["--version"], versionPattern: /^git version \S+/ },
      { name: "ffprobe", command: "ffprobe", versionArgs: ["-version"], versionPattern: /^ffprobe version \S+/ },
    ],
    outputPaths: [{ path: paths.manifest, boundary: paths.root }],
    spawnSyncImpl: deps.toolSpawnSyncImpl || spawnSync,
  });
  if (!checks.ok) {
    const error = new Error(checks.errors.map((entry) => `${entry.code}: ${entry.message}`).join("; "));
    error.exitCode = 2;
    throw error;
  }
  const result = (deps.recordGeneratedAssetImpl || recordGeneratedAsset)({
    root: paths.root,
    manifestPath: paths.manifest,
    receipt,
    contentCommit: options.contentCommit,
    checkOnly: options.dryRun || options.preflightOnly,
  });
  return { mode: "record", slug, changed: result.changed, check_only: result.check_only };
}

export function executeTopicFallback(options, paths = pathsForRoot(), deps = {}) {
  if (options.record) return recordTopicFallback(options, paths, deps);
  const plan = planTopicFallback(options, paths, deps);
  const checks = generationPreflight(plan, paths, options, deps);
  verifyContentSnapshot(plan, paths, deps);
  const summary = {
    mode: "generate",
    slug: plan.slug,
    topic: plan.topic,
    content_commit: plan.contentCommit,
    source: plan.sourceRepoPath,
    outputs: plan.outputs.map((output) => output.repoPath),
    check_only: options.dryRun || options.preflightOnly,
  };
  if (summary.check_only) return summary;
  const generated = generateTopicFallback(plan, paths, options, checks, deps);
  return { ...summary, receipt: repoPath(paths.root, plan.receiptFile), generated: generated.receipt.outputs.length };
}

function cliOptions(argv = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      "dry-run": { type: "boolean", default: false },
      preflight: { type: "boolean", default: false },
      record: { type: "boolean", default: false },
      slug: { type: "string" },
      topic: { type: "string" },
      "content-commit": { type: "string" },
      "receipt-file": { type: "string" },
      "converter-bin": { type: "string" },
    },
  });
  if (!values.slug || !values["content-commit"] || !values["receipt-file"]) {
    throw new Error("--slug, --content-commit and --receipt-file are required");
  }
  if (!values.record && !values.topic) throw new Error("generation requires --topic");
  return {
    dryRun: values["dry-run"],
    preflightOnly: values.preflight,
    record: values.record,
    slug: values.slug,
    topic: values.topic || null,
    contentCommit: values["content-commit"],
    receiptFile: path.resolve(values["receipt-file"]),
    converterBin: values["converter-bin"] || process.env.CWEBP_BIN || "cwebp",
  };
}

async function main() {
  let options;
  try { options = cliOptions(); }
  catch (error) {
    console.error(`USAGE ${formatAssetError(error)}`);
    process.exitCode = 2;
    return;
  }
  try {
    console.log(JSON.stringify(executeTopicFallback(options), null, 2));
  } catch (error) {
    console.error(`${error.exitCode === 2 ? "PREFLIGHT" : "FAIL"} ${formatAssetError(error)}`);
    process.exitCode = error.exitCode || 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
