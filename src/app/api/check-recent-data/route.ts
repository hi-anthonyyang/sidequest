import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET() {
  try {
    const sql = getSql();
    
    // Get recent assessments (last 24 hours)
    const recentAssessments = await sql`
      SELECT 
        id,
        created_at,
        university_id,
        model,
        success,
        latency_ms,
        prompt_tokens,
        completion_tokens,
        jsonb_array_length(answers_json) as answer_count
      FROM assessments 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    // Get recent metrics (last 24 hours)
    const recentMetrics = await sql`
      SELECT 
        id,
        created_at,
        university_id,
        model,
        success,
        latency_ms,
        prompt_tokens,
        completion_tokens
      FROM assessment_metrics 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    // Get total counts
    const totalCounts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM assessments) as total_assessments,
        (SELECT COUNT(*) FROM assessment_metrics) as total_metrics,
        (SELECT COUNT(*) FROM assessments WHERE created_at >= NOW() - INTERVAL '24 hours') as recent_assessments,
        (SELECT COUNT(*) FROM assessment_metrics WHERE created_at >= NOW() - INTERVAL '24 hours') as recent_metrics
    `;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totals: totalCounts[0],
      recentAssessments: recentAssessments,
      recentMetrics: recentMetrics
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
