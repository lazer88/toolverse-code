# ToolVerse 修复方案 — 最终版

## 修改总结

你的项目有两个根本问题，现在全部修复了：

### 问题 1：Packing 404
**根因**：`pack.py` 放在 `packing/api/pack.py`，Vercel 自动映射为 `/packing/api/pack`，但前端 `api.js` 请求的是 `/api/pack`，找不到就返回 404 HTML，前端 `JSON.parse()` 失败。

**修复**：把 `pack.py` 移到根目录 `api/pack.py`，Vercel 自动映射为 `/api/pack`，和 `api.js` 匹配。

### 问题 2：PDF-to-Excel 服务器错误
**根因**：
- `tabula-py` 需要 Java，Vercel 没有 Java
- `main.py` 用 FastAPI，Vercel 不支持（要用 BaseHTTPRequestHandler）
- `requirements.txt` 只有 fastapi，缺少所有依赖

**修复**：
- 新建 `api/pdf-convert.py`，用 pdfplumber（纯 Python）+ openpyxl
- 用 BaseHTTPRequestHandler（和 pack.py 同样格式）
- `requirements.txt` 改为 pdfplumber + openpyxl

---

## 你需要执行的操作

### 第 1 步：替换/新增文件

```
toolverse/                         ← 你的 Vercel 根目录
│
├── vercel.json                    ← ★ 替换为新版
├── requirements.txt               ← ★ 替换为新版
├── index.html                     ← ★ 替换为新版（修复了链接路径）
│
├── api/                           ← ★ 新建此目录
│   ├── pack.py                    ← ★ 从 packing/api/pack.py 移到这里
│   └── pdf-convert.py             ← ★ 全新文件
│
├── packing/
│   ├── api/                       ← 此目录可以保留或删除，不再使用
│   ├── public/packing/
│   │   ├── index.html             ← ★ 修改 3 处 script 路径（见下方）
│   │   ├── css/
│   │   └── js/
│   │       ├── api.js             ← 不需要修改（/api/pack 路径正确）
│   │       ├── app.js
│   │       └── packer3d.js
│   └── ...
│
├── pdf-to-excel/
│   ├── frontend/
│   │   └── index.html             ← ★ 替换为新版
│   ├── backend/                   ← 可删除（不再使用）
│   └── api/                       ← 可删除（不再使用，function 已移到根 api/）
│
└── .gitignore
```

### 第 2 步：修改 packing 的 index.html

在 `packing/public/packing/index.html` 底部找到这 3 行：

```html
<!-- 改之前 -->
<script src="/toolverse/packing/js/api.js"></script>
<script src="/toolverse/packing/js/packer3d.js"></script>
<script src="/toolverse/packing/js/app.js"></script>

<!-- 改之后 -->
<script src="/packing/js/api.js"></script>
<script src="/packing/js/packer3d.js"></script>
<script src="/packing/js/app.js"></script>
```

> 就是去掉 `/toolverse` 前缀。toolverse 已经是根目录了。

### 第 3 步：部署

```bash
git add .
git commit -m "fix: move API to root api/, use pdfplumber, fix paths"
git push
```

---

## 最终路由映射

| 用户访问 | Vercel 实际处理 |
|---------|---------------|
| `/` | `index.html` (自动) |
| `/packing` | → rewrite → `packing/public/packing/index.html` |
| `/packing/js/api.js` | 静态文件自动提供 |
| `/api/pack` (POST) | → `api/pack.py` (自动) |
| `/pdf-to-excel` | → rewrite → `pdf-to-excel/frontend/index.html` |
| `/api/pdf-convert` (GET) | → `api/pdf-convert.py` 查询限流状态 |
| `/api/pdf-convert` (POST) | → `api/pdf-convert.py` 上传转换 |
| `/api/pdf-convert?action=download&token=xxx` (GET) | → `api/pdf-convert.py` 下载 |

**关键原则**：Vercel 自动把 `api/xxx.py` 映射为 `/api/xxx`，不需要 builds 配置，不需要 rewrites。只有静态页面的 clean URL 才需要 rewrites。
