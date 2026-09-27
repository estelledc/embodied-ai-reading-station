# Deep-read 批量升级追踪

> 目标：156 篇全部 `status: deep-read`（AGENT-DEEPREAD.md 标准）
> 完成：2026-07-01

## 进度

| 状态 | 数量 |
|------|------|
| deep-read | **156** |
| 待升级 | **0** |
| **合计** | **156** |

## 批次记录

| 批次 | 篇数 | 状态 |
|------|------|------|
| Primer + 早期 | 59 | ✅ |
| W1（24 + sapien） | 25 | ✅ |
| W2-E | 18 | ✅ |
| W2-F | 18 | ✅ |
| W2-G | 18 | ✅ |
| W2-H | 18 | ✅ |

## 配图批次（2026-07-01）

| 批次 | 内容 | 状态 |
|------|------|------|
| P0-ASCII | 11 篇无视觉笔记各补 ≥2 ASCII | ✅ |
| P0-WIRE | 13 篇本地有图未引用 → 正文插入原图 | ✅ |
| P1-INLINE | scene/method inline 156/156（fill-missing-inline） | ✅ |
| P1-CARDS | card 缩略图 156/156（fill-missing-cards） | ✅ |
| P2-AUDIT | audit-figures.mjs + check 配图门禁 | ✅ |
| P3-ARXIV | primer+task 25 篇 ar5iv/Nature/PDF 抽图 | ✅ |

验收：`node site/scripts/audit-figures.mjs` → 156/156 视觉 ≥2，inline/card 齐全。

## 验证

- 全部 156 篇 `status: deep-read`
- 官方字数统计：0 篇 < 4000
- `npm run build && npm run check` → 70 passed, 0 failed
