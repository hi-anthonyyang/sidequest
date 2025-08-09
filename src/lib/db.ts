'use server';

import { neon } from '@neondatabase/serverless';

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

export function getSql() {
  if (!connectionString) {
    throw new Error('Database connection string not configured');
  }
  return neon(connectionString);
}


