import { execSync } from 'child_process';

console.log('🚀 Starting Chillers POS...');

// Try database setup, but don't fail if it doesn't work
try {
  console.log('🔧 Setting up database...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Use regular db push to preserve existing data - NO SEEDING
  execSync('npx prisma db push', { stdio: 'inherit' });
  
  console.log('✅ Database ready - existing data preserved!');
  
  // Run category migrations to update database items
  try {
    console.log('Running category migrations...');
    execSync('node update-drinks-category.js', { stdio: 'inherit' });
    console.log('Category migration complete.');
  } catch (migErr) {
    console.log('Category migration skipped:', migErr.message);
  }
} catch (error) {
  console.log('⚠️ Database setup failed, starting server anyway...');
}

console.log('🌐 Starting server...');
execSync('node server/index.js', { stdio: 'inherit' });
