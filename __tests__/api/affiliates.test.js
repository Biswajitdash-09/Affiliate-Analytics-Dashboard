/**
 * API Route Tests for Affiliates
 * Tests for /api/affiliates (GET, POST, PUT)
 */

import { GET, POST, PUT } from '@/app/api/affiliates/route';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { USERS_COLLECTION } from '@/models/User';
import { AFFILIATE_PROFILES_COLLECTION } from '@/models/AffiliateProfile';

// Mock database
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

// Mock bcrypt
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(() => ({
    _id: '507f1f77bcf86cd799439011',
    role: 'admin',
    email: 'admin@example.com'
  })),
}));

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
}));

// Helper to create mock request with headers
const createMockRequest = (body, role = 'admin') => ({
  json: async () => body,
  headers: {
    get: (key) => {
      if (key === 'authorization') {
        if (role === 'admin') return 'Bearer mock_admin_token';
        if (role === 'affiliate') return 'Bearer mock_affiliate_token';
      }
      return null;
    }
  }
});

jest.mock('@/lib/auth', () => {
  const mockAdminUser = {
    _id: '507f1f77bcf86cd799439011',
    role: 'admin',
    email: 'admin@example.com'
  };
  const mockAffiliateUser = {
    _id: '507f1f77bcf86cd799439012',
    role: 'affiliate',
    email: 'affiliate@example.com'
  };

  return {
    __esModule: true,
    verifyAuth: jest.fn((req) => {
      const token = req.headers.get('authorization')?.split(' ')[1];
      if (token === 'mock_admin_token') {
        return { success: true, user: mockAdminUser };
      }
      if (token === 'mock_affiliate_token') {
        return { success: true, user: mockAffiliateUser };
      }
      return { success: false, error: 'Unauthorized' };
    }),
    requireAdmin: jest.fn((req) => {
      const token = req.headers.get('authorization')?.split(' ')[1];
      if (token === 'mock_admin_token') {
        return null; // No error, admin
      }
      return { status: 403, json: () => ({ success: false, error: 'Forbidden' }) };
    }),
    getAuthUser: jest.fn((req) => {
      const token = req.headers.get('authorization')?.split(' ')[1];
      if (token === 'mock_admin_token') {
        return mockAdminUser;
      }
      if (token === 'mock_affiliate_token') {
        return mockAffiliateUser;
      }
      return null;
    }),
    default: {
      verifyAuth: jest.fn((req) => {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (token === 'mock_admin_token') {
          return { success: true, user: mockAdminUser };
        }
        if (token === 'mock_affiliate_token') {
          return { success: true, user: mockAffiliateUser };
        }
        return { success: false, error: 'Unauthorized' };
      }),
      requireAdmin: jest.fn((req) => {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (token === 'mock_admin_token') {
          return null; // No error, admin
        }
        return { status: 403, json: () => ({ success: false, error: 'Forbidden' }) };
      }),
      getAuthUser: jest.fn((req) => {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (token === 'mock_admin_token') {
          return mockAdminUser;
        }
        if (token === 'mock_affiliate_token') {
          return mockAffiliateUser;
        }
        return null;
      }),
    }
  };
});

describe('Affiliates API Routes', () => {
  let mockDb;
  let mockUsersCollection;
  let mockProfilesCollection;

  beforeEach(() => {
    mockUsersCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
    };

    mockProfilesCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      aggregate: jest.fn(),
    };

    mockDb = {
      collection: jest.fn((name) => {
        if (name === USERS_COLLECTION) return mockUsersCollection;
        if (name === AFFILIATE_PROFILES_COLLECTION) return mockProfilesCollection;
        return mockProfilesCollection;
      }),
    };

    getDb.mockResolvedValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/affiliates', () => {
    it('should fetch all affiliates with user data', async () => {
      const mockAggregationPipeline = [
        {
          user: {
            _id: '507f1f77bcf86cd799439011',
            name: 'Test Affiliate',
            email: 'test@example.com',
            role: 'affiliate',
          },
          _id: 'profile123',
          commission_rate: 0.10,
          status: 'active',
          total_earnings: 1500.50,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockProfilesCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockAggregationPipeline),
      });

      const response = await GET(createMockRequest({}));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.data[0].user).toBeDefined();
    });

    it('should handle empty results', async () => {
      mockProfilesCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      const response = await GET(createMockRequest({}));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(0);
    });
  });

  describe('POST /api/affiliates', () => {
    const validProfileData = {
      userId: '507f1f77bcf86cd799439011',
      status: 'active',
      commission_rate: 0.10,
    };

    it('should create affiliate profile for existing user', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test User',
        email: 'test@example.com',
        role: 'affiliate',
      };

      const mockRequest = createMockRequest(validProfileData);

      mockUsersCollection.findOne.mockResolvedValue(mockUser);
      mockProfilesCollection.findOne.mockResolvedValue(null);
      mockProfilesCollection.insertOne.mockResolvedValue({
        insertedId: 'profile123',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.userId.toString()).toBe('507f1f77bcf86cd799439011');
    });

    it('should create new user and affiliate profile', async () => {
      const newUserData = {
        name: 'New Affiliate',
        email: 'new@example.com',
        password: 'Password123!',
        commission_rate: 0.15,
        status: 'pending',
      };

      const mockRequest = createMockRequest(newUserData);

      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      mockUsersCollection.findOne.mockResolvedValue(null);
      mockUsersCollection.insertOne.mockResolvedValue({
        insertedId: '507f1f77bcf86cd799439012',
      });
      mockProfilesCollection.findOne.mockResolvedValue(null);
      mockProfilesCollection.insertOne.mockResolvedValue({
        insertedId: 'profile456',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 'salt');
    });

    it('should return error for duplicate affiliate profile', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test User',
        email: 'test@example.com',
        role: 'affiliate',
      };

      const mockRequest = createMockRequest(validProfileData);

      mockUsersCollection.findOne.mockResolvedValue(mockUser);
      mockProfilesCollection.findOne.mockResolvedValue({
        userId: '507f1f77bcf86cd799439011',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already exists');
    });
  });

  describe('PUT /api/affiliates', () => {
    it('should update affiliate status', async () => {
      const updateData = {
        affiliateId: '507f1f77bcf86cd799439011',
        status: 'suspended',
      };

      const mockRequest = createMockRequest(updateData);

      mockProfilesCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      const response = await PUT(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('updated successfully');
      expect(mockProfilesCollection.updateOne).toHaveBeenCalledWith(
        expect.any(Object),
        { $set: { status: 'suspended' } }
      );
    });

    it('should update commission rate', async () => {
      const updateData = {
        affiliateId: 'profile123',
        commission_rate: 0.20,
      };

      const mockRequest = createMockRequest(updateData);

      mockProfilesCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      const response = await PUT(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updatedFields.commission_rate).toBe(0.20);
    });

    it('should return error for non-existent affiliate', async () => {
      const updateData = {
        affiliateId: 'nonexistent123',
        status: 'active',
      };

      const mockRequest = createMockRequest(updateData);

      mockProfilesCollection.updateOne.mockResolvedValue({
        matchedCount: 0,
      });

      const response = await PUT(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });
  });
});