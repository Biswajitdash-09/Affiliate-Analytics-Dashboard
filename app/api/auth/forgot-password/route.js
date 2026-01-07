import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { USERS_COLLECTION } from '@/models/User';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

export async function POST(request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
        }

        const db = await getDb();
        const collection = db.collection(USERS_COLLECTION);

        const user = await collection.findOne({ email });

        // Security check: Don't reveal if user exists or not
        if (!user) {
            // Fake delay to mimic processing time
            await new Promise(resolve => setTimeout(resolve, 500));
            return NextResponse.json({
                success: true,
                message: 'If an account exists with this email, you will receive instructions shortly.'
            });
        }

        // Generate Reset Token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

        // Save to Database
        await collection.updateOne(
            { email },
            {
                $set: {
                    resetToken,
                    resetTokenExpiry
                }
            }
        );

        // Send Email
        const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        const emailResult = await sendEmail({
            to: email,
            subject: 'Reset Your Password - Affiliate Dashboard',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #2563eb;">Reset Your Password</h2>
          <p>You requested a password reset for your Affiliate Dashboard account.</p>
          <p>Click the button below to set a new password. This link is valid for 1 hour.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">If the button doesn't work, verify this link:<br> <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
        });

        if (!emailResult.success) {
            console.error("Failed to send email:", emailResult.error);
            // We still return success to the user to prevent enumeration, but we log the error
        }

        return NextResponse.json({
            success: true,
            message: 'If an account exists with this email, you will receive instructions shortly.'
        });

    } catch (error) {
        console.error('Forgot Password Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
