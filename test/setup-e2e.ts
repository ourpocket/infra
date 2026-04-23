// ============================================================================
// E2E Test Setup
// ============================================================================
// Loads environment variables before tests run

import { config } from 'dotenv';
import { resolve } from 'path';

export default function setup() {
  // Load test environment variables
  const envPath = resolve(__dirname, '../.env.test');
  config({ path: envPath });

  console.log('E2E test environment loaded');
  console.log(`  DATABASE_HOST: ${process.env.DATABASE_HOST}`);
  console.log(`  DATABASE_PORT: ${process.env.DATABASE_PORT}`);
  console.log(`  DATABASE_NAME: ${process.env.DATABASE_NAME}`);
  console.log(`  REDIS_URL: ${process.env.REDIS_URL}`);
}
