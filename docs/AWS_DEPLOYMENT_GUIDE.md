# AWS Deployment Guide - Sigil Backend

Complete guide to deploying Sigil backend to AWS using App Runner + RDS PostgreSQL.

---

## 📋 Table of Contents
- [Why AWS App Runner?](#why-aws-app-runner)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Step 1: Create RDS PostgreSQL Database](#step-1-create-rds-postgresql-database)
- [Step 2: Deploy Backend with App Runner](#step-2-deploy-backend-with-app-runner)
- [Step 3: Run Database Migrations](#step-3-run-database-migrations)
- [Step 4: Update Frontend Configuration](#step-4-update-frontend-configuration)
- [Step 5: Test Production Deployment](#step-5-test-production-deployment)
- [Cost Breakdown](#cost-breakdown)
- [Troubleshooting](#troubleshooting)

---

## Why AWS App Runner?

AWS App Runner is the best choice for Sigil because:

✅ **Fully Managed** - No server management, auto-scaling, load balancing
✅ **Simple Deployment** - Connect GitHub repo and deploy in minutes
✅ **Cost Effective** - Free tier eligible, pay only for what you use
✅ **Native Node.js Support** - No Docker required (but supports it)
✅ **RDS Integration** - Easy VPC connector for PostgreSQL access
✅ **Auto HTTPS** - Automatic SSL/TLS certificates
✅ **Health Checks** - Built-in monitoring and auto-restart

**Alternative Considered**: Elastic Beanstalk (more control but more complex, requires EC2 management)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Pages                        │
│              (Frontend - Already Deployed)                  │
│         https://fd5469fc.sigil-59d.pages.dev               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ HTTPS API Calls
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   AWS App Runner                            │
│              (Node.js + Express Backend)                    │
│         https://YOUR-APP.awsapprunner.com/api              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ VPC Connector
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   AWS RDS PostgreSQL                        │
│              (Free Tier: db.t4g.micro)                      │
│                     256MB Storage                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

✅ AWS account with access keys (you already have these)
✅ GitHub repository with backend code
✅ Cloudflare Pages frontend deployed
✅ MailSlurp API key for email testing

**Your AWS Credentials** (from `.secret/.env.secret`):
- Access Key ID: `AKIATDTCLTRFI4NSM5P6`
- Region: `us-east-1`

---

## Step 1: Create RDS PostgreSQL Database

### 1.1 Open RDS Console

1. Go to https://console.aws.amazon.com/rds/
2. Select region: **US East (N. Virginia) / us-east-1**
3. Click **Create database**

### 1.2 Configure Database

**Engine Options:**
- Engine type: **PostgreSQL**
- Version: **PostgreSQL 16.x** (latest)

**Templates:**
- Select: **Free tier** ✅ (automatically selects optimal free-tier settings)

**Settings:**
- DB instance identifier: `sigil-postgres`
- Master username: `postgres`
- Master password: Generate a strong password (save it!)
  - Example: `SigilDB2026!SecurePass`
  - **IMPORTANT**: Save this password - you'll need it for connection string

**Instance Configuration** (Auto-selected by Free Tier):
- DB instance class: `db.t4g.micro` (1 vCPU, 1GB RAM)
- Storage: 20 GB gp2

**Connectivity:**
- Compute resource: **Don't connect to an EC2 compute resource**
- VPC: Default VPC
- Public access: **No** (App Runner will connect via VPC)
- VPC security group: **Create new**
  - Name: `sigil-rds-sg`

**Database Authentication:**
- Database authentication: **Password authentication**

**Additional Configuration:**
- Initial database name: `sigil_production`
- Enable automated backups: **Yes** (7 days retention)
- Enable encryption: **Yes**

### 1.3 Create Database

Click **Create database** and wait 5-10 minutes for provisioning.

### 1.4 Note Connection Details

Once created, click on `sigil-postgres` and note:
- **Endpoint**: `sigil-postgres.xxxxxxxxxx.us-east-1.rds.amazonaws.com`
- **Port**: `5432`
- **Database name**: `sigil_production`

**Connection String Format:**
```
postgresql://postgres:YOUR_PASSWORD@sigil-postgres.xxxxxxxxxx.us-east-1.rds.amazonaws.com:5432/sigil_production
```

---

## Step 2: Deploy Backend with App Runner

### 2.1 Open App Runner Console

1. Go to https://console.aws.amazon.com/apprunner/
2. Select region: **US East (N. Virginia) / us-east-1**
3. Click **Create service**

### 2.2 Configure Source

**Repository type:**
- Source: **Source code repository**
- Connect to GitHub: Click **Add new**
  - Authorize AWS Connector for GitHub
  - Select your repository: `sigil_root` or `sigil_dev`
  - Branch: `main`

**Deployment settings:**
- Deployment trigger: **Automatic** (deploys on git push)

Click **Next**

### 2.3 Configure Build

**Build settings:**
- Runtime: **Node.js 20**
- Build command:
  ```bash
  cd backend && npm install && npm run build
  ```
- Start command:
  ```bash
  cd backend && npm start
  ```
- Port: `3000`

**Configuration file:**
- Use apprunner.yaml: **No** (we'll configure manually)

Click **Next**

### 2.4 Configure Service

**Service settings:**
- Service name: `sigil-backend`
- CPU: **1 vCPU** (free tier eligible)
- Memory: **2 GB** (free tier eligible)
- Port: `3000`

**Environment variables** (click "Add environment variable" for each):

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | `postgresql://postgres:YOUR_PASSWORD@sigil-postgres.xxxxxxxxxx.us-east-1.rds.amazonaws.com:5432/sigil_production` |
| `JWT_SECRET` | Generate random: `openssl rand -base64 32` |
| `MAILSLURP_API_KEY` | `sk_Ud6NMoTdTDgR2aSZ_PD1rtr2SKLY26FvKEmTRQ2DeEiknVXI7aY06naP61wxHbRv9P1jCjHITkNCJ0uhk` |
| `CORS_ORIGIN` | `https://fd5469fc.sigil-59d.pages.dev` |

**Auto scaling:**
- Minimum instances: **1**
- Maximum instances: **3**

**Health check:**
- Protocol: **HTTP**
- Path: `/api/health`
- Interval: **10 seconds**
- Timeout: **5 seconds**
- Healthy threshold: **2**
- Unhealthy threshold: **3**

### 2.5 Configure Networking (CRITICAL)

**VPC Connector** (Required for RDS access):
- Add custom VPC: **Yes**
- VPC: Default VPC
- Subnets: Select **all available subnets**
- Security groups: Create new
  - Name: `sigil-apprunner-sg`
  - Outbound rules: Allow all
  - Inbound rules: Allow HTTP/HTTPS (added automatically)

Click **Next**

### 2.6 Review and Create

Review all settings and click **Create & deploy**

⏱️ **Wait 10-15 minutes** for initial deployment

### 2.7 Get Service URL

Once deployed, note your service URL:
```
https://xxxxxxxxxx.us-east-1.awsapprunner.com
```

Your API will be accessible at:
```
https://xxxxxxxxxx.us-east-1.awsapprunner.com/api
```

---

## Step 3: Run Database Migrations

### Option A: Using AWS Cloud Shell (Recommended)

1. Open AWS CloudShell: https://console.aws.amazon.com/cloudshell/
2. Clone your repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/sigil_root.git
   cd sigil_root/backend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set database URL:
   ```bash
   export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@sigil-postgres.xxxxxxxxxx.us-east-1.rds.amazonaws.com:5432/sigil_production"
   ```
5. Run migrations:
   ```bash
   npm run migrate
   ```

### Option B: Using Local Machine

1. Install PostgreSQL client:
   ```bash
   brew install postgresql
   ```
2. Temporarily allow your IP in RDS security group:
   - Go to RDS → Databases → sigil-postgres
   - Click on VPC security group
   - Add inbound rule: PostgreSQL (5432), Source: My IP
3. Run migrations from backend directory:
   ```bash
   cd backend
   export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@sigil-postgres.xxxxxxxxxx.us-east-1.rds.amazonaws.com:5432/sigil_production"
   npm run migrate
   ```
4. Remove the temporary IP rule after migration

---

## Step 4: Update Frontend Configuration

### 4.1 Update Environment File

Edit `mobile/.env.production`:
```env
EXPO_PUBLIC_API_URL=https://YOUR-APPRUNNER-URL.us-east-1.awsapprunner.com/api
```

### 4.2 Rebuild and Redeploy Frontend

```bash
cd mobile
npm run web:build:prod
npx wrangler pages deploy dist --project-name sigil
```

### 4.3 Update CORS in App Runner

1. Go to App Runner Console
2. Select `sigil-backend` service
3. Click **Configuration** tab
4. Edit environment variables
5. Update `CORS_ORIGIN` to include new Cloudflare URL (if changed):
   ```
   https://fd5469fc.sigil-59d.pages.dev,https://your-custom-domain.com
   ```
6. Save and redeploy (takes ~5 minutes)

---

## Step 5: Test Production Deployment

### 5.1 Test Health Endpoint

```bash
curl https://YOUR-APPRUNNER-URL.us-east-1.awsapprunner.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-11T...",
  "uptime": 123.45,
  "environment": "production"
}
```

### 5.2 Test Registration

```bash
curl -X POST https://YOUR-APPRUNNER-URL.us-east-1.awsapprunner.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "displayName": "Test User"
  }'
```

### 5.3 Run E2E Tests

```bash
cd mobile
npm run test:e2e:prod
```

This will test:
- Registration flow with MailSlurp emails
- Login and session persistence
- Activity CRUD operations
- All against production backend

### 5.4 Manual Browser Test

1. Open: https://fd5469fc.sigil-59d.pages.dev
2. Register a new account
3. Log in
4. Create an activity
5. Verify everything works

---

## Cost Breakdown

### Free Tier (First 12 Months)

**AWS App Runner:**
- Build: 100 build minutes/month FREE
- Compute: 2000 vCPU-hour/month FREE (~1 vCPU always-on)
- Memory: 4000 GB-hour/month FREE (~2GB always-on)

**RDS PostgreSQL:**
- Instance: 750 hours/month FREE (db.t4g.micro)
- Storage: 20 GB FREE
- Backups: 20 GB FREE

**Total Cost**: **$0/month** (within free tier limits)

### After Free Tier

**App Runner** (~$0.064/hour = $46/month):
- vCPU: $0.064/vCPU-hour × 1 vCPU × 720 hours = $46/month
- Memory: $0.007/GB-hour × 2 GB × 720 hours = $10/month
- **Subtotal**: ~$56/month

**RDS PostgreSQL** (~$15/month):
- Instance: db.t4g.micro ~$0.016/hour × 720 hours = $12/month
- Storage: 20 GB × $0.115/GB = $2.30/month
- Backups: First 20 GB FREE
- **Subtotal**: ~$15/month

**Total After Free Tier**: **~$71/month**

**Cost Optimization Tips:**
- Use App Runner auto-pause (scale to 0 when idle) - saves ~70%
- Reduce RDS storage to 10 GB if sufficient - saves $1/month
- Use Aurora Serverless v2 (better for sporadic traffic) - variable cost

---

## Security Checklist

- [x] RDS in private subnet (no public access)
- [x] App Runner uses VPC connector for RDS access
- [x] Security groups restrict access
- [x] SSL/TLS encryption in transit (automatic)
- [x] RDS encryption at rest enabled
- [x] Strong database password
- [x] JWT secret is cryptographically random
- [x] Environment variables stored securely
- [x] CORS restricted to frontend domain
- [x] API keys not committed to git

---

## Monitoring and Logs

### App Runner Logs

1. Go to App Runner Console
2. Select `sigil-backend` service
3. Click **Logs** tab
4. View real-time logs or download

### CloudWatch Logs

1. Go to CloudWatch Console: https://console.aws.amazon.com/cloudwatch/
2. Select **Log groups**
3. Find `/aws/apprunner/sigil-backend/...`
4. Set up log retention (7-30 days recommended)

### RDS Monitoring

1. Go to RDS Console
2. Select `sigil-postgres`
3. Click **Monitoring** tab
4. View CPU, connections, storage metrics

### Set Up Alarms (Optional)

Create CloudWatch alarms for:
- App Runner 5xx errors > 10/minute
- RDS CPU utilization > 80%
- RDS storage < 10% free
- App Runner unhealthy status

---

## Troubleshooting

### Issue: App Runner Deploy Fails

**Symptoms**: Build fails or service won't start

**Solutions**:
1. Check build logs in App Runner console
2. Verify build/start commands are correct
3. Ensure `package.json` has `build` and `start` scripts
4. Check Node.js version compatibility

### Issue: Cannot Connect to RDS

**Symptoms**: Database connection timeout

**Solutions**:
1. Verify VPC connector is configured in App Runner
2. Check RDS security group allows traffic from App Runner SG
3. Verify DATABASE_URL is correct (check endpoint, password)
4. Ensure RDS is in "Available" state
5. Test connection from CloudShell:
   ```bash
   psql "postgresql://postgres:PASSWORD@ENDPOINT:5432/sigil_production"
   ```

### Issue: CORS Errors on Frontend

**Symptoms**: Browser shows CORS policy error

**Solutions**:
1. Verify `CORS_ORIGIN` env var includes your Cloudflare URL
2. Check that frontend is using correct API URL
3. Redeploy App Runner after changing CORS settings
4. Test with curl (CORS is browser-only, curl should work)

### Issue: Health Check Failing

**Symptoms**: App Runner shows "Unhealthy" status

**Solutions**:
1. Verify `/api/health` endpoint exists and returns 200
2. Check health check path is `/api/health` (not `/health`)
3. Verify app is listening on port 3000
4. Check app logs for errors
5. Test health endpoint manually:
   ```bash
   curl https://YOUR-URL.awsapprunner.com/api/health
   ```

### Issue: High Latency

**Symptoms**: Slow API responses

**Solutions**:
1. Check App Runner is in same region as RDS (us-east-1)
2. Enable RDS Performance Insights
3. Add database indexes for frequent queries
4. Increase App Runner CPU/memory
5. Enable database connection pooling

### Issue: Database Migrations Failed

**Symptoms**: Migrations don't run or fail

**Solutions**:
1. Check migration files exist in `backend/migrations/`
2. Verify DATABASE_URL is correct
3. Ensure migrations table exists
4. Run migrations manually from CloudShell
5. Check migration logs for specific errors

---

## Rollback Strategy

### If Deployment Fails:

1. **App Runner**: Click "Rollback" in console to previous deployment
2. **Frontend**: Redeploy previous build to Cloudflare Pages
3. **Database**: RDS automated backups allow point-in-time recovery (7 days)

### Emergency Rollback:

```bash
# Rollback App Runner to previous deployment
aws apprunner update-service \
  --service-arn YOUR_SERVICE_ARN \
  --source-configuration "AutoDeploymentsEnabled=false"

# Point frontend to old backend
cd mobile
nano .env.production  # Update API_URL to old backend
npm run web:build:prod
npx wrangler pages deploy dist --project-name sigil
```

---

## CI/CD Setup (Optional)

### GitHub Actions for Auto-Deploy

Create `.github/workflows/deploy-aws.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run Tests
        run: |
          cd backend
          npm ci
          npm test

      - name: Trigger App Runner Deploy
        run: |
          aws apprunner start-deployment \
            --service-arn ${{ secrets.APPRUNNER_SERVICE_ARN }}
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: us-east-1
```

---

## Next Steps After Deployment

- [ ] Set up custom domain (e.g., `api.sigil.app`)
- [ ] Configure CloudFront CDN for faster global access
- [ ] Set up automated database backups to S3
- [ ] Enable AWS WAF for API protection
- [ ] Set up CloudWatch dashboards
- [ ] Configure alerts and notifications
- [ ] Enable AWS X-Ray for distributed tracing
- [ ] Implement rate limiting at API Gateway level

---

## Resources

- [AWS App Runner Documentation](https://docs.aws.amazon.com/apprunner/)
- [AWS RDS PostgreSQL Guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [Deploying Node.js Apps to App Runner](https://medium.com/@things-to-know/apprunner-rds-the-easiest-way-to-avoid-deployment-struggles-8c735a803c51)
- [App Runner with RDS](https://repost.aws/questions/QUnm9sWqVHTyKYX_UOKnpmHg/app-runner-and-rds)

---

**🚀 Ready to deploy! Follow the steps above to get your backend live on AWS.**
