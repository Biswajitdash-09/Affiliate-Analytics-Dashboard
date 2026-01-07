import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const CLICK_EVENTS_COLLECTION = 'click_events';

/**
 * GET /api/admin/fraud
 * Returns statistics about filtered/fraudulent traffic.
 */
export async function GET(request) {
    try {
        const db = await getDb();
        const collection = db.collection(CLICK_EVENTS_COLLECTION);

        // 1. Total Fraudulent Clicks vs Total Clicks (Last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateFilter = { $gte: thirtyDaysAgo.toISOString() };

        const [totalClicks, totalFraud] = await Promise.all([
            collection.countDocuments({ createdAt: dateFilter }),
            collection.countDocuments({ createdAt: dateFilter, filtered: true })
        ]);

        // 2. Fraud by Reason (Pie Chart)
        const fraudByReason = await collection.aggregate([
            {
                $match: {
                    createdAt: dateFilter,
                    filtered: true
                }
            },
            {
                $group: {
                    _id: "$filterReason",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]).toArray();

        // 3. Top Offenders by IP (Table)
        const topOffenders = await collection.aggregate([
            {
                $match: {
                    createdAt: dateFilter,
                    filtered: true
                }
            },
            {
                $group: {
                    _id: "$ipAddress",
                    count: { $sum: 1 },
                    reasons: { $addToSet: "$filterReason" },
                    lastSeen: { $max: "$createdAt" }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).toArray();

        // 4. Recent Flagged Events (Table)
        const recentEvents = await collection.find({
            createdAt: dateFilter,
            filtered: true
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();

        // 5. Daily Trend (Bar Chart)
        const dailyTrend = await collection.aggregate([
            {
                $match: {
                    createdAt: dateFilter,
                    filtered: true
                }
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
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        return NextResponse.json({
            success: true,
            data: {
                effectiveness: {
                    totalClicks,
                    totalFraud,
                    blockRate: totalClicks > 0 ? ((totalFraud / totalClicks) * 100).toFixed(2) : 0
                },
                fraudByReason: fraudByReason.map(r => ({ name: r._id, value: r.count })),
                topOffenders: topOffenders.map(o => ({
                    ip: o._id,
                    count: o.count,
                    reasons: o.reasons,
                    lastSeen: o.lastSeen
                })),
                recentEvents,
                dailyTrend: dailyTrend.map(d => ({ date: d._id, count: d.count }))
            }
        });

    } catch (error) {
        console.error('Error fetching fraud stats:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch fraud statistics' },
            { status: 500 }
        );
    }
}
