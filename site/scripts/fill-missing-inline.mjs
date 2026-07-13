#!/usr/bin/env node
/**
 * Fill missing inline scene/method WebP pairs from local paper images or topic art.
 * The complete plan and tool preflight finish before any directory or temp file is created.
 */
import crypto from "node:crypto";
import fs from "node:fs";
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
  preflightTools,
  recordGeneratedAsset,
  writeAssetAtomically,
  writeAssetReceiptAtomically,
} from "./lib/asset-generation.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const NOTES = path.join(ROOT, "notes");
const PAPERS = path.join(ROOT, "papers");
const DEFAULT_INLINE = path.join(ROOT, "site", "src", "images", "inline");
const TOPICS = path.join(ROOT, "site", "src", "images", "topics");
const HERO = path.join(ROOT, "site", "src", "images", "hero.webp");
const MANIFEST = path.join(PAPERS, "provenance.json");
const RECIPE_VERSION = "fill-missing-inline-v2";
const GENERATOR_ID = "ffmpeg-fallback/fill-missing-inline/v2";
const GIT_SHA_RE = /^[a-f0-9]{40}$/;

function cliOptions(argv = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      "dry-run": { type: "boolean", default: false },
      preflight: { type: "boolean", default: false },
      "output-dir": { type: "string" },
      "content-commit": { type: "string" },
      "receipt-file": { type: "string" },
      "generator-bin": { type: "string" },
      "converter-bin": { type: "string" },
      record: { type: "boolean", default: false },
      slug: { type: "string", multiple: true, default: [] },
    },
  });
  if (values.record && (!values["content-commit"] || !values["receipt-file"])) {
    throw new Error("--record requires --content-commit and --receipt-file");
  }
  if (values["content-commit"] && !GIT_SHA_RE.test(values["content-commit"])) {
    throw new Error("--content-commit must be 40 lowercase hexadecimal characters");
  }
  if (values.record && values.slug.length !== 1) throw new Error("--record requires exactly one --slug");
  if (values["generator-bin"] && values["converter-bin"] && values["generator-bin"] !== values["converter-bin"]) {
    throw new Error("fill fallback uses one ffmpeg binary; --generator-bin and --converter-bin must match");
  }
  return {
    dryRun: values["dry-run"],
    preflightOnly: values.preflight,
    outputDir: path.resolve(values["output-dir"] || DEFAULT_INLINE),
    contentCommit: values["content-commit"] || null,
    receiptFile: values["receipt-file"] ? path.resolve(values["receipt-file"]) : null,
    record: values.record,
    slugs: new Set(values.slug),
    ffmpegBin: values["converter-bin"] || values["generator-bin"] || process.env.FFMPEG_BIN || "ffmpeg",
  };
}

function readManifest() {
  const document = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  if (document?.schema_version !== "2.0.0" || !Array.isArray(document.notes)) {
    throw new Error("papers/provenance.json must use schema 2.0.0");
  }
  return document;
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function firstPaperImage(slug) {
  const directory = path.join(PAPERS, slug, "images");
  if (!fs.existsSync(directory)) return null;
  const files = fs.readdirSync(directory).filter((name) => /\.(jpe?g|png|webp)$/i.test(name)).sort();
  return files[0] ? path.join(directory, files[0]) : null;
}

function fallbackSrc(slug, topic) {
  return (
    firstPaperImage(slug)
    || (topic && fs.existsSync(path.join(TOPICS, `${topic}.webp`)) ? path.join(TOPICS, `${topic}.webp`) : null)
    || (fs.existsSync(HERO) ? HERO : null)
  );
}

function repoPath(filePath) {
  const relative = path.relative(ROOT, filePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return relative.split(path.sep).join("/");
}

function isRegularRepositoryFile(filePath) {
  if (!repoPath(filePath)) return false;
  const stat = fs.lstatSync(filePath);
  const relativeReal = path.relative(fs.realpathSync(ROOT), fs.realpathSync(filePath));
  return stat.isFile() && !stat.isSymbolicLink()
    && relativeReal !== ".." && !relativeReal.startsWith(`..${path.sep}`) && !path.isAbsolute(relativeReal);
}

function assetByPath(note) {
  return new Map((note?.generated_assets || []).map((asset) => [asset.path, asset]));
}

function trustedExistingDirectory(targetPath) {
  let cursor = path.resolve(targetPath);
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) throw new Error("path has no existing ancestor");
    cursor = parent;
  }
  const stat = fs.lstatSync(cursor);
  const directory = stat.isDirectory() ? cursor : path.dirname(cursor);
  return directory;
}

