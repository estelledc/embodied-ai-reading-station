// Canonical report-only CSP contract, exception budget, and generated-HTML inventory.

import { createHash } from "node:crypto";

export const CSP_REPORT_ONLY_HEADER_NAME = "Content-Security-Policy-Report-Only";
export const CSP_PRODUCTION_STATUS = "NOT_APPLIED";

const INERT_SCRIPT_TYPES = new Set([
  "application/json",
  "application/ld+json",
]);
const ACTIVE_URL_ATTRIBUTES = new Set([
  "action",
  "formaction",
  "href",
  "imagesrcset",
  "ping",
  "poster",
  "src",
  "srcset",
  "xlink:href",
]);
const RESOURCE_CONTAINER_TAGS = new Set(["audio", "picture", "video"]);
const HTML_ATTRIBUTE_ENTITIES = Object.freeze({
  amp: "&",
  apos: "'",
  bsol: "\\",
  colon: ":",
  gt: ">",
  lt: "<",
  newline: "\n",
  nbsp: "\u00a0",
  period: ".",
  quot: '"',
  sol: "/",
  tab: "\t",
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

// Insertion order is the canonical serialization order. Keep source expressions exact:
// broad wildcards, scheme-wide sources, unsafe-eval, and inline script are forbidden.
export const CSP_REPORT_ONLY_POLICY = deepFreeze({
  "default-src": ["'none'"],
  "base-uri": ["'none'"],
  "object-src": ["'none'"],
  "script-src": ["'self'", "'wasm-unsafe-eval'"],
  "script-src-attr": ["'none'"],
  "style-src": ["'self'"],
  "style-src-elem": ["'self'"],
  "style-src-attr": ["'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:"],
  "font-src": ["'self'"],
  "connect-src": ["'self'"],
  "frame-src": ["https://playground.tensorflow.org"],
  "worker-src": ["'self'"],
  "manifest-src": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
});

function validatePolicy(policy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new TypeError("CSP policy must be an object of directive source arrays");
  }

  for (const [directive, sources] of Object.entries(policy)) {
    if (!/^[a-z][a-z0-9-]*$/.test(directive)) {
      throw new Error(`invalid CSP directive: ${directive}`);
    }
    if (!Array.isArray(sources) || sources.length === 0) {
      throw new Error(`CSP directive ${directive} must have at least one source`);
    }
    for (const source of sources) {
      if (typeof source !== "string" || source.length === 0 || /[;\s]/.test(source)) {
        throw new Error(`invalid source in CSP directive ${directive}`);
      }
      if (source.includes("*")) {
        throw new Error(`wildcards are forbidden in CSP directive ${directive}`);
      }
      if (source === "https:" || source === "http:") {
        throw new Error(`scheme-wide sources are forbidden in CSP directive ${directive}`);
      }
      if (source === "'unsafe-eval'") {
        throw new Error("unsafe-eval is forbidden by the CSP contract");
      }
      if (source === "'unsafe-inline'" && directive !== "style-src-attr") {
        throw new Error(`unsafe-inline is only approved for style-src-attr, not ${directive}`);
      }
    }
  }

  const scriptSources = policy["script-src"];
  if (
    !Array.isArray(scriptSources)
    || scriptSources.length !== 2
    || scriptSources[0] !== "'self'"
    || scriptSources[1] !== "'wasm-unsafe-eval'"
  ) {
    throw new Error("script-src must be exactly 'self' plus 'wasm-unsafe-eval'");
  }
}

export function serializeCspPolicy(policy = CSP_REPORT_ONLY_POLICY) {
  validatePolicy(policy);
  return Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");
}

export function decodeHtmlAttributeValue(value) {
  if (typeof value !== "string") throw new TypeError("HTML attribute value must be a string");
  return value
    .replace(/&#(?:x([0-9a-f]+)|([0-9]+));?/gi, (entity, hex, decimal) => {
      const codePoint = Number.parseInt(hex ?? decimal, hex === undefined ? 10 : 16);
      if (!Number.isSafeInteger(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) return "\uFFFD";
      try { return String.fromCodePoint(codePoint); } catch { return "\uFFFD"; }
    })
    .replace(/&([a-z]+)(;?)/gi, (entity, name, semicolon, offset, source) => {
      const normalizedName = name.toLowerCase();
      if (!Object.hasOwn(HTML_ATTRIBUTE_ENTITIES, normalizedName)) return entity;
      const next = source[offset + entity.length] || "";
      // HTML permits some named references without a semicolon. Decode a known
      // name only when it cannot consume a query parameter such as `&amp=1`.
      if (!semicolon && /[a-z0-9=]/i.test(next)) return entity;
      return HTML_ATTRIBUTE_ENTITIES[normalizedName];
    });
}

export function hasUnresolvedHtmlAttributeEntity(value) {
  const decoded = decodeHtmlAttributeValue(value);
  return decoded.includes("\uFFFD")
    || /&(?:#[a-z0-9]+|[a-z][a-z0-9]+);/i.test(decoded);
}

function normalizedActiveUrlProbe(value) {
  return decodeHtmlAttributeValue(value).replace(/[\u0000-\u0020\u007f-\u009f]/g, "");
}

function normalizeStyleBudget(styleBudget) {
  if (!styleBudget || typeof styleBudget !== "object" || Array.isArray(styleBudget)) {
    throw new TypeError("styleBudget is required");
  }
  const {
    maxAttributeCount,
    maxUniqueValueCount,
    uniqueValueSha256,
    sourceSymbols,
    runtimeSinks = [],
  } = styleBudget;
  if (!Number.isSafeInteger(maxAttributeCount) || maxAttributeCount < 0) {
    throw new TypeError("styleBudget.maxAttributeCount must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(maxUniqueValueCount) || maxUniqueValueCount < 0) {
    throw new TypeError("styleBudget.maxUniqueValueCount must be a non-negative safe integer");
  }
  if (maxUniqueValueCount > maxAttributeCount) {
    throw new RangeError("styleBudget.maxUniqueValueCount cannot exceed maxAttributeCount");
  }
  if (!/^[0-9a-f]{64}$/.test(uniqueValueSha256 ?? "")) {
    throw new TypeError("styleBudget.uniqueValueSha256 must be a lowercase SHA-256 digest");
  }
  if (
    !Array.isArray(sourceSymbols)
    || sourceSymbols.length === 0
    || sourceSymbols.some(symbol => typeof symbol !== "string" || symbol.trim() === "")
  ) {
    throw new TypeError("styleBudget.sourceSymbols must be a non-empty array of symbols");
  }
  if (!Array.isArray(runtimeSinks) || runtimeSinks.some(sink => (
    !sink || typeof sink !== "object" || Array.isArray(sink)
    || typeof sink.source !== "string" || sink.source.trim() === ""
    || !Number.isSafeInteger(sink.expectedMatches) || sink.expectedMatches < 1
    || !Array.isArray(sink.properties) || sink.properties.length === 0
    || sink.properties.some(property => typeof property !== "string" || property.trim() === "")
    || typeof sink.reason !== "string" || sink.reason.trim() === ""
  ))) {
    throw new TypeError("styleBudget.runtimeSinks must specifically name source, properties, and reason");
  }
  return {
    maxAttributeCount,
    maxUniqueValueCount,
    uniqueValueSha256,
    sourceSymbols: [...new Set(sourceSymbols.map(symbol => symbol.trim()))].sort(),
    runtimeSinks: runtimeSinks.map(sink => ({
      source: sink.source.trim(),
      expectedMatches: sink.expectedMatches,
      properties: [...new Set(sink.properties.map(property => property.trim()))].sort(),
      reason: sink.reason.trim(),
    })).sort((a, b) => a.source.localeCompare(b.source)),
  };
}

export function digestStyleValues(values) {
  if (!Array.isArray(values) || values.some(value => typeof value !== "string")) {
    throw new TypeError("style values must be a string array");
  }
  const canonical = [...new Set(values.map(value => (
    // buildAbout renders five storage-distribution bars from final artifact
    // bytes. SITE_BASE changes Pagefind bytes, so only their continuous width
    // is normalized; selector properties and the five approved colors remain
    // bound by the digest and exact unique-value count.
    value.replace(
      /^width:(?:100(?:\.0)?|(?:[0-9]|[1-9][0-9])(?:\.[0-9])?)%;(?=background:)/,
      "width:<percentage>%;",
    )
  )))].sort()
    .map(value => `${Buffer.byteLength(value, "utf8")}:${value}`)
    .join("\n");
  return createHash("sha256").update(canonical).digest("hex");
}

// This is an approved migration debt ceiling, not a blanket exemption. The exact
// count + unique-value digest makes additions/replacements fail closed. Any future
// reduction intentionally updates this budget in the same reviewed change.
export const CSP_STYLE_ATTRIBUTE_BUDGET = deepFreeze({
  maxAttributeCount: 4810,
  maxUniqueValueCount: 208,
  uniqueValueSha256: "4f44774865a4525792250af5c38834068a3f4a633dac47f9cec1287347d35e62",
  sourceSymbols: [
    "deck/deck.js",
    "deck/index.html",
    "scripts/lib/layout.mjs",
    "scripts/lib/views/aggregates.mjs",
    "scripts/lib/views/guide.mjs",
    "scripts/lib/views/learn.mjs",
    "scripts/lib/views/meta.mjs",
    "src/graph.js",
    "src/link-preview.js",
    "src/outline.js",
    "src/quick-filter.js",
    "src/reading-progress.js",
    "src/svg-export.js",
  ],
  runtimeSinks: [
    {
      source: "deck/deck.js",
      expectedMatches: 3,
      properties: ["transform", "transform-origin"],
      reason: "continuous slide index and viewport scale cannot be represented by a finite class set",
    },
    {
      source: "src/graph.js",
      expectedMatches: 20,
      properties: ["cursor", "left", "opacity", "pointer-events", "stroke", "top"],
      reason: "D3 interaction state and pointer-relative tooltip coordinates are continuous",
    },
    {
      source: "src/link-preview.js",
      expectedMatches: 2,
      properties: ["left", "top"],
      reason: "the preview follows pointer-relative viewport coordinates",
    },
    {
      source: "src/outline.js",
      expectedMatches: 5,
      properties: ["--p", "cursor", "position", "transform"],
      reason: "reading progress and zoom affordances depend on measured document state",
    },
    {
      source: "src/quick-filter.js",
      expectedMatches: 2,
      properties: ["display"],
      reason: "filter visibility reflects the current multi-dimensional selection",
    },
    {
      source: "src/reading-progress.js",
      expectedMatches: 10,
      properties: ["--progress", "background", "color", "opacity", "width"],
      reason: "local progress ratios and state indicators use continuous or user-specific values",
    },
    {
      source: "src/svg-export.js",
      expectedMatches: 6,
      properties: ["detached-svg-token-block", "position", "right", "top", "z-index"],
      reason: "export writes a fixed token set only to a detached SVG clone and positions its local control",
    },
  ],
});

function camelToKebab(value) {
  return value.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

export function scanRuntimeStyleSinks(source, { sourceName = "<script>" } = {}) {
  if (typeof source !== "string") throw new TypeError("runtime style sink inventory requires a string");
  const sinks = [];
  const recognizedStyleOffsets = new Set();
  const patterns = [
    {
      kind: "cssom-assignment",
      pattern: /\.style\.([A-Za-z][A-Za-z0-9]*)\s*=/g,
      property: match => camelToKebab(match[1]),
    },
    {
      kind: "cssom-set-property",
      pattern: /\.style\.setProperty\(\s*["']([^"']+)["']/g,
      property: match => match[1],
    },
    {
      kind: "d3-style",
      pattern: /\.style\(\s*["']([^"']+)["']/g,
      property: match => match[1],
    },
  ];
  for (const { kind, pattern, property } of patterns) {
    for (const match of source.matchAll(pattern)) {
      recognizedStyleOffsets.add(match.index);
      sinks.push({ kind, property: property(match), ...lineAndColumn(source, match.index) });
    }
  }
  for (const match of source.matchAll(/\bstyle\s*=\s*["']([^"']*)["']/g)) {
    const properties = [...match[1].matchAll(/(?:^|;)\s*(--[A-Za-z0-9_-]+|[A-Za-z][A-Za-z0-9-]*)\s*:/g)]
      .map(propertyMatch => propertyMatch[1]);
    for (const property of properties.length > 0 ? properties : ["unknown-template-style"]) {
      sinks.push({
        kind: "html-template-style",
        property,
        ...lineAndColumn(source, match.index),
      });
    }
  }
  const unrecognized = [];
  for (const match of source.matchAll(/\.style\b/g)) {
    if (!recognizedStyleOffsets.has(match.index)) {
      unrecognized.push({
        kind: "unrecognized-style-api",
        excerpt: source.slice(match.index, match.index + 80).split("\n")[0],
        ...lineAndColumn(source, match.index),
      });
    }
  }
  for (const match of source.matchAll(/\[\s*["']style["']\s*\]/gi)) {
    unrecognized.push({
      kind: "computed-style-api",
      excerpt: source.slice(match.index, match.index + 80).split("\n")[0],
      ...lineAndColumn(source, match.index),
    });
  }
  const attributeMethodPattern = /\.(setAttribute(?:NS)?|getAttributeNode(?:NS)?|setAttributeNode(?:NS)?|toggleAttribute)\b/g;
  for (const match of source.matchAll(attributeMethodPattern)) {
    const method = match[1];
    const tail = source.slice(match.index);
    if (method === "setAttribute") {
      const literal = /^\.setAttribute\s*\(\s*(["'])([^"']*)\1\s*,/.exec(tail);
      const plainLiteral = literal && !literal[2].includes("\\");
      if (plainLiteral && literal[2].toLowerCase() !== "style") continue;
      if (plainLiteral) {
        sinks.push({
          kind: "style-attribute",
          property: "detached-svg-token-block",
          ...lineAndColumn(source, match.index),
        });
        continue;
      }
    } else if (method === "toggleAttribute") {
      const literal = /^\.toggleAttribute\s*\(\s*(["'])([^"']*)\1\s*(?:[,\)])/.exec(tail);
      if (literal && literal[2].toLowerCase() !== "style") continue;
    }
    const kind = method.startsWith("getAttributeNode") || method.startsWith("setAttributeNode")
      ? "attribute-node-api"
      : method === "setAttributeNS"
        ? "namespaced-attribute-api"
        : "dynamic-attribute-name";
    unrecognized.push({
      kind,
      excerpt: source.slice(match.index, match.index + 80).split("\n")[0],
      ...lineAndColumn(source, match.index),
    });
  }
  for (const match of source.matchAll(/\.(?:attributeStyleMap|styleMap)\b/g)) {
    unrecognized.push({
      kind: "style-attribute-map",
      excerpt: source.slice(match.index, match.index + 80).split("\n")[0],
      ...lineAndColumn(source, match.index),
    });
  }
  sinks.sort((a, b) => a.line - b.line || a.column - b.column);
  unrecognized.sort((a, b) => a.line - b.line || a.column - b.column);
  return {
    source: sourceName,
    count: sinks.length,
    properties: [...new Set(sinks.map(sink => sink.property))].sort(),
    sinks,
    unrecognized,
  };
}

function normalizeManifestBase(base) {
  if (base === undefined || base === null || base === "" || base === "/") return "";
  if (
    typeof base !== "string"
    || !/^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*$/.test(base)
    || base.split("/").some(segment => segment === "." || segment === "..")
  ) {
    throw new TypeError("manifest base must be an empty or canonical absolute path prefix");
  }
  return base;
}

export function createCspReportOnlyManifest({ styleBudget, base = "" } = {}) {
  const normalizedStyleBudget = normalizeStyleBudget(styleBudget);
  const normalizedBase = normalizeManifestBase(base);
  return deepFreeze({
    schema_version: "1.0.0",
    mode: "report-only",
    production_status: CSP_PRODUCTION_STATUS,
    delivery: {
      required_transport: "HTTP_RESPONSE_HEADER",
      github_pages: "NOT_APPLIED",
      local_preview_command: normalizedBase
        ? `npm run serve:csp -- --base ${normalizedBase}`
        : "npm run serve:csp",
    },
    header: {
      name: CSP_REPORT_ONLY_HEADER_NAME,
      value: serializeCspPolicy(),
    },
    runtime_violation_budget: {
      normal_flows: 0,
    },
    approved_exceptions: [
      {
        id: "STYLE_ATTR_V1",
        directive: "style-src-attr",
        expression: "'unsafe-inline'",
        limits: normalizedStyleBudget,
        reason: "generated static and runtime visualization styles remain in a bounded migration inventory",
      },
      {
        id: "PAGEFIND_WASM_V1",
        directive: "script-src",
        expression: "'wasm-unsafe-eval'",
        dependency: "pagefind",
        reason: "Pagefind compiles its self-hosted search WebAssembly",
      },
      {
        id: "SVG_EXPORT_BLOB_V1",
        directive: "img-src",
        expression: "blob:",
        reason: "SVG export renders a local Blob through Image before download",
      },
      {
        id: "CSS_DATA_IMAGE_V1",
        directive: "img-src",
        expression: "data:",
        reason: "self-hosted styles contain fixed data-SVG decoration",
      },
      {
        id: "TENSORFLOW_PLAYGROUND_V1",
        directive: "frame-src",
        expression: "https://playground.tensorflow.org",
        reason: "the prerequisites page contains the single approved interactive iframe",
      },
    ],
  });
}

function lineAndColumn(source, index) {
  const before = source.slice(0, index);
  const lines = before.split("\n");
  return { line: lines.length, column: lines.at(-1).length + 1 };
}

function readTag(source, start) {
  let quote = null;
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === ">") return { text: source.slice(start, index + 1), end: index + 1 };
  }
  return { text: source.slice(start), end: source.length };
}

function parseOpeningTag(tagText) {
  const opening = /^<\s*([a-zA-Z][a-zA-Z0-9:-]*)\b/.exec(tagText);
  if (!opening) return null;
  const attributes = [];
  const attributeSource = tagText.slice(opening[0].length, tagText.endsWith(">") ? -1 : undefined);
  const attributePattern = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of attributeSource.matchAll(attributePattern)) {
    attributes.push({
      name: match[1].toLowerCase(),
      value: match[2] ?? match[3] ?? match[4] ?? null,
    });
  }
  return { name: opening[1].toLowerCase(), attributes };
}

function firstAttribute(attributes, name) {
  return attributes.find(attribute => attribute.name === name)?.value ?? null;
}

export function scanHtmlSecurity(html, { source = "<html>" } = {}) {
  if (typeof html !== "string") throw new TypeError("HTML security inventory requires a string");

  const eventHandlers = [];
  const javascriptUrls = [];
  const ambiguousUrlEntities = [];
  const forbiddenElements = [];
  const embeddedDocuments = [];
  const executableInlineScripts = [];
  const inertInlineScripts = [];
  const inlineStyleElements = [];
  const styleAttributes = [];
  const elements = [];
  const resourceContainers = [];
  const lowerHtml = html.toLowerCase();
  let cursor = 0;

  while (cursor < html.length) {
    const start = html.indexOf("<", cursor);
    if (start < 0) break;
    if (html.startsWith("<!--", start)) {
      const commentEnd = html.indexOf("-->", start + 4);
      cursor = commentEnd < 0 ? html.length : commentEnd + 3;
      continue;
    }
    const closing = /^<\s*\/\s*([a-zA-Z][a-zA-Z0-9:-]*)\b/.exec(html.slice(start));
    if (closing) {
      const closingName = closing[1].toLowerCase();
      if (RESOURCE_CONTAINER_TAGS.has(closingName)) {
        const index = resourceContainers.lastIndexOf(closingName);
        if (index >= 0) resourceContainers.splice(index);
      }
      cursor = readTag(html, start).end;
      continue;
    }
    if (/^<\s*[!?]/.test(html.slice(start, start + 4))) {
      cursor = readTag(html, start).end;
      continue;
    }

    const tag = readTag(html, start);
    const parsed = parseOpeningTag(tag.text);
    if (!parsed) {
      cursor = tag.end;
      continue;
    }
    const location = lineAndColumn(html, start);
    elements.push({
      tag: parsed.name,
      attributes: parsed.attributes.map(attribute => ({ ...attribute })),
      resourceContainer: resourceContainers.at(-1) || null,
      ...location,
    });
    if (["applet", "base", "embed", "object"].includes(parsed.name)) {
      forbiddenElements.push({ tag: parsed.name, ...location });
    }
    if (RESOURCE_CONTAINER_TAGS.has(parsed.name) && !/\/\s*>$/.test(tag.text)) {
      resourceContainers.push(parsed.name);
    }
    for (const attribute of parsed.attributes) {
      if (/^on[a-z0-9_-]+$/i.test(attribute.name)) {
        eventHandlers.push({ tag: parsed.name, attribute: attribute.name, ...location });
      }
      if (attribute.name === "style") {
        styleAttributes.push({ tag: parsed.name, value: attribute.value ?? "", ...location });
      }
      if (parsed.name === "iframe" && attribute.name === "srcdoc") {
        embeddedDocuments.push({ tag: parsed.name, attribute: attribute.name, ...location });
      }
      if (
        ACTIVE_URL_ATTRIBUTES.has(attribute.name)
      ) {
        const value = attribute.value ?? "";
        if (hasUnresolvedHtmlAttributeEntity(value)) {
          ambiguousUrlEntities.push({ tag: parsed.name, attribute: attribute.name, ...location });
        }
        if (/^(?:javascript|vbscript):/i.test(normalizedActiveUrlProbe(value))) {
          javascriptUrls.push({ tag: parsed.name, attribute: attribute.name, ...location });
        }
      }
    }

    if (parsed.name !== "script" && parsed.name !== "style") {
      cursor = tag.end;
      continue;
    }

    const closingStart = lowerHtml.indexOf(`</${parsed.name}`, tag.end);
    const contentEnd = closingStart < 0 ? html.length : closingStart;
    const content = html.slice(tag.end, contentEnd);
    let elementEnd = contentEnd;
    if (closingStart >= 0) elementEnd = readTag(html, closingStart).end;

    if (parsed.name === "style") {
      inlineStyleElements.push({ ...location });
    } else {
      const src = firstAttribute(parsed.attributes, "src");
      const type = (firstAttribute(parsed.attributes, "type") || "").trim().toLowerCase();
      const hasInlineContent = content.trim().length > 0;
      if (src === null && INERT_SCRIPT_TYPES.has(type)) {
        inertInlineScripts.push({ type, ...location });
      } else if ((src === null && hasInlineContent) || (src !== null && hasInlineContent)) {
        executableInlineScripts.push({
          type: type || "text/javascript",
          hasSrc: src !== null,
          ...location,
        });
      }
    }
    cursor = elementEnd;
  }

  const uniqueStyleValues = [...new Set(styleAttributes.map(attribute => attribute.value))].sort();
  const ready = (
    eventHandlers.length === 0
    && javascriptUrls.length === 0
    && ambiguousUrlEntities.length === 0
    && forbiddenElements.length === 0
    && embeddedDocuments.length === 0
    && executableInlineScripts.length === 0
    && inlineStyleElements.length === 0
  );
  return {
    source,
    ready,
    elements,
    eventHandlers,
    javascriptUrls,
    ambiguousUrlEntities,
    forbiddenElements,
    embeddedDocuments,
    executableInlineScripts,
    inertInlineScripts,
    inlineStyleElements,
    styleAttributes: {
      count: styleAttributes.length,
      uniqueValueCount: uniqueStyleValues.length,
      uniqueValues: uniqueStyleValues,
      entries: styleAttributes,
    },
  };
}

function decodedReference(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  if (hasUnresolvedHtmlAttributeEntity(value)) return null;
  const decoded = decodeHtmlAttributeValue(value).trim();
  return decoded.includes("\uFFFD") ? null : decoded;
}

export function isCspSelfReference(value, { allowData = false, allowBlob = false } = {}) {
  const decoded = decodedReference(value);
  if (decoded === null) return false;
  const lower = decoded.toLowerCase();
  if (allowData && lower.startsWith("data:")) return true;
  if (allowBlob && lower.startsWith("blob:")) return true;
  try {
    return new URL(decoded, "https://csp-self.invalid/").origin === "https://csp-self.invalid";
  } catch {
    return false;
  }
}

export function isCspSafeCssReference(value, options = {}) {
  if (typeof value !== "string" || value.includes("\\")) return false;
  return isCspSelfReference(value, options);
}

function maskCssStringsAndComments(css) {
  const masked = css.split("");
  for (let index = 0; index < css.length;) {
    if (css[index] === "/" && css[index + 1] === "*") {
      masked[index] = " ";
      masked[index + 1] = " ";
      index += 2;
      while (index < css.length && !(css[index] === "*" && css[index + 1] === "/")) {
        if (css[index] !== "\n") masked[index] = " ";
        index += 1;
      }
      if (index < css.length) {
        masked[index] = " ";
        masked[index + 1] = " ";
        index += 2;
      }
      continue;
    }
    if (css[index] === '"' || css[index] === "'") {
      const quote = css[index];
      masked[index] = " ";
      index += 1;
      while (index < css.length) {
        if (css[index] === "\\") {
          masked[index] = " ";
          if (index + 1 < css.length && css[index + 1] !== "\n") masked[index + 1] = " ";
          index += 2;
          continue;
        }
        const char = css[index];
        if (char !== "\n") masked[index] = " ";
        index += 1;
        if (char === quote) break;
      }
      continue;
    }
    index += 1;
  }
  return masked.join("");
}

function hasEscapedCssResourceEntry(css) {
  const masked = maskCssStringsAndComments(css);
  if ([...masked.matchAll(/@[^;{}]*/g)].some(match => match[0].includes("\\"))) return true;
  return [...masked.matchAll(/(?:^|[\s:,(>+~])([^{};:,>+~()[\]"']*\\[^{};:,>+~()[\]"']*)\s*\(/g)]
    .some(match => match[1].includes("\\"));
}

export function scanCssResourcePolicy(css, { source = "<css>" } = {}) {
  if (typeof css !== "string") throw new TypeError("CSS resource inventory requires a string");
  const unexpectedResources = [];
  if (hasEscapedCssResourceEntry(css)) {
    unexpectedResources.push(`${source}: escaped CSS at-rule/function entry is forbidden`);
  }
  const importUrlOffsets = new Set();
  const importPattern = /@import\s+(?:url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)|"([^"]*)"|'([^']*)')/gi;
  for (const match of css.matchAll(importPattern)) {
    const value = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5] ?? "").trim();
    const urlOffset = match[0].toLowerCase().indexOf("url(");
    if (urlOffset >= 0) importUrlOffsets.add(match.index + urlOffset);
    if (value && !isCspSafeCssReference(value)) {
      unexpectedResources.push(`${source} @import: ${value}`);
    }
  }
  for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi)) {
    if (importUrlOffsets.has(match.index)) continue;
    const value = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (value && !value.startsWith("#") && !isCspSafeCssReference(value, { allowData: true })) {
      unexpectedResources.push(`${source} url(): ${value}`);
    }
  }
  return {
    source,
    ready: unexpectedResources.length === 0,
    unexpectedResources,
  };
}

function srcsetCandidates(value) {
  if (typeof value !== "string") return [];
  return value.split(",")
    .map(candidate => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

export function scanHtmlResourcePolicy(html, { source = "<html>" } = {}) {
  const inventory = typeof html === "string" ? scanHtmlSecurity(html, { source }) : html;
  if (!inventory || typeof inventory !== "object" || !Array.isArray(inventory.elements)) {
    throw new TypeError("resource policy inventory requires HTML or a security inventory");
  }
  const unexpectedResources = [];
  const iframeOrigins = new Set();
  const report = (element, kind, value) => {
    unexpectedResources.push(
      `${inventory.source || source}:${element.line}:${element.column}: ${kind} ${value ?? "<missing>"}`,
    );
  };
  const get = (element, name) => firstAttribute(element.attributes, name);

  for (const element of inventory.elements) {
    if (element.tag === "script") {
      for (const attribute of ["src", "href", "xlink:href"]) {
        const value = get(element, attribute);
        if (value !== null && !isCspSelfReference(value)) report(element, `script ${attribute}`, value);
      }
      continue;
    }
    if (element.tag === "link") {
      const relValue = get(element, "rel") || "";
      const asValue = get(element, "as") || "";
      if (hasUnresolvedHtmlAttributeEntity(relValue) || hasUnresolvedHtmlAttributeEntity(asValue)) {
        report(element, "link metadata", `${relValue} ${asValue}`.trim());
        continue;
      }
      const rel = decodeHtmlAttributeValue(relValue).toLowerCase().split(/\s+/);
      const as = decodeHtmlAttributeValue(asValue).toLowerCase();
      const loadsResource = rel.includes("stylesheet") || rel.includes("manifest")
        || rel.includes("icon") || rel.includes("modulepreload") || rel.includes("preload")
        || rel.includes("preconnect") || rel.includes("dns-prefetch");
      const href = get(element, "href");
      if (href !== null && rel.includes("prefetch")) {
        report(element, "unapproved link prefetch", href);
      } else if (loadsResource && href !== null) {
        const preloadUsesUnapprovedDirective = rel.includes("preload")
          && ["audio", "document", "object", "track", "video"].includes(as);
        if (preloadUsesUnapprovedDirective || !isCspSelfReference(href, {
          allowData: as === "image",
          allowBlob: as === "image",
        })) {
          report(element, "link href", href);
        }
      }
      const imageSrcset = get(element, "imagesrcset");
      if (imageSrcset !== null) {
        const approvedImagePreload = rel.includes("preload") && as === "image";
        for (const candidate of srcsetCandidates(imageSrcset)) {
          if (!approvedImagePreload || !isCspSelfReference(candidate, { allowData: true, allowBlob: true })) {
            report(element, "link imagesrcset", candidate);
          }
        }
      }
      continue;
    }
    if (["a", "area"].includes(element.tag)) {
      const ping = get(element, "ping");
      if (ping !== null) {
        const decodedPing = decodedReference(ping);
        if (decodedPing === null) {
          report(element, `${element.tag} ping`, ping);
        } else {
          for (const candidate of decodedPing.split(/\s+/).filter(Boolean)) {
            if (!isCspSelfReference(candidate)) report(element, `${element.tag} ping`, candidate);
          }
        }
      }
      continue;
    }
    if (element.tag === "form") {
      const action = get(element, "action");
      if (action !== null && !isCspSelfReference(action)) report(element, "form action", action);
      continue;
    }
    if (["button", "input"].includes(element.tag)) {
      const formaction = get(element, "formaction");
      if (formaction !== null && !isCspSelfReference(formaction)) {
        report(element, `${element.tag} formaction`, formaction);
      }
      if (element.tag === "button") continue;
    }
    if (["frame", "iframe"].includes(element.tag)) {
      const src = get(element, "src");
      if (src === null) continue;
      const decoded = decodedReference(src);
      if (decoded === null) {
        report(element, "iframe src", src);
        continue;
      }
      try {
        const origin = new URL(decoded, "https://csp-self.invalid/").origin;
        iframeOrigins.add(origin);
        if (origin !== "https://playground.tensorflow.org") report(element, "iframe src", src);
      } catch {
        report(element, "iframe src", src);
      }
      continue;
    }
    if (["audio", "track", "video"].includes(element.tag)) {
      const src = get(element, "src");
      if (src !== null) report(element, `unapproved ${element.tag} src`, src);
      if (element.tag === "video") {
        const poster = get(element, "poster");
        if (poster !== null && !isCspSelfReference(poster, { allowData: true, allowBlob: true })) {
          report(element, "video poster", poster);
        }
      }
      continue;
    }
    if (element.tag === "source") {
      const candidates = [get(element, "src")].filter(value => value !== null);
      const srcset = get(element, "srcset");
      if (srcset !== null) candidates.push(...srcsetCandidates(srcset));
      for (const candidate of candidates) {
        if (element.resourceContainer !== "picture") {
          report(element, `unapproved ${element.resourceContainer || "uncontained"} source`, candidate);
        } else if (!isCspSelfReference(candidate, { allowData: true, allowBlob: true })) {
          report(element, "picture source", candidate);
        }
      }
      continue;
    }
    if (["feimage", "img", "image", "input", "use"].includes(element.tag)) {
      if (element.tag === "input") {
        const type = get(element, "type") || "";
        if (hasUnresolvedHtmlAttributeEntity(type)) {
          if (get(element, "src") !== null) report(element, "input type", type);
          continue;
        }
        if (decodeHtmlAttributeValue(type).toLowerCase() !== "image") continue;
      }
      const candidates = [get(element, "src"), get(element, "href"), get(element, "xlink:href")]
        .filter(value => value !== null);
      const srcset = get(element, "srcset");
      if (srcset !== null) candidates.push(...srcsetCandidates(srcset));
      for (const candidate of candidates) {
        const allowEmbedded = element.tag !== "use";
        if (!isCspSelfReference(candidate, { allowData: allowEmbedded, allowBlob: allowEmbedded })) {
          report(element, `${element.tag} resource`, candidate);
        }
      }
    }
  }

  return {
    source: inventory.source || source,
    ready: unexpectedResources.length === 0,
    unexpectedResources,
    iframeOrigins: [...iframeOrigins].sort(),
  };
}

export function assertHtmlSecurity(html, options = {}) {
  const inventory = typeof html === "string" ? scanHtmlSecurity(html, options) : html;
  if (!inventory || typeof inventory !== "object") {
    throw new TypeError("assertHtmlSecurity requires HTML or a security inventory");
  }
  if (!inventory.ready) {
    const error = new Error(
      `${inventory.source || "<html>"} is not CSP-ready: `
      + `${inventory.eventHandlers?.length ?? 0} inline event handler(s), `
      + `${inventory.javascriptUrls?.length ?? 0} javascript URL(s), `
      + `${inventory.ambiguousUrlEntities?.length ?? 0} ambiguous URL entity reference(s), `
      + `${inventory.forbiddenElements?.length ?? 0} forbidden applet/base/object/embed element(s), `
      + `${inventory.embeddedDocuments?.length ?? 0} iframe srcdoc document(s), `
      + `${inventory.executableInlineScripts?.length ?? 0} executable inline script(s), `
      + `${inventory.inlineStyleElements?.length ?? 0} inline style element(s)`,
    );
    error.code = "CSP_HTML_INVENTORY";
    error.inventory = inventory;
    throw error;
  }
  return inventory;
}

export const assertCspReadyHtml = assertHtmlSecurity;
