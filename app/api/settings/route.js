import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/db';
import { GLOBAL_SETTINGS_COLLECTION, DEFAULT_SETTINGS, validateSettings } from '@/models/GlobalSettings';
import { USER_ROLES } from '@/models/User';

// Helper to verify admin privileges
const verifyAdmin = (request) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-production';
    
    const decoded = jwt.verify(token, secret);
    
    if (decoded.role !== USER_ROLES.ADMIN) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * GET /api/settings
 * Fetches global application settings.
 * Seeds default settings if none exist.
 */
export async function GET(request) {
  try {
    const db = await getDb();
    const collection = db.collection(GLOBAL_SETTINGS_COLLECTION);

    // Check if settings exist
    let settings = await collection.findOne({});

    // Automatic Seeding: If no settings exist, create defaults
    if (!settings) {
      console.log('No global settings found. Seeding defaults...');
      const result = await collection.insertOne({
        ...DEFAULT_SETTINGS,
        createdAt: new Date().toISOString()
      });
      
      settings = {
        ...DEFAULT_SETTINGS,
        _id: result.insertedId,
        createdAt: new Date().toISOString()
      };
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings
 * Updates global application settings.
 * Restricted to Admin users only.
 */
export async function PUT(request) {
  try {
    // 1. Security Check: Verify Admin
    const adminUser = verifyAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // 2. Parse Body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // 3. Validate Input
    const validationError = validateSettings(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    // 4. Prepare Update Data
    // We explicitly select fields to prevent pollution
    const updateData = {
      updatedAt: new Date().toISOString()
    };

    if (body.platformName) updateData.platformName = body.platformName;
    if (body.defaultCommissionRate !== undefined) updateData.defaultCommissionRate = Number(body.defaultCommissionRate);
    if (body.minimumPayout !== undefined) updateData.minimumPayout = Number(body.minimumPayout);
    // Currency is fixed to INR and cannot be changed via API
    if (body.supportEmail) updateData.supportEmail = body.supportEmail;
    if (body.allowRegistration !== undefined) updateData.allowRegistration = Boolean(body.allowRegistration);

    const db = await getDb();
    const collection = db.collection(GLOBAL_SETTINGS_COLLECTION);

    // 5. Perform Update (Upsert ensures it works even if somehow empty)
    const result = await collection.findOneAndUpdate(
      {}, // Match the single settings document (or first one)
      { $set: updateData },
      { returnDocument: 'after', upsert: true }
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}