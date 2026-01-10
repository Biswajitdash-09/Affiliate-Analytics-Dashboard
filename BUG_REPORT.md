# Comprehensive Bug Report
## Affiliate Analytics Dashboard

**Generated**: 2026-01-09
**Status**: 22 bugs identified (8 Critical, 8 High, 6 Medium)

---

## 📊 Test Infrastructure Issues

### 🔴 Critical Bug #1: Jest Cannot Run Most Tests
**File**: [`jest.config.js`](../jest.config.js), [`jest.setup.js`](../jest.setup.js)

**Impact**: 10 out of 11 test suites FAILING

**Description**: 
- Next.js 15 introduced Web Request/Response objects that are not available in Jest environment
- MongoDB BSON library uses ES modules that Jest cannot parse
- Tests fail with `ReferenceError: Request is not defined` and `SyntaxError: Unexpected token 'export'`

**Root Cause**:
- Jest configuration doesn't mock Next.js Request/Response objects
- Transform configuration doesn't handle ES modules from `node_modules` (mongodb/bson)

**Fix Applied**:
- ✅ Updated [`jest.config.js`](../jest.config.js) to ignore transforming specific node_modules (bson, mongodb)
- ✅ Updated [`jest.setup.js`](../jest.setup.js) to add mocks for Next.js Request/Response objects, URLSearchParams, TextEncoder/Decoder
- ✅ Re-running tests to verify fixes

**Status**: 🔄 Fix applied, awaiting test re-run to verify

---

## 🔒 Security Vulnerabilities

### 🔴 Critical Bug #2: NO Authentication on Campaign Routes
**File**: [`app/api/campaigns/route.js`](../app/api/campaigns/route.js:67-143)

**Impact**: **MAJOR SECURITY ISSUE** - Anyone can view/create campaigns

**Description**:
```javascript
// GET route (line 67) - NO AUTHENTICATION
export async function GET(request) {
  // Missing: const authError = requireAdmin(request);
  const db = await getDb();
  const campaigns = await collection.find({}).toArray();
  return NextResponse.json({ success: true, data: campaigns });
}

// POST route (line 95) - NO AUTHENTICATION
export async function POST(request) {
  // Missing: const authError = requireAdmin(request);
  const result = await collection.insertOne(newCampaign);
  return NextResponse.json({ success: true, data: { ...newCampaign } });
}
```

**Required Fix**:
```javascript
// Add to both GET and POST routes
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  // ... rest of code
}
```

---

### 🔴 Critical Bug #3: Incomplete API Route Protection
**File**: [`middleware.js`](../middleware.js:156-178)

**Impact**: Unauthorized access possible to some API routes

**Description**:
```javascript
if (isProtectedApiRoute && !path.startsWith('/api/admin/')) {
    // Token check only applies if path doesn't start with /api/admin/
    // BUT: this logic is WRONG - admin routes SHOULD require authentication
```

**Issue**: Admin routes starting with `/api/admin/` bypass token verification entirely

**Required Fix**:
```javascript
// Correct logic should be:
if (isProtectedApiRoute) {
    // All protected API routes require authentication
    // Admin routes should check both authentication AND admin role
}
```

---

### 🔴 Critical Bug #4: Brute Force Vulnerability
**File**: [`app/api/auth/login/route.js`](../app/api/auth/login/route.js:36-132)

**Impact**: Brute force attacks possible on login endpoint

