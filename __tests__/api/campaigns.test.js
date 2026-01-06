/**
 * API Route Tests for Campaigns
 * Tests for /api/campaigns (GET, POST)
 */

import { GET, POST } from '@/app/api/campaigns/route';
import { getDb } from '@/lib/db';
import { CAMPAIGNS_COLLECTION } from '@/models/Campaign';

// Mock database
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

describe('Campaigns API Routes', () => {
  let mockDb;
  let mockCollection;

  beforeEach(() => {
    mockCollection = {
      find: jest.fn(),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      countDocuments: jest.fn(),
      sort: jest.fn(() => mockCollection),
      toArray: jest.fn(),
    };

    mockDb = {
      collection: jest.fn((name) => {
        if (name === CAMPAIGNS_COLLECTION) return mockCollection;
        return mockCollection;
      }),
    };

    getDb.mockResolvedValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/campaigns', () => {
    it('should fetch all campaigns', async () => {
      const mockCampaigns = [
        {
          _id: 'campaign123',
          name: 'Summer Sale',
          url: 'https://example.com/summer',
          payout_rules: { type: 'CPA', amount: 100 },
          status: 'active',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          _id: 'campaign456',
          name: 'Winter Sale',
          url: 'https://example.com/winter',
          payout_rules: { type: 'RevShare', percentage: 15 },
          status: 'paused',
          createdAt: '2024-01-15T00:00:00.000Z',
        },
      ];

      mockCollection.find.mockReturnThis();
      mockCollection.sort.mockReturnThis();
      mockCollection.toArray.mockResolvedValue(mockCampaigns);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(2);
      expect(data.data[0].name).toBe('Summer Sale');
    });

    it('should handle empty campaigns list', async () => {
      mockCollection.find.mockReturnThis();
      mockCollection.sort.mockReturnThis();
      mockCollection.toArray.mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(0);
    });
  });

  describe('POST /api/campaigns', () => {
    const validCampaignData = {
      name: 'New Campaign',
      url: 'https://example.com/new-campaign',
      payout_rules: { type: 'CPA', amount: 250 },
      status: 'active',
    };

    it('should create a new campaign', async () => {
      const mockRequest = {
        json: async () => validCampaignData,
      };

      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockResolvedValue({
        insertedId: 'campaign789',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New Campaign');
      expect(data.data._id).toBeDefined();
    });

    it('should return error for duplicate campaign name', async () => {
      const mockRequest = {
        json: async () => validCampaignData,
      };

      mockCollection.findOne.mockResolvedValue({
        name: 'New Campaign',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already exists');
    });

    it('should return error for missing campaign name', async () => {
      const invalidData = {
        url: 'https://example.com',
        payout_rules: { type: 'CPA', amount: 100 },
      };

      const mockRequest = {
        json: async () => invalidData,
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Campaign name is required');
    });

    it('should return error for missing campaign URL', async () => {
      const invalidData = {
        name: 'Test Campaign',
        payout_rules: { type: 'CPA', amount: 100 },
      };

      const mockRequest = {
        json: async () => invalidData,
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Campaign URL is required');
    });

    it('should return error for missing payout rules', async () => {
      const invalidData = {
        name: 'Test Campaign',
        url: 'https://example.com',
      };

      const mockRequest = {
        json: async () => invalidData,
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Payout rules are required');
    });

    it('should set default status when not provided', async () => {
      const dataWithoutStatus = {
        name: 'Auto Status Campaign',
        url: 'https://example.com/auto',
        payout_rules: { type: 'RevShare', percentage: 10 },
      };

      const mockRequest = {
        json: async () => dataWithoutStatus,
      };

      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockResolvedValue({
        insertedId: 'campaign999',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('active');
    });
  });
});