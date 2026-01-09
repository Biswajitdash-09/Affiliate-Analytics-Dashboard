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

            case 'performance':
                // Daily Performance Aggregation
                const [clickDaily, revenueDaily] = await Promise.all([
                    db.collection(CLICK_EVENTS_COLLECTION).aggregate([
                        {
                            $match: {
                                createdAt: { $gte: dateFilter.$gte || new Date(0).toISOString(), $lte: dateFilter.$lte || new Date().toISOString() },
                                filtered: false
                            }
                        },
                        {
                            $addFields: {
                                dateObj: { $toDate: "$createdAt" }
                            }
                        },
                        {
                            $group: {
                                _id: {
                                    $dateToString: { format: "%Y-%m-%d", date: "$dateObj" }
                                },
                                clicks: { $sum: 1 }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ]).toArray(),
                    db.collection(REVENUES_COLLECTION).aggregate([
                        {
                            $match: {
                                createdAt: { $gte: dateFilter.$gte || new Date(0).toISOString(), $lte: dateFilter.$lte || new Date().toISOString() },
                                status: 'succeeded'
                            }
                        },
                        {
                            $addFields: {
                                dateObj: { $toDate: "$createdAt" }
                            }
                        },
                        {
                            $group: {
                                _id: {
                                    $dateToString: { format: "%Y-%m-%d", date: "$dateObj" }
                                },
                                conversions: { $sum: 1 },
                                revenue: { $sum: "$amount" }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ]).toArray()
                ]);

                // Merge Data
                const allPerformanceDates = new Set([
                    ...clickDaily.map(d => d._id),
                    ...revenueDaily.map(d => d._id)
                ]);

                headers = ['Date', 'Clicks', 'Conversions', 'Revenue', 'Conversion Rate'];
                data = Array.from(allPerformanceDates).sort().map(date => {
                    const c = clickDaily.find(d => d._id === date) || { clicks: 0 };
                    const r = revenueDaily.find(d => d._id === date) || { conversions: 0, revenue: 0 };
                    const rate = c.clicks > 0 ? ((r.conversions / c.clicks) * 100).toFixed(2) + '%' : '0.00%';
                    return {
                        Date: date,
                        Clicks: c.clicks,
                        Conversions: r.conversions,
                        Revenue: r.revenue.toFixed(2),
                        'Conversion Rate': rate
                    };
                });
                filename = `performance_report_${new Date().toISOString().split('T')[0]}`;
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
            // Generate Modern PDF Report
            const doc = new PDFDocument({
                margin: 50,
                size: 'A4',
                bufferPages: true
            });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));

            // Brand Colors
            const primaryColor = '#6366f1'; // Indigo
            const darkColor = '#1e293b'; // Slate 800
            const lightGray = '#f1f5f9'; // Slate 100
            const mediumGray = '#64748b'; // Slate 500

            // Header Bar
            doc.rect(0, 0, doc.page.width, 80).fill(primaryColor);

            // Logo / Brand Text
            doc.fillColor('#ffffff')
                .fontSize(24)
                .font('Helvetica-Bold')
                .text('AffiliatePro', 50, 25);

            doc.fontSize(10)
                .font('Helvetica')
                .text('Performance Analytics Report', 50, 52);

            // Report Title (below header)
            doc.fillColor(darkColor)
                .fontSize(20)
                .font('Helvetica-Bold')
                .text(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Report`, 50, 110);

            // Subtitle / Meta
            doc.fillColor(mediumGray)
                .fontSize(10)
                .font('Helvetica')
                .text(`Generated: ${new Date().toLocaleString()}`, 50, 138);

            if (startDate || endDate) {
                doc.text(`Date Range: ${startDate || 'Start'} to ${endDate || 'Now'}`, 50, 152);
            }

            doc.moveDown(4);

            // Summary Cards (for performance reports)
            if (dataType === 'performance' && data.length > 0) {
                const totalClicks = data.reduce((sum, d) => sum + (d.Clicks || 0), 0);
                const totalConversions = data.reduce((sum, d) => sum + (d.Conversions || 0), 0);
                const totalRevenue = data.reduce((sum, d) => sum + parseFloat(d.Revenue || 0), 0);

                const cardY = doc.y;
                const cardWidth = 150;
                const cardHeight = 60;
                const cardGap = 20;

                // Card 1: Total Clicks
                doc.rect(50, cardY, cardWidth, cardHeight).fill(lightGray);
                doc.fillColor(mediumGray).fontSize(9).text('TOTAL CLICKS', 60, cardY + 10);
                doc.fillColor(darkColor).fontSize(18).font('Helvetica-Bold').text(totalClicks.toLocaleString(), 60, cardY + 28);

                // Card 2: Conversions
                doc.rect(50 + cardWidth + cardGap, cardY, cardWidth, cardHeight).fill(lightGray);
                doc.fillColor(mediumGray).fontSize(9).font('Helvetica').text('CONVERSIONS', 60 + cardWidth + cardGap, cardY + 10);
                doc.fillColor(darkColor).fontSize(18).font('Helvetica-Bold').text(totalConversions.toLocaleString(), 60 + cardWidth + cardGap, cardY + 28);

                // Card 3: Revenue
                doc.rect(50 + 2 * (cardWidth + cardGap), cardY, cardWidth, cardHeight).fill(lightGray);
                doc.fillColor(mediumGray).fontSize(9).font('Helvetica').text('TOTAL REVENUE', 60 + 2 * (cardWidth + cardGap), cardY + 10);
                doc.fillColor(darkColor).fontSize(18).font('Helvetica-Bold').text(`INR ${totalRevenue.toFixed(2)}`, 60 + 2 * (cardWidth + cardGap), cardY + 28);

                doc.y = cardY + cardHeight + 30;
            }

            // Table Header
            doc.font('Helvetica');
            const tableTop = doc.y;
            const tableWidth = doc.page.width - 100;
            const colWidth = tableWidth / headers.length;

            // Header Row Background
            doc.rect(50, tableTop, tableWidth, 25).fill(darkColor);

            // Header Text
            let x = 55;
            doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
            headers.forEach(h => {
                doc.text(h.toUpperCase(), x, tableTop + 8, { width: colWidth - 10 });
                x += colWidth;
            });

            doc.y = tableTop + 30;

            // Data Rows
            const pdfData = data.slice(0, 50);
            let rowIndex = 0;

            for (const row of pdfData) {
                const rowY = doc.y;

                // Alternating row background
                if (rowIndex % 2 === 0) {
                    doc.rect(50, rowY - 3, tableWidth, 20).fill(lightGray);
                }

                // Check for page break
                if (rowY > doc.page.height - 80) {
                    doc.addPage();
                    doc.y = 50;
                }

                let x = 55;
                const currentRowY = doc.y;
                doc.fillColor(darkColor).fontSize(8).font('Helvetica');
                headers.forEach((h, colIndex) => {
                    const text = String(row[h] || '');
                    doc.text(text, x, currentRowY, { width: colWidth - 10, lineBreak: false });
                    x += colWidth;
                });

                doc.y = rowY + 18;
                rowIndex++;
            }

            if (data.length > 50) {
                doc.moveDown();
                doc.fillColor(mediumGray).fontSize(9)
                    .text(`... and ${data.length - 50} more rows. Download CSV for full data.`, 50);
            }

            // Footer
            const pageCount = doc.bufferedPageRange().count;
            for (let i = 0; i < pageCount; i++) {
                doc.switchToPage(i);
                doc.fillColor(mediumGray).fontSize(8)
                    .text(
                        `Page ${i + 1} of ${pageCount} | AffiliatePro © ${new Date().getFullYear()}`,
                        50,
                        doc.page.height - 30,
                        { align: 'center', width: doc.page.width - 100 }
                    );
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
