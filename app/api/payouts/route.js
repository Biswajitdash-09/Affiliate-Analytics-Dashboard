import { NextResponse } from 'next/server';
import { getDb, clientPromise } from '@/lib/db';
import { PAYOUTS_COLLECTION, validatePayout, PAYOUT_STATUS } from '@/models/Payout';
import { AFFILIATE_PROFILES_COLLECTION } from '@/models/AffiliateProfile';
import { ObjectId } from 'mongodb';
import { requireAdmin, getAuthUser } from '@/lib/auth';

/**
 * GET /api/payouts
 * List payouts with pagination support.
 * Query params: affiliateId, status, page, limit
 */
export async function GET(request) {
    // Require admin authentication
    const authError = requireAdmin(request);
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const affiliateId = searchParams.get('affiliateId');
        const status = searchParams.get('status');
        
        // Pagination parameters with validation
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        
        // Validate pagination parameters
        if (isNaN(page) || page < 1) {
            return NextResponse.json({ success: false, error: 'Invalid page parameter' }, { status: 400 });
        }
        if (isNaN(limit) || limit < 1 || limit > 100) {
            return NextResponse.json({ success: false, error: 'Limit must be between 1 and 100' }, { status: 400 });
        }
        
        const skip = (page - 1) * limit;

        const db = await getDb();
        const query = {};

        if (affiliateId) query.affiliateId = affiliateId;
        if (status) query.status = status;

        // Fetch total count for pagination metadata
        const total = await db.collection(PAYOUTS_COLLECTION).countDocuments(query);
        
        // Fetch paginated results
        const payouts = await db.collection(PAYOUTS_COLLECTION)
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        // Calculate pagination metadata
        const totalPages = Math.ceil(total / limit);
        const hasMore = page < totalPages;

        return NextResponse.json({
            success: true,
            data: payouts,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore
            }
        });

    } catch (error) {
        console.error('Error fetching payouts:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch payouts' }, { status: 500 });
    }
}

/**
 * POST /api/payouts
 * Create a new Payout (Process Payment)
 * Payload: { affiliateId, amount, method, transactionId, notes }
 */
export async function POST(request) {
    // Require admin authentication
    const authError = requireAdmin(request);
    if (authError) return authError;

    // Get authenticated admin user
    const admin = getAuthUser(request);

    try {
        const body = await request.json();

        // Basic validation
        const error = validatePayout(body);
        if (error) return NextResponse.json({ success: false, error }, { status: 400 });

        const db = await getDb();
        const client = await clientPromise;

        // 1. Check if affiliate has enough pendingPayouts (outside transaction for read)
        // Safe query: Try both string and ObjectId
        let affiliateProfile = await db.collection(AFFILIATE_PROFILES_COLLECTION).findOne({ userId: body.affiliateId });
        if (!affiliateProfile && ObjectId.isValid(body.affiliateId)) {
            affiliateProfile = await db.collection(AFFILIATE_PROFILES_COLLECTION).findOne({ userId: new ObjectId(body.affiliateId) });
        }

        if (!affiliateProfile) {
            return NextResponse.json({ success: false, error: 'Affiliate not found' }, { status: 404 });
        }

        if (affiliateProfile.pendingPayouts < body.amount) {
            return NextResponse.json({ success: false, error: 'Insufficient pending balance' }, { status: 400 });
        }

        // 2. Create and execute transaction for atomic operations
        const session = client.startSession();
        let payoutData;
        
        try {
            payoutData = await session.withTransaction(async () => {
                // Create payout record within transaction
                const payout = {
                    affiliateId: body.affiliateId,
                    amount: parseFloat(body.amount),
                    currency: 'INR',
                    status: PAYOUT_STATUS.COMPLETED,
                    method: body.method || 'manual',
                    transactionId: body.transactionId,
                    notes: body.notes,
                    processedBy: admin?.userId || admin?.email || 'admin',
                    createdAt: new Date().toISOString(),
                    completedAt: new Date().toISOString()
                };

                const result = await db.collection(PAYOUTS_COLLECTION).insertOne(payout, { session });

                // Update affiliate profile within transaction
                await db.collection(AFFILIATE_PROFILES_COLLECTION).updateOne(
                    { _id: affiliateProfile._id },
                    {
                        $inc: {
                            pendingPayouts: -payout.amount,
                            total_paid: payout.amount
                        },
                        $set: {
                            last_payout_date: new Date().toISOString()
                        }
                    },
                    { session }
                );

                return { ...payout, _id: result.insertedId };
            });

            return NextResponse.json({
                success: true,
                data: payoutData
            });
        } catch (error) {
            console.error('Transaction failed, automatically rolled back:', error);
            return NextResponse.json({ success: false, error: 'Failed to process payout: ' + error.message }, { status: 500 });
        } finally {
            await session.endSession();
        }

    } catch (error) {
        console.error('Error creating payout:', error);
        return NextResponse.json({ success: false, error: 'Failed to process payout' }, { status: 500 });
    }
}
