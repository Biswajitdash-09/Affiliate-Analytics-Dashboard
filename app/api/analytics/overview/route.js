import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, getAuthUser } from '@/lib/auth';

// Collection names
const CLICK_EVENTS_COLLECTION = 'click_events';
const REVENUES_COLLECTION = 'revenues';
const CAMPAIGNS_COLLECTION = 'campaigns';

/**
 * GET /api/analytics/overview
 * Returns aggregated analytics data (KPIs and Chart Data)
 * Query Params: startDate, endDate (ISO strings or YYYY-MM-DD)
 *
 * Role-based Access:
 * - Admin: Returns global analytics (all affiliates)
 * - Affiliate: Returns only their own analytics
 */

/**
 * Helper function to seed sample analytics data if the collections are empty.
 * This ensures the dashboard has meaningful charts and stats immediately upon deployment.
 */
async function seedSampleData(db) {
  try {
    const clickCollection = db.collection(CLICK_EVENTS_COLLECTION);
    const revenueCollection = db.collection(REVENUES_COLLECTION);

    const [clickCount, revenueCount] = await Promise.all([
      clickCollection.countDocuments(),
      revenueCollection.countDocuments()
    ]);

    // Only seed if both collections are empty
    if (clickCount === 0 && revenueCount === 0) {
      console.log('Seeding sample analytics data...');

      // Try to fetch existing campaigns to link data to
      const campaigns = await db.collection(CAMPAIGNS_COLLECTION).find({}).toArray();
      const campaignIds = campaigns.length > 0
        ? campaigns.map(c => c._id.toString())
        : ['sample_campaign_1', 'sample_campaign_2'];

      const clickEvents = [];
      const revenueEvents = [];
      const now = new Date();
      const daysToSeed = 30;

      for (let i = 0; i < daysToSeed; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // Simulate growth trend
        const trendFactor = 0.5 + (0.5 * (daysToSeed - i) / daysToSeed);
        const dailyClicks = Math.floor((Math.random() * 150 + 50) * trendFactor);

        for (let j = 0; j < dailyClicks; j++) {
          const eventTime = new Date(date);
          eventTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

          const campaignId = campaignIds[Math.floor(Math.random() * campaignIds.length)];

          // Create Click Event with metadata
          clickEvents.push({
            clickId: `click_${Math.random().toString(36).substr(2, 9)}`,
            type: 'click',
            affiliateId: 'affiliate_demo',
            campaignId: campaignId,
            ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            referrer: Math.random() > 0.5 ? 'https://affiliate.example.com' : 'https://social.example.com',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            createdAt: eventTime.toISOString(),
            filtered: false,
            deviceMetadata: {
              browser: 'Chrome',
              os: 'Windows',
              deviceType: 'desktop'
            },
            botDetection: {
              isBot: false,
              reason: 'none'
            }
          });

          // Simulate Conversion (5-8% rate)
          if (Math.random() > 0.93) {
            const conversionTime = new Date(eventTime.getTime() + Math.random() * 1800000);
            const revenue = parseFloat((Math.random() * 4000 + 1000).toFixed(2)); // ₹1,000 - ₹5,000

            revenueEvents.push({
              stripePaymentId: `pi_demo_${Math.random().toString(36).substr(2, 9)}`,
              stripeSessionId: `cs_demo_${Math.random().toString(36).substr(2, 9)}`,
              amount: revenue,
              currency: 'INR',
              status: 'succeeded',
              affiliateId: 'affiliate_demo',
              campaignId: campaignId,
              clickId: clickEvents[clickEvents.length - 1]?.clickId,
              metadata: {
                customerEmail: 'demo@example.com',
                paymentStatus: 'paid'
              },
              createdAt: conversionTime.toISOString(),
              convertedAt: conversionTime.toISOString()
            });
          }
        }
      }

      if (clickEvents.length > 0) {
        await clickCollection.insertMany(clickEvents);
        console.log(`Seeded ${clickEvents.length} click events.`);
      }

      if (revenueEvents.length > 0) {
        await revenueCollection.insertMany(revenueEvents);
        console.log(`Seeded ${revenueEvents.length} revenue events.`);
      }
    }
  } catch (error) {
    console.error("Error seeding sample data:", error);
  }
}

/**
 * GET /api/analytics/overview
 * Returns aggregated analytics data (KPIs and Chart Data)
 * Query Params: startDate, endDate (ISO strings or YYYY-MM-DD)
 */
