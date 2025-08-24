import { execSync } from 'child_process';

console.log('⚠️ WARNING: This will DELETE ALL DATA from your database!');
console.log('⚠️ Only use this when you want to start fresh or make major schema changes.');
console.log('⚠️ Press Ctrl+C to cancel, or wait 5 seconds to continue...');

// Wait 5 seconds to give user time to cancel
setTimeout(() => {
  try {
    console.log('🗑️ Resetting database...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
    execSync('node prisma/seed.js', { stdio: 'inherit' });
    execSync('node prisma/seed-packaging.js', { stdio: 'inherit' });
    console.log('✅ Database reset complete!');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
  }
}, 5000);
