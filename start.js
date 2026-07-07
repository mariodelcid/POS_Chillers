import { execSync } from 'child_process';

console.log('Starting Chillers POS...');

try {
  console.log('Setting up database...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('Database ready - existing data preserved!');
} catch (error) {
  console.log('Database setup failed, starting server anyway...', error.message);
}

console.log('Starting server...');
execSync('node server/index.js', { stdio: 'inherit' });
