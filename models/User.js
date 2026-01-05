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
  MANAGER: 'manager',
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
  
  if (data.role && !Object.values(USER_ROLES).includes(data.role)) {
    return `Role must be one of: ${Object.values(USER_ROLES).join(', ')}`;
  }
  
  return null;
}

/**
 * Creates indexes for the Users collection
 * @param {import('mongodb').Db} db 
 */
export async function initUserIndexes(db) {
  await db.collection(USERS_COLLECTION).createIndex({ email: 1 }, { unique: true });
}