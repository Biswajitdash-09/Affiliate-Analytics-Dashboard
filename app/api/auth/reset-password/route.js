import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { USERS_COLLECTION } from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, newPassword } = body;

        if (!token || !newPassword) {
            return NextResponse.json({
                success: false,
                error: 'Token and new password are required'
            }, { status: 400 });
        }

        const db = await getDb();
        const collection = db.collection(USERS_COLLECTION);

        // Find user with valid token and expiry
        const user = await collection.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'Invalid or expired password reset token'
            }, { status: 400 });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update User
        await collection.updateOne(
            { _id: user._id },
            {
                $set: { password: hashedPassword },
                $unset: { resetToken: "", resetTokenExpiry: "" }
            }
        );

        return NextResponse.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset Password Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
