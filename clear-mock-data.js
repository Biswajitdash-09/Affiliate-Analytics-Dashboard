/**
 * Script to clear all mock/sample data from the database.
 * Run this once to reset to a clean production state.
 * 
 * Usage: node clear-mock-data.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function clearMockData() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.error('MONGODB_URI not set in environment variables');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB...');

        const dbName = process.env.MONGODB_DB || 'affiliate_dashboard';
        console.log(`Using database: ${dbName}`);
        const db = client.db(dbName);

        // Collections to clear
        const collectionsToClean = [
            'click_events',
            'revenues',
            'campaigns',
            'affiliate_profiles',
            'payouts',
            'adjustments'
        ];

        for (const collName of collectionsToClean) {
            const result = await db.collection(collName).deleteMany({});
            console.log(`✓ Cleared ${result.deletedCount} documents from '${collName}'`);
        }

        // For users, only delete sample users (not real admins you created)
        // We identify sample users by their email pattern
        const sampleUserEmails = [
            'admin@example.com',
            'john.doe@example.com',
            'jane.smith@example.com',
            'mike.johnson@example.com'
        ];

        const userResult = await db.collection('users').deleteMany({
            email: { $in: sampleUserEmails }
        });
        console.log(`✓ Cleared ${userResult.deletedCount} sample users from 'users'`);

        console.log('\n✅ Database cleaned! Ready for production.');
        console.log('You can now create real affiliates, campaigns, and track real conversions.');

    } catch (error) {
        console.error('Error clearing mock data:', error);
    } finally {
        await client.close();
    }
}

clearMockData();
