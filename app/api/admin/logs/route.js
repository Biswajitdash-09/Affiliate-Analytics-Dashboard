import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const CLICK_EVENTS_COLLECTION = 'click_events';

/**
 * GET /api/admin/logs
 * Fetch bot/fraud detection logs (filtered clicks)
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');

        const db = await getDb();

        // Find clicks that were filtered (bots, spam, etc.)
        const logs = await db.collection(CLICK_EVENTS_COLLECTION)
            .find({
                $or: [
                    { filtered: true },
                    { 'botDetection.isBot': true }
                ]
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();

        return NextResponse.json({ success: true, data: logs });
    } catch (error) {
        console.error('Error fetching fraud logs:', error);
        return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    }
}
