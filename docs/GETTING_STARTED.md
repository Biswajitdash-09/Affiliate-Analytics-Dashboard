# Getting Started Guide

Welcome to the Affiliate Analytics Dashboard! This guide will help you get up and running quickly.

## Table of Contents
- [Quick Start](#quick-start)
- [System Requirements](#system-requirements)
- [Local Development Setup](#local-development-setup)
- [Running Your First Test](#running-your-first-test)
- [Using the Dashboard](#using-the-dashboard)
- [Understanding the Workflow](#understanding-the-workflow)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Quick Start

### Prerequisites

Before you begin, ensure you have:

- **Node.js 18.x or higher** installed
- **MongoDB 4.4+** (local or MongoDB Atlas account)
- **npm** or **yarn** package manager
- **Git** for version control
- **Code editor** (VS Code recommended)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd Affiliate2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and add your configuration. Minimum required:
   ```env
   MONGODB_URI=mongodb://localhost:27017/affiliate_analytics
   JWT_SECRET=your-super-secret-key-minimum-32-characters
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

That's it! You should now see the application running.

---

## System Requirements

### Development Environment

**Minimum Requirements:**
- Node.js: 18.x
- npm: 9.x
- Memory: 4 GB RAM
- Disk: 500 MB free space

**Recommended:**
- Node.js: 20.x or higher
- Memory: 8 GB RAM
- Disk: 2 GB free space (SSD preferred)

### Production Environment

- Node.js: 18.x or higher
- MongoDB Atlas (M10+ tier or higher recommended)
- Redis (if enabling caching features)
- SSL/TLS certificate
- 2+ GB RAM
- For high traffic: 4+ GB RAM

---

## Local Development Setup

### Complete Local Setup with MongoDB

#### Option 1: MongoDB Atlas (Recommended for Beginners)

1. **Create Free MongoDB Atlas Account**
   - Visit https://www.mongodb.com/cloud/atlas
   - Sign up for free account
   - Create free cluster (M0)

2. **Configure Network Access**
   - Go to "Network Access"
   - Add IP Address: `0.0.0.0/0` (allows all IPs, OK for development)
   - Or add your local IP address

3. **Create Database User**
   - Go to "Database Access"
   - Add new database user
   - Username: `affiliate_admin` (or your choice)
   - Password: Create strong password
   - Database User Privileges: Read and write to any database

4. **Get Connection String**
   - Go to "Connect"
   - Choose "Connect your application"
   - Copy the connection string

5. **Update .env**
   ```env
   MONGODB_URI=mongodb+srv://affiliate_admin:<password>@cluster0.example.mongodb.net/affiliate_analytics?retryWrites=true&w=majority
   ```

#### Option 2: Local MongoDB Instance

**For Ubuntu/Debian:**
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update repository and install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

**For macOS (using Homebrew):**
```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community
```

**For Windows:**
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Run the installer
3. Install MongoDB as a Windows service

### Configure Environment Variables

Create `.env` file in the root directory:

```env
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/affiliate_analytics
MONGODB_DB=affiliate_analytics

# Optional: Redis (for caching)
REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=false

# Authentication
JWT_SECRET=local-dev-secret-only-change-in-production-min-32-chars
JWT_EXPIRY_DAYS=365

# Stripe (use test keys for development)
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key

# Database Connection Pooling (relaxed for dev)
DB_MIN_POOL_SIZE=1
DB_MAX_POOL_SIZE=3

# Rate Limiting (relaxed for dev)
RATE_LIMIT_AUTH_MAX_REQUESTS=20
RATE_LIMIT_API_MAX_REQUESTS=200
```

### Install Dependencies

```bash
npm install
```

This installs all required packages including:
- Next.js (React framework)
- MongoDB driver
- Stripe SDK
- JWT authentication
- Database utilities
- Security libraries
- And all dependencies

---

## Running Your First Test

### Start the Application

```bash
npm run dev
```

You should see:
```
  ▲ Next.js 15.3.6
  - Local:        http://localhost:3000
  - Ready in 2.5s
```

### Verify Database Connection

Open your browser and visit:
- Dashboard: http://localhost:3000

You should see the login page.

### Create Your First Admin User

The application includes helper scripts. Run:

```bash
# Create admin user node create-admin.js
```

This will create an admin user with:
- Email: You'll be prompted
- Password: You'll be prompted
- Role: Admin (full access)

### Login to the Dashboard

1. Navigate to http://localhost:3000/login
2. Enter your admin credentials
3. Click "Login" button

You should now be redirected to the Dashboard.

---

## Using the Dashboard

### Admin Dashboard Features

As an admin, you have access to:

1. **Overview Dashboard**
   - Real-time KPIs (clicks, conversions, revenue)
   - Performance trends charts
   - Recent activity feed
   - Leaderboards

2. **Affiliate Management** (`/dashboard/affiliates`)
   - View all affiliates
   - Create new affiliates
   - Update affiliate status
   - Manage commission rates
   - View earnings and performance

3. **Campaign Management** (`/dashboard/campaigns`)
   - Create campaigns
   - Configure payout rules
   - Track campaign performance
   - Manage active/paused/archived status

4. **Analytics** (`/dashboard`)
   - Date range filtering
   - KPI metrics
   - Performance trends
   - Comparison views

5. **Payouts** (`/dashboard/payouts`)
   - View payout history
   - Process payouts
   - Track payment status

6. **Settings** (`/dashboard/settings`)
   - Global platform settings
   - Default commission rate
   - Minimum payout threshold
   - Platform configuration

7. **Integration** (`/dashboard/integration`)
   - Integration guides
   - API documentation
   - Tracking setup instructions

8. **Help Center** (`/dashboard/help`)
   - User guides
   - FAQ
   - Support resources

### Affiliate Dashboard Features

Affiliates have access to:

1. **My Portal** (`/dashboard/my-portal`)
   - Personal performance metrics
   - Earnings overview
   - Commission breakdown

2. **Performance Tracking** (`/dashboard`)
   - View clicks and conversions
   - Monitor earnings in real-time
   - Track campaign performance

3. **Tracking Links** (`/dashboard/my-portal`)
   - Generate tracking links
   - Get campaign-specific URLs
   - Track link performance

4. **Payout History** (`/dashboard/payouts`)
   - View payment history
   - Check payout status
   - Download statements

---

## Understanding the Workflow

### Complete Affiliate Tracking Workflow

```
1. AFFILIATE CREATION
   ↓
   Register affiliate → Create profile → Assign commission rate → Generate affiliate ID
   ↓
2. KEY GENERATION
   ↓
   Create campaign → Generate tracking URL → Distribute to affiliate
   ↓
3. TRACKING
   ↓
   User clicks link → Bot filtering → Record click → Generate click ID → Store cookie
   ↓
4. CONVERSION
   ↓
   User completes purchase → Stripe webhook → Attribute to affiliate → Calculate commission
   ↓
5. REVENUE
   ↓
   Record revenue → Update affiliate earnings → Track pending payouts
   ↓
6. PAYOUT
   ↓
   Request payout → Verify balance → Process payment → Update status
```

### Key Concepts

**Affiliate IDs**: Unique identifiers for each affiliate. Used for tracking attribution.

**Campaigns**: Organize different marketing initiatives or promotions. Each campaign can have its own payout rules.

**Tracking Links**: URLs that embed your affiliate ID. When clicked, they record the click and attribute future conversions.

**Click ID**: Unique identifier for each click. Used to track the user journey from click to conversion.

**Paid Revenue Confirmation**: Only revenue is counted as paid (and commission is earned) when it has been verified or confirmed, rather than when it's initiated or pending.

**Commission Calculation**: 
- Fixed amounts when action completes (e.g., flat payment for each signup)
- Percentage of revenue for revenue-share models
- Tiered commissions based on performance (higher earners get higher rates)

**Payout Threshold**: Minimum amount an affiliate must earn before being eligible for a payout (configurable in settings).

---

## Common Tasks

### Create a Campaign

1. Log in as admin
2. Go to Campaigns: `/dashboard/campaigns`
3. Click "New Campaign" button
4. Fill in:
   - **Campaign Name**: e.g., "Summer Sale 2024"
   - **Destination URL**: The page where users land
   - **Payout Rules**: Configure type (CPA/RevShare) and amount/percentage
   - **Status**: Active, Paused, or Archived
5. Click "Create Campaign"
6. Copy the campaign ID shown

### Create an Affiliate

1. Go to Affiliates: `/dashboard/affiliates`
2. Click "Add Affiliate" button
3. Either:
   - **Link existing user**: Enter user ID
   - **Create new user**: Enter name, email, and create password
4. Set commission rate (optional, uses default if not set)
5. Set status (Active, Pending, Suspended)
6. Click "Create"

### Generate Tracking Link

1. Create a campaign first (if not done)
2. Go to Campaigns: `/dashboard/campaigns`
3. Find your campaign
4. Click "Generate Link" or use LinkGenerator component
5. Configure:
   - Select campaign
   - Select affiliate or enter custom parameters
6. Copy the generated tracking URL

### Setup Stripe Integration

1. Get Stripe API keys:
   - Go to https://dashboard.stripe.com
   - Navigate to Developers → API keys
   - Copy Publishable and Secret keys

2. Configure webhook:
   - Create webhook: https://dashboard.stripe.com/webhooks
   - Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
   - Events to monitor: `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`, `charge.dispute.created`
   - Get webhook signing secret

3. Update environment:
   ```env
   STRIPE_PUBLISHABLE_KEY=pk_live_your_key
   STRIPE_SECRET_KEY=sk_live_your_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

4. Implement attribution in checkout:
   ```javascript
   // Include in checkout session metadata
   const { url } = await stripe.checkout.sessions.create({
     line_items: [...],
     mode: 'payment',
     metadata: {
       affiliateId: 'affiliate_123',
       campaignId: 'campaign_456',
     },
   });
   ```

### Process a Payout

1. Go to Payouts: `/dashboard/payouts`
2. Click "Process Payout"
3. Fill in:
   - **Affiliate**: Select affiliate
   - **Amount**: Payout amount
   - **Method**: Bank transfer, PayPal, etc.
   - **Transaction ID**: Bank reference or transaction ID
   - **Notes**: Optional notes
4. Click "Process"
5. Verify:
   - Payout record created
   - Affiliate's pending balance decreased
   - Total paid amount updated

### View Analytics

1. Navigate to Dashboard: `/dashboard`
2. Use date range selector to filter
3. View KPIs:
   - Total Clicks
   - Conversions
   - Revenue
   - Conversion rate
4. Use chart selector to view different metrics
5. Check leaderboards for top performers

---

## Troubleshooting

### Application Won't Start

**Problem**: `npm run dev` fails or shows errors

**Check**:
1. Node.js version: `node --version` (must be 18.x+)
2. Dependencies installed: `npm list`
3. Port not in use: Ensure port 3000 is available

**Solutions**:
```bash
# Update Node.js if needed
nvm install 20
nvm use 20

# Clean install
rm -rf node_modules package-lock.json
npm install

# Check for errors
npm run dev 2>&1 | tee dev.log
```

### Database Connection Failed

**Problem**: "MongoDB connection failed" error

**Check**:
1. MongoDB is running: For local, check MongoDB service
2. MONGODB_URI is correct in `.env`
3. IP whitelist configured (MongoDB Atlas)
4. Network connectivity

**Solutions**:

For MongoDB Atlas:
```bash
# Test connection
mongosh "mongodb+srv://<user>:<password>@cluster.mongodb.net/affiliate_analytics"
```

For local MongoDB:
```bash
# Check MongoDB status
sudo systemctl status mongod  # Linux
brew services list | grep mongo # macOS
```

### Webhook Signature Verification Failed

**Problem**: Stripe webhook verification errors

**Check**:
1. STRIPE_WEBHOOK_SECRET is correct (case-sensitive)
2. Webhook endpoint is publicly accessible
3. Matching events in webhook configuration

**Solutions**:
1. Verify webhook secret in Stripe dashboard
2. Test webhook from Stripe dashboard
3. Ensure no authentication blocking webhook endpoint
4. Check endpoint logs for webhook payload

### Can't Login

**Problem**: Login fails with error

**Possible Causes**:
1. Incorrect credentials
2. User not activated
3. JWT_SECRET not set
4. User role not set correctly

**Check**:
```javascript
// Check user in MongoDB
mongosh
use affiliate_analytics
db.users.find({ email: "your@email.com" })
```

**Solutions**:
1. Verify credentials are correct
2. Check user status in database
3. Ensure JWT_SECRET is set (min 32 characters)
4. Check user.role is set to 'admin' or 'affiliate'

### Revenue Not Tracking

**Problem**: Payments not attributing to affiliates

**Check**:
1. Stripe integration is configured
2. Webhook is receiving events
3. Affiliate ID is in checkout metadata
4. Commission calculation is working

**Debug Steps**:
1. Check Stripe dashboard webhook delivery logs
2. Check application error logs (Sentry if enabled)
3. Verify webhook endpoint is receiving events
4. Check metrics under `/api/analytics/overview`

### Rate Limiting Too Aggressive

**Problem**: Getting 429 errors too quickly

**Check**:
1. Rate limit settings in `.env`
2. Shared IP (multiple users behind same proxy)

**Solutions**:
```env
# Increase limits
RATE_LIMIT_AUTH_MAX_REQUESTS=20
RATE_LIMIT_API_MAX_REQUESTS=200

# Or temporarily disable for testing
# (Not recommended in production!)
```

### Unit Tests Failing

**Problem**: Tests failing unexpectedly

**Check**:
1. Test database configuration
2. Mock dependencies are working
3. Test helpers are accurate

**Solutions**:
```bash
# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test __tests__/api/auth.test.js

# Debug specific test
npm test -- --debug --testNamePattern="should login"
```

### Build Errors

**Problem**: `npm run build` fails

**Check**:
1. All dependencies installed
2. TypeScript configuration is correct
3. No syntax errors in files

**Solutions**:
```bash
# Clean build
rm -rf .next
npm run build

# Check for issues
npm run lint
npm run build 2>&1 | tee build.log
```

---

## Performance Tips

### For Development

- Use minimal data for testing
- Disable Redis if not needed (`REDIS_ENABLED=false`)
- Reduce database pool size (`DB_MAX_POOL_SIZE=2`)
- Increase rate limits for easier testing

### For Production

- Enable Redis caching (`REDIS_ENABLED=true`)
- Configure connection pooling optimally
- Monitor database connection pool stats
- Set appropriate rate limits
- Enable error monitoring (Sentry)
- Enable security headers
- Use CDN for static assets (next-image-optimization)

---

## Learning Resources

### Understanding the Codebase

**Key Files to Explore**:
- `app/dashboard/page.jsx` - Main dashboard component
- `app/api/analytics/overview/route.js` - Analytics API
- `app/api/tracking/click/route.js` - Click tracking implementation
- `models/` - Data models and schemas
- `lib/db.js` - Database connection
- `lib/stripe.js` - Stripe integration

### Recommended Reading

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com/manual)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [React Documentation](https://react.dev)

### Debugging Tips

**Enable detailed logs**:
```env
NODE_ENV=development
```

**Check database operations**:
```javascript
// Add logging in lib/db.js
logInfo('Database operation', { operation });
```

**Monitor Stripe events**:
- Check Stripe dashboard webhook logs
- Monitor webhook endpoint in app logs

---

## Getting Help

### Issue Tracking

If you encounter issues:

1. **Check logs first**: Always check application logs for errors
2. **Search existing issues**: Check if someone has already had this problem
3. **Check environment**: Verify all environment variables are set correctly
4. **Test integration**: Test database and external service connectivity

### Where to Report Issues

- GitHub Issues: Report bugs and feature requests
- Email: For security concerns or sensitive issues

---

## Next Steps

After getting started:

1. **Create sample data**: Use provided scripts or API to test functionality
2. **Implement real campaigns**: Set up actual campaigns and affiliates
3. **Configure production settings**: Set up Stripe and webhooks
4. **Test the full workflow**: End-to-end from click to payout
5. **Customize**: Modify UI, add features, adjust settings
6. **Deploy**: Follow [Deployment Guide](./DEPLOYMENT_GUIDE.md)

### Advanced Setup

- **Enable all features**: Redis, Sentry, etc.
- **Customize templates**: Modify UI and email templates
- **Add webhooks**: Implement additional integrations
- **Set up monitoring**: Configure Sentry alerts
- **Scale up**: Move to larger MongoDB instance as needed

---

## Quick Reference

### Important URLs (Local Development)

- Dashboard: http://localhost:3000/dashboard
- Login: http://localhost:3000/login
- Signup: http://localhost:3000/signup
- API Base: http://localhost:3000/api

### Key Environment Variables (Quick Copy)

```env
# Minimum for development
MONGODB_URI=mongodb://localhost:27017/affiliate_analytics
JWT_SECRET=minimum-32-characters-change-me
JWT_EXPIRY_DAYS=365
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Useful Commands

```bash
# Start development server
npm run dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint

# Create admin user
node create-admin.js

# Delete user
node delete-user.js

# Clear mock data
node clear-mock-data.js
```

---

**Congratulations!** 🎉

You should now have the Affiliate Analytics Dashboard running locally. For production deployment, refer to the [Deployment Guide](./DEPLOYMENT_GUIDE.md).

---

**Last Updated**: 2024-01-06