function readReceiptFile(filePath) {
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("receipt must be a regular non-symlink file");
  return parseAssetReceipt(fs.readFileSync(filePath));
}

function buildPlan({ outputDir, slugs, manifest }) {
  const noteRecords = new Map(manifest.notes.map((note) => [note.slug, note]));
  const entries = [];
  const files = fs.readdirSync(NOTES).filter((name) => name.endsWith(".md")).sort();
  const knownSlugs = new Set(files.map((name) => name.slice(0, -3)));
  for (const slug of slugs) if (!knownSlugs.has(slug)) throw new Error(`unknown --slug: ${slug}`);
  for (const file of files) {
    const slug = file.slice(0, -3);
    if (slugs.size > 0 && !slugs.has(slug)) continue;
    const { data } = matter(fs.readFileSync(path.join(NOTES, file), "utf8"));
    const source = fallbackSrc(slug, data.topic || "");
    const unsafeSource = Boolean(source && !isRegularRepositoryFile(source));
    const manifestRecord = noteRecords.get(slug);
    const records = assetByPath(manifestRecord);
    for (const role of ["scene", "method"]) {
      const kind = role === "scene" ? "inline-scene" : "inline-method";
      const full = path.join(outputDir, `${slug}-${role}.webp`);
      const compact = path.join(outputDir, `${slug}-${role}-800.webp`);
      const fullRepoPath = repoPath(full);
      const compactRepoPath = repoPath(compact);
      const fullRecord = fullRepoPath ? records.get(fullRepoPath) : null;
      const compactRecord = compactRepoPath ? records.get(compactRepoPath) : null;
      const fullExists = fs.existsSync(full);
      const compactExists = fs.existsSync(compact);
      const hasAnyRecord = Boolean(fullRecord || compactRecord);

      let state = "candidate";
      let reason = "missing output pair";
      if (!manifestRecord) {
        state = "error-manifest-record";
        reason = "slug is absent from the provenance manifest";
      } else if (unsafeSource) {
        state = "error-unsafe-source";
        reason = "fallback source must be a regular repository file";
      } else if (!source && hasAnyRecord) {
        state = "error-recorded-source";
        reason = "recorded output has no reproducible fallback source";
      } else if (!source) {
        state = "skip-no-source";
        reason = "no paper image, topic image, or hero fallback";
      } else if ((fullExists || compactExists) && !hasAnyRecord) {
        state = "skip-legacy";
        reason = fullExists && compactExists
          ? "existing unrecorded legacy pair"
          : "existing unrecorded partial legacy pair";
      } else if (hasAnyRecord && (fullExists !== compactExists || !fullRecord || !compactRecord)) {
        state = "error-recorded-partial";
        reason = "recorded output pair is incomplete and will not be overwritten";
      } else if (hasAnyRecord && fullExists && compactExists) {
        state = "candidate-check";
        reason = "recorded output pair requires fingerprint/hash check";
      } else if (hasAnyRecord) {
        state = "error-recorded-missing";
        reason = "provenance exists but both output files are missing";
      }

      entries.push({
        slug,
        role,
        kind,
        source,
        sourceRepoPath: source ? repoPath(source) : null,
        outputs: [
          { role: "full", path: full, repoPath: fullRepoPath, maxWidth: 1672, quality: 4, record: fullRecord },
          { role: "compact", path: compact, repoPath: compactRepoPath, maxWidth: 800, quality: 5, record: compactRecord },
        ],
        manifestRecord,
        state,
        reason,
      });
    }
  }
  return entries;
}

