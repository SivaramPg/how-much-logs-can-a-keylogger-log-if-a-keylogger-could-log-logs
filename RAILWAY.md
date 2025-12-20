# Railway Deployment Guide

## Services Overview

You'll deploy 3 services:

1. **Postgres** - Already added (Railway template)
2. **server** - Elysia API backend
3. **web** - Vite/React frontend

## Step 1: Add Server Service

1. **New Service** → **GitHub Repo** → Select this repo
2. **Settings**:
   - Root Directory: `/` (leave empty for monorepo root)
   - Builder: **Dockerfile**
   - Dockerfile Path: `apps/server/Dockerfile`

3. **Variables** (use reference variables!):

   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   BETTER_AUTH_SECRET=<generate: openssl rand -base64 32>
   BETTER_AUTH_URL=https://${{server.RAILWAY_PUBLIC_DOMAIN}}
   CORS_ORIGIN=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
   ```

4. **Networking**:
   - Generate domain or add custom domain

## Step 2: Add Web Service

1. **New Service** → **GitHub Repo** → Same repo
2. **Settings**:
   - Root Directory: `/` (leave empty)
   - Builder: **Dockerfile**
   - Dockerfile Path: `apps/web/Dockerfile`

3. **Build Args** (in Variables tab):

   ```
   VITE_SERVER_URL=https://${{server.RAILWAY_PUBLIC_DOMAIN}}
   ```

4. **Networking**:
   - Generate domain or add custom domain

## Reference Variables Cheatsheet

| Variable                            | Value                                     |
| ----------------------------------- | ----------------------------------------- |
| `${{Postgres.DATABASE_URL}}`        | Auto-generated Postgres connection string |
| `${{server.RAILWAY_PUBLIC_DOMAIN}}` | Server's public domain                    |
| `${{web.RAILWAY_PUBLIC_DOMAIN}}`    | Web's public domain                       |

## Environment Variables Summary

### Server Service

| Variable             | Value                                       |
| -------------------- | ------------------------------------------- |
| `DATABASE_URL`       | `${{Postgres.DATABASE_URL}}`                |
| `BETTER_AUTH_SECRET` | Random 32+ char secret                      |
| `BETTER_AUTH_URL`    | `https://${{server.RAILWAY_PUBLIC_DOMAIN}}` |
| `CORS_ORIGIN`        | `https://${{web.RAILWAY_PUBLIC_DOMAIN}}`    |

### Web Service (Build Args)

| Variable          | Value                                       |
| ----------------- | ------------------------------------------- |
| `VITE_SERVER_URL` | `https://${{server.RAILWAY_PUBLIC_DOMAIN}}` |

## Post-Deploy

1. **Run DB migrations** (first deploy):

   ```bash
   # In Railway shell or locally with DATABASE_URL
   bun run db:push
   ```

2. **Verify health**:
   - Server: `https://your-server.railway.app/` → should return "OK"
   - Web: `https://your-web.railway.app/` → should load the app

## Cloudflare (Optional but Recommended)

For geo-location headers to work (heatmap + latency country codes):

1. Add your domain to Cloudflare
2. Point Railway domains to Cloudflare (proxy enabled)
3. Cloudflare will add headers: `CF-IPCountry`, `CF-IPCity`, etc.

## Troubleshooting

### CORS errors

- Check `CORS_ORIGIN` matches exactly (including `https://`)
- Reference variable might not resolve yet - redeploy after web service has a domain

### Database connection failed

- Ensure `DATABASE_URL` uses reference variable
- Check Postgres service is running

### Build fails

- Monorepo needs root directory set to `/` (empty)
- Check Dockerfile path is correct: `apps/server/Dockerfile` or `apps/web/Dockerfile`
