/**
 * Quick script to check if OAuth environment variables are loaded
 * Run with: node check-env.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from backend directory
const envPath = join(__dirname, '.env');
dotenv.config({ path: envPath });

console.log('\n=== Environment Variables Check ===\n');
console.log('Looking for .env file at:', envPath);
console.log('.env file exists:', existsSync(envPath));

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  const hasGoogleClientId = envContent.includes('GOOGLE_CLIENT_ID');
  const hasGoogleClientSecret = envContent.includes('GOOGLE_CLIENT_SECRET');
  
  console.log('\n.env file contains:');
  console.log('  GOOGLE_CLIENT_ID:', hasGoogleClientId ? '✓ Found' : '✗ Missing');
  console.log('  GOOGLE_CLIENT_SECRET:', hasGoogleClientSecret ? '✓ Found' : '✗ Missing');
  
  // Check if values are set (not empty)
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  console.log('\nLoaded values:');
  console.log('  GOOGLE_CLIENT_ID:', googleClientId ? `✓ Set (${googleClientId.length} chars)` : '✗ Not set or empty');
  console.log('  GOOGLE_CLIENT_SECRET:', googleClientSecret ? `✓ Set (${googleClientSecret.length} chars)` : '✗ Not set or empty');
  
  if (googleClientId && googleClientId.includes('your_')) {
    console.log('\n⚠️  WARNING: GOOGLE_CLIENT_ID still contains placeholder text!');
  }
  if (googleClientSecret && googleClientSecret.includes('your_')) {
    console.log('\n⚠️  WARNING: GOOGLE_CLIENT_SECRET still contains placeholder text!');
  }
} else {
  console.log('\n❌ .env file not found!');
  console.log('Please create a .env file in the backend directory with:');
  console.log('  GOOGLE_CLIENT_ID=your_client_id');
  console.log('  GOOGLE_CLIENT_SECRET=your_client_secret');
}

console.log('\n=== End Check ===\n');
