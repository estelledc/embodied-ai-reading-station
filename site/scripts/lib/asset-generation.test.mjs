import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  assetFingerprint,
  createAssetReceipt,
  formatAssetError,
  inspectImage,
  parseAssetReceipt,
  parseGeneratorResult,
  preflightTools,
  probeImage,
  recordGeneratedAsset,
  serializeAssetReceipt,
  writeAssetAtomically,
  writeAssetReceiptAtomically,
} from "./asset-generation.mjs";

function tempDirectory(prefix = "eai-asset-generation-") {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  test.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function pngFixture(width = 16, height = 9) {
  const chunk = (type, data) => {
    const bytes = Buffer.alloc(12 + data.length);
    bytes.writeUInt32BE(data.length, 0);
    bytes.write(type, 4, "ascii");
    data.copy(bytes, 8);
    return bytes;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", Buffer.from([0x00])),
    chunk("IEND", Buffer.alloc(0)),
  ]);
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

function receiptInputs({
  slug = "demo",
  generator = "test-generator/v1",
  inputContentCommit = "a".repeat(40),
  sourceSha256 = "c".repeat(64),
  outputs,
  promptSha256 = sha256("demo prompt"),
} = {}) {
  return {
    slug,
    input_content_commit: inputContentCommit,
    sources: [{ path: `notes/${slug}.md`, sha256: sourceSha256 }],
    prompt_sha256: promptSha256,
    template: { id: "asset-template/v1", version: "1.0.0" },
    generator: { id: generator, version: "1.0.0" },
    converter: { id: "cwebp", version: "1.6.0" },
    parameters: { pair: true },
    outputs: outputs.map((output) => ({
      kind: output.kind,
      path: output.path,
      parameters: { quality: output.width > 800 ? 85 : 80 },
    })),
  };
}

test("assetFingerprint canonicalizes object keys and changes with any bound input", () => {
  const first = assetFingerprint({
    template: "card@1",
    tools: { cwebp: "1.6.0", generator: "0.144.0" },
    params: ["-q", "85"],
  });
  const reordered = assetFingerprint({
    params: ["-q", "85"],
    tools: { generator: "0.144.0", cwebp: "1.6.0" },
    template: "card@1",
  });
  const changed = assetFingerprint({
    params: ["-q", "80"],
    tools: { generator: "0.144.0", cwebp: "1.6.0" },
    template: "card@1",
  });

  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, reordered);
  assert.notEqual(first, changed);
  assert.throws(() => assetFingerprint({ bad: undefined }), /must not be undefined/);
});

test("formatAssetError redacts local paths while preserving repository-relative diagnostics", () => {
  const formatted = formatAssetError(new Error(
    "ENOENT opening '/Users/你/My Project/private.json' from C:\\Users\\你\\secret and file:///tmp/token",
  ));
  assert.doesNotMatch(formatted, /Users|private\.json|secret|file:\/\/\/|\/tmp/);
  assert.match(formatted, /<local-path>/);
  assert.equal(formatAssetError("invalid notes/demo.md input"), "invalid notes/demo.md input");
});

