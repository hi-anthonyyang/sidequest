import { NextResponse } from 'next/server';

export async function GET() {
  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      // Database
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      postgresUrlFormat: process.env.POSTGRES_URL ? 'postgres://' + process.env.POSTGRES_URL.substring(11, 20) + '...' : 'not set',
      databaseUrlFormat: process.env.DATABASE_URL ? 'postgres://' + process.env.DATABASE_URL.substring(11, 20) + '...' : 'not set',
      
      // Security
      hasAppHashSecret: !!process.env.APP_HASH_SECRET,
      appHashSecretLength: process.env.APP_HASH_SECRET ? process.env.APP_HASH_SECRET.length : 0,
      
      // OpenAI
      hasOpenaiKey: !!process.env.OPENAI_API_KEY,
      openaiKeyFormat: process.env.OPENAI_API_KEY ? 'sk-...' + process.env.OPENAI_API_KEY.slice(-4) : 'not set',
      
      // Models
      assessModel: process.env.OPENAI_ASSESS_MODEL || 'gpt-4o-mini (default)',
      fallbackModel: process.env.OPENAI_ASSESS_FALLBACK_MODEL || 'gpt-4o (default)',
      
      // Deployment
      isVercel: !!process.env.VERCEL,
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || process.env.SOURCE_VERSION || 'not set',
    },
    recommendations: [] as string[]
  };

  // Add recommendations
  if (!envCheck.environment.hasPostgresUrl && !envCheck.environment.hasDatabaseUrl) {
    envCheck.recommendations.push('❌ No database connection string found. Set POSTGRES_URL or DATABASE_URL');
  }
  
  if (!envCheck.environment.hasAppHashSecret) {
    envCheck.recommendations.push('⚠️ APP_HASH_SECRET not set. Student data will not be hashed');
  }
  
  if (!envCheck.environment.hasOpenaiKey) {
    envCheck.recommendations.push('❌ OPENAI_API_KEY not set. Assessments will fail');
  }

  if (envCheck.recommendations.length === 0) {
    envCheck.recommendations.push('✅ All required environment variables are configured');
  }

  return NextResponse.json(envCheck);
}
