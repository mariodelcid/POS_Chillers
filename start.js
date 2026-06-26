import { execSync } from 'child_process';
console.log('🚀 Starting Chillers POS...');

const run = (cmd) => {
  try {
    console.log('▶ ' + cmd);
    execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    console.error('⚠️ Failed: ' + cmd + '\n' + err.message);
  }
};

run('npx prisma generate');
run('npx prisma db push --accept-data-loss');
run('node prisma/seed.js');
run('node prisma/seed-packaging.js');

console.log('🌐 Starting server...');
execSync('node server/index.js', { stdio: 'inherit' });
