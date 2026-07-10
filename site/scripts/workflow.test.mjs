import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const deploy = fs.readFileSync(path.join(ROOT, ".github", "workflows", "deploy.yml"), "utf8");
const pullRequest = fs.readFileSync(path.join(ROOT, ".github", "workflows", "pr.yml"), "utf8");
const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");

test("PR workflow validates both root and repository-base builds without deployment", () => {
  assert.match(pullRequest, /^\s*pull_request:\s*$/m);
  assert.match(pullRequest, /run: npm test/);
  assert.match(pullRequest, /SITE_BASE: \/\$\{\{ github\.event\.repository\.name \}\}/);
  assert.match(pullRequest, /run: npm run check/);
  assert.match(pullRequest, /npm audit .*--audit-level=high/);
  assert.doesNotMatch(pullRequest, /upload-pages-artifact|deploy-pages|pages:\s*write|id-token:\s*write/);
});

test("workflows derive SOURCE_DATE_EPOCH from the checked-out commit", () => {
  for (const workflow of [deploy, pullRequest]) {
    assert.match(workflow, /git show -s --format=%ct HEAD/);
    assert.match(workflow, /SOURCE_DATE_EPOCH=\$epoch/);
  }
});

test("Pages permissions are scoped to the deploy job", () => {
  const buildSection = deploy.slice(deploy.indexOf("  build:"), deploy.indexOf("  deploy:"));
  const deploySection = deploy.slice(deploy.indexOf("  deploy:"));
  assert.match(pullRequest, /permissions: \{\}/);
  assert.match(pullRequest, /build:[\s\S]*permissions:\n\s+contents: read/);
  assert.match(buildSection, /permissions:\n\s+contents: read/);
  assert.doesNotMatch(buildSection, /pages: write|id-token: write/);
  assert.match(deploySection, /pages: write/);
  assert.match(deploySection, /id-token: write/);
  assert.match(deploySection, /if: github\.ref == 'refs\/heads\/main'/);
});

test("all workflow actions are pinned to full commit SHAs", () => {
  for (const workflow of [deploy, pullRequest]) {
    const refs = [...workflow.matchAll(/uses:\s*[^\s@]+@([^\s]+)/g)].map(match => match[1]);
    assert.ok(refs.length > 0);
    for (const ref of refs) assert.match(ref, /^[0-9a-f]{40}$/);
  }
});

test("README records the protected-main owner checklist", () => {
  assert.match(readme, /main.*Pull Request/);
  assert.match(readme, /Validate pull request \/ build/);
  assert.match(readme, /force-push/);
  assert.match(readme, /branch deletion/);
  assert.match(readme, /Pages environment.*main/);
});
