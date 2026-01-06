/**
 * API Route Tests for Tracking
 * Tests for /api/tracking/click (GET, POST, PUT)
 */

import { POST, GET, PUT } from '@/app/api/tracking/click/route';
import { detectBot, extractIP, extractReferrer, parseUserAgent } from '@/lib/botDetection';
import { getDb } from '@/lib/db';

// Mock database
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

describe('Tracking API Routes', () => {
  let mockDb;
  let mockClickCollection;
  let mockConversionCollection;
  let mockProfileCollection;

  beforeEach(() => {
    mockClickCollection = {
      insertOne: jest.fn(),
    };

    mockConversionCollection = {
      insertOne: jest.fn(),
      findOne: jest.fn(),
    };

    mockProfileCollection = {
      updateOne: jest.fn(),
    };

    mockDb = {
      collection: jest.fn((name) => {
        if (name === 'click_events') return mockClickCollection;
        if (name === 'conversion_events') return mockConversionCollection;
        return mockProfileCollection;
      }),
      getConnection: jest.fn().mockResolvedValue({
        db: mockDb,
      }),
    };

    getDb.mockResolvedValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/tracking/click', () => {
    const validRequestParams = {
      affiliate_id: 'affiliate123',
      campaign_id: 'campaign123',
    };

    it('should log and track a valid click', async () => {
      const mockRequest = {
        url: 'http://localhost/api/tracking/click?affiliate_id=affiliate123&campaign_id=campaign123',
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'],
          ['referer', 'https://example.com'],
          ['x-forwarded-for', '192.168.1.1'],
        ]),
        json: async () => ({}),
      };

      mockClickCollection.insertOne.mockResolvedValue({
        insertedId: 'click123',
      });
      mockProfileCollection.updateOne.mockResolvedValue({
        upsertedCount: 1,
      });

      const response = await POST(mockRequest);

      expect(mockClickCollection.insertOne).toHaveBeenCalled();
      expect(mockClickCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'click',
          affiliateId: 'affiliate123',
          campaignId: 'campaign123',
          filtered: false,
        })
      );
    });

    it('should filter bot clicks', async () => {
      const mockRequest = {
        url: 'http://localhost/api/tracking/click?affiliate_id=affiliate123&campaign_id=campaign123',
        headers: new Map([
          ['user-agent', 'Googlebot/2.1 (+http://www.google.com/bot.html)'],
          ['referer', 'https://example.com'],
        ]),
        json: async () => ({}),
      };

      mockClickCollection.insertOne.mockResolvedValue({
        insertedId: 'click123',
      });

      const response = await POST(mockRequest);

      expect(mockClickCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          filtered: true,
        })
      );
    });

    it('should return error for missing parameters', async () => {
      const mockRequest = {
        url: 'http://localhost/api/tracking/click',
        headers: new Map(),
        json: async () => ({}),
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required parameters');
    });

    it('should update affiliate stats on valid click', async () => {
      const mockRequest = {
        url: 'http://localhost/api/tracking/click?affiliate_id=affiliate123&campaign_id=campaign123',
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'],
        ]),
        json: async () => ({}),
      };

      mockClickCollection.insertOne.mockResolvedValue({
        insertedId: 'click123',
      });
      mockProfileCollection.updateOne.mockResolvedValue({
        upsertedCount: 1,
      });

      await POST(mockRequest);

      expect(mockProfileCollection.updateOne).toHaveBeenCalledWith(
        { userId: 'affiliate123' },
        expect.objectContaining({
          $inc: { total_clicks: 1 },
        })
      );
    });
  });

  describe('GET /api/tracking/click', () => {
    it('should handle tracking via GET request', async () => {
      const mockRequest = {
        url: 'http://localhost/api/tracking/click?affiliate_id=affiliate123&campaign_id=campaign123',
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'],
        ]),
        json: async () => ({}),
      };

      mockClickCollection.insertOne.mockResolvedValue({
        insertedId: 'click123',
      });

      const response = await GET(mockRequest);

      expect(mockClickCollection.insertOne).toHaveBeenCalled();
    });
  });

  describe('PUT /api/tracking/click (Conversion Tracking)', () => {
    const validConversionData = {
      clickId: 'click123',
      revenueAmount: 2500.00,
      transactionId: 'txn123',
    };

    it('should record a conversion event', async () => {
      const mockRequest = {
        json: async () => validConversionData,
      };

      const mockClickEvent = {
        clickId: 'click123',
        affiliateId: 'affiliate123',
        campaignId: 'campaign123',
        ipAddress: '192.168.1.1',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockClickCollection.findOne.mockResolvedValue(mockClickEvent);
      mockConversionCollection.insertOne.mockResolvedValue({
        insertedId: 'conversion123',
      });

      const response = await PUT(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Conversion recorded');

      expect(mockConversionCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          clickId: 'click123',
          affiliateId: 'affiliate123',
          campaignId: 'campaign123',
          revenueAmount: 2500.00,
          type: 'conversion',
        })
      );
    });

    it('should return error for missing clickId', async () => {
      const mockRequest = {
        json: async () => ({ revenueAmount: 2500.00 }),
      };

      const response = await PUT(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('click_id is required');
    });

    it('should return error for invalid clickId', async () => {
      const mockRequest = {
        json: async () => ({
          clickId: 'nonexistent123',
          revenueAmount: 2500.00,
        }),
      };

      mockClickCollection.findOne.mockResolvedValue(null);

      const response = await PUT(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Click not found');
    });

    it('should copy metadata from original click to conversion', async () => {
      const mockRequest = {
        json: async () => validConversionData,
      };

      const mockClickEvent = {
        clickId: 'click123',
        affiliateId: 'affiliate123',
        campaignId: 'campaign123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        deviceMetadata: {
          browser: 'Chrome',
          os: 'Windows',
          deviceType: 'desktop',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockClickCollection.findOne.mockResolvedValue(mockClickEvent);
      mockConversionCollection.insertOne.mockResolvedValue({
        insertedId: 'conversion123',
      });

      await PUT(mockRequest);

      expect(mockConversionCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          originalClick: expect.objectContaining({
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            deviceMetadata: expect.objectContaining({
              browser: 'Chrome',
              os: 'Windows',
              deviceType: 'desktop',
            }),
          }),
        })
      );
    });
  });
});