import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { once } from "node:events";

import {
  CSP_REPORT_ONLY_HEADER_NAME,
  serializeCspPolicy,
} from "./csp.mjs";
import {
  createCspPreviewServer,
  normalizeServeBase,
} from "../serve-csp.mjs";

test("normalizeServeBase canonicalizes root and repository prefixes", () => {
  assert.equal(normalizeServeBase(""), "");
  assert.equal(normalizeServeBase("/"), "");
  assert.equal(normalizeServeBase("repo/"), "/repo");
  assert.equal(normalizeServeBase("/repo///"), "/repo");
});

test("CSP preview injects the real report-only response header under repo base", async () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), "eai-csp-preview-"));
  fs.writeFileSync(path.join(dist, "index.html"), "<!doctype html><title>home</title>");
  fs.writeFileSync(path.join(dist, "404.html"), "<!doctype html><title>missing</title>");
  fs.mkdirSync(path.join(dist, "assets"));
  fs.writeFileSync(path.join(dist, "assets", "app.js"), "globalThis.loaded = true;\n");

  const server = createCspPreviewServer({ dist, base: "/repo" });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;

  try {
    const home = await fetch(`${origin}/repo/`);
    assert.equal(home.status, 200);
    assert.equal(home.headers.get(CSP_REPORT_ONLY_HEADER_NAME), serializeCspPolicy());
    assert.equal(home.headers.get("cache-control"), "no-store");
    assert.match(await home.text(), /<title>home<\/title>/);

    const script = await fetch(`${origin}/repo/assets/app.js`);
    assert.equal(script.status, 200);
    assert.match(script.headers.get("content-type"), /^text\/javascript/);
    assert.equal(script.headers.get(CSP_REPORT_ONLY_HEADER_NAME), serializeCspPolicy());

    const missing = await fetch(`${origin}/repo/missing/`);
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /<title>missing<\/title>/);

    const outside = await fetch(`${origin}/outside/`);
    assert.equal(outside.status, 404);
    assert.equal(await outside.text(), "Not found");

    const redirect = await fetch(`${origin}/repo?q=1`, { redirect: "manual" });
    assert.equal(redirect.status, 308);
    assert.equal(redirect.headers.get("location"), "/repo/?q=1");
  } finally {
    server.close();
    await once(server, "close");
    fs.rmSync(dist, { recursive: true, force: true });
  }
});
