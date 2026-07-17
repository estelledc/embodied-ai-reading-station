import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { test } from "node:test";
import {
  formatProvenanceRepositoryErrors,
  validateProvenanceRepository,
  validateProvenanceRepositoryFile,
} from "./provenance-validator.mjs";

const ZERO_SHA256 = "0".repeat(64);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function git(root, args, options = {}) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    ...options,
    env: {
      ...process.env,
      ...(options.env ?? {}),
      GIT_TRACE2: "0",
      GIT_TRACE2_EVENT: "0",
      GIT_TRACE2_PERF: "0",
    },
  }).trim();
}

function write(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function fixtureRepository(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eai-provenance-validator-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 20 }));

  const localPaper = "local parsed paper\n";
  const card = Buffer.from([0x00, 0x0a, 0xff, 0x62, 0x69, 0x6e, 0x61, 0x72, 0x79, 0x0a]);
  const localNote = [
    "---",
    "num: 1",
    "topic: demo",
    "title: Demo Local",
    "来源: papers/demo-local/paper.md",
    "---",
    "# Demo Local",
    "",
  ].join("\n");
  const remoteNote = [
    "---",
    "num: 2",
    "topic: demo",
    "title: Demo Remote",
    "来源: https://example.com/paper",
    "---",
    "# Demo Remote",
    "",
  ].join("\n");

  write(path.join(root, "notes", "demo-local.md"), localNote);
  write(path.join(root, "notes", "demo-remote.md"), remoteNote);
  write(path.join(root, "papers", "demo-local", "paper.md"), localPaper);
  write(path.join(root, "site", "src", "images", "cards", "demo-local.webp"), card);
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "validator@example.com"]);
  git(root, ["config", "user.name", "Validator Fixture"]);
  git(root, ["config", "commit.gpgSign", "false"]);
  git(root, ["add", "notes", "papers", "site/src/images/cards"]);
  git(root, ["commit", "-q", "-m", "content snapshot"]);
  const contentCommit = git(root, ["rev-parse", "HEAD"]);

  const document = {
    schema_version: "2.0.0",
    content_commit: contentCommit,
    notes: [
      {
        slug: "demo-local",
        note_path: "notes/demo-local.md",
        note_sha256: sha256(localNote),
        source: {
          kind: "local",
          url: null,
          path: "papers/demo-local/paper.md",
          sha256: sha256(localPaper),
          artifact_type: "parsed-paper-markdown",
        },
        human_verification: {
          status: "UNVERIFIED",
          by: null,
          date: null,
          scope: null,
          blocked_reason: null,
        },
        generated_assets: [{
          kind: "card",
          tracked: true,
          path: "site/src/images/cards/demo-local.webp",
          sha256: sha256(card),
          generator: "fixture-card-v1",
          input_fingerprint: sha256("fixture input"),
          content_commit: contentCommit,
        }],
      },
      {
        slug: "demo-remote",
        note_path: "notes/demo-remote.md",
        note_sha256: sha256(remoteNote),
        source: {
          kind: "remote",
          url: "https://example.com/paper",
          path: null,
          sha256: null,
          artifact_type: null,
        },
        human_verification: {
          status: "UNVERIFIED",
          by: null,
          date: null,
          scope: null,
          blocked_reason: null,
        },
        generated_assets: [],
      },
    ],
  };
  write(path.join(root, "papers", "provenance.json"), `${JSON.stringify(document, null, 2)}\n`);
  git(root, ["add", "papers/provenance.json"]);
  return { root, document, contentCommit };
}

function codes(result) {
  return new Set(result.errors.map((error) => error.code));
}

function assertSanitized(result, root) {
  const structured = JSON.stringify(result.errors);
  const rendered = formatProvenanceRepositoryErrors(result.errors);
  assert.equal(structured.includes(root), false);
  assert.equal(structured.includes(fs.realpathSync(root)), false);
  assert.equal(structured.includes(os.tmpdir()), false);
  assert.equal(rendered.includes(root), false);
  assert.equal(rendered.includes(fs.realpathSync(root)), false);
  assert.equal(rendered.includes(os.tmpdir()), false);
  assert.doesNotMatch(rendered, /\x00|\r|fatal:|ENOENT/);
}

