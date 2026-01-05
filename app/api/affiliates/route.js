import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { USERS_COLLECTION, USER_ROLES } from '@/models/User';
import { AFFILIATE_PROFILES_COLLECTION, AFFILIATE_STATUS, validateAffiliateProfile } from '@/models/AffiliateProfile';

/**
 * Helper function to seed sample affiliates if the collection is empty.
 * This ensures the application has data immediately upon deployment.
 */
async function seedSampleAffiliates(db) {
  try {
    const profilesCollection = db.collection(AFFILIATE_PROFILES_COLLECTION);
    const usersCollection = db.collection(USERS_COLLECTION);

    const count = await profilesCollection.countDocuments();

    if (count === 0) {
      console.log('Seeding sample affiliates...');

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);

      // Sample users data
      const sampleUsers = [
        { name: "Alice Affiliate", email: "alice@example.com", role: USER_ROLES.AFFILIATE },
        { name: "Bob Marketer", email: "bob@example.com", role: USER_ROLES.AFFILIATE },
        { name: "Charlie Traffic", email: "charlie@example.com", role: USER_ROLES.AFFILIATE },
        { name: "Diana Influencer", email: "diana@example.com", role: USER_ROLES.AFFILIATE },
        { name: "Evan Earner", email: "evan@example.com", role: USER_ROLES.AFFILIATE }
      ];

      const createdUsers = [];

      // Insert users first (checking for existence to prevent duplicates)
      for (const user of sampleUsers) {
        const existing = await usersCollection.findOne({ email: user.email });
        if (!existing) {
          const newUser = {
            ...user,
            password: hashedPassword,
            createdAt: new Date().toISOString()
          };
          const result = await usersCollection.insertOne(newUser);
          createdUsers.push({ ...newUser, _id: result.insertedId });
        } else {
          createdUsers.push(existing);
        }
      }

      // Create profiles for these users
      const sampleProfiles = createdUsers.map((user, index) => ({
        userId: user._id,
        commission_rate: Number((0.10 + (index * 0.02)).toFixed(2)), // Varied rates: 0.10, 0.12, etc.
        status: index % 2 === 0 ? AFFILIATE_STATUS.ACTIVE : AFFILIATE_STATUS.PENDING,
        total_earnings: (index + 1) * 150.50,
        createdAt: new Date().toISOString()
      }));

      // Only insert profiles if we have users to link to
      if (sampleProfiles.length > 0) {
        // Check if profiles already exist for these users to avoid duplicates
        for (const profile of sampleProfiles) {
          const existingProfile = await profilesCollection.findOne({ userId: profile.userId });
          if (!existingProfile) {
            await profilesCollection.insertOne(profile);
          }
        }
        console.log(`Seeding check completed for ${sampleProfiles.length} potential affiliates.`);
      }
    }
  } catch (error) {
    console.error("Error seeding affiliates:", error);
    // Continue execution even if seeding fails
  }
}

/**
 * GET /api/affiliates
 * Fetches all affiliate profiles joined with their user details.
 */
export async function GET(request) {
  try {
    const db = await getDb();

    // PRODUCTION: Disabled automatic seeding of sample data
    // await seedSampleAffiliates(db);

    const collection = db.collection(AFFILIATE_PROFILES_COLLECTION);

    // Aggregation pipeline to join affiliate profiles with user data
    const affiliates = await collection.aggregate([
      {
        $lookup: {
          from: USERS_COLLECTION,
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true // Keep profile even if user is missing (edge case)
        }
      },
      {
        $project: {
          _id: 1,
          commission_rate: 1,
          status: 1,
          total_earnings: 1,
          createdAt: 1,
          user: {
            _id: '$user._id',
            name: '$user.name',
            email: '$user.email',
            role: '$user.role'
          }
        }
      },
      { $sort: { createdAt: -1 } }
    ]).toArray();

    return NextResponse.json({ success: true, data: affiliates });
  } catch (error) {
    console.error('Error fetching affiliates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch affiliates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/affiliates
 * Creates a new affiliate profile.
 * Supports two modes:
 * 1. Link existing user: Provide `userId`
 * 2. Create new user & profile: Provide `name`, `email`, `password`
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const db = await getDb();
    const usersCollection = db.collection(USERS_COLLECTION);
    const profilesCollection = db.collection(AFFILIATE_PROFILES_COLLECTION);

    let userId;
    let user;

    // MODE 1: Link to an existing user
    if (body.userId) {
      try {
        userId = new ObjectId(body.userId);
      } catch (e) {
        return NextResponse.json(
          { success: false, error: 'Invalid User ID format' },
          { status: 400 }
        );
      }

      user = await usersCollection.findOne({ _id: userId });
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if profile already exists for this user
      const existingProfile = await profilesCollection.findOne({ userId });
      if (existingProfile) {
        return NextResponse.json(
          { success: false, error: 'Affiliate profile already exists for this user' },
          { status: 409 }
        );
      }

    } else {
      // MODE 2: Create a new user and then the profile

      // Validate required user fields
      if (!body.name || !body.email || !body.password) {
        return NextResponse.json(
          { success: false, error: 'Name, email, and password are required for new users' },
          { status: 400 }
        );
      }

      // Check if email exists
      const existingUser = await usersCollection.findOne({ email: body.email });
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'User with this email already exists' },
          { status: 409 }
        );
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(body.password, salt);

      // Create User
      const newUser = {
        name: body.name,
        email: body.email,
        password: hashedPassword,
        role: USER_ROLES.AFFILIATE, // Force role to affiliate
        createdAt: new Date().toISOString()
      };

      const userResult = await usersCollection.insertOne(newUser);
      userId = userResult.insertedId;
      user = { ...newUser, _id: userId };
    }

    // Prepare Affiliate Profile Data
    const profileData = {
      userId: userId,
      commission_rate: body.commission_rate !== undefined ? Number(body.commission_rate) : 0.10,
      status: body.status || AFFILIATE_STATUS.PENDING,
      total_earnings: 0,
      createdAt: new Date().toISOString()
    };

    // Validate profile data using model helper
    const validationError = validateAffiliateProfile(profileData);
    if (validationError) {
      // Note: If we just created a user, in a real transaction we would rollback.
      // Here we return error, leaving the user created but without a profile (which is technically valid state).
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    // Insert Profile
    const result = await profilesCollection.insertOne(profileData);

    return NextResponse.json({
      success: true,
      data: {
        ...profileData,
        _id: result.insertedId,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      },
      message: "Affiliate profile created successfully"
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating affiliate:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/affiliates
 * Update affiliate profile (status, commission_rate, etc.)
 * Payload: { affiliateId, status?, commission_rate? }
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { affiliateId, status, commission_rate } = body;

    if (!affiliateId) {
      return NextResponse.json(
        { success: false, error: 'affiliateId is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Build update object
    const updateFields = {};

    if (status && Object.values(AFFILIATE_STATUS).includes(status)) {
      updateFields.status = status;
    }

    if (commission_rate !== undefined && typeof commission_rate === 'number') {
      updateFields.commission_rate = commission_rate;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Find and update the profile
    // affiliateId could be the profile _id or the userId
    let query;
    if (ObjectId.isValid(affiliateId)) {
      query = { $or: [{ _id: new ObjectId(affiliateId) }, { userId: new ObjectId(affiliateId) }] };
    } else {
      query = { userId: affiliateId };
    }

    const result = await db.collection(AFFILIATE_PROFILES_COLLECTION).updateOne(
      query,
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Affiliate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Affiliate updated successfully',
      updatedFields: updateFields
    });

  } catch (error) {
    console.error('Error updating affiliate:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}