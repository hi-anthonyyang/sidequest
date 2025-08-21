import { NextResponse } from 'next/server';
import { saveAssessmentRecord } from '@/lib/assessStore';
import { saveAssessmentMetric } from '@/lib/metricsStore';
import { testDatabaseConnection } from '@/lib/db';

interface TestResult {
  success: boolean;
  error: string | null;
}

interface Diagnostics {
  timestamp: string;
  environment: {
    hasPostgresUrl: boolean;
    hasDatabaseUrl: boolean;
    hasAppHashSecret: boolean;
    hasOpenaiKey: boolean;
  };
  tests: {
    databaseConnection?: TestResult;
    assessmentSave?: TestResult;
    metricsSave?: TestResult;
  };
}

export async function POST() {
  const diagnostics: Diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasAppHashSecret: !!process.env.APP_HASH_SECRET,
      hasOpenaiKey: !!process.env.OPENAI_API_KEY,
    },
    tests: {}
  };

  // Test 1: Database Connection
  try {
    const isConnected = await testDatabaseConnection();
    diagnostics.tests.databaseConnection = {
      success: isConnected,
      error: isConnected ? null : 'Connection failed'
    };
  } catch (error) {
    diagnostics.tests.databaseConnection = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Test 2: Assessment Record Save
  try {
    const testRecord = {
      universityId: 'fresno_city_college',
      answersJson: [
        { "answer": "Playing", "questionId": 1 },
        { "answer": "Team", "questionId": 2 },
        { "answer": "Winning", "questionId": 3 },
        { "answer": "Competition", "questionId": 4 },
        { "answer": "How to win", "questionId": 5 },
        { "answer": "Researching", "questionId": 6 }
      ],
      resultJson: {
        majors: [
          {
            name: "Test Major",
            department: "Test Department",
            description: "Test description"
          }
        ],
        careers: [],
        organizations: [],
        events: [],
        archetype: "Test Archetype"
      },
      model: 'gpt-4o-mini',
      promptTokens: 100,
      completionTokens: 50,
      latencyMs: 1500,
      success: true,
      emailHash: null,
      studentIdHash: null,
      emailDomain: null
    };

    await saveAssessmentRecord(testRecord);
    diagnostics.tests.assessmentSave = {
      success: true,
      error: null
    };
  } catch (error) {
    diagnostics.tests.assessmentSave = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Test 3: Metrics Save
  try {
    await saveAssessmentMetric({
      universityId: 'fresno_city_college',
      latencyMs: 1500,
      success: true,
      model: 'gpt-4o-mini',
      promptTokens: 100,
      completionTokens: 50,
      commitSha: 'test-commit'
    });
    diagnostics.tests.metricsSave = {
      success: true,
      error: null
    };
  } catch (error) {
    diagnostics.tests.metricsSave = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  return NextResponse.json(diagnostics);
}
