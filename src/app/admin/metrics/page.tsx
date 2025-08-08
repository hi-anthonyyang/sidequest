import { headers } from 'next/headers';
import { getAssessStats } from '@/lib/metrics';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminMetricsPage() {
  // Server-side guard (defense-in-depth in case middleware is bypassed)
  const h = await headers();
  const authHeader = h.get('authorization') || '';
  const expectedUser = (process.env.ADMIN_BASIC_USER || '').trim();
  const expectedPass = (process.env.ADMIN_BASIC_PASS || '').trim();
  let authorized = false;
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
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Unauthorized</div>
      </main>
    );
  }

  const stats = { assess: getAssessStats() };
  return (
    <main className="min-h-screen bg-white p-6">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Admin Metrics</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Assess requests</div>
            <div className="text-2xl font-bold">{stats.assess.count.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">p50 latency</div>
            <div className="text-2xl font-bold">{stats.assess.p50Ms} ms</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">p95 latency</div>
            <div className="text-2xl font-bold">{stats.assess.p95Ms} ms</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 md:col-span-3">
            <div className="text-sm text-gray-500">Errors</div>
            <div className="text-2xl font-bold">{stats.assess.errors}</div>
          </div>
        </div>
      </div>
    </main>
  );
}


