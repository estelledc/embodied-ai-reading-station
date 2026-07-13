import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

import {
  serializeProvenanceDocument,
} from "./provenance.mjs";
import { validateProvenanceDocument } from "./provenance-schema.mjs";
import {
  formatProvenanceRepositoryErrors,
  validateProvenanceRepository,
} from "./provenance-validator.mjs";

const SHA256_RE = /^[a-f0-9]{64}$/;
const GIT_SHA_RE = /^[a-f0-9]{40}$/;
const GENERATOR_RE = /^[a-z0-9][a-z0-9._/-]{0,127}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ASSET_KINDS = new Set(["card", "inline-scene", "inline-method", "extracted-figure"]);
const RECEIPT_VERSION = "1.0.0";
let transactionSequence = 0;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const expected = [...keys].sort();
  const actual = Object.keys(value).sort();
  if (expected.length !== actual.length || expected.some((key, index) => key !== actual[index])) {
    throw new Error(`${label} must contain exactly: ${expected.join(", ")}`);
  }
}

function canonicalize(value, label = "fingerprint input") {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((item, index) => canonicalize(item, `${label}[${index}]`));
  if (value && typeof value === "object" && !Buffer.isBuffer(value)) {
    const result = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) throw new Error(`${label}.${key} must not be undefined`);
      result[key] = canonicalize(value[key], `${label}.${key}`);
    }
    return result;
  }
  throw new Error(`${label} contains a non-canonical value`);
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || value.includes("\0")) return false;
  if (value.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  const segments = value.split("/");
  return !segments.some((segment) => !segment || segment === "." || segment === "..")
    && path.posix.normalize(value) === value;
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function firstLine(value) {
  return String(value ?? "").split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "";
}

export function formatAssetError(error, fallback = "asset operation failed") {
  const raw = typeof error?.message === "string"
    ? error.message
    : (typeof error === "string" ? error : fallback);
  const quotedPathsRedacted = raw.replace(
    /(["'`])(?:file:\/\/\/|~[\\/]|(?:[a-zA-Z]:)?[\\/])[^"'`\r\n]*\1/g,
    "$1<local-path>$1",
  );
  const pathsRedacted = quotedPathsRedacted.replace(
    /(^|[\s(=:[{,])(?:file:\/\/\/|~[\\/]|(?:[a-zA-Z]:)?[\\/])[^\s"'`<>|]+/g,
    "$1<local-path>",
  );
  const message = pathsRedacted.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return (message || fallback).slice(0, 512);
}

function inspectWritablePath(targetPath, { boundary, fsImpl }) {
  const absolute = path.resolve(targetPath);
  const boundaryAbsolute = path.resolve(boundary ?? (
    isWithin(process.cwd(), absolute) ? process.cwd() : path.parse(absolute).root
  ));
  if (!isWithin(boundaryAbsolute, absolute)) throw new Error("target escapes its trusted boundary");
  const boundaryReal = fsImpl.realpathSync(boundaryAbsolute);
  const relative = path.relative(boundaryAbsolute, absolute);
  const segments = relative ? relative.split(path.sep) : [];
  let cursor = boundaryAbsolute;
  let existing = boundaryAbsolute;
  for (const segment of segments) {
    cursor = path.join(cursor, segment);
    try {
      const stat = fsImpl.lstatSync(cursor);
      if (stat.isSymbolicLink()) throw new Error("path component is a symlink");
      existing = cursor;
    } catch (error) {
      if (error?.code === "ENOENT") break;
      throw error;
    }
  }
  const stat = fsImpl.lstatSync(existing);
  const writableDirectory = stat.isDirectory() ? existing : path.dirname(existing);
  if (!stat.isDirectory() && !stat.isFile()) throw new Error("nearest existing path is not regular");
  if (stat.isFile()) fsImpl.accessSync(existing, fs.constants.W_OK);
  fsImpl.accessSync(writableDirectory, fs.constants.W_OK | fs.constants.X_OK);
  if (!isWithin(boundaryReal, fsImpl.realpathSync(writableDirectory))) {
    throw new Error("writable ancestor resolves outside its trusted boundary");
  }
  return { ok: true };
}

export function preflightTools({
  tools = [],
  outputPaths = [],
  outputDirectories = [],
  spawnSyncImpl = spawnSync,
  fsImpl = fs,
} = {}) {
  const errors = [];
  const versions = {};
  for (const tool of tools) {
    const name = String(tool?.name ?? "").trim();
    const command = String(tool?.command ?? "").trim();
    const versionArgs = Array.isArray(tool?.versionArgs) ? tool.versionArgs.map(String) : ["--version"];
    if (!name || !command) {
      errors.push({ code: "INVALID_TOOL_SPEC", tool: name || null, message: "tool name and command are required" });
      continue;
    }
    let result;
    try {
      result = spawnSyncImpl(command, versionArgs, {
        encoding: "utf8",
        shell: false,
        timeout: tool.timeout ?? 10_000,
        env: tool.env,
      });
    } catch {
      errors.push({ code: "TOOL_PROBE_FAILED", tool: name, message: `${name} version probe could not start` });
      continue;
    }
    if (result?.error?.code === "ENOENT") {
      errors.push({ code: "TOOL_NOT_FOUND", tool: name, message: `${name} is not available; install it or pass an explicit binary path` });
      continue;
    }
    if (result?.error || result?.signal || result?.status !== 0) {
      errors.push({ code: "TOOL_VERSION_FAILED", tool: name, message: `${name} version probe failed` });
      continue;
    }
    const version = firstLine(result.stdout) || firstLine(result.stderr);
    if (!version || (tool.versionPattern && !tool.versionPattern.test(version))) {
      errors.push({ code: "TOOL_VERSION_UNRECOGNIZED", tool: name, message: `${name} returned an unsupported version string` });
      continue;
    }
    versions[name] = { version };
  }

  for (const output of [...outputPaths, ...outputDirectories]) {
    const outputPath = typeof output === "string" ? output : output?.path;
    const boundary = typeof output === "string" ? undefined : output?.boundary;
    try {
      inspectWritablePath(outputPath, { boundary, fsImpl });
    } catch {
      errors.push({
        code: "OUTPUT_NOT_WRITABLE",
        path: typeof outputPath === "string" ? path.basename(path.resolve(outputPath)) : null,
        message: "output or receipt path has no writable, symlink-free ancestor",
      });
    }
  }
  return { ok: errors.length === 0, tools: versions, errors };
}

function parseStructuredValues(value) {
  if (value && typeof value === "object" && !Buffer.isBuffer(value)) return [value];
  const text = Buffer.isBuffer(value) ? value.toString("utf8") : String(value ?? "");
  if (!text.trim()) throw new Error("generator result is empty");
  try {
    return [JSON.parse(text)];
  } catch {
    const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (rows.length === 0) throw new Error("generator result is empty");
    return rows.map((row) => {
      try { return JSON.parse(row); } catch { throw new Error("generator result must be JSON or JSONL"); }
    });
  }
}

function collectOutputCandidates(values) {
  const candidates = [];
  const visit = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    if (Object.hasOwn(value, "output_path")) {
      exactKeys(value, ["output_path"], "generator output");
      candidates.push(value.output_path);
    }
    if (value.type === "item.completed" && value.item && typeof value.item === "object") {
      const text = value.item.text ?? value.item.content;
      if (typeof text === "string") {
        let nested;
        try { nested = JSON.parse(text); } catch { throw new Error("generator final item must contain JSON"); }
        visit(nested);
      }
    }
  };
  for (const value of values) visit(value);
  return candidates;
}

function pngDimensions(bytes) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length < 45 || !bytes.subarray(0, 8).equals(signature)) {
    throw new Error("generator output is not a PNG file");
  }
  let offset = 8;
  let dimensions = null;
  let sawImageData = false;
  let sawEnd = false;
  while (offset + 12 <= bytes.length) {
    const size = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const next = dataStart + size + 4;
    if (next > bytes.length) throw new Error("generator PNG is truncated");
    if (type === "IHDR") {
      if (dimensions || size !== 13 || offset !== 8) throw new Error("generator PNG has an invalid IHDR chunk");
      const width = bytes.readUInt32BE(dataStart);
      const height = bytes.readUInt32BE(dataStart + 4);
      if (width < 1 || height < 1) throw new Error("generator PNG has invalid dimensions");
      dimensions = { width, height };
    } else if (type === "IDAT" && size > 0) {
      sawImageData = true;
    } else if (type === "IEND") {
      if (size !== 0) throw new Error("generator PNG has an invalid IEND chunk");
      sawEnd = true;
      offset = next;
      break;
    }
    offset = next;
  }
  if (!dimensions || !sawImageData || !sawEnd || offset !== bytes.length) {
    throw new Error("generator PNG is incomplete");
  }
  return dimensions;
}

function webpDimensions(bytes) {
  if (
    bytes.length < 30
    || bytes.toString("ascii", 0, 4) !== "RIFF"
    || bytes.toString("ascii", 8, 12) !== "WEBP"
    || bytes.readUInt32LE(4) + 8 !== bytes.length
  ) {
    throw new Error("asset is not a WebP file");
  }
  let offset = 12;
  let dimensions = null;
  let sawImagePayload = false;
  while (offset + 8 <= bytes.length) {
    const type = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (data + size > bytes.length) break;
    if (type === "VP8X" && size >= 10) {
      dimensions = { width: bytes.readUIntLE(data + 4, 3) + 1, height: bytes.readUIntLE(data + 7, 3) + 1 };
    }
    if (type === "VP8 " && size >= 10 && bytes[data + 3] === 0x9d && bytes[data + 4] === 0x01 && bytes[data + 5] === 0x2a) {
      sawImagePayload = true;
      dimensions ??= { width: bytes.readUInt16LE(data + 6) & 0x3fff, height: bytes.readUInt16LE(data + 8) & 0x3fff };
    }
    if (type === "VP8L" && size >= 5 && bytes[data] === 0x2f) {
      const b1 = bytes[data + 1];
      const b2 = bytes[data + 2];
      const b3 = bytes[data + 3];
      const b4 = bytes[data + 4];
      sawImagePayload = true;
      dimensions ??= {
        width: 1 + b1 + ((b2 & 0x3f) << 8),
        height: 1 + ((b2 & 0xc0) >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10),
      };
    }
    offset = data + size + (size % 2);
  }
  if (dimensions && sawImagePayload && offset === bytes.length) return dimensions;
  throw new Error("asset has no supported WebP dimensions");
}

function jpegDimensions(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("asset is not a JPEG file");
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.length) break;
    const size = bytes.readUInt16BE(offset);
    if (size < 2 || offset + size > bytes.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && size >= 7) {
      return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    }
    offset += size;
  }
  throw new Error("asset has no supported JPEG dimensions");
}

export function inspectImage(filePath, { fsImpl = fs } = {}) {
  const bytes = assertRegularFile(filePath, fsImpl, "image asset");
  let format;
  let dimensions;
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    format = "png";
    dimensions = pngDimensions(bytes);
  } else if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    format = "webp";
    dimensions = webpDimensions(bytes);
  } else if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    format = "jpeg";
    dimensions = jpegDimensions(bytes);
  } else {
    throw new Error("image asset has an unsupported format");
  }
  return { format, ...dimensions, sha256: sha256(bytes), bytes: bytes.length };
}

