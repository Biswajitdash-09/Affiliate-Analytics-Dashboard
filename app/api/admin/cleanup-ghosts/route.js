import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
    try {
        const db = await getDb();
        const result = await db.collection('affiliate_profiles').deleteMany({
            $or: [
                { commission_rate: { $exists: false } },
                { commission_rate: null },
                { createdAt: { $exists: false } } // Ghost profiles created by upsert didn't have createdAt
            ]
        });

        return NextResponse.json({
            success: true,
            deletedCount: result.deletedCount,
            message: `Cleaned up ${result.deletedCount} ghost profiles.`
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
