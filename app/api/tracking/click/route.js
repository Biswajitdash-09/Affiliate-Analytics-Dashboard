import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { detectBot, extractIP, extractReferrer, parseUserAgent } from '@/lib/botDetection';

// Helper to add CORS headers
function cors(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }));
}

// Collection name for click events
const CLICK_EVENTS_COLLECTION = 'click_events';

// Collection name for conversion events
const CONVERSION_EVENTS_COLLECTION = 'conversion_events';

/**
 * Click Tracking Endpoint
 * Records click events with full metadata (IP, referrer, device, bot detection)
 * 
 * Query Parameters:
 * - affiliate_id: Affiliate ID (required)
 * - campaign_id: Campaign ID (required)
 * - redirect_url: URL to redirect to after tracking (optional, defaults to provided or dashboard)
 */
export async function POST(request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Get tracking parameters
    const affiliateId = searchParams.get('affiliate_id');
    const campaignId = searchParams.get('campaign_id');
    const redirectUrl = searchParams.get('redirect_url');
    const returnJson = searchParams.get('json') === 'true';

    // Extract UTM parameters
    const utmParams = {
      utm_source: searchParams.get('utm_source'),
      utm_medium: searchParams.get('utm_medium'),
      utm_campaign: searchParams.get('utm_campaign'),
      utm_term: searchParams.get('utm_term'),
      utm_content: searchParams.get('utm_content'),
    };

    // Filter out null/undefined UTM values
    Object.keys(utmParams).forEach(key => {
      if (utmParams[key] === null) {
        delete utmParams[key];
      }
    });

    if (!affiliateId || !campaignId) {
      return NextResponse.json(
        { error: 'Missing required parameters: affiliate_id or campaign_id' },
        { status: 400 }
      );
    }

    // Extract request headers for metadata
    const headers = Object.fromEntries(request.headers.entries());

    // Extract IP address
    const ipAddress = extractIP(headers);

    // Extract referrer
    const referrer = extractReferrer(headers);

    // Parse user agent for device/browser info
    const userAgent = headers['user-agent'] || '';
    const deviceInfo = parseUserAgent(userAgent);

    // Run bot detection
    const botDetection = detectBot({
      userAgent,
      referrer,
      hostname: request.headers.get('host'),
    });

    // Generate unique click ID
    const clickId = `click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create click event record
    const clickEvent = {
      clickId,
      type: 'click',
      affiliateId,
      campaignId,

      // Metadata
      ipAddress: ipAddress,
      referrer: referrer,
      userAgent: userAgent,

      // UTM Parameters
      utmParameters: Object.keys(utmParams).length > 0 ? utmParams : null,

      // Device and browser info
      deviceMetadata: {
        browser: deviceInfo.browser?.name || 'unknown',
        browserVersion: deviceInfo.browser?.version || 'unknown',
        os: deviceInfo.os?.name || 'unknown',
        osVersion: deviceInfo.os?.version || 'unknown',
        deviceType: deviceInfo.device?.type || 'desktop',
        deviceModel: deviceInfo.device?.model || 'unknown',
        deviceVendor: deviceInfo.device?.vendor || 'unknown',
        engine: deviceInfo.engine?.name || 'unknown',
      },

      // Bot detection results
      botDetection: {
        isBot: botDetection.isBot,
        isSpam: botDetection.isSpam,
        reason: botDetection.reason,
      },

      // Additional metadata
      headers: {
        accept: headers['accept'],
        acceptLanguage: headers['accept-language'],
        acceptEncoding: headers['accept-encoding'],
        host: headers['host'],
        origin: headers['origin'],
      },

      // Timestamp
      createdAt: new Date().toISOString(),
      timezone: headers['timezone'] || 'unknown',
    };

    // Get database connection
    const { db: database } = await db.getConnection();

    // If bot detected, still log but mark as filtered
    if (botDetection.isBot) {
      clickEvent.filtered = true;
      clickEvent.filterReason = botDetection.reason;

      // Store in click_events collection but with filtered flag
      await database.collection(CLICK_EVENTS_COLLECTION).insertOne(clickEvent);

      console.log('Bot click filtered:', {
        clickId,
        affiliateId,
        campaignId,
        reason: botDetection.reason,
        ip: ipAddress,
      });

      // If JSON requested (e.g. from tracking script), return JSON even for bots (but maybe invalid)
      if (returnJson) {
        return cors(NextResponse.json({
          success: true,
          filtered: true,
          clickId: clickId
        }));
      }

      // Still redirect but don't count as valid click
      const targetUrl = redirectUrl || '/dashboard';

      return NextResponse.redirect(new URL(targetUrl, request.url));
    }

    // Store valid click event
    clickEvent.filtered = false;
    await database.collection(CLICK_EVENTS_COLLECTION).insertOne(clickEvent);

    console.log('Valid click recorded:', {
      clickId,
      affiliateId,
      campaignId,
      ip: ipAddress,
    });

    // Calculate impression for the affiliate
    await updateAffiliateStats(database, affiliateId, campaignId);

    // Note: In production, you would typically:
    // 1. Store the clickId in a cookie or localStorage for conversion tracking
    // 2. When the user makes a purchase, the clickId can be passed to Stripe as metadata

    // Set click ID in cookie for conversion tracking (30 day expiry)
    // Note: This requires proper response handling which isn't possible in Next.js API routes
    // You would typically use middleware or a server action for this

    // If JSON requested, return clickId instead of redirecting
    if (returnJson) {
      return cors(NextResponse.json({
        success: true,
        clickId: clickId
      }));
    }

    // Redirect to target URL
    const targetUrl = redirectUrl || '/dashboard';

    return NextResponse.redirect(new URL(targetUrl, request.url));

  } catch (error) {
    console.error('Click tracking error:', error);
    return NextResponse.json(
      { error: 'Click tracking failed' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for tracking via GET request (for marketing links)
 * Same functionality as POST but can be called via GET for simplicity
 */
export async function GET(request) {
  return POST(request);
}

/**
 * Update affiliate statistics
 */
async function updateAffiliateStats(database, affiliateId, campaignId) {
  try {
    await database.collection('affiliate_profiles').updateOne(
      { userId: affiliateId },
      {
        $inc: {
          total_clicks: 1,
        },
        $set: {
          last_activity: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error updating affiliate stats:', error);
  }
}

/**
 * Conversion tracking endpoint
 * Call this when a conversion occurs (e.g., after successful Stripe payment)
 * Links conversion to the original click
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { clickId, revenueAmount, transactionId } = body;

    if (!clickId || !revenueAmount) {
      return NextResponse.json(
        { error: 'click_id and revenueAmount are required' },
        { status: 400 }
      );
    }

    const { db: database } = await db.getConnection();

    // Find the original click event
    const clickEvent = await database
      .collection(CLICK_EVENTS_COLLECTION)
      .findOne({ clickId: clickId });

    if (!clickEvent) {
      return NextResponse.json(
        { error: 'Click not found' },
        { status: 404 }
      );
    }

    // Create conversion event
    const conversionEvent = {
      clickId,
      type: 'conversion',
      affiliateId: clickEvent.affiliateId,
      campaignId: clickEvent.campaignId,
      revenueAmount: revenueAmount,
      currency: 'INR',
      transactionId: transactionId || `txn_${Date.now()}`,
      convertedAt: new Date().toISOString(),

      // Copy metadata from original click
      originalClick: {
        ipAddress: clickEvent.ipAddress,
        userAgent: clickEvent.userAgent,
        deviceMetadata: clickEvent.deviceMetadata,
        clickTimestamp: clickEvent.createdAt,
      },
    };

    // Store conversion event
    await database
      .collection(CONVERSION_EVENTS_COLLECTION)
      .insertOne(conversionEvent);

    console.log('Conversion recorded:', {
      clickId,
      revenueAmount,
      affiliateId: clickEvent.affiliateId,
    });

    return cors(NextResponse.json(
      { success: true, message: 'Conversion recorded' },
      { status: 200 }
    ));
  } catch (error) {
    console.error('Conversion tracking error:', error);
    return cors(NextResponse.json(
      { error: 'Conversion tracking failed' },
      { status: 500 }
    ));
  }
}