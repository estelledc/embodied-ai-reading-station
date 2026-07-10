import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import "./markdown.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

test("Markdown links allow only http, https, mailto, and same-site relative URLs", () => {
  for (const href of [
    "https://example.com/paper?a=1&b=2",
    "http://example.com/paper",
    "mailto:reader@example.com",
    "/papers/clip/",
    "../guide/ch01/",
    "papers/clip/",
    "#method",
    "?q=clip",
  ]) {
    const html = marked.parse(`[safe](${href})`);
    assert.match(html, /<a href=/, `expected allowed href: ${href}`);
  }

  for (const href of [
    "javascript:alert(1)",
    "data:text/html,<svg/onload=alert(1)>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "//evil.example/payload",
    "java\tscript:alert(1)",
    "javascript&#58;alert(1)",
    "java&Tab;script:alert(1)",
  ]) {
    const html = marked.parse(`[unsafe](${href})`);
    assert.doesNotMatch(html, /<a\b/, `expected rejected href: ${JSON.stringify(href)}`);
    assert.match(html, /unsafe/);
  }
});

test("Markdown link attributes are escaped without flattening inline label markup", () => {
  const html = marked.parse(`[*safe*](https://example.com/?a=1&b=2 'x" onmouseover="alert(1)')`);

  assert.match(html, /<em>safe<\/em>/);
  assert.match(html, /href="https:\/\/example\.com\/\?a=1&amp;b=2"/);
  assert.match(html, /title="x&quot; onmouseover=&quot;alert\(1\)"/);
  assert.doesNotMatch(html, /\sonmouseover="alert\(1\)"/);
});

test("Markdown image attributes and captions are escaped, and active protocols are rejected", () => {
  const html = marked.parse(`![" onerror="alert(1)](https://example.com/a.png 'x" onload="alert(2)')`);
  assert.match(html, /alt="&quot; onerror=&quot;alert\(1\)"/);
  assert.match(html, /title="x&quot; onload=&quot;alert\(2\)"/);
  assert.doesNotMatch(html, /\sonerror="alert\(1\)"/);
  assert.doesNotMatch(html, /\sonload="alert\(2\)"/);

  for (const href of ["javascript:alert(1)", "data:image/svg+xml,<svg/onload=alert(1)>", "//evil.example/a.png"]) {
    const rejected = marked.parse(`![visible alt](${href})`);
    assert.doesNotMatch(rejected, /<img\b/, `expected rejected image href: ${href}`);
    assert.match(rejected, /visible alt/);
  }
});

test("the repository keeps exactly the approved TensorFlow Playground iframe", () => {
  const roots = ["notes", "guide", "site/content"];
  const found = [];
  for (const relativeRoot of roots) {
    const dir = path.join(ROOT, relativeRoot);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const relative = path.join(relativeRoot, entry.name);
      const raw = fs.readFileSync(path.join(ROOT, relative), "utf8");
      for (const match of raw.matchAll(/<iframe\b[^>]*><\/iframe>/gi)) {
        found.push({ relative, tag: match[0] });
      }
    }
  }

  assert.equal(found.length, 1);
  assert.equal(found[0].relative, "site/content/prerequisites.md");
  const src = found[0].tag.match(/\bsrc="([^"]+)"/i)?.[1];
  assert.ok(src);
  const parsed = new URL(src);
  assert.equal(parsed.origin, "https://playground.tensorflow.org");
  assert.equal(parsed.pathname, "/");
  assert.match(found[0].tag, /\bloading="lazy"/);
  assert.doesNotMatch(found[0].tag, /\s(?:srcdoc|on[a-z]+)\s*=/i);

  const rendered = marked.parse(found[0].tag);
  assert.match(rendered, /^<iframe\b/);
  assert.match(rendered, /playground\.tensorflow\.org/);
});