export function probeImage(filePath, { fsImpl = fs, spawnSyncImpl = spawnSync } = {}) {
  const inspected = inspectImage(filePath, { fsImpl });
  const result = spawnSyncImpl("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=codec_name,width,height",
    "-of", "json",
    filePath,
  ], {
    encoding: "utf8",
    shell: false,
    timeout: 30_000,
  });
  if (result?.error || result?.signal || result?.status !== 0) {
    throw new Error("image decoder rejected the asset");
  }
  let decoded;
  try { decoded = JSON.parse(result.stdout); }
  catch { throw new Error("image decoder returned invalid metadata"); }
  const streams = decoded?.streams;
  if (!Array.isArray(streams) || streams.length !== 1) throw new Error("image asset must contain exactly one video stream");
  const stream = streams[0];
  if (!Number.isInteger(stream.width) || !Number.isInteger(stream.height) || stream.width !== inspected.width || stream.height !== inspected.height) {
    throw new Error("image decoder dimensions do not match the asset header");
  }
  return inspected;
}

export function parseGeneratorResult(value, { stagingDir, fsImpl = fs } = {}) {
  if (!stagingDir) throw new Error("stagingDir is required");
  const candidates = collectOutputCandidates(parseStructuredValues(value));
  if (candidates.length !== 1) throw new Error("generator result must contain exactly one output_path");
  const [relativePath] = candidates;
  if (!isSafeRelativePath(relativePath) || !relativePath.toLowerCase().endsWith(".png")) {
    throw new Error("generator output_path must be a safe relative PNG path");
  }
  const stageReal = fsImpl.realpathSync(stagingDir);
  const candidate = path.resolve(stageReal, ...relativePath.split("/"));
  if (!isWithin(stageReal, candidate)) throw new Error("generator output_path escapes stagingDir");
  const stat = fsImpl.lstatSync(candidate);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("generator output must be a regular non-symlink file");
  const candidateReal = fsImpl.realpathSync(candidate);
  if (!isWithin(stageReal, candidateReal)) throw new Error("generator output resolves outside stagingDir");
  const bytes = fsImpl.readFileSync(candidateReal);
  const { width, height } = pngDimensions(bytes);
  return {
    path: candidateReal,
    relative_path: relativePath,
    sha256: sha256(bytes),
    width,
    height,
  };
}