function runPreflight(plan, options) {
  const needsFfmpeg = plan.some((entry) => entry.state === "candidate" || entry.state === "candidate-check");
  const writesOutputs = plan.some((entry) => entry.state === "candidate");
  const outputPaths = writesOutputs ? [{ path: options.outputDir, boundary: ROOT }] : [];
  if (writesOutputs && options.receiptFile) {
    const receiptDirectory = path.dirname(options.receiptFile);
    outputPaths.push({ path: receiptDirectory, boundary: trustedExistingDirectory(receiptDirectory) });
  }
  return preflightTools({
    tools: needsFfmpeg ? [{
      name: "ffmpeg",
      command: options.ffmpegBin,
      versionArgs: ["-version"],
      versionPattern: /^ffmpeg version \S+/,
      requiredBy: ["fill-missing-inline"],
    }, {
      name: "git",
      command: "git",
      versionArgs: ["--version"],
      versionPattern: /^git version \S+/,
      requiredBy: ["fill-missing-inline"],
    }] : [],
    outputPaths,
  });
}

function verifyContentCommit(contentCommit, plan) {
  const env = { ...process.env, GIT_TRACE2: "0", GIT_TRACE2_EVENT: "0", GIT_TRACE2_PERF: "0" };
  for (const args of [["cat-file", "-e", `${contentCommit}^{commit}`], ["merge-base", "--is-ancestor", contentCommit, "HEAD"]]) {
    const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", shell: false, env });
    if (result.error || result.status !== 0) throw new Error("content commit must be an available ancestor of HEAD");
  }
  for (const source of new Map(plan.filter((entry) => entry.state === "candidate").map((entry) => [entry.sourceRepoPath, entry.source])).entries()) {
    const [sourcePath, currentPath] = source;
    const tree = spawnSync("git", ["ls-tree", contentCommit, "--", sourcePath], { cwd: ROOT, encoding: "utf8", shell: false, env });
    if (tree.error || tree.status !== 0 || !/^(?:100644|100755) blob [a-f0-9]{40,64}\t/.test(tree.stdout.trim())) {
      throw new Error(`generation source is not a regular blob at content commit: ${sourcePath}`);
    }
    const snapshot = spawnSync("git", ["show", `${contentCommit}:${sourcePath}`], {
      cwd: ROOT, encoding: null, shell: false, env, maxBuffer: 32 * 1024 * 1024,
    });
    if (snapshot.error || snapshot.status !== 0 || crypto.createHash("sha256").update(snapshot.stdout).digest("hex") !== sha256File(currentPath)) {
      throw new Error(`generation source differs from content commit: ${sourcePath}`);
    }
  }
}

function finalizePlan(plan, contentCommit, ffmpegVersion, options) {
  const bySlug = new Map();
  for (const entry of plan.filter((candidate) => candidate.state === "candidate-check")) {
    if (!bySlug.has(entry.slug)) bySlug.set(entry.slug, []);
    bySlug.get(entry.slug).push(entry);
  }
  let receipt = null;
  if (bySlug.size > 0 && options.slugs.size === 1 && options.receiptFile && fs.existsSync(options.receiptFile)) {
    receipt = readReceiptFile(options.receiptFile);
    validateInlineReceipt(receipt, options);
  }
  const finalized = new Map();
  for (const [slug, entries] of bySlug) {
    const outputFacts = entries.flatMap((entry) => entry.outputs.map((output) => ({ entry, output, image: inspectImage(output.path) })));
    if (!receipt || receipt.slug !== slug) {
      for (const entry of entries) finalized.set(entry, {
        ...entry,
        state: "error-receipt-required",
        reason: "registered assets require their portable receipt for input verification",
      });
      continue;
    }
    const inputs = receiptInputs(entries, {
      contentCommit: receipt.inputs.input_content_commit,
      ffmpegVersion,
    }, outputFacts);
    const receiptOutputs = new Map(receipt.outputs.map((output) => [output.path, output]));
    const current = assetFingerprint(inputs) === receipt.input_fingerprint
      && outputFacts.every(({ output, image }) => {
        const receiptOutput = receiptOutputs.get(output.repoPath);
        return image.format === "webp"
          && receiptOutput?.sha256 === image.sha256
          && receiptOutput.width === image.width
          && receiptOutput.height === image.height
          && output.record?.generator === GENERATOR_ID
          && output.record.input_fingerprint === receipt.input_fingerprint
          && output.record.sha256 === image.sha256
          && output.record.content_commit === contentCommit;
      });
    for (const entry of entries) finalized.set(entry, current
      ? { ...entry, state: "skip-current", reason: "receipt fingerprint and output hashes match provenance" }
      : { ...entry, state: "error-recorded-drift", reason: "recorded bytes or generator inputs drifted; refusing overwrite" });
  }
  return plan.map((entry) => finalized.get(entry) || entry);
}