test("valid repository proves worktree, HEAD, manifest, and snapshot agreement", (t) => {
  const { root, document } = fixtureRepository(t);
  const result = validateProvenanceRepository({ root, document, expectedNoteCount: 2 });
  assert.equal(result.ok, true, formatProvenanceRepositoryErrors(result.errors));
  assert.deepEqual(result.stats, {
    notes: 2,
    local_sources: 1,
    remote_sources: 1,
    generated_assets: 1,
    checked_paths: 4,
  });
  assert.equal(validateProvenanceRepositoryFile({ root, expectedNoteCount: 2 }).ok, true);
});

test("production check boots the provenance gate before any note-loading import", () => {
  const source = fs.readFileSync(new URL("../check.mjs", import.meta.url), "utf8");
  const gateCall = source.indexOf("const provenance = validateProvenanceRepositoryFile");
  const guardedImport = source.indexOf('await import("./lib/views/aggregates.mjs")');
  const directInventory = source.indexOf("fs.readdirSync(NOTES)");
  assert.ok(gateCall !== -1 && gateCall < guardedImport && guardedImport < directInventory);
  assert.match(source.slice(gateCall, guardedImport), /if \(!provenance\.ok\)[\s\S]*process\.exit\(1\)/);
  assert.doesNotMatch(source, /^import .*views\/aggregates\.mjs/m);
});

test("shape, inventory, hash, and deterministic order mutations fail closed", async (t) => {
  const { root, document } = fixtureRepository(t);
  const mutations = [
    ["unknown exact version", (candidate) => { candidate.schema_version = "2.1.0"; }, "UNSUPPORTED_SCHEMA_VERSION"],
    ["deleted record", (candidate) => { candidate.notes.splice(1, 1); }, "INVENTORY_NOTE_MISSING"],
    ["orphan record", (candidate) => {
      const orphan = structuredClone(candidate.notes[1]);
      orphan.slug = "phantom";
      orphan.note_path = "notes/phantom.md";
      candidate.notes.push(orphan);
    }, "INVENTORY_NOTE_ORPHAN"],
    ["duplicate slug", (candidate) => { candidate.notes.push(structuredClone(candidate.notes[0])); }, "DUPLICATE_SLUG"],
    ["note hash", (candidate) => { candidate.notes[0].note_sha256 = ZERO_SHA256; }, "NOTE_HASH_MISMATCH"],
    ["source hash", (candidate) => { candidate.notes[0].source.sha256 = ZERO_SHA256; }, "SOURCE_HASH_MISMATCH"],
    ["asset hash", (candidate) => { candidate.notes[0].generated_assets[0].sha256 = ZERO_SHA256; }, "ASSET_HASH_MISMATCH"],
    ["log injection path", (candidate) => {
      const asset = candidate.notes[0].generated_assets[0];
      asset.kind = "extracted-figure";
      asset.path = "papers/demo-local/images/evil\n[FORGED].png";
    }, "INVALID_REPOSITORY_PATH"],
    ["unicode log injection path", (candidate) => {
      const asset = candidate.notes[0].generated_assets[0];
      asset.kind = "extracted-figure";
      asset.path = "papers/demo-local/images/evil\u2028[FORGED].png";
    }, "INVALID_REPOSITORY_PATH"],
    ["record order", (candidate) => { candidate.notes.reverse(); }, "NON_DETERMINISTIC_ORDER"],
  ];
  for (const [name, mutate, expectedCode] of mutations) {
    await t.test(name, () => {
      const candidate = structuredClone(document);
      mutate(candidate);
      const result = validateProvenanceRepository({ root, document: candidate, expectedNoteCount: 2 });
      assert.equal(result.ok, false);
      assert.ok(codes(result).has(expectedCode), formatProvenanceRepositoryErrors(result.errors));
      assertSanitized(result, root);
    });
  }
});

