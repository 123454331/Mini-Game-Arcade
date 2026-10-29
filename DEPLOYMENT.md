# 🚀 Vercel Deployment Guide — Mini Game Arcade

This document contains the exact settings required to deploy **Mini Game Arcade** to Vercel.

---

## ⚙️ Vercel Project Configuration

When importing this repository into Vercel, configure the project settings as follows:

| Setting | Recommended Value | Notes |
|---|---|---|
| **Framework Preset** | `Other` | Pure static HTML5 / CSS3 / ES6 (No framework) |
| **Root Directory** | `./` | Root of the workspace |
| **Build Command** | `npm run build` | Executes automated tests and bundles into `dist/` |
| **Output Directory** | `dist` | Production static bundle directory |
| **Install Command** | `npm install` | Installs dev test dependencies |
| **Node.js Version** | `20.x` or `18.x` | Standard LTS |

> **Alternative Zero-Build Option**:  
> If you prefer deploying the repository directly without running a build step:  
> - **Build Command**: *(leave empty / toggled off)*  
> - **Output Directory**: *(leave empty / `./`)*

---

## 🛠 Deployment Methods

### Method 1: Vercel Web Dashboard (Recommended)
1. Push your repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import your **Mini Game Arcade** repository.
4. Set **Framework Preset** to `Other`.
5. Enter `dist` in the **Output Directory** field.
6. Click **Deploy**.

### Method 2: Vercel CLI
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Run local production build
npm run build

# 3. Deploy the pre-built dist folder directly
vercel deploy dist --prod
```

---

## ✅ Pre-Deployment Audit Checklist

- [x] **No Framework Lock-in**: Standard static HTML5, CSS3, ES6 modules.
- [x] **No `vercel.json` Required**: Standard static Multi-Page Application (MPA) paths work natively without rewrites.
- [x] **120/120 Asset Paths Verified**: All relative paths (`../..`, `css/`, `js/`, `assets/`) match exact case on disk.
- [x] **Zero Hardcoded Localhost URLs**: No `localhost:3000` or local dev URLs exist in web source files.
- [x] **Zero Secrets / API Keys**: Pure client-side application with zero secrets or environment variables.
- [x] **Zero External Asset Dependencies**: All graphics are local SVGs/Canvas routines, and all sound effects are procedurally generated via Web Audio API.
- [x] **Automated Tests**: 36 platform tests pass with 0 failures (`npm test`).

