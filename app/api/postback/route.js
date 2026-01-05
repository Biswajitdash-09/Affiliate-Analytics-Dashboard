import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { REVENUE_COLLECTION } from '@/models/Revenue';
import { AFFILIATE_PROFILES_COLLECTION } from '@/models/AffiliateProfile';
import { ObjectId } from 'mongodb';

const CLICK_EVENTS_COLLECTION = 'click_events';

/**
 * GET /api/postback
 * Server-to-server postback endpoint for conversion notifications.
 * 
 * Query params:
 *  - click_id (required): The click ID from the original tracking
 *  - amount (optional): Revenue amount (default: 0)
 *  - currency (optional): Currency code (default: INR)
 *  - status (optional): 'success' | 'pending' (default: 'success')
 *  - payout (optional): Commission amount override
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const clickId = searchParams.get('click_id');
        const amount = parseFloat(searchParams.get('amount') || '0');
        const currency = searchParams.get('currency') || 'INR';
        const status = searchParams.get('status') || 'success';
        const payoutOverride = searchParams.get('payout');

        if (!clickId) {
            return NextResponse.json({
                success: false,
                error: 'click_id is required'
            }, { status: 400 });
        }

        const db = await getDb();

        // 1. Find the click event
        const click = await db.collection(CLICK_EVENTS_COLLECTION).findOne({ clickId });

        if (!click) {
            return NextResponse.json({
                success: false,
                error: 'Click not found'
            }, { status: 404 });
        }

        // 2. Mark click as converted
        await db.collection(CLICK_EVENTS_COLLECTION).updateOne(
            { clickId },
            {
                $set: {
                    converted: true,
                    convertedAt: new Date().toISOString(),
                    conversionAmount: amount
                }
            }
        );

        // 3. Calculate commission
        let commissionAmount = 0;

        if (payoutOverride) {
            commissionAmount = parseFloat(payoutOverride);
        } else if (amount > 0) {
            // Get affiliate's commission rate
            const profile = await db.collection(AFFILIATE_PROFILES_COLLECTION).findOne({
                userId: new ObjectId(click.affiliateId)
            });
            const rate = profile?.commission_rate || 0.10;
            commissionAmount = amount * rate;
        }

        // 4. Create revenue record
        const revenue = {
            affiliateId: click.affiliateId,
            campaignId: click.campaignId,
            clickId: clickId,
            amount: amount,
            commissionAmount: commissionAmount,
            currency: currency,
            status: status === 'success' ? 'succeeded' : 'pending',
            source: 'postback',
            createdAt: new Date().toISOString()
        };

        await db.collection(REVENUE_COLLECTION).insertOne(revenue);

        // 5. Update affiliate earnings
        if (commissionAmount > 0) {
            await db.collection(AFFILIATE_PROFILES_COLLECTION).updateOne(
                { userId: new ObjectId(click.affiliateId) },
                {
                    $inc: {
                        total_earnings: commissionAmount,
                        pending_payouts: commissionAmount
                    }
                }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Conversion recorded',
            data: {
                clickId,
                affiliateId: click.affiliateId,
                amount,
                commission: commissionAmount
            }
        });

    } catch (error) {
        console.error('Postback error:', error);
        return NextResponse.json({
            success: false,
            error: 'Postback processing failed'
        }, { status: 500 });
    }
}
