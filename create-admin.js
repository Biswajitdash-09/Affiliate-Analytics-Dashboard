const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const ADMIN_NAME = 'System Admin';

async function createAdminUser() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'affiliate';

  if (!uri) {
    console.error('❌ MONGODB_URI is not set in .env file');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  console.log(`📍 Database: ${dbName}`);
  console.log('');

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');
    console.log('');

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    // Check if admin already exists
    console.log(`🔍 Checking if user exists: ${ADMIN_EMAIL}`);
    const existingUser = await usersCollection.findOne({ email: ADMIN_EMAIL });

    if (existingUser) {
      console.log('⚠️  Admin user already exists!');
      console.log(`   Name: ${existingUser.name}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Created: ${existingUser.createdAt}`);
      console.log('');
      console.log('Do you want to update this user\'s password? (No - will create new)');
      console.log('');
      console.log('If you forgot the password, delete this user first and run the script again.');
      console.log('Or use MongoDB Atlas Compass to view/delete the user.');
      client.close();
      return;
    }

    // Hash the password
    console.log('🔐 Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    // Create admin user
    console.log('👤 Creating admin user...');
    const adminUser = {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date().toISOString()
    };

    const result = await usersCollection.insertOne(adminUser);

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('═════════════════════════════════════════════');
    console.log('🎉 ADMIN CREDENTIALS');
    console.log('═════════════════════════════════════════════');
    console.log(`📧 Email:    ${ADMIN_EMAIL}`);
    console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
    console.log(`👤 Name:     ${ADMIN_NAME}`);
    console.log(`🎯 Role:     admin`);
    console.log('═════════════════════════════════════════════');
    console.log('');
    console.log('💡 You can now login at: http://localhost:3000/login');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('═════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('connection')) {
      console.error('');
      console.error('Troubleshooting:');
      console.error('1. Check your MongoDB URI in .env');
      console.error('2. Ensure MongoDB Atlas IP whitelist allows your IP');
      console.error('3. Make sure database user has correct permissions');
    }
  } finally {
    await client.close();
    console.log('');
    console.log('🔌 Connection closed');
  }
}

createAdminUser();