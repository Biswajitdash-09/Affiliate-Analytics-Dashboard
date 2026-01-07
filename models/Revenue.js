import db from "@/lib/db";

export const REVENUE_COLLECTION = "revenues";

/**
 * Revenue Model - Tracks Stripe payments and conversions
 * Links payments to affiliate_id and campaign_id for attribution
 */
export const Revenue = {
  COLLECTION_NAME: REVENUE_COLLECTION,

  /**
   * Validate revenue data structure
   */
  validate(data) {
    const errors = [];

    if (!data.stripePaymentId) {
      errors.push("Stripe payment ID is required");
    }

    if (!data.amount) {
      errors.push("Amount is required");
    }

    if (data.currency && typeof data.currency !== 'string') {
      errors.push("Currency must be a string code (e.g., INR)");
    }

    if (!data.affiliateId) {
      errors.push("Affiliate ID is required");
    }

    if (!data.campaignId) {
      errors.push("Campaign ID is required");
    }

    if (data.status && !['pending', 'succeeded', 'failed', 'refunded'].includes(data.status)) {
      errors.push("Status must be one of: pending, succeeded, failed, refunded");
    }

    if (data.commissionAmount !== undefined && typeof data.commissionAmount !== 'number') {
      errors.push("Commission Amount must be a number");
    }

    return errors.length > 0 ? errors.join(', ') : null;
  }
};

export default Revenue;