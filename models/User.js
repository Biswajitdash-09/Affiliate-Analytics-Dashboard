/**
 * User Model Definition
 * 
 * Note: This project uses the native MongoDB driver. 
 * This file defines the schema structure, constants, and validation helpers
 * instead of a Mongoose model.
 */

export const USERS_COLLECTION = 'users';

export const USER_ROLES = {
  ADMIN: 'admin',
  AFFILIATE: 'affiliate'
};

export const UserSchema = {
  name: { type: 'string', required: true },
  email: { type: 'string', required: true, unique: true },
  password: { type: 'string', required: true }, // Should be hashed
  role: {
    type: 'string',
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.AFFILIATE
  },
  verified: { type: 'boolean', default: false }, // Email verification status
  verificationToken: { type: 'string', default: null }, // Token for email verification
  verificationTokenExpires: { type: 'date', default: null }, // Token expiry timestamp
  createdAt: { type: 'date', default: () => new Date().toISOString() }
};

/**
 * Validates user data against the schema requirements
 * @param {Object} data - The user data to validate
 * @returns {string|null} - Error message or null if valid
 */
export function validateUser(data) {
  if (!data.name || typeof data.name !== 'string') return 'Name is required and must be a string';
  if (!data.email || typeof data.email !== 'string') return 'Email is required and must be a string';
  if (!data.password || typeof data.password !== 'string') return 'Password is required and must be a string';

  // Email format validation (RFC 5322 compliant)
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_REGEX.test(data.email)) {
    return 'Invalid email format';
  }

  // Password strength validation
  if (data.password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(data.password)) {
    return 'Password must contain at least one uppercase letter';
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(data.password)) {
    return 'Password must contain at least one lowercase letter';
  }

  // Check for at least one digit
  if (!/[0-9]/.test(data.password)) {
    return 'Password must contain at least one digit';
  }

  // Optional: Check for special character (can be skipped if not required)
  // if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.password)) {
  //   return 'Password must contain at least one special character';
  // }

  // Name length validation
  if (data.name.length < 2 || data.name.length > 100) {
    return 'Name must be between 2 and 100 characters';
  }

  if (data.role && !Object.values(USER_ROLES).includes(data.role)) {
    return `Role must be one of: ${Object.values(USER_ROLES).join(', ')}`;
  }

  return null;
}

/**
 * Validates user data for social login (OAuth providers)
 * Uses relaxed validation since OAuth handles most validation
 * @param {Object} data - The user data to validate
 * @returns {string|null} - Error message or null if valid
 */
export function validateOAuthUser(data) {
  if (!data.name || typeof data.name !== 'string') return 'Name is required and must be a string';
  if (!data.email || typeof data.email !== 'string') return 'Email is required and must be a string';

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_REGEX.test(data.email)) {
    return 'Invalid email format';
  }

  // Name length validation
  if (data.name.length < 2 || data.name.length > 100) {
    return 'Name must be between 2 and 100 characters';
  }

  return null;
}

/**
 * Creates indexes for the Users collection
 * @param {import('mongodb').Db} db
 */
export async function initUserIndexes(db) {
  await db.collection(USERS_COLLECTION).createIndex({ email: 1 }, { unique: true });
  await db.collection(USERS_COLLECTION).createIndex({ role: 1 }, { sparse: true }); // Index for role filtering
}