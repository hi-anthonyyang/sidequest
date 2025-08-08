import { headers, cookies } from 'next/headers';
import LoginForm from '@/app/admin/LoginForm';
import { getAssessStats } from '@/lib/metrics';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminMetricsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
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

  const sp = searchParams || {};
  const range = typeof sp.range === 'string' ? sp.range : 'today';
  const ranges: Record<string, number | undefined> = {
    today: 24 * 60 * 60 * 1000,
    last3d: 3 * 24 * 60 * 60 * 1000,
    last5d: 5 * 24 * 60 * 60 * 1000,
    last30d: 30 * 24 * 60 * 60 * 1000,
    all: undefined,
  };
  const stats = { assess: getAssessStats(ranges[range]) };
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


