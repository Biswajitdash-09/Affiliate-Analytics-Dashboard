/**
 * Global Settings Model Definition
 * 
 * Defines the schema structure and validation for system-wide configurations.
 * These settings control platform behavior like commission rates and payout thresholds.
 */

export const GLOBAL_SETTINGS_COLLECTION = 'global_settings';

export const DEFAULT_SETTINGS = {
  platformName: 'Affiliate Tracker Pro',
  defaultCommissionRate: 0.10, // 10%
  minimumPayout: 5000.00,
  currency: 'INR',
  allowRegistration: true,
  supportEmail: 'support@example.com',
  updatedAt: new Date().toISOString()
};

/**
 * Validates settings data against schema requirements
 * @param {Object} data - The settings data to validate
 * @returns {string|null} - Error message or null if valid
 */
export function validateSettings(data) {
  if (data.platformName && typeof data.platformName !== 'string') {
    return 'Platform Name must be a string';
  }
  
  if (data.defaultCommissionRate !== undefined) {
    const rate = Number(data.defaultCommissionRate);
    if (isNaN(rate) || rate < 0 || rate > 1) {
      return 'Default Commission Rate must be a number between 0 and 1';
    }
  }

  if (data.minimumPayout !== undefined) {
    const payout = Number(data.minimumPayout);
    if (isNaN(payout) || payout < 0) {
      return 'Minimum Payout must be a positive number';
    }
  }

  if (data.currency && typeof data.currency !== 'string') {
    return 'Currency must be a string code (e.g., INR)';
  }

  if (data.supportEmail && !/^\S+@\S+\.\S+$/.test(data.supportEmail)) {
    return 'Invalid support email format';
  }

  return null;
}