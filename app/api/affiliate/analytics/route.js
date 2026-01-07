import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { CAMPAIGNS_COLLECTION } from '@/models/Campaign';
import jwt from 'jsonwebtoken';

// Collections
const CLICK_EVENTS_COLLECTION = 'click_events';
const REVENUE_COLLECTION = 'revenues';

export async function GET(request) {
    try {
        // 1. Authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
        }

        const userId = decoded.userId || decoded.sub;
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Invalid token payload' }, { status: 401 });
        }

        const db = await getDb();
        const affiliateId = userId.toString();

        // 2. Get Campaign Performance Stats

        // Aggregate Clicks by Campaign
        const clickStats = await db.collection(CLICK_EVENTS_COLLECTION).aggregate([
            { $match: { affiliateId: affiliateId, filtered: { $ne: true } } }, // Exclude bots
            {
                $group: {
                    _id: '$campaignId',
                    clicks: { $sum: 1 }
                }
            }
        ]).toArray();

        // Aggregate Revenue/Commissions by Campaign
        const revenueStats = await db.collection(REVENUE_COLLECTION).aggregate([
            { $match: { affiliateId: affiliateId } },
            {
                $group: {
                    _id: '$campaignId',
                    conversions: { $sum: 1 },
                    totalRevenue: { $sum: '$amount' },
                    totalCommission: { $sum: '$commissionAmount' }
                }
            }
        ]).toArray();

        // Merge Stats and Fetch Campaign Details
        const campaignMap = {};

        // Process Clicks
        clickStats.forEach(stat => {
            const campId = stat._id || 'unknown';
            if (!campaignMap[campId]) campaignMap[campId] = { id: campId, clicks: 0, conversions: 0, revenue: 0, commission: 0 };
            campaignMap[campId].clicks = stat.clicks;
        });

        // Process Revenue
        revenueStats.forEach(stat => {
            const campId = stat._id || 'unknown';
            if (!campaignMap[campId]) campaignMap[campId] = { id: campId, clicks: 0, conversions: 0, revenue: 0, commission: 0 };
            campaignMap[campId].conversions = stat.conversions;
            campaignMap[campId].revenue = stat.totalRevenue;
            campaignMap[campId].commission = stat.totalCommission;
        });

        // Fetch Campaign Names
        // Collect all Campaign IDs that are valid ObjectIds
        const campaignIds = Object.keys(campaignMap).filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
        // Also support custom string IDs if any (though typically they are ObjectIds)
        const customIds = Object.keys(campaignMap).filter(id => !ObjectId.isValid(id) && id !== 'unknown');

        const campaigns = await db.collection(CAMPAIGNS_COLLECTION).find({
            $or: [
                { _id: { $in: campaignIds } },
                { _id: { $in: customIds } } // If stored as string _id
            ]
        }).toArray();

        // Attach names to map
        campaigns.forEach(camp => {
            // Handle both ObjectId and String _id match
            const idStr = camp._id.toString();
            if (campaignMap[idStr]) {
                campaignMap[idStr].name = camp.name;
                campaignMap[idStr].url = camp.url;
            }
        });

        // Flatten to array
        const campaignPerformance = Object.values(campaignMap).map(camp => ({
            ...camp,
            name: camp.name || 'Unknown Campaign',
            conversionRate: camp.clicks > 0 ? (camp.conversions / camp.clicks) * 100 : 0,
            epc: camp.clicks > 0 ? (camp.commission / camp.clicks) : 0
        }));


        // 3. Get Daily Performance (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateLimit = thirtyDaysAgo.toISOString();

        // Aggregate Daily Clicks
        const dailyClicks = await db.collection(CLICK_EVENTS_COLLECTION).aggregate([
            {
                $match: {
                    affiliateId: affiliateId,
                    filtered: { $ne: true },
                    createdAt: { $gte: dateLimit }
                }
            },
            {
                $group: {
                    _id: { $substr: ['$createdAt', 0, 10] }, // YYYY-MM-DD
                    clicks: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        // Aggregate Daily Commissions
        const dailyRevenue = await db.collection(REVENUE_COLLECTION).aggregate([
            {
                $match: {
                    affiliateId: affiliateId,
                    createdAt: { $gte: dateLimit }
                }
            },
            {
                $group: {
                    _id: { $substr: ['$createdAt', 0, 10] },
                    commission: { $sum: '$commissionAmount' }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        // Merge Daily Data
        const dailyMap = {};
        // Fill last 30 days with 0
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            dailyMap[dateStr] = { date: dateStr, clicks: 0, earnings: 0 };
        }

        dailyClicks.forEach(item => {
            if (dailyMap[item._id]) dailyMap[item._id].clicks = item.clicks;
        });

        dailyRevenue.forEach(item => {
            if (dailyMap[item._id]) dailyMap[item._id].earnings = item.commission;
        });

        const dailyPerformance = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

        // 4. Get Funnel Metrics (Total Clicks vs Total Conversions)
        const totalFunnelClicks = await db.collection(CLICK_EVENTS_COLLECTION).countDocuments({
            affiliateId: affiliateId,
            filtered: { $ne: true }
        });

        const totalFunnelConversions = await db.collection(REVENUE_COLLECTION).countDocuments({
            affiliateId: affiliateId
        });

        const funnelMetrics = [
            { name: 'Clicks', value: totalFunnelClicks, fill: '#3b82f6' }, // Primary Color
            { name: 'Conversions', value: totalFunnelConversions, fill: '#10b981' } // Success Color
        ];

        return NextResponse.json({
            success: true,
            data: {
                campaigns: campaignPerformance,
                daily: dailyPerformance,
                funnel: funnelMetrics
            }
        });

    } catch (error) {
        console.error('Analytics API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