test("current content drift and frontmatter source drift fail independently", async (t) => {
  await t.test("current note bytes", (st) => {
    const { root, document } = fixtureRepository(st);
    fs.appendFileSync(path.join(root, "notes", "demo-remote.md"), "changed\n");
    const result = validateProvenanceRepository({ root, document, expectedNoteCount: 2 });
    assert.ok(codes(result).has("NOTE_HASH_MISMATCH"));
    assertSanitized(result, root);
  });
  await t.test("frontmatter locator", (st) => {
    const { root, document } = fixtureRepository(st);
    const notePath = path.join(root, "notes", "demo-remote.md");
    const changed = fs.readFileSync(notePath, "utf8").replace("https://example.com/paper", "https://example.com/other");
    fs.writeFileSync(notePath, changed);
    const candidate = structuredClone(document);
    candidate.notes[1].note_sha256 = sha256(changed);
    const result = validateProvenanceRepository({ root, document: candidate, expectedNoteCount: 2 });
    assert.ok(codes(result).has("SOURCE_LOCATOR_MISMATCH"));
    assertSanitized(result, root);
  });
});

test("snapshot drift fails even when current bytes and manifest agree", (t) => {
  const { root, document } = fixtureRepository(t);
  const notePath = path.join(root, "notes", "demo-remote.md");
  fs.appendFileSync(notePath, "changed after snapshot\n");
  const candidate = structuredClone(document);
  candidate.notes[1].note_sha256 = sha256(fs.readFileSync(notePath));
  const result = validateProvenanceRepository({ root, document: candidate, expectedNoteCount: 2 });
  assert.equal(result.phases.current.ok, true, formatProvenanceRepositoryErrors(result.errors));
  assert.ok(codes(result).has("SNAPSHOT_HASH_MISMATCH"));
  assertSanitized(result, root);
});

test("intermediate and final symlinks fail even when target bytes match", async (t) => {
  await t.test("intermediate directory", (st) => {
    const { root, document } = fixtureRepository(st);
    const original = path.join(root, "papers", "demo-local");
    const holding = path.join(root, "papers", "holding");
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "eai-provenance-outside-"));
    const outsidePaper = path.join(outside, "paper.md");
    fs.writeFileSync(outsidePaper, "must not be read\n");
    fs.chmodSync(outsidePaper, 0o000);
    st.after(() => {
      fs.chmodSync(outsidePaper, 0o600);
      fs.rmSync(outside, { recursive: true, force: true, maxRetries: 3, retryDelay: 20 });
    });
    fs.renameSync(original, holding);
    fs.symlinkSync(outside, original);
    const result = validateProvenanceRepository({ root, document, expectedNoteCount: 2 });
    assert.ok(codes(result).has("INTERMEDIATE_SYMLINK"));
    assertSanitized(result, root);
  });
  await t.test("final file", (st) => {
    const { root, document } = fixtureRepository(st);
    const original = path.join(root, "papers", "demo-local", "paper.md");
    const holding = path.join(root, "papers", "demo-local", "holding.md");
    fs.renameSync(original, holding);
    fs.symlinkSync("holding.md", original);
    const result = validateProvenanceRepository({ root, document, expectedNoteCount: 2 });
    assert.ok(codes(result).has("PATH_SYMLINK"));
    assertSanitized(result, root);
  });
});

test("notes inventory symlink is rejected before any external directory enumeration", (t) => {
  const { root, document } = fixtureRepository(t);
  const original = path.join(root, "notes");
  const holding = path.join(root, "holding-notes");
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "eai-notes-outside-"));
  fs.writeFileSync(path.join(outside, "outside-only.md"), "must not be enumerated\n");
  t.after(() => fs.rmSync(outside, { recursive: true, force: true, maxRetries: 3, retryDelay: 20 }));
  fs.renameSync(original, holding);
  fs.symlinkSync(outside, original);
  let readdirCalls = 0;
  const observedFs = new Proxy(fs, {
    get(value, property) {
      if (property === "readdirSync") {
        return (...args) => {
          readdirCalls += 1;
          return Reflect.apply(value.readdirSync, value, args);
        };
      }
      return Reflect.get(value, property);
    },
  });
  const result = validateProvenanceRepository({
    root,
    document,
    expectedNoteCount: 2,
    fsImpl: observedFs,
  });
  assert.ok(codes(result).has("INTERMEDIATE_SYMLINK"));
  assert.equal(readdirCalls, 0);
  assert.equal(result.errors.some((error) => error.repo_path === "notes/outside-only.md"), false);
  assertSanitized(result, root);
});