test("preflightTools probes argv versions and checks writable ancestors without creating output", () => {
  const directory = tempDirectory();
  const future = path.join(directory, "nested", "cards");
  const calls = [];
  const result = preflightTools({
    tools: [{ name: "converter", command: "/tools/cwebp", versionArgs: ["-version"], versionPattern: /^1\.6/ }],
    outputPaths: [{ path: future, boundary: directory }],
    spawnSyncImpl: (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 0, stdout: "1.6.0\n", stderr: "", signal: null };
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.tools.converter, { version: "1.6.0" });
  assert.equal(fs.existsSync(future), false);
  assert.deepEqual(calls[0].args, ["-version"]);
  assert.equal(calls[0].options.shell, false);

  const missing = preflightTools({
    tools: [{ name: "generator", command: "missing", versionArgs: ["--version"] }],
    spawnSyncImpl: () => ({ status: null, error: Object.assign(new Error("missing"), { code: "ENOENT" }) }),
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.errors[0].code, "TOOL_NOT_FOUND");
});

test("preflightTools rejects an intermediate symlink below the trusted boundary", () => {
  const boundary = tempDirectory("eai-preflight-boundary-");
  const outside = tempDirectory("eai-preflight-outside-");
  fs.mkdirSync(path.join(outside, "existing"));
  fs.symlinkSync(outside, path.join(boundary, "link"));
  const result = preflightTools({
    outputPaths: [{ path: path.join(boundary, "link", "existing", "receipt.json"), boundary }],
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, "OUTPUT_NOT_WRITABLE");
});

test("parseGeneratorResult accepts exact structured output inside staging", () => {
  const stage = tempDirectory();
  fs.mkdirSync(path.join(stage, "generated"));
  fs.writeFileSync(path.join(stage, "generated", "card.png"), pngFixture(32, 18));

  const direct = parseGeneratorResult(JSON.stringify({ output_path: "generated/card.png" }), { stagingDir: stage });
  assert.equal(direct.relative_path, "generated/card.png");
  assert.equal(direct.width, 32);
  assert.equal(direct.height, 18);
  assert.match(direct.sha256, /^[a-f0-9]{64}$/);

  const jsonl = [
    JSON.stringify({ type: "thread.started", thread_id: "fixture" }),
    JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: JSON.stringify({ output_path: "generated/card.png" }) } }),
  ].join("\n");
  assert.equal(parseGeneratorResult(jsonl, { stagingDir: stage }).relative_path, "generated/card.png");
});

test("parseGeneratorResult rejects ambiguous, unsafe, symlinked, and non-PNG outputs", () => {
  const stage = tempDirectory();
  const outside = path.join(path.dirname(stage), `${path.basename(stage)}-outside.png`);
  fs.writeFileSync(outside, pngFixture());
  test.after(() => fs.rmSync(outside, { force: true }));
  fs.symlinkSync(outside, path.join(stage, "link.png"));
  fs.writeFileSync(path.join(stage, "text.png"), "not png");
  fs.writeFileSync(path.join(stage, "truncated.png"), pngFixture().subarray(0, 24));

  assert.throws(() => parseGeneratorResult({ output_path: outside }, { stagingDir: stage }), /safe relative PNG/);
  assert.throws(() => parseGeneratorResult({ output_path: "../outside.png" }, { stagingDir: stage }), /safe relative PNG/);
  assert.throws(() => parseGeneratorResult({ output_path: "link.png" }, { stagingDir: stage }), /regular non-symlink/);
  assert.throws(() => parseGeneratorResult({ output_path: "text.png" }, { stagingDir: stage }), /not a PNG/);
  assert.throws(() => parseGeneratorResult({ output_path: "truncated.png" }, { stagingDir: stage }), /not a PNG|incomplete/);
  assert.throws(
    () => parseGeneratorResult({ output_path: "text.png", extra: true }, { stagingDir: stage }),
    /contain exactly/,
  );
  assert.throws(
    () => parseGeneratorResult(`${JSON.stringify({ output_path: "text.png" })}\n${JSON.stringify({ output_path: "text.png" })}`, { stagingDir: stage }),
    /exactly one/,
  );
});

test("image inspection rejects a header-only WebP and decoder failures remain fatal", () => {
  const directory = tempDirectory();
  const headerOnly = path.join(directory, "header.webp");
  const structured = path.join(directory, "structured.webp");
  fs.writeFileSync(headerOnly, webpFixture().subarray(0, 30));
  fs.writeFileSync(structured, webpFixture());
  assert.throws(() => inspectImage(headerOnly), /not a WebP|no supported/);
  assert.throws(() => probeImage(structured, {
    spawnSyncImpl: () => ({ status: 1, stdout: "", stderr: "decoder error", signal: null }),
  }), /decoder rejected/);
});

