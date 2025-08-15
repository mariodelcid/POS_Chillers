import { execSync } from 'child_process';

console.log('🚀 Starting Chillers POS...');

// Try database setup, but don't fail if it doesn't work
try {
  console.log('🔧 Setting up database...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  execSync('npx prisma db push', { stdio: 'inherit' });
  execSync('node prisma/seed.js', { stdio: 'inherit' });
  execSync('node prisma/seed-packaging.js', { stdio: 'inherit' });
  console.log('✅ Database ready!');
} catch (error) {
  console.log('⚠️ Database setup failed, starting server anyway...');
}

console.log('🌐 Starting server...');
execSync('node server/index.js', { stdio: 'inherit' });
