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

    const { email, password } = body;

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

    // Find user
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT Token
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    };

    const secret = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-production';

    const token = jwt.sign(
      tokenPayload,
      secret,
      { expiresIn: '1d' }
    );

    // Return success with token and user info (excluding password)
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
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

  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}