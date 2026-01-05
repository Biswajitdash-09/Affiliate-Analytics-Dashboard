import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { SHORTLINKS_COLLECTION } from '@/models/ShortLink';

/**
 * GET /s/[code]
 * Redirect handler for short links.
 * Increments click count and redirects to the tracking URL.
 */
export async function GET(request, { params }) {
    try {
        const { code } = await params;

        if (!code) {
            return NextResponse.redirect(new URL('/', request.url));
        }

        const db = await getDb();
        const collection = db.collection(SHORTLINKS_COLLECTION);

        // Find the short link
        const shortLink = await collection.findOne({ code });

        if (!shortLink) {
            // Short link not found - redirect to home
            return NextResponse.redirect(new URL('/', request.url));
        }

        // Increment click counter (fire and forget)
        collection.updateOne(
            { code },
            { $inc: { clicks: 1 } }
        ).catch(err => console.error('Failed to increment click:', err));

        // Redirect to the full tracking URL
        return NextResponse.redirect(shortLink.targetUrl);

    } catch (error) {
        console.error('Short link redirect error:', error);
        return NextResponse.redirect(new URL('/', request.url));
    }
}