export function assetFingerprint(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function assertRegularFile(filePath, fsImpl, label) {
  const stat = fsImpl.lstatSync(filePath);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`${label} must be a regular non-symlink file`);
  const bytes = fsImpl.readFileSync(filePath);
  if (bytes.length === 0) throw new Error(`${label} must not be empty`);
  return bytes;
}

function safeUnlink(filePath, fsImpl) {
  try { fsImpl.unlinkSync(filePath); } catch (error) { if (error?.code !== "ENOENT") throw error; }
}

function assertPathAbsent(filePath, fsImpl) {
  try {
    fsImpl.lstatSync(filePath);
    throw new Error("transaction path already exists");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

export function writeAssetAtomically({ outputs, commitMetadata = null, fsImpl = fs } = {}) {
  if (!Array.isArray(outputs) || outputs.length === 0) throw new Error("outputs must be a non-empty array");
  const targets = new Set();
  const transaction = `${process.pid}.${transactionSequence += 1}`;
  const states = outputs.map((output, index) => {
    const keys = Object.keys(output ?? {}).sort();
    const allowedKeys = new Set(["targetPath", "boundary", "writeTemp", "validateTemp", "expectAbsent"]);
    if (
      !output || typeof output !== "object" || Array.isArray(output)
      || !["targetPath", "boundary", "writeTemp", "validateTemp"].every((key) => Object.hasOwn(output, key))
      || keys.some((key) => !allowedKeys.has(key))
    ) {
      throw new Error(`outputs[${index}] has an invalid transaction shape`);
    }
    const targetPath = path.resolve(output.targetPath);
    const boundary = path.resolve(output.boundary);
    inspectWritablePath(targetPath, { boundary, fsImpl });
    if (targets.has(targetPath)) throw new Error("output target paths must be unique");
    targets.add(targetPath);
    if (typeof output.writeTemp !== "function") throw new Error(`outputs[${index}].writeTemp must be a function`);
    if (output.validateTemp !== null && typeof output.validateTemp !== "function") {
      throw new Error(`outputs[${index}].validateTemp must be a function or null`);
    }
    const directory = path.dirname(targetPath);
    const directoryStat = fsImpl.lstatSync(directory);
    if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
      throw new Error("output directory must be an existing non-symlink directory");
    }
    const basename = path.basename(targetPath);
    return {
      ...output,
      targetPath,
      boundary,
      tempPath: path.join(directory, `.${basename}.${transaction}.${index}.tmp`),
      backupPath: path.join(directory, `.${basename}.${transaction}.${index}.bak`),
      existed: false,
      backedUp: false,
      installed: false,
      result: null,
    };
  });

  let metadataRollback = null;
  let committed = false;
  try {
    for (const state of states) {
      assertPathAbsent(state.tempPath, fsImpl);
      assertPathAbsent(state.backupPath, fsImpl);
      state.writeTemp(state.tempPath);
      const bytes = assertRegularFile(state.tempPath, fsImpl, "temporary asset");
      const result = { sha256: sha256(bytes), bytes: bytes.length };
      state.validateTemp?.({ ...result, tempPath: state.tempPath, contents: bytes });
      const descriptor = fsImpl.openSync(state.tempPath, "r");
      try { fsImpl.fsyncSync(descriptor); } finally { fsImpl.closeSync(descriptor); }
      state.result = result;
    }

    for (const state of states) {
      inspectWritablePath(state.targetPath, { boundary: state.boundary, fsImpl });
      try {
        const stat = fsImpl.lstatSync(state.targetPath);
        if (state.expectAbsent === true) throw new Error("asset target appeared after planning");
        if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("existing asset target must be a regular non-symlink file");
        state.existed = true;
        fsImpl.renameSync(state.targetPath, state.backupPath);
        state.backedUp = true;
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      if (state.expectAbsent === true) {
        try {
          fsImpl.linkSync(state.tempPath, state.targetPath);
        } catch (error) {
          if (error?.code === "EEXIST") throw new Error("asset target appeared after planning");
          throw error;
        }
        state.installed = true;
        safeUnlink(state.tempPath, fsImpl);
      } else {
        fsImpl.renameSync(state.tempPath, state.targetPath);
        state.installed = true;
      }
    }

    if (commitMetadata) {
      if (typeof commitMetadata !== "function") throw new Error("commitMetadata must be a function");
      const metadata = commitMetadata(states.map((state) => ({ ...state.result })));
      if (typeof metadata === "function") metadataRollback = metadata;
      else if (metadata?.rollback && typeof metadata.rollback === "function") metadataRollback = metadata.rollback;
    }
    committed = true;
    const cleanupPending = [];
    for (const state of states) {
      if (!state.backedUp) continue;
      try { safeUnlink(state.backupPath, fsImpl); }
      catch { cleanupPending.push(path.basename(state.backupPath)); }
    }
    const results = states.map((state) => ({ ...state.result }));
    if (cleanupPending.length > 0) results.cleanup_pending = cleanupPending;
    return results;
  } catch (error) {
    if (committed) throw error;
    const rollbackErrors = [];
    try { metadataRollback?.(); } catch { rollbackErrors.push(new Error("metadata rollback failed")); }
    for (const state of [...states].reverse()) {
      try {
        if (state.installed) safeUnlink(state.targetPath, fsImpl);
      } catch { rollbackErrors.push(new Error("installed output cleanup failed")); }
      if (state.backedUp) {
        try { fsImpl.renameSync(state.backupPath, state.targetPath); }
        catch { rollbackErrors.push(new Error("backup restore failed; recovery backup was preserved")); }
      }
      try { safeUnlink(state.tempPath, fsImpl); }
      catch { rollbackErrors.push(new Error("temporary output cleanup failed")); }
    }
    if (rollbackErrors.length > 0) {
      throw new AggregateError(
        [new Error("asset transaction failed"), ...rollbackErrors],
        "asset transaction failed and rollback is incomplete; recovery artifacts were preserved",
      );
    }
    throw error;
  }
}

function assertPortableReceiptInput(value, label = "asset receipt inputs") {
  const canonical = canonicalize(value, label);
  const visit = (item, itemLabel) => {
    if (typeof item === "string") {
      if (
        /(?:^|[^a-z0-9:/]|:(?!\/\/))\/[^\s"'`]*/i.test(item)
        || /(?:~[\\/]|(?:^|[^a-z0-9+.-])file:|(?:^|[^a-z0-9])[a-z]:[\\/]|\\\\)/i.test(item)
        || /[\u0000-\u001f\u007f]/.test(item)
      ) {
        throw new Error(`${itemLabel} contains a local path or control character`);
      }
      return;
    }
    if (Array.isArray(item)) item.forEach((child, index) => visit(child, `${itemLabel}[${index}]`));
    else if (item && typeof item === "object") {
      for (const [key, child] of Object.entries(item)) {
        if (!/^[a-z][a-z0-9_.-]{0,63}$/.test(key)) throw new Error(`${itemLabel} contains an unsafe key`);
        visit(child, `${itemLabel}.${key}`);
      }
    }
  };
  visit(canonical, label);
  return canonical;
}

function validateIdentity(value, label) {
  exactKeys(value, ["id", "version"], label);
  if (typeof value.id !== "string" || !GENERATOR_RE.test(value.id)) throw new Error(`${label}.id is invalid`);
  if (typeof value.version !== "string" || !value.version.trim() || value.version.length > 160 || /[\u0000-\u001f\u007f]/.test(value.version)) {
    throw new Error(`${label}.version is invalid`);
  }
}

function validateReceiptInputs(value, { slug, generator, outputs }) {
  const inputs = assertPortableReceiptInput(value);
  exactKeys(inputs, [
    "slug",
    "input_content_commit",
    "sources",
    "prompt_sha256",
    "template",
    "generator",
    "converter",
    "parameters",
    "outputs",
  ], "asset receipt inputs");
  if (inputs.slug !== slug) throw new Error("asset receipt inputs.slug must match the receipt slug");
  if (typeof inputs.input_content_commit !== "string" || !GIT_SHA_RE.test(inputs.input_content_commit)) {
    throw new Error("asset receipt inputs.input_content_commit is invalid");
  }
  if (!Array.isArray(inputs.sources) || inputs.sources.length === 0) throw new Error("asset receipt inputs.sources must be non-empty");
  const sourcePaths = new Set();
  for (const [index, source] of inputs.sources.entries()) {
    exactKeys(source, ["path", "sha256"], `asset receipt inputs.sources[${index}]`);
    if (!isSafeRelativePath(source.path) || sourcePaths.has(source.path)) throw new Error(`asset receipt inputs.sources[${index}].path is invalid or duplicated`);
    if (typeof source.sha256 !== "string" || !SHA256_RE.test(source.sha256)) throw new Error(`asset receipt inputs.sources[${index}].sha256 is invalid`);
    sourcePaths.add(source.path);
  }
  if (inputs.prompt_sha256 !== null && (typeof inputs.prompt_sha256 !== "string" || !SHA256_RE.test(inputs.prompt_sha256))) {
    throw new Error("asset receipt inputs.prompt_sha256 must be a sha256 or null");
  }
  validateIdentity(inputs.template, "asset receipt inputs.template");
  validateIdentity(inputs.generator, "asset receipt inputs.generator");
  validateIdentity(inputs.converter, "asset receipt inputs.converter");
  if (inputs.generator.id !== generator) throw new Error("asset receipt generator must match inputs.generator.id");
  if (!inputs.parameters || typeof inputs.parameters !== "object" || Array.isArray(inputs.parameters)) {
    throw new Error("asset receipt inputs.parameters must be an object");
  }
  if (!Array.isArray(inputs.outputs) || inputs.outputs.length !== outputs.length) {
    throw new Error("asset receipt inputs.outputs must match receipt outputs");
  }
  const expectedOutputs = new Map(outputs.map((output) => [output.path, output]));
  const inputOutputPaths = new Set();
  const normalizedInputOutputs = inputs.outputs.map((output, index) => {
    exactKeys(output, ["kind", "path", "parameters"], `asset receipt inputs.outputs[${index}]`);
    const expected = expectedOutputs.get(output.path);
    if (!expected || output.kind !== expected.kind || inputOutputPaths.has(output.path)) {
      throw new Error(`asset receipt inputs.outputs[${index}] does not match receipt outputs`);
    }
    inputOutputPaths.add(output.path);
    if (!output.parameters || typeof output.parameters !== "object" || Array.isArray(output.parameters)) {
      throw new Error(`asset receipt inputs.outputs[${index}].parameters must be an object`);
    }
    return output;
  }).sort((a, b) => a.path.localeCompare(b.path, "en"));
  if (inputOutputPaths.size !== expectedOutputs.size) {
    throw new Error("asset receipt inputs.outputs must bind each receipt output exactly once");
  }
  return {
    ...inputs,
    sources: [...inputs.sources].sort((a, b) => a.path.localeCompare(b.path, "en")),
    outputs: normalizedInputOutputs,
  };
}

function validateReceipt(receipt) {
  exactKeys(receipt, [
    "schema_version",
    "slug",
    "generator",
    "inputs",
    "input_fingerprint",
    "asset_fingerprint",
    "outputs",
  ], "asset receipt");
  if (receipt.schema_version !== RECEIPT_VERSION) throw new Error(`asset receipt schema_version must be ${RECEIPT_VERSION}`);
  if (typeof receipt.slug !== "string" || !SLUG_RE.test(receipt.slug)) throw new Error("asset receipt slug is invalid");
  if (typeof receipt.generator !== "string" || !GENERATOR_RE.test(receipt.generator)) throw new Error("asset receipt generator is invalid");
  if (!Array.isArray(receipt.outputs) || receipt.outputs.length === 0) throw new Error("asset receipt outputs must be non-empty");
  const paths = new Set();
  const outputs = receipt.outputs.map((output, index) => {
    exactKeys(output, ["kind", "path", "sha256", "width", "height"], `asset receipt outputs[${index}]`);
    if (!ASSET_KINDS.has(output.kind)) throw new Error(`asset receipt outputs[${index}].kind is invalid`);
    if (!isSafeRelativePath(output.path) || paths.has(output.path)) throw new Error(`asset receipt outputs[${index}].path is invalid or duplicated`);
    if (typeof output.sha256 !== "string" || !SHA256_RE.test(output.sha256)) throw new Error(`asset receipt outputs[${index}].sha256 is invalid`);
    if (!Number.isInteger(output.width) || output.width < 1 || !Number.isInteger(output.height) || output.height < 1) {
      throw new Error(`asset receipt outputs[${index}] dimensions are invalid`);
    }
    paths.add(output.path);
    return structuredClone(output);
  }).sort((a, b) => a.path.localeCompare(b.path, "en"));
  const inputs = validateReceiptInputs(receipt.inputs, { slug: receipt.slug, generator: receipt.generator, outputs });
  if (typeof receipt.input_fingerprint !== "string" || !SHA256_RE.test(receipt.input_fingerprint)) {
    throw new Error("asset receipt input_fingerprint is invalid");
  }
  if (assetFingerprint(inputs) !== receipt.input_fingerprint) {
    throw new Error("asset receipt input_fingerprint does not match its canonical inputs");
  }
  if (
    typeof receipt.asset_fingerprint !== "string"
    || !SHA256_RE.test(receipt.asset_fingerprint)
    || assetFingerprint({ input_fingerprint: receipt.input_fingerprint, outputs }) !== receipt.asset_fingerprint
  ) {
    throw new Error("asset receipt asset_fingerprint does not match its input and output evidence");
  }
  return {
    schema_version: RECEIPT_VERSION,
    slug: receipt.slug,
    generator: receipt.generator,
    inputs,
    input_fingerprint: receipt.input_fingerprint,
    asset_fingerprint: receipt.asset_fingerprint,
    outputs,
  };
}

export function createAssetReceipt({ slug, generator, inputs, inputFingerprint = null, outputs }) {
  const sortedOutputs = [...outputs].map((output) => ({ ...output })).sort((a, b) => a.path.localeCompare(b.path, "en"));
  const normalizedInputs = validateReceiptInputs(inputs, { slug, generator, outputs: sortedOutputs });
  const canonicalInputFingerprint = inputFingerprint ?? assetFingerprint(normalizedInputs);
  return validateReceipt({
    schema_version: RECEIPT_VERSION,
    slug,
    generator,
    inputs: normalizedInputs,
    input_fingerprint: canonicalInputFingerprint,
    asset_fingerprint: assetFingerprint({ input_fingerprint: canonicalInputFingerprint, outputs: sortedOutputs }),
    outputs: sortedOutputs,
  });
}

export function serializeAssetReceipt(receipt) {
  return `${JSON.stringify(validateReceipt(receipt), null, 2)}\n`;
}

export function parseAssetReceipt(value) {
  let receipt;
  try { receipt = JSON.parse(Buffer.isBuffer(value) ? value.toString("utf8") : String(value)); }
  catch { throw new Error("asset receipt must be valid JSON"); }
  return validateReceipt(receipt);
}

export function writeAssetReceiptAtomically(filePath, receipt, { boundary, fsImpl = fs } = {}) {
  if (!boundary) throw new Error("receipt trusted boundary is required");
  const bytes = Buffer.from(serializeAssetReceipt(receipt));
  const absolute = path.resolve(filePath);
  const boundaryAbsolute = path.resolve(boundary);
  inspectWritablePath(absolute, { boundary: boundaryAbsolute, fsImpl });
  const directory = path.dirname(absolute);
  const directoryStat = fsImpl.lstatSync(directory);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
    throw new Error("receipt directory must be an existing non-symlink directory");
  }
  try {
    const existing = fsImpl.lstatSync(absolute);
    if (existing.isSymbolicLink() || !existing.isFile()) throw new Error("existing receipt must be a regular non-symlink file");
    throw new Error("receipt file appeared after planning");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const tempPath = path.join(directory, `.${path.basename(absolute)}.${process.pid}.${transactionSequence += 1}.tmp`);
  let descriptor = null;
  let renamed = false;
  try {
    descriptor = fsImpl.openSync(tempPath, "wx", 0o600);
    fsImpl.writeFileSync(descriptor, bytes);
    fsImpl.fsyncSync(descriptor);
    fsImpl.closeSync(descriptor);
    descriptor = null;
    inspectWritablePath(absolute, { boundary: boundaryAbsolute, fsImpl });
    try {
      fsImpl.linkSync(tempPath, absolute);
    } catch (error) {
      if (error?.code === "EEXIST") throw new Error("receipt file appeared after planning");
      throw error;
    }
    renamed = true;
    let cleanupPending = null;
    try { safeUnlink(tempPath, fsImpl); }
    catch { cleanupPending = path.basename(tempPath); }
    return { file: path.basename(absolute), sha256: sha256(bytes), bytes: bytes.length, cleanup_pending: cleanupPending };
  } catch (error) {
    if (descriptor !== null) {
      try { fsImpl.closeSync(descriptor); } catch { /* preserve original failure */ }
    }
    if (!renamed) {
      try { safeUnlink(tempPath, fsImpl); } catch { /* preserve original failure */ }
    }
    throw error;
  }
}

function formatSchemaErrors(errors) {
  return errors.map((error) => `${error.path} [${error.code}]: ${error.message}`).join("; ");
}

function gitText(root, args, execFileSyncImpl) {
  return String(execFileSyncImpl("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_TRACE2: "0",
      GIT_TRACE2_EVENT: "0",
      GIT_TRACE2_PERF: "0",
    },
  })).trim();
}

function gitBuffer(root, args, execFileSyncImpl) {
  return Buffer.from(execFileSyncImpl("git", args, {
    cwd: root,
    encoding: null,
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_TRACE2: "0",
      GIT_TRACE2_EVENT: "0",
      GIT_TRACE2_PERF: "0",
    },
  }));
}

