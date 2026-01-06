import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/db';
import { GLOBAL_SETTINGS_COLLECTION, DEFAULT_SETTINGS, validateSettings } from '@/models/GlobalSettings';
import { USER_ROLES } from '@/models/User';
import { ATTRIBUTION_SETTINGS_COLLECTION, DEFAULT_ATTRIBUTION_SETTINGS, validateAttributionSettings, ALLOWED_ATTRIBUTION_MODELS, AttributionModel } from '@/models/AttributionSettings';

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
    const globalCollection = db.collection(GLOBAL_SETTINGS_COLLECTION);
    const attributionCollection = db.collection(ATTRIBUTION_SETTINGS_COLLECTION);

    // Check if settings exist
    let globalSettings = await globalCollection.findOne({});
    let attributionSettings = await attributionCollection.findOne({});

    // Automatic Seeding: If no settings exist, create defaults
    if (!globalSettings) {
      console.log('No global settings found. Seeding defaults...');
      const result = await globalCollection.insertOne({
        ...DEFAULT_SETTINGS,
        createdAt: new Date().toISOString()
      });
      
      globalSettings = {
        ...DEFAULT_SETTINGS,
        _id: result.insertedId,
        createdAt: new Date().toISOString()
      };
    }

    // Seed attribution settings if not exist
    if (!attributionSettings) {
      console.log('No attribution settings found. Seeding defaults...');
      const result = await attributionCollection.insertOne({
        ...DEFAULT_ATTRIBUTION_SETTINGS,
        createdAt: new Date().toISOString()
      });
      
      attributionSettings = {
        ...DEFAULT_ATTRIBUTION_SETTINGS,
        _id: result.insertedId,
        createdAt: new Date().toISOString()
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        ...globalSettings,
        attribution: {
          attributionModel: attributionSettings.attributionModel,
          clickAttributionWindow: attributionSettings.clickAttributionWindow,
          cookieExpiry: attributionSettings.cookieExpiry,
          multipleTouchSessions: attributionSettings.Sessions,
          createdAt: attributionSettings.createdAt
        }
      }
    });
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
    const globalValidationError = validateSettings(body);
    const attributionValidationError = validateAttributionSettings(body.attribution);
    
    const errors = [];
    if (globalValidationError) errors.push(globalValidationError);
    if (attributionValidationError) errors.push(...attributionValidationError);
    
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join('; ') },
        { status: 400 }
      );
    }

    // 4. Prepare Global Settings Update Data
    const globalUpdateData = {
      updatedAt: new Date().toISOString()
    };

    if (body.platformName) globalUpdateData.platformName = body.platformName;
    if (body.defaultCommissionRate !== undefined) globalUpdateData.defaultCommissionRate = Number(body.defaultCommissionRate);
    if (body.minimumPayout !== undefined) globalUpdateData.minimumPayout = Number(body.minimumPayout);
    if (body.supportEmail) globalUpdateData.supportEmail = body.supportEmail;
    if (body.allowRegistration !== undefined) globalUpdateData.allowRegistration = Boolean(body.allowRegistration);

    const db = await getDb();
    const globalCollection = db.collection(GLOBAL_SETTINGS_COLLECTION);
    const attributionCollection = db.collection(ATTRIBUTION_SETTINGS_COLLECTION);

    // 5. Update Global Settings
    const globalResult = await globalCollection.findOneAndUpdate(
      {},
      { $set: globalUpdateData },
      { returnDocument: 'after', upsert: true }
    );

    // 6. Update Attribution Settings if provided
    let attributionResult = null;
    if (body.attribution) {
      const attributionUpdateData = {
        ...body.attribution,
        updatedAt: new Date().toISOString()
      };
      
      // Convert Sessions to multipleTouchSessions if incorrectly passed
      if (attributionUpdateData.Sessions) {
        attributionUpdateData.multipleTouchSessions = attributionUpdateData.Sessions;
        delete attributionUpdateData.Sessions;
      }
      
      attributionResult = await attributionCollection.findOneAndUpdate(
        {},
        { $set: attributionUpdateData },
        { returnDocument: 'after', upsert: true }
      );
    }

    // Fetch updated settings to return
    const updatedSettings = await globalCollection.findOne({});
    const updatedAttribution = await attributionCollection.findOne({});

    return NextResponse.json({
      success: true,
      data: {
        ...updatedSettings,
        attribution: {
          attributionModel: updatedAttribution?.attributionModel,
          clickAttributionWindow: updatedAttribution?.clickAttributionWindow,
          cookieExpiry: updatedAttribution?.cookieExpiry,
          multipleTouchSessions: updatedAttribution?.multipleTouchSessions,
          createdAt: updatedAttribution?.createdAt
        }
      },
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