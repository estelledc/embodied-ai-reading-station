# CSP Report-Only 交付边界

## 当前状态

- 站点代码：`CSP_READY`。生成 HTML 不含 inline event handler、可执行 inline script、`javascript:` URL 或 inline `<style>`。
- 本地验证：使用真实 `Content-Security-Policy-Report-Only` HTTP 响应头；普通用户流程的未批准违规预算为 `0`。
- GitHub Pages 生产：`NOT_APPLIED`。当前 deploy workflow 直接上传静态 Pages artifact，没有能注入自定义响应头的交付层。

Report-Only 不能通过 `<meta>` 投递，只能由 HTTP 响应头投递；因此项目不生成无效的 Report-Only meta，也不把普通静态文件冒充已生效的响应头配置。规范依据见 [W3C CSP Level 3 — Policy Delivery](https://www.w3.org/TR/CSP3/#policy-delivery)。

## 单一策略源

- 策略与批准预算：`site/scripts/lib/csp.mjs`
- 生成产物：`site/dist/csp-report-only.json`
- 可注入响应头的本地预览：`site/scripts/serve-csp.mjs`

策略禁止 wildcard、裸 `https:`、`unsafe-eval` 和 inline script。Pagefind 只批准更窄的 `'wasm-unsafe-eval'`，TensorFlow Playground 只批准精确 origin。

## 批准例外

| ID | 范围 | 边界 |
|---|---|---|
| `STYLE_ATTR_V1` | `style-src-attr 'unsafe-inline'` | 当前 4,675 个属性、206 个唯一值及 SHA-256 digest 精确冻结；仅归一化会随 root/repo Pagefind 体积变化的 5 条存储占比宽度，属性与颜色仍受约束 |
| `PAGEFIND_WASM_V1` | `script-src 'wasm-unsafe-eval'` | 仅用于自托管 Pagefind WebAssembly；不批准 `'unsafe-eval'` |
| `SVG_EXPORT_BLOB_V1` | `img-src blob:` | 本地 SVG 导出在 canvas 前通过 Blob 加载图片 |
| `CSS_DATA_IMAGE_V1` | `img-src data:` | 固定的自托管 CSS data-SVG 纹理 |
| `TENSORFLOW_PLAYGROUND_V1` | `frame-src https://playground.tensorflow.org` | 唯一批准 iframe origin |

T007 把论文模板的 45 个静态 style 生成点迁到 class，T008 又移除 More 当前态的 40 个 inline style；生成 HTML 的 `style=` 从 30,972 降到 4,675。剩余样式债务继续由精确预算管理，不把它描述成“已清零”。

## 复现验证

根路径：

```bash
cd site
npm run build
npm run check
npm run serve:csp -- --port 8080
```

仓库子路径：

```bash
cd site
SITE_BASE=/embodied-ai-reading-station npm run build
SITE_BASE=/embodied-ai-reading-station npm run check
npm run serve:csp -- --port 8080 --base /embodied-ai-reading-station
```

浏览器矩阵还必须包含一条负向 canary：加载未批准的外部脚本，应收到 `disposition: report` 的 `script-src-elem` 事件，同时页面行为不被阻断。只有这样才能证明“零违规”来自真实响应头，而不是策略未安装。

当前 root/repo 两种 base 已验证主题、键盘帮助、Pagefind Worker/WASM、Graph/D3、SVG Blob 导出、KaTeX、本地进度、Discover、404、Next、批准 iframe 和 deck；页面级监听器均为零站点违规。canary 在两种 base 都精确收到 `script-src-elem` + `disposition: report`。

Codex in-app Browser 会为自身选区/侧栏覆盖层注入一段以 `.hover-box` 开头的 `<style>`，因此 CDP 每次导航会额外看到一条 `style-src-elem`。该节点已通过 `DOM.describeNode` 定位为浏览器工具层，不来自生成 HTML 或站点脚本；它不进入产品批准预算，也不能用来放宽 `style-src-elem 'self'`。

## 生产启用条件

生产 Report-Only 需要新增可写响应头的 CDN、edge 或托管层。若未来改用 enforcing CSP meta，必须单独评审，并明确它不能提供 Report-Only、`frame-ancestors` 或 Reporting API 的等价能力。
