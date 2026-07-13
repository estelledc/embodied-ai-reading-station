import { test } from "node:test";
import assert from "node:assert/strict";

import {
  collectRouteImagePaths,
  evaluateRouteImageBudget,
  measureRouteImageBudget,
  normalizeRouteHtmlForBase,
} from "./route-budget.mjs";

const ROOT_HTML = `<!doctype html>
<link rel="preload" as="image" href="/images/hero.webp">
<link rel="icon" href="/favicon.svg">
<picture>
  <source srcset="/images/hero-800.webp 800w, /images/hero.webp 1600w">
  <img src="/images/hero.webp" alt="">
</picture>
<picture>
  <source srcset="/images/card-800.webp 800w, /images/card.webp 1600w">
  <img src="/images/card.webp?rev=1#crop" alt="">
</picture>
<div style="background-image: url('/images/card.webp')"></div>
<img src="data:image/gif;base64,AAAA" alt="">`;

const SIZES = new Map([
  ["images/card-800.webp", 80],
  ["images/card.webp", 160],
  ["images/hero-800.webp", 100],
  ["images/hero.webp", 200],
]);

function sizeOf(relativePath) {
  return SIZES.get(relativePath) ?? null;
}

test("root route separates default requests from all declared srcset candidates", () => {
  const inventory = collectRouteImagePaths(ROOT_HTML, { base: "" });

  assert.deepEqual(inventory.defaultPaths, [
    "images/card.webp",
    "images/hero.webp",
  ]);
  assert.deepEqual(inventory.candidatePaths, [
    "images/card-800.webp",
    "images/card.webp",
    "images/hero-800.webp",
    "images/hero.webp",
  ]);
  assert.deepEqual(inventory.invalidUrls, []);
  assert.deepEqual(inventory.defaultRequests.map(request => request.requestKey), [
    "images/card.webp",
    "images/card.webp?rev=1",
    "images/hero.webp",
  ]);

  const metrics = measureRouteImageBudget(ROOT_HTML, { base: "", readAssetSize: sizeOf });
  assert.equal(metrics.requestCount, 3);
  assert.equal(metrics.totalBytes, 520);
  assert.equal(metrics.candidateCount, 5);
  assert.equal(metrics.candidateBytes, 700);
  assert.deepEqual(metrics.missingPaths, []);
});

test("repository base produces the same canonical inventory and metrics", () => {
  const repoHtml = ROOT_HTML.replaceAll(
    "/images/",
    "/embodied-ai-reading-station/images/",
  );

  const metrics = measureRouteImageBudget(repoHtml, {
    base: "/embodied-ai-reading-station",
    readAssetSize: sizeOf,
  });

  assert.deepEqual(metrics.candidatePaths, [...SIZES.keys()].sort());
  assert.equal(metrics.requestCount, 3);
  assert.equal(metrics.totalBytes, 520);
  assert.equal(metrics.candidateCount, 5);
  assert.equal(metrics.candidateBytes, 700);
  assert.deepEqual(metrics.invalidUrls, []);
});

