# Sigil Deployment Guide

This guide explains how to deploy Sigil to production.

## Architecture Overview

- **Frontend (Web)**: React Native Web → Cloudflare Pages
- **Mobile**: React Native → iOS App Store / Google Play Store (future)
- **Backend**: Node.js/Express → Render.com
- **Database**: PostgreSQL → Render.com (managed)

---

## Backend Deployment (Render.com)

### Prerequisites
- Render.com account (free tier available)
- GitHub repository connected to Render

### Option 1: Deploy via Render Dashboard

1. **Create Web Service**
   - Go to https://render.com/dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `sigil-backend` branch (or main)

2. **Configure Service**
   - Name: `sigil-backend`
   - Environment: `Node`
   - Branch: `main`
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm start`
   - Instance Type: Free

3. **Environment Variables**
   ```
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=<generate-random-secret>
   DATABASE_URL=<will-be-auto-populated-after-db-creation>
   ```

4. **Create PostgreSQL Database**
   - In Render dashboard, click "New +" → "PostgreSQL"
   - Name: `sigil-db`
   - Database: `sigil`
   - Instance Type: Free
   - After creation, copy the "Internal Database URL"
   - Go back to your web service → Environment
   - Update `DATABASE_URL` with the internal database URL

5. **Deploy**
   - Render will automatically deploy
   - Wait for build to complete (~5 minutes)
   - Your backend URL will be: `https://sigil-backend.onrender.com`

### Option 2: Deploy via render.yaml (Infrastructure as Code)

The repository includes a `render.yaml` file that automatically provisions both the web service and database.

1. In Render dashboard, click "New +" → "Blueprint"
2. Connect your repository
3. Render will detect `render.yaml` and provision:
   - PostgreSQL database
   - Web service
   - Automatically link them
4. Set environment variables:
   - `JWT_SECRET`: Generate a secure random string
   - `MAILSLURP_API_KEY`: Your MailSlurp API key (for email features)

### Verify Backend Deployment

```bash
# Check health endpoint
curl https://sigil-backend.onrender.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-02-10T...",
  "uptime": 123.45,
  "environment": "production"
}
```

### Run Database Migrations

After deploying, you need to run migrations:

```bash
# Option 1: Via Render Shell
# In Render dashboard → Shell tab
cd backend
npm run migrate

# Option 2: Locally against production DB
# Copy DATABASE_URL from Render
DATABASE_URL="postgresql://..." npm run migrate
```

---

## Frontend Web Deployment (Cloudflare Pages)

### Prerequisites
- Cloudflare account (free tier available)
- Cloudflare Pages connected to GitHub

### Deploy to Cloudflare Pages

1. **Update Backend URL**

   Edit `mobile/.env.production`:
   ```bash
   EXPO_PUBLIC_API_URL=https://sigil-backend.onrender.com/api
   ```

2. **Build Web App**

   ```bash
   cd mobile
   npm run web:build:prod
   ```

   This builds the web app with production API URL.

3. **Deploy to Cloudflare Pages**

   ```bash
   # Install Wrangler CLI (Cloudflare)
   npm install -g wrangler

   # Login to Cloudflare
   wrangler login

   # Deploy
   npx wrangler pages deploy dist --project-name sigil
   ```

4. **Configure Cloudflare Pages via Dashboard**

   Alternative to CLI:
   - Go to https://dash.cloudflare.com
   - Pages → Create a project
   - Connect to GitHub repository
   - Build settings:
     - Build command: `cd mobile && npm install && npm run web:build:prod`
     - Build output directory: `mobile/dist`
     - Root directory: `/`
   - Environment variables:
     - `EXPO_PUBLIC_API_URL`: `https://sigil-backend.onrender.com/api`

5. **Custom Domain (Optional)**

   - In Cloudflare Pages → Custom domains
   - Add your domain (e.g., `app.sigil.com`)
   - Cloudflare automatically provisions SSL certificate

### Verify Web Deployment

1. Open your Cloudflare Pages URL (e.g., `https://sigil.pages.dev`)
2. Open browser DevTools → Console
3. Check for API connection errors
4. Try to register/login

---

## Environment Variables Reference

### Backend (Render)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret for JWT signing | Random 32+ character string |
| `CORS_ORIGIN` | Allowed frontend origins | `https://sigil.pages.dev,https://app.sigil.com` |
| `MAILSLURP_API_KEY` | Email testing API key | `sk_...` |