**Description**:
- Missing rate limiting at route level (middleware has it but route doesn't)
- No account lockout after failed login attempts
- No tracking of failed attempts per IP/email
- Password error messages are identical regardless of whether user exists (good) but no delay mechanism

**Required Fix**:
```javascript
// Add account lockout logic
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Track failed attempts in database or Redis
// Implement exponential backoff
```

---

### 🔴 Critical Bug #5: Registration Spam Risk
**File**: [`app/api/auth/register/route.js`](../app/api/auth/register/route.js:1)

**Impact**: Automated registration spam

**Description**:
- No CAPTCHA or third-party verification
- No email verification required before account activation
- No rate limiting at route level
- Users can register immediately without verification

**Required Fix**:
- Implement email verification workflow
- Add CAPTCHA (e.g., reCAPTCHA)
- Enforce strict rate limiting
- Consider requiring approval for affiliate accounts

---

### 🟡 High Priority Bug #6: Email Verification Missing
**File**: Multiple auth routes

**Impact**: Fake/spam accounts can be created

**Description**:
- User registration creates account immediately
- No email verification required
- No activation workflow
- Status is valid immediately after registration

**Required Fix**:
- Add `verified: false` field to User model
- Send verification email with token
- Block login until email verified
- Add verification endpoint

---

### 🟡 High Priority Bug #7: Inconsistent Affiliate ID Handling
**File**: [`app/api/payouts/route.js`](../app/api/payouts/route.js:84-87)

**Impact**: Race conditions and matching issues

**Description**:
```javascript
// Dangerous dual-check logic
let affiliateProfile = await db.collection(AFFILIATE_PROFILES_COLLECTION).findOne({ userId: body.affiliateId });
if (!affiliateProfile && ObjectId.isValid(body.affiliateId)) {
    affiliateProfile = await db.collection(AFFILIATE_PROFILES_COLLECTION).findOne({ userId: new ObjectId(body.affiliateId) });
}
```

**Issue**: Inconsistent data types - sometimes string, sometimes ObjectId

**Required Fix**:
- Standardize on ONE format (ObjectId recommended)
- Convert consistently at boundaries
- Don't try multiple formats

---

## 🛡️ Data Integrity Issues

### 🔴 Critical Bug #8: No Transaction Support for Payouts
**File**: [`app/api/payouts/route.js`](../app/api/payouts/route.js:111-127)

**Impact**: Data corruption if operations fail mid-process

**Description**:
```javascript
// Operations are NOT atomic
const result = await db.collection(PAYOUTS_COLLECTION).insertOne(payout); // Step 1
await db.collection(AFFILIATE_PROFILES_COLLECTION).updateOne(          // Step 2
    { _id: affiliateProfile._id },
    { $inc: { pending_payouts: -payout.amount, total_paid: payout.amount } }
);
```

**Issue**: If step 2 fails, payout record still exists - ORPHANED DATA

**Required Fix**:
```javascript
const session = client.startSession();
try {
    await session.withTransaction(async () => {
        const result = await db.collection(PAYOUTS_COLLECTION).insertOne(payout, { session });
        await db.collection(AFFILIATE_PROFILES_COLLECTION).updateOne(
            { _id: affiliateProfile._id },
            { $inc: { pending_payouts: -payout.amount, total_paid: payout.amount } },
            { session }
        );
    });
} finally {
    await session.endSession();
}
```

---

### 🟡 High Priority Bug #9: Race Condition on Balance Updates
**Files**: [`app/api/payouts/route.js`](../app/api/payouts/route.js), [`app/api/analytics/overview/route.js`](../app/api/analytics/overview/route.js)

**Impact**: Incorrect balance calculations with concurrent requests

**Description**:
- Reading and updating affiliate balance without proper locking
- Multiple concurrent payout requests could over-deduct from balance
- MongoDB's `$inc` operator is atomic, but check-then-update pattern is not

**Example of Problem**:
```javascript
// DANGEROUS: Check then update
const profile = await db.collection(...).findOne({ userId });
if (profile.pending_payouts >= amount) {
    // Another request could also pass this check
    await db.collection(...).updateOne({ _id: profile._id }, { $inc: { pending_payouts: -amount } });
}
```

**Required Fix**:
```javascript
// Use atomic findAndUpdate with condition, or transaction + atomic condition check
// Or use MongoDB's findAndModify with a projection on the update result
```

---

### 🟡 High Priority Bug #10: Date Mutation Bug
**File**: [`app/api/analytics/overview/route.js`](../app/api/analytics/overview/route.js:159)

**Impact**: Date calculation errors

**Description**:
```javascript
// Undefined behavior - mutates date object
endDate = new Date();
endDate.setHours(23, 59, 59, 999);
```

**Issue**: Mutating the date after creation causes timezone and calculation issues

**Required Fix**:
```javascript
endDate = new Date();
endDate.setHours(23, 59, 59, 999);
// OR create end date properly:
const endDate = new Date(startDate);
endDate.setHours(23, 59, 59, 999);
```

---

### 🟡 High Priority Bug #11: ObjectId Conversion Risk
**File**: [`app/api/analytics/overview/route.js`](../app/api/analytics/overview/route.js:265,302)

**Impact**: Could cause database errors

**Description**:
```javascript
let: { campaignIdObj: { $toObjectId: "$campaignId" } }
```

**Issue**: If `campaignId` is null or invalid string, `$toObjectId` will fail

**Required Fix**:
```javascript
{
  $lookup: {
    from: CAMPAIGNS_COLLECTION,
    let: { campaignId: "$campaignId" },
    pipeline: [
      { $match: { $expr: { $and: [
        { $ne: ["$$campaignId", null] },
        { $ne: ["$$campaignId", ""] }
      ]}}},
      // ... rest of lookup
    ],
    as: "campaign"
  }
}
```

---

### 🟡 Medium Priority Bug #12: Date Validation Missing
**File**: [`app/api/analytics/overview/route.js`](../app/api/analytics/overview/route.js:155-166)

**Impact**: Invalid dates could cause query errors

**Description**:
- No validation for startDate/endDate format
- No error handling for invalid date strings
- Invalid dates could result in empty or incorrect query results

**Required Fix**:
```javascript
if (startDateParam && endDateParam) {
    startDate = new Date(startDateParam);
    endDate = new Date(endDateParam);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
            { success: false, error: 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)' },
            { status: 400 }
        );
    }
    
    if (startDate > endDate) {
        return NextResponse.json(
            { success: false, error: 'Start date must be before end date' },
            { status: 400 }
        );
    }
}
```

---

### 🟡 Medium Priority Bug #13: Missing Email Format Validation
**File**: [`models/User.js`](../models/User.js:33-42)

**Impact**: Invalid emails can be registered

**Description**:
```javascript
export function validateUser(data) {
    if (!data.email || typeof data.email !== 'string') return 'Email is required and must be a string';
    // Missing: Email format validation (regex)
    return null;
}
```

**Required Fix**:
```javascript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!EMAIL_REGEX.test(data.email)) return 'Invalid email format';
```

---

### 🟡 Medium Priority Bug #14: Missing Password Strength Validation
**File**: [`models/User.js`](../models/User.js:33-42)

**Impact**: Weak passwords allowed

**Description**:
- No minimum length requirement
- No complexity requirements (uppercase, lowercase, digits, special chars)
- Security risk

**Required Fix**:
```javascript
export function validateUser(data) {
    if (!data.password || typeof data.password !== 'string') return 'Password is required';
    
    if (data.password.length < 8) {
        return 'Password must be at least 8 characters';
    }
    
    if (!/[A-Z]/.test(data.password)) {
        return 'Password must contain at least one uppercase letter';
    }
    
    if (!/[a-z]/.test(data.password)) {
        return 'Password must contain at least one lowercase letter';
    }
    
    if (!/[0-9]/.test(data.password)) {
        return 'Password must contain at least one digit';
    }
    
    // Optionally require special characters
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.password)) {
        return 'Password must contain at least one special character';
    }
    
    return null;
}
```

---

### 🟡 Medium Priority Bug #15: Inconsistent Field Naming
**File**: [`models/AffiliateProfile.js`](../models/AffiliateProfile.js:28)

**Impact**: Confusion and potential errors

**Description**:
```javascript
// Snake_case (inconsistent)
pending_payouts: { type: 'number', default: 0 },
// CamelCase (other fields)
commissionRate, totalEarnings
```

**Required Fix**:
- Standardize on camelCase: `pendingPayouts`
- Update all references in codebase
- Migration script required for existing data

---

## ⚡ Performance & Scalability Issues

### 🟡 High Priority Bug #16: Memory Leak Risk in Rate Limiter
**File**: [`middleware.js`](../middleware.js:193-226)

**Impact**: Memory exhaustion in production

**Description**:
```javascript
const rateLimit = new Map(); // Line 7

// Accumulates entries indefinitely until threshold reached
if (rateLimit.size > 10000) {
    rateLimit.clear(); // Extreme fallback to prevent memory leaks (line 225)
}
```

**Issue**:
- Uses in-memory Map for rate limiting (doesn't scale)
- Only clears when size exceeds 10,000
- Each entry stores timestamp array
- In production with many unique IPs, memory grows unbounded

**Required Fix**:
```javascript
// Option 1: Use Redis for distributed rate limiting
// Option 2: Implement TTL-based cleanup with setInterval
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Every 5 minutes
setInterval(() => {
    const now = Date.now();
    const windowMs = 60 * 1000;
    
    for (const [key, value] of rateLimit.entries()) {
        const filtered = value.filter(timestamp => timestamp > now - windowMs);
        if (filtered.length === 0) {
            rateLimit.delete(key);
        } else {
            rateLimit.set(key, filtered);
        }
    }
}, CLEANUP_INTERVAL);
```

---

### 🟡 Medium Priority Bug #17: No Pagination Support
**File**: [`app/api/payouts/route.js`](../app/api/payouts/route.js:29-33)

**Impact**: Cannot paginate through results

**Description**:
```javascript
const payouts = await db.collection(PAYOUTS_COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .limit(50)  // Hardcoded limit, no pagination
    .toArray();
```

**Required Fix**:
```javascript
const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get('page') || '1');
const limit = parseInt(searchParams.get('limit') || '50');
const skip = (page - 1) * limit;

const payouts = await db.collection(PAYOUTS_COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

const total = await db.collection(PAYOUTS_COLLECTION).countDocuments(query);
```

---

### 🟡 Medium Priority Bug #18: Missing Indexes
**Files**: Multiple model files

**Impact**: Slow queries

**Description**:

** [`models/User.js`](../models/User.js:49-51)**:
```javascript
// Missing: Index on 'role' field
export async function initUserIndexes(db) {
    await db.collection(USERS_COLLECTION).createIndex({ email: 1 }, { unique: true });
    await db.collection(USERS_COLLECTION).createIndex({ role: 1 }); // ADD THIS
}
```

** [`models/Campaign.js`](../models/Campaign.js:49-51)**:
```javascript
export async function initCampaignIndexes(db) {
    await db.collection(CAMPAIGNS_COLLECTION).createIndex({ name: 1 });
    await db.collection(CAMPAIGNS_COLLECTION).createIndex({ status: 1 }, { sparse: true }); // ADD THIS
    await db.collection(CAMPAIGNS_COLLECTION).createIndex({ createdAt: -1 }); // ADD THIS
}
```

** [`models/AffiliateProfile.js`](../models/AffiliateProfile.js:88-91)**:
```javascript
// Missing: Index on commission_rate
export async function initAffiliateProfileIndexes(db) {
    await db.collection(AFFILIATE_PROFILES_COLLECTION).createIndex({ userId: 1 }, { unique: true });
    await db.collection(AFFILIATE_PROFILES_COLLECTION).createIndex({ status: 1 });
    await db.collection(AFFILIATE_PROFILES_COLLECTION).createIndex({ commission_rate: 1 }); // ADD THIS
}
```

---

### 🟡 Medium Priority Bug #19: Missing Unique Constraint on Campaign Names
**File**: [`models/Campaign.js`](../models/Campaign.js:49-51)

**Impact**: Race condition could allow duplicate campaigns

**Description**:
```javascript
// Route checks manually (app/api/campaigns/route.js:112)
const existing = await collection.findOne({ name: body.name });
if (existing) { return 409; }

// But there's NO unique index - race condition possible
export async function initCampaignIndexes(db) {
    await db.collection(CAMPAIGNS_COLLECTION).createIndex({ name: 1 }, { unique: true }); // ADD THIS
}
```

**Required Fix**: Add unique index on name field

---

## ⚙️ Configuration Issues

### 🟡 High Priority Bug #20: Missing Fast-Fail on Missing Environment Variables
**File**: Multiple files using `process.env`

**Impact**: Configuration errors discovered only at runtime

**Description**:
- Database connection uses `process.env.MONGODB_URI` but doesn't validate early
- [`lib/db.js`](../lib/db.js:34-84) checks but doesn't throw on missing URI
- [`lib/auth.js`](../lib/auth.js:17-20) checks JWT_SECRET only when verifying
- Prefer to fail-fast during startup

**Required Fix**:
```javascript
// Create a validation file: lib/validate-env.js
import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_ENV_VARS = [
    'MONGODB_URI',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_APP_URL',
];

export function validateEnvironment() {
    const missing = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        console.error('CRITICAL: Missing required environment variables:');
        missing.forEach(varName => console.error(`  - ${varName}`));
        
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Missing required environment variables');
        } else if (process.env.NODE_ENV !== 'test') {
            console.warn('Continuing in development mode - this may cause errors');
        }
        
        return false;
    }
    
    console.log('✅ All required environment variables are set');
    return true;
}

// Call this in next.config.mjs or app entry point
```

---

### 🟡 Medium Priority Bug #21: JWT_SECRET Not Validated at Startup
**File**: [`app/api/auth/login/route.js`](../app/api/auth/login/route.js:94-100)

**Impact**: Critical error only discovered when handling login

**Description**:
```javascript
const secret = process.env.JWT_SECRET;
if (!secret) {
    console.error('CRITICAL: JWT_SECRET is not configured');
    return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
    );
}
```

**Issue**: Only checks during login, should validate at app startup

**Required Fix**: Use the validation approach from Bug #20

---

### 🟡 Medium Priority Bug #22: Hardcoded Commission Rate
**File**: [`app/api/auth/register/route.js`](../app/api/auth/register/route.js:75)

**Impact**: Cannot change default commission rate without code change

**Description**:
```javascript
const affiliateProfile = {
    userId: result.insertedId,
    commission_rate: 0.10, // Default 10% - HARDCODED
    status: AFFILIATE_STATUS.PENDING,
    total_earnings: 0,
    createdAt: new Date().toISOString()
};
```

**Required Fix**:
```javascript
const affiliateProfile = {
    userId: result.insertedId,
    commission_rate: parseFloat(process.env.DEFAULT_COMMISSION_RATE || '0.10'),
    // ...
};
```

---

## 📊 Summary Statistics

| Severity | Count | Examples |
|----------|-------|----------|
| 🔴 Critical | 8 | #1, #2, #3, #4, #5, #8 |
| 🟡 High | 8 | #6, #7, #9, #10, #11, #12, #16, #20 |
| 🟢 Medium | 6 | #13, #14, #15, #17, #18, #19, #21, #22 |

| Category | Count |
|----------|-------|
| Security | 7 |
| Data Integrity | 6 |
| Performance | 4 |
| Configuration | 3 |
| Test Infrastructure | 2 |

---

## 🎯 Recommended Fix Priority

### Phase 1: Critical Fixes (Do Immediately)
1. 🔴 Fix Jest configuration to enable running tests (#1)
2. 🔶 Add authentication to campaign routes (#2)
3. 🔶 Fix API route protection logic (#3)
4. 🔶 Add rate limiting and account lockout for login (#4)
5. 🔶 Add email verification workflow (#6)
6. 🔶 Fix payout transaction support (#8)

### Phase 2: High Priority Fixes (Do This Week)
1. 🟡 Implement email validation (#13)
2. 🟡 Add password strength requirements (#14)
3. 🟡 Fix date mutation issues (#10)
4. 🟡 Fix ObjectId conversion errors (#11)
5. 🟡 Add pagination support (#17)
6. 🟡 Fix memory leak in rate limiter (#16)

### Phase 3: Medium Priority Fixes (Do Next Sprint)
1. 🟢 Add missing database indexes (#18)
2. 🟢 Add unique constraints (#19)
3. 🟢 Standardize field naming (#15)
4. 🟢 Add environment variable validation at startup (#20, #21)
5. 🟢 Make commission rates configurable (#22)

---

## ✅ Fixes Already Applied

1. ✅ Updated [`jest.config.js`](../jest.config.js) to handle Next.js 15 Web objects and ES modules
2. ✅ Updated [`jest.setup.js`](../jest.setup.js) with comprehensive mocks for Next.js Request/Response objects
3. ✅ Removed invalid `extensionsToTreatAsEsm` configuration
4. ✅ Fixed markdownlint errors in [`docs/SECURITY.md`](../docs/SECURITY.md)

---

## 📝 Notes

- All bugs are documented with file paths, line numbers, and example code
- Recommended fixes include code snippets
- Priority ordering based on severity and exploitability
- Security vulnerabilities marked with 🔴 require immediate attention
- Test Suite: Currently 10/11 failing due to configuration issues (fixes applied pending verification)

---

*This report is generated by comprehensive code and architecture review of the Affiliate Analytics Dashboard project.*