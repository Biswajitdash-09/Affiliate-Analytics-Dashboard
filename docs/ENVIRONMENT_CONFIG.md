# Environment Configuration Guide

This guide details all environment variables and configuration options for the Affiliate Analytics Dashboard.

## Table of Contents
- [Overview](#overview)
- [Required Environment Variables](#required-environment-variables)
- [Optional Environment Variables](#optional-environment-variables)
- [Environment-Specific Configuration](#environment-specific-configuration)
- [Security Best Practices](#security-best-practices)
- [Example Configuration Files](#example-configuration-files)
- [Troubleshooting Configuration Issues](#troubleshooting-configuration-issues)

---

## Overview

The application uses environment variables for configuration. These can be set in:
- `.env` file for local development
- `.env.production` for production builds
- Environment variables in your hosting platform (Vercel, Docker, etc.)

---

## Required Environment Variables

### Application Settings

```env
NODE_ENV=production
```
- **Values**: `development`, `production`, `test`
- **Purpose**: Controls application behavior
- **Notes**: 
  - Development: Enables detailed logs, disables certain security features
  - Production: Optimizes performance, enables all security features
  - Test: Configures for testing environment

```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```
- **Purpose**: Base URL of the application
- **Required**: Yes
- **Examples**:
  - Local: `http://localhost:3000`
  - Production: `https://affiliate.yourdomain.com`
- **Notes**: Must start with `http://` or `https://`. Should not include trailing slash.

### Database Configuration

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.example.mongodb.net/affiliate_analytics?retryWrites=true&w=majority
```
- **Purpose**: MongoDB connection string
- **Required**: Yes
- **Components**:
  - `mongodb+srv://` or `mongodb://`: Protocol
  - `<username>`: Database username
  - `<password>`: Database password
  - `@cluster.example.mongodb.net`: MongoDB host
  - `/affiliate_analytics`: Database name
  - `?retryWrites=true&w=majority`: Connection options
- **MongoDB Atlas**: Get from Dashboard → Connect → Connect your application
- **Notes**: 
  - Must start with `mongodb://` or `mongodb+srv://`
  - Use URL-encoded password if containing special characters
  - Create a dedicated database user for this application
  - Never commit this to version control

```env
MONGODB_DB=affiliate_analytics
```
- **Purpose**: Database name to use
- **Required**: Yes
- **Default**: `affiliate_analytics`
- **Notes**: Should match database name in MONGODB_URI

### Authentication

```env
JWT_SECRET=your-super-secret-key-minimum-32-characters-longer-is-better
```
- **Purpose**: Secret key for JWT token signing
- **Required**: Yes
- **Minimum Length**: 32 characters
- **Security Requirements**:
  - Must be cryptographically random
  - Unique per environment
  - Rotated regularly
  - Never shared or committed to version control
- **Generation**: 
  ```bash
  # Using Node.js
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  
  # Using OpenSSL
  openssl rand -hex 64
  ```

```env
JWT_EXPIRY_DAYS=7
```
- **Purpose**: Number of days until JWT token expires
- **Required**: No (default: 7)
- **Values**: Positive integer
- **Recommended**: 
  - Development: `365` (for convenience)
  - Production: `7` or less
- **Notes**: Lower values increase security but require more frequent logins

### Stripe Configuration

```env
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here
```
- **Purpose**: Stripe public key
- **Required**: Yes
- **Format**: Starts with `pk_live_` or `pk_test_`
- **Location**: Stripe Dashboard → Developers → API keys
- **Notes**: This key can be exposed in frontend code

```env
STRIPE_SECRET_KEY=sk_live_your_secret_key_here
```
- **Purpose**: Stripe secret key for API calls
- **Required**: Yes
- **Format**: Starts with `sk_live_` or `sk_test_`
- **Location**: Stripe Dashboard → Developers → API keys
- **Security**: NEVER commit to version control, never expose to frontend

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
```
- **Purpose**: Secret for verifying webhook signatures
- **Required**: Yes
- **Location**: Stripe Dashboard → Developers → Webhooks → signing secret
- **Security**: Critical for webhook security
- **Notes**: 
  - Required for webhook endpoint security
  - Must match exactly (case-sensitive)
  - Rotate if webhook endpoint is ever exposed

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here
```
- **Purpose**: Stripe public key for frontend
- **Required**: Yes
- **Note**: Same value as STRIPE_PUBLISHABLE_KEY, but with NEXT_PUBLIC_ prefix

### Error Monitoring (Sentry)

```env
SENTRY_DSN=https://<key>@sentry.io/<project-id>
```
- **Purpose**: Sentry Data Source Name for error tracking
- **Required**: Recommended
- **Location**: Sentry Dashboard → Settings → Client Keys (DSN)
- **Format**: `https://<sentry-key>@<org>.sentry.io/<project-id>`
- **Notes**: 
  - Optional but highly recommended for production
  - Enables automatic error monitoring and reporting
  - Free tier available

```env
SENTRY_ENVIRONMENT=production
```
- **Purpose**: Environment name for Sentry
- **Required**: No (default: production)
- **Values**: `development`, `staging`, `production`
- **Notes**: Helps categorize errors by environment

---

## Optional Environment Variables

### Redis Configuration

```env
REDIS_URL=redis://:<password>@host:6379/0
```
- **Purpose**: Redis connection string for caching
- **Required**: Optional (but recommended)
- **Format**: 
  - Single instance: `redis://[:password@]host[:port][/db-number]`
  - With TLS: `rediss://[:password@]host[:port][/db-number]`
  - Sentinel: `redis://[:password@]host[:port][/db-number]`
- **Examples**:
  ```
  redis://localhost:6379
  redis://:mypassword@redis.example.com:6379/0
  rediss://:password@cloud-redis.redis.com:6380/0
  ```
- **Notes**: 
  - Improves performance for frequently accessed data
  - If not set, caching will be disabled
  - Recommended for production

```env
REDIS_ENABLED=true
```
- **Purpose**: Enable/disable Redis caching globally
- **Required**: No (default: true)
- **Values**: `true`, `false`
- **Notes**: 
  - Set to `false` if experiencing Redis connectivity issues
  - Application will function without Redis (with reduced performance)

### Database Connection Pooling

```env
DB_MIN_POOL_SIZE=2
```
- **Purpose**: Minimum number of connections in pool
- **Required**: No (default: 2)
- **Values**: Positive integer
- **Recommended**: 
  - Development: `1`
  - Production: `2-5`
- **Notes**: Lower values reduce database connections, higher values improve concurrency

```env
DB_MAX_POOL_SIZE=10
```
- **Purpose**: Maximum number of connections in pool
- **Required**: No (default: 10)
- **Values**: Positive integer
- **Recommended**: 
  - Development: `5`
  - Production: `10-20`
- **Notes**: 
  - Must be supported by your MongoDB Atlas tier
  - Higher values improve performance for high traffic
  - Free MongoDB Atlas tier has max pool size of 10

```env
DB_MAX_IDLE_TIME=30000
```
- **Purpose**: Maximum idle time for connections (milliseconds)
- **Required**: No (default: 30000)
- **Values**: Positive integer (milliseconds)
- **Recommended**: `30000` (30 seconds) or higher
- **Notes**: Connections idle longer than this will be closed

```env
DB_SELECTION_TIMEOUT=5000
```
- **Purpose**: Server selection timeout (milliseconds)
- **Required**: No (default: 5000)
- **Values**: Positive integer (milliseconds)
- **Recommended**: `5000` (5 seconds)
- **Notes**: Time to wait for server selection before error

```env
DB_CONNECT_TIMEOUT=10000
```
- **Purpose**: Connection establishment timeout (milliseconds)
- **Required**: No (default: 10000)
- **Values**: Positive integer (milliseconds)
- **Recommended**: `10000` (10 seconds)
- **Notes**: Time to wait for connection before error

```env
DB_SOCKET_TIMEOUT=45000`
```
- **Purpose**: Socket timeout for operations (milliseconds)
- **Required**: No (default: 45000)
- **Values**: Positive integer (milliseconds)
- **Recommended**: `45000` (45 seconds)
- **Notes**: Time to wait for MongoDB operations before timeout

```env
DB_MAX_CONNECTING=5
```
- **Purpose**: Maximum number of simultaneous connection attempts
- **Required**: No (default: 5)
- **Values**: Positive integer
- **Recommended**: `5`
- **Notes**: Limits concurrent connection attempts to server

```env
RETRY_WRITES=true
```
- **Purpose**: Enable retry of failed write operations
- **Required**: No (default: true)
- **Values**: `true`, `false`
- **Notes**: 
  - Set to `false` if writes must fail immediately
  - Recommended: `true` for improved reliability

```env
DB_RETRY_READS=true
```
- **Purpose**: Enable retry of failed read operations
- **Required**: No (default: true)
- **Values**: `true`, `false`
- **Notes**: 
  - Set to `false` to disable automatic read retries
  - Recommended: `true` for improved reliability

### Rate Limiting

```env
RATE_LIMIT_AUTH_WINDOW_MS=900000
```
- **Purpose**: Time window for authentication rate limiting (milliseconds)
- **Required**: No (default: 900000 - 15 minutes)
- **Values**: Positive integer (milliseconds)
- **Note**: Controls how long the rate limit window lasts

```env
RATE_LIMIT_AUTH_MAX_REQUESTS=5
```
- **Purpose**: Maximum requests for authentication endpoints within the window
- **Required**: No (default: 5)
- **Values**: Positive integer
- **Note**: Controls how many login attempts are allowed

```env
RATE_LIMIT_API_WINDOW_MS=60000
```
- **Purpose**: Time window for API endpoints rate limiting (milliseconds)
- **Required**: No (default: 60000 - 1 minute)
- **Values**: Positive integer (milliseconds)

```env
RATE_LIMIT_API_MAX_REQUESTS=100
```
- **Purpose**: Maximum API requests within the window
- **Required**: No (default: 100)
- **Values**: Positive integer
- **Note**: Total requests allowed per minute

```env
RATE_LIMIT_ANALYTICS_WINDOW_MS=60000
```
- **Purpose**: Time window for analytics API rate limiting (milliseconds)
- **Required**: No (default: 60000 - 1 minute)
- **Values**: Positive integer (milliseconds)

```env
RATE_LIMIT_ANALYTICS_MAX_REQUESTS=60
```
- **Purpose**: Maximum analytics API requests within the window
- **Required**: No (default: 60)
- **Values**: Positive integer

```env
RATE_LIMIT_TRACKING_WINDOW_MS=60000
```
- **Purpose**: Time window for tracking endpoint rate limiting (milliseconds)
- **Required**: No (default: 60000 - 1 minute)
- **Values**: Positive integer (milliseconds)

```env
RATE_LIMIT_TRACKING_MAX_REQUESTS=1000
```
- **Purpose**: Maximum tracking requests within the window
- **Required**: No (default: 1000)
- **Values**: Positive integer
- **Note**: Tracking endpoints can handle high volume

---

## Environment-Specific Configuration

### Development (.env)

```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (use test database locally)
MONGODB_URI=mongodb://localhost:27017/affiliate_analytics_dev
MONGODB_DB=affiliate_analytics_dev

# Redis (optional for dev)
REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=false

# Authentication
JWT_SECRET=development_secret_only_for_testing_change_in_production
JWT_EXPIRY_DAYS=365

# Stripe (test mode)
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key

# Sentry
SENTRY_DSN= # Optional, can use development environment
SENTRY_ENVIRONMENT=development

# Performance (relaxed for dev)
DB_MIN_POOL_SIZE=1
DB_MAX_POOL_SIZE=3

# Rate limiting (relaxed for dev)
RATE_LIMIT_AUTH_MAX_REQUESTS=20
RATE_LIMIT_API_MAX_REQUESTS=200
```

### Production (.env.production)

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://affiliate.yourdomain.com

# Database (production)
MONGODB_URI=mongodb+srv://prodUser:securePassword@cluster.mongodb.net/affiliate_analytics?retryWrites=true&w=majority
MONGODB_DB=affiliate_analytics

# Redis (enabled for performance)
REDIS_URL=rediss://:password@redis.example.com:6380/0
REDIS_ENABLED=true

# Authentication (strong secrets)
JWT_SECRET=<generate-a-64-character-random-secret>
JWT_EXPIRY_DAYS=7

# Stripe (live mode)
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key

# Sentry (production monitoring)
SENTRY_DSN=https://key@o1234.ingest.sentry.io/12345
SENTRY_ENVIRONMENT=production

# Performance (optimized)
DB_MIN_POOL_SIZE=2
DB_MAX_POOL_SIZE=10
DB_MAX_IDLE_TIME=30000
DB_SELECTION_TIMEOUT=5000
DB_CONNECT_TIMEOUT=10000
DB_SOCKET_TIMEOUT=45000
DB_MAX_CONNECTING=5
RETRY_WRITES=true
DB_RETRY_READS=true

# Rate limiting (production limits)
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX_REQUESTS=5
RATE_LIMIT_API_WINDOW_MS=60000
RATE_LIMIT_API_MAX_REQUESTS=100

# Security
firebase is disabled (not used)
```

### Testing (.env.test)

```env
NODE_ENV=test
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Use in-memory database or test database
MONGODB_URI=mongodb://localhost:27017/affiliate_analytics_test
MONGODB_DB=affiliate_analytics_test

# Disable caching for tests
REDIS_ENABLED=false

# Short tokens for speed
JWT_SECRET=test_secret_key_for_testing
JWT_EXPIRY_DAYS=1

# Mock Stripe or use test mode
STRIPE_PUBLISHABLE_KEY=pk_test_test
STRIPE_SECRET_KEY=sk_test_test
STRIPE_WEBHOOK_SECRET=whsec_test
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_test

# Disable Sentry in tests
SENTRY_DSENTRY_DSN=

# Minimal performance settings
DB_MIN_POOL_SIZE=1
DB_MAX_POOL_SIZE=2
```

---

## Security Best Practices

### Secret Management

1. **Never commit secrets to version control**
   - Add `.env` to `.gitignore`
   - Use `.env.example` as template (without real secrets)

2. **Use different secrets per environment**
   - Development, staging, and production must have unique secrets
   - Rotate secrets on compromise suspicion

3. **Generate secure secrets**
   ```bash
   # Generate JWT secret (64 chars recommended for production)
   openssl rand -hex 64
   
   # Generate webhook signing secrets (Stripe generates these)
   ```

4. **Rotate secrets regularly**
   - Schedule: Every 90 days for JWT
   - Schedule: Secure compromise to rotate (Stripe)
   - Schedule: Whenever an employee leaves

5. **Store secrets securely**
   - Use environment variables in production
   - Use secret managers for cloud deployments (AWS Secrets Manager, etc.)
   - Never hardcode in source code

### Variable Validation

After setting environment variables:

1. **Validate database connection**:
   ```bash
   # Test MongoDB connection
   mongosh "$MONGODB_URI"
   ```

2. **Validate Redis connection** (if used):
   ```bash
   # Test Redis connection
   redis-cli -u "$REDIS_URL" ping
   ```

3. **Validate Stripe keys**:
   - Test keys in Stripe dashboard's API key tester
   - Ensure using correct environment (test vs live)

4. **Sentry configuration**:
   - Check Sentry dashboard for incoming errors
   - Verify DSN is correct

---

## Example Configuration Files

### .env.example

Create `.env.example` in project root:

```env
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/affiliate_analytics
MONGODB_DB=affiliate_analytics

# Redis (optional)
REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=false

# Database Connection Pooling
DB_MIN_POOL_SIZE=2
DB_MAX_POOL_SIZE=10
DB_MAX_IDLE_TIME=30000
DB_SELECTION_TIMEOUT=5000
DB_CONNECT_TIMEOUT=10000
DB_SOCKET_TIMEOUT=45000
DB_MAX_CONNECTING=5
RETRY_WRITES=true
DB_RETRY_READS=true

# Authentication
JWT_SECRET=generate-with-openssl-or-nodejs-crypto
JWT_EXPIRY_DAYS=7

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_
STRIPE_SECRET_KEY=sk_test_
STRIPE_WEBHOOK_SECRET=whsec_
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_

# Sentry
SENTRY_DSN=https://
SENTRY_ENVIRONMENT=production

# Rate Limiting
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX_REQUESTS=5
RATE_LIMIT_API_WINDOW_MS=60000
RATE_LIMIT_API_MAX_REQUESTS=100
RATE_LIMIT_ANALYTICS_WINDOW_MS=60000
RATE_LIMIT_ANALYTICS_MAX_REQUESTS=60
RATE_LIMIT_TRACKING_WINDOW_MS=60000
RATE_LIMIT_TRACKING_MAX_REQUESTS=1000
```

### .gitignore

Ensure `.ignore` includes:

```
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
*.local
```

---

## Troubleshooting Configuration Issues

### Issue: Application won't start

**Symptoms**: Application fails to start or shows configuration errors

**Possible Causes**:
1. Missing required environment variables
2. Invalid MONGODB_URI format
3. Invalid JWT_SECRET (too short)

**Solutions**:
1. Check all required variables are set
2. Verify MONGODB_URI starts with `mongodb://` or `mongodb+srv://`
3. Ensure JWT_SECRET is at least 32 characters
4. Check application logs for specific error messages

### Issue: Database connection failed

**Symptoms**: "MongoDB connection failed" errors

**Possible Causes**:
1. Incorrect MONGODB_URI
2. IP not whitelisted (MongoDB Atlas)
3. Network restrictions
4. Invalid database credentials

**Solutions**:
1. Verify MONGODB_URI correctness
2. Check MongoDB Atlas Network Access settings
3. Ensure firewall allows MongoDB Atlas access
4. Test connection with MongoDB Compass or mongosh

### Issue: Webhook verification fails

**Symptoms**: "Webhook signature verification failed" errors

**Possible Causes**:
1. Incorrect STRIPE_WEBHOOK_SECRET
2. Mismatched secret between Stripe and application
3. Webhook endpoint not accessible

**Solutions**:
1. Verify STRIPE_WEBHOOK_SECRET exactly matches Stripe dashboard
2. Check webhook is sending to correct URL
3. Ensure endpoint is publicly accessible (not behind auth)
4. Test webhook from Stripe dashboard

### Issue: Stripe integration not working

**Symptoms**: Payment tracking not attributing correctly

**Possible Causes**:
1. Using test keys in production
2. Webhook not properly configured
3. Missing attribution data in checkout

**Solutions**:
1. Ensure using live keys in production environment
2. Verify webhook is configured and receiving events
3. Check checkout sessions include affiliate_id and campaign_id in metadata

### Issue: Redis connection failed

**Symptoms**: "Redis connection error" warnings

**Possible Causes**:
1. Incorrect REDIS_URL
2. Redis service not running
3. Network/firewall restrictions

**Solutions**:
1. Verify REDIS_URL format: `redis://host:port/db`
2. Check Redis service status
3. Set REDIS_ENABLED=false if not critical
4. Test with: `redis-cli -u "$REDIS_URL" ping`

### Issue: Rate limiting too aggressive

**Symptoms**: Legitimate users getting rate limited

**Possible Causes**:
1. Rate limit settings too low
2. Skipping limits due to shared IP
3. Rate limit window too short

**Solutions**:
1. Increase RATE_LIMIT_*_MAX_REQUESTS values
2. Adjust RATE_LIMIT_*_WINDOW_MS values
3. Check rate limiting middleware implementation

### Issue: High database connection errors

**Symptoms**: Frequent "Mongo connection error" messages

**Possible Causes**:
1. Connection pool too small
2. Connection timeout too short
3. Network issues with MongoDB

**Solutions**:
1. Increase DB_MAX_POOL_SIZE within Atlas plan limits
2. Increase DB_CONNECT_TIMEOUT and DB_SOCKET_TIMEOUT
3. Check MongoDB Atlas status page
4. Review connection pooling configuration

### Issue: CORS errors

**Symptoms**: Browser console shows CORS errors

**Possible Causes**:
1. Incorrect NEXT_PUBLIC_APP_URL
2. Missing CORS configuration
3. Development vs production URL mismatch

**Solutions**:
1. Verify NEXT_PUBLIC_APP_URL is correct
2. Check origin in CORS middleware
3. Ensure no trailing slash in URLs

---

## Additional Notes

### Local Development Setup

For local development without external services:

```env
# Use local MongoDB
MONGODB_URI=mongodb://localhost:27017/affiliate_analytics

# Disable Redis
REDIS_ENABLED=false

# Development settings
NODE_ENV=development
```

### Testing Dependencies

```bash
# Install dependencies
npm install

# Check if all packages installed successfully
npm list
```

### Environment Variable Loading

Next.js automatically loads `.env` files in this priority order:

1. `.env.$(NODE_ENV).local` (highest priority)
2. `.env.local`
3. `.env.$(NODE_ENV)`
4. `.env` (lowest priority)

For most cases, use:
- `.env` - Base configuration
- `.env.local` - Local overrides (not committed)
- `.env.production` - Production overrides

---

## Support

For configuration issues:
1. Check application logs for specific errors
2. Verify all required variables are set
3. Test connections to external services
4. Check service status pages (MongoDB Atlas, Stripe, Redis)
5. Refer to [Deployment Guide](./DEPLOYMENT_GUIDE.md)

---

**Last Updated**: 2024-01-06