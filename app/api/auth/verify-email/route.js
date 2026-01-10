import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { USERS_COLLECTION } from '@/models/User';

/**
 * POST /api/auth/verify-email
 * Verify user's email address using OTP.
 * Body: { email, otp }
 */
export async function POST(request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const usersCollection = db.collection(USERS_COLLECTION);

    // Find user with this email and OTP
    // Note: We search by email first to be safe, then check OTP
    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.verified) {
      return NextResponse.json(
        { success: true, message: 'Email already verified' },
        { status: 200 }
      );
    }

    // Check OTP match
    if (user.verificationOTP !== otp) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Check expiration
    if (user.verificationOTPExpires && new Date(user.verificationOTPExpires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Verification code expired' },
        { status: 400 }
      );
    }

    // Update user: mark as verified and clear OTP
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          verified: true,
          verificationOTP: null,
          verificationOTPExpires: null
        }
      }
    );

    return NextResponse.json(
      { success: true, message: 'Email verified successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Email Verification Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}