# Integration Guide: Add Packing Tool to Your Navigation Page

## 1. Project Structure (after change)

```
your-project/
├── api/
│   └── pack.py              ← Serverless API (unchanged)
├── public/
│   ├── index.html            ← Your existing nav/portal page
│   ├── packing/
│   │   ├── index.html        ← Packing tool
│   │   ├── css/style.css
│   │   └── js/api.js, app.js, packer3d.js
│   └── other-tool/           ← Your other tools...
├── vercel.json
└── requirements.txt
```

## 2. Add This Card to Your Navigation Page

Copy this HTML snippet into your existing navigation page where you
want the packing tool card to appear:

```html
<!-- 3D Bin Packing Tool Card -->
<a href="/packing" class="tool-card">
  <div class="tool-icon">📦</div>
  <div class="tool-info">
    <h3>3D Bin Packing</h3>
    <p>Optimize container loading with Extreme Points Algorithm. 
       Supports multiple container types, stack limits, and 3D visualization.</p>
  </div>
  <span class="tool-arrow">→</span>
</a>
```

Minimal CSS for the card (adapt to your existing style):

```css
.tool-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}
.tool-card:hover {
  border-color: #6366f1;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  transform: translateY(-2px);
}
.tool-icon {
  font-size: 36px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef2ff;
  border-radius: 12px;
  flex-shrink: 0;
}
.tool-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}
.tool-info p {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}
.tool-arrow {
  font-size: 20px;
  color: #9ca3af;
  margin-left: auto;
  flex-shrink: 0;
}
.tool-card:hover .tool-arrow { color: #6366f1; }
```

## 3. URL Mapping

| URL | What it serves |
|-----|---------------|
| `/` | Your navigation page (`public/index.html`) |
| `/packing` | Packing tool (`public/packing/index.html`) |
| `/packing/css/*` | Packing CSS files |
| `/packing/js/*` | Packing JS files |
| `/api/pack` | Packing algorithm API |

## 4. Adding More Tools Later

Same pattern — just create a new folder under `public/`:

```
public/
├── index.html          ← Nav page
├── packing/            ← Tool 1
├── calculator/         ← Tool 2
└── converter/          ← Tool 3
```

Add matching routes in `vercel.json`:
```json
{ "src": "/calculator$", "dest": "/public/calculator/index.html" },
{ "src": "/calculator/(.*)", "dest": "/public/calculator/$1" }
```

And add a new card on your nav page. Done!