test("writeAssetAtomically installs a validated pair only after both are ready", () => {
  const directory = tempDirectory();
  const full = path.join(directory, "demo.webp");
  const small = path.join(directory, "demo-800.webp");
  fs.writeFileSync(full, "old-full");
  fs.writeFileSync(small, "old-small");
  let metadataCalled = false;

  const result = writeAssetAtomically({
    outputs: [
      { targetPath: full, boundary: directory, writeTemp: (file) => fs.writeFileSync(file, "new-full"), validateTemp: ({ contents }) => assert.equal(contents.toString(), "new-full") },
      { targetPath: small, boundary: directory, writeTemp: (file) => fs.writeFileSync(file, "new-small"), validateTemp: ({ contents }) => assert.equal(contents.toString(), "new-small") },
    ],
    commitMetadata: (outputs) => {
      metadataCalled = true;
      assert.equal(outputs.length, 2);
    },
  });

  assert.equal(metadataCalled, true);
  assert.equal(fs.readFileSync(full, "utf8"), "new-full");
  assert.equal(fs.readFileSync(small, "utf8"), "new-small");
  assert.equal(result.length, 2);
  assert.match(result[0].sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(fs.readdirSync(directory).sort(), ["demo-800.webp", "demo.webp"]);
});

test("writeAssetAtomically rolls the entire pair back on prepare, rename, or metadata failure", async (t) => {
  for (const failure of ["prepare", "rename", "metadata"]) {
    await t.test(failure, () => {
      const directory = tempDirectory(`eai-asset-${failure}-`);
      const full = path.join(directory, "demo.webp");
      const small = path.join(directory, "demo-800.webp");
      fs.writeFileSync(full, "old-full");
      fs.writeFileSync(small, "old-small");
      let tempRenameCount = 0;
      const fsImpl = new Proxy(fs, {
        get(target, property) {
          if (property !== "renameSync") return Reflect.get(target, property);
          return (from, to) => {
            if (failure === "rename" && String(from).endsWith(".tmp") && (tempRenameCount += 1) === 2) {
              throw new Error("injected second rename failure");
            }
            return target.renameSync(from, to);
          };
        },
      });

      assert.throws(() => writeAssetAtomically({
        fsImpl,
        outputs: [
          { targetPath: full, boundary: directory, writeTemp: (file) => fs.writeFileSync(file, "new-full"), validateTemp: null },
          {
            targetPath: small,
            boundary: directory,
            writeTemp: (file) => {
              if (failure === "prepare") throw new Error("injected prepare failure");
              fs.writeFileSync(file, "new-small");
            },
            validateTemp: null,
          },
        ],
        commitMetadata: failure === "metadata" ? () => { throw new Error("injected metadata failure"); } : null,
      }), /injected/);

      assert.equal(fs.readFileSync(full, "utf8"), "old-full");
      assert.equal(fs.readFileSync(small, "utf8"), "old-small");
      assert.deepEqual(fs.readdirSync(directory).sort(), ["demo-800.webp", "demo.webp"]);
    });
  }
});

test("writeAssetAtomically preserves a recovery backup when restoration itself fails", () => {
  const directory = tempDirectory("eai-asset-restore-");
  const full = path.join(directory, "demo.webp");
  const small = path.join(directory, "demo-800.webp");
  fs.writeFileSync(full, "old-full");
  fs.writeFileSync(small, "old-small");
  const fsImpl = new Proxy(fs, {
    get(target, property) {
      if (property !== "renameSync") return Reflect.get(target, property);
      return (from, to) => {
        if (String(from).endsWith(".bak") && to === full) throw new Error("injected restore failure");
        return target.renameSync(from, to);
      };
    },
  });

  assert.throws(() => writeAssetAtomically({
    fsImpl,
    outputs: [
      { targetPath: full, boundary: directory, writeTemp: (file) => fs.writeFileSync(file, "new-full"), validateTemp: null },
      { targetPath: small, boundary: directory, writeTemp: (file) => fs.writeFileSync(file, "new-small"), validateTemp: null },
    ],
    commitMetadata: () => { throw new Error("injected metadata failure"); },
  }), /rollback is incomplete/);

  assert.equal(fs.existsSync(full), false);
  assert.equal(fs.readFileSync(small, "utf8"), "old-small");
  const recovery = fs.readdirSync(directory).find((name) => name.endsWith(".bak"));
  assert.ok(recovery);
  assert.equal(fs.readFileSync(path.join(directory, recovery), "utf8"), "old-full");
});

test("asset and receipt installation refuse paths that appear after planning", () => {
  const directory = tempDirectory("eai-asset-cas-");
  const target = path.join(directory, "demo.webp");
  fs.writeFileSync(target, "concurrent-user-bytes");
  assert.throws(() => writeAssetAtomically({
    outputs: [{
      targetPath: target,
      boundary: directory,
      expectAbsent: true,
      writeTemp: (file) => fs.writeFileSync(file, "generated-bytes"),
      validateTemp: null,
    }],
  }), /appeared after planning/);
  assert.equal(fs.readFileSync(target, "utf8"), "concurrent-user-bytes");

  const racedTarget = path.join(directory, "raced.webp");
  let injected = false;
  const fsImpl = new Proxy(fs, {
    get(targetFs, property) {
      if (property !== "linkSync") return Reflect.get(targetFs, property);
      return (from, to) => {
        if (!injected && to === racedTarget) {
          injected = true;
          targetFs.writeFileSync(to, "concurrent-user-file");
        }
        return targetFs.linkSync(from, to);
      };
    },
  });
  assert.throws(() => writeAssetAtomically({
    fsImpl,
    outputs: [{
      targetPath: racedTarget,
      boundary: directory,
      expectAbsent: true,
      writeTemp: (file) => fs.writeFileSync(file, "generated-bytes"),
      validateTemp: null,
    }],
  }), /appeared after planning/);
  assert.equal(injected, true);
  assert.equal(fs.readFileSync(racedTarget, "utf8"), "concurrent-user-file");

  const outputs = [
    { kind: "card", path: "site/src/images/cards/demo.webp", sha256: "b".repeat(64), width: 1672, height: 940 },
  ];
  const receipt = createAssetReceipt({
    slug: "demo",
    generator: "test-generator/v1",
    inputs: receiptInputs({ outputs }),
    outputs,
  });
  const receiptPath = path.join(directory, "receipt.json");
  fs.writeFileSync(receiptPath, "concurrent receipt");
  assert.throws(() => writeAssetReceiptAtomically(receiptPath, receipt, { boundary: directory }), /appeared after planning/);
  assert.equal(fs.readFileSync(receiptPath, "utf8"), "concurrent receipt");

  const racedReceiptPath = path.join(directory, "raced-receipt.json");
  let receiptInjected = false;
  const receiptFsImpl = new Proxy(fs, {
    get(targetFs, property) {
      if (property !== "linkSync") return Reflect.get(targetFs, property);
      return (from, to) => {
        if (!receiptInjected && to === racedReceiptPath) {
          receiptInjected = true;
          targetFs.writeFileSync(to, "concurrent receipt race");
        }
        return targetFs.linkSync(from, to);
      };
    },
  });
  assert.throws(
    () => writeAssetReceiptAtomically(racedReceiptPath, receipt, { boundary: directory, fsImpl: receiptFsImpl }),
    /appeared after planning/,
  );
  assert.equal(receiptInjected, true);
  assert.equal(fs.readFileSync(racedReceiptPath, "utf8"), "concurrent receipt race");
});

test("writeAssetAtomically rejects an intermediate symlink below its trusted boundary", () => {
  const boundary = tempDirectory("eai-writer-boundary-");
  const outside = tempDirectory("eai-writer-outside-");
  fs.mkdirSync(path.join(outside, "assets"));
  fs.symlinkSync(outside, path.join(boundary, "link"));
  const escaped = path.join(boundary, "link", "assets", "demo.webp");
  assert.throws(() => writeAssetAtomically({
    outputs: [{
      targetPath: escaped,
      boundary,
      expectAbsent: true,
      writeTemp: (file) => fs.writeFileSync(file, "generated"),
      validateTemp: null,
    }],
  }), /symlink|trusted boundary/);
  assert.equal(fs.existsSync(path.join(outside, "assets", "demo.webp")), false);

  fs.mkdirSync(path.join(outside, "receipts"));
  const outputs = [
    { kind: "card", path: "site/src/images/cards/demo.webp", sha256: "b".repeat(64), width: 1672, height: 940 },
  ];
  const receipt = createAssetReceipt({
    slug: "demo",
    generator: "test-generator/v1",
    inputs: receiptInputs({ outputs }),
    outputs,
  });
  const escapedReceipt = path.join(boundary, "link", "receipts", "pending.json");
  assert.throws(
    () => writeAssetReceiptAtomically(escapedReceipt, receipt, { boundary }),
    /symlink|trusted boundary/,
  );
  assert.equal(fs.existsSync(path.join(outside, "receipts", "pending.json")), false);
});

function git(root, args) {
  return String(execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_TRACE2: "0", GIT_TRACE2_EVENT: "0", GIT_TRACE2_PERF: "0" },
  })).trim();
}

