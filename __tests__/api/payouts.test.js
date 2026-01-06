/**
 * API Route Tests for Payouts
 * Tests for /api/payouts (GET, POST)
 */

import { GET, POST } from '@/app/api/payouts/route';
import { getDb } from '@/lib/db';
import { PAYOUTS_COLLECTION } from '@/models/Payout';
import { AFFILIATE_PROFILES_COLLECTION } from '@/models/AffiliateProfile';
import { ObjectId } from 'mongodb';

// Mock database
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

describe('Payouts API Routes', () => {
  let mockDb;
  let mockPayoutsCollection;
  let mockProfilesCollection;

  beforeEach(() => {
    mockPayoutsCollection = {
      find: jest.fn(),
      insertOne: jest.fn(),
      sort: jest.fn(() => mockPayoutsCollection),
      limit: jest.fn(() => mockPayoutsCollection),
      toArray: jest.fn(),
    };

    mockProfilesCollection = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
    };

    mockDb = {
      collection: jest.fn((name) => {
        if (name === PAYOUTS_COLLECTION) return mockPayoutsCollection;
        if (name === AFFILIATE_PROFILES_COLLECTION) return mockProfilesCollection;
        return mockProfilesCollection;
      }),
    };

    getDb.mockResolvedValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/payouts', () => {
    const payoutId = '507f1f77bcf86cd799439011';
    
    it('should fetch all payouts', async () => {
      const mockPayouts = [
        {
          _id: payoutId,
          affiliateId: 'affiliate123',
          amount: 5000.00,
          status: 'completed',
          currency: 'INR',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          _id: '507f1f77bcf86cd799439012',
          affiliateId: 'affiliate456',
          amount: 7500.00,
          status: 'pending',
          currency: 'INR',
          createdAt: '2024-01-15T00:00:00.000Z',
        },
      ];

      mockPayoutsCollection.find.mockReturnThis();
      mockPayoutsCollection.sort.mockReturnThis();
      mockPayoutsCollection.limit.mockReturnThis();
      mockPayoutsCollection.toArray.mockResolvedValue(mockPayouts);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(2);
    });

    it('should filter payouts by affiliateId', async () => {
      const affiliateId = 'affiliate123';
      const mockPayouts = [
        {
          _id: payoutId,
          affiliateId: affiliateId,
          amount: 5000.00,
          status: 'completed',
        },
      ];

      const url = new URL(`http://localhost/api/payouts?affiliateId=${affiliateId}`);
      const mockRequest = { url };

      mockPayoutsCollection.find.mockReturnThis();
      mockPayoutsCollection.sort.mockReturnThis();
      mockPayoutsCollection.limit.mockReturnThis();
      mockPayoutsCollection.toArray.mockResolvedValue(mockPayouts);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPayoutsCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({ affiliateId })
      );
    });

    it('should filter payouts by status', async () => {
      const mockPayouts = [
        {
          _id: payoutId,
          affiliateId: 'affiliate123',
          amount: 5000.00,
          status: 'completed',
        },
      ];

      const url = new URL('http://localhost/api/payouts?status=completed');
      const mockRequest = { url };

      mockPayoutsCollection.find.mockReturnThis();
      mockPayoutsCollection.sort.mockReturnThis();
      mockPayoutsCollection.limit.mockReturnThis();
      mockPayoutsCollection.toArray.mockResolvedValue(mockPayouts);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPayoutsCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' })
      );
    });

    it('should handle empty results', async () => {
      const url = new URL('http://localhost/api/payouts');
      const mockRequest = { url };

      mockPayoutsCollection.find.mockReturnThis();
      mockPayoutsCollection.sort.mockReturnThis();
      mockPayoutsCollection.limit.mockReturnThis();
      mockPayoutsCollection.toArray.mockResolvedValue([]);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(0);
    });
  });

  describe('POST /api/payouts', () => {
    const validPayoutData = {
      affiliateId: '507f1f77bcf86cd799439011',
      amount: 2500.00,
      method: 'bank_transfer',
      transactionId: 'TXN123456789',
      notes: 'Monthly payout',
    };

    it('should create a successful payout', async () => {
      const mockProfile = {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        userId: new ObjectId('507f1f77bcf86cd799439011'),
        pending_payouts: 5000.00,
        total_paid: 0,
      };

      const mockRequest = {
        json: async () => validPayoutData,
      };

      mockProfilesCollection.findOne.mockResolvedValue(mockProfile);
      mockPayoutsCollection.insertOne.mockResolvedValue({
        insertedId: 'payout123',
      });
      mockProfilesCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.amount).toBe(2500.00);
      expect(data.data.status).toBe('completed');
      
      // Verify affiliate profile was updated
      expect(mockProfilesCollection.updateOne).toHaveBeenCalledWith(
        { _id: mockProfile._id },
        expect.objectContaining({
          $set: expect.objectContaining({
            last_payout_date: expect.any(String),
          }),
          $inc: expect.objectContaining({
            pending_payouts: -2500.00,
            total_paid: 2500.00,
          }),
        })
      );
    });

    it('should return error for insufficient balance', async () => {
      const mockProfile = {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        userId: new ObjectId('507f1f77bcf86cd799439011'),
        pending_payouts: 1000.00, // Less than requested amount
        total_paid: 0,
      };

      const mockRequest = {
        json: async () => ({
          ...validPayoutData,
          amount: 2500.00,
        }),
      };

      mockProfilesCollection.findOne.mockResolvedValue(mockProfile);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Insufficient pending balance');
    });

    it('should return error for non-existent affiliate', async () => {
      const mockRequest = {
        json: async () => validPayoutData,
      };

      mockProfilesCollection.findOne.mockResolvedValue(null);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Affiliate not found');
    });

    it('should return error for invalid amount', async () => {
      const invalidData = {
        affiliateId: '507f1f77bcf86cd799439011',
        amount: -100.00, // Negative amount
      };

      const mockRequest = {
        json: async () => invalidData,
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Valid amount is required');
    });

    it('should return error for missing affiliateId', async () => {
      const invalidData = {
        amount: 1000.00,
        method: 'bank_transfer',
      };

      const mockRequest = {
        json: async () => invalidData,
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Affiliate ID is required');
    });
  });
});