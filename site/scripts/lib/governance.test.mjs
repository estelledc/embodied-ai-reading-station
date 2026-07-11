import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  GOVERNANCE_BINARY_BASELINE_COMMIT,
  GOVERNANCE_CONTRACT,
  LICENSE_POLICY_ID,
  PROVENANCE_POLICY_ID,
  buildGovernanceReferences,
  evaluateBinaryDelta,
  looksLikeBinary,
  validateGovernanceBinaryDelta,
  validateGovernanceDocuments,
  validateGovernanceFieldBindings,
  validateGovernanceSurfaceMappings,
} from "./governance.mjs";
import { PROVENANCE_FIELD_DICTIONARY } from "./provenance-schema.mjs";
import { buildAbout } from "./views/meta.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");

function governanceFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eai-governance-"));
  fs.writeFileSync(path.join(root, "LICENSE"), "MIT License\n\nPermission for project-code. See NOTICE.md.\n");
  fs.writeFileSync(path.join(root, "NOTICE.md"), `# Notice

[License](LICENSE) · [Provenance](PROVENANCE.md)

${LICENSE_POLICY_ID}
project-code MIT
project-notes CC-BY-4.0
project-generated-images CC-BY-4.0
third-party-paper-materials NOASSERTION
`);
  fs.writeFileSync(path.join(root, "PROVENANCE.md"), `# Provenance

[License](LICENSE) · [Notice](NOTICE.md)

${PROVENANCE_POLICY_ID}
`);
  return root;
}

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_TRACE2: "0",
      GIT_TRACE2_EVENT: "0",
      GIT_TRACE2_PERF: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

test("governance contract freezes four non-overlapping stable asset classes", () => {
  assert.equal(LICENSE_POLICY_ID, "EAI-LICENSE-MAP-1.0.0");
  assert.equal(PROVENANCE_POLICY_ID, "EAI-PROVENANCE-2.0.0");
  assert.equal(GOVERNANCE_BINARY_BASELINE_COMMIT, "5b02c23a3184cc2c2857fd5b6383780714a2f502");
  assert.deepEqual(GOVERNANCE_CONTRACT.asset_classes.map(assetClass => [
    assetClass.id,
    assetClass.license_expression,
    assetClass.project_license_declared,
  ]), [
    ["project-code", "MIT", true],
    ["project-notes", "CC-BY-4.0", true],
    ["project-generated-images", "CC-BY-4.0", true],
    ["third-party-paper-materials", "NOASSERTION", false],
  ]);
  assert.ok(Object.isFrozen(GOVERNANCE_CONTRACT));
  assert.ok(Object.isFrozen(GOVERNANCE_CONTRACT.asset_classes));
  assert.ok(Object.isFrozen(GOVERNANCE_CONTRACT.asset_classes[0]));
  assert.deepEqual(GOVERNANCE_CONTRACT.asset_classes[2].provenance_fields, []);
  assert.deepEqual(GOVERNANCE_CONTRACT.asset_classes[3].provenance_fields, [
    "notes[].source", "notes[].generated_assets",
  ]);
  assert.throws(() => { GOVERNANCE_CONTRACT.asset_classes[0].id = "drift"; }, TypeError);
});

test("governance references are base-aware clones with exact policy identities", () => {
  const first = buildGovernanceReferences({ route: value => `/repo${value}` });
  const second = buildGovernanceReferences({ route: value => value });

  assert.equal(first.license.document, "/repo/governance/LICENSE");
  assert.equal(first.license.notice, "/repo/governance/NOTICE.md");
  assert.equal(first.provenance.endpoint, "/repo/data/v2/provenance.json");
  assert.equal(first.provenance.policy, "/repo/governance/PROVENANCE.md");
  assert.equal(first.license.policy_id, LICENSE_POLICY_ID);
  assert.equal(first.provenance.policy_id, PROVENANCE_POLICY_ID);
  first.license.asset_classes[0].id = "local-mutation";
  assert.equal(second.license.asset_classes[0].id, "project-code");
  assert.throws(() => buildGovernanceReferences({ route: "not-a-function" }), /route/);
});

test("every license scope binds only known provenance v2 fields", () => {
  const result = validateGovernanceFieldBindings();
  assert.deepEqual(result, { ok: true, errors: [] });
  for (const assetClass of GOVERNANCE_CONTRACT.asset_classes) {
    for (const fieldName of assetClass.provenance_fields) {
      assert.ok(Object.hasOwn(PROVENANCE_FIELD_DICTIONARY, fieldName));
    }
  }
});

test("repository governance documents are regular UTF-8 text with valid mutual links", () => {
  assert.deepEqual(validateGovernanceDocuments({ root: ROOT }), { ok: true, errors: [] });
});