test("SITE_BASE normalization makes root and repository HTML byte-equivalent", () => {
  const external = "https://host.example/embodied-ai-reading-station/reference";
  const literal = "literal /embodied-ai-reading-station text";
  const rootHtml = `<p>${literal}</p><a href="${external}">external</a><div data-base=""></div><a href="/papers/clip/"><source srcset="/images/clip-800.webp 800w, /images/clip.webp 1600w"><img src="/images/clip.webp"></a>`;
  const repoHtml = `<p>${literal}</p><a href="${external}">external</a><div data-base="/embodied-ai-reading-station"></div><a href="/embodied-ai-reading-station/papers/clip/"><source srcset="/embodied-ai-reading-station/images/clip-800.webp 800w, /embodied-ai-reading-station/images/clip.webp 1600w"><img src="/embodied-ai-reading-station/images/clip.webp"></a>`;

  assert.equal(normalizeRouteHtmlForBase(rootHtml, { base: "" }), rootHtml);
  assert.equal(
    normalizeRouteHtmlForBase(repoHtml, { base: "/embodied-ai-reading-station" }),
    rootHtml,
  );
  assert.equal(
    Buffer.byteLength(normalizeRouteHtmlForBase(repoHtml, { base: "/embodied-ai-reading-station" })),
    Buffer.byteLength(rootHtml),
  );
  const normalized = normalizeRouteHtmlForBase(repoHtml, { base: "/embodied-ai-reading-station" });
  assert.match(normalized, new RegExp(external.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(normalized, /literal \/embodied-ai-reading-station text/);
});

test("query variants are distinct requests while fragments and disk reads are deduplicated", () => {
  const html = `
    <img src="/images/card.webp?v=1#first">
    <img src="/images/card.webp?v=2#second">
    <img src="/images/card.webp?v=1#duplicate">
  `;
  let diskReads = 0;
  const metrics = measureRouteImageBudget(html, {
    readAssetSize(relativePath) {
      assert.equal(relativePath, "images/card.webp");
      diskReads++;
      return 160;
    },
  });

  assert.deepEqual(metrics.defaultRequests.map(request => request.requestKey), [
    "images/card.webp?v=1",
    "images/card.webp?v=2",
  ]);
  assert.deepEqual(metrics.defaultPaths, ["images/card.webp"]);
  assert.equal(metrics.requestCount, 2);
  assert.equal(metrics.totalBytes, 320);
  assert.equal(diskReads, 1);
});

test("HTTP(S) and protocol-relative images fail closed while data/blob URLs are ignored", () => {
  const html = `
    <img src="https://cdn.example.test/a.webp">
    <source srcset="http://cdn.example.test/b.webp 800w, //cdn.example.test/c.webp 1600w">
    <img src="data:image/gif;base64,AAAA">
    <video poster="blob:https://route.invalid/id"></video>
  `;
  const metrics = measureRouteImageBudget(html, { readAssetSize: () => 1 });
  const result = evaluateRouteImageBudget(metrics, {
    maxRequests: 10,
    maxBytes: 100,
    maxCandidates: 10,
    maxCandidateBytes: 100,
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors.map(error => error.code), ["INVALID_LOCAL_IMAGE_URL"]);
  assert.equal(metrics.invalidUrls.length, 3);
  assert.equal(metrics.requestCount, 0);
});

test("extensionless image references are measured and missing assets fail closed", () => {
  const metrics = measureRouteImageBudget('<img src="/media?id=hero">', {
    readAssetSize: () => null,
  });
  const result = evaluateRouteImageBudget(metrics, {
    maxRequests: 10,
    maxBytes: 100,
    maxCandidates: 10,
    maxCandidateBytes: 100,
  });

  assert.deepEqual(metrics.defaultRequests, [{ requestKey: "media?id=hero", assetPath: "media" }]);
  assert.deepEqual(metrics.missingPaths, ["media"]);
  assert.deepEqual(result.errors.map(error => error.code), ["MISSING_IMAGE_ASSET"]);
});

test("wrong-base and traversal image URLs fail closed", () => {
  const html = `
    <img src="/images/root-leak.webp">
    <img src="/embodied-ai-reading-station/../escape.webp">
  `;
  const metrics = measureRouteImageBudget(html, {
    base: "/embodied-ai-reading-station",
    readAssetSize: () => 1,
  });
  const result = evaluateRouteImageBudget(metrics, {
    maxRequests: 10,
    maxBytes: 100,
    maxCandidates: 10,
    maxCandidateBytes: 100,
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors.map(error => error.code), ["INVALID_LOCAL_IMAGE_URL"]);
  assert.equal(metrics.invalidUrls.length, 2);
});

test("missing referenced files fail before numeric budgets", () => {
  const metrics = measureRouteImageBudget('<img src="/images/missing.webp">', {
    readAssetSize: () => null,
  });
  const result = evaluateRouteImageBudget(metrics, {
    maxRequests: 10,
    maxBytes: 100,
    maxCandidates: 10,
    maxCandidateBytes: 100,
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors.map(error => error.code), ["MISSING_IMAGE_ASSET"]);
  assert.deepEqual(metrics.missingPaths, ["images/missing.webp"]);
});

test("default request and declared candidate ceilings have independent PASS/FAIL coverage", () => {
  const metrics = measureRouteImageBudget(ROOT_HTML, { readAssetSize: sizeOf });

  const passingBudget = {
    maxRequests: 3,
    maxBytes: 520,
    maxCandidates: 5,
    maxCandidateBytes: 700,
  };
  assert.equal(evaluateRouteImageBudget(metrics, passingBudget).ok, true);

  const requestFailure = evaluateRouteImageBudget(metrics, { ...passingBudget, maxRequests: 2 });
  assert.deepEqual(requestFailure.errors.map(error => error.code), ["IMAGE_REQUEST_BUDGET_EXCEEDED"]);

  const byteFailure = evaluateRouteImageBudget(metrics, { ...passingBudget, maxBytes: 519 });
  assert.deepEqual(byteFailure.errors.map(error => error.code), ["IMAGE_BYTE_BUDGET_EXCEEDED"]);

  const candidateFailure = evaluateRouteImageBudget(metrics, { ...passingBudget, maxCandidates: 4 });
  assert.deepEqual(candidateFailure.errors.map(error => error.code), ["IMAGE_CANDIDATE_BUDGET_EXCEEDED"]);

  const candidateByteFailure = evaluateRouteImageBudget(metrics, { ...passingBudget, maxCandidateBytes: 699 });
  assert.deepEqual(candidateByteFailure.errors.map(error => error.code), ["IMAGE_CANDIDATE_BYTE_BUDGET_EXCEEDED"]);
});
