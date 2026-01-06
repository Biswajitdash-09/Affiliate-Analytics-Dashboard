/**
 * Attribution Settings Model
 * Configures how conversions are attributed to affiliates
 */

export const ATTRIBUTION_SETTINGS_COLLECTION = 'attribution_settings';

/**
 * Attribution models supported
 */
export const AttributionModel = {
  FIRST_CLICK: 'first_click',        // Credit to the first affiliate in the session
  LAST_CLICK: 'last_click',          // Credit to the last affiliate who referred
  LINEAR: 'linear',                  // Distribute credit evenly across all touched affiliates
  TIME_DECAY: 'time_decay',         // Credit decreases as time from click increases
  CUSTOM: 'custom'                   // Custom weighting logic
};

/**
 * Default configuration
 */
export const DEFAULT_ATTRIBUTION_SETTINGS = {
  attributionModel: AttributionModel.LAST_CLICK,
  clickAttributionWindow: {
    value: 30,          // Days
    unit: 'days'        // 'hours', 'days', 'months'
  },
  cookieExpiry: {
    value: 30,          // Days
    unit: 'days'
  },
  multipleTouchSessions: false,      // Allow users to be attributed even if they interacted with multiple affiliates
  DeDuplicateTouches: true,          // Treat the same user as the same person across sessions/devices
  overrideLastAttributedAffiliate: false,
  prioritizedAffiliate: null,         // Force all conversions to specific affiliate (rarely used)
  campaignLevelSettings: [],         // Array of campaign-specific overrides
  categoryLevelSettings: [],         // Array of category-specific overrides
  firstPartyCookie: true,
  thirdPartyCookie: true,
  ipTracking: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

/**
 * Validation function for attribution settings
 */
export function validateAttributionSettings(data) {
  const errors = [];
  
  if (data.attributionModel && !Object.values(AttributionModel).includes(data.attributionModel)) {
    errors.push(`Invalid attribution model. Must be one of: ${Object.values(AttributionModel).join(', ')}`);
  }
  
  if (data.clickAttributionWindow) {
    if (typeof data.clickAttributionWindow.value !== 'number' || data.clickAttributionWindow.value < 0) {
      errors.push('Click attribution window value must be a non-negative number');
    }
    
    if (!['hours', 'days', 'months'].includes(data.clickAttributionWindow.unit)) {
      errors.push('Click attribution window unit must be one of: hours, days, months');
    }
  }
  
  return errors.length > 0 ? errors : null;
}

/**
 * Calculate click expiry time based on current settings
 */
export function calculateClickExpiry(settings) {
  const window = settings?.clickAttributionWindow || DEFAULT_ATTRIBUTION_SETTINGS.clickAttributionWindow;
  const expiry = new Date();
  
  switch (window.unit) {
    case 'hours':
      expiry.setHours(expiry.getHours() + window.value);
      break;
    case 'days':
      expiry.setDate(expiry.getDate() + window.value);
      break;
    case 'months':
      expiry.setMonth(expiry.getMonth() + window.value);
      break;
    default:
      expiry.setDate(expiry.getDate() + window.value); // Default to days
  }
  
  return expiry;
}

/**
 * Check if a click is still within the attribution window
 */
export function isClickValid(clickTimestamp, settings) {
  if (!clickTimestamp) return false;
  
  const clickDate = new Date(clickTimestamp);
  const expiry = calculateClickExpiry(settings);
  
  return clickDate <= expiry;
}

/**
 * Calculate attribution score based on time and model
 * Returns a value between 0 and 1
 */
export function calculateAttributionScore(click, settings, currentTimestamp) {
  const model = settings?.attributionModel || DEFAULT_ATTRIBUTION_SETTINGS.attributionModel;
  
  switch (model) {
    case AttributionModel.FIRST_CLICK:
      return 1.0; // First click always gets full credit
      
    case AttributionModel.LAST_CLICK:
      return 1.0; // Last click always gets full credit
      
    case AttributionModel.LINEAR:
      return 1.0; // Equal weighting for all touches
      
    case AttributionModel.TIME_DECAY:
      if (!click.createdAt) return 0;
      
      const clickTime = new Date(click.createdAt).getTime();
      const currentTime = currentTimestamp || Date.now();
      const timeDiff = currentTime - clickTime;
      
      // Calculate decay score
      const windowDays = settings?.clickAttributionWindow?.value || 30;
      const windowMs = windowDays * 24 * 60 * 60 * 1000;
      
      // Linear decay: score decreases from 1 to 0 over the attribution window
      const score = Math.max(0, 1 - (timeDiff / windowMs));
      return score;
      
    default:
      return 1.0;
  }
}

/**
 * Get campaign-specific settings if they exist
 */
export function getCampaignSettings(campaignId, globalSettings) {
  const campaignLevelSettings = globalSettings?.campaignLevelSettings || [];
  const campaignOverride = campaignLevelSettings.find(
    setting => setting.campaignId === campaignId
  );
  
  return campaignOverride?.settings || globalSettings || DEFAULT_ATTRIBUTION_SETTINGS;
}

/**
 * Allowable attribution settings for configuration
 */
export const ALLOWED_ATTRIBUTION_MODELS = [
  AttributionModel.FIRST_CLICK,
  AttributionModel.LAST_CLICK,
  AttributionModel.LINEAR,
  AttributionModel.TIME_DECAY
];