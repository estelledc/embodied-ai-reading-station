import fs from "node:fs";
import path from "node:path";
import { execFileSync as defaultExecFileSync } from "node:child_process";

import {
  PROVENANCE_FIELD_DICTIONARY,
  PROVENANCE_SCHEMA_VERSION,
} from "./provenance-schema.mjs";

export const LICENSE_POLICY_ID = "EAI-LICENSE-MAP-1.0.0";
export const PROVENANCE_POLICY_ID = `EAI-PROVENANCE-${PROVENANCE_SCHEMA_VERSION}`;
export const GOVERNANCE_BINARY_BASELINE_COMMIT = "5b02c23a3184cc2c2857fd5b6383780714a2f502";

const GOVERNANCE_SOURCE_DOCUMENTS = Object.freeze({
  license: "LICENSE",
  notice: "NOTICE.md",
  provenance: "PROVENANCE.md",
});

const GOVERNANCE_PUBLIC_DOCUMENTS = Object.freeze({
  license: "/governance/LICENSE",
  notice: "/governance/NOTICE.md",
  provenance: "/governance/PROVENANCE.md",
});

const BINARY_EXTENSIONS = new Set([
  ".ai", ".avif", ".bmp", ".eps", ".gif", ".gz", ".ico", ".jpeg", ".jpg",
  ".mov", ".mp3", ".mp4", ".otf", ".pdf", ".png", ".ps", ".svg", ".tar",
  ".tif", ".tiff", ".ttf", ".wav", ".webm", ".webp", ".woff", ".woff2", ".zip",
]);
const REGULAR_GIT_MODES = new Set(["100644", "100755"]);

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const GOVERNANCE_CONTRACT = deepFreeze({
  source_documents: GOVERNANCE_SOURCE_DOCUMENTS,
  public_documents: GOVERNANCE_PUBLIC_DOCUMENTS,
  provenance_endpoint: "/data/v2/provenance.json",
  license_fields: ["policy_id", "asset_classes", "document", "notice"],
  asset_class_fields: [
    "id",
    "license_expression",
    "reference_url",
    "project_license_declared",
    "provenance_fields",
  ],
  provenance_fields: ["policy_id", "schema_version", "endpoint", "policy"],
  asset_classes: [
    {
      id: "project-code",
      license_expression: "MIT",
      reference_url: "https://opensource.org/license/mit",
      project_license_declared: true,
      provenance_fields: [],
    },
    {
      id: "project-notes",
      license_expression: "CC-BY-4.0",
      reference_url: "https://creativecommons.org/licenses/by/4.0/",
      project_license_declared: true,
      provenance_fields: ["notes[].note_path", "notes[].note_sha256"],
    },
    {
      id: "project-generated-images",
      license_expression: "CC-BY-4.0",
      reference_url: "https://creativecommons.org/licenses/by/4.0/",
      project_license_declared: true,
      provenance_fields: [],
    },
    {
      id: "third-party-paper-materials",
      license_expression: "NOASSERTION",
      reference_url: "https://spdx.github.io/spdx-spec/v2.3/package-information/",
      project_license_declared: false,
      provenance_fields: ["notes[].source", "notes[].generated_assets"],
    },
  ],
});

export function buildGovernanceReferences({ route = value => value } = {}) {
  if (typeof route !== "function") throw new TypeError("governance route must be a function");
  return {
    license: {
      policy_id: LICENSE_POLICY_ID,
      asset_classes: GOVERNANCE_CONTRACT.asset_classes.map(assetClass => ({
        ...assetClass,
        provenance_fields: [...assetClass.provenance_fields],
      })),
      document: route(GOVERNANCE_PUBLIC_DOCUMENTS.license),
      notice: route(GOVERNANCE_PUBLIC_DOCUMENTS.notice),
    },
    provenance: {
      policy_id: PROVENANCE_POLICY_ID,
      schema_version: PROVENANCE_SCHEMA_VERSION,
      endpoint: route(GOVERNANCE_CONTRACT.provenance_endpoint),
      policy: route(GOVERNANCE_PUBLIC_DOCUMENTS.provenance),
    },
  };
}

function decodeUtf8(bytes) {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function isSafeRelativePath(value) {
  if (typeof value !== "string"
    || !value
    || value.includes("\\")
    || value.includes(":")
    || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(value)
    || value.startsWith("/")) return false;
  const segments = value.split("/");
  return segments.every(segment => segment && segment !== "." && segment !== "..")
    && path.posix.normalize(value) === value;
}

function markdownLinks(text) {
  return [...text.matchAll(/\]\(([^)\s]+)(?:\s+[^)]*)?\)/g)].map(match => match[1]);
}

