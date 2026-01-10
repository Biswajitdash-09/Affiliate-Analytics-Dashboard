import { NextResponse } from 'next/server';

export async function POST() {
    const response = NextResponse.json(
        { success: true, message: 'Logged out successfully' },
        { status: 200 }
    );

    // Clear the authentication cookie
    response.cookies.set('token', '', {
        httpOnly: true,
        expires: new Date(0),
        path: '/',
    });

    return response;
}
