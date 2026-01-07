import { ObjectId } from 'mongodb';

// ... existing imports ...

// ... inside updateAffiliateStats ...
async function updateAffiliateStats(database, affiliateId, campaignId) {
  try {
    // Validate ObjectId format
    if (!ObjectId.isValid(affiliateId)) {
      console.warn(`Invalid affiliate ID format: ${affiliateId}`);
      return;
    }

    const oid = new ObjectId(affiliateId);

    await database.collection('affiliate_profiles').updateOne(
      { userId: oid },
      {
        $inc: {
          total_clicks: 1,
        },
        $set: {
          last_activity: new Date().toISOString(),
        },
      },
      { upsert: false } // Do not auto-create profiles from clicks
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

    const database = await getDb();

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