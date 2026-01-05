import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { AFFILIATE_PROFILES_COLLECTION } from '@/models/AffiliateProfile';

const CLICK_EVENTS_COLLECTION = 'click_events';

/**
 * GET /api/analytics/leaderboards
 * Returns top affiliates and top campaigns.
 */
export async function GET(request) {
    try {
        const db = await getDb();

        // 1. Top Affiliates by total_earnings
        const topAffiliates = await db.collection(AFFILIATE_PROFILES_COLLECTION)
            .aggregate([
                { $match: { total_earnings: { $gt: 0 } } },
                { $sort: { total_earnings: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        name: '$user.name',
                        email: '$user.email',
                        total_earnings: 1,
                        total_clicks: 1
                    }
                }
            ])
            .toArray();

        // 2. Top Campaigns by click count
        const topCampaigns = await db.collection(CLICK_EVENTS_COLLECTION)
            .aggregate([
                { $match: { campaignId: { $ne: null } } },
                { $group: { _id: '$campaignId', clicks: { $sum: 1 } } },
                { $sort: { clicks: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'campaigns',
                        let: { cid: '$_id' },
                        pipeline: [
                            { $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$cid'] } } }
                        ],
                        as: 'campaign'
                    }
                },
                { $unwind: { path: '$campaign', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        name: { $ifNull: ['$campaign.name', '$_id'] },
                        clicks: 1
                    }
                }
            ])
            .toArray();

        return NextResponse.json({
            success: true,
            data: {
                topAffiliates,
                topCampaigns
            }
        });

    } catch (error) {
        console.error('Leaderboards error:', error);
        return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    }
}
