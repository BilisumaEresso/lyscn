/**
 * LayoScan — Database Image URL Cleanup Script
 * 
 * Usage:
 *   node scripts/clear-urls.js            (clears all non-Cloudinary / external pasted URLs)
 *   node scripts/clear-urls.js --all      (clears all image URLs regardless of host to start completely fresh)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Restaurant = require('../src/models/Restaurant');
const Product = require('../src/models/Product');

const CLOUDINARY_PREFIX = 'https://res.cloudinary.com/';

async function run() {
  const isWipeAll = process.argv.includes('--all');
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('❌ Error: MONGO_URI environment variable is missing.');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected.\n');

  console.log(`📋 Cleanup Mode: ${isWipeAll ? 'WIPE ALL (reset all image fields)' : 'CLEAR NON-CLOUDINARY (pasted external URLs only)'}`);
  console.log('------------------------------------------------------------');

  let restaurantsUpdated = 0;
  let productsUpdated = 0;

  // 1. Process Restaurants (logoUrl & coverUrl)
  const restaurants = await Restaurant.find({});
  for (const r of restaurants) {
    let modified = false;

    if (r.logoUrl) {
      const isExternal = !r.logoUrl.startsWith(CLOUDINARY_PREFIX);
      if (isWipeAll || isExternal) {
        console.log(`[Restaurant "${r.name}"] Clearing logoUrl: ${r.logoUrl}`);
        r.logoUrl = null;
        modified = true;
      }
    }

    if (r.coverUrl) {
      const isExternal = !r.coverUrl.startsWith(CLOUDINARY_PREFIX);
      if (isWipeAll || isExternal) {
        console.log(`[Restaurant "${r.name}"] Clearing coverUrl: ${r.coverUrl}`);
        r.coverUrl = null;
        modified = true;
      }
    }

    if (modified) {
      await r.save();
      restaurantsUpdated++;
    }
  }

  // 2. Process Products (imageUrl)
  const products = await Product.find({ imageUrl: { $ne: null } });
  for (const p of products) {
    if (p.imageUrl) {
      const isExternal = !p.imageUrl.startsWith(CLOUDINARY_PREFIX);
      if (isWipeAll || isExternal) {
        console.log(`[Product "${p.name}"] Clearing imageUrl: ${p.imageUrl}`);
        p.imageUrl = null;
        await p.save();
        productsUpdated++;
      }
    }
  }

  console.log('------------------------------------------------------------');
  console.log(`✅ Cleanup completed successfully.`);
  console.log(`   Restaurants updated: ${restaurantsUpdated}`);
  console.log(`   Products updated:    ${productsUpdated}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
}

run().catch((err) => {
  console.error('❌ Fatal cleanup error:', err);
  process.exit(1);
});
