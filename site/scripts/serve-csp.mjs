#!/usr/bin/env node
// Header-capable local preview for the canonical report-only CSP.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CSP_PRODUCTION_STATUS,
  CSP_REPORT_ONLY_HEADER_NAME,
  serializeCspPolicy,
} from "./lib/csp.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIST = path.resolve(HERE, "..", "dist");
const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
});

export function normalizeServeBase(value = "") {
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === "/") return "";
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

function safeRelativePath(pathname, base) {
  if (base && pathname !== base && !pathname.startsWith(`${base}/`)) return null;
  let relative = base ? pathname.slice(base.length) : pathname;
  try {
    relative = decodeURIComponent(relative);
  } catch {
    return null;
  }
  if (relative.includes("\0")) return null;
  const normalized = path.posix.normalize(`/${relative}`).slice(1);
  if (normalized === ".." || normalized.startsWith("../")) return null;
  return normalized;
}

function resolveStaticFile(dist, relative) {
  const requested = relative.endsWith("/") || relative === ""
    ? path.join(relative, "index.html")
    : relative;
  const target = path.resolve(dist, requested);
  if (target !== dist && !target.startsWith(`${dist}${path.sep}`)) return null;
  const stat = fs.statSync(target, { throwIfNoEntry: false });
  if (stat?.isFile()) return { target, status: 200 };
  const directoryIndex = path.join(target, "index.html");
  if (fs.statSync(directoryIndex, { throwIfNoEntry: false })?.isFile()) {
    return { target: directoryIndex, status: 200 };
  }
  const fallback = path.join(dist, "404.html");
  if (fs.statSync(fallback, { throwIfNoEntry: false })?.isFile()) {
    return { target: fallback, status: 404 };
  }
  return null;
}

export function createCspPreviewServer({ dist = DEFAULT_DIST, base = "" } = {}) {
  const root = path.resolve(dist);
  const serveBase = normalizeServeBase(base);
  if (!fs.statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`CSP preview dist directory is missing: ${root}`);
  }
  const policy = serializeCspPolicy();

  return http.createServer((request, response) => {
    response.setHeader(CSP_REPORT_ONLY_HEADER_NAME, policy);
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }

    const requestUrl = new URL(request.url || "/", "http://localhost");
    if (serveBase && requestUrl.pathname === serveBase) {
      response.writeHead(308, { Location: `${serveBase}/${requestUrl.search}` });
      response.end();
      return;
    }
    const relative = safeRelativePath(requestUrl.pathname, serveBase);
    if (relative === null) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(request.method === "HEAD" ? undefined : "Not found");
      return;
    }

    const resolved = resolveStaticFile(root, relative);
    if (!resolved) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(request.method === "HEAD" ? undefined : "Not found");
      return;
    }

    const contentType = MIME_TYPES[path.extname(resolved.target).toLowerCase()]
      || "application/octet-stream";
    const size = fs.statSync(resolved.target).size;
    response.writeHead(resolved.status, {
      "Content-Length": size,
      "Content-Type": contentType,
    });
    if (request.method === "HEAD") response.end();
    else fs.createReadStream(resolved.target).pipe(response);
  });
}

function readOption(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(readOption("--port", process.env.PORT || 8080));
  const base = normalizeServeBase(readOption("--base", process.env.CSP_SERVE_BASE || ""));
  const dist = path.resolve(readOption("--dist", DEFAULT_DIST));
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("--port must be an integer between 1 and 65535");
  }
  const server = createCspPreviewServer({ dist, base });
  server.listen(port, "127.0.0.1", () => {
    const route = base ? `${base}/` : "/";
    console.log(`CSP Report-Only preview: http://127.0.0.1:${port}${route}`);
    console.log(`Header: ${CSP_REPORT_ONLY_HEADER_NAME}`);
    console.log(`GitHub Pages production status: ${CSP_PRODUCTION_STATUS}`);
  });
}
