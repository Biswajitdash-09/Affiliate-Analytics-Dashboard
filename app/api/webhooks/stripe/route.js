import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyWebhookSignature, extractAttributionInfo } from '@/lib/stripe';
import { REVENUE_COLLECTION } from '@/models/Revenue';
import { AFFILIATE_PROFILES_COLLECTION, getCommissionRate } from '@/models/AffiliateProfile';
import { CAMPAIGNS_COLLECTION } from '@/models/Campaign';
import { ObjectId } from 'mongodb';

// Enable raw body for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Stripe Webhook Endpoint
 * Handles checkout.session.completed events to track revenue attribution
 */
export async function POST(request) {
  try {
    // Get raw body for signature verification
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Verify webhook signature
    const event = verifyWebhookSignature(payload, signature, webhookSecret);

    if (!event) {
      console.error('Webhook signature verification failed');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    console.log(`Webhook received: ${event.type}`);

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await handleCheckoutCompleted(session);
    }
    // Handle payment_intent.succeeded event (for additional confirmation)
    else if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      await handlePaymentSucceeded(paymentIntent);
    }
    // Handle refund events
    else if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      await handleRefund(charge);
    }
    // Handle dispute events
    else if (event.type === 'charge.dispute.created') {
      const dispute = event.data.object;
      await handleDispute(dispute);
    }
    // Handle recurring subscription payments
    else if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      // Only process subscription renewals, not the initial payment
      if (invoice.billing_reason === 'subscription_cycle') {
        await handleSubscriptionRenewal(invoice);
      }
    }

    return NextResponse.json({ received: true, event: event.type });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed event
 * Creates revenue record with attribution data
 */
async function handleCheckoutCompleted(session) {
  const { db: database } = await db.getConnection();

  try {
    // Extract attribution information from metadata or client_reference_id
    const attributionInfo = extractAttributionInfo(session.metadata || {});

    // Also check client_reference_id for additional attribution data
    if (session.client_reference_id) {
      try {
        const refData = JSON.parse(session.client_reference_id);
        if (refData.affiliate_id) attributionInfo.affiliateId = refData.affiliate_id;
        if (refData.campaign_id) attributionInfo.campaignId = refData.campaign_id;
        if (refData.click_id) attributionInfo.clickId = refData.click_id;
      } catch (e) {
        // client_reference_id may not be JSON
      }
    }

    // Create revenue record
    const revenueRecord = {
      stripePaymentId: session.payment_intent || session.id,
      stripeSessionId: session.id,
      amount: session.amount_total / 100, // Convert from cents
      currency: session.currency?.toUpperCase() || 'INR',
      status: session.payment_status === 'paid' ? 'succeeded' : 'pending',
      affiliateId: attributionInfo.affiliateId,
      campaignId: attributionInfo.campaignId,
      clickId: attributionInfo.clickId,
      metadata: {
        customerEmail: session.customer_details?.email,
        customerName: session.customer_details?.name,
        paymentStatus: session.payment_status,
        paymentMethodTypes: session.payment_method_types,
        billingDetails: session.customer_details,
        metadata: session.metadata,
        clientReferenceId: session.client_reference_id,
        subscription: session.subscription,
        mode: session.mode,
      },
      createdAt: new Date().toISOString(),
      convertedAt: null, // Will be set when payout is calculated
    };

    // Calculate commission
    let commissionAmount = 0;

    // 1. Try to calculate based on Campaign Rules first
    let campaignRulesApplied = false;

    if (revenueRecord.campaignId) {
      try {
        const campaignQuery = ObjectId.isValid(revenueRecord.campaignId)
          ? { _id: new ObjectId(revenueRecord.campaignId) }
          : { _id: revenueRecord.campaignId }; // Fallback for custom IDs

        const campaign = await database.collection(CAMPAIGNS_COLLECTION).findOne(campaignQuery);

        if (campaign && campaign.payout_rules) {
          const rules = campaign.payout_rules;

          if (typeof rules === 'object') {
            if (rules.type === 'RevShare' && rules.percentage) {
              commissionAmount = revenueRecord.amount * (rules.percentage / 100);
              campaignRulesApplied = true;
            } else if ((rules.type === 'CPA' || rules.type === 'Fixed') && rules.amount) {
              commissionAmount = rules.amount;
              campaignRulesApplied = true;
            }
          }
        }
      } catch (error) {
        console.error('Error fetching campaign for commission:', error);
      }
    }

    // 2. Fallback to Affiliate Profile Rate (with tiered support) if Campaign Rules didn't apply
    if (!campaignRulesApplied && revenueRecord.affiliateId) {
      try {
        const profile = await database.collection(AFFILIATE_PROFILES_COLLECTION).findOne({
          userId: revenueRecord.affiliateId
        });

        if (profile) {
          // Use tiered commission rate based on current earnings
          const rate = getCommissionRate(profile, profile.total_earnings || 0);
          commissionAmount = revenueRecord.amount * rate;
        } else {
          // Fallback default 10%
          commissionAmount = revenueRecord.amount * 0.10;
        }
      } catch (error) {
        console.error('Error fetching affiliate profile for commission calc:', error);
      }
    }

    // Round to 2 decimals
    commissionAmount = Math.round(commissionAmount * 100) / 100;
    // ensure not negative
    if (commissionAmount < 0) commissionAmount = 0;

    // Add commission amount to record
    revenueRecord.commissionAmount = commissionAmount;

    // Insert into database
    await database.collection(REVENUE_COLLECTION).insertOne(revenueRecord);

    console.log('Revenue recorded:', {
      amount: revenueRecord.amount,
      commission: commissionAmount,
      currency: revenueRecord.currency,
      affiliateId: revenueRecord.affiliateId,
      campaignId: revenueRecord.campaignId,
    });

    // Update affiliate's total earnings with COMMISSION amount, not total sales
    if (revenueRecord.affiliateId) {
      await updateAffiliateEarnings(
        database,
        revenueRecord.affiliateId,
        commissionAmount
      );
    }

  } catch (error) {
    console.error('Error handling checkout.session.completed:', error);
  }
}