function verifyReceiptInputSnapshot({ root, receipt, contentCommit, execFileSyncImpl }) {
  const inputCommit = receipt.inputs.input_content_commit;
  try {
    if (gitText(root, ["cat-file", "-t", inputCommit], execFileSyncImpl) !== "commit") throw new Error("not commit");
    execFileSyncImpl("git", ["merge-base", "--is-ancestor", inputCommit, contentCommit], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_TRACE2: "0", GIT_TRACE2_EVENT: "0", GIT_TRACE2_PERF: "0" },
    });
  } catch {
    throw new Error("receipt input_content_commit must be an available ancestor of the asset snapshot");
  }
  for (const source of receipt.inputs.sources) {
    let bytes;
    try { bytes = gitBuffer(root, ["show", `${inputCommit}:${source.path}`], execFileSyncImpl); }
    catch { throw new Error(`receipt input source is absent from its snapshot: ${source.path}`); }
    if (sha256(bytes) !== source.sha256) {
      throw new Error(`receipt input source hash does not match its snapshot: ${source.path}`);
    }
  }
}

function verifyManifestBaseline({ root, manifestRepoPath, originalBytes, execFileSyncImpl }) {
  let rows;
  try {
    rows = gitText(root, ["ls-files", "--stage", "--", manifestRepoPath], execFileSyncImpl)
      .split("\n")
      .filter(Boolean);
  } catch {
    throw new Error("manifest index state cannot be verified");
  }
  if (rows.length !== 1) throw new Error("manifest must have exactly one stage-0 index entry");
  const match = rows[0].match(/^(100644|100755) ([a-f0-9]{40,64}) 0\t(.+)$/);
  if (!match || match[3] !== manifestRepoPath) throw new Error("manifest index entry must be a regular stage-0 blob");
  let indexBytes;
  let headBytes;
  try {
    indexBytes = gitBuffer(root, ["cat-file", "blob", match[2]], execFileSyncImpl);
    headBytes = gitBuffer(root, ["show", `HEAD:${manifestRepoPath}`], execFileSyncImpl);
  } catch {
    throw new Error("manifest index and HEAD bytes cannot be verified");
  }
  if (!indexBytes.equals(originalBytes) || !headBytes.equals(originalBytes)) {
    throw new Error("manifest must match both index and HEAD before a provenance write");
  }
}

