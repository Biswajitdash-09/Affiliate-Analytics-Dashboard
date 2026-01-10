import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/db';
import { USERS_COLLECTION, USER_ROLES } from '@/models/User';

// Helper to seed a default admin if the database is empty
// This ensures the application is usable immediately after deployment
async function seedDefaultAdmin(db) {
  try {
    const usersCollection = db.collection(USERS_COLLECTION);
    const count = await usersCollection.countDocuments();

    if (count === 0) {
      console.log('Database empty. Seeding default admin user...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);

      const adminUser = {
        name: 'System Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: USER_ROLES.ADMIN,
        verified: true, // Default admin is auto-verified
        createdAt: new Date().toISOString(),
      };

      await usersCollection.insertOne(adminUser);
      console.log('Default admin seeded: admin@example.com / password123');
    }
  } catch (error) {
    console.error("Error seeding default admin:", error);
    // Non-blocking error, continue login flow
  }
}

export async function POST(request) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { email: rawEmail, password } = body;
    const email = rawEmail?.trim().toLowerCase();

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Automatic Seeding Check: Only in development mode
    if (process.env.NODE_ENV === 'development') {
      await seedDefaultAdmin(db);
    }

    const usersCollection = db.collection(USERS_COLLECTION);

    const MAX_FAILED_ATTEMPTS = parseInt(process.env.MAX_FAILED_ATTEMPTS || '5');
    const LOCKOUT_DURATION = parseInt(process.env.LOCKOUT_DURATION_MS || '900000'); // 15 minutes default

    // Find user
    const user = await usersCollection.findOne({ email });
    if (!user) {
      // Don't reveal whether user exists for security
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.lockedUntil) - new Date()) / 1000 / 60);
      return NextResponse.json(
        {
          success: false,
          error: `Account locked. Please try again in ${remainingTime} minute(s).`,
          locked: true
        },
        { status: 429 }
      );
    }

    // Check if user's email is verified (skip for admin users created via seeding)
    if (!user.verified && user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Please verify your email address before logging in. Check your inbox for the verification link.',
          requiresVerification: true
        },
        { status: 403 }
      );
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // Increment failedLoginAttempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData = {
        $set: {
          lastFailedLogin: new Date().toISOString(),
          failedLoginAttempts: failedAttempts
        }
      };

      // Lock account if max attempts reached
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.$set.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
        updateData.$set.accountLocked = true;
      }

      await usersCollection.updateOne(
        { _id: user._id },
        updateData
      );

      const remainingAttempts = MAX_FAILED_ATTEMPTS - failedAttempts;
      if (remainingAttempts > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid credentials',
            remainingAttempts: remainingAttempts
          },
          { status: 401 }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Account locked due to too many failed attempts. Please try again later.',
            locked: true
          },
          { status: 429 }
        );
      }
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            failedLoginAttempts: 0,
            lastFailedLogin: null,
            lockedUntil: null,
            accountLocked: false
          }
        }
      );
    }

    // Generate JWT Token
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    };

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('CRITICAL: JWT_SECRET is not configured');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      tokenPayload,
      secret,
      { expiresIn: '1d' }
    );

    // Return success with token and user info (excluding password)
    const { password: _, ...userWithoutPassword } = user;

    const response = NextResponse.json(
      {
        success: true,
        token,
        user: {
          ...userWithoutPassword,
          _id: user._id.toString()
        },
        message: "Login successful"
      },
      { status: 200 }
    );

    // Set secure cookie for middleware access
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return response;

  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}