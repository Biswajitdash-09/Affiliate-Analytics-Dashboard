import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { USERS_COLLECTION, USER_ROLES, validateUser } from '@/models/User';
import { AFFILIATE_PROFILES_COLLECTION, AFFILIATE_STATUS } from '@/models/AffiliateProfile';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

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
      email: body.email?.trim().toLowerCase(),
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

    // Generate 6-digit numeric OTP
    const verificationOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationOTPExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Prepare user document
    const newUser = {
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      verified: false, // User starts as unverified
      verificationOTP: verificationOTP,
      verificationOTPExpires: verificationOTPExpires,
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

    // Send verification email with OTP
    const emailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Welcome to Affiliate Analytics!</h2>
            <p>Hi ${newUser.name},</p>
            <p>Thank you for registering. Please verify your email address using the code below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; background: #f3f4f6; padding: 10px 20px; border-radius: 8px;">
                ${verificationOTP}
              </span>
            </div>

            <p>Enter this code on the verification page to activate your account.</p>
            <p>This code will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
        </body>
      </html>
    `;

    const emailResult = await sendEmail({
      to: newUser.email,
      subject: 'Verify Your Email Address',
      html: emailHtml,
      text: `Hi ${newUser.name},\n\nYour verification code is: ${verificationOTP}\n\nPlease enter this code to verify your account.\n\nThis code will expire in 24 hours.`
    });

    // Return success (excluding password and sensitive verification data)
    return NextResponse.json(
      {
        success: true,
        data: {
          _id: result.insertedId.toString(),
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          verified: newUser.verified,
          createdAt: newUser.createdAt
        },
        message: "User registered successfully. Please check your email to verify your account.",
        emailSent: emailResult.success
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