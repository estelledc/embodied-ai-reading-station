// 浏览器端 Data API v2 适配器：统一 endpoint、合同校验与可观察错误。
(function () {
  "use strict";

  const PAPER_ENDPOINT = "/data/v2/papers.json";
  const SCHEMA_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
  const CONTENT_COMMIT = /^[0-9a-f]{40}$/;
  const requests = new Map();
  let lastError = null;

  class DataApiError extends Error {
    constructor(code, message, { endpoint = PAPER_ENDPOINT, status = null, cause = null } = {}) {
      super(message);
      this.name = "DataApiError";
      this.code = code;
      this.endpoint = endpoint;
      this.status = Number.isInteger(status) ? status : null;
      if (cause) this.cause = cause;
    }
  }

  function endpointFor(base) {
    const normalizedBase = String(base ?? "").replace(/\/+$/, "");
    return `${normalizedBase}${PAPER_ENDPOINT}`;
  }

  function validateEnvelope(value, endpoint) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new DataApiError(
        "DATA_API_SCHEMA_VERSION",
        "论文数据缺少合法的 v2 envelope。",
        { endpoint },
      );
    }

    const version = value.schema_version;
    const match = typeof version === "string" ? SCHEMA_VERSION.exec(version) : null;
    if (!match || match[1] !== "2") {
      throw new DataApiError(
        "DATA_API_SCHEMA_VERSION",
        "论文数据 schema_version 不兼容；当前客户端仅支持主版本 2。",
        { endpoint },
      );
    }
    if (typeof value.content_commit !== "string" || !CONTENT_COMMIT.test(value.content_commit)) {
      throw new DataApiError(
        "DATA_API_CONTENT_COMMIT",
        "论文数据 content_commit 必须是 40 位小写 Git SHA。",
        { endpoint },
      );
    }
    if (!Array.isArray(value.data)) {
      throw new DataApiError(
        "DATA_API_DATA",
        "论文数据 envelope 的 data 字段必须是数组。",
        { endpoint },
      );
    }
    return value.data;
  }

  function loadPapers({ base = "", fetchImpl = null } = {}) {
    const endpoint = endpointFor(base);
    if (requests.has(endpoint)) return requests.get(endpoint);

    const request = (async () => {
      const requestFetch = fetchImpl || (typeof fetch === "function" ? fetch : null);
      if (!requestFetch) {
        throw new DataApiError("DATA_API_NETWORK", "浏览器不支持论文数据请求。", { endpoint });
      }

      let response;
      try {
        response = await requestFetch(endpoint);
      } catch (cause) {
        throw new DataApiError("DATA_API_NETWORK", "论文数据网络请求失败。", { endpoint, cause });
      }
      if (!response || response.ok !== true) {
        const status = Number.isInteger(response?.status) ? response.status : null;
        throw new DataApiError(
          "DATA_API_HTTP",
          status === null ? "论文数据请求未返回成功响应。" : `论文数据请求失败（HTTP ${status}）。`,
          { endpoint, status },
        );
      }

      let payload;
      try {
        payload = await response.json();
      } catch (cause) {
        throw new DataApiError("DATA_API_JSON", "论文数据不是合法 JSON。", { endpoint, cause });
      }
      return validateEnvelope(payload, endpoint);
    })();

    requests.set(endpoint, request);
    request.catch(() => {
      if (requests.get(endpoint) === request) requests.delete(endpoint);
    });
    return request;
  }

  function safeText(value, fallback) {
    const text = typeof value === "string" ? value : fallback;
    return text.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 300);
  }

  function reportError(error, { consumer = "unknown" } = {}) {
    const detail = {
      consumer: safeText(consumer, "unknown"),
      code: safeText(error?.code, "DATA_API_UNKNOWN"),
      message: safeText(error?.message, "论文数据加载失败。"),
      endpoint: safeText(error?.endpoint, PAPER_ENDPOINT),
      status: Number.isInteger(error?.status) ? error.status : null,
    };
    lastError = detail;
    if (typeof console?.error === "function") {
      console.error(`[EAI data API] ${detail.consumer} ${detail.code}: ${detail.message}`);
    }
    if (typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent("eai:data-error", { detail }));
    }
    return detail;
  }

  window.EAI_DATA_API = Object.freeze({
    loadPapers,
    reportError,
    get lastError() { return lastError; },
  });
})();
