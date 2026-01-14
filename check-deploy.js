#!/usr/bin/env node

/**
 * Pre-deployment checklist for Render
 * Run with: node check-deploy.js
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Checking Render deployment readiness...\n');

let hasErrors = false;

// Check Node version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
console.log(`✓ Node version: ${nodeVersion}`);
if (majorVersion < 18) {
  console.error('⚠️  Warning: Node 18+ recommended for Render');
}

// Check package.json files
const checks = [
  { file: 'package.json', desc: 'Frontend package.json' },
  { file: 'server/package.json', desc: 'Server package.json' },
  { file: 'render.yaml', desc: 'Render configuration' },
  { file: 'server/.env.production', desc: 'Production environment template' },
];

checks.forEach(({ file, desc }) => {
  if (fs.existsSync(file)) {
    console.log(`✓ ${desc} exists`);
  } else {
    console.error(`✗ ${desc} missing: ${file}`);
    hasErrors = true;
  }
});

// Check for sensitive files that shouldn't be committed
const sensitiveFiles = [
  '.env',
  'server/.env',
  'server/data.db',
];

console.log('\n🔒 Checking for sensitive files...');
sensitiveFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`⚠️  Found ${file} - ensure it's in .gitignore`);
  }
});

// Check gitignore
if (fs.existsSync('.gitignore')) {
  const gitignore = fs.readFileSync('.gitignore', 'utf-8');
  if (gitignore.includes('.env') && gitignore.includes('data.db')) {
    console.log('✓ .gitignore configured correctly');
  } else {
    console.error('⚠️  .gitignore may be missing .env or data.db entries');
  }
}

// Check server dependencies
console.log('\n📦 Checking dependencies...');
const serverPkg = JSON.parse(fs.readFileSync('server/package.json', 'utf-8'));
const requiredDeps = ['express', 'better-sqlite3', 'dotenv', 'jsonwebtoken', 'bcryptjs', 'cors'];
const missing = requiredDeps.filter(dep => !serverPkg.dependencies[dep]);
if (missing.length === 0) {
  console.log('✓ All required server dependencies present');
} else {
  console.error(`✗ Missing dependencies: ${missing.join(', ')}`);
  hasErrors = true;
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('❌ Deployment readiness check FAILED');
  console.error('Please fix the errors above before deploying to Render.');
  process.exit(1);
} else {
  console.log('✅ Deployment readiness check PASSED');
  console.log('\nNext steps:');
  console.log('1. Commit and push to GitHub');
  console.log('2. Connect your repo to Render');
  console.log('3. Set environment variables in Render dashboard');
  console.log('4. Deploy!\n');
  console.log('See RENDER_DEPLOY.md for detailed instructions.');
}
