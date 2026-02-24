# ToolVerse 修复指南

## 问题根因

### 1. Packing 404
**原因**：路径层级错误。`toolverse` 是 Vercel 的根目录，但代码中到处引用 `/toolverse/...` 前缀，导致实际路径多了一层。

**修复**：
| 文件 | 修改 |
|------|------|
| `index.html`（首页） | `./toolverse/packing/index.html` → `/packing` |
| `packing/public/packing/index.html` | `src="/toolverse/packing/js/api.js"` → `src="/packing/js/api.js"`（3处） |
| `packing/js/api.js` | 如果里面有 `/toolverse/api/pack` → 改为 `/api/pack` |
| `vercel.json` | 添加 rewrite: `/packing` → `/packing/public/packing/index.html` |

### 2. PDF-to-Excel 服务器错误
**原因**：
1. `main.py` 用 FastAPI 写法，Vercel 不兼容（需要 `BaseHTTPRequestHandler`）
2. `tabula-py` 依赖 Java，Vercel 没有 Java 运行时
3. `requirements.txt` 只有 `fastapi==0.104.1`，缺少所有必要依赖

**修复**：
| 文件 | 修改 |
|------|------|
| `pdf-to-excel/api/convert.py` | 全新重写：用 `pdfplumber`（纯Python）替代 `tabula-py`（需Java），用 `BaseHTTPRequestHandler` 替代 FastAPI |
| `requirements.txt` | `pdfplumber==0.11.4` + `openpyxl==3.1.5` |
| `pdf-to-excel/frontend/index.html` | `API_BASE` 从 `/api` 改为 `/api/pdf`，下载URL改为 query param |
| `vercel.json` | 添加 API 路由和页面 rewrite |

---

## 需要替换的文件清单

```
toolverse/                          ← Vercel 根目录
├── index.html                      ← ★ 替换（修复工具链接）
├── vercel.json                     ← ★ 替换（修复所有路由）
├── requirements.txt                ← ★ 替换（pdfplumber + openpyxl）
│
├── packing/
│   ├── api/
│   │   └── pack.py                 ← 不变
│   ├── public/packing/
│   │   ├── index.html              ← ★ 修改3处 script src 路径
│   │   ├── css/                    ← 不变
│   │   └── js/
│   │       ├── api.js              ← ★ 检查并修复 API URL
│   │       ├── app.js              ← 不变
│   │       └── packer3d.js         ← 不变
│   └── index.html                  ← 不变
│
├── pdf-to-excel/
│   ├── api/
│   │   └── convert.py              ← ★ 全新文件（替换 backend/main.py）
│   ├── frontend/
│   │   └── index.html              ← ★ 替换（修复 API 路径）
│   ├── backend/                    ← 可删除（不再需要）
│   │   └── main.py                 ← 已被 api/convert.py 替代
│   └── ...
│
└── .gitignore
```

## 部署步骤

1. 替换上述标记 ★ 的文件
2. 删除 `pdf-to-excel/backend/` 目录（已不需要）
3. 确认 `packing/js/api.js` 中的 API 地址是 `/api/pack`
4. `git add . && git commit -m "fix: routing and PDF engine" && git push`
5. Vercel 自动部署

## vercel.json 路由说明

```
首页        /                   → /index.html（自动）
Packing页   /packing            → /packing/public/packing/index.html
Packing API /api/pack           → /packing/api/pack.py (POST)
PDF页       /pdf-to-excel       → /pdf-to-excel/frontend/index.html
PDF API     /api/pdf/convert    → /pdf-to-excel/api/convert.py (POST)
PDF下载     /api/pdf/download   → /pdf-to-excel/api/convert.py (GET)
PDF限流     /api/pdf/rate-limit → /pdf-to-excel/api/convert.py (GET)
静态资源    /packing/js/*       → 自动从 packing/public/packing/js/* 提供
```
