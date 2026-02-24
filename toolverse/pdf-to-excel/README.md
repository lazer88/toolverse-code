# TableExtract — PDF Table to Excel Converter

前后端分离架构的 PDF 表格提取工具。

## 项目结构

```
pdf-to-excel/
├── backend/
│   ├── main.py              # FastAPI 后端（提取引擎 + API）
│   ├── requirements.txt     # Python 依赖
│   └── Dockerfile           # 后端容器化
├── frontend/
│   └── index.html           # 前端单页应用（可嵌入已有工具页面）
├── nginx.conf               # Nginx 反向代理配置
├── docker-compose.yml       # 一键部署
└── README.md
```

## 快速启动

### 方式 1：Docker Compose（推荐）

```bash
docker-compose up -d --build
```

访问 `http://localhost` 即可使用。

### 方式 2：手动运行

**后端：**
```bash
cd backend
pip install -r requirements.txt

# 需要 Java（tabula-py 依赖）
# Ubuntu: sudo apt install default-jre-headless
# macOS: brew install openjdk

uvicorn main:app --host 0.0.0.0 --port 8000
```

**前端：**

直接用任意方式托管 `frontend/index.html`，或用 nginx 按 `nginx.conf` 配置。

本地开发时可以直接用 Python 起一个静态服务：
```bash
cd frontend
python -m http.server 3000
```

然后在 `index.html` 中修改 API 地址：
```javascript
const API_BASE = 'http://localhost:8000/api';
```

## API 文档

### `GET /api/health`
健康检查。

### `GET /api/rate-limit`
查询当前 IP 的限流状态。

**Response:**
```json
{
  "rate_limit": 3,
  "window_seconds": 3600,
  "allowed": true,
  "remaining": 2
}
```

### `POST /api/convert`
上传 PDF 并提取表格。

**Request:** `multipart/form-data`
| 字段 | 类型 | 说明 |
|------|------|------|
| file | File | PDF 文件 |
| pages | string | 页码范围，如 `all`、`1-5`、`1,3,5` |
| parallel | bool | 是否并行提取（默认 true） |
| workers | int | 并行线程数（默认 4，最大 8） |

**Response:**
```json
{
  "stats": { "tables": 5, "rows": 120, "time": 2.3, "pages": 8 },
  "logs": [{"msg": "...", "level": "ok", "time": "14:30:21"}],
  "previews": [{"id": 1, "cols": [...], "rows": [...], "total_rows": 48}],
  "extra_count": 2,
  "download_token": "a1b2c3d4e5f6",
  "rate": { "remaining": 2, "limit": 3 }
}
```

**429 响应（限流）：**
```json
{
  "error": "rate_limit_exceeded",
  "message": "Conversion limit reached (3 per hour).",
  "wait_minutes": 23,
  "reset_time": "15:32",
  "remaining": 0
}
```

### `GET /api/download/{token}`
下载生成的 Excel 文件。

## 嵌入已有工具页面

### 方式 1：iframe 嵌入
```html
<iframe src="/tools/pdf-to-excel/" width="100%" height="900" frameborder="0"></iframe>
```

### 方式 2：直接引入
将 `index.html` 中的 HTML 和 CSS 提取到你的模板中，JS 部分只需确保 `API_BASE` 指向正确的后端地址：

```html
<!-- 在你的工具页面中 -->
<script>
  window.TABLE_EXTRACT_API = 'https://your-domain.com/api';
</script>
<script src="/static/js/pdf-converter.js"></script>
```

### 方式 3：修改 API_BASE
在 `index.html` 的 `<script>` 开头处：
```javascript
const API_BASE = window.TABLE_EXTRACT_API || '/api';
```
在你的父页面中设置 `window.TABLE_EXTRACT_API` 即可。

## 限流规则

- 每个 IP 每小时最多 3 次转换
- 超出后返回 429 + 精确的可用时间
- 服务端按 IP 记录（支持 X-Forwarded-For 反向代理透传）
- 临时文件 1 小时后自动清理

## 配置项（backend/main.py）

```python
RATE_LIMIT = 3              # 每小时最大转换次数
RATE_WINDOW = 3600          # 限流窗口（秒）
MAX_FILE_SIZE = 100 * 1024 * 1024  # 最大文件大小
FILE_TTL = 3600             # 临时文件保留时间（秒）
```
