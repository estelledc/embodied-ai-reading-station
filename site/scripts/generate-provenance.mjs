#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateProvenanceFile,
} from "./lib/provenance.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUTPUT = path.join(ROOT, "papers", "provenance.json");
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--check") || args.filter((arg) => arg === "--check").length > 1) {
  throw new Error("usage: node scripts/generate-provenance.mjs [--check]");
}
const checkOnly = args.includes("--check");

const relativeOutput = path.relative(ROOT, OUTPUT);
const result = generateProvenanceFile({ root: ROOT, filePath: OUTPUT, checkOnly });

if (checkOnly) {
  if (!result.ok) {
    console.error(`${relativeOutput} is stale (expected ${result.expected_sha256}, actual ${result.actual_sha256 ?? "missing"})`);
    process.exitCode = 1;
  } else {
    console.log(`${relativeOutput} is current (${result.document.notes.length} notes)`);
  }
} else {
  console.log(`wrote ${relativeOutput} (${result.document.notes.length} notes, snapshot ${result.contentCommit})`);
}
