# Deploy Khidma (Free Hosting)

This guide deploys the **frontend** and **backend** on free tiers:

- **Frontend**: [Vercel](https://vercel.com) (or Netlify) — React/Vite static site, free subdomain
- **Backend**: [Render](https://render.com) — Node.js API + free PostgreSQL

Both give you URLs like `https://khidma-xxx.vercel.app` and `https://khidma-api.onrender.com`.

---

## Prerequisites

- GitHub account (repo pushed to GitHub)
- Accounts: [Render](https://render.com), [Vercel](https://vercel.com)

---

## 1. Deploy Backend (Render)

### 1.1 Create PostgreSQL (Render)

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **PostgreSQL**.
2. Name: `khidma-db`.
3. Region: choose closest to you.
4. **Create Database**.
5. After creation, open the DB and copy **Internal Database URL** (use this in the next step; Render services in same region use it for free).

### 1.2 Create Web Service (Backend)

1. **New** → **Web Service**.
2. Connect your GitHub repo (`mhosny-dev/khidma` or your fork).
3. Configure:
   - **Name**: `khidma-api`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. **Environment** (add variables):

   | Key | Value |
   |-----|--------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *(paste Internal Database URL from step 1.1)* |
   | `JWT_SECRET` | *(generate: `openssl rand -base64 32`)* |
   | `JWT_EXPIRES_IN` | `7d` |
   | `JWT_REFRESH_EXPIRES_IN` | `30d` |
   | `CORS_ORIGIN` | `https://YOUR-FRONTEND-URL.vercel.app` *(update after deploying frontend)* |
   | `BACKEND_URL` | `https://khidma-api.onrender.com` *(your Render service URL)* |
   | `FRONTEND_URL` | `https://YOUR-FRONTEND-URL.vercel.app` |

   Optional (OAuth): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`.

   Optional (Redis): `REDIS_URL` — free at [Upstash](https://upstash.com). Without it, OTP uses in-memory fallback (lost on restart).

5. **Create Web Service**. Wait for first deploy.

### 1.3 Run Migrations

After the first deploy, run migrations once:

1. Render Dashboard → your service → **Shell** (or use **Manual Deploy** with a one-off run).
2. In the shell: `npm run migrate`.

Or locally with production DB URL:

```bash
cd backend
DATABASE_URL="postgres://..." npm run migrate
```

### 1.4 Backend URL

Note your backend URL, e.g. **`https://khidma-api.onrender.com`**. The API is at `https://khidma-api.onrender.com/api/v1`.

**Free tier note**: Service spins down after ~15 min inactivity; first request after that may take ~30–60 seconds.

---

## 2. Deploy Frontend (Vercel)

### 2.1 Connect Repo

1. Go to [Vercel](https://vercel.com) → **Add New** → **Project**.
2. Import your GitHub repo (`khidma`).
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2.2 Environment Variable

Add one variable so the frontend talks to your backend:

| Name | Value |
|------|--------|
| `VITE_API_BASE_URL` | `https://khidma-api.onrender.com/api/v1` *(your Render backend URL + `/api/v1`)* |

Redeploy after adding it so the build picks it up.

### 2.3 Deploy

Click **Deploy**. You’ll get a URL like `https://khidma-xxx.vercel.app`.

### 2.4 Update Backend CORS

In Render, edit your backend service **Environment** and set:

- `CORS_ORIGIN` = `https://khidma-xxx.vercel.app` *(your Vercel URL)*
- `FRONTEND_URL` = `https://khidma-xxx.vercel.app`

Redeploy the backend so CORS allows the frontend.

---

## 3. Optional: Netlify Instead of Vercel

1. [Netlify](https://netlify.com) → **Add new site** → **Import from Git** → select repo.
2. **Base directory**: `frontend`
3. **Build command**: `npm run build`
4. **Publish directory**: `frontend/dist`
5. **Environment**: `VITE_API_BASE_URL` = `https://khidma-api.onrender.com/api/v1`
6. Deploy. Then set `CORS_ORIGIN` and `FRONTEND_URL` on Render to your Netlify URL.

---

## 4. Summary

| Service | URL | Purpose |
|--------|-----|--------|
| Render (backend) | `https://khidma-api.onrender.com` | API + WebSocket at `/ws` |
| Vercel (frontend) | `https://khidma-xxx.vercel.app` | React app |

- Frontend uses `VITE_API_BASE_URL` to call the backend; no proxy needed.
- Backend runs on a single port (API + WebSocket), so it works on Render’s free tier.
- Redis is optional; add `REDIS_URL` (e.g. Upstash) for persistent OTP/session if needed.

---

## 5. Troubleshooting

- **CORS errors**: Ensure `CORS_ORIGIN` on Render exactly matches your frontend URL (no trailing slash).
- **401 / auth issues**: Ensure `JWT_SECRET` is set and the same across restarts.
- **DB connection failed**: Use the **Internal Database URL** from Render for the same region; check `DATABASE_URL` and that migrations have run.
- **First request slow**: Normal on Render free tier (cold start after spin-down).
