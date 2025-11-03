# Deploying `todo_ui` to Vercel

This project is a monorepo with a Python backend in `api/` and a Next.js frontend in `todo_ui/`. Vercel is ideal for the frontend. Host the Python API separately (Render/Railway/Fly/EC2/etc.) and point the UI to it via `NEXT_PUBLIC_API_URL`.

If you already have a public backend URL, jump to “Environment Variables”.

## Option A — Deploy via Git (recommended)
- Push this repo to GitHub/GitLab/Bitbucket.
- In Vercel, “Add New Project” → import your repo.
- Project Settings → set `Root Directory` to `todo_ui`.
- Framework preset: Next.js (auto-detected). Build command: `next build` (default). Install command: `npm i` (default).
- Set Environment Variables (see below).
- Deploy. After the first build, Vercel gives you Preview and Production URLs.

## Option B — Deploy with Vercel CLI
- Install: `npm i -g vercel` and run `vercel login`.
- From your terminal:
  - `cd todo_ui`
  - First deploy (creates project): `vercel`
  - Set environment variables (below):
    - `vercel env add NEXT_PUBLIC_API_URL`
    - `vercel env add GOOGLE_CLIENT_ID`
    - `vercel env add GOOGLE_CLIENT_SECRET`
    - `vercel env add NEXTAUTH_SECRET`
    - (Optional) `vercel env add NEXTAUTH_URL`
  - Production deploy: `vercel --prod`

## Environment Variables
Configure these in Vercel → Project → Settings → Environment Variables.
- `NEXT_PUBLIC_API_URL`: Public base URL of your backend (e.g., `https://api.example.com`).
- `GOOGLE_CLIENT_ID`: From Google Cloud Console (OAuth 2.0 Client ID).
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console (Client Secret).
- `NEXTAUTH_SECRET`: Any secure random string (used by NextAuth). Generate with `openssl rand -base64 32`.
- (Optional) `NEXTAUTH_URL`: Your site URL (e.g., `https://your-app.vercel.app`). Useful for callbacks.
- (Optional) `CRON_SECRET`: If using `app/api/cron/route.ts`, set a secret and have Vercel Cron include `Authorization: Bearer <secret>`.

## Backend CORS
Your FastAPI backend (`api/main.py`) allows additional origins via `CORS_ALLOWED_ORIGINS`. Ensure your Vercel domains are included on the backend:
- `CORS_ALLOWED_ORIGINS="https://<project>.vercel.app,https://<your-domain>"`
- Redeploy/restart backend after setting this.

## Optional: Rewrites instead of absolute API URL
If you prefer calling the API via the same origin (avoiding CORS), you can use Vercel rewrites. Create `todo_ui/vercel.json` with:

```
{
  "rewrites": [
    { "source": "/backend/:path*", "destination": "https://YOUR_BACKEND_URL/:path*" }
  ]
}
```

Then set `NEXT_PUBLIC_API_URL` to `/backend` and your frontend will proxy requests without CORS.

## Cron Jobs (optional)
- In Vercel → Project → Settings → Cron Jobs, add a job targeting `/api/cron` on your preferred schedule.
- Add header: `Authorization: Bearer <CRON_SECRET>` using the same secret as above.

## Production Checklist
- UI builds locally: `cd todo_ui && npm i && npm run build`.
- Backend reachable from the internet with HTTPS and CORS updated.
- OAuth callback URL in Google Cloud includes your Vercel domains:
  - Authorized redirect URIs should include: `https://<project>.vercel.app/api/auth/callback/google` and your custom domain if used.
- Environment variables set for Preview and Production as needed.

## Troubleshooting
- 404 or 405 on API calls: verify `NEXT_PUBLIC_API_URL` or rewrites destination.
- CORS errors: confirm backend `CORS_ALLOWED_ORIGINS` includes your Vercel domains.
- NextAuth errors: set `NEXTAUTH_SECRET` and check redirect URIs in Google Cloud.
- Images blocked: update `images.remotePatterns` in `next.config.ts` if loading from new domains.

