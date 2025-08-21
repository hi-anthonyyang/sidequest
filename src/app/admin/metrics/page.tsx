import { headers, cookies } from 'next/headers';
import LoginForm from '@/app/admin/LoginForm';
import { getAssessStats } from '@/lib/metrics';
import { getAssessStatsDb } from '@/lib/metricsStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminMetricsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  // Server-side guard (defense-in-depth in case middleware is bypassed)
  const h = await headers();
  const authHeader = h.get('authorization') || '';
  const expectedUser = (process.env.ADMIN_BASIC_USER || '').trim();
  const expectedPass = (process.env.ADMIN_BASIC_PASS || '').trim();
  let authorized = false;
  // Cookie-based session from login API
  const cookieStore = await cookies();
  const hasCookie = cookieStore.get('admin_auth')?.value === 'ok';
  if (hasCookie) authorized = true;
  if (expectedUser && expectedPass) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic' && encoded) {
      try {
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const sep = decoded.indexOf(':');
        const user = sep >= 0 ? decoded.slice(0, sep) : '';
        const pass = sep >= 0 ? decoded.slice(sep + 1) : '';
        authorized = user === expectedUser && pass === expectedPass;
      } catch {}
    }
  }
  if (!authorized) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm border border-gray-200 rounded-lg p-6 shadow-sm bg-white">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">Admin Login</h1>
          <LoginForm />
        </div>
      </main>
    );
  }

  const sp = await searchParams;
  const range = typeof sp.range === 'string' ? sp.range : 'today';
  const ranges: Record<string, number | undefined> = {
    today: 24 * 60 * 60 * 1000,
    last3d: 3 * 24 * 60 * 60 * 1000,
    last5d: 5 * 24 * 60 * 60 * 1000,
    last30d: 30 * 24 * 60 * 60 * 1000,
    all: undefined,
  };
  // Prefer persistent DB stats; fall back to in-memory if DB unavailable
  let assessStats = { count: 0, errors: 0, p50Ms: 0, p95Ms: 0, totalPromptTokens: 0, totalCompletionTokens: 0 };
  try {
    const now = new Date();
    const ms = ranges[range];
    const from = typeof ms === 'number' ? new Date(now.getTime() - ms) : undefined;
    assessStats = await getAssessStatsDb(from, now);
  } catch {
    const mem = getAssessStats(ranges[range]);
    assessStats = { ...mem, totalPromptTokens: 0, totalCompletionTokens: 0 };
  }
  const stats = { assess: assessStats };
  return (
    <main className="min-h-screen bg-white p-6">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Admin Metrics</h1>
        <div className="mb-4 flex items-center gap-2 text-sm">
          <a className={`px-3 py-1 rounded ${range==='today'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700'}`} href="?range=today">Today</a>
          <a className={`px-3 py-1 rounded ${range==='last3d'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700'}`} href="?range=last3d">Last 3 days</a>
          <a className={`px-3 py-1 rounded ${range==='last5d'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700'}`} href="?range=last5d">Last 5 days</a>
          <a className={`px-3 py-1 rounded ${range==='last30d'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700'}`} href="?range=last30d">Last 30 days</a>
          <a className={`px-3 py-1 rounded ${range==='all'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700'}`} href="?range=all">All time</a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Assessment Completions</div>
            <div className="text-2xl font-bold">{stats.assess.count.toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-1">Interest-First workflow</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Median Response Time</div>
            <div className="text-2xl font-bold">{stats.assess.p50Ms} ms</div>
            <div className="text-xs text-gray-400 mt-1">50th percentile</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">95th Percentile</div>
            <div className="text-2xl font-bold">{stats.assess.p95Ms} ms</div>
            <div className="text-xs text-gray-400 mt-1">Response time</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Failed Requests</div>
            <div className="text-2xl font-bold text-red-600">{stats.assess.errors}</div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.assess.count > 0 ? `${((stats.assess.errors / stats.assess.count) * 100).toFixed(1)}% error rate` : '0% error rate'}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 md:col-span-2">
            <div className="text-sm text-gray-500">LLM Token Usage</div>
            <div className="text-2xl font-bold">{stats.assess.totalPromptTokens.toLocaleString()} / {stats.assess.totalCompletionTokens.toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-1">
              Prompt / Completion tokens • Total: {(stats.assess.totalPromptTokens + stats.assess.totalCompletionTokens).toLocaleString()}
            </div>
          </div>
        </div>
        
        {/* Workflow & System Status */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-sm text-gray-500">Current Workflow</div>
              <div className="text-lg font-semibold text-green-600">Interest-First</div>
              <div className="text-xs text-gray-400 mt-1">
                Student interests → O*NET careers → University majors → Personalized connections
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-sm text-gray-500">Database Status</div>
              <div className="text-lg font-semibold">
                {stats.assess.count > 0 ? (
                  <span className="text-green-600">Connected ✓</span>
                ) : (
                  <span className="text-yellow-600">No recent data</span>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {stats.assess.count > 0 
                  ? `Last recorded: ${stats.assess.count} assessments` 
                  : 'Check /api/test-db for connection status'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