function writeManifestCompareAndSwap({ manifestPath, originalBytes, candidateBytes, fsImpl }) {
  const directory = path.dirname(manifestPath);
  const basename = path.basename(manifestPath);
  const transaction = `${process.pid}.${transactionSequence += 1}`;
  const tempPath = path.join(directory, `.${basename}.${transaction}.tmp`);
  const backupPath = path.join(directory, `.${basename}.${transaction}.bak`);
  assertPathAbsent(tempPath, fsImpl);
  assertPathAbsent(backupPath, fsImpl);
  const originalStat = fsImpl.lstatSync(manifestPath);
  if (originalStat.isSymbolicLink() || !originalStat.isFile()) throw new Error("manifest must remain a regular non-symlink file");

  let descriptor = null;
  let movedOriginal = false;
  let installedCandidate = false;
  const rollbackErrors = [];
  try {
    descriptor = fsImpl.openSync(tempPath, "wx", originalStat.mode & 0o777);
    fsImpl.writeFileSync(descriptor, candidateBytes);
    fsImpl.fsyncSync(descriptor);
    fsImpl.closeSync(descriptor);
    descriptor = null;

    fsImpl.renameSync(manifestPath, backupPath);
    movedOriginal = true;
    if (!fsImpl.readFileSync(backupPath).equals(originalBytes)) {
      throw new Error("manifest changed concurrently before compare-and-swap");
    }
    fsImpl.linkSync(tempPath, manifestPath);
    installedCandidate = true;
    safeUnlink(tempPath, fsImpl);
    let cleanupPending = null;
    try { safeUnlink(backupPath, fsImpl); }
    catch { cleanupPending = path.basename(backupPath); }
    return { cleanup_pending: cleanupPending };
  } catch (error) {
    if (descriptor !== null) {
      try { fsImpl.closeSync(descriptor); } catch { rollbackErrors.push(new Error("manifest temp close failed")); }
    }
    if (installedCandidate) {
      try {
        const installedBytes = fsImpl.readFileSync(manifestPath);
        if (!installedBytes.equals(candidateBytes)) throw new Error("installed manifest changed during rollback");
        safeUnlink(manifestPath, fsImpl);
      } catch { rollbackErrors.push(new Error("candidate manifest rollback failed")); }
    }
    if (movedOriginal) {
      try {
        fsImpl.linkSync(backupPath, manifestPath);
        safeUnlink(backupPath, fsImpl);
      } catch { rollbackErrors.push(new Error("original manifest recovery backup was preserved")); }
    }
    try { safeUnlink(tempPath, fsImpl); } catch { rollbackErrors.push(new Error("manifest temp cleanup failed")); }
    if (rollbackErrors.length > 0) {
      throw new AggregateError(
        [new Error("manifest compare-and-swap failed"), ...rollbackErrors],
        "manifest compare-and-swap failed and recovery artifacts were preserved",
      );
    }
    throw error;
  }
}

