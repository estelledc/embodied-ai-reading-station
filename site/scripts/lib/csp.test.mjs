import test from "node:test";
import assert from "node:assert/strict";

import {
  CSP_PRODUCTION_STATUS,
  CSP_REPORT_ONLY_HEADER_NAME,
  CSP_REPORT_ONLY_POLICY,
  CSP_STYLE_ATTRIBUTE_BUDGET,
  assertCspReadyHtml,
  assertHtmlSecurity,
  createCspReportOnlyManifest,
  decodeHtmlAttributeValue,
  digestStyleValues,
  hasUnresolvedHtmlAttributeEntity,
  isCspSafeCssReference,
  isCspSelfReference,
  scanCssResourcePolicy,
  scanHtmlResourcePolicy,
  scanHtmlSecurity,
  scanRuntimeStyleSinks,
  serializeCspPolicy,
} from "./csp.mjs";

const EXPECTED_POLICY = "default-src 'none'; base-uri 'none'; object-src 'none'; "
  + "script-src 'self' 'wasm-unsafe-eval'; script-src-attr 'none'; "
  + "style-src 'self'; style-src-elem 'self'; style-src-attr 'unsafe-inline'; "
  + "img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; "
  + "frame-src https://playground.tensorflow.org; worker-src 'self'; "
  + "manifest-src 'self'; form-action 'self'; frame-ancestors 'none'";

test("canonical report-only policy serializes exactly", () => {
  assert.equal(CSP_REPORT_ONLY_HEADER_NAME, "Content-Security-Policy-Report-Only");
  assert.equal(CSP_PRODUCTION_STATUS, "NOT_APPLIED");
  assert.equal(serializeCspPolicy(), EXPECTED_POLICY);
  assert.deepEqual(CSP_REPORT_ONLY_POLICY["script-src"], ["'self'", "'wasm-unsafe-eval'"]);
  assert.deepEqual(CSP_REPORT_ONLY_POLICY["style-src"], ["'self'"]);
  assert.deepEqual(CSP_REPORT_ONLY_POLICY["style-src-elem"], ["'self'"]);
  assert.deepEqual(CSP_REPORT_ONLY_POLICY["style-src-attr"], ["'unsafe-inline'"]);
  assert.ok(Object.isFrozen(CSP_REPORT_ONLY_POLICY));
  assert.ok(Object.isFrozen(CSP_REPORT_ONLY_POLICY["script-src"]));
});

test("serializer rejects wildcards, unsafe-eval, broad schemes, and inline script", () => {
  assert.throws(
    () => serializeCspPolicy({ "script-src": ["'self'", "*"] }),
    /wildcards are forbidden/,
  );
  assert.throws(
    () => serializeCspPolicy({ "script-src": ["'self'", "'unsafe-eval'"] }),
    /unsafe-eval is forbidden/,
  );
  assert.throws(
    () => serializeCspPolicy({ "script-src": ["'self'", "https:"] }),
    /scheme-wide sources are forbidden/,
  );
  assert.throws(
    () => serializeCspPolicy({ "script-src": ["'self'", "'unsafe-inline'"] }),
    /unsafe-inline is only approved for style-src-attr/,
  );
  assert.throws(
    () => serializeCspPolicy({ "script-src": ["'self'"] }),
    /exactly 'self' plus 'wasm-unsafe-eval'/,
  );
  assert.throws(
    () => serializeCspPolicy({
      "script-src": ["'self'", "'wasm-unsafe-eval'"],
      "style-src": ["'self' 'unsafe-inline'"],
    }),
    /invalid source/,
  );
});

