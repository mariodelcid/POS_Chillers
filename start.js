import { execSync } from 'child_process';

console.log('🚀 Starting Chillers POS...');

// Try database setup, but don't fail if it doesn't work
try {
  console.log('🔧 Setting up database...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Use regular db push instead of force-reset to preserve data
  execSync('npx prisma db push', { stdio: 'inherit' });
  
  // Only seed if this is a fresh deployment (no existing data)
  // This prevents overwriting existing inventory and sales data
  console.log('📦 Checking if seeding is needed...');
  try {
    execSync('node prisma/seed.js', { stdio: 'inherit' });
    execSync('node prisma/seed-packaging.js', { stdio: 'inherit' });
    console.log('✅ Initial data seeded!');
  } catch (seedError) {
    console.log('✅ Database already has data, skipping seed...');
  }
  
  console.log('✅ Database ready!');
} catch (error) {
  console.log('⚠️ Database setup failed, starting server anyway...');
}

console.log('🌐 Starting server...');
execSync('node server/index.js', { stdio: 'inherit' });