function runFfmpeg(ffmpegBin, source, destination, { maxWidth, quality }) {
  const filter = `scale=min(${maxWidth}\\,iw):-2`;
  const args = [
    "-y", "-nostdin", "-hide_banner", "-loglevel", "error", "-i", source,
    "-vf", filter, "-c:v", "libwebp", "-q:v", String(quality), "-f", "webp", destination,
  ];
  const result = spawnSync(ffmpegBin, args, { encoding: "utf8", shell: false, timeout: 120_000 });
  if (result.error || result.status !== 0) {
    const failure = result.error ? `launch failed (${result.error.code || "UNKNOWN"})` : `exited ${result.status}`;
    throw new Error(`ffmpeg ${failure}`);
  }
}

function validateWebp(output, filePath) {
  const image = inspectImage(filePath);
  if (image.format !== "webp" || image.width > output.maxWidth) {
    throw new Error(`${output.role} output must be WebP no wider than ${output.maxWidth}px`);
  }
  return image;
}

function receiptInputs(entries, { contentCommit, ffmpegVersion }, outputFacts) {
  return {
    slug: entries[0].slug,
    input_content_commit: contentCommit,
    sources: [...new Map(entries.map((entry) => [entry.sourceRepoPath, {
      path: entry.sourceRepoPath,
      sha256: sha256File(entry.source),
    }])).values()].sort((a, b) => a.path.localeCompare(b.path, "en")),
    prompt_sha256: null,
    template: { id: "fill-missing-inline", version: RECIPE_VERSION },
    generator: { id: GENERATOR_ID, version: ffmpegVersion },
    converter: { id: "ffmpeg", version: ffmpegVersion },
    parameters: {
      codec: "libwebp",
      pair_atomic: true,
      source_priority: ["paper-first-raster", "topic", "hero"],
    },
    outputs: outputFacts.map(({ entry, output, image }) => ({
      kind: entry.kind,
      path: output.repoPath,
      parameters: {
        role: output.role,
        source_path: entry.sourceRepoPath,
        max_width: output.maxWidth,
        quality: output.quality,
      },
    })).sort((a, b) => a.path.localeCompare(b.path, "en")),
  };
}

