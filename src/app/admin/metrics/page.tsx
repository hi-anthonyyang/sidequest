"use client";
import { useEffect, useState } from "react";

type Stats = {
  assess: { count: number; p50Ms: number; p95Ms: number; errors: number };
};

export default function AdminMetricsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/metrics");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setStats(await res.json());
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Admin Metrics</h1>

        {loading && <div className="text-gray-600">Loading…</div>}
        {error && <div className="text-red-600">{error}</div>}

        {stats && (
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
        )}
      </div>
    </main>
  );
}


