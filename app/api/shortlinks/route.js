import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { SHORTLINKS_COLLECTION, generateShortCode, validateShortLink } from '@/models/ShortLink';

/**
 * GET /api/shortlinks
 * List all short links, optionally filtered by affiliateId.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const affiliateId = searchParams.get('affiliateId');

        const db = await getDb();
        const collection = db.collection(SHORTLINKS_COLLECTION);

        const query = affiliateId ? { affiliateId } : {};
        const links = await collection.find(query).sort({ createdAt: -1 }).limit(100).toArray();

        return NextResponse.json({ success: true, data: links });
    } catch (error) {
        console.error('Error fetching short links:', error);
        return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    }
}

/**
 * POST /api/shortlinks
 * Create a new short link.
 * Payload: { affiliateId, campaignId? }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { affiliateId, campaignId } = body;

        const validationError = validateShortLink(body);
        if (validationError) {
            return NextResponse.json({ success: false, error: validationError }, { status: 400 });
        }

        const db = await getDb();
        const collection = db.collection(SHORTLINKS_COLLECTION);

        // Generate unique code
        let code;
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
            code = generateShortCode();
            const existing = await collection.findOne({ code });
            if (!existing) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            return NextResponse.json({ success: false, error: 'Failed to generate unique code' }, { status: 500 });
        }

        // Build full tracking URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        let targetUrl = `${baseUrl}/api/tracking/click?affiliate_id=${affiliateId}`;
        if (campaignId) {
            targetUrl += `&campaign_id=${campaignId}`;
        }

        const shortLink = {
            code,
            affiliateId,
            campaignId: campaignId || null,
            targetUrl,
            clicks: 0,
            createdAt: new Date().toISOString()
        };

        await collection.insertOne(shortLink);

        const shortUrl = `${baseUrl}/s/${code}`;

        return NextResponse.json({
            success: true,
            data: {
                ...shortLink,
                shortUrl
            },
            message: 'Short link created'
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating short link:', error);
        return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    }
}