test("content commit must exist, be a commit object, and be an ancestor", async (t) => {
  await t.test("missing object", (st) => {
    const { root, document } = fixtureRepository(st);
    const candidate = structuredClone(document);
    candidate.content_commit = "f".repeat(40);
    candidate.notes[0].generated_assets[0].content_commit = candidate.content_commit;
    const result = validateProvenanceRepository({ root, document: candidate, expectedNoteCount: 2 });
    assert.ok(codes(result).has("CONTENT_COMMIT_NOT_FOUND"));
    assertSanitized(result, root);
  });
  await t.test("blob object", (st) => {
    const { root, document } = fixtureRepository(st);
    const blob = git(root, ["hash-object", "notes/demo-local.md"]);
    const candidate = structuredClone(document);
    candidate.content_commit = blob;
    candidate.notes[0].generated_assets[0].content_commit = blob;
    const result = validateProvenanceRepository({ root, document: candidate, expectedNoteCount: 2 });
    assert.ok(codes(result).has("CONTENT_COMMIT_NOT_COMMIT"));
    assertSanitized(result, root);
  });
  await t.test("non-ancestor commit", (st) => {
    const { root, document } = fixtureRepository(st);
    const emptyTree = git(root, ["mktree"], { input: "" });
    const orphan = git(root, ["commit-tree", emptyTree, "-m", "orphan"]);
    const candidate = structuredClone(document);
    candidate.content_commit = orphan;
    candidate.notes[0].generated_assets[0].content_commit = orphan;
    const result = validateProvenanceRepository({ root, document: candidate, expectedNoteCount: 2 });
    assert.ok(codes(result).has("CONTENT_COMMIT_NOT_ANCESTOR"));
    assertSanitized(result, root);
  });
});

test("declared generated assets must remain tracked regular files", (t) => {
  const { root, document } = fixtureRepository(t);
  git(root, ["rm", "--cached", "site/src/images/cards/demo-local.webp"]);
  const result = validateProvenanceRepository({ root, document, expectedNoteCount: 2 });
  assert.ok(codes(result).has("PATH_NOT_TRACKED"));
  assertSanitized(result, root);
});

test("index bytes, modes, and merge stages must match the verified trees", async (t) => {
  await t.test("staged bytes with restored worktree", (st) => {
    const { root, document } = fixtureRepository(st);
    const notePath = path.join(root, "notes", "demo-remote.md");
    const original = fs.readFileSync(notePath);
    fs.appendFileSync(notePath, "staged attack\n");
    git(root, ["add", "notes/demo-remote.md"]);
    fs.writeFileSync(notePath, original);
    const result = validateProvenanceRepository({ root, document, expectedNoteCount: 2 });
    assert.ok(codes(result).has("INDEX_BLOB_MISMATCH"));
    assert.equal(result.phases.snapshot.ok, true, formatProvenanceRepositoryErrors(result.errors));
    assertSanitized(result, root);
  });
  await t.test("staged symlink with restored regular file", (st) => {
    const { root, document } = fixtureRepository(st);
    const sourcePath = path.join(root, "papers", "demo-local", "paper.md");
    const original = fs.readFileSync(sourcePath);
    const holding = path.join(root, "papers", "demo-local", "paper-target.md");
    fs.writeFileSync(holding, original);
    fs.unlinkSync(sourcePath);
    fs.symlinkSync("paper-target.md", sourcePath);
    git(root, ["add", "papers/demo-local/paper.md"]);
    fs.unlinkSync(sourcePath);
    fs.writeFileSync(sourcePath, original);
    const result = validateProvenanceRepository({ root, document, expectedNoteCount: 2 });
    assert.ok(codes(result).has("INDEX_PATH_NOT_REGULAR"));
    assertSanitized(result, root);
  });
  await t.test("unmerged index stages", (st) => {
    const { root, document } = fixtureRepository(st);
    const repoPath = "notes/demo-remote.md";
    const originalOid = git(root, ["rev-parse", `HEAD:${repoPath}`]);
    const attackOid = git(root, ["hash-object", "-w", "--stdin"], { input: "unmerged attack\n" });
    git(root, ["update-index", "--force-remove", repoPath]);
    git(root, ["update-index", "--index-info"], {
      input: [
        `100644 ${originalOid} 1\t${repoPath}`,
        `100644 ${attackOid} 2\t${repoPath}`,
        `100644 ${originalOid} 3\t${repoPath}`,
        "",
      ].join("\n"),
    });
    const result = validateProvenanceRepository({ root, document, expectedNoteCount: 2 });
    assert.ok(codes(result).has("INDEX_UNMERGED"));
    assertSanitized(result, root);
  });
});

