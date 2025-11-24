/**
 * Jest Setup
 * Loads environment variables for tests
 * MUST run before any Prisma imports
 */

// Load env vars SYNCHRONOUSLY before any imports
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });

console.log('[Jest Setup] Loaded environment variables');
console.log('[Jest Setup] Database configured:', !!process.env.DATABASE_URL);
console.log('[Jest Setup] Stripe configured:', !!process.env.STRIPE_SECRET_KEY);