/**
 * Handle payment_intent.succeeded event
 * Updates revenue record status
 */
async function handlePaymentSucceeded(paymentIntent) {
  const { db: database } = await db.getConnection();

  try {
    await database.collection(REVENUE_COLLECTION).updateOne(
      { stripePaymentId: paymentIntent.id },
      {
        $set: {
          status: 'succeeded',
          paymentMethod: paymentIntent.payment_method,
        },
      }
    );

    console.log('Payment status updated:', paymentIntent.id);
  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error);
  }
}

/**
 * Handle refund events
 * Updates revenue record status
 */
async function handleRefund(charge) {
  const { db: database } = await db.getConnection();

  try {
    const paymentIntentId = charge.payment_intent;
    const amountRefunded = charge.amount_refunded / 100;

    // 1. Find original revenue record to get attribution info
    const revenueRecord = await database.collection(REVENUE_COLLECTION).findOne({
      stripePaymentId: paymentIntentId
    });

    if (!revenueRecord) {
      console.warn('Refund received for unknown payment:', paymentIntentId);
      return;
    }

    // 2. Calculate commission to deduct (Pro-rated)
    // If fully refunded, deduct full commission.
    // If partial, deduct proportional commission.
    let commissionToDeduct = 0;

    if (revenueRecord.amount > 0 && revenueRecord.commissionAmount > 0) {
      const refundRatio = amountRefunded / revenueRecord.amount;
      commissionToDeduct = revenueRecord.commissionAmount * refundRatio;
      // Round to 2 decimals
      commissionToDeduct = Math.round(commissionToDeduct * 100) / 100;

      // Cap at original commission (safety)
      if (commissionToDeduct > revenueRecord.commissionAmount) {
        commissionToDeduct = revenueRecord.commissionAmount;
      }
    }

    // 3. Update Revenue Record
    await database.collection(REVENUE_COLLECTION).updateOne(
      { stripePaymentId: paymentIntentId },
      {
        $set: {
          status: charge.amount_refunded === charge.amount_captured ? 'refunded' : 'partially_refunded',
          refundAmount: amountRefunded,
          refundedAt: new Date().toISOString(),
        },
        $inc: {
          // We might want to track this separately? 
          // For now, let's just keep the original commissionAmount as "what was earned initially"
          // and maybe add a 'deductedCommission' field or just reduce net earnings in profile.
        }
      }
    );

    // 4. Deduct from Affiliate Earnings
    if (revenueRecord.affiliateId && commissionToDeduct > 0) {
      console.log(`Deducting commission of ${commissionToDeduct} for refund ${charge.id}`);
      // Pass negative amount to decrement
      await updateAffiliateEarnings(database, revenueRecord.affiliateId, -commissionToDeduct);
    }

    console.log('Refund processed:', charge.id);
  } catch (error) {
    console.error('Error handling refund:', error);
  }
}