function generateEntries(entries, options, { contentCommit, ffmpegVersion }) {
  const flat = entries.flatMap((entry) => entry.outputs.map((output) => ({ entry, output })));
  if (flat.some(({ output }) => fs.existsSync(output.path))) {
    throw new Error("an output appeared after planning; refusing to overwrite it");
  }
  if (fs.existsSync(options.receiptFile)) throw new Error("receipt file already exists; refusing to overwrite it");
  fs.mkdirSync(options.outputDir, { recursive: true });
  fs.mkdirSync(path.dirname(options.receiptFile), { recursive: true });

  const validation = new Map();
  let writtenReceipt = null;
  const results = writeAssetAtomically({
    outputs: flat.map(({ output, entry }) => ({
      targetPath: output.path,
      boundary: ROOT,
      expectAbsent: true,
      writeTemp: (tempPath) => runFfmpeg(options.ffmpegBin, entry.source, tempPath, output),
      validateTemp: ({ tempPath }) => validation.set(output.path, validateWebp(output, tempPath)),
    })),
    commitMetadata: () => {
      const outputFacts = flat.map(({ entry, output }) => ({ entry, output, image: validation.get(output.path) }));
      const inputs = receiptInputs(entries, { contentCommit, ffmpegVersion }, outputFacts);
      const receipt = createAssetReceipt({
        slug: entries[0].slug,
        generator: GENERATOR_ID,
        inputs,
        inputFingerprint: assetFingerprint(inputs),
        outputs: outputFacts.map(({ entry, output, image }) => ({
          kind: entry.kind,
          path: output.repoPath,
          sha256: image.sha256,
          width: image.width,
          height: image.height,
        })),
      });
      writtenReceipt = writeAssetReceiptAtomically(options.receiptFile, receipt, {
        boundary: trustedExistingDirectory(path.dirname(options.receiptFile)),
      });
      return () => {
        if (!fs.existsSync(options.receiptFile)) return;
        if (sha256File(options.receiptFile) !== writtenReceipt.sha256) throw new Error("receipt changed during rollback");
        fs.unlinkSync(options.receiptFile);
      };
    },
  });
  return { results, receipt: writtenReceipt };
}

function validateInlineReceipt(receipt, options) {
  const [slug] = options.slugs;
  if (receipt.slug !== slug) throw new Error(`receipt slug ${receipt.slug} does not match --slug ${slug}`);
  if (receipt.generator !== GENERATOR_ID) throw new Error("receipt was not created by fill-missing-inline");
  const prefix = repoPath(options.outputDir);
  if (!prefix) throw new Error("--record output directory must be inside the repository");
  const valid = new Set([
    [`${prefix}/${slug}-scene.webp`, "inline-scene"],
    [`${prefix}/${slug}-scene-800.webp`, "inline-scene"],
    [`${prefix}/${slug}-method.webp`, "inline-method"],
    [`${prefix}/${slug}-method-800.webp`, "inline-method"],
  ].map(([assetPath, kind]) => `${kind}\0${assetPath}`));
  if (receipt.outputs.length % 2 !== 0 || receipt.outputs.some((output) => !valid.has(`${output.kind}\0${output.path}`))) {
    throw new Error("receipt contains an invalid inline output set");
  }
  for (const role of ["scene", "method"]) {
    const paths = receipt.outputs.filter((output) => output.kind === `inline-${role}`).map((output) => output.path);
    if (paths.length !== 0 && paths.length !== 2) throw new Error(`receipt must contain a complete ${role} full/800 pair`);
  }
}

function runRecordStage(options) {
  const receipt = readReceiptFile(options.receiptFile);
  validateInlineReceipt(receipt, options);
  const checks = preflightTools({
    tools: [
      { name: "git", command: "git", versionArgs: ["--version"], versionPattern: /^git version \S+/ },
      { name: "ffprobe", command: "ffprobe", versionArgs: ["-version"], versionPattern: /^ffprobe version \S+/ },
    ],
    outputPaths: [{ path: path.dirname(MANIFEST), boundary: ROOT }],
  });
  if (!checks.ok) {
    for (const error of checks.errors) console.error(`PREFLIGHT ${error.code}: ${formatAssetError(error.message)}`);
    process.exitCode = 2;
    return;
  }
  const checkOnly = options.dryRun || options.preflightOnly;
  const result = recordGeneratedAsset({
    root: ROOT,
    manifestPath: MANIFEST,
    receipt,
    contentCommit: options.contentCommit,
    checkOnly,
  });
  console.log(JSON.stringify({
    script: "fill-missing-inline",
    mode: "record",
    slug: receipt.slug,
    content_commit: options.contentCommit,
    changed: result.changed,
    check_only: result.check_only,
  }));
}