function createRecordRepository() {
  const root = tempDirectory("eai-asset-record-");
  fs.mkdirSync(path.join(root, "notes"));
  fs.mkdirSync(path.join(root, "papers"));
  fs.mkdirSync(path.join(root, "site", "src", "images", "cards"), { recursive: true });
  const note = Buffer.from("---\ntitle: Demo\nnum: 1\ntopic: planning\n来源: https://example.com/paper\n---\n\nDemo note.\n");
  fs.writeFileSync(path.join(root, "notes", "demo.md"), note);
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Asset Test"]);
  git(root, ["config", "user.email", "asset-test@example.invalid"]);
  git(root, ["add", "notes/demo.md"]);
  git(root, ["commit", "-qm", "add note"]);
  const contentCommit = git(root, ["rev-parse", "HEAD"]);
  const manifest = {
    schema_version: "2.0.0",
    content_commit: contentCommit,
    notes: [{
      slug: "demo",
      note_path: "notes/demo.md",
      note_sha256: sha256(note),
      source: { kind: "remote", url: "https://example.com/paper", path: null, sha256: null, artifact_type: null },
      human_verification: { status: "UNVERIFIED", by: null, date: null, scope: null, blocked_reason: null },
      generated_assets: [],
    }],
  };
  fs.writeFileSync(path.join(root, "papers", "provenance.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  git(root, ["add", "papers/provenance.json"]);
  git(root, ["commit", "-qm", "add manifest"]);

  const fullPath = path.join(root, "site", "src", "images", "cards", "demo.webp");
  const smallPath = path.join(root, "site", "src", "images", "cards", "demo-800.webp");
  fs.writeFileSync(fullPath, webpFixture(1672, 940));
  fs.writeFileSync(smallPath, webpFixture(800, 450));
  git(root, ["add", "site/src/images/cards/demo.webp", "site/src/images/cards/demo-800.webp"]);
  git(root, ["commit", "-qm", "add generated assets"]);
  return {
    root,
    inputContentCommit: contentCommit,
    noteSha256: sha256(note),
    imageProbeImpl: (filePath, options) => {
      const bytes = options.fsImpl.readFileSync(filePath);
      const isFull = filePath.endsWith("demo.webp") && !filePath.endsWith("demo-800.webp");
      return {
        format: "webp",
        width: isFull ? 1672 : 800,
        height: isFull ? 940 : 450,
        sha256: sha256(bytes),
        bytes: bytes.length,
      };
    },
    contentCommit: git(root, ["rev-parse", "HEAD"]),
    manifestPath: path.join(root, "papers", "provenance.json"),
    fullPath,
    smallPath,
  };
}

test("asset receipts serialize without absolute paths and reject malformed metadata", () => {
  const outputs = [
    { kind: "card", path: "site/src/images/cards/demo.webp", sha256: "b".repeat(64), width: 1672, height: 940 },
  ];
  const receipt = createAssetReceipt({
    slug: "demo",
    generator: "test-generator/v1",
    inputs: receiptInputs({ outputs }),
    outputs,
  });
  assert.deepEqual(parseAssetReceipt(serializeAssetReceipt(receipt)), receipt);
  assert.throws(() => createAssetReceipt({
    slug: "demo",
    generator: "test-generator/v1",
    inputs: receiptInputs({ outputs: [{ kind: "card", path: "/tmp/demo.webp", sha256: "b".repeat(64), width: 1, height: 1 }] }),
    outputs: [{ kind: "card", path: "/tmp/demo.webp", sha256: "b".repeat(64), width: 1, height: 1 }],
  }), /local path|path is invalid/);

  const tamperedGenerator = structuredClone(receipt);
  tamperedGenerator.generator = "forged-generator/v1";
  assert.throws(() => parseAssetReceipt(JSON.stringify(tamperedGenerator)), /must match inputs.generator.id/);

  const leakedPath = structuredClone(receipt);
  leakedPath.inputs.parameters = { file_url: "file:///Users/你/private.png" };
  leakedPath.input_fingerprint = assetFingerprint(leakedPath.inputs);
  assert.throws(() => parseAssetReceipt(JSON.stringify(leakedPath)), /local path/);

  const embeddedPath = structuredClone(receipt);
  embeddedPath.inputs.parameters = { arg: "--input=/home/你/private.png" };
  embeddedPath.input_fingerprint = assetFingerprint(embeddedPath.inputs);
  embeddedPath.asset_fingerprint = assetFingerprint({ input_fingerprint: embeddedPath.input_fingerprint, outputs: embeddedPath.outputs });
  assert.throws(() => parseAssetReceipt(JSON.stringify(embeddedPath)), /local path/);

  for (const localPath of ["/tmp", "/secret", "prefix,/Users/你/secret", "prefix:/opt/secret"]) {
    const localPathReceipt = structuredClone(receipt);
    localPathReceipt.inputs.parameters = { arg: localPath };
    localPathReceipt.input_fingerprint = assetFingerprint(localPathReceipt.inputs);
    localPathReceipt.asset_fingerprint = assetFingerprint({
      input_fingerprint: localPathReceipt.input_fingerprint,
      outputs: localPathReceipt.outputs,
    });
    assert.throws(() => parseAssetReceipt(JSON.stringify(localPathReceipt)), /local path/, localPath);
  }

  const portableUrl = structuredClone(receipt);
  portableUrl.inputs.parameters = { endpoint: "https://example.com/models/v1" };
  portableUrl.input_fingerprint = assetFingerprint(portableUrl.inputs);
  portableUrl.asset_fingerprint = assetFingerprint({
    input_fingerprint: portableUrl.input_fingerprint,
    outputs: portableUrl.outputs,
  });
  assert.equal(parseAssetReceipt(JSON.stringify(portableUrl)).inputs.parameters.endpoint, "https://example.com/models/v1");

  const leakedKey = structuredClone(receipt);
  leakedKey.inputs.parameters = { "/Users/你/private.png": true };
  leakedKey.input_fingerprint = assetFingerprint(leakedKey.inputs);
  assert.throws(() => parseAssetReceipt(JSON.stringify(leakedKey)), /unsafe key/);

  const pairOutputs = [
    outputs[0],
    { ...outputs[0], path: "site/src/images/cards/demo-800.webp", sha256: "c".repeat(64), width: 800, height: 450 },
  ];
  const duplicatedBinding = receiptInputs({ outputs: pairOutputs });
  duplicatedBinding.outputs[1] = structuredClone(duplicatedBinding.outputs[0]);
  assert.throws(() => createAssetReceipt({
    slug: "demo",
    generator: "test-generator/v1",
    inputs: duplicatedBinding,
    outputs: pairOutputs,
  }), /match receipt outputs|exactly once/);
});

test("asset receipt bytes are deterministic across key and output order", () => {
  const outputs = [
    { kind: "card", path: "site/src/images/cards/demo.webp", sha256: "b".repeat(64), width: 1672, height: 940 },
    { kind: "card", path: "site/src/images/cards/demo-800.webp", sha256: "d".repeat(64), width: 800, height: 450 },
  ];
  const first = createAssetReceipt({
    slug: "demo",
    generator: "test-generator/v1",
    inputs: receiptInputs({ outputs }),
    outputs,
  });
  const reorderedInputs = receiptInputs({ outputs: [...outputs].reverse() });
  reorderedInputs.parameters = { pair: true };
  const second = createAssetReceipt({
    outputs: [...outputs].reverse(),
    inputs: reorderedInputs,
    generator: "test-generator/v1",
    slug: "demo",
  });
  assert.equal(first.input_fingerprint, second.input_fingerprint);
  assert.equal(serializeAssetReceipt(first), serializeAssetReceipt(second));

  const changedOutputs = outputs.map((output, index) => index === 0 ? { ...output, sha256: "e".repeat(64) } : output);
  const changedAsset = createAssetReceipt({
    slug: "demo",
    generator: "test-generator/v1",
    inputs: receiptInputs({ outputs: changedOutputs }),
    outputs: changedOutputs,
  });
  assert.equal(first.input_fingerprint, changedAsset.input_fingerprint);
  assert.notEqual(first.asset_fingerprint, changedAsset.asset_fingerprint);
});

test("recordGeneratedAsset verifies committed blobs, writes once, and is idempotent", () => {
  const fixture = createRecordRepository();
  const outputs = [
    { kind: "card", path: "site/src/images/cards/demo.webp", sha256: sha256(fs.readFileSync(fixture.fullPath)), width: 1672, height: 940 },
    { kind: "card", path: "site/src/images/cards/demo-800.webp", sha256: sha256(fs.readFileSync(fixture.smallPath)), width: 800, height: 450 },
  ];
  const receipt = createAssetReceipt({
    slug: "demo",
    generator: "test-generator/v1",
    inputs: receiptInputs({
      inputContentCommit: fixture.inputContentCommit,
      sourceSha256: fixture.noteSha256,
      outputs,
    }),
    outputs,
  });
  const before = fs.readFileSync(fixture.manifestPath);
  const checked = recordGeneratedAsset({ ...fixture, receipt, checkOnly: true });
  assert.equal(checked.changed, true);
  assert.deepEqual(fs.readFileSync(fixture.manifestPath), before);

  const written = recordGeneratedAsset({ ...fixture, receipt });
  assert.equal(written.changed, true);
  assert.equal(written.document.content_commit, fixture.contentCommit);
  assert.equal(written.document.notes[0].generated_assets.length, 2);
  const after = fs.readFileSync(fixture.manifestPath);

  const repeated = recordGeneratedAsset({ ...fixture, receipt });
  assert.equal(repeated.changed, false);
  assert.deepEqual(fs.readFileSync(fixture.manifestPath), after);
});

test("recordGeneratedAsset rejects receipt or snapshot drift without changing the manifest", () => {
  const fixture = createRecordRepository();
  const outputs = [
    { kind: "card", path: "site/src/images/cards/demo.webp", sha256: "b".repeat(64), width: 1672, height: 940 },
  ];
  const receipt = createAssetReceipt({
    slug: "demo",
    generator: "test-generator/v1",
    inputs: receiptInputs({
      inputContentCommit: fixture.inputContentCommit,
      sourceSha256: fixture.noteSha256,
      outputs,
    }),
    outputs,
  });
  const before = fs.readFileSync(fixture.manifestPath);
  assert.throws(
    () => recordGeneratedAsset({ ...fixture, receipt }),
    /metadata does not match current bytes/,
  );
  assert.deepEqual(fs.readFileSync(fixture.manifestPath), before);
});

test("recordGeneratedAsset verifies receipt input blobs in their declared ancestor snapshot", () => {
  const fixture = createRecordRepository();
  const outputs = [
    { kind: "card", path: "site/src/images/cards/demo.webp", sha256: sha256(fs.readFileSync(fixture.fullPath)), width: 1672, height: 940 },
  ];
  const receipt = createAssetReceipt({
    slug: "demo",
    generator: "test-generator/v1",
    inputs: receiptInputs({
      inputContentCommit: fixture.inputContentCommit,
      sourceSha256: "e".repeat(64),
      outputs,
    }),
    outputs,
  });
  const before = fs.readFileSync(fixture.manifestPath);
  assert.throws(
    () => recordGeneratedAsset({ ...fixture, receipt }),
    /input source hash does not match/,
  );
  assert.deepEqual(fs.readFileSync(fixture.manifestPath), before);
});

test("recordGeneratedAsset refuses to overwrite a manifest that differs from index or HEAD", () => {
  const fixture = createRecordRepository();
  const outputs = [
    { kind: "card", path: "site/src/images/cards/demo.webp", sha256: sha256(fs.readFileSync(fixture.fullPath)), width: 1672, height: 940 },
  ];
  const receipt = createAssetReceipt({
    slug: "demo",
    generator: "test-generator/v1",
    inputs: receiptInputs({
      inputContentCommit: fixture.inputContentCommit,
      sourceSha256: fixture.noteSha256,
      outputs,
    }),
    outputs,
  });
  fs.appendFileSync(fixture.manifestPath, "\n");
  const dirty = fs.readFileSync(fixture.manifestPath);
  assert.throws(
    () => recordGeneratedAsset({ ...fixture, receipt }),
    /match both index and HEAD/,
  );
  assert.deepEqual(fs.readFileSync(fixture.manifestPath), dirty);
});

test("recordGeneratedAsset compare-and-swap preserves a concurrent manifest update", () => {
  const fixture = createRecordRepository();
  const outputs = [
    { kind: "card", path: "site/src/images/cards/demo.webp", sha256: sha256(fs.readFileSync(fixture.fullPath)), width: 1672, height: 940 },
  ];
  const receipt = createAssetReceipt({
    slug: "demo",
    generator: "test-generator/v1",
    inputs: receiptInputs({
      inputContentCommit: fixture.inputContentCommit,
      sourceSha256: fixture.noteSha256,
      outputs,
    }),
    outputs,
  });
  let manifestReads = 0;
  const fsImpl = new Proxy(fs, {
    get(target, property) {
      if (property !== "readFileSync") return Reflect.get(target, property);
      return (filePath, ...args) => {
        const value = target.readFileSync(filePath, ...args);
        if (path.basename(filePath) === "provenance.json" && (manifestReads += 1) === 2) {
          target.appendFileSync(fixture.manifestPath, "\n");
        }
        return value;
      };
    },
  });
  assert.throws(
    () => recordGeneratedAsset({ ...fixture, receipt, fsImpl }),
    /changed concurrently before compare-and-swap/,
  );
  assert.equal(manifestReads, 2);
  assert.match(fs.readFileSync(fixture.manifestPath, "utf8"), /\n\n$/);
});

test("all five asset CLIs share the safe transaction contract without local-path parsing", () => {
  const scripts = [
    "gen-paper-cards.mjs",
    "gen-inline-figures.mjs",
    "gen-topic-fallback-assets.mjs",
    "fill-missing-cards.mjs",
    "fill-missing-inline.mjs",
  ];
  for (const name of scripts) {
    const source = fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
    assert.match(source, /preflightTools/);
    assert.match(source, /writeAssetAtomically/);
    assert.match(source, /writeAssetReceiptAtomically/);
    assert.match(source, /recordGeneratedAsset/);
    assert.match(source, /expectAbsent:\s*true/);
    assert.match(source, /"dry-run"/);
    assert.doesNotMatch(source, /\/Users\/|generated_images|\bexecSync\b|shell:\s*true/);
  }
  for (const name of ["gen-paper-cards.mjs", "gen-inline-figures.mjs"]) {
    const source = fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
    assert.match(source, /--output-schema/);
    assert.match(source, /"--sandbox",\s*"workspace-write"/);
    assert.match(source, /parseGeneratorResult/);
  }
});

test("all five asset CLIs redact an absolute receipt path from failures", () => {
  const receiptPath = path.join(tempDirectory(), "private", "missing-receipt.json");
  const scripts = [
    "gen-paper-cards.mjs",
    "gen-inline-figures.mjs",
    "gen-topic-fallback-assets.mjs",
    "fill-missing-cards.mjs",
    "fill-missing-inline.mjs",
  ];
  for (const name of scripts) {
    const scriptPath = fileURLToPath(new URL(`../${name}`, import.meta.url));
    const result = spawnSync(process.execPath, [
      scriptPath,
      "--record",
      "--slug", "clip",
      "--content-commit", "a".repeat(40),
      "--receipt-file", receiptPath,
    ], { encoding: "utf8", shell: false });
    assert.notEqual(result.status, 0, `${name} must fail for a missing receipt`);
    assert.ok(!result.stderr.includes(receiptPath), `${name} leaked the receipt path`);
    assert.match(result.stderr, /<local-path>/, `${name} must expose a stable redaction marker`);
  }
});
