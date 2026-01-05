const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

async function debugLogin() {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB;

    if (!uri || !dbName) {
        console.error("MONGODB_URI or MONGODB_DB not found");
        return;
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db(dbName);
        const users = db.collection('users');

        const email = 'curie@gmail.com';
        const passwordToCheck = 'curie@gmail.com';

        // 1. Find User
        console.log(`Searching for user: ${email} in db: ${dbName}`);
        const user = await users.findOne({ email });

        if (!user) {
            console.log(`User ${email} not found in DB.`);
            const allUsers = await users.find({}).limit(10).toArray();
            console.log("Recent users in DB:", allUsers.map(u => u.email));
            return;
        }

        console.log("User found:", {
            _id: user._id,
            email: user.email,
            role: user.role,
            passwordHashLength: user.password ? user.password.length : 0,
            passwordStart: user.password ? user.password.substring(0, 10) : "N/A"
        });

        // 2. Compare Password directly
        console.log(`Checking password: "${passwordToCheck}"`);
        const isMatch = await bcrypt.compare(passwordToCheck, user.password);
        console.log("bcrypt.compare result:", isMatch);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.close();
    }
}

debugLogin();
