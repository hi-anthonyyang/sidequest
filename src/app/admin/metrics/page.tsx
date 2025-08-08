import { getAssessStats } from '@/lib/metrics';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AdminMetricsPage() {
  const stats = { assess: getAssessStats() };
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
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


