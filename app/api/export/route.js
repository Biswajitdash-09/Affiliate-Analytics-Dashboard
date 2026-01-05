import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import PDFDocument from 'pdfkit/js/pdfkit.standalone';

const CLICK_EVENTS_COLLECTION = 'click_events';
const REVENUES_COLLECTION = 'revenues';
const PAYOUTS_COLLECTION = 'payouts';

/**
 * GET /api/export
 * Export data as CSV or PDF.
 * Query params:
 *  - type: 'csv' | 'pdf'
 *  - data: 'analytics' | 'revenues' | 'payouts'
 *  - startDate, endDate (ISO strings)
 *  - affiliateId (optional filter)
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'csv';
        const dataType = searchParams.get('data') || 'analytics';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const affiliateId = searchParams.get('affiliateId');

        const db = await getDb();
        let data = [];
        let filename = '';
        let headers = [];

        // Build date filter
        const dateFilter = {};
        if (startDate) dateFilter.$gte = startDate;
        if (endDate) dateFilter.$lte = endDate;

        // Fetch data based on type
        switch (dataType) {
            case 'analytics':
                const clicks = await db.collection(CLICK_EVENTS_COLLECTION)
                    .find(startDate || endDate ? { createdAt: dateFilter } : {})
                    .sort({ createdAt: -1 })
                    .limit(1000)
                    .toArray();

                headers = ['Date', 'Click ID', 'Affiliate ID', 'Campaign ID', 'IP', 'Converted'];
                data = clicks.map(c => ({
                    Date: c.createdAt,
                    'Click ID': c.clickId,
                    'Affiliate ID': c.affiliateId,
                    'Campaign ID': c.campaignId || '',
                    IP: c.ipAddress || '',
                    Converted: c.converted ? 'Yes' : 'No'
                }));
                filename = `analytics_export_${new Date().toISOString().split('T')[0]}`;
                break;

            case 'revenues':
                const query = {};
                if (affiliateId) query.affiliateId = affiliateId;
                if (startDate || endDate) query.createdAt = dateFilter;

                const revenues = await db.collection(REVENUES_COLLECTION)
                    .find(query)
                    .sort({ createdAt: -1 })
                    .limit(500)
                    .toArray();

                headers = ['Date', 'Amount', 'Commission', 'Currency', 'Status', 'Affiliate ID'];
                data = revenues.map(r => ({
                    Date: r.createdAt,
                    Amount: r.amount,
                    Commission: r.commissionAmount || 0,
                    Currency: r.currency || 'INR',
                    Status: r.status,
                    'Affiliate ID': r.affiliateId
                }));
                filename = `revenues_export_${new Date().toISOString().split('T')[0]}`;
                break;

            case 'payouts':
                const payoutQuery = affiliateId ? { affiliateId } : {};
                const payouts = await db.collection(PAYOUTS_COLLECTION)
                    .find(payoutQuery)
                    .sort({ createdAt: -1 })
                    .limit(500)
                    .toArray();

                headers = ['Date', 'Amount', 'Method', 'Status', 'Transaction ID', 'Affiliate ID'];
                data = payouts.map(p => ({
                    Date: p.createdAt,
                    Amount: p.amount,
                    Method: p.method || '',
                    Status: p.status,
                    'Transaction ID': p.transactionId || '',
                    'Affiliate ID': p.affiliateId
                }));
                filename = `payouts_export_${new Date().toISOString().split('T')[0]}`;
                break;

            default:
                return NextResponse.json({ success: false, error: 'Invalid data type' }, { status: 400 });
        }

        // Generate output based on format
        if (type === 'csv') {
            // Generate CSV
            const csvRows = [headers.join(',')];
            for (const row of data) {
                const values = headers.map(h => {
                    const val = row[h];
                    // Escape commas and quotes
                    if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                        return `"${val.replace(/"/g, '""')}"`;
                    }
                    return val;
                });
                csvRows.push(values.join(','));
            }
            const csvContent = csvRows.join('\n');

            return new NextResponse(csvContent, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="${filename}.csv"`
                }
            });
        } else if (type === 'pdf') {
            // Generate PDF
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));

            // Title
            doc.fontSize(18).text(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Report`, { align: 'center' });
            doc.moveDown();
            doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
            doc.moveDown(2);

            // Simple table
            doc.fontSize(8);
            const colWidth = 480 / headers.length;

            // Header row
            let x = 50;
            headers.forEach(h => {
                doc.text(h, x, doc.y, { width: colWidth, continued: false });
                x += colWidth;
            });
            doc.moveDown();

            // Data rows (limit for PDF)
            // Data rows (limit for PDF)
            const pdfData = data.slice(0, 50);
            for (const row of pdfData) {
                let x = 50;
                const y = doc.y; // Start Y for this row
                let maxRowHeight = 0;

                // First pass: Calculate max height for the row
                headers.forEach(h => {
                    const text = String(row[h] || '');
                    const height = doc.heightOfString(text, { width: colWidth - 5 });
                    if (height > maxRowHeight) maxRowHeight = height;
                });

                // Check if we need a new page
                if (y + maxRowHeight > doc.page.height - 50) {
                    doc.addPage();
                    // Reprint headers ? Optional, but good for UX. for now just reset y
                    // simplified for brevity
                }

                // Second pass: valid Y might have changed if added page
                const currentY = doc.y;

                headers.forEach(h => {
                    const text = String(row[h] || '');
                    doc.text(text, x, currentY, { width: colWidth - 5 });
                    x += colWidth;
                });

                // Move down by max height + padding
                doc.y = currentY + maxRowHeight + 10;
            }

            if (data.length > 50) {
                doc.moveDown();
                doc.text(`... and ${data.length - 50} more rows. Download CSV for full data.`);
            }

            doc.end();

            // Wait for PDF to finish
            await new Promise(resolve => doc.on('end', resolve));
            const pdfBuffer = Buffer.concat(chunks);

            return new NextResponse(pdfBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${filename}.pdf"`
                }
            });
        }

        return NextResponse.json({ success: false, error: 'Invalid export type' }, { status: 400 });

    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ success: false, error: 'Export failed' }, { status: 500 });
    }
}