test("missing generated asset fails with a stable repository-relative error", (t) => {
  const { root, document } = fixtureRepository(t);
  fs.unlinkSync(path.join(root, "site", "src", "images", "cards", "demo-local.webp"));
  const result = validateProvenanceRepository({ root, document, expectedNoteCount: 2 });
  assert.ok(codes(result).has("PATH_MISSING"));
  assertSanitized(result, root);
});

test("canonical manifest index state cannot differ from the validated worktree", async (t) => {
  await t.test("untracked manifest", (st) => {
    const { root } = fixtureRepository(st);
    git(root, ["rm", "--cached", "papers/provenance.json"]);
    const result = validateProvenanceRepositoryFile({ root, expectedNoteCount: 2 });
    assert.ok(codes(result).has("MANIFEST_NOT_TRACKED"));
    assertSanitized(result, root);
  });
  await t.test("unstaged but schema-valid manifest change", (st) => {
    const { root } = fixtureRepository(st);
    const manifestPath = path.join(root, "papers", "provenance.json");
    const changed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    changed.notes[1].human_verification = {
      status: "VERIFIED",
      by: "reviewer",
      date: "2026-07-11",
      scope: "note-and-source",
      blocked_reason: null,
    };
    fs.writeFileSync(manifestPath, `${JSON.stringify(changed, null, 2)}\n`);
    const result = validateProvenanceRepositoryFile({ root, expectedNoteCount: 2 });
    assert.ok(codes(result).has("MANIFEST_INDEX_BLOB_MISMATCH"));
    assertSanitized(result, root);
  });
  await t.test("staged malicious manifest with restored worktree", (st) => {
    const { root } = fixtureRepository(st);
    const manifestPath = path.join(root, "papers", "provenance.json");
    const original = fs.readFileSync(manifestPath);
    const malicious = JSON.parse(original.toString("utf8"));
    malicious.schema_version = "3.0.0";
    fs.writeFileSync(manifestPath, `${JSON.stringify(malicious, null, 2)}\n`);
    git(root, ["add", "papers/provenance.json"]);
    fs.writeFileSync(manifestPath, original);
    const result = validateProvenanceRepositoryFile({ root, expectedNoteCount: 2 });
    assert.ok(codes(result).has("MANIFEST_INDEX_BLOB_MISMATCH"));
    assertSanitized(result, root);
  });
  await t.test("staged manifest symlink with restored regular file", (st) => {
    const { root } = fixtureRepository(st);
    const manifestPath = path.join(root, "papers", "provenance.json");
    const original = fs.readFileSync(manifestPath);
    const holding = path.join(root, "papers", "manifest-target.json");
    fs.writeFileSync(holding, original);
    fs.unlinkSync(manifestPath);
    fs.symlinkSync("manifest-target.json", manifestPath);
    git(root, ["add", "papers/provenance.json"]);
    fs.unlinkSync(manifestPath);
    fs.writeFileSync(manifestPath, original);
    const result = validateProvenanceRepositoryFile({ root, expectedNoteCount: 2 });
    assert.ok(codes(result).has("MANIFEST_INDEX_NOT_REGULAR"));
    assertSanitized(result, root);
  });
  await t.test("unmerged manifest index", (st) => {
    const { root } = fixtureRepository(st);
    const repoPath = "papers/provenance.json";
    const original = fs.readFileSync(path.join(root, repoPath));
    const originalOid = git(root, ["hash-object", "-w", "--stdin"], { input: original });
    const attackOid = git(root, ["hash-object", "-w", "--stdin"], { input: "manifest attack\n" });
    git(root, ["update-index", "--force-remove", repoPath]);
    git(root, ["update-index", "--index-info"], {
      input: [
        `100644 ${originalOid} 1\t${repoPath}`,
        `100644 ${attackOid} 2\t${repoPath}`,
        `100644 ${originalOid} 3\t${repoPath}`,
        "",
      ].join("\n"),
    });
    const result = validateProvenanceRepositoryFile({ root, expectedNoteCount: 2 });
    assert.ok(codes(result).has("MANIFEST_INDEX_UNMERGED"));
    assertSanitized(result, root);
  });
});

