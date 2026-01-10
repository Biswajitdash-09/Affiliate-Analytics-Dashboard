# Security Model & Data Isolation Documentation

## Overview

This document outlines the security architecture and data isolation model implemented for the Affiliate Analytics Dashboard. The system ensures that affiliates can only access their own data, while administrators have full visibility and control over the platform.

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Role Definitions](#role-definitions)
3. [Authentication Flow](#authentication-flow)
4. [Authorization Layers](#authorization-layers)
5. [Data Isolation Strategy](#data-isolation-strategy)
6. [API Security Patterns](#api-security-patterns)
7. [Testing Guidelines](#testing-guidelines)
8. [Best Practices](#best-practices)

---

## Security Architecture

The security implementation follows a **defense-in-depth** approach with multiple layers of protection:

```text
┌─────────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                               │
├─────────────────────────────────────────────────────────────────┤
│ Layer 1: Middleware (Route Protection)                            │
│  • JWT token verification                                        │
│  • Role-based route validation                                    │
│  • Automatic redirection                                         │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2: API Route Protection                                    │
│  • requireAuth() - Authentication check                          │
│  • requireAdmin() - Role verification                             │
│  • Data filtering by role                                         │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3: Client-Side Role Checks                                  │
│  • React component protection                                     │
│  • Conditional rendering                                         │
│  • Automatic redirects                                            │
├─────────────────────────────────────────────────────────────────┤
│ Layer 4: Database-Level Isolation                                 │
│  • Query filtering by affiliateId                                │
│  • Aggregation role-based filtering                               │
│  • Validate data ownership                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Role Definitions

### 1. Administrator (admin)

**Definition**: Platform administrators with full system access.

**Privileges**:

- Access to all dashboard pages
- View global analytics (all affiliates aggregated)
- Create, edit, delete campaigns
- Manage affiliate accounts (onboard, suspend, adjust rates)
- Process payouts for all affiliates
- View fraud detection logs
- Access admin tools and conversion tester
- Manual adjustments to affiliate data

**Routes**:

- `/dashboard` - Main dashboard (global view)
- `/dashboard/affiliates` - Affiliate management
- `/dashboard/admin` - Admin panel
- `/dashboard/campaigns` - Full campaign management
- `/dashboard/payouts` - Process all payouts
- `/dashboard/fraud` - Fraud detection system
- `/api/admin/*` - Admin-only API endpoints

### 2. Affiliate (affiliate)

**Definition**: Marketing partners who promote products and earn commissions.

**Privileges**:

- Access to personal dashboard only
- View **only their own** data (clicks, conversions, earnings)
- View all active campaigns (read-only)
- Generate tracking links
- View their own payout history
- Access their profile settings

**Restrictions**:

- Cannot access admin pages
- Cannot view other affiliates' data
- Cannot create/edit/delete campaigns
- Cannot process payouts
- Cannot view fraud detection logs

**Routes**:

- `/dashboard/my-portal` - Personal dashboard
- `/dashboard/campaigns` - View available campaigns (read-only)
- `/dashboard/settings` - Personal settings
- `/api/affiliate/*` - Affiliate-specific API endpoints

---

## Authentication Flow

### Login Process

```text
┌─────────────┐
│   User      │
│ Login       │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ POST /api/auth/login│
└──────┬──────────────┘
       │
       ├─→ Validate credentials
       │
       ├─→ Generate JWT token
       │   (includes userId, role, email)
       │
       └─→ Return token + user data
              (stored in localStorage)
```

### Token Structure

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "role": "affiliate" or "admin"
}
```

### Token Verification

JWT tokens are verified using [`lib/auth.js`](../lib/auth.js):

```javascript
// Require authentication
const authError = requireAuth(request);
if (authError) return authError; // Returns 401 if invalid

// Get authenticated user
const authUser = getAuthUser(request);
const userRole = authUser?.role;
const userId = authUser?.userId;
```

---

## Authorization Layers

### Layer 1: Middleware Protection

**File**: [`middleware.js`](../middleware.js)

The middleware provides the first line of defense:

1. **Protected Route Detection**: Checks if request is for a protected dashboard route
2. **Token Extraction**: Extracts JWT from `Authorization` header or cookie
3. **Token Verification**: Validates token signature and expiry
4. **Role-Based Routing**:
   - Admins: Allowed to `/dashboard` and admin pages
   - Affiliates: Redirected to `/dashboard/my-portal`
   - Unauthorized: Redirected to `/login`

#### Middleware Logic Flow

```javascript
// Pseudocode
if (route is protected) {
  token = extractToken(request);
  
  if (!token) {
    return redirectToLogin();
  }
  
  decodedUser = verifyJWT(token);
  
  if (route === '/dashboard' && decodedUser.role === 'affiliate') {
    return redirect('/dashboard/my-portal');
  }
  
  if (route.startsWith('/dashboard/admin') && decodedUser.role !== 'admin') {
    return redirect('/dashboard/my-portal');
  }
}
```

### Layer 2: API Route Protection

**Authentication Utilities**: [`lib/auth.js`](../lib/auth.js)

All protected API routes use:

```javascript
import { requireAuth, requireAdmin, getAuthUser } from '@/lib/auth';

// For authenticated routes
const authError = requireAuth(request);
if (authError) return authError; // Returns 401 response

// For admin-only routes
const adminError = requireAdmin(request);
if (adminError) return adminError; // Returns 403 response

// Get user details for filtering
const authUser = getAuthUser(request);
```

#### Example: Analytics API

**File**: [`app/api/analytics/overview/route.js`](../app/api/analytics/overview/route.js)

```javascript
export async function GET(request) {
  // 1. Require authentication
  const authError = requireAuth(request);
  if (authError) return authError;

  // 2. Get user info
  const authUser = getAuthUser(request);
  const userRole = authUser?.role || 'affiliate';
  const userId = authUser?.userId;

  // 3. Build query based on role
  const baseClickMatch = {
    createdAt: { $gte: startDate, $lte: endDate },
    filtered: false
  };

  // 4. If affiliate, add filter
  if (userRole === 'affiliate' && userId) {
    baseClickMatch.affiliateId = userId;
  }

  // 5. Admin gets global data (no affiliateId filter)
}
```

### Layer 3: Client-Side Protection

All admin pages include client-side role checks:

```javascript
"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const AdminPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard/my-portal');
      return;
    }
  }, [user, router]);
  
  // ... rest of component
};
```

### Layer 4: Database-Level Isolation

All data queries filter by user role:

| Collection | Filter for Admin | Filter for Affiliate |
|------------|----------------|---------------------|
| `click_events` | No filter | `{ affiliateId: userId }` |
| `revenues` | No filter | `{ affiliateId: userId }` |
| `affiliate_profiles` | Admin view all | `{ userId: userId }` (own profile) |
| `payouts` | Admin process all | `{ affiliateId: userId }` (own history) |

---

## Data Isolation Strategy

### 1. Click Events

**Admin View**: Can see all click events across all affiliates

```javascript
// Clicks from all affiliates
db.collection('click_events').aggregate([
  { $match: { filtered: false } }
])
```

**Affiliate View**: Can only see their own click events

```javascript
// Filtered by affiliateId
db.collection('click_events').aggregate([
  { 
    $match: { 
      filtered: false,
      affiliateId: userId  // Affiliate's own ID
    } 
  }
])
```

### 2. Revenue & Conversions

**Admin View**: Global revenue analytics

```javascript
db.collection('revenues').aggregate([
  { $match: { status: 'succeeded' } }
])
```

**Affiliate View**: Only their own revenue

```javascript
db.collection('revenues').aggregate([
  { 
    $match: { 
      affiliateId: userId,  // Filtered
      status: 'succeeded' 
    } 
  }
])
```

### 3. Payouts

**Admin View**:

- Can see all payouts
- Can create new payouts for any affiliate
- Can process and approve payouts

**Affiliate View**:

- Can only view their own payout history
- Cannot create or process payouts
- Payouts filtered by `affiliateId`

### 4. Campaigns

**Admin View**:

- Full CRUD operations (Create, Read, Update, Delete)
- View all campaigns (active, paused, archived)

**Affiliate View**:

- **Read-only** access to active campaigns
- Can only "Get Link" to generate tracking URLs
- Cannot create, edit, or pause campaigns

---

## API Security Patterns

### Pattern 1: Require Authentication

```javascript
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const authError = requireAuth(request);
  if (authError) return authError;
  
  // Protected logic here
}
```

### Pattern 2: Require Admin Role

```javascript
import { requireAdmin } from '@/lib/auth';

export async function POST(request) {
  const adminError = requireAdmin(request);
  if (adminError) return adminError;
  
  // Admin-only logic here
}
```

### Pattern 3: Role-Based Data Filtering

```javascript
export async function GET(request) {
  const authError = requireAuth(request);
  if (authError) return authError;
  
  const authUser = getAuthUser(request);
  const role = authUser?.role || 'affiliate';
  const userId = authUser?.userId;
  
  const baseQuery = { /* base filters */ };
  
  if (role === 'affiliate' && userId) {
    baseQuery.affiliateId = userId;
  }
  
  // Execute query
}
```

### Pattern 4: Prevent Data Leakage

Always validate data ownership:

```javascript
// Get payout for current affiliate
export async function GET(request) {
  const authUser = getAuthUser(request);
  const role = authUser?.role;
  const userId = authUser?.userId;
  
  // Admin can see all, affiliates only see theirs
  const query = role === 'admin' 
    ? {} // No filter for admin
    : { affiliateId: userId }; //filtered for affiliate
  
  const payouts = await db.collection('payouts').find(query).toArray();
}
```

---

## Testing Guidelines

### Authentication Tests

Test scenarios for [`__tests__/api/auth.test.js`](../__tests__/api/auth.test.js):

1. ✅ Valid login returns JWT token
2. ✅ Invalid credentials return 401
3. ✅ Duplicate email registration fails
4. ✅ Token verification works correctly
5. ✅ Token expiry is handled

### Role-Based Access Tests

Test scenarios for [`__tests__/api/role-based-access.test.js`](../__tests__/api/role-based-access.test.js):

1. ✅ Affiliates can only see their own analytics data
2. ✅ Admins can see global analytics data
3. ✅ Unauthenticated requests return 401
4. ✅ Admin APIs reject non-admin users
5. ✅ Leaderboards respect role boundaries

### Data Isolation Tests

1. Verify affiliate queries only return their data
2. Verify admin queries return all data
3. Test URL manipulation attempts (security)
4. Test token tampering detection
5. Test session expiry handling

---

## Best Practices

### 1. Never Trust Client-Side Alone

❌ **Wrong**:

```javascript
// Only client-side check - insecure
if (user?.role !== 'admin') return <Redirect to="login" />
```

✅ **Correct**:

```javascript
// Server-side protection required
const adminError = requireAdmin(request);
if (adminError) return adminError;

// AND client-side for UX
if (user?.role !== 'admin') return <Redirect to="login" />
```

### 2. Filter at Query Level


❌ **Wrong**:

```javascript
// Fetch all, then filter in JavaScript
const allData = await db.collection('data').find().toArray();
const myData = allData.filter(item => item.affiliateId === userId);
```

✅ **Correct**:

```javascript
// Filter at database query level
const myData = await db.collection('data').find({ affiliateId: userId }).toArray();
```

### 3. Validate User Ownership


```javascript
// Before showing/editing data
const data = await db.collection('resource').findOne({ _id: id });

if (role === 'affiliate' && data.affiliateId !== userId) {
  return response403("You don't have permission");
}
```

### 4. Use Helper Functions consistently

```javascript
// Use existing utilities instead of reinventing
import { requireAuth, requireAdmin, getAuthUser } from '@/lib/auth';
```

### 5. Log Security Events

```javascript
// Log access attempts
if (user?.role !== 'admin' && route.startsWith('/admin')) {
  console.warn(`Unauthorized admin access attempt: ${route} by ${user?.email}`);
  return redirect();
}
```

### 6. Implement Rate Limiting

Already implemented in [`middleware.js`](../middleware.js):

- Auth routes: 20 req/min
- Admin routes: 50 req/min
- API routes: 100 req/min (default)

### 7. Keep Security Headers Updated

Already implemented in [`lib/security-headers.js`](../lib/security-headers.js):

- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HSTS)

### 8. Never Send Tokens in URL

❌ **Wrong**:

```html
<a href="/api/admin?token=abc123">Admin</a>
```

✅ **Correct**:

```javascript
// Store in httpOnly cookies or localStorage
localStorage.setItem('token', token);
```

---

## Route Security Matrix

| Route | Admin | Affiliate | Unauthenticated | Notes |
|-------|-------|-----------|----------------|-------|
| `/` | ✅ | ✅ | ✅ | Landing page |
| `/login` | ✅ | ✅ | ✅ | Login page |
| `/signup` | ✅ | ✅ | ✅ | Registration |
| `/dashboard` | ✅ | 🔄 Redirect | 🔄 Redirect | Admin-only (affiliates redirect) |
| `/dashboard/my-portal` | 🔄 Redirect | ✅ | 🔄 Redirect | Affiliate only |
| `/dashboard/affiliates` | ✅ | 🔄 Redirect | 🔄 Redirect | Admin management |
| `/dashboard/campaigns` | ✅ | ✅ | 🔄 Redirect | Different views per role |
| `/dashboard/payouts` | ✅ | 🔄 Redirect | 🔄 Redirect | Admin processing |
| `/dashboard/admin` | ✅ | 🔄 Redirect | 🔄 Redirect | Admin tools |
| `/dashboard/fraud` | ✅ | 🔄 Redirect | 🔄 Redirect | Admin only |
| `/api/analytics/overview` | ✅ (global) | ✅ (filtered) | ❌ 401 | See below |
| `/api/affiliates` | ✅ | ❌ 403 | ❌ 401 | CRUD by admin |
| `/api/payouts` | ✅ | ❌ 403 | ❌ 401 | Admin process |
| `/api/affiliate/analytics` | ❌ 404 | ✅ | ❌ 401 | Affiliate own data |
| `/api/affiliate/me` | ❌ 404 | ✅ | ❌ 401 | Affiliate profile |

**Legend**:

- ✅ = Allowed
- ❌ = Forbidden (returns 401/403/404)
- 🔄 = Redirected to appropriate page

---

## Migration & Deployment Notes

### Environment Variables Required

```env
# Database
MONGODB_URI=mongodb+srv://...
MONGODB_DB=affiliate_analytics

# Authentication
JWT_SECRET=<your-secret-key-here>

# Stripe (for webhooks)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: Email
SENDGRID_API_KEY=SG...
```

### Testing Before Production

1. **Test admin login**: Verify dashboard shows global data
2. **Test affiliate login**: Verify redirect to `/dashboard/my-portal`
3. **Test data isolation**: Create test clicks for different affiliates
4. **Verify affiliate visibility**: Each affiliate sees only their data
5. **Test manual URL navigation**: Try accessing admin pages as affiliate
6. **Test token expiry**: See if redirects work properly

### Common Issues & Solutions

**Issue**: Middleware redirects in development mode
- **Solution**: Ensure JWT_SECRET is set in `.env.local`


**Issue**: Affiliate seeing wrong data
- **Solution**: Check that `affiliateId` matches in database queries


**Issue**: Admin pages accessible to affiliates
- **Solution**: Both middleware AND client-side checks required


---

## Security Checklist

Before deploying to production:

- [ ] JWT_SECRET is configured and sufficiently complex
- [ ] All admin pages have middleware protection
- [ ] All admin pages have client-side role checks
- [ ] Analytics API filters by role correctly
- [ ] Payouts API validates affiliate ownership
- [ ] Database queries filter by `affiliateId` for affiliates
- [ ] Rate limiting is active
- [ ] Security headers are applied
- [ ] HTTPS is enabled in production
- [ ] CORS is configured correctly
- [ ] Session cookies have security flags
- [ ] Logs don't contain sensitive data
- [ ] Tests pass for role-based access
- [ ] Database indexes are created
- [ ] Default admin user can be created
- [ ] Stripe webhooks verify signatures

---

## Support & Monitoring

### Monitoring Required

1. **Failed authentication attempts**: Alert on suspicious activity
2. **Unauthorized access attempts**: Log for security review
3. **Rate limit violations**: Monitor for brute force attacks
4. **API error rates**: Check for misconfigured permissions
5. **Token validation failures**: Investigate potential tampering
6. **Slow database queries**: Check for missing indexes

### Log Examples

**Successful Admin Access**:

```text
[INFO] Admin dashboard accessed by admin@example.com
```

**Blocked Affiliate Access**:

```text
[WARN] Unauthorized admin access attempt: /dashboard/admin by affiliate@example.com
[WARN] Redirecting to /dashboard/my-portal
```

**Authentication Failure**:

```text
[ERROR] Invalid/Expired token for request to /api/analytics/overview
```

---

## References

- [`middleware.js`](../middleware.js) - Route-level protection
- [`lib/auth.js`](../lib/auth.js) - Auth utilities
- [`lib/security-headers.js`](../lib/security-headers.js) - Security headers
- [`app/api/analytics/overview/route.js`](../app/api/analytics/overview/route.js) - Role-filtered analytics example
- [`__tests__/api/role-based-access.test.js`](__tests__/api/role-based-access.test.js) - Security tests

---

## Version History

- **v1.0** (2025-01-09): Initial security implementation
  - Role-based middleware protection
  - API endpoint security
  - Data isolation for analytics
  - Admin page protection
  - Comprehensive testing suite

---

**Security Policy**: This system is designed to follow the principle of least privilege. Each user (affiliate or admin) has only the minimum access required to perform their role's functions. Regular security audits are recommended.

**Contact**: For security issues, please contact the development team immediately.
