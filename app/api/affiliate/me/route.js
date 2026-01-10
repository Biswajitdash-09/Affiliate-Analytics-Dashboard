import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { AFFILIATE_PROFILES_COLLECTION } from '@/models/AffiliateProfile';
import { REVENUE_COLLECTION } from '@/models/Revenue';
import { PAYOUTS_COLLECTION } from '@/models/Payout';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

/**
 * GET /api/affiliate/me
 * Returns the current affiliate's profile, earnings, and history.
 * Requires Authorization header with JWT token.
 */
export async function GET(request) {
    try {
        // Extract token from header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];

        // Verify JWT
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
        }

        const userId = decoded.userId;
        const db = await getDb();

        // 1. Get Affiliate Profile
        const profile = await db.collection(AFFILIATE_PROFILES_COLLECTION).findOne({
            userId: new ObjectId(userId)
        });

        if (!profile) {
            return NextResponse.json({ success: false, error: 'Affiliate profile not found' }, { status: 404 });
        }

        // 2. Get Revenue History (their earnings)
        const revenues = await db.collection(REVENUE_COLLECTION)
            .find({ affiliateId: userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();

        // 3. Get Payout History
        const payouts = await db.collection(PAYOUTS_COLLECTION)
            .find({ affiliateId: userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();

        // 4. Calculate summary stats
        const stats = {
            totalEarnings: profile.total_earnings || 0,
            pendingPayouts: profile.pendingPayouts || 0,
            totalPaid: profile.total_paid || 0,
            totalClicks: profile.total_clicks || 0,
            commissionRate: profile.commission_rate || 0.10,
            status: profile.status
        };

        return NextResponse.json({
            success: true,
            data: {
                profile: {
                    ...profile,
                    userId: profile.userId.toString()
                },
                stats,
                revenues,
                payouts
            }
        });

    } catch (error) {
        console.error('Error fetching affiliate data:', error);
        return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    }
}