/**
 * Handle charge.dispute.created
 * Freezes commission for disputed payments
 */
async function handleDispute(dispute) {
  const { db: database } = await db.getConnection();
  try {
    const paymentIntentId = dispute.payment_intent;

    // Find record
    const revenueRecord = await database.collection(REVENUE_COLLECTION).findOne({
      stripePaymentId: paymentIntentId
    });

    if (!revenueRecord) return;

    // Mark revenue as disputed
    await database.collection(REVENUE_COLLECTION).updateOne(
      { stripePaymentId: paymentIntentId },
      { $set: { status: 'disputed', disputedAt: new Date().toISOString() } }
    );

    // Deduct (Freeze) Commission
    // We treat it as a reversal causing a deduction. 
    // If they win the dispute later, we would need a 'dispute.closed' handler to re-add it.
    // For safety/MVB, we deduct it now.

    if (revenueRecord.affiliateId && revenueRecord.commissionAmount > 0) {
      // Only deduct if not already fully refunded/deducted
      // Simple approach: deduct full commission on dispute
      console.log(`Deducting commission of ${revenueRecord.commissionAmount} for dispute ${dispute.id}`);
      await updateAffiliateEarnings(database, revenueRecord.affiliateId, -revenueRecord.commissionAmount);
    }

  } catch (error) {
    console.error('Error handling dispute:', error);
  }
}

/**
 * Update affiliate's total earnings
 */
async function updateAffiliateEarnings(database, affiliateId, amount) {
  try {
    await database.collection('affiliate_profiles').updateOne(
      { userId: affiliateId },
      {
        $inc: {
          total_earnings: amount,
          pending_payouts: amount,
        },
        $set: {
          last_earning_date: new Date().toISOString(),
        },
      }
    );
  } catch (error) {
    console.error('Error updating affiliate earnings:', error);
  }
}

/**
 * Handle invoice.payment_succeeded for subscription renewals
 * Generates recurring commission for affiliates
 */
async function handleSubscriptionRenewal(invoice) {
  const { db: database } = await db.getConnection();

  try {
    const subscriptionId = invoice.subscription;
    const paymentIntentId = invoice.payment_intent;
    const amount = invoice.amount_paid / 100; // Convert from cents
    const currency = invoice.currency?.toUpperCase() || 'INR';

    // Find the original revenue record linked to this subscription to get attribution
    const originalRecord = await database.collection(REVENUE_COLLECTION).findOne({
      'metadata.subscription': subscriptionId,
    });

    if (!originalRecord) {
      console.log('Subscription renewal without original attribution:', subscriptionId);
      return; // No attribution found, skip commission
    }

    // Calculate commission based on affiliate profile
    let commissionAmount = 0;
    if (originalRecord.affiliateId) {
      const profile = await database.collection(AFFILIATE_PROFILES_COLLECTION).findOne({
        userId: originalRecord.affiliateId,
      });

      if (profile) {
        const rate = getCommissionRate(profile, profile.total_earnings || 0);
        commissionAmount = Math.round(amount * rate * 100) / 100;
      } else {
        commissionAmount = Math.round(amount * 0.10 * 100) / 100; // Default 10%
      }
    }

    // Create revenue record for the renewal
    const renewalRecord = {
      stripePaymentId: paymentIntentId,
      stripeInvoiceId: invoice.id,
      amount,
      currency,
      status: 'succeeded',
      affiliateId: originalRecord.affiliateId,
      campaignId: originalRecord.campaignId,
      commissionAmount,
      metadata: {
        billingReason: invoice.billing_reason,
        subscription: subscriptionId,
        customerEmail: invoice.customer_email,
        isRenewal: true,
      },
      createdAt: new Date().toISOString(),
    };

    await database.collection(REVENUE_COLLECTION).insertOne(renewalRecord);

    console.log('Subscription renewal recorded:', {
      invoiceId: invoice.id,
      amount,
      commission: commissionAmount,
      affiliateId: originalRecord.affiliateId,
    });

    // Update affiliate earnings
    if (originalRecord.affiliateId && commissionAmount > 0) {
      await updateAffiliateEarnings(database, originalRecord.affiliateId, commissionAmount);
    }
  } catch (error) {
    console.error('Error handling subscription renewal:', error);
  }
}