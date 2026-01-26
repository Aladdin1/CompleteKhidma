/**
 * Database test helpers.
 * Use test DB when DATABASE_URL_TEST or DB_NAME=*_test is set.
 */

import pool from '../../src/config/database.js';

export async function setupTestDB() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function teardownTestDB() {
  // Do not end pool – same instance used by app and other tests.
}

/**
 * Clear test data (optional). Use schema-specific truncation if needed.
 */
export async function clearTestData() {
  // Auth uses in-memory OTP store; cleared in setup beforeEach.
}