test("manifest injects a machine-verifiable style budget without guessing it", () => {
  const manifest = createCspReportOnlyManifest({
    styleBudget: {
      maxAttributeCount: 17,
      maxUniqueValueCount: 4,
      uniqueValueSha256: "a".repeat(64),
      sourceSymbols: ["views.graph", "layout.masthead", "views.graph"],
    },
  });

  assert.equal(manifest.schema_version, "1.0.0");
  assert.equal(manifest.mode, "report-only");
  assert.equal(manifest.production_status, "NOT_APPLIED");
  assert.deepEqual(manifest.delivery, {
    required_transport: "HTTP_RESPONSE_HEADER",
    github_pages: "NOT_APPLIED",
    local_preview_command: "npm run serve:csp",
  });
  assert.deepEqual(manifest.header, {
    name: CSP_REPORT_ONLY_HEADER_NAME,
    value: EXPECTED_POLICY,
  });
  assert.deepEqual(manifest.runtime_violation_budget, { normal_flows: 0 });
  assert.deepEqual(manifest.approved_exceptions.map(item => item.id), [
    "STYLE_ATTR_V1",
    "PAGEFIND_WASM_V1",
    "SVG_EXPORT_BLOB_V1",
    "CSS_DATA_IMAGE_V1",
    "TENSORFLOW_PLAYGROUND_V1",
  ]);
  assert.deepEqual(manifest.approved_exceptions[0].limits, {
    maxAttributeCount: 17,
    maxUniqueValueCount: 4,
    uniqueValueSha256: "a".repeat(64),
    sourceSymbols: ["layout.masthead", "views.graph"],
    runtimeSinks: [],
  });
  assert.ok(Object.isFrozen(manifest));
  assert.ok(Object.isFrozen(manifest.approved_exceptions));

  const repoManifest = createCspReportOnlyManifest({
    styleBudget: CSP_STYLE_ATTRIBUTE_BUDGET,
    base: "/embodied-ai-reading-station",
  });
  assert.equal(
    repoManifest.delivery.local_preview_command,
    "npm run serve:csp -- --base /embodied-ai-reading-station",
  );
  assert.throws(
    () => createCspReportOnlyManifest({ styleBudget: CSP_STYLE_ATTRIBUTE_BUDGET, base: "../repo" }),
    /manifest base/,
  );
  for (const unsafeBase of ["/repo;id", "/repo&&id", "/repo|id", "/repo$(id)", "/repo`id`"] ) {
    assert.throws(
      () => createCspReportOnlyManifest({ styleBudget: CSP_STYLE_ATTRIBUTE_BUDGET, base: unsafeBase }),
      /manifest base/,
    );
  }
});

test("manifest rejects unresolved or incoherent style budgets", () => {
  assert.throws(() => createCspReportOnlyManifest(), /styleBudget is required/);
  assert.throws(
    () => createCspReportOnlyManifest({
      styleBudget: { maxAttributeCount: -1, maxUniqueValueCount: 0, uniqueValueSha256: "a".repeat(64), sourceSymbols: ["x"] },
    }),
    /maxAttributeCount/,
  );
  assert.throws(
    () => createCspReportOnlyManifest({
      styleBudget: { maxAttributeCount: 1, maxUniqueValueCount: 2, uniqueValueSha256: "a".repeat(64), sourceSymbols: ["x"] },
    }),
    /cannot exceed/,
  );
  assert.throws(
    () => createCspReportOnlyManifest({
      styleBudget: { maxAttributeCount: 1, maxUniqueValueCount: 1, uniqueValueSha256: "a".repeat(64), sourceSymbols: [] },
    }),
    /sourceSymbols/,
  );
});

