/**
 * API Route Tests for Authentication
 * Tests for /api/auth/login and /api/auth/register
 */

import { POST as registerRoute } from '@/app/api/auth/register/route';
import { POST as loginRoute } from '@/app/api/auth/login/route';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { USERS_COLLECTION } from '@/models/User';

// Mock database
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('Authentication API Routes', () => {
  let mockDb;
  let mockCollection;

  beforeEach(() => {
    mockCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      countDocuments: jest.fn(),
    };

    mockDb = {
      collection: jest.fn((name) => {
        if (name === USERS_COLLECTION) return mockCollection;
        return mockCollection;
      }),
    };

    getDb.mockResolvedValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const mockRequest = {
        json: async () => userData,
      };

      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockResolvedValue({
        insertedId: '507f1f77bcf86cd799439011',
      });

      const response = await registerRoute(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.email).toBe('test@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
    });

    it('should return error for duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const mockRequest = {
        json: async () => userData,
      };

      mockCollection.findOne.mockResolvedValue({
        email: 'test@example.com',
      });

      const response = await registerRoute(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already exists');
    });

    it('should return error for invalid email format', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123',
      };

      const mockRequest = {
        json: async () => userData,
      };

      const response = await registerRoute(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return error for missing fields', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
      };

      const mockRequest = {
        json: async () => userData,
      };

      const response = await registerRoute(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'affiliate',
      };

      const mockRequest = {
        json: async () => credentials,
      };

      mockCollection.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      const response = await loginRoute(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.user.email).toBe('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
    });

    it('should return error for invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'affiliate',
      };

      const mockRequest = {
        json: async () => credentials,
      };

      mockCollection.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      const response = await loginRoute(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid credentials');
    });

    it('should return error for non-existent user', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const mockRequest = {
        json: async () => credentials,
      };

      mockCollection.findOne.mockResolvedValue(null);

      const response = await loginRoute(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid credentials');
    });

    it('should return error for missing fields', async () => {
      const credentials = {
        email: 'test@example.com',
      };

      const mockRequest = {
        json: async () => credentials,
      };

      const response = await loginRoute(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});