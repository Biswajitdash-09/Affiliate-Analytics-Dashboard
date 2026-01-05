/**
 * Script to delete a specific user and their affiliate profile.
 * 
 * Usage: node delete-user.js biswajitdash929@gmail.com
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function deleteUser(email) {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || 'affiliate_dashboard';

    if (!uri) {
        console.error('MONGODB_URI not set in environment variables');
        process.exit(1);
    }

    if (!email) {
        console.error('Please provide an email address');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(dbName);
        console.log(`Connected to MongoDB database: ${dbName}`);

        // 1. Find the user
        const user = await db.collection('users').findOne({ email });
        if (!user) {
            console.log(`User with email ${email} not found.`);
            return;
        }

        const userId = user._id;

        // 2. Delete Affiliate Profile
        const profileResult = await db.collection('affiliate_profiles').deleteOne({ userId });
        console.log(`✓ Deleted affiliate profile: ${profileResult.deletedCount}`);

        // 3. Delete from users collection
        const userResult = await db.collection('users').deleteOne({ _id: userId });
        console.log(`✓ Deleted user: ${userResult.deletedCount}`);

        console.log(`\n✅ ${email} has been completely removed.`);

    } catch (error) {
        console.error('Error deleting user:', error);
    } finally {
        await client.close();
    }
}

const targetEmail = process.argv[2] || 'biswajitdash929@gmail.com';
deleteUser(targetEmail);
