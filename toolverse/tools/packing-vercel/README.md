# 3D Bin Packing Optimizer — Vercel Deployment

## Project Structure
```
├── api/
│   └── pack.py          # Serverless function: POST /api/pack
├── public/
│   ├── index.html        # Main app page
│   ├── css/style.css     # Styles
│   └── js/
│       ├── api.js        # API client
│       ├── app.js        # App logic + table
│       └── packer3d.js   # Three.js 3D rendering
├── vercel.json           # Vercel routing config
├── requirements.txt      # Python deps
└── README.md
```

## Deploy to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

### 2. Connect to Vercel
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Framework Preset: select **Other**
4. Click **Deploy**

That's it! Vercel auto-detects `api/*.py` as Python serverless functions
and serves `public/` as static files.

### 3. After Deploy
Your site will be live at `https://your-project.vercel.app`
- Frontend: `https://your-project.vercel.app/`
- API: `https://your-project.vercel.app/api/pack`

## Local Development
```bash
# Install Vercel CLI
npm i -g vercel

# Run locally
vercel dev
```
Opens at http://localhost:3000
