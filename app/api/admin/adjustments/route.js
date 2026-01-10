import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { AFFILIATE_PROFILES_COLLECTION } from '@/models/AffiliateProfile';
import { ObjectId } from 'mongodb';
import { requireAdmin, getAuthUser } from '@/lib/auth';

const ADJUSTMENTS_COLLECTION = 'adjustments';

/**
 * GET /api/admin/adjustments
 * List all manual adjustments
 */
export async function GET(request) {
    // Require admin authentication
    const authError = requireAdmin(request);
    if (authError) return authError;

    try {
        const db = await getDb();
        const adjustments = await db.collection(ADJUSTMENTS_COLLECTION)
            .find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();

        return NextResponse.json({ success: true, data: adjustments });
    } catch (error) {
        console.error('Error fetching adjustments:', error);
        return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    }
}

/**
 * POST /api/admin/adjustments
 * Create a manual adjustment
 * Payload: { affiliateId, type: 'commission' | 'clicks', amount, reason }
 */
export async function POST(request) {
    // Require admin authentication
    const authError = requireAdmin(request);
    if (authError) return authError;

    // Get authenticated admin user
    const admin = getAuthUser(request);

    try {
        const body = await request.json();
        const { affiliateId, type, amount, reason } = body;

        if (!affiliateId || !type || amount === undefined) {
            return NextResponse.json(
                { success: false, error: 'affiliateId, type, and amount are required' },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Find affiliate profile
        let query;
        if (ObjectId.isValid(affiliateId)) {
            query = { $or: [{ _id: new ObjectId(affiliateId) }, { userId: new ObjectId(affiliateId) }] };
        } else {
            query = { userId: affiliateId };
        }

        const profile = await db.collection(AFFILIATE_PROFILES_COLLECTION).findOne(query);

        if (!profile) {
            return NextResponse.json({ success: false, error: 'Affiliate not found' }, { status: 404 });
        }

        // Create adjustment record
        const adjustment = {
            affiliateId: affiliateId,
            type, // 'commission' or 'clicks'
            amount: parseFloat(amount),
            reason: reason || '',
            processedBy: admin?.userId || admin?.email || 'admin',
            createdAt: new Date().toISOString()
        };

        await db.collection(ADJUSTMENTS_COLLECTION).insertOne(adjustment);

        // Apply adjustment to profile
        const updateFields = {};

        if (type === 'commission') {
            updateFields.total_earnings = (profile.total_earnings || 0) + parseFloat(amount);
            updateFields.pendingPayouts = (profile.pendingPayouts || 0) + parseFloat(amount);
        } else if (type === 'clicks') {
            updateFields.total_clicks = (profile.total_clicks || 0) + parseInt(amount);
        }

        await db.collection(AFFILIATE_PROFILES_COLLECTION).updateOne(
            { _id: profile._id },
            { $set: updateFields }
        );

        return NextResponse.json({
            success: true,
            message: 'Adjustment applied successfully',
            data: adjustment
        });

    } catch (error) {
        console.error('Error creating adjustment:', error);
        return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    }
}