test("document validator rejects missing, symlinked, binary, local-path, and broken-link inputs", async t => {
  const cases = [
    ["missing", root => fs.rmSync(path.join(root, "LICENSE")), /LICENSE.*regular file/],
    ["symlink", root => {
      fs.renameSync(path.join(root, "LICENSE"), path.join(root, "LICENSE.real"));
      fs.symlinkSync("LICENSE.real", path.join(root, "LICENSE"));
    }, /LICENSE.*regular file/],
    ["binary", root => fs.appendFileSync(path.join(root, "NOTICE.md"), Buffer.from([0])), /embed binary/],
    ["absolute path", root => fs.appendFileSync(path.join(root, "NOTICE.md"), "\n/home/example/private\n"), /absolute paths/],
    ["broken link", root => fs.appendFileSync(path.join(root, "NOTICE.md"), "\n[Missing](missing.md)\n"), /missing relative link/],
    ["unscoped license", root => fs.writeFileSync(
      path.join(root, "LICENSE"),
      "MIT License\n\nPermission is granted for all associated documentation.\n",
    ), /scope MIT terms/],
  ];
  for (const [name, mutate, expected] of cases) {
    await t.test(name, () => {
      const root = governanceFixture();
      try {
        mutate(root);
        const result = validateGovernanceDocuments({ root });
        assert.equal(result.ok, false);
        assert.match(result.errors.join("\n"), expected);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  }
});

test("binary classifier uses extensions and magic bytes without treating plain text as binary", () => {
  assert.equal(looksLikeBinary("paper.PDF", Buffer.from("plain")), true);
  assert.equal(looksLikeBinary("asset.bin", Buffer.from("%PDF-1.7")), true);
  assert.equal(looksLikeBinary("asset.bin", Buffer.from(" \n%PDF-1.7")), true);
  assert.equal(looksLikeBinary("asset.bin", Buffer.from([0xff, 0xd8, 0xff, 0x00])), true);
  assert.equal(looksLikeBinary("opaque.dat", Buffer.alloc(256, 0xfe)), true);
  assert.equal(looksLikeBinary("control.dat", Buffer.from("text\u0001payload")), true);
  assert.equal(looksLikeBinary("late-null.dat", Buffer.concat([
    Buffer.alloc(9000, 0x41), Buffer.from([0]), Buffer.from("tail"),
  ])), true);
  assert.equal(looksLikeBinary("figure.svg", Buffer.from("<svg></svg>")), true);
  assert.equal(looksLikeBinary("NOTICE.md", Buffer.from("plain text")), false);
});

test("binary delta rejects every changed binary until a rights discriminator exists", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eai-governance-binary-"));
  try {
    const paperPath = "papers/demo/paper.pdf";
    const assetPath = "site/src/images/inline/demo-scene.webp";
    const assetBytes = Buffer.from("RIFF0000WEBPfixture");
    fs.mkdirSync(path.join(root, path.dirname(paperPath)), { recursive: true });
    fs.mkdirSync(path.join(root, path.dirname(assetPath)), { recursive: true });
    fs.writeFileSync(path.join(root, paperPath), "%PDF-1.7");
    fs.writeFileSync(path.join(root, assetPath), assetBytes);

    const result = evaluateBinaryDelta({
      root,
      changedPaths: [paperPath, assetPath],
    });
    assert.equal(result.ok, false);
    assert.deepEqual(result.binary_paths, [paperPath, assetPath]);
    assert.match(result.errors.join("\n"), /third-party paper binary changed/);
    assert.match(result.errors.join("\n"), /rights discriminator/);

    const generatedOnly = evaluateBinaryDelta({
      root,
      changedPaths: [assetPath],
    });
    assert.equal(generatedOnly.ok, false);
    assert.match(generatedOnly.errors[0], /rights discriminator/);

    assert.match(evaluateBinaryDelta({
      root,
      changedPaths: ["missing.pdf"],
    }).errors[0], /missing from the worktree/);

    const disguisedPath = "assets/renamed.dat";
    fs.mkdirSync(path.join(root, "assets"), { recursive: true });
    fs.writeFileSync(path.join(root, disguisedPath), " \n%PDF-1.7\n");
    assert.match(evaluateBinaryDelta({
      root,
      changedPaths: [disguisedPath],
    }).errors[0], /rights discriminator/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("git-backed binary gate verifies the immutable baseline and strips trace sockets", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eai-governance-git-"));
  const calls = [];
  try {
    fs.writeFileSync(path.join(root, "README.md"), "text");
    const result = validateGovernanceBinaryDelta({
      root,
      environment: { PATH: "/usr/bin:/bin", GIT_TRACE2: "/tmp/trace.sock" },
      executor(command, args, options) {
        calls.push({ command, args, options });
        if (args.includes("--name-only")) return "README.md\0";
        if (args[0] === "ls-tree") return `100644 blob ${"a".repeat(40)}\tREADME.md\0`;
        if (args[0] === "ls-files" && args.includes("--stage")) {
          return `100644 ${"a".repeat(40)} 0\tREADME.md\0`;
        }
        if (args[0] === "cat-file" && args[1] === "blob") return Buffer.from("text");
        return "";
      },
    });
    assert.deepEqual(result, { ok: true, errors: [], binary_paths: [] });
    assert.deepEqual(calls.map(call => call.args[0]), [
      "cat-file", "merge-base", "diff", "diff", "diff", "ls-files",
      "ls-tree", "cat-file", "ls-files", "cat-file",
    ]);
    for (const call of calls) {
      assert.equal(call.command, "git");
      assert.equal(call.options.env.GIT_TRACE2, "0");
      assert.equal(call.options.env.GIT_TRACE2_EVENT, "0");
      assert.equal(call.options.env.GIT_TRACE2_PERF, "0");
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("git-backed binary gate reads index and HEAD blobs even when worktree text hides them", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eai-governance-index-"));
  try {
    git(root, ["init", "-q"]);
    git(root, ["config", "user.name", "Governance Test"]);
    git(root, ["config", "user.email", "governance@example.invalid"]);
    fs.writeFileSync(path.join(root, "README.md"), "baseline\n");
    git(root, ["add", "README.md"]);
    git(root, ["commit", "-qm", "baseline"]);
    const baselineCommit = git(root, ["rev-parse", "HEAD"]);

    fs.writeFileSync(path.join(root, "payload.dat"), "%PDF-1.7\nindex bytes\n");
    git(root, ["add", "payload.dat"]);
    fs.writeFileSync(path.join(root, "payload.dat"), "plain worktree disguise\n");
    const staged = validateGovernanceBinaryDelta({ root, baselineCommit });
    assert.equal(staged.ok, false);
    assert.match(staged.errors.join("\n"), /binary change in index/);

    git(root, ["commit", "-qm", "binary head"]);
    const committed = validateGovernanceBinaryDelta({ root, baselineCommit });
    assert.equal(committed.ok, false);
    assert.match(committed.errors.join("\n"), /binary change in HEAD/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("git-backed binary gate rejects staged and committed symlink modes hidden by a regular worktree file", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eai-governance-mode-"));
  try {
    git(root, ["init", "-q"]);
    git(root, ["config", "user.name", "Governance Test"]);
    git(root, ["config", "user.email", "governance@example.invalid"]);
    fs.writeFileSync(path.join(root, "README.md"), "baseline\n");
    git(root, ["add", "README.md"]);
    git(root, ["commit", "-qm", "baseline"]);
    const baselineCommit = git(root, ["rev-parse", "HEAD"]);

    const linkPath = path.join(root, "payload-link");
    fs.symlinkSync("outside-third-party.pdf", linkPath);
    git(root, ["add", "payload-link"]);
    fs.unlinkSync(linkPath);
    fs.writeFileSync(linkPath, "plain worktree disguise\n");
    const staged = validateGovernanceBinaryDelta({ root, baselineCommit });
    assert.equal(staged.ok, false);
    assert.match(staged.errors.join("\n"), /stage-0 regular blobs/);

    git(root, ["commit", "-qm", "symlink head"]);
    const committed = validateGovernanceBinaryDelta({ root, baselineCommit });
    assert.equal(committed.ok, false);
    assert.match(committed.errors.join("\n"), /stage-0 regular blobs/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("surface validator requires each stable class and expression on the same logical row", () => {
  const valid = `
${LICENSE_POLICY_ID}
${PROVENANCE_POLICY_ID}
project-code: MIT
project-notes: CC-BY-4.0
project-generated-images: CC-BY-4.0
third-party-paper-materials: NOASSERTION
`;
  assert.deepEqual(validateGovernanceSurfaceMappings(valid), { ok: true, errors: [] });
  const swapped = valid
    .replace("project-notes: CC-BY-4.0", "project-notes: NOASSERTION")
    .replace("third-party-paper-materials: NOASSERTION", "third-party-paper-materials: CC-BY-4.0");
  const result = validateGovernanceSurfaceMappings(swapped);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /project-notes.*CC-BY-4\.0/);
  assert.match(result.errors.join("\n"), /third-party-paper-materials.*NOASSERTION/);
});

test("About renders stable policies, all four classes, and base-aware public documents", () => {
  const html = buildAbout([]);
  assert.match(html, new RegExp(LICENSE_POLICY_ID));
  assert.match(html, new RegExp(PROVENANCE_POLICY_ID.replaceAll(".", "\\.")));
  for (const assetClass of GOVERNANCE_CONTRACT.asset_classes) {
    assert.ok(html.includes(assetClass.id));
    assert.ok(html.includes(assetClass.license_expression));
  }
  assert.match(html, /href="\/governance\/LICENSE"/);
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "papers", "provenance.json"), "utf8"));
  const assetCount = manifest.notes.reduce((total, note) => total + note.generated_assets.length, 0);
  assert.match(html, new RegExp(`generated_assets<\\/code> 记录数为 <strong>${assetCount}<\\/strong>`));
});