### Frontend (Cloudflare Pages)

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API URL | `https://sigil-backend.onrender.com/api` |
| `MAILSLURP_API_KEY` | For e2e testing only | `sk_...` |

---

## CORS Configuration

After deploying both frontend and backend, update CORS settings:

1. In Render dashboard → Environment Variables
2. Update `CORS_ORIGIN`:
   ```
   CORS_ORIGIN=https://c7b4092d.sigil-59d.pages.dev,https://app.sigil.com
   ```
   (Replace with your actual Cloudflare Pages URL and custom domain)

3. Save and redeploy

---

## Testing Production Deployment

### Manual Testing

1. Open web app in browser
2. Open DevTools → Network tab
3. Register a new account
4. Verify API calls go to production backend
5. Check for CORS errors
6. Test login/logout flow
7. Test creating an activity

### Automated E2E Testing

```bash
cd mobile

# Run e2e tests against production
npm run test:e2e:prod

# This runs Playwright tests against:
# - Web app: https://c7b4092d.sigil-59d.pages.dev
# - Backend: https://sigil-backend.onrender.com/api
```

---

## Monitoring & Debugging

### Backend Logs (Render)

- Render dashboard → Logs tab
- Real-time logs showing all requests
- Look for errors, crashes, database connection issues

### Frontend Errors

- Browser DevTools → Console
- Check for:
  - CORS errors
  - Network errors (ERR_CONNECTION_REFUSED)
  - API 4xx/5xx errors

### Health Checks

```bash
# Check backend health
curl https://sigil-backend.onrender.com/api/health

# Check if database is accessible
curl https://sigil-backend.onrender.com/api/auth/me
# Should return 401 if not authenticated (proves DB works)
```

---

## Rollback Strategy

### Backend Rollback

1. Render dashboard → Deploys tab
2. Find previous successful deploy
3. Click "Rollback to this version"

### Frontend Rollback

1. Cloudflare Pages → Deployments
2. Find previous deployment
3. Click "Rollback to this deployment"

Alternatively, rebuild from a previous git commit:
```bash
git checkout <previous-commit>
cd mobile && npm run web:build:prod
npx wrangler pages deploy dist
```

---

## Common Issues

### Issue: Web app shows ERR_CONNECTION_REFUSED

**Cause**: Web app is trying to connect to localhost instead of production backend.

**Fix**:
1. Ensure `EXPO_PUBLIC_API_URL` is set correctly in `.env.production`
2. Rebuild web app: `npm run web:build:prod`
3. Redeploy to Cloudflare Pages

### Issue: CORS error in browser

**Cause**: Backend CORS_ORIGIN doesn't include your frontend domain.

**Fix**:
1. Render dashboard → Environment → CORS_ORIGIN
2. Add your Cloudflare Pages URL
3. Redeploy backend

### Issue: Database connection failed

**Cause**: DATABASE_URL is incorrect or database is not running.

**Fix**:
1. Verify DATABASE_URL in Render environment variables
2. Check database status in Render dashboard
3. Ensure database and web service are in same region (for internal URL)

### Issue: Render free instance sleeping

**Cause**: Render free tier spins down after 15 minutes of inactivity.

**Fix**:
- First request will be slow (~30 seconds)
- Upgrade to paid plan ($7/month) for always-on
- Or use a cron job to ping health endpoint every 10 minutes

---

## Cost Estimate

### Free Tier (Current Setup)
- **Render Web Service**: Free (spins down after inactivity)
- **Render PostgreSQL**: Free (750MB storage, 90 day retention)
- **Cloudflare Pages**: Free (unlimited bandwidth, 1 build at a time)
- **Total**: $0/month

### Paid Tier (Recommended for Production)
- **Render Web Service**: $7/month (always-on, 512MB RAM)
- **Render PostgreSQL**: $7/month (1GB storage, daily backups)
- **Cloudflare Pages**: Free (upgrade if you need faster builds)
- **Total**: ~$14/month

---

## Next Steps

1. Deploy backend to Render
2. Deploy frontend to Cloudflare Pages
3. Update CORS settings
4. Run production e2e tests
5. Set up monitoring/alerts
6. Add custom domain
7. Configure CI/CD for automatic deployments

For CI/CD setup, see [CI_CD_GUIDE.md](./CI_CD_GUIDE.md) (TODO).
