#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { buildLocalProvenanceEntry } from "./lib/source-reference.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const NOTES = path.join(ROOT, "notes");
const OUTPUT = path.join(ROOT, "papers", "provenance.json");

const entries = fs.readdirSync(NOTES)
  .filter((name) => name.endsWith(".md"))
  .sort()
  .flatMap((name) => {
    const slug = name.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(NOTES, name), "utf8");
    const { data } = matter(raw);
    const source = data["来源"] || data.source || "";
    if (!String(source).startsWith("papers/")) return [];
    return [buildLocalProvenanceEntry({ root: ROOT, noteSlug: slug, source: String(source) })];
  });

const manifest = {
  schema_version: "1.0.0",
  algorithm: "sha256",
  entries,
};

fs.writeFileSync(OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${path.relative(ROOT, OUTPUT)} (${entries.length} entries)`);
