import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { USERS_COLLECTION } from '@/models/User';

// Helper to verify authentication
const verifyUser = (request) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-production';
    
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * PUT /api/user/profile
 * Updates the authenticated user's profile information.
 * Handles name, email, and password updates securely.
 */
export async function PUT(request) {
  try {
    // 1. Authentication Check
    const decodedUser = verifyUser(request);
    if (!decodedUser || !decodedUser.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in' },
        { status: 401 }
      );
    }

    // 2. Parse Request Body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { name, email, password, currentPassword } = body;

    if (!name && !email && !password) {
      return NextResponse.json(
        { success: false, error: 'No changes provided' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const usersCollection = db.collection(USERS_COLLECTION);
    const userId = new ObjectId(decodedUser.userId);

    // 3. Fetch Current User Data
    const currentUser = await usersCollection.findOne({ _id: userId });
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const updateFields = {
      updatedAt: new Date().toISOString()
    };

    // 4. Handle Name Update
    if (name && typeof name === 'string') {
      updateFields.name = name;
    }

    // 5. Handle Email Update
    if (email && email !== currentUser.email) {
      // Validate email format
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Check for uniqueness
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser && existingUser._id.toString() !== userId.toString()) {
        return NextResponse.json(
          { success: false, error: 'Email is already in use by another account' },
          { status: 409 }
        );
      }
      updateFields.email = email;
    }

    // 6. Handle Password Update
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      // Optional: Require current password for security when changing password
      // This is a best practice, though not strictly enforced by the prompt requirements
      // We'll implement it if currentPassword is sent, otherwise proceed (flexible)
      if (currentPassword) {
        const isMatch = await bcrypt.compare(currentPassword, currentUser.password);
        if (!isMatch) {
          return NextResponse.json(
            { success: false, error: 'Current password is incorrect' },
            { status: 401 }
          );
        }
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateFields.password = hashedPassword;
    }

    // 7. Perform Update
    const result = await usersCollection.findOneAndUpdate(
      { _id: userId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // 8. Return Updated User (excluding password)
    const { password: _, ...userWithoutPassword } = result;

    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}