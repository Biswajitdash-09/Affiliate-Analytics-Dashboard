import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { CAMPAIGNS_COLLECTION, validateCampaign, CAMPAIGN_STATUS } from '@/models/Campaign';

/**
 * Helper function to seed sample campaigns if the collection is empty.
 * Ensures the dashboard has data immediately upon deployment.
 */
async function seedSampleCampaigns(db) {
  try {
    const collection = db.collection(CAMPAIGNS_COLLECTION);
    const count = await collection.countDocuments();

    if (count === 0) {
      console.log('Seeding sample campaigns...');

      const sampleCampaigns = [
        {
          name: "Summer Tech Sale 2024",
          url: "https://store.example.com/summer-sale?ref={affiliate_id}",
          payout_rules: { type: "CPA", amount: 2500.00, currency: "INR" },
          status: CAMPAIGN_STATUS.ACTIVE,
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString() // 5 days ago
        },
        {
          name: "Premium SaaS Subscription",
          url: "https://app.saas-platform.com/signup?via={affiliate_id}",
          payout_rules: { type: "RevShare", percentage: 20, duration: "lifetime" },
          status: CAMPAIGN_STATUS.ACTIVE,
          createdAt: new Date(Date.now() - 86400000 * 10).toISOString() // 10 days ago
        },
        {
          name: "Winter Fashion Collection",
          url: "https://fashion.example.com/winter?aff={affiliate_id}",
          payout_rules: "15% on all orders over ₹5,000",
          status: CAMPAIGN_STATUS.PAUSED,
          createdAt: new Date(Date.now() - 86400000 * 30).toISOString() // 30 days ago
        },
        {
          name: "E-book Bundle Launch",
          url: "https://learn.example.com/bundle?partner={affiliate_id}",
          payout_rules: { type: "Fixed", amount: 10.00 },
          status: CAMPAIGN_STATUS.ARCHIVED,
          createdAt: new Date(Date.now() - 86400000 * 60).toISOString() // 60 days ago
        },
        {
          name: "Health & Wellness Supplement",
          url: "https://health.example.com/try-now?id={affiliate_id}",
          payout_rules: { type: "CPA", amount: 45.00 },
          status: CAMPAIGN_STATUS.ACTIVE,
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString() // 2 days ago
        }
      ];

      await collection.insertMany(sampleCampaigns);
      console.log(`Seeded ${sampleCampaigns.length} sample campaigns.`);
    }
  } catch (error) {
    console.error("Error seeding campaigns:", error);
  }
}

/**
 * GET /api/campaigns
 * Fetches all campaigns.
 */
export async function GET(request) {
  try {
    const db = await getDb();

    // PRODUCTION: Disabled automatic seeding of sample data
    // await seedSampleCampaigns(db);

    const collection = db.collection(CAMPAIGNS_COLLECTION);

    // Fetch all campaigns sorted by newest first
    const campaigns = await collection.find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns
 * Creates a new campaign.
 */
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate input using the model's validation function
    const validationError = validateCampaign(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection(CAMPAIGNS_COLLECTION);

    // Check for duplicate name to prevent confusion
    const existing = await collection.findOne({ name: body.name });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A campaign with this name already exists' },
        { status: 409 }
      );
    }

    const newCampaign = {
      name: body.name,
      url: body.url,
      payout_rules: body.payout_rules,
      status: body.status || CAMPAIGN_STATUS.ACTIVE,
      createdAt: new Date().toISOString()
    };

    const result = await collection.insertOne(newCampaign);

    return NextResponse.json({
      success: true,
      data: { ...newCampaign, _id: result.insertedId },
      message: "Campaign created successfully"
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}