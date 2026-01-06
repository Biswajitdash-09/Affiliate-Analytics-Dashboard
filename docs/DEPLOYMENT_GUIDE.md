# Deployment Guide - Affiliate Analytics Dashboard

This guide provides step-by-step instructions for deploying the Affiliate Analytics Dashboard to production.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Redis Setup](#redis-setup)
- [Authentication Configuration](#authentication-configuration)
- [Stripe Integration](#stripe-integration)
- [Sentry Integration](#sentry-integration)
- [Building for Production](#building-for-production)
- [Deployment Options](#deployment-options)
- [Post-Deployment Checklist](#post-deployment-checklist)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

Before deploying, ensure you have:

- Node.js 18.x or higher
- MongoDB 4.4 or higher (or MongoDB Atlas account)
- Redis 6.x or higher (or Redis Cloud account)
- Stripe account for payment processing
- Sentry account for error monitoring (recommended)
- Git for version control
- PM2 or equivalent process manager (for self-hosted)

### Required Accounts/Services

1. **MongoDB Atlas** (https://www.mongodb.com/cloud/atlas)
   - Free tier available
   - Provides hosted MongoDB with automatic backups

2. **Redis** (https://redis.io)
   - Redis Cloud free tier available (https://redis.com/try-free/)
   - Alternatively, self-hosted Redis

3. **Stripe** (https://stripe.com)
   - Required for payment processing
   - Get API keys from dashboard

4. **Sentry** (https://sentry.io)
   - Recommended for error monitoring
   - Free developer tier available

---

## Environment Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd Affiliate2
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory (or `.env.production` for production):

```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/affiliate_analytics?retryWrites=true&w=majority
MONGODB_DB=affiliate_analytics

# Redis (optional but recommended)
REDIS_URL=redis://:<password>@redis-host:6379
REDIS_ENABLED=true

# Database Connection Pooling
DB_MIN_POOL_SIZE=2
DB_MAX_POOL_SIZE=10
DB_MAX_IDLE_TIME=30000
DB_SELECTION_TIMEOUT=5000
DB_CONNECT_TIMEOUT=10000
DB_SOCKET_TIMEOUT=45000
DB_MAX_CONNECTING=5
RETRY_WRITES=true

# Authentication
JWT_SECRET=<your-super-secret-jwt-key-min-32-chars>
JWT_EXPIRY_DAYS=7

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key

# Sentry (Error Monitoring)
SENTRY_DSN=https://<your-dsn>@sentry.io/<project-id>
SENTRY_ENVIRONMENT=production

# Rate Limiting (optional overrides)
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX_REQUESTS=5
RATE_LIMIT_API_WINDOW_MS=60000
RATE_LIMIT_API_MAX_REQUESTS=100
RATE_LIMIT_ANALYTICS_WINDOW_MS=60000
RATE_LIMIT_ANALYTICS_MAX_REQUESTS=60
RATE_LIMIT_TRACKING_WINDOW_MS=60000
RATE_LIMIT_TRACKING_MAX_REQUESTS=1000
```

### Important Security Notes

- **NEVER commit `.env` file to version control**
- Use strong, unique secrets for `JWT_SECRET`
- Rotate all API keys regularly
- Use environment-specific keys (not test keys in production)

---

## Database Setup

### MongoDB Atlas (Recommended)

1. Create a MongoDB Atlas account
2. Create a new cluster (free tier works for testing)
3. Set up IP whitelist in Network Access:
   - Add your server IP or use `0.0.0.0/0` (not recommended for production)
4. Create a database user:
   - Username: `affiliate_analytics_user` (or your preferred name)
   - Password: Use a strong password
   - Database Privileges: Read and write to any database
5. Get the connection string from "Connect" → "Connect your application"
6. Update `MONGODB_URI` in your `.env` file

### Self-hosted MongoDB

If running your own MongoDB instance:

```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt-get install -y mongodb

# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Create database and user
mongosh
```

In MongoDB shell:

```javascript
use affiliate_analytics
db.createUser({
  user: "affiliate_analytics_user",
  pwd: "strong_password_here",
  roles: ["readWrite"]
})
```

### Initialize Database

After first deployment, the application will automatically initialize indexes. To verify:

```javascript
# Connect to your database and check indexes
mongosh "mongodb+srv://<user>:<password>@cluster.mongodb.net/affiliate_analytics"
use affiliate_analytics
db.users.getIndexes()
db.affiliate_profiles.getIndexes()
db.campaigns.getIndexes()
db.revenues.getIndexes()
db.payouts.getIndexes()
db.short_links.getIndexes()
```

---

## Redis Setup

### Redis Cloud (Recommended)

1. Create a Redis Cloud account: https://redis.com/try-free/
2. Create a new database
3. Get connection details (Redis URL)
4. Add your server IP to the access list
5. Update `REDIS_URL` in your `.env` file

### Self-hosted Redis

```bash
# Install Redis (Ubuntu/Debian)
sudo apt-get install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Update configuration for production:
# - Set requirepass for authentication
# - Configure maxmemory and maxmemory-policy
# - Enable persistence (RDB and AOF)

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test connection
redis-cli ping
```

Redis configuration example:

```
bind 127.0.0.1
port 6379
requirepass your_redis_password
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
```

---

## Authentication Configuration

### Generate JWT Secret

Generate a secure random secret for JWT:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

Update `JWT_SECRET` in your `.env` file.

### Create Initial Admin User

The application includes helper scripts. Run after first deployment:

```bash
# Create admin user
node create-admin.js

# Create/Edit affiliate
# node create-affiliate.js (if exists)
```

Or via API:

```bash
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@yourdomain.com",
    "password": "secure_password_here"
  }'
```

Then manually update the user role in MongoDB:

```javascript
mongosh "mongodb+srv://<user>:<password>@cluster.mongodb.net/affiliate_analytics"
use affiliate_analytics
db.users.updateOne(
  { email: "admin@yourdomain.com" },
  { $set: { role: "admin" } }
)
```

---

## Stripe Integration

### Stripe Configuration

1. Log in to Stripe Dashboard (https://dashboard.stripe.com)
2. Get your API keys from "Developers" → "API keys"
3. Configure webhook endpoint:
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events to monitor:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `charge.refunded`
     - `charge.dispute.created`
4. Get webhook signing secret from webhook settings

### Test Stripe Integration

After deployment, test the webhook:

```bash
# Send a test webhook using Stripe CLI (development)
stripe trigger checkout.session.completed

# Or via Stripe Dashboard's webhook testing feature
```

### Configure Payment Flow

Ensure your checkout pages include affiliate attribution:

```javascript
// Example: Include user ID and campaign ID in checkout
const sessionId = await stripe.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card'],
  line_items: [...],
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
  metadata: {
    affiliateId: 'user_123',
    campaignId: 'campaign_456',
    clickId: 'click_789'
  },
  client_reference_id: JSON.stringify({
    affiliate_id: 'user_123',
    campaign_id: 'campaign_456'
  })
});
```

---

## Sentry Integration

### Set Up Sentry

1. Create a Sentry account: https://sentry.io
2. Create a new project (JavaScript/Next.js)
3. Get your DSN from project settings
4. Update `SENTRY_DSN` in your `.env` file
5. Configure environment name (`SENTRY_ENVIRONMENT`)

### Verify Sentry Integration

```bash
# Trigger a test error
# Visit a non-existent page to trigger boundary error
# Or add temporary test code:
throw new Error('Sentry test error');
```

Check Sentry dashboard to confirm error is being captured.

---

## Building for Production

### Build the Application

```bash
npm run build
```

This will:
1. Optimize assets
2. Generate static pages
3. Create optimized chunks
4. Minify JavaScript/CSS
5. Generate source maps (remove for production)

### Test Build Locally

```bash
npm run start

# Test at http://localhost:3000
```

### Remove Source Maps (Optional, for security)

In `next.config.mjs`, add:

```javascript
const nextConfig = {
  // ... existing config
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  }
};

export default nextConfig;
```

---

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

1. Push code to GitHub/GitLab/Bitbucket
2. Import project in Vercel: https://vercel.com/new
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

Vercel environment variables:
- Copy all variables from `.env`
- Vercel automatically handles NEXT_PUBLIC_ prefixed variables

### Option 2: Docker Deployment

1. Create `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --app /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

2. Update `next.config.mjs`:

```javascript
const nextConfig = {
  output: 'standalone',
  // ...
};

export default nextConfig;
```

3. Build and run:

```bash
# Build image
docker build -t affiliate-analytics .

# Run container
docker run -p 3000:3000 \
  --env-file .env \
  affiliate-analytics
```

### Option 3: Self-Hosted with PM2

1. Build the application: `npm run build`
2. Install PM2 globally: `npm install -g pm2`
3. Create ecosystem file:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'affiliate-analytics',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/your/app',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/combined.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
    exec_mode: 'cluster',
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      '.git'
    ]
  }]
};
```

4. Start application:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

5. Set up Nginx reverse proxy:

```nginx
# /etc/nginx/sites-available/affiliate-analytics
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy websockets
    location /_next/webpack-hmr {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

6. Enable SSL with Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Post-Deployment Checklist

After deployment, verify:

- [ ] Application loads at `https://yourdomain.com`
- [ ] Login/Signup functionality works
- [ ] Dashboard loads without errors
- [ ] Database connection is healthy
- [ ] Redis connection is working (if enabled)
- [ ] Stripe webhooks are receiving events
- [ ] Sentry is capturing errors (check dashboard)
- [ ] Security headers are present (check browser DevTools)
- [ ] Rate limiting is working (test by making many requests)
- [ ] CSRF protection is functional
- [ ] All pages are accessible
- [ ] API endpoints respond correctly
- [ ] Click tracking works
- [ ] Revenue tracking works
- [ ] Payout functionality works

### Health Check Endpoint

Add a health check endpoint for monitoring:

```javascript
// app/api/health/route.js
import { healthCheck, getCacheHealthCheck } from '@/lib/db';
import { cacheHealthCheck } from '@/lib/cache';

export async function GET() {
  const [dbHealth, cacheHealth] = await Promise.all([
    healthCheck(),
    cacheHealthCheck()
  ]);

  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: dbHealth,
      cache: cacheHealth,
    },
  });
}
```

---

## Monitoring & Maintenance

### Log Monitoring

Monitor application logs:

```bash
# PM2
pm2 logs affiliate-analytics --lines 100

# Docker
docker logs affiliate-analytics --tail 100 -f

# Vercel
# Check Vercel dashboard logs
```

### Performance Monitoring

Key metrics to monitor:
- Response times (should be < 500ms for API calls)
- Memory usage
- Database query performance
- Cache hit rates
- Error rates
- Uptime

### Regular Maintenance Tasks

Weekly:
- Review Sentry error reports
- Check Stripe dashboard for payment issues
- Monitor database storage
- Review analytics for unusual patterns

Monthly:
- Review security logs
- Update dependencies: `npm update`
- Backup database (if self-hosted)
- Review rate limiting effectiveness
- Test disaster recovery procedures

Quarterly:
- Security audit
- Secret rotation (JWT keys, API keys)
- Performance optimization review
- Cost optimization review

### Backup Strategy

If using MongoDB Atlas:
- Automatic backups are enabled
- Configure retention period (recommended: 7-30 days)

If self-hosted:
```bash
# Backup database
mongodump --uri="mongodb://<user>:<password>@host:27017/affiliate_analytics" --out=/backups/mongodb

# Automate with cron job
0 2 * * * mongodump --uri="mongodb://..." --out=/backups/mongodb/$(date +\%Y\%m\%d)
```

---

## Troubleshooting

### Common Issues

**Issue: Database connection failed**
- Verify MONGODB_URI is correct
- Check IP whitelist in MongoDB Atlas
- Verify network connectivity

**Issue: Webhook signature verification failed**
- Verify STRIPE_WEBHOOK_SECRET matches exactly
- Ensure matched events are selected in webhook config
- Check that webhook URL is publicly accessible

**Issue: High memory usage**
- Reduce DB_MAX_POOL_SIZE
- Check for memory leaks (profile with Node.js inspector)
- Review connection pooling settings

**Issue: Slow performance**
- Enable Redis caching
- Check database indexes
- Review slow query logs in MongoDB Atlas
- Check database connection pool stats

**Issue: Rate limiting too aggressive**
- Adjust rate limit environment variables
- Check for bot traffic being blocked
- Review rate limit rules

---

## Security Checklist

- [ ] Strong, unique secrets in environment variables
- [ ] All API keys are production-specific (not test keys)
- [ ] Firewall configured (only necessary ports open)
- [ ] Regular security updates applied
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Security headers configured and verified
- [ ] CORS properly configured
- [ ] Rate limiting active and tested
- [ ] Input validation on all endpoints
- [ ] CSRF protection enabled
- [ ] Regular backups configured
- [ ] Secret rotation schedule in place
- [ ] Monitoring for anomalous behavior
- [ ] Incident response plan documented

---

## Support

For deployment issues:
1. Check application logs
2. Review Sentry error dashboard
3. Check service status (MongoDB, Redis, Stripe)
4. Verify environment variables
5. Test with reduced configuration (disable Redis, etc.)

For additional help, refer to:
- [API Reference](./API_REFERENCE.md)
- [Data Schema](./DATA_SCHEMA.md)
- [Getting Started Guide](./GETTING_STARTED.md)

---

**Last Updated**: 2024-01-06