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

  // Package 4: Tokyo Tour
  const tokyoPkg = new Package({
    title: 'Tokyo Neon Nights & Temples',
    description: 'Explore the modern neon skyscrapers of Shinjuku and historical Asakusa shrines with a private culinary guide.',
    price: 1150,
    totalInventory: 50,
    availableInventory: 50,
    flashSale: { isActive: false },
  });
  await tokyoPkg.save();

  // Package 5: Santorini Tour
  const santoriniPkg = new Package({
    title: 'Santorini Sunset Dream Voyage',
    description: 'Scenic white-washed houses, Aegean cruises, and private wine tastings overlooking the volcanic caldera.',
    price: 999,
    totalInventory: 30,
    availableInventory: 30,
    flashSale: { isActive: false },
  });
  await santoriniPkg.save();

  // Package 6: Paris Tour
  const parisPkg = new Package({
    title: 'Paris Romance Escapade',
    description: 'A romantic stay near the Eiffel Tower, Seine cruises, private Louvre tours, and gourmet dinner reservations.',
    price: 1200,
    totalInventory: 25,
    availableInventory: 25,
    flashSale: { isActive: false },
  });
  await parisPkg.save();

  // Package 7: Grand Canyon Tour
  const canyonPkg = new Package({
    title: 'Grand Canyon Explorer Expedition',
    description: 'Adventure helicopter rides, hiking along the rim trails, and stargazing at the national park cabin lodges.',
    price: 550,
    totalInventory: 100,
    availableInventory: 100,
    flashSale: { isActive: false },
  });
  await canyonPkg.save();

  // Package 8: Amalfi Coast (Flash Sale)
  const amalfiPkg = new Package({
    title: 'Amalfi Coast Hideaway Flash Deal',
    description: 'Coastal cliff walks, private speed boat charters to Positano, and fresh seafood tasting menus.',
    price: 1450,
    totalInventory: 15,
    availableInventory: 10,
    flashSale: {
      isActive: true,
      startTime: now,
      endTime: tomorrow,
    },
  });
  await amalfiPkg.save();

  // Package 9: Iceland Tour
  const icelandPkg = new Package({
    title: 'Icelandic Aurora Quest',
    description: 'Chase the Northern Lights, dip in the Blue Lagoon, and tour the Golden Circle geysers and waterfalls.',
    price: 1350,
    totalInventory: 40,
    availableInventory: 40,
    flashSale: { isActive: false },
  });
  await icelandPkg.save();

  // Package 10: Kyoto Tour
  const kyotoPkg = new Package({
    title: 'Kyoto Golden Pavilion & Bamboo Groves',
    description: 'Walk through the towering Arashiyama bamboo path, visit the stunning Golden Pavilion (Kinkaku-ji), and experience a traditional tea ceremony.',
    price: 850,
    totalInventory: 40,
    availableInventory: 40,
    flashSale: { isActive: false },
  });
  await kyotoPkg.save();

  // Package 11: Rome Historic Escapade
  const romePkg = new Package({
    title: 'Rome Imperial History & Pasta Class',
    description: 'Skip-the-line access to the Colosseum and Vatican Museums, paired with a private hands-on Roman pasta making class in Trastevere.',
    price: 720,
    totalInventory: 60,
    availableInventory: 60,
    flashSale: { isActive: false },
  });
  await romePkg.save();

  // Package 12: Serengeti Wildlife Safari
  const serengetiPkg = new Package({
    title: 'Serengeti Great Migration Safari',
    description: 'Witness the iconic wildlife migration from a luxury tented camp with sunrise hot air balloon rides over the savannah plains.',
    price: 1899,
    totalInventory: 15,
    availableInventory: 15,
    flashSale: { isActive: false },
  });
  await serengetiPkg.save();

  // Package 13: New York City Explorer
  const newYorkPkg = new Package({
    title: 'New York Broadway & Rooftop Lights',
    description: 'VIP tickets to a top Broadway show, helicopter tour over Manhattan, and exclusive access to a high-end rooftop lounge in Manhattan.',
    price: 950,
    totalInventory: 50,
    availableInventory: 50,
    flashSale: { isActive: false },
  });
  await newYorkPkg.save();

  // Package 14: Norwegian Fjords (Flash Sale)
  const fjordPkg = new Package({
    title: 'Norwegian Fjords Midnight Sun Voyage',
    description: 'Cruise through majestic steep-cliffed Geirangerfjord, hike the scenic Trolltunga path, and sleep in cozy traditional timber cabins.',
    price: 1299,
    totalInventory: 12,
    availableInventory: 8,
    flashSale: {
      isActive: true,
      startTime: now,
      endTime: tomorrow,
    },
  });
  await fjordPkg.save();

  // Package 15: Sydney Escapade
  const sydneyPkg = new Package({
    title: 'Sydney Opera & Blue Mountains Odyssey',
    description: 'A private behind-the-scenes tour of the Sydney Opera House, luxury harbor cruise, and a guided trek through the Blue Mountains.',
    price: 880,
    totalInventory: 35,
    availableInventory: 35,
    flashSale: { isActive: false },
  });
  await sydneyPkg.save();

  // 4. Pre-seed Flash Sale Inventories to Redis
  const redisKeyMaldives = `inventory:${flashPkg._id}`;
  await redisClient.set(redisKeyMaldives, '5');
  console.log(`🔥 Pre-seeded Redis key [${redisKeyMaldives}] with count 5.`);

  const redisKeyAmalfi = `inventory:${amalfiPkg._id}`;
  await redisClient.set(redisKeyAmalfi, '10');
  console.log(`🔥 Pre-seeded Redis key [${redisKeyAmalfi}] with count 10.`);

  const redisKeyFjord = `inventory:${fjordPkg._id}`;
  await redisClient.set(redisKeyFjord, '8');
  console.log(`🔥 Pre-seeded Redis key [${redisKeyFjord}] with count 8.`);

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
  console.log(`- Amalfi Coast (Active Flash):  ${amalfiPkg._id}`);
  console.log(`- Norwegian Fjords (Active Flash): ${fjordPkg._id}`);
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