export function recordGeneratedAsset({
  root,
  receipt,
  contentCommit,
  manifestPath = path.join(root ?? "", "papers", "provenance.json"),
  checkOnly = false,
  fsImpl = fs,
  execFileSyncImpl = execFileSync,
  spawnSyncImpl = spawnSync,
  imageProbeImpl = probeImage,
  imageProbeSpawnSyncImpl = spawnSync,
} = {}) {
  if (!root) throw new Error("root is required");
  if (typeof contentCommit !== "string" || !GIT_SHA_RE.test(contentCommit)) {
    throw new Error("contentCommit must be exactly 40 lowercase hexadecimal characters");
  }
  const canonicalReceipt = validateReceipt(receipt);
  const rootReal = fsImpl.realpathSync(root);
  const manifestParentStat = fsImpl.lstatSync(path.dirname(manifestPath));
  if (manifestParentStat.isSymbolicLink() || !manifestParentStat.isDirectory()) {
    throw new Error("manifest directory must be a regular repository directory");
  }
  const manifestRealParent = fsImpl.realpathSync(path.dirname(manifestPath));
  const manifestAbsolute = path.join(manifestRealParent, path.basename(manifestPath));
  if (!isWithin(rootReal, manifestRealParent) || !isWithin(rootReal, manifestAbsolute)) {
    throw new Error("manifestPath must stay inside the repository root");
  }
  const manifestStat = fsImpl.lstatSync(manifestAbsolute);
  if (manifestStat.isSymbolicLink() || !manifestStat.isFile()) throw new Error("manifest must be a regular non-symlink file");
  const originalBytes = fsImpl.readFileSync(manifestAbsolute);
  let current;
  try { current = JSON.parse(originalBytes.toString("utf8")); }
  catch { throw new Error("manifest must contain valid JSON"); }
  const currentValidation = validateProvenanceDocument(current);
  if (!currentValidation.ok) throw new Error(`current manifest is invalid: ${formatSchemaErrors(currentValidation.errors)}`);

  try {
    if (gitText(rootReal, ["cat-file", "-t", contentCommit], execFileSyncImpl) !== "commit") {
      throw new Error("not a commit");
    }
  } catch {
    throw new Error("contentCommit must identify an available Git commit");
  }
  try {
    execFileSyncImpl("git", ["merge-base", "--is-ancestor", contentCommit, "HEAD"], {
      cwd: rootReal,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_TRACE2: "0", GIT_TRACE2_EVENT: "0", GIT_TRACE2_PERF: "0" },
    });
  } catch {
    throw new Error("contentCommit must be an ancestor of HEAD");
  }
  verifyReceiptInputSnapshot({
    root: rootReal,
    receipt: canonicalReceipt,
    contentCommit,
    execFileSyncImpl,
  });

  const candidate = structuredClone(current);
  candidate.content_commit = contentCommit;
  for (const note of candidate.notes) {
    for (const asset of note.generated_assets) asset.content_commit = contentCommit;
  }
  const record = candidate.notes.find((note) => note.slug === canonicalReceipt.slug);
  if (!record) throw new Error("asset receipt slug is absent from the provenance manifest");
  for (const output of canonicalReceipt.outputs) {
    const currentPath = path.join(rootReal, ...output.path.split("/"));
    if (!isWithin(rootReal, currentPath)) throw new Error(`asset receipt path escapes the repository: ${output.path}`);
    const inspected = imageProbeImpl(currentPath, { fsImpl, spawnSyncImpl: imageProbeSpawnSyncImpl });
    if (inspected.sha256 !== output.sha256 || inspected.width !== output.width || inspected.height !== output.height) {
      throw new Error(`asset receipt metadata does not match current bytes: ${output.path}`);
    }
    const asset = {
      kind: output.kind,
      tracked: true,
      path: output.path,
      sha256: output.sha256,
      generator: canonicalReceipt.generator,
      input_fingerprint: canonicalReceipt.input_fingerprint,
      content_commit: contentCommit,
    };
    const existing = record.generated_assets.find((item) => item.path === asset.path);
    if (existing && JSON.stringify(existing) !== JSON.stringify(asset)) {
      throw new Error(`generated asset record conflicts with existing provenance: ${asset.path}`);
    }
    if (!existing) record.generated_assets.push(asset);
  }
  record.generated_assets.sort((a, b) => a.path.localeCompare(b.path, "en"));
  const candidateValidation = validateProvenanceDocument(candidate);
  if (!candidateValidation.ok) throw new Error(`candidate manifest is invalid: ${formatSchemaErrors(candidateValidation.errors)}`);

  const repository = validateProvenanceRepository({
    root: rootReal,
    document: candidate,
    fsImpl,
    execFileSyncImpl,
    spawnSyncImpl,
  });
  if (!repository.ok) {
    throw new Error(`candidate manifest does not match the repository snapshot: ${formatProvenanceRepositoryErrors(repository.errors)}`);
  }

  const candidateBytes = Buffer.from(serializeProvenanceDocument(candidate));
  const changed = !candidateBytes.equals(originalBytes);
  let cleanupPending = null;
  if (changed) {
    const manifestRepoPath = path.relative(rootReal, manifestAbsolute).split(path.sep).join("/");
    if (!isSafeRelativePath(manifestRepoPath)) throw new Error("manifest repository path is invalid");
    verifyManifestBaseline({ root: rootReal, manifestRepoPath, originalBytes, execFileSyncImpl });
    if (!fsImpl.readFileSync(manifestAbsolute).equals(originalBytes)) {
      throw new Error("manifest changed concurrently before the provenance write");
    }
    if (!checkOnly) {
      cleanupPending = writeManifestCompareAndSwap({
        manifestPath: manifestAbsolute,
        originalBytes,
        candidateBytes,
        fsImpl,
      }).cleanup_pending;
    }
  }
  return {
    ok: true,
    changed,
    check_only: Boolean(checkOnly),
    manifest_sha256: sha256(candidateBytes),
    cleanup_pending: cleanupPending,
    document: candidate,
  };
}
