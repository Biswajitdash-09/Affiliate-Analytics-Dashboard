import Stripe from 'stripe';

/**
 * Initialize Stripe with the secret key from environment
 */
const getStripeInstance = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn('STRIPE_SECRET_KEY not set in environment variables');
    return null;
  }
  return new Stripe(secretKey);
};

/**
 * Verify Stripe webhook signature
 * @param {string} payload - Raw request body as string
 * @param {string} signature - Stripe-Signature header
 * @param {string} webhookSecret - Stripe webhook secret
 * @returns {Stripe.Event | null}
 */
export const verifyWebhookSignature = (payload, signature, webhookSecret) => {
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return null;
  }

  try {
    const stripe = getStripeInstance();
    if (!stripe) {
      return null;
    }

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return null;
  }
};

/**
 * Extract affiliate and campaign information from Stripe payment metadata
 * @param {Object} metadata - Payment metadata object
 * @returns {Object} { affiliateId, campaignId }
 */
export const extractAttributionInfo = (metadata) => {
  return {
    affiliateId: metadata?.affiliate_id || null,
    campaignId: metadata?.campaign_id || null,
    clickId: metadata?.click_id || null
  };
};

export default getStripeInstance;