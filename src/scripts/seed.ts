import mongoose from 'mongoose';
import { createClient } from 'redis';
import { User } from '../modules/auth/user.model';
import { Package } from '../modules/packages/package.model';
import { Booking } from '../modules/bookings/booking.model';
import { PaymentWebhook } from '../modules/payments/paymentWebhook.model';
import { env } from '../config/environment';

const seed = async () => {
  console.log('🌱 Starting Database and Redis Seeding...');

  // Connect MongoDB
  await mongoose.connect(env.MONGO_URI);
  console.log('🔌 Connected to MongoDB.');

  // Connect Redis
  const redisClient = createClient({ url: env.REDIS_URL });
  await redisClient.connect();
  console.log('🔌 Connected to Redis.');

  // 1. Clear Existing Data
  console.log('🧹 Purging existing database collections...');
  await User.deleteMany({});
  await Package.deleteMany({});
  await Booking.deleteMany({});
  await PaymentWebhook.deleteMany({});

  console.log('🧹 Purging Redis keys...');
  const keys = await redisClient.keys('*');
  for (const key of keys) {
    if (
      key.startsWith('inventory:') ||
      key.startsWith('hold:') ||
      key.startsWith('itinerary:') ||
      key.startsWith('webhook:lock:')
    ) {
      await redisClient.del(key);
    }
  }

  // 2. Create Users (User creation hashes passwords via Mongoose pre-save hook)
  console.log('👤 Seeding Users...');
  const admin = new User({
    name: 'Admin Travel',
    email: 'admin@travel.com',
    passwordHash: 'adminpassword', // Will be hashed on save
    role: 'admin',
  });
  await admin.save();

  const userAlice = new User({
    name: 'Alice Smith',
    email: 'alice@gmail.com',
    passwordHash: 'password123',
    role: 'user',
  });
  await userAlice.save();

  const userBob = new User({
    name: 'Bob Jones',
    email: 'bob@gmail.com',
    passwordHash: 'password123',
    role: 'user',
  });
  await userBob.save();

  // 3. Create Travel Packages
  console.log('📦 Seeding Travel Packages...');
  
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Package 1: Active Flash Sale
  const flashPkg = new Package({
    title: 'Maldives Flash Paradise Sale',
    description: 'Luxury overwater villa with all-inclusive meals, private speed boat transfers, and daily spa vouchers.',
    price: 499,
    totalInventory: 10,
    availableInventory: 5, // Seed 5 available slots
    flashSale: {
      isActive: true,
      startTime: now,
      endTime: tomorrow,
    },
  });
  await flashPkg.save();

  // Package 2: Standard Sale
  const normalPkg = new Package({
    title: 'Swiss Alps Explorer',
    description: 'Scenic train tour through snow-capped peaks with private glacier walking tours and a cozy chalet stay.',
    price: 899,
    totalInventory: 100,
    availableInventory: 100,
    flashSale: {
      isActive: false,
    },
  });
  await normalPkg.save();

  // Package 3: Expired Flash Sale
  const expiredPkg = new Package({
    title: 'Bali Escape - Expired Deal',
    description: 'Scenic temple treks and private pool villas in Ubud.',
    price: 299,
    totalInventory: 10,
    availableInventory: 0,
    flashSale: {
      isActive: true,
      startTime: twoDaysAgo,
      endTime: oneDayAgo,
    },
  });
  await expiredPkg.save();

  // 4. Pre-seed Flash Sale Inventory to Redis
  const redisKey = `inventory:${flashPkg._id}`;
  await redisClient.set(redisKey, '5');
  console.log(`🔥 Pre-seeded Redis key [${redisKey}] with count 5.`);

  console.log('\n✨ Seeding Complete!');
  console.log('=========================================');
  console.log('Credentials list:');
  console.log('1. Admin: email: admin@travel.com | password: adminpassword');
  console.log('2. User 1: email: alice@gmail.com | password: password123');
  console.log('3. User 2: email: bob@gmail.com   | password: password123');
  console.log('=========================================');
  console.log('Packages IDs:');
  console.log(`- Maldives (Active Flash Sale): ${flashPkg._id}`);
  console.log(`- Swiss Alps (Standard Package): ${normalPkg._id}`);
  console.log(`- Bali Escape (Expired Flash):  ${expiredPkg._id}`);
  console.log('=========================================');

  // Close connections
  await mongoose.disconnect();
  await redisClient.quit();
  console.log('🔌 Connections closed.');
};

seed().catch((err) => {
  console.error('❌ Seeding failed with error:', err);
  process.exit(1);
});
