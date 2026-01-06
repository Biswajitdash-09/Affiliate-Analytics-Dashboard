/**
 * API Route Tests for Analytics
 * Tests for /api/analytics/overview and /api/analytics/leaderboards
 */

import { GET as getOverviewAnalytics } from '@/app/api/analytics/overview/route';
import { GET as getLeaderboards } from '@/app/api/analytics/leaderboards/route';
import { getDb } from '@/lib/db';

// Mock database
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

describe('Analytics API Routes', () => {
  let mockDb;
  let mockClickCollection;
  let mockRevenueCollection;
  let mockCampaignsCollection;

  beforeEach(() => {
    mockClickCollection = {
      aggregate: jest.fn(),
      countDocuments: jest.fn(),
    };

    mockRevenueCollection = {
      aggregate: jest.fn(),
    };

    mockCampaignsCollection = {
      find: jest.fn(),
      aggregate: jest.fn(),
    };

    mockDb = {
      collection: jest.fn((name) => {
        if (name === 'click_events') return mockClickCollection;
        if (name === 'revenues') return mockRevenueCollection;
        if (name === 'campaigns') return mockCampaignsCollection;
        return mockClickCollection;
      }),
    };

    getDb.mockResolvedValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/analytics/overview', () => {
    it('should return analytics overview with KPIs and chart data', async () => {
      const mockClickData = [
        { date: '2024-01-01', clicks: 150 },
        { date: '2024-01-02', clicks: 200 },
        { date: '2024-01-03', clicks: 180 },
      ];

      const mockRevenueData = [
        { date: '2024-01-01', conversions: 5, revenue: 2500 },
        { date: '2024-01-02', conversions: 8, revenue: 4000 },
        { date: '2024-01-03', conversions: 6, revenue: 3000 },
      ];

      const url = new URL('http://localhost/api/analytics/overview?startDate=2024-01-01&endDate=2024-01-03');
      const mockRequest = { url };

      mockClickCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockClickData),
      });

      mockRevenueCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockRevenueData),
      });

      // Mock recent activity queries
      mockClickCollection.aggregate.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      });

      mockRevenueCollection.aggregate.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      });

      const response = await getOverviewAnalytics(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.kpis).toBeDefined();
      expect(data.data.kpis.totalClicks).toBe(530);
      expect(data.data.kpis.totalConversions).toBe(19);
      expect(data.data.kpis.totalRevenue).toBe(9500);
      expect(data.data.chartData).toBeDefined();
      expect(Array.isArray(data.data.chartData)).toBe(true);
      expect(data.data.chartData.length).toBeGreaterThan(0);
    });

    it('should return data for last 30 days when no date range provided', async () => {
      const mockClickData = [{ date: '2024-01-01', clicks: 100 }];
      const mockRevenueData = [{ date: '2024-01-01', conversions: 3, revenue: 1500 }];

      const url = new URL('http://localhost/api/analytics/overview');
      const mockRequest = { url };

      mockClickCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockClickData),
      });

      mockRevenueCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockRevenueData),
      });

      mockClickCollection.aggregate.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      });

      mockRevenueCollection.aggregate.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      });

      const response = await getOverviewAnalytics(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle empty data gracefully', async () => {
      const url = new URL('http://localhost/api/analytics/overview?startDate=2024-01-01&endDate=2024-01-03');
      const mockRequest = { url };

      mockClickCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      mockRevenueCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      mockClickCollection.aggregate.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      });

      mockRevenueCollection.aggregate.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      });

      const response = await getOverviewAnalytics(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.kpis.totalClicks).toBe(0);
      expect(data.data.kpis.totalConversions).toBe(0);
      expect(data.data.kpis.totalRevenue).toBe(0);
    });
  });

  describe('GET /api/analytics/leaderboards', () => {
    it('should return top affiliates and campaigns', async () => {
      const mockTopAffiliates = [
        {
          _id: 'affiliate1',
          name: 'Top Performer',
          total_earnings: 15000.00,
          total_clicks: 1000,
        },
        {
          _id: 'affiliate2',
          name: 'Second Place',
          total_earnings: 12000.00,
          total_clicks: 800,
        },
      ];

      const mockTopCampaigns = [
        {
          _id: 'campaign1',
          name: 'Summer Sale',
          clicks: 5000,
          conversions: 100,
        },
        {
          _id: 'campaign2',
          name: 'Winter Campaign',
          clicks: 4000,
          conversions: 80,
        },
      ];

      const url = new URL('http://localhost/api/analytics/leaderboards');
      const mockRequest = { url };

      // Mock affiliate profile aggregation
      const mockAffiliatePipeline = mockDb.collection('affiliate_profiles').aggregate.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockTopAffiliates),
      });

      // Mock campaign aggregation
      mockCampaignsCollection.aggregate.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockTopCampaigns),
      });

      const response = await getLeaderboards(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.topAffiliates).toBeDefined();
      expect(data.data.topCampaigns).toBeDefined();
      expect(Array.isArray(data.data.topAffiliates)).toBe(true);
      expect(Array.isArray(data.data.topCampaigns)).toBe(true);
      expect(data.data.topAffiliates.length).toBeGreaterThan(0);
      expect(data.data.topCampaigns.length).toBeGreaterThan(0);
    });

    it('should handle empty leaderboards', async () => {
      const url = new URL('http://localhost/api/analytics/leaderboards');
      const mockRequest = { url };

      mockDb.collection('affiliate_profiles').aggregate.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      });

      mockCampaignsCollection.aggregate.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      });

      const response = await getLeaderboards(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.topAffiliates).toHaveLength(0);
      expect(data.data.topCampaigns).toHaveLength(0);
    });
  });
});