test("frozen production style budget binds the exact migrated inventory", () => {
  assert.equal(CSP_STYLE_ATTRIBUTE_BUDGET.maxAttributeCount, 4760);
  assert.equal(CSP_STYLE_ATTRIBUTE_BUDGET.maxUniqueValueCount, 208);
  assert.match(CSP_STYLE_ATTRIBUTE_BUDGET.uniqueValueSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(CSP_STYLE_ATTRIBUTE_BUDGET.runtimeSinks.map(sink => sink.source), [
    "deck/deck.js",
    "src/graph.js",
    "src/link-preview.js",
    "src/outline.js",
    "src/quick-filter.js",
    "src/reading-progress.js",
    "src/svg-export.js",
  ]);
  assert.ok(CSP_STYLE_ATTRIBUTE_BUDGET.runtimeSinks.every(sink => (
    sink.expectedMatches > 0 && sink.properties.length > 0 && sink.reason.length > 0
  )));
  assert.equal(digestStyleValues(["a", "b", "a"]), digestStyleValues(["b", "a"]));
  assert.equal(
    digestStyleValues(["width:5.0%;background:var(--olive)"]),
    digestStyleValues(["width:5.3%;background:var(--olive)"]),
  );
  assert.notEqual(
    digestStyleValues(["width:5.0%;background:var(--olive)"]),
    digestStyleValues(["width:5.0%;background:var(--coral)"]),
  );
  assert.notEqual(
    digestStyleValues(["width:5.0%;background:var(--olive)"]),
    digestStyleValues(["width:105.0%;background:var(--olive)"]),
  );
  assert.throws(() => digestStyleValues(["a", 1]), /string array/);
});

test("runtime style scanner identifies assignments, setProperty, D3, and detached SVG sinks", () => {
  const inventory = scanRuntimeStyleSinks(`
    node.style.transformOrigin = "center";
    badge.style.setProperty("--p", value);
    selection.style("opacity", 0.5);
    clone.setAttribute("style", fixedTokens);
  `, { sourceName: "fixture.js" });
  assert.equal(inventory.source, "fixture.js");
  assert.equal(inventory.count, 4);
  assert.deepEqual(inventory.properties, [
    "--p",
    "detached-svg-token-block",
    "opacity",
    "transform-origin",
  ]);
  assert.deepEqual(inventory.unrecognized, []);
});

test("runtime style scanner fails closed on computed and dynamic style APIs", () => {
  const inventory = scanRuntimeStyleSinks(`
    node["style"].color = "red";
    node.style[name] = value;
    node.style.setProperty(name, value);
    Object.assign(node.style, values);
    node.setAttribute(dynamicName, value);
    node.setAttribute("STYLE", "color:red");
    node.setAttributeNS(null, "style", payload);
    node.getAttributeNode("style").value = payload;
    node.setAttribute("st" + "yle", payload);
    node.setAttribute?.("style", payload);
    node.setAttribute /* comment */ ("style", payload);
    node.setAttribute("st\\u0079le", payload);
    node.setAttribute("\\x73tyle", payload);
    node.setAttributeNS(null, dynamicName, payload);
    node.getAttributeNode(dynamicName).value = payload;
  `);
  assert.equal(inventory.sinks.some(sink => sink.kind === "style-attribute"), true);
  assert.ok(inventory.unrecognized.length >= 5);
  assert.deepEqual(
    [...new Set(inventory.unrecognized.map(item => item.kind))].sort(),
    [
      "attribute-node-api",
      "computed-style-api",
      "dynamic-attribute-name",
      "namespaced-attribute-api",
      "unrecognized-style-api",
    ],
  );
});

test("HTML attribute decoder exposes encoded active URL schemes", () => {
  assert.equal(decodeHtmlAttributeValue("java&#x73;cript:alert(1)"), "javascript:alert(1)");
  assert.equal(decodeHtmlAttributeValue("https&#58;//evil.example"), "https://evil.example");
  assert.equal(decodeHtmlAttributeValue("java&Tab;script&colon;alert(1)"), "java\tscript:alert(1)");
  assert.equal(
    decodeHtmlAttributeValue("https&colon;&sol;&sol;evil.example"),
    "https://evil.example",
  );
  assert.equal(hasUnresolvedHtmlAttributeEntity("/safe?a=1&amp;b=2"), false);
  assert.equal(hasUnresolvedHtmlAttributeEntity("/unsafe&UnknownEntity;"), true);
  assert.equal(isCspSelfReference("/safe?a=1&amp;b=2"), true);
  assert.equal(isCspSelfReference("https&colon;&sol;&sol;evil.example"), false);
  assert.equal(isCspSelfReference("/unsafe&UnknownEntity;"), false);
  assert.equal(isCspSafeCssReference("/images/safe.webp"), true);
  assert.equal(isCspSafeCssReference("https\\3a //evil.example/x"), false);
  assert.equal(isCspSafeCssReference("h\\74tps://evil.example/x"), false);
});

test("CSS scanner rejects escaped entry points, external URLs, and data imports", () => {
  assert.equal(scanCssResourcePolicy(`
    /* Pagefind explains its #\\# specificity selector here. */
    :is(*, #\\#):is(*, #\\#) .safe::before { content: "\\2937  "; }
    .safe { background: url("data:image/svg+xml,safe"); }
    @font-face { src: url('/fonts/safe.woff2'); }
  `).ready, true);
  for (const css of [
    `.bad { background: url("https://evil.example/x.png"); }`,
    `@import url("data:text/css,bad");`,
    `u\\72l("https://evil.example/x.png")`,
    `@\\69mport "https://evil.example/x.css"`,
  ]) {
    const inventory = scanCssResourcePolicy(css, { source: "fixture.css" });
    assert.equal(inventory.ready, false, css);
    assert.ok(inventory.unexpectedResources.length >= 1, css);
  }
});

test("resource scanner uses parsed attributes and fails closed on encoded or SVG script URLs", () => {
  const html = `
    <script data-note='src="/safe.js"' src="https://evil.example/x.js"></script>
    <svg><script href="https&colon;&sol;&sol;evil.example/svg.js"></script></svg>
    <link rel="stylesheet" href="/styles.css">
    <img src="data:image/svg+xml,ok" alt="fixture">
    <iframe src="https://playground.tensorflow.org/#activation=tanh"></iframe>
  `;
  const inventory = scanHtmlSecurity(html, { source: "resources.html" });
  assert.equal(inventory.ready, true);
  const resources = scanHtmlResourcePolicy(inventory);
  assert.equal(resources.ready, false);
  assert.equal(resources.unexpectedResources.length, 2);
  assert.match(resources.unexpectedResources[0], /script src https:\/\/evil\.example\/x\.js/);
  assert.match(resources.unexpectedResources[1], /script href https&colon;&sol;&sol;evil\.example/);
  assert.deepEqual(resources.iframeOrigins, ["https://playground.tensorflow.org"]);
});

test("resource scanner covers preload srcsets, pings, forms, frames, and media directives", () => {
  const resources = scanHtmlResourcePolicy(`
    <link rel="modulepreload" href="https://evil.example/module.js">
    <link rel="preload" as="image" imagesrcset="https://evil.example/a.png 1x">
    <a href="/safe" ping="https://evil.example/ping">safe</a>
    <form action="https://evil.example/submit"></form>
    <button formaction="https://evil.example/button">submit</button>
    <input type="im&#x61;ge" src="https://evil.example/input.png">
    <frame src="https://evil.example/frame"></frame>
    <video src="https://evil.example/movie.mp4"><source src="/movie-alt.mp4"></video>
    <audio src="https://evil.example/sound.mp3"></audio>
    <track src="https://evil.example/captions.vtt">
    <picture><source srcset="/safe.webp 1x"><img src="/safe.png"></picture>
  `, { source: "network-entrypoints.html" });
  assert.equal(resources.ready, false);
  assert.equal(resources.unexpectedResources.length, 11);
  assert.deepEqual(resources.iframeOrigins, ["https://evil.example"]);
  assert.match(resources.unexpectedResources.join("\n"), /link imagesrcset https:\/\/evil\.example\/a\.png/);
  assert.match(resources.unexpectedResources.join("\n"), /a ping https:\/\/evil\.example\/ping/);
  assert.match(resources.unexpectedResources.join("\n"), /input resource https:\/\/evil\.example\/input\.png/);
  assert.match(resources.unexpectedResources.join("\n"), /unapproved video source \/movie-alt\.mp4/);
});

test("HTML scanner allows only inert JSON blocks and inventories bounded style attributes", () => {
  const html = `<!doctype html>
  <html><head>
    <script type="application/ld+json">{"name":"demo"}</script>
    <script type='application/json'>{"items":[]}</script>
    <script src="/app.js" defer></script>
  </head><body>
    <!-- <button onclick="ignored()"><style>ignored</style> -->
    <main style="color:var(--ink)"><p style='color:var(--ink)'>safe</p></main>
  </body></html>`;

  const inventory = scanHtmlSecurity(html, { source: "clean.html" });
  assert.equal(inventory.ready, true);
  assert.equal(inventory.eventHandlers.length, 0);
  assert.equal(inventory.executableInlineScripts.length, 0);
  assert.equal(inventory.inertInlineScripts.length, 2);
  assert.deepEqual(inventory.inertInlineScripts.map(script => script.type), [
    "application/ld+json",
    "application/json",
  ]);
  assert.equal(inventory.inlineStyleElements.length, 0);
  assert.equal(inventory.styleAttributes.count, 2);
  assert.equal(inventory.styleAttributes.uniqueValueCount, 1);
  assert.equal(assertHtmlSecurity(inventory), inventory);
  assert.equal(assertCspReadyHtml(html).ready, true);
});

test("HTML scanner rejects event handlers, executable inline blocks, and style elements", () => {
  const html = `<html><head>
    <style>body { color: red }</style>
    <script type="module">globalThis.started = true;</script>
  </head><body OnClick="run()">
    <img src="/x.png" onload=ready()>
  </body></html>`;

  const inventory = scanHtmlSecurity(html, { source: "unsafe.html" });
  assert.equal(inventory.ready, false);
  assert.deepEqual(inventory.eventHandlers.map(item => item.attribute), ["onclick", "onload"]);
  assert.equal(inventory.executableInlineScripts.length, 1);
  assert.equal(inventory.executableInlineScripts[0].type, "module");
  assert.equal(inventory.inlineStyleElements.length, 1);
  assert.throws(
    () => assertHtmlSecurity(inventory),
    error => error.code === "CSP_HTML_INVENTORY"
      && /2 inline event handler/.test(error.message)
      && error.inventory === inventory,
  );
});

test("HTML scanner rejects javascript URLs without confusing comments", () => {
  const inventory = scanHtmlSecurity(`<!-- <a href="javascript:ignored()"> -->
    <a href=" JAVASCRIPT:alert(1)">unsafe</a>
    <a href="java&#x73;cript:alert(2)">encoded</a>
    <a href="java&Tab;script&colon;alert(3)">split</a>`);
  assert.equal(inventory.ready, false);
  assert.equal(inventory.javascriptUrls.length, 3);
  assert.throws(() => assertHtmlSecurity(inventory), /3 javascript URL/);
});

test("HTML scanner rejects applet, base, object, and embed elements", () => {
  const inventory = scanHtmlSecurity(`
    <applet code="payload.class"></applet>
    <base href="https&#58;//evil.example/">
    <object data="/payload"></object>
    <embed src="/payload">
    <iframe srcdoc="&lt;script>run()&lt;/script>"></iframe>
  `);
  assert.equal(inventory.ready, false);
  assert.deepEqual(inventory.forbiddenElements.map(item => item.tag), ["applet", "base", "object", "embed"]);
  assert.equal(inventory.embeddedDocuments.length, 1);
  assert.throws(
    () => assertHtmlSecurity(inventory),
    /4 forbidden applet\/base\/object\/embed element\(s\), 1 iframe srcdoc document/,
  );
});

test("HTML scanner rejects unresolved entities in active URL attributes", () => {
  const inventory = scanHtmlSecurity(`<script src="/asset&UnknownEntity;"></script>`);
  assert.equal(inventory.ready, false);
  assert.equal(inventory.ambiguousUrlEntities.length, 1);
  assert.throws(() => assertHtmlSecurity(inventory), /1 ambiguous URL entity reference/);
});

test("inline content attached to an external script is rejected as ambiguous", () => {
  const inventory = scanHtmlSecurity(
    `<script src="/app.js">alert("must not hide here")</script>`,
  );
  assert.equal(inventory.executableInlineScripts.length, 1);
  assert.equal(inventory.executableInlineScripts[0].hasSrc, true);
  assert.equal(inventory.ready, false);
});
