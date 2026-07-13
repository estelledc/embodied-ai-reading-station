import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const CHANGELOG = fs.readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf8");
const PROVENANCE_CONTRACT = fs.readFileSync(
  path.join(ROOT, "docs", "provenance-v2-contract.md"),
  "utf8",
);
const SW_SOURCE = fs.readFileSync(path.join(ROOT, "site", "src", "sw.js"), "utf8");

function versionSection(markdown, heading) {
  const start = markdown.indexOf(heading);
  assert.notEqual(start, -1, `missing changelog section: ${heading}`);
  const next = markdown.indexOf("\n## [", start + heading.length);
  return markdown.slice(start, next === -1 ? undefined : next);
}

function subsection(markdown, versionHeading, subsectionHeading) {
  const version = versionSection(markdown, versionHeading);
  const heading = `### ${subsectionHeading}\n`;
  const start = version.indexOf(heading);
  assert.notEqual(start, -1, `missing changelog subsection: ${subsectionHeading}`);
  const next = version.indexOf("\n### ", start + heading.length);
  return version.slice(start, next === -1 ? undefined : next);
}

function executableCacheLimitTuple(source) {
  const declarations = [...source.matchAll(
    /const CACHE_LIMITS = Object\.freeze\(\{\s*pages:\s*(\d+),\s*images:\s*(\d+),\s*data:\s*(\d+),?\s*\}\);/g,
  )];
  assert.equal(declarations.length, 1, "CACHE_LIMITS must have one literal declaration");
  return declarations[0].slice(1).join("/");
}

test("v1.3 release notes stay in Unreleased and mirror executable cache limits", () => {
  const unreleased = versionSection(CHANGELOG, "## [Unreleased]");
  const releasedV12 = versionSection(CHANGELOG, "## [1.2.0]");
  const changed = subsection(CHANGELOG, "## [Unreleased]", "Changed");
  const security = subsection(CHANGELOG, "## [Unreleased]", "Security");
  const cacheLimitTuple = executableCacheLimitTuple(SW_SOURCE);

  assert.equal((CHANGELOG.match(/`EAI13-T007`/g) ?? []).length, 1);
  assert.equal((CHANGELOG.match(/`EAI13-T006`/g) ?? []).length, 1);
  assert.match(security, /`EAI13-T007`/);
  assert.match(changed, new RegExp("`EAI13-T006`[^\\n]*" + cacheLimitTuple));
  assert.doesNotMatch(releasedV12, /`EAI13-T007`/);
  assert.doesNotMatch(releasedV12, /`EAI13-T006`/);
  assert.match(unreleased, /### Changed/);
});

test("completed provenance milestones do not regress to planned lifecycle wording", () => {
  assert.match(PROVENANCE_CONTRACT, /completed pre-v1\.3 governance revision `EAI13-T009`/);
  assert.match(PROVENANCE_CONTRACT, /ordered by `slug` by the canonical producer/);
  assert.match(PROVENANCE_CONTRACT, /T002 migrated the tracked canonical file/);
  assert.match(PROVENANCE_CONTRACT, /T003 enforces a three-way freshness invariant/);
  assert.match(PROVENANCE_CONTRACT, /T009 completed the pre-v1\.3 `index\.json\.data` shape/);
  assert.match(PROVENANCE_CONTRACT, /consumer-required `schema_version`, `content_commit`, and `data` fields/);
  assert.match(PROVENANCE_CONTRACT, /T002\/T003 enforce repository existence/);
  assert.match(PROVENANCE_CONTRACT, /The migration initialized every record as `UNVERIFIED`/);
  assert.match(PROVENANCE_CONTRACT, /the migration does not invent a fingerprint/);
  assert.match(PROVENANCE_CONTRACT, /T009 subsequently completed governance discovery and the public provenance endpoint/);

  assert.doesNotMatch(PROVENANCE_CONTRACT, /planned pre-v1\.3 governance revision/);
  assert.doesNotMatch(PROVENANCE_CONTRACT, /ordered by `slug` by the future producer/);
  assert.doesNotMatch(PROVENANCE_CONTRACT, /T003 must enforce/);
  assert.doesNotMatch(PROVENANCE_CONTRACT, /Before the first v1\.3 publication, T009 completes/);
  assert.doesNotMatch(PROVENANCE_CONTRACT, /The later browser adapter may accept/);
  assert.doesNotMatch(PROVENANCE_CONTRACT, /belong to T002\/T003/);
  assert.doesNotMatch(PROVENANCE_CONTRACT, /Migration starts every record/);
  assert.doesNotMatch(PROVENANCE_CONTRACT, /migration must not invent a fingerprint/);
  assert.doesNotMatch(PROVENANCE_CONTRACT, /T004 owns the producer\/consumer migration/);
});
