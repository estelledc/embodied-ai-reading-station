import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import {
  executeTopicFallback,
  pathsForRoot,
  planTopicFallback,
  recordTopicFallback,
  validateCombinedReceipt,
} from "./gen-topic-fallback-assets.mjs";
import { parseAssetReceipt } from "./lib/asset-generation.mjs";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function webpFixture(width = 16, height = 9) {
  const bytes = Buffer.alloc(44);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(36, 4);
  bytes.write("WEBP", 8, "ascii");
  bytes.write("VP8X", 12, "ascii");
  bytes.writeUInt32LE(10, 16);
  bytes.writeUIntLE(width - 1, 24, 3);
  bytes.writeUIntLE(height - 1, 27, 3);
  bytes.write("VP8L", 30, "ascii");
  bytes.writeUInt32LE(5, 34);
  bytes[38] = 0x2f;
  return bytes;
}

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_TRACE2: "0", GIT_TRACE2_EVENT: "0", GIT_TRACE2_PERF: "0" },
  }).trim();
}

function createFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eai-topic-fallback-"));
  t.after(() => fs.rmSync(root, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 50,
  }));
  const paths = pathsForRoot(root);
  for (const directory of [paths.notes, path.dirname(paths.manifest), paths.topics, paths.cards, paths.inline, paths.receipts]) {
    fs.mkdirSync(directory, { recursive: true });
  }
  fs.writeFileSync(path.join(paths.notes, "demo.md"), "---\ntitle: Demo\ntopic: demo-topic\n---\n\nDemo.\n");
  fs.writeFileSync(path.join(paths.topics, "demo-topic.webp"), webpFixture(1672, 941));
  fs.writeFileSync(paths.manifest, `${JSON.stringify({
    schema_version: "2.0.0",
    content_commit: "0".repeat(40),
    notes: [{ slug: "demo", generated_assets: [] }],
  }, null, 2)}\n`);
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "fixture@example.com"]);
  git(root, ["config", "user.name", "Fixture"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-qm", "fixture"]);
  const contentCommit = git(root, ["rev-parse", "HEAD"]);
  return {
    root,
    paths,
    options: {
      dryRun: false,
      preflightOnly: false,
      record: false,
      slug: "demo",
      topic: "demo-topic",
      contentCommit,
      receiptFile: path.join(paths.receipts, "demo-assets.json"),
      converterBin: "fixture-cwebp",
    },
  };
}

function generationDeps({ failAt = null } = {}) {
  const dimensions = new Map();
  let conversions = 0;
  return {
    get conversions() { return conversions; },
    preflightToolsImpl: () => ({
      ok: true,
      errors: [],
      tools: {
        cwebp: { version: "1.6.0" },
        git: { version: "git version fixture" },
        ffprobe: { version: "ffprobe version fixture" },
      },
    }),
    converterSpawnSyncImpl: (_command, args) => {
      conversions += 1;
      if (conversions === failAt) return { status: 1, stdout: "", stderr: "fixture failure", signal: null };
      const resize = args.indexOf("-resize");
      const output = args[args.indexOf("-o") + 1];
      const width = Number(args[resize + 1]);
      const height = width === 800 ? 451 : 941;
      const bytes = webpFixture(width, height);
      fs.writeFileSync(output, bytes);
      dimensions.set(output, { width, height, bytes });
      return { status: 0, stdout: "", stderr: "", signal: null };
    },
    inspectImageImpl: (filePath) => {
      const image = dimensions.get(filePath);
      if (!image) throw new Error("fixture image was not generated");
      return {
        format: "webp",
        width: image.width,
        height: image.height,
        bytes: image.bytes.length,
        sha256: sha256(image.bytes),
      };
    },
  };
}

test("dry-run verifies the snapshot and leaves all outputs absent", (t) => {
  const fixture = createFixture(t);
  const deps = generationDeps();
  const result = executeTopicFallback({ ...fixture.options, dryRun: true }, fixture.paths, deps);

  assert.equal(result.check_only, true);
  assert.equal(result.outputs.length, 6);
  assert.equal(deps.conversions, 0);
  assert.equal(fs.existsSync(fixture.options.receiptFile), false);
  for (const output of result.outputs) assert.equal(fs.existsSync(path.join(fixture.root, output)), false);
});

test("one generation transaction writes six portable outputs and one combined receipt", (t) => {
  const fixture = createFixture(t);
  const deps = generationDeps();
  const result = executeTopicFallback(fixture.options, fixture.paths, deps);
  const receiptBytes = fs.readFileSync(fixture.options.receiptFile);
  const receipt = parseAssetReceipt(receiptBytes);

  assert.equal(result.generated, 6);
  assert.equal(deps.conversions, 6);
  assert.equal(receipt.outputs.length, 6);
  assert.equal(receipt.inputs.input_content_commit, fixture.options.contentCommit);
  assert.equal(receipt.inputs.sources[0].path, "site/src/images/topics/demo-topic.webp");
  assert.doesNotMatch(receiptBytes.toString("utf8"), new RegExp(fixture.root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(validateCombinedReceipt(receipt, "demo", fixture.paths), receipt);
  for (const output of receipt.outputs) assert.equal(fs.existsSync(path.join(fixture.root, output.path)), true);
});

test("a converter failure rolls back the whole output group and receipt", (t) => {
  const fixture = createFixture(t);
  const deps = generationDeps({ failAt: 4 });

  assert.throws(() => executeTopicFallback(fixture.options, fixture.paths, deps), /cwebp conversion failed/);
  assert.equal(fs.existsSync(fixture.options.receiptFile), false);
  for (const directory of [fixture.paths.cards, fixture.paths.inline, fixture.paths.receipts]) {
    assert.deepEqual(fs.readdirSync(directory), []);
  }
});

test("a receipt write failure rolls back all six installed outputs", (t) => {
  const fixture = createFixture(t);
  const deps = generationDeps();
  deps.writeAssetReceiptAtomicallyImpl = () => {
    throw new Error("fixture receipt write failure");
  };

  assert.throws(() => executeTopicFallback(fixture.options, fixture.paths, deps), /fixture receipt write failure/);
  assert.equal(fs.existsSync(fixture.options.receiptFile), false);
  for (const directory of [fixture.paths.cards, fixture.paths.inline, fixture.paths.receipts]) {
    assert.deepEqual(fs.readdirSync(directory), []);
  }
});

test("dry-run rejects note and topic bytes that drift from the content snapshot", (t) => {
  const fixture = createFixture(t);
  const notePath = path.join(fixture.paths.notes, "demo.md");
  const originalNote = fs.readFileSync(notePath);
  fs.appendFileSync(notePath, "\nDrift.\n");
  assert.throws(
    () => executeTopicFallback({ ...fixture.options, dryRun: true }, fixture.paths, generationDeps()),
    /current input differs from content commit: notes\/demo\.md/,
  );
  fs.writeFileSync(notePath, originalNote);

  const sourcePath = path.join(fixture.paths.topics, "demo-topic.webp");
  const originalSource = fs.readFileSync(sourcePath);
  fs.writeFileSync(sourcePath, webpFixture(800, 451));
  assert.throws(
    () => executeTopicFallback({ ...fixture.options, dryRun: true }, fixture.paths, generationDeps()),
    /current input differs from content commit: site\/src\/images\/topics\/demo-topic\.webp/,
  );
  fs.writeFileSync(sourcePath, originalSource);
});

test("invalid identifiers, stale snapshots, symlinks, and partial output sets fail closed", (t) => {
  const fixture = createFixture(t);
  assert.throws(() => planTopicFallback({ ...fixture.options, slug: "../demo" }, fixture.paths), /kebab-case/);
  assert.throws(() => planTopicFallback({ ...fixture.options, topic: "Demo Topic" }, fixture.paths), /kebab-case/);
  assert.throws(() => planTopicFallback({ ...fixture.options, contentCommit: "abc" }, fixture.paths), /40 lowercase/);
  assert.throws(
    () => planTopicFallback({ ...fixture.options, receiptFile: path.join(fixture.root, "other.json") }, fixture.paths),
    /\.tmp-receipts/,
  );

  fs.writeFileSync(path.join(fixture.paths.cards, "demo.webp"), webpFixture());
  assert.throws(() => planTopicFallback(fixture.options, fixture.paths), /all six output paths must be absent/);
  fs.unlinkSync(path.join(fixture.paths.cards, "demo.webp"));

  const source = path.join(fixture.paths.topics, "demo-topic.webp");
  fs.unlinkSync(source);
  fs.symlinkSync(path.join(fixture.paths.notes, "demo.md"), source);
  assert.throws(() => planTopicFallback(fixture.options, fixture.paths), /regular non-symlink/);
});

test("record mode validates the combined receipt and delegates to manifest CAS", (t) => {
  const fixture = createFixture(t);
  executeTopicFallback(fixture.options, fixture.paths, generationDeps());
  let recorded = null;
  const result = recordTopicFallback({ ...fixture.options, record: true, dryRun: true }, fixture.paths, {
    preflightToolsImpl: () => ({
      ok: true,
      errors: [],
      tools: { git: { version: "git version fixture" }, ffprobe: { version: "ffprobe version fixture" } },
    }),
    recordGeneratedAssetImpl: (options) => {
      recorded = options;
      return { changed: true, check_only: options.checkOnly };
    },
  });

  assert.equal(result.mode, "record");
  assert.equal(result.check_only, true);
  assert.equal(recorded.root, fixture.root);
  assert.equal(recorded.manifestPath, fixture.paths.manifest);
  assert.equal(recorded.contentCommit, fixture.options.contentCommit);
  assert.equal(recorded.receipt.outputs.length, 6);
  assert.equal(recorded.checkOnly, true);
});

test("a tampered combined receipt is rejected before manifest delegation", (t) => {
  const fixture = createFixture(t);
  executeTopicFallback(fixture.options, fixture.paths, generationDeps());
  const manifestBefore = fs.readFileSync(fixture.paths.manifest);
  const receipt = JSON.parse(fs.readFileSync(fixture.options.receiptFile, "utf8"));
  receipt.outputs[0].width += 1;
  fs.writeFileSync(fixture.options.receiptFile, `${JSON.stringify(receipt, null, 2)}\n`);
  let delegated = false;

  assert.throws(
    () => recordTopicFallback({ ...fixture.options, record: true, dryRun: true }, fixture.paths, {
      recordGeneratedAssetImpl: () => {
        delegated = true;
        return { changed: true, check_only: true };
      },
    }),
    /asset_fingerprint/,
  );
  assert.equal(delegated, false);
  assert.deepEqual(fs.readFileSync(fixture.paths.manifest), manifestBefore);
});
