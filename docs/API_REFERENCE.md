# API Reference - Affiliate Analytics Dashboard

## Authentication
Most dashboard APIs require a valid JWT token in the `Authorization` header.
`Authorization: Bearer <token>`

---

## Tracking APIs

### GET `/api/tracking/click`
Logs a click and redirects the user to the target URL.
- **Parameters**:
  - `affiliate_id` (required): The ID of the affiliate.
  - `campaign_id` (optional): The ID of the campaign.
- **Side Effects**: Sets a `click_id` cookie and logs the event to MongoDB.

### GET `/s/[code]` (Short Link)
Redirects a short link to the full tracking URL.
- **Parameters**: `code` (URL path)
- **Side Effects**: Increments click counter in `short_links` collection.

---

## Management APIs

### GET `/api/affiliates`
List all affiliates. Admin only.

### POST `/api/affiliates`
Create a new affiliate profile.

### GET `/api/campaigns`
List all campaigns.
- **Filters**: `status=active`

### POST `/api/campaigns`
Create or update a campaign.

---

## Advanced Feature APIs

### POST `/api/shortlinks`
Generate a new short link for an affiliate/campaign.
- **Body**: `{ "affiliateId": "...", "campaignId": "..." }`

### GET `/api/export`
Generate a report for download.
- **Parameters**:
  - `type`: `csv` | `pdf`
  - `data`: `analytics` | `revenues` | `payouts`
  - `startDate`: ISO date string
  - `endDate`: ISO date string

### GET `/api/postback`
Server-to-server (S2S) conversion notification.
- **Parameters**:
  - `click_id` (required)
  - `amount` (optional)
  - `status`: `success` | `pending`

### GET `/api/analytics/leaderboards`
Returns top performance data.
- **Response**: `{ "success": true, "data": { "topAffiliates": [], "topCampaigns": [] } }`
