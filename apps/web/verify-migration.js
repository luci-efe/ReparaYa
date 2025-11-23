/**
 * Verification script for contractor services migration
 * Run this after applying the migration to verify tables and data
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function verifyMigration() {
  console.log('🔍 Verifying contractor services migration...\n');

  try {
    // 1. Check ServiceCategory table and count
    console.log('1️⃣  Checking ServiceCategory table...');
    const categoryCount = await prisma.serviceCategory.count();
    console.log(`   ✅ service_categories table exists`);
    console.log(`   📊 Found ${categoryCount} categories`);

    if (categoryCount > 0) {
      const rootCategories = await prisma.serviceCategory.findMany({
        where: { parentId: null },
        select: { id: true, name: true, slug: true },
      });
      console.log(`   📁 Root categories: ${rootCategories.length}`);
      rootCategories.forEach((cat) => {
        console.log(`      - ${cat.name} (${cat.slug})`);
      });
    } else {
      console.log('   ⚠️  No categories found - seed data missing');
    }

    // 2. Check ServiceImage table
    console.log('\n2️⃣  Checking ServiceImage table...');
    const imageCount = await prisma.serviceImage.count();
    console.log(`   ✅ service_images table exists`);
    console.log(`   📊 Found ${imageCount} images`);

    // 3. Check Service table has new fields
    console.log('\n3️⃣  Checking Service table updates...');
    const serviceCount = await prisma.service.count();
    console.log(`   ✅ Service table accessible`);
    console.log(`   📊 Found ${serviceCount} services`);

    if (serviceCount > 0) {
      // Check if new fields are present
      const sampleService = await prisma.service.findFirst({
        select: {
          id: true,
          title: true,
          description: true,
          visibilityStatus: true,
          currency: true,
          durationMinutes: true,
        },
      });
      if (sampleService) {
        console.log('   ✅ New fields present:');
        console.log(`      - title: ${sampleService.title ? '✓' : '✗'}`);
        console.log(`      - description: ${sampleService.description ? '✓' : '✗'}`);
        console.log(`      - visibilityStatus: ${sampleService.visibilityStatus ? '✓' : '✗'}`);
        console.log(`      - currency: ${sampleService.currency ? '✓' : '✗'}`);
        console.log(`      - durationMinutes: ${sampleService.durationMinutes ? '✓' : '✗'}`);
      }
    }

    // 4. Test creating a service category
    console.log('\n4️⃣  Testing ServiceCategory operations...');
    const testCat = await prisma.serviceCategory.findFirst({
      where: { slug: 'plomeria' },
    });
    if (testCat) {
      console.log(`   ✅ Can query categories: ${testCat.name}`);
    } else {
      console.log('   ⚠️  Could not find test category "plomeria"');
    }

    // 5. Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 Migration Verification Summary:');
    console.log('='.repeat(50));
    console.log(`✅ service_categories table: EXISTS (${categoryCount} rows)`);
    console.log(`✅ service_images table: EXISTS (${imageCount} rows)`);
    console.log(`✅ Service table: UPDATED (${serviceCount} rows)`);
    console.log('='.repeat(50));

    if (categoryCount === 0) {
      console.log('\n⚠️  WARNING: No categories found!');
      console.log('   Run: npm run db:seed');
      console.log('   Or manually insert seed data from prisma/seeds/');
    } else {
      console.log('\n✅ Migration verified successfully!');
    }

  } catch (error) {
    console.error('\n❌ Verification failed:');
    console.error(error.message);

    if (error.code === 'P2021') {
      console.error('\n💡 The table does not exist in the database.');
      console.error('   Please run the migration script:');
      console.error('   1. Open Supabase SQL Editor');
      console.error('   2. Run: manual-migration.sql');
      console.error('   3. Or use: npx prisma db push');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration();
