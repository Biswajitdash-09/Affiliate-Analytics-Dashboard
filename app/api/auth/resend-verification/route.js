import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { USERS_COLLECTION } from '@/models/User';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

/**
 * POST /api/auth/resend-verification
 * Send a new verification email to a user.
 * Body: { email }
 */
export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { email: rawEmail } = body;
    const email = rawEmail?.trim().toLowerCase();

    // Basic validation
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const usersCollection = db.collection(USERS_COLLECTION);

    // Find user by email
    const user = await usersCollection.findOne({ email });

    // Always return success for security (don't reveal if email exists)
    // But only send email if user exists and is not verified
    if (user) {
      // Check if user is already verified
      if (user.verified) {
        return NextResponse.json(
          {
            success: true,
            message: 'Your email is already verified. You can now login.',
            alreadyVerified: true
          },
          { status: 200 }
        );
      }

      // Generate new verification token (expires in 24 hours)
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Update user with new token
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            verificationToken: verificationToken,
            verificationTokenExpires: verificationTokenExpires
          }
        }
      );

      // Send verification email
      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${verificationToken}`;
      const emailHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">New Verification Email</h2>
              <p>Hi ${user.name},</p>
              <p>We've generated a new verification link for you. Please verify your email address by clicking the button below:</p>
              <a href="${verificationUrl}" 
                 style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Verify Email
              </a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't request this, please ignore this email.</p>
            </div>
          </body>
        </html>
      `;

      await sendEmail({
        to: user.email,
        subject: 'New Verification Email - Affiliate Analytics',
        html: emailHtml,
        text: `Hi ${user.name},\n\nPlease verify your email address by visiting: ${verificationUrl}\n\nThis link will expire in 24 hours.`
      });
    }

    // Always return success (security best practice)
    return NextResponse.json(
      {
        success: true,
        message: 'If the email exists in our system, a new verification link has been sent.'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Resend Verification Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}