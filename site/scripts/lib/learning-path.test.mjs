import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TASK_SLUGS } from "../constants.mjs";
import { SYLLABUS_WEEKS, buildSyllabus } from "./views/aggregates.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, "..", "..");
const ROOT = path.resolve(SITE, "..");
const PATH_MD = fs.readFileSync(path.join(SITE, "content", "path.md"), "utf8");
const CHANGELOG = fs.readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf8");
const OPTIONAL_HEADING = "## 可选任务扩展 · Day 31–35";

function paperRows(markdown) {
  return [...markdown.matchAll(/^\|\s*(\d+)\s*\|[^\n]*?\]\(\/papers\/([^/]+)\/\)[^\n]*$/gm)]
    .map(match => ({ day: Number(match[1]), slug: match[2] }));
}

test("30-day core syllabus has exactly 25 paper days and 5 review/output days", () => {
  const days = SYLLABUS_WEEKS.flatMap(week => week.days);
  const paperSlugs = days.filter(day => day.slug).map(day => day.slug);
  assert.deepEqual(days.map(day => day.d), Array.from({ length: 30 }, (_, index) => index + 1));
  assert.equal(paperSlugs.length, 25);
  assert.equal(new Set(paperSlugs).size, 25);
  assert.equal(days.filter(day => !day.slug).length, 5);
});

test("path markdown core matches the checkable syllabus day-for-day", () => {
  const marker = PATH_MD.indexOf(OPTIONAL_HEADING);
  assert.notEqual(marker, -1, "path.md must label Day 31–35 as an optional extension");
  const core = PATH_MD.slice(0, marker);
  const rows = paperRows(core);
  const coreRows = new Map(rows.map(row => [row.day, row.slug]));
  assert.equal(rows.length, 25);
  assert.equal(coreRows.size, 25);

  for (const day of SYLLABUS_WEEKS.flatMap(week => week.days)) {
    if (day.slug) assert.equal(coreRows.get(day.d), day.slug, `Day ${day.d} slug drifted`);
    else assert.equal(coreRows.has(day.d), false, `Day ${day.d} should remain review/output only`);
  }
});

test("optional extension is Day 31–35, has ten unique papers, and completes all task papers", () => {
  const marker = PATH_MD.indexOf(OPTIONAL_HEADING);
  assert.notEqual(marker, -1);
  const extensionRows = paperRows(PATH_MD.slice(marker));
  assert.deepEqual([...new Set(extensionRows.map(row => row.day))], [31, 32, 33, 34, 35]);
  assert.equal(extensionRows.length, 10);
  assert.equal(new Set(extensionRows.map(row => row.slug)).size, 10);
  for (let day = 31; day <= 35; day += 1) {
    assert.equal(extensionRows.filter(row => row.day === day).length, 2, `Day ${day} must have two papers`);
  }

  const allPathSlugs = new Set(paperRows(PATH_MD).map(row => row.slug));
  for (const slug of TASK_SLUGS) {
    assert.equal(allPathSlugs.has(slug), true, `task paper missing from path: ${slug}`);
  }
  for (const slug of allPathSlugs) {
    assert.equal(fs.existsSync(path.join(ROOT, "notes", `${slug}.md`)), true, `missing note: ${slug}`);
  }
});

test("path copy explicitly separates the 30-day core from the optional extension", () => {
  assert.match(PATH_MD, /30 天核心/);
  assert.match(PATH_MD, /5 天可选任务扩展/);
  assert.match(PATH_MD, /不计入 30 天核心进度/);
  assert.match(PATH_MD, /\[[^\]]*可勾选[^\]]*\]\(\/syllabus\/\)/);
  assert.doesNotMatch(CHANGELOG, /核心、扩展和 Guide 分开计算完成度/);
});

test("syllabus HTML is markup-only and links to both core and optional paths", () => {
  const notes = SYLLABUS_WEEKS
    .flatMap(week => week.days)
    .filter(day => day.slug)
    .map(day => ({ slug: day.slug, title: day.slug }));
  const html = buildSyllabus(notes);

  assert.equal((html.match(/data-syl-day="\d+"/g) || []).length, 30);
  assert.doesNotMatch(html, /eaireading\.syllabus/);
  assert.doesNotMatch(html, /\[30 天核心路径\]/);
  assert.match(html, /href="\/learn\/path\/"/);
  assert.match(html, /href="\/learn\/path\/#可选任务扩展-day-3135"/);
});
