import mongoose from 'mongoose';
import { createClient } from 'redis';
import app from '../app';
import { connectDB } from '../config/db';
import { connectRedis, redisClient } from '../config/redis';
import { User } from '../modules/auth/user.model';
import { Package } from '../modules/packages/package.model';
import { Booking } from '../modules/bookings/booking.model';
import { AuthService } from '../modules/auth/auth.service';
import { env } from '../config/environment';

const PORT = 5001;

const simulate = async () => {
  console.log('⚡ Starting Concurrency Race Condition Simulation...');

  // Connect DB & Redis
  await connectDB();
  await connectRedis();

  // Start temporary server
  const server = app.listen(PORT, () => {
    console.log(`📡 Temporary Test Server running on port ${PORT}`);
  });

  try {
    // 1. Setup Test Package (Allotment = 3)
    console.log('📦 Resetting inventory to 3 for testing...');
    await Package.deleteMany({ title: 'Simulated Maldives Package' });
    const pkg = new Package({
      title: 'Simulated Maldives Package',
      description: 'Test package for concurrent bookings.',
      price: 500,
      totalInventory: 10,
      availableInventory: 3, // Only 3 units available
      flashSale: {
        isActive: true,
        startTime: new Date(Date.now() - 60000), // Active now
        endTime: new Date(Date.now() + 3600000), // Expirable in 1 hr
      },
    });
    await pkg.save();

    // Reset Redis
    const redisInventoryKey = `inventory:${pkg._id}`;
    await redisClient.set(redisInventoryKey, '3');
    console.log(`🔥 Pre-seeded Redis key [${redisInventoryKey}] with count 3.`);

    // 2. Generate 10 distinct users and sign them in to fetch JWT headers
    console.log('👤 Creating 10 dummy users and signing them in...');
    const userTokens: string[] = [];
    
    // Purge previous simulated users
    await User.deleteMany({ email: /.*@simulation\.com/ });
    await Booking.deleteMany({ packageId: pkg._id });

    for (let i = 1; i <= 10; i++) {
      const email = `user${i}@simulation.com`;
      const user = new User({
        name: `Sim User ${i}`,
        email,
        passwordHash: 'pass123',
      });
      await user.save();

      const tokens = AuthService.generateTokens(user);
      userTokens.push(tokens.accessToken);
    }
    console.log('🔑 Signed in 10 test users.');

    // 3. Dispatch 10 concurrent HTTP bookings requests
    console.log(`🚀 Dispatching 10 concurrent requests to POST /api/v1/bookings on port ${PORT}...`);
    
    const requestPromises = userTokens.map(async (token, idx) => {
      try {
        const response = await fetch(`http://localhost:${PORT}/api/v1/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ packageId: pkg._id }),
        });

        const status = response.status;
        const data = await response.json();
        return { userIndex: idx + 1, status, data };
      } catch (err: any) {
        return { userIndex: idx + 1, status: 500, error: err.message };
      }
    });

    const results = await Promise.all(requestPromises);

    // 4. Analyze Results
    console.log('\n📊 Simulation Results Analysis:');
    console.log('--------------------------------------------------');
    
    let successCount = 0;
    let failureCount = 0;

    results.forEach((res) => {
      if (res.status === 201) {
        successCount++;
        console.log(`✅ User ${res.userIndex}: SUCCESS (Status 201) -> Booking hold established.`);
      } else {
        failureCount++;
        console.log(`❌ User ${res.userIndex}: FAILED (Status ${res.status}) -> ${res.data?.message || res.error}`);
      }
    });

    console.log('--------------------------------------------------');
    console.log(`Summary: Successful Bookings: ${successCount} | Failed Bookings: ${failureCount}`);

    // Verify constraints
    const redisInventoryVal = await redisClient.get(redisInventoryKey);
    const dbBookingsCount = await Booking.countDocuments({ packageId: pkg._id });
    
    console.log(`Redis Available inventory left: ${redisInventoryVal}`);
    console.log(`MongoDB Booking hold documents created: ${dbBookingsCount}`);

    if (successCount === 3 && failureCount === 7 && dbBookingsCount === 3 && redisInventoryVal === '0') {
      console.log('\n🌟 SUCCESS: Concurrency verification checks passed perfectly!');
      console.log('No overselling occurred, and exactly the available allotments were reserved.');
    } else {
      console.error('\n🚨 FAILURE: Concurrency validation failed!');
      console.error(`Checks: successCount=3 (${successCount}), failureCount=7 (${failureCount}), dbBookingsCount=3 (${dbBookingsCount}), redisVal=0 (${redisInventoryVal})`);
    }

  } catch (error) {
    console.error('❌ Error during simulation:', error);
  } finally {
    // Close resources
    server.close(async () => {
      console.log('📡 Test server closed.');
      await mongoose.disconnect();
      await redisClient.quit();
      console.log('🔌 Connections closed.');
      process.exit(0);
    });
  }
};

simulate();