export async function GET(request) {
  // Require authentication
  const authError = requireAuth(request);
  if (authError) return authError;

  const authUser = getAuthUser(request);
  const userRole = authUser?.role || 'affiliate';
  const userId = authUser?.userId;

  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const db = await getDb();

    // PRODUCTION: Disabled automatic seeding of sample data
    // await seedSampleData(db);

    const clickCollection = db.collection(CLICK_EVENTS_COLLECTION);
    const revenueCollection = db.collection(REVENUES_COLLECTION);

    // Determine Date Range
    let startDate, endDate;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default: Last 30 Days
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(endDate); // Create startDate from endDate to avoid timezone issues
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }

    // Build match queries based on user role
    const baseClickMatch = {
      createdAt: { $gte: startDate.toISOString(), $lte: endDate.toISOString() },
      filtered: false // Only count non-filtered clicks
    };

    const baseRevenueMatch = {
      createdAt: { $gte: startDate.toISOString(), $lte: endDate.toISOString() },
      status: 'succeeded'
    };

    // If affiliate, add affiliateId filter
    if (userRole === 'affiliate' && userId) {
      baseClickMatch.affiliateId = userId;
      baseRevenueMatch.affiliateId = userId;
    }

    // Aggregate clicks and revenues separately
    const [clickResults, revenueResults] = await Promise.all([
      clickCollection.aggregate([
        {
          $match: baseClickMatch
        },
        {
          $addFields: {
            dateObj: { $toDate: "$createdAt" }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$dateObj" }
            },
            clicks: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            clicks: 1
          }
        }
      ]).toArray(),
      revenueCollection.aggregate([
        {
          $match: baseRevenueMatch
        },
        {
          $addFields: {
            dateObj: { $toDate: "$createdAt" }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$dateObj" }
            },
            conversions: { $sum: 1 },
            revenue: { $sum: "$amount" }
          }
        },
        {
          $sort: { _id: 1 }
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            conversions: 1,
            revenue: 1
          }
        }
      ]).toArray()
    ]);

    // Fetch recent activity (Clicks & Conversions)
    // Apply role-based filtering
    const recentClickMatch = { filtered: false };
    const recentRevenueMatch = { status: 'succeeded' };
    
    if (userRole === 'affiliate' && userId) {
      recentClickMatch.affiliateId = userId;
      recentRevenueMatch.affiliateId = userId;
    }

    const [recentClicks, recentRevenues] = await Promise.all([
      clickCollection.aggregate([
        { $match: recentClickMatch },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: CAMPAIGNS_COLLECTION,
            let: { campaignId: "$campaignId" },
            pipeline: [
              { $match: { $expr: { $and: [
                { $ne: ["$$campaignId", null] },
                { $ne: ["$$campaignId", ""] }
              ]}}},
              { $match: { $expr: { $eq: ["$_id", { $toObjectId: "$$campaignId" }] } } }
            ],
            as: "campaign"
          }
        },
        // Fallback lookup for string IDs if ObjectId fails or assumes simple match
        {
          $lookup: {
            from: CAMPAIGNS_COLLECTION,
            localField: "campaignId",
            foreignField: "_id",
            as: "campaignFallback"
          }
        },
        {
          $project: {
            type: { $literal: "click" },
            campaignName: {
              $ifNull: [
                { $arrayElemAt: ["$campaign.name", 0] },
                { $arrayElemAt: ["$campaignFallback.name", 0] },
                "Unknown Campaign"
              ]
            },
            createdAt: 1
          }
        }
      ]).toArray(),
      revenueCollection.aggregate([
        { $match: recentRevenueMatch },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: CAMPAIGNS_COLLECTION,
            let: { campaignId: "$campaignId" },
            pipeline: [
              { $match: { $expr: { $and: [
                { $ne: ["$$campaignId", null] },
                { $ne: ["$$campaignId", ""] }
              ]}}},
              { $match: { $expr: { $eq: ["$_id", { $toObjectId: "$$campaignId" }] } } }
            ],
            as: "campaign"
          }
        },
        {
          $lookup: {
            from: CAMPAIGNS_COLLECTION,
            localField: "campaignId",
            foreignField: "_id",
            as: "campaignFallback"
          }
        },
        {
          $project: {
            type: { $literal: "conversion" },
            amount: "$amount",
            currency: "$currency",
            campaignName: {
              $ifNull: [
                { $arrayElemAt: ["$campaign.name", 0] },
                { $arrayElemAt: ["$campaignFallback.name", 0] },
                "Unknown Campaign"
              ]
            },
            createdAt: 1
          }
        }
      ]).toArray()
    ]);

    // Merge and sort recent activity
    const recentActivity = [...recentClicks, ...recentRevenues]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    // Merge results by date
    const mergedChartData = [];
    const allDates = new Set([
      ...clickResults.map(r => r.date),
      ...revenueResults.map(r => r.date)
    ]);

    allDates.forEach(date => {
      const clickData = clickResults.find(r => r.date === date) || { clicks: 0 };
      const revenueData = revenueResults.find(r => r.date === date) || { conversions: 0, revenue: 0 };

      mergedChartData.push({
        date,
        clicks: clickData.clicks,
        conversions: revenueData.conversions,
        revenue: revenueData.revenue
      });
    });

    // Calculate KPIs from aggregated data
    const totalClicks = clickResults.reduce((sum, r) => sum + r.clicks, 0);
    const totalConversions = revenueResults.reduce((sum, r) => sum + r.conversions, 0);
    const totalRevenue = revenueResults.reduce((sum, r) => sum + r.revenue, 0);
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    const kpis = {
      totalClicks,
      totalConversions,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      conversionRate: parseFloat(conversionRate.toFixed(2))
    };

    const funnel = [
      { name: 'Clicks', value: totalClicks, fill: '#3b82f6' },
      { name: 'Conversions', value: totalConversions, fill: '#10b981' }
    ];

    return NextResponse.json({
      success: true,
      data: {
        kpis,
        chartData: mergedChartData,
        recentActivity,
        funnel
      }
    });

  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}