function printPlan(plan, { ffmpegVersion }) {
  const counts = {};
  for (const entry of plan) counts[entry.state] = (counts[entry.state] || 0) + 1;
  console.log(JSON.stringify({
    script: "fill-missing-inline",
    recipe: RECIPE_VERSION,
    mode: "generate",
    ffmpeg: ffmpegVersion,
    counts,
  }));
  for (const entry of plan.filter((item) => !item.state.startsWith("skip-"))) {
    console.log(JSON.stringify({ slug: entry.slug, kind: entry.kind, state: entry.state, source: entry.sourceRepoPath, outputs: entry.outputs.map((item) => item.repoPath) }));
  }
}

function generationRequestError(candidates, options, { allowExternal = false } = {}) {
  if (candidates.length === 0) return null;
  if (options.slugs.size !== 1 || candidates.some((entry) => entry.slug !== [...options.slugs][0])) {
    return "a non-empty generation plan requires exactly one --slug";
  }
  if (!options.receiptFile) return "a non-empty generation plan requires --receipt-file";
  if (!allowExternal && candidates.flatMap((entry) => entry.outputs).some((output) => !/^site\/src\/images\/inline\/[a-z0-9-]+-(?:scene|method)(?:-800)?\.webp$/.test(output.repoPath || ""))) {
    return "receipt-backed inline generation requires the canonical repository output directory";
  }
  if (fs.existsSync(options.receiptFile)) return "receipt file already exists; refusing to overwrite it";
  return null;
}

async function main(options) {
  if (options.record) {
    runRecordStage(options);
    return;
  }
  const manifest = readManifest();
  const contentCommit = options.contentCommit || manifest.content_commit;
  if (!GIT_SHA_RE.test(contentCommit || "")) throw new Error("a valid content commit is required");
  let plan = buildPlan({ ...options, manifest });
  const checks = runPreflight(plan, options);
  if (!checks.ok) {
    for (const error of checks.errors) console.error(`PREFLIGHT ${error.code}: ${formatAssetError(error.message)}`);
    process.exitCode = 2;
    return;
  }
  const ffmpegVersion = checks.tools.ffmpeg?.version || "not-needed";
  if (plan.some((entry) => entry.state === "candidate" || entry.state === "candidate-check")) {
    try { verifyContentCommit(contentCommit, plan); }
    catch (error) {
      console.error(`PREFLIGHT ${formatAssetError(error)}`);
      process.exitCode = 2;
      return;
    }
  }
  plan = finalizePlan(plan, contentCommit, ffmpegVersion, options);
  printPlan(plan, { ffmpegVersion });
  const errors = plan.filter((entry) => entry.state.startsWith("error-"));
  if (errors.length > 0) {
    console.error(`FAIL ${errors.map((entry) => `${entry.slug}-${entry.role}: ${entry.reason}`).join("; ")}`);
    process.exitCode = 1;
    return;
  }
  const candidates = plan.filter((entry) => entry.state === "candidate");
  const requestError = generationRequestError(candidates, options, { allowExternal: options.dryRun });
  if (requestError) {
    console.error(`PREFLIGHT ${requestError}`);
    process.exitCode = 2;
    return;
  }
  if (options.dryRun) return;
  if (options.preflightOnly) return;
  if (candidates.length === 0) {
    console.log("\n=== no inline pairs to generate ===");
    return;
  }
  const generated = generateEntries(candidates, options, { contentCommit, ffmpegVersion });
  console.log(`\n=== generated ${generated.results.length} inline assets; receipt ${generated.receipt.file} ===`);
}

let options;
try {
  options = cliOptions();
} catch (error) {
  console.error(`USAGE ${formatAssetError(error)}`);
  process.exitCode = 2;
}
if (options) {
  try { await main(options); }
  catch (error) {
    console.error(`FAIL ${formatAssetError(error)}`);
    process.exitCode = process.exitCode || 1;
  }
}
