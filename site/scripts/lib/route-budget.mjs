// Deterministic route image inventory. This is a static proxy for browser requests:
// defaultPaths tracks img/src, image preload, and inline CSS URLs; candidatePaths also
// includes every declared srcset candidate. Runtime transferred bytes remain a browser check.

const ABSOLUTE_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const INLINE_IMAGE_SCHEME = /^(?:blob|data):/i;
const URL_ATTRIBUTES = new Set(["action", "cite", "data", "formaction", "href", "poster", "src"]);
const SRCSET_ATTRIBUTES = new Set(["imagesrcset", "srcset"]);

function decodeHtmlAttribute(value) {
  return String(value)
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:0*39|x0*27);/gi, "'")
    .replace(/&#(\d+);/g, (_, digits) => String.fromCodePoint(Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (_, digits) => String.fromCodePoint(Number.parseInt(digits, 16)));
}

function parseAttributes(tag) {
  const attributes = new Map();
  const pattern = /\b([a-z][a-z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of tag.matchAll(pattern)) {
    attributes.set(match[1].toLowerCase(), decodeHtmlAttribute(match[2] ?? match[3] ?? match[4] ?? ""));
  }
  return attributes;
}

function srcsetUrls(value) {
  return String(value)
    .split(",")
    .map(candidate => candidate.trim().split(/\s+/, 1)[0])
    .filter(Boolean);
}

function cssUrls(value) {
  const urls = [];
  const pattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi;
  for (const match of String(value).matchAll(pattern)) {
    const url = match[1] ?? match[2] ?? match[3] ?? "";
    if (url.trim()) urls.push(decodeHtmlAttribute(url.trim()));
  }
  return urls;
}

function normalizeBase(base) {
  const value = String(base ?? "").replace(/\/+$/, "");
  if (value === "") return "";
  if (!value.startsWith("/") || /[?#\\]/.test(value)) {
    throw new TypeError("route base must be an absolute path prefix");
  }
  const segments = value.slice(1).split("/");
  if (segments.some(segment => segment === "" || segment === "." || segment === "..")) {
    throw new TypeError("route base contains an unsafe path segment");
  }
  return `/${segments.join("/")}`;
}

export function normalizeRouteHtmlForBase(html, { base = "" } = {}) {
  const normalizedBase = normalizeBase(base);
  const source = String(html);
  if (!normalizedBase) return source;

  const normalizeInternalUrl = value => {
    if (value === normalizedBase) return "";
    if (value.startsWith(`${normalizedBase}/`)) return value.slice(normalizedBase.length);
    return value;
  };
  const normalizeSrcset = value => String(value).split(",").map(candidate => (
    candidate.replace(/^(\s*)(\S+)/, (_, whitespace, url) => `${whitespace}${normalizeInternalUrl(url)}`)
  )).join(",");
  const normalizeCss = value => String(value).replace(
    /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi,
    (full, doubleQuoted, singleQuoted, unquoted) => {
      const rawUrl = doubleQuoted ?? singleQuoted ?? unquoted ?? "";
      const normalizedUrl = normalizeInternalUrl(rawUrl.trim());
      if (normalizedUrl === rawUrl.trim()) return full;
      if (doubleQuoted !== undefined) return `url("${normalizedUrl}")`;
      if (singleQuoted !== undefined) return `url('${normalizedUrl}')`;
      return `url(${normalizedUrl})`;
    },
  );
  const attributePattern = /(\b([a-z][a-z0-9:-]*)\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

  // Only rewrite values inside actual HTML tags. Plain text and absolute external URLs
  // may legitimately contain the repository slug and must remain byte-for-byte intact.
  return source.replace(/<([a-z][a-z0-9:-]*)\b[^>]*>/gi, tag => tag.replace(
    attributePattern,
    (full, prefix, rawName, doubleQuoted, singleQuoted, unquoted) => {
      const name = rawName.toLowerCase();
      const value = doubleQuoted ?? singleQuoted ?? unquoted ?? "";
      let normalizedValue = value;
      if (name === "data-base") normalizedValue = normalizeInternalUrl(value);
      else if (URL_ATTRIBUTES.has(name)) normalizedValue = normalizeInternalUrl(value);
      else if (SRCSET_ATTRIBUTES.has(name)) normalizedValue = normalizeSrcset(value);
      else if (name === "style") normalizedValue = normalizeCss(value);
      else return full;

      if (doubleQuoted !== undefined) return `${prefix}"${normalizedValue}"`;
      if (singleQuoted !== undefined) return `${prefix}'${normalizedValue}'`;
      return `${prefix}${normalizedValue}`;
    },
  ));
}

function normalizeImageUrl(rawValue, base) {
  const value = decodeHtmlAttribute(rawValue).trim();
  if (INLINE_IMAGE_SCHEME.test(value) || value.startsWith("#")) return { kind: "ignored" };
  if (!value || value.startsWith("//") || ABSOLUTE_SCHEME.test(value)) return { kind: "invalid", value };

  const pathOnly = value.split(/[?#]/, 1)[0];
  let decodedInput;
  try {
    decodedInput = decodeURIComponent(pathOnly);
  } catch {
    return { kind: "invalid", value };
  }
  if (decodedInput.includes("\\") || decodedInput.split("/").some(segment => segment === "..")) {
    return { kind: "invalid", value };
  }

  let pathname;
  let search;
  try {
    const routeRoot = `https://route.invalid${base || ""}/`;
    const parsed = new URL(value, routeRoot);
    if (parsed.origin !== "https://route.invalid") return { kind: "invalid", value };
    pathname = decodeURIComponent(parsed.pathname);
    search = parsed.search;
  } catch {
    return { kind: "invalid", value };
  }

  if (base) {
    if (!pathname.startsWith(`${base}/`)) return { kind: "invalid", value };
    pathname = pathname.slice(base.length);
  }
  const relativePath = pathname.replace(/^\/+/, "");
  const segments = relativePath.split("/");
  if (!relativePath || segments.some(segment => segment === "" || segment === "." || segment === "..")) {
    return { kind: "invalid", value };
  }
  const assetPath = segments.join("/");
  return { kind: "local", assetPath, requestKey: `${assetPath}${search}` };
}

export function collectRouteImagePaths(html, { base = "" } = {}) {
  const normalizedBase = normalizeBase(base);
  const defaults = new Map();
  const candidates = new Map();
  const invalid = new Set();

  function add(rawUrl, { isDefault = false } = {}) {
    const result = normalizeImageUrl(rawUrl, normalizedBase);
    if (result.kind === "invalid") {
      invalid.add(result.value);
      return;
    }
    if (result.kind !== "local") return;
    candidates.set(result.requestKey, result.assetPath);
    if (isDefault) defaults.set(result.requestKey, result.assetPath);
  }

  for (const match of String(html).matchAll(/<([a-z][a-z0-9:-]*)\b[^>]*>/gi)) {
    const tagName = match[1].toLowerCase();
    const attributes = parseAttributes(match[0]);

    if (tagName === "img") {
      if (attributes.has("src")) add(attributes.get("src"), { isDefault: true });
      if (attributes.has("srcset")) {
        for (const url of srcsetUrls(attributes.get("srcset"))) add(url);
      }
    } else if (tagName === "source" && attributes.has("srcset")) {
      for (const url of srcsetUrls(attributes.get("srcset"))) add(url);
    } else if (tagName === "link") {
      const rel = new Set((attributes.get("rel") || "").toLowerCase().split(/\s+/).filter(Boolean));
      if (rel.has("preload") && (attributes.get("as") || "").toLowerCase() === "image") {
        if (attributes.has("href")) add(attributes.get("href"), { isDefault: true });
        if (attributes.has("imagesrcset")) {
          for (const url of srcsetUrls(attributes.get("imagesrcset"))) add(url);
        }
      }
    }

    if (attributes.has("poster")) add(attributes.get("poster"), { isDefault: true });
    if (attributes.has("style")) {
      for (const url of cssUrls(attributes.get("style"))) add(url, { isDefault: true });
    }
  }

  for (const match of String(html).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const url of cssUrls(match[1])) add(url, { isDefault: true });
  }

  const serializeRequests = requests => [...requests]
    .map(([requestKey, assetPath]) => ({ requestKey, assetPath }))
    .sort((left, right) => left.requestKey.localeCompare(right.requestKey));
  const defaultRequests = serializeRequests(defaults);
  const candidateRequests = serializeRequests(candidates);
  const uniquePaths = requests => [...new Set(requests.map(request => request.assetPath))].sort();
  return {
    defaultRequests,
    candidateRequests,
    defaultPaths: uniquePaths(defaultRequests),
    candidatePaths: uniquePaths(candidateRequests),
    invalidUrls: [...invalid].sort(),
  };
}

export function measureRouteImageBudget(html, { base = "", readAssetSize } = {}) {
  if (typeof readAssetSize !== "function") throw new TypeError("readAssetSize must be a function");
  const inventory = collectRouteImagePaths(html, { base });
  const sizes = new Map();
  const missing = [];

  for (const relativePath of inventory.candidatePaths) {
    let size = null;
    try {
      size = readAssetSize(relativePath);
    } catch {
      size = null;
    }
    if (!Number.isSafeInteger(size) || size < 0) {
      missing.push(relativePath);
      continue;
    }
    sizes.set(relativePath, size);
  }

  const bytesFor = requests => requests.reduce(
    (total, request) => total + (sizes.get(request.assetPath) ?? 0),
    0,
  );
  return {
    ...inventory,
    requestCount: inventory.defaultRequests.length,
    totalBytes: bytesFor(inventory.defaultRequests),
    candidateCount: inventory.candidateRequests.length,
    candidateBytes: bytesFor(inventory.candidateRequests),
    missingPaths: missing.sort(),
  };
}

export function evaluateRouteImageBudget(metrics, budget) {
  for (const key of ["maxRequests", "maxBytes", "maxCandidates", "maxCandidateBytes"]) {
    if (!Number.isSafeInteger(budget?.[key]) || budget[key] < 0) {
      throw new TypeError(`${key} must be a non-negative safe integer`);
    }
  }

  const errors = [];
  if (metrics.invalidUrls.length) {
    errors.push({
      code: "INVALID_LOCAL_IMAGE_URL",
      message: `${metrics.invalidUrls.length} image URL(s) are external, unsafe, or do not match the route base`,
    });
  }
  if (metrics.missingPaths.length) {
    errors.push({
      code: "MISSING_IMAGE_ASSET",
      message: `${metrics.missingPaths.length} referenced image asset(s) are missing or not regular files`,
    });
  }
  if (metrics.requestCount > budget.maxRequests) {
    errors.push({
      code: "IMAGE_REQUEST_BUDGET_EXCEEDED",
      message: `${metrics.requestCount} default image requests exceed ${budget.maxRequests}`,
    });
  }
  if (metrics.totalBytes > budget.maxBytes) {
    errors.push({
      code: "IMAGE_BYTE_BUDGET_EXCEEDED",
      message: `${metrics.totalBytes} default image bytes exceed ${budget.maxBytes}`,
    });
  }
  if (metrics.candidateCount > budget.maxCandidates) {
    errors.push({
      code: "IMAGE_CANDIDATE_BUDGET_EXCEEDED",
      message: `${metrics.candidateCount} declared image candidates exceed ${budget.maxCandidates}`,
    });
  }
  if (metrics.candidateBytes > budget.maxCandidateBytes) {
    errors.push({
      code: "IMAGE_CANDIDATE_BYTE_BUDGET_EXCEEDED",
      message: `${metrics.candidateBytes} declared image candidate bytes exceed ${budget.maxCandidateBytes}`,
    });
  }
  return { ok: errors.length === 0, errors };
}