test("manifest read failures are structured and never expose local paths", async (t) => {
  await t.test("malformed JSON", (st) => {
    const { root } = fixtureRepository(st);
    fs.writeFileSync(path.join(root, "papers", "provenance.json"), "{ invalid\n");
    const result = validateProvenanceRepositoryFile({ root, expectedNoteCount: 2 });
    assert.ok(codes(result).has("MANIFEST_JSON_INVALID"));
    assertSanitized(result, root);
  });
  await t.test("manifest symlink", (st) => {
    const { root } = fixtureRepository(st);
    const manifest = path.join(root, "papers", "provenance.json");
    const holding = path.join(root, "papers", "holding-provenance.json");
    fs.renameSync(manifest, holding);
    fs.symlinkSync("holding-provenance.json", manifest);
    const result = validateProvenanceRepositoryFile({ root, expectedNoteCount: 2 });
    assert.ok(codes(result).has("PATH_SYMLINK"));
    assertSanitized(result, root);
  });
});

test("raw Git dependency failures never reach structured errors or formatted logs", async (t) => {
  await t.test("exec failure", (st) => {
    const { root, document } = fixtureRepository(st);
    const result = validateProvenanceRepository({
      root,
      document,
      expectedNoteCount: 2,
      execFileSyncImpl: () => { throw new Error(`/secret/git-root fatal: ${root}`); },
    });
    assert.ok(codes(result).has("GIT_ROOT_UNAVAILABLE"));
    assertSanitized(result, root);
  });
  await t.test("blob batch failure", (st) => {
    const { root, document } = fixtureRepository(st);
    const result = validateProvenanceRepository({
      root,
      document,
      expectedNoteCount: 2,
      spawnSyncImpl: () => ({
        error: new Error(`/secret/blob-root ${root}`),
        status: null,
        stdout: null,
        stderr: Buffer.from("fatal: secret"),
      }),
    });
    assert.ok(codes(result).has("SNAPSHOT_BLOB_READ_FAILED"));
    assertSanitized(result, root);
  });
  await t.test("blob batch trailing output", (st) => {
    const { root, document } = fixtureRepository(st);
    const result = validateProvenanceRepository({
      root,
      document,
      expectedNoteCount: 2,
      spawnSyncImpl: (...args) => {
        const response = spawnSync(...args);
        return { ...response, stdout: Buffer.concat([response.stdout, Buffer.from("trailing")]) };
      },
    });
    assert.ok(codes(result).has("SNAPSHOT_BLOB_READ_FAILED"));
    assertSanitized(result, root);
  });
  await t.test("blob batch header with extra fields", (st) => {
    const { root, document } = fixtureRepository(st);
    const result = validateProvenanceRepository({
      root,
      document,
      expectedNoteCount: 2,
      spawnSyncImpl: (...args) => {
        const response = spawnSync(...args);
        const newline = response.stdout.indexOf(0x0a);
        return {
          ...response,
          stdout: Buffer.concat([
            response.stdout.subarray(0, newline),
            Buffer.from(" extra"),
            response.stdout.subarray(newline),
          ]),
        };
      },
    });
    assert.ok(codes(result).has("SNAPSHOT_BLOB_READ_FAILED"));
    assertSanitized(result, root);
  });
});
