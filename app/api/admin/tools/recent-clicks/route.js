import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
    try {
        const db = await getDb();

        // Fetch last 20 clicks, sorted by newest first
        const clicks = await db.collection('click_events')
            .find({
                type: 'click',
                filtered: false // Only show valid clicks
            })
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();

        return NextResponse.json({ success: true, data: clicks });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
