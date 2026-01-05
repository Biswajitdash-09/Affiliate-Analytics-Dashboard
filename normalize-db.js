const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

async function normalizeDb() {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB;

    if (!uri || !dbName) {
        console.error("Missing MONGODB_URI or MONGODB_DB");
        return;
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db(dbName);
        const users = db.collection('users');

        const allUsers = await users.find({}).toArray();
        console.log(`Found ${allUsers.length} users. Normalizing emails...`);

        for (const user of allUsers) {
            if (user.email) {
                const lowerEmail = user.email.trim().toLowerCase();
                if (lowerEmail !== user.email) {
                    await users.updateOne(
                        { _id: user._id },
                        { $set: { email: lowerEmail } }
                    );
                    console.log(`Normalized: ${user.email} -> ${lowerEmail}`);
                }
            }
        }

        console.log("Database normalization completed.");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.close();
    }
}

normalizeDb();
