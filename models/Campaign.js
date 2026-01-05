/**
 * Campaign Model Definition
 * 
 * Note: This project uses the native MongoDB driver.
 */

export const CAMPAIGNS_COLLECTION = 'campaigns';

export const CAMPAIGN_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  ARCHIVED: 'archived'
};

export const CampaignSchema = {
  name: { type: 'string', required: true },
  url: { type: 'string', required: true },
  payout_rules: { type: 'mixed', required: true }, // Can be string or object
  status: { 
    type: 'string', 
    enum: Object.values(CAMPAIGN_STATUS), 
    default: CAMPAIGN_STATUS.ACTIVE 
  },
  createdAt: { type: 'date', default: () => new Date().toISOString() }
};

/**
 * Validates campaign data
 * @param {Object} data 
 * @returns {string|null}
 */
export function validateCampaign(data) {
  if (!data.name || typeof data.name !== 'string') return 'Campaign name is required';
  if (!data.url || typeof data.url !== 'string') return 'Campaign URL is required';
  
  if (!data.payout_rules) return 'Payout rules are required';
  
  if (data.status && !Object.values(CAMPAIGN_STATUS).includes(data.status)) {
    return `Status must be one of: ${Object.values(CAMPAIGN_STATUS).join(', ')}`;
  }

  return null;
}

/**
 * Creates indexes for the Campaigns collection
 * @param {import('mongodb').Db} db 
 */
export async function initCampaignIndexes(db) {
  await db.collection(CAMPAIGNS_COLLECTION).createIndex({ name: 1 });
  await db.collection(CAMPAIGNS_COLLECTION).createIndex({ status: 1 });
}