import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { PAYOUTS_COLLECTION, validatePayout, PAYOUT_STATUS } from '@/models/Payout';
import { AFFILIATE_PROFILES_COLLECTION } from '@/models/AffiliateProfile';
import { ObjectId } from 'mongodb';

/**
 * GET /api/payouts
 * List payouts.
 * Query params: affiliateId, status
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const affiliateId = searchParams.get('affiliateId');
        const status = searchParams.get('status');

        const db = await getDb();
        const query = {};

        if (affiliateId) query.affiliateId = affiliateId;
        if (status) query.status = status;

        const payouts = await db.collection(PAYOUTS_COLLECTION)
            .find(query)
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();

        // Enrich with affiliate names if admin viewer (not implemented here, assuming basic list)
        // Ideally we join with Users collection

        return NextResponse.json({ success: true, data: payouts });

    } catch (error) {
        console.error('Error fetching payouts:', error);
        return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    }
}

/**
 * POST /api/payouts
 * Create a new Payout (Process Payment)
 * Payload: { affiliateId, amount, method, transactionId, notes }
 */
export async function POST(request) {
    try {
        const body = await request.json();

        // Basic validation
        const error = validatePayout(body);
        if (error) return NextResponse.json({ success: false, error }, { status: 400 });

        const db = await getDb();

        // 1. Check if affiliate has enough pending_payouts
        const profile = await db.collection(AFFILIATE_PROFILES_COLLECTION).findOne({
            userId: body.affiliateId
            // Note: userId in profile is usually String or ObjectId depending on how it was saved.
            // In register route: userId: result.insertedId (ObjectId)
            // So we might need to cast body.affiliateId to ObjectId if we query by _id.
            // But validPayout checks userId field in profile.
        });

        // Wait, AFFILIATE_PROFILES_COLLECTION schema uses 'userId' which is ObjectId usually.
        // Let's check how we refer to it. Stripe route uses `userId: revenueRecord.affiliateId`.
        // Revenue record stores `affiliateId` as string usually? No, let's consistency check.
        // Register route: userId: result.insertedId (ObjectId).
        // LinkGenerator: `selectedAffiliateId` passed as string?

        // Safe query: Try both
        let affiliateProfile = await db.collection(AFFILIATE_PROFILES_COLLECTION).findOne({ userId: body.affiliateId });
        if (!affiliateProfile && ObjectId.isValid(body.affiliateId)) {
            affiliateProfile = await db.collection(AFFILIATE_PROFILES_COLLECTION).findOne({ userId: new ObjectId(body.affiliateId) });
        }

        if (!affiliateProfile) {
            return NextResponse.json({ success: false, error: 'Affiliate not found' }, { status: 404 });
        }

        if (affiliateProfile.pending_payouts < body.amount) {
            return NextResponse.json({ success: false, error: 'Insufficient pending balance' }, { status: 400 });
        }

        // 2. Create Payout Record
        const payout = {
            affiliateId: body.affiliateId, // Store as passed (usually string representation)
            amount: parseFloat(body.amount),
            currency: 'INR',
            status: PAYOUT_STATUS.COMPLETED, // Mark as completed assuming manual transfer done
            method: body.method || 'manual',
            transactionId: body.transactionId,
            notes: body.notes,
            processedBy: 'admin', // TODO: get from session
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
        };

        const result = await db.collection(PAYOUTS_COLLECTION).insertOne(payout);

        // 3. Update Affiliate Profile
        // Decrement pending_payouts, Increment total_paid
        // We match via the _id of the profile found earlier
        await db.collection(AFFILIATE_PROFILES_COLLECTION).updateOne(
            { _id: affiliateProfile._id },
            {
                $inc: {
                    pending_payouts: -payout.amount,
                    total_paid: payout.amount
                },
                $set: {
                    last_payout_date: new Date().toISOString()
                }
            }
        );

        return NextResponse.json({
            success: true,
            data: { ...payout, _id: result.insertedId }
        });

    } catch (error) {
        console.error('Error creating payout:', error);
        return NextResponse.json({ success: false, error: 'Failed to process payout' }, { status: 500 });
    }
}