export function validateGovernanceDocuments({ root, fsImpl = fs } = {}) {
  const errors = [];
  const documents = new Map();
  let rootReal;
  try {
    rootReal = fsImpl.realpathSync(root);
  } catch {
    return { ok: false, errors: ["repository root cannot be resolved"] };
  }

  for (const repoPath of Object.values(GOVERNANCE_SOURCE_DOCUMENTS)) {
    const absolute = path.join(rootReal, repoPath);
    let stat;
    let bytes;
    try {
      stat = fsImpl.lstatSync(absolute);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("not a regular file");
      bytes = fsImpl.readFileSync(absolute);
    } catch {
      errors.push(`${repoPath} must be a readable regular file`);
      continue;
    }
    if (bytes.length < 32) {
      errors.push(`${repoPath} must not be empty`);
      continue;
    }
    let text;
    try {
      text = decodeUtf8(bytes);
    } catch {
      errors.push(`${repoPath} must be valid UTF-8 text`);
      continue;
    }
    if (text.includes("\0") || /\bdata:[^\s,]+,/i.test(text)) {
      errors.push(`${repoPath} must not embed binary data`);
    }
    if (/(?:^|[\s("'`])\/(?:Users|home)\/|\b[A-Za-z]:\\/m.test(text)) {
      errors.push(`${repoPath} must not contain local absolute paths`);
    }
    documents.set(repoPath, text);
  }

  const relativeLinks = new Map();
  for (const repoPath of [GOVERNANCE_SOURCE_DOCUMENTS.notice, GOVERNANCE_SOURCE_DOCUMENTS.provenance]) {
    const text = documents.get(repoPath);
    if (!text) continue;
    const documentLinks = new Set();
    relativeLinks.set(repoPath, documentLinks);
    for (const link of markdownLinks(text)) {
      if (/^(?:https?:|mailto:|#)/i.test(link)) continue;
      const clean = link.split(/[?#]/, 1)[0];
      if (!isSafeRelativePath(clean)) {
        errors.push(`${repoPath} has unsafe relative link: ${link}`);
        continue;
      }
      documentLinks.add(path.posix.join(path.posix.dirname(repoPath), clean));
      const target = path.join(path.dirname(path.join(rootReal, repoPath)), clean);
      try {
        const targetReal = fsImpl.realpathSync(target);
        const targetStat = fsImpl.lstatSync(target);
        if (!targetStat.isFile() || targetStat.isSymbolicLink()) throw new Error("not a regular file");
        if (targetReal !== rootReal && !targetReal.startsWith(`${rootReal}${path.sep}`)) {
          throw new Error("outside root");
        }
      } catch {
        errors.push(`${repoPath} has missing relative link: ${link}`);
      }
    }
  }
  for (const [repoPath, requiredTargets] of [
    [GOVERNANCE_SOURCE_DOCUMENTS.notice, [
      GOVERNANCE_SOURCE_DOCUMENTS.license,
      GOVERNANCE_SOURCE_DOCUMENTS.provenance,
    ]],
    [GOVERNANCE_SOURCE_DOCUMENTS.provenance, [
      GOVERNANCE_SOURCE_DOCUMENTS.license,
      GOVERNANCE_SOURCE_DOCUMENTS.notice,
    ]],
  ]) {
    const observed = relativeLinks.get(repoPath);
    if (!observed) continue;
    for (const requiredTarget of requiredTargets) {
      if (!observed.has(requiredTarget)) {
        errors.push(`${repoPath} must link to ${requiredTarget}`);
      }
    }
  }

  for (const repoPath of [GOVERNANCE_SOURCE_DOCUMENTS.notice, GOVERNANCE_SOURCE_DOCUMENTS.provenance]) {
    const text = documents.get(repoPath);
    if (!text) continue;
    const mapping = validateGovernanceSurfaceMappings(text);
    for (const error of mapping.errors) errors.push(`${repoPath}: ${error}`);
  }
  const licenseText = documents.get(GOVERNANCE_SOURCE_DOCUMENTS.license);
  if (licenseText
    && (!licenseText.includes("project-code") || !licenseText.includes(GOVERNANCE_SOURCE_DOCUMENTS.notice))) {
    errors.push("LICENSE must scope MIT terms to project-code and point to NOTICE.md");
  }

  return { ok: errors.length === 0, errors };
}

export function looksLikeBinary(repoPath, bytes) {
  if (BINARY_EXTENSIONS.has(path.extname(repoPath).toLowerCase())) return true;
  const payload = Buffer.from(bytes);
  const head = payload.subarray(0, 8192);
  if (payload.includes(0)) return true;
  let decoded;
  try {
    decoded = decodeUtf8(payload);
  } catch {
    return true;
  }
  if (/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(decoded)) return true;
  const ascii = head.toString("latin1");
  return head.subarray(0, 1024).indexOf(Buffer.from("%PDF-")) >= 0
    || ascii.startsWith("GIF87a")
    || ascii.startsWith("GIF89a")
    || (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP")
    || (head.length >= 4 && head[0] === 0x89 && ascii.slice(1, 4) === "PNG")
    || (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff)
    || (head.length >= 4 && head[0] === 0x50 && head[1] === 0x4b && [0x03, 0x05, 0x07].includes(head[2]))
    || (head.length >= 12 && ascii.slice(4, 8) === "ftyp" && /^(?:avif|avis)$/.test(ascii.slice(8, 12)));
}

export function evaluateBinaryDelta({ root, changedPaths, fsImpl = fs } = {}) {
  const errors = [];
  const binaryPaths = [];
  for (const repoPath of [...new Set(changedPaths ?? [])].sort()) {
    if (!isSafeRelativePath(repoPath)) {
      errors.push(`unsafe changed path: ${String(repoPath)}`);
      continue;
    }
    const absolute = path.join(root, repoPath);
    if (!fsImpl.existsSync(absolute)) {
      errors.push(`non-deleted changed path is missing from the worktree: ${repoPath}`);
      continue;
    }
    let bytes;
    try {
      const stat = fsImpl.lstatSync(absolute);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("not regular");
      bytes = fsImpl.readFileSync(absolute);
    } catch {
      errors.push(`changed path must be a readable regular file: ${repoPath}`);
      continue;
    }
    if (!looksLikeBinary(repoPath, bytes)) continue;
    binaryPaths.push(repoPath);
    if (repoPath.startsWith("papers/")) {
      errors.push(`third-party paper binary changed after governance baseline: ${repoPath}`);
      continue;
    }
    if (repoPath.startsWith("site/src/images/inline/") || repoPath.startsWith("site/src/images/cards/")) {
      continue;
    }
    errors.push(`binary changes are forbidden until a reviewed rights discriminator exists: ${repoPath}`);
  }
  return { ok: errors.length === 0, errors, binary_paths: binaryPaths };
}

function evaluateBinarySnapshots(snapshots) {
  const errors = [];
  const binaryPaths = [];
  for (const { repoPath, bytes, state } of snapshots) {
    if (!isSafeRelativePath(repoPath)) {
      errors.push(`unsafe ${state} path: ${String(repoPath)}`);
      continue;
    }
    if (!looksLikeBinary(repoPath, bytes)) continue;
    binaryPaths.push(repoPath);
    if (repoPath.startsWith("papers/")) {
      errors.push(`third-party paper binary changed in ${state} after governance baseline: ${repoPath}`);
    } else if (repoPath.startsWith("site/src/images/inline/") || repoPath.startsWith("site/src/images/cards/")) {
      continue;
    } else {
      errors.push(`binary change in ${state} is forbidden until a reviewed rights discriminator exists: ${repoPath}`);
    }
  }
  return {
    ok: errors.length === 0,
    errors,
    binary_paths: [...new Set(binaryPaths)].sort(),
  };
}

function gitEnvironment(environment) {
  const env = Object.fromEntries(
    Object.entries(environment).filter(([name]) => !name.startsWith("GIT_")),
  );
  return {
    ...env,
    GIT_TRACE2: "0",
    GIT_TRACE2_EVENT: "0",
    GIT_TRACE2_PERF: "0",
  };
}

export function validateGovernanceBinaryDelta({
  root,
  baselineCommit = GOVERNANCE_BINARY_BASELINE_COMMIT,
  executor = defaultExecFileSync,
  environment = process.env,
  fsImpl = fs,
} = {}) {
  if (!/^[a-f0-9]{40}$/.test(baselineCommit ?? "")) {
    return { ok: false, errors: ["governance binary baseline must be a full commit SHA"], binary_paths: [] };
  }
  const options = {
    cwd: root,
    env: gitEnvironment(environment),
    stdio: ["ignore", "pipe", "pipe"],
  };
  const textOptions = { ...options, encoding: "utf8" };
  const bufferOptions = { ...options, encoding: null };
  let headPaths;
  let indexPaths;
  let worktreePaths;
  let untracked;
  try {
    executor("git", ["cat-file", "-e", `${baselineCommit}^{commit}`], textOptions);
    executor("git", ["merge-base", "--is-ancestor", baselineCommit, "HEAD"], textOptions);
    headPaths = executor(
      "git",
      ["diff", "--name-only", "-z", "--diff-filter=ACMRTUXB", baselineCommit, "HEAD", "--"],
      textOptions,
    );
    indexPaths = executor(
      "git",
      ["diff", "--cached", "--name-only", "-z", "--diff-filter=ACMRTUXB", baselineCommit, "--"],
      textOptions,
    );
    worktreePaths = executor(
      "git",
      ["diff", "--name-only", "-z", "--diff-filter=ACMRTUXB", baselineCommit, "--"],
      textOptions,
    );
    untracked = executor(
      "git",
      ["ls-files", "-z", "--others", "--exclude-standard"],
      textOptions,
    );
  } catch {
    return { ok: false, errors: ["governance binary baseline must exist and be an ancestor of HEAD"], binary_paths: [] };
  }

  const parsePaths = output => String(output).split("\0").filter(Boolean);
  const parseHeadEntry = (output, expectedPath) => {
    const entries = String(output).split("\0").filter(Boolean);
    if (entries.length !== 1) throw new Error("HEAD entry missing or ambiguous");
    const match = entries[0].match(/^([0-7]{6}) (blob) ([a-f0-9]{40,64})\t(.+)$/);
    if (!match || match[4] !== expectedPath || !REGULAR_GIT_MODES.has(match[1])) {
      throw new Error("HEAD entry is not a regular blob");
    }
    return match[3];
  };
  const parseIndexEntry = (output, expectedPath) => {
    const entries = String(output).split("\0").filter(Boolean);
    if (entries.length !== 1) throw new Error("index entry missing or unmerged");
    const match = entries[0].match(/^([0-7]{6}) ([a-f0-9]{40,64}) ([0-3])\t(.+)$/);
    if (!match
      || match[3] !== "0"
      || match[4] !== expectedPath
      || !REGULAR_GIT_MODES.has(match[1])) {
      throw new Error("index entry is not a stage-0 regular blob");
    }
    return match[2];
  };
  const snapshots = [];
  try {
    for (const repoPath of parsePaths(headPaths)) {
      if (!isSafeRelativePath(repoPath)) throw new Error("unsafe HEAD path");
      const oid = parseHeadEntry(
        executor("git", ["ls-tree", "-z", "HEAD", "--", repoPath], textOptions),
        repoPath,
      );
      snapshots.push({
        repoPath,
        state: "HEAD",
        bytes: executor("git", ["cat-file", "blob", oid], bufferOptions),
      });
    }
    for (const repoPath of parsePaths(indexPaths)) {
      if (!isSafeRelativePath(repoPath)) throw new Error("unsafe index path");
      const oid = parseIndexEntry(
        executor("git", ["ls-files", "--stage", "-z", "--", repoPath], textOptions),
        repoPath,
      );
      snapshots.push({
        repoPath,
        state: "index",
        bytes: executor("git", ["cat-file", "blob", oid], bufferOptions),
      });
    }
  } catch {
    return { ok: false, errors: ["changed HEAD/index entries must be stage-0 regular blobs with readable bytes"], binary_paths: [] };
  }

  const worktree = evaluateBinaryDelta({
    root,
    changedPaths: [...parsePaths(worktreePaths), ...parsePaths(untracked)],
    fsImpl,
  });
  const gitSnapshots = evaluateBinarySnapshots(snapshots);
  return {
    ok: worktree.ok && gitSnapshots.ok,
    errors: [...gitSnapshots.errors, ...worktree.errors],
    binary_paths: [...new Set([
      ...gitSnapshots.binary_paths,
      ...worktree.binary_paths,
    ])].sort(),
  };
}

export function validateGovernanceFieldBindings() {
  const errors = [];
  for (const assetClass of GOVERNANCE_CONTRACT.asset_classes) {
    for (const fieldName of assetClass.provenance_fields) {
      if (!Object.hasOwn(PROVENANCE_FIELD_DICTIONARY, fieldName)) {
        errors.push(`${assetClass.id} references unknown provenance field ${fieldName}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function validateGovernanceSurfaceMappings(text) {
  const errors = [];
  if (typeof text !== "string") {
    return { ok: false, errors: ["governance surface must be text"] };
  }
  for (const policyId of [LICENSE_POLICY_ID, PROVENANCE_POLICY_ID]) {
    if (!text.includes(policyId)) errors.push(`governance surface must name ${policyId}`);
  }
  for (const assetClass of GOVERNANCE_CONTRACT.asset_classes) {
    const sameLine = new RegExp(
      `${escapeRegExp(assetClass.id)}[^\\n]{0,1000}${escapeRegExp(assetClass.license_expression)}`,
    );
    if (!sameLine.test(text)) {
      errors.push(`governance surface must pair ${assetClass.id} with ${assetClass.license_expression}`);
    }
  }
  return { ok: errors.length === 0, errors };
}
