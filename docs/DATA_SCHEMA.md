# Data Schema Documentation

## Database: MongoDB

### `users`
Core user accounts for both Admins and Affiliates.
- `_id`: ObjectId
- `name`: string
- `email`: string (unique)
- `password`: hashed string
- `role`: "admin" | "affiliate"
- `createdAt`: ISO Date

### `affiliate_profiles`
Extended data for users with the "affiliate" role.
- `userId`: ObjectId (ref: users)
- `commission_rate`: number (default: 0.10)
- `commission_tiers`: array (optional)
  - `min_revenue`: number
  - `rate`: number
- `status`: "active" | "pending" | "suspended"
- `total_earnings`: number
- `pending_payouts`: number
- `createdAt`: ISO Date

### `campaigns`
Offers and landing pages available for promotion.
- `_id`: ObjectId
- `name`: string
- `url`: string (with tracking templates)
- `payout_rules`: object (RevShare or CPA)
- `status`: "active" | "paused" | "archived"

### `click_events`
Log of every click through a tracking link.
- `clickId`: string (unique uuid)
- `affiliateId`: string
- `campaignId`: string
- `ipAddress`: string
- `userAgent`: string
- `converted`: boolean
- `createdAt`: ISO Date

### `revenues`
Attributed income records.
- `affiliateId`: string
- `campaignId`: string
- `clickId`: string
- `amount`: number (sale amount)
- `commissionAmount`: number (payout to affiliate)
- `status`: "succeeded" | "pending" | "refunded"
- `createdAt`: ISO Date

### `short_links`
Mapping for the URL shortener.
- `code`: string (6-char unique)
- `affiliateId`: string
- `campaignId`: string
- `targetUrl`: string (full tracking URL)
- `clicks`: number
