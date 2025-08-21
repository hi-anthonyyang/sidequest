import { neon } from '@neondatabase/serverless';

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

export function getSql() {
  if (!connectionString) {
    throw new Error('Database connection string not configured');
  }
  return neon(connectionString);
}

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const sql = getSql();
    await sql`SELECT 1 as test`;
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}


