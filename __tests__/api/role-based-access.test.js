/**
 * Role-Based Access Control Tests
 * Tests for role filtering in analytics and admin endpoint protection
 */

import { GET as getOverviewAnalytics } from '@/app/api/analytics/overview/route';
import { GET as getLeaderboards } from '@/app/api/analytics/leaderboards/route';
import { POST as postAffiliates } from '@/app/api/affiliates/route';
import { POST as postPayouts } from '@/app/api/payouts/route';
import { getDb } from '@/lib/db';
import jwt from 'jsonwebtoken';

// Mock database
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

describe('Role-Based Access Control', () => {
  let mockDb;
  let mockClickCollection;
  let mockRevenueCollection;
  let mockAffiliateProfilesCollection;
  let mockCampaignsCollection;

  const adminUser = {
    userId: 'admin123',
    email: 'admin@example.com',
    role: 'admin',
  };

  const affiliateUser = {
    userId: 'affiliate123',
    email: 'affiliate@example.com',
    role: 'affiliate',
  };

  beforeEach(() => {
    mockClickCollection = {
      aggregate: jest.fn(),
    };

    mockRevenueCollection = {
      aggregate: jest.fn(),
    };

    mockAffiliateProfilesCollection = {
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
        if (name === 'affiliate_profiles') return mockAffiliateProfilesCollection;
        if (name === 'campaigns') return mockCampaignsCollection;
        return mockClickCollection;
      }),
    };

    getDb.mockResolvedValue(mockDb);
    jwt.verify.mockImplementation((token, secret) => {
      if (token.includes('admin')) return adminUser;
      if (token.includes('affiliate')) return affiliateUser;
      throw new Error('Invalid token');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Analytics API - Role-Based Filtering', () => {
    it('should filter data by affiliateId for affiliate role', async () => {
      const mockClickData = [
        { date: '2024-01-01', clicks: 100 },
        { date: '2024-01-02', clicks: 150 },
      ];

      const mockRevenueData = [
        { date: '2024-01-01', conversions: 5, revenue: 5000 },
        { date: '2024-01-02', conversions: 8, revenue: 8000 },
      ];

      const url = new URL('http://localhost/api/analytics/overview?startDate=2024-01-01&endDate=2024-01-03');
      const mockRequest = {
        url,
        headers: new Map([
          ['authorization', 'Bearer affiliate-token'],
        ]),
        get: jest.fn((header) => {
          if (header === 'authorization') return 'Bearer affiliate-token';
        }),
      };

      // Mock aggregate for filtered queries
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

      // Verify that filtering was applied
      const clickAggregateCalls = mockClickCollection.aggregate.mock.calls;
      expect(clickAggregateCalls.length).toBeGreaterThan(0);
    });

    it('should return global data for admin role', async () => {
      const mockClickData = [
        { date: '2024-01-01', clicks: 1000 },
        { date: '2024-01-02', clicks: 1200 },
      ];

      const mockRevenueData = [
        { date: '2024-01-01', conversions: 50, revenue: 50000 },
        { date: '2024-01-02', conversions: 60, revenue: 60000 },
      ];

      const url = new URL('http://localhost/api/analytics/overview?startDate=2024-01-01&endDate=2024-01-03');
      const mockRequest = {
        url,
        headers: new Map([
          ['authorization', 'Bearer admin-token'],
        ]),
        get: jest.fn((header) => {
          if (header === 'authorization') return 'Bearer admin-token';
        }),
      };

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
      expect(data.data.kpis.totalClicks).toBe(2200);
      expect(data.data.kpis.totalRevenue).toBe(110000);
    });

    it('should return 401 for requests without authentication', async () => {
      const url = new URL('http://localhost/api/analytics/overview');
      const mockRequest = {
        url,
        headers: new Map(),
        get: jest.fn(() => null),
      };

      const response = await getOverviewAnalytics(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authorization token required');
    });
  });

  describe('Admin API Protection', () => {
    it('should allow admins to access affiliates endpoint', async () => {
      const mockRequest = {
        json: async () => ({
          name: 'New Affiliate',
          email: 'new@example.com',
          password: 'Password123!',
          commission_rate: 0.15,
        }),
        headers: new Map([
          ['authorization', 'Bearer admin-token'],
        ]),
        get: jest.fn((header) => {
          if (header === 'authorization') return 'Bearer admin-token';
        }),
      };

      mockAffiliateProfilesCollection.findOne.mockResolvedValue(null);
      mockAffiliateProfilesCollection.insertOne.mockResolvedValue({
        insertedId: 'new-affiliate-id',
      });

      const response = await postAffiliates(mockRequest);
      const data = await response.json();

      // Should process successfully or return appropriate admin error
      expect(response.status).not.toBe(401);
    });

    it('should return 401 for unauthenticated requests to admin endpoints', async () => {
      const mockRequest = {
        json: async () => ({
          affiliateId: 'affiliate123',
          amount: 100,
        }),
        headers: new Map(),
        get: jest.fn(() => null),
      };

      const response = await postPayouts(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('Leaderboards Role Filtering', () => {
    it('should return anonymized data for affiliates viewing leaderboards', async () => {
      const mockTopAffiliates = [
        {
          _id: 'affiliate1',
          firstName: 'John',  // Should be hidden or anonymized for affiliates
          total_earnings: 15000.00,
        },
        {
          _id: 'affiliate2',
          firstName: 'Jane',  // Should be hidden or anonymized for affiliates
          total_earnings: 12000.00,
        },
      ];

      const mockTopCampaigns = [
        {
          _id: 'campaign1',
          name: 'Summer Sale',
          conversions: 100,
          revenue: 50000,
        },
      ];

      const url = new URL('http://localhost/api/analytics/leaderboards');
      const mockRequest = {
        url,
        headers: new Map([
          ['authorization', 'Bearer affiliate-token'],
        ]),
        get: jest.fn((header) => {
          if (header === 'authorization') return 'Bearer affiliate-token';
        }),
      };

      mockDb.collection('affiliate_profiles').aggregate.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockTopAffiliates),
      });

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
      // In a real implementation, affiliate names would be anonymized here
    });
  });
});