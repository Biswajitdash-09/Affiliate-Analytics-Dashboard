import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { USERS_COLLECTION, USER_ROLES, validateUser } from '@/models/User';
import { AFFILIATE_PROFILES_COLLECTION, AFFILIATE_STATUS } from '@/models/AffiliateProfile';

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

    // Default role to AFFILIATE if not provided or invalid for public registration
    // In a real app, you might want to restrict 'admin' registration, 
    // but we'll allow the payload to define it if valid, defaulting to affiliate.
    const role = body.role && Object.values(USER_ROLES).includes(body.role) 
      ? body.role 
      : USER_ROLES.AFFILIATE;

    const userData = {
      name: body.name,
      email: body.email,
      password: body.password,
      role: role
    };

    // Validate input using the model's validator
    const validationError = validateUser(userData);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    const db = await getDb();
    const usersCollection = db.collection(USERS_COLLECTION);

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: userData.email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // Prepare user document
    const newUser = {
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      createdAt: new Date().toISOString(),
    };

    // Insert user
    const result = await usersCollection.insertOne(newUser);
    
    // If the user is an affiliate, create an empty affiliate profile
    if (newUser.role === USER_ROLES.AFFILIATE) {
      const affiliateProfile = {
        userId: result.insertedId,
        commission_rate: 0.10, // Default 10%
        status: AFFILIATE_STATUS.PENDING, // Default to pending approval
        total_earnings: 0,
        createdAt: new Date().toISOString()
      };
      
      await db.collection(AFFILIATE_PROFILES_COLLECTION).insertOne(affiliateProfile);
    }

    // Return success (excluding password)
    const { password, ...userWithoutPassword } = newUser;
    
    return NextResponse.json(
      { 
        success: true, 
        data: { 
          ...userWithoutPassword, 
          _id: result.insertedId.toString() 
        },
        message: "User registered successfully"
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}