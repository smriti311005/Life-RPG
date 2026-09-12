import 'dotenv/config';
import mongoose from 'mongoose';

import { connectDatabase } from '../config/db.js';
import { seedGameData } from '../services/gameData.js';

/**
 * Write the shipped definitions in `game/defaults.js` into MongoDB.
 *
 *   npm run seed:game            fill only what is missing
 *   npm run seed:game -- --force overwrite every definition
 *
 * Without --force, a price you edited in the database survives a redeploy.
 */
const force = process.argv.includes('--force');

async function run() {
  await connectDatabase(process.env.MONGODB_URI);

  const written = await seedGameData({ force });

  console.log(
    written.length
      ? `[game] ${force ? 'overwrote' : 'seeded'}: ${written.join(', ')}`
      : '[game] nothing to do — every collection already has documents (use --force to overwrite)',
  );

  await mongoose.connection.close();
}

run().catch(async (error) => {
  console.error('[game] seed failed:', error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
