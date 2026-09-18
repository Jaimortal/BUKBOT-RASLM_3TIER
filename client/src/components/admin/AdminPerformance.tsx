import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProcessUsage = { cpuPercent: number; ramMb: number; count: number };
type Snapshot = {
  timestamp: string;
  cpuPercent: number;
  usedRamMb: number;
  totalRamMb: number;
  activeRequests: number;
  processes: Record<string, ProcessUsage>;
};
type RequestTiming = {
  id: string;
  sessionKey: string | null;
  timestamp: string;
  durationMs: number;
  rasaMs: number | null;
  status: number;
  fallback: boolean;
};
type PerformanceReport = { latest: Snapshot | null; requests: RequestTiming[]; resources: Snapshot[] };

async function fetchPerformance(): Promise<PerformanceReport> {
  const token = localStorage.getItem("adminToken");
  const response = await fetch("/api/admin/performance", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("Performance data unavailable");
  const body = await response.json();
  return body.data;
}

function percent(value: number | undefined) {
  return value === undefined ? "-" : `${Math.round(value)}%`;
}

function memory(value: number | undefined) {
  return value === undefined ? "-" : `${Math.round(value)} MB`;
}

export function AdminPerformance() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["adminPerformance"],
    queryFn: fetchPerformance,
    refetchInterval: 30000,
  });
  const latest = data?.latest;
  const requests = data?.requests ?? [];
  const completed = requests.filter((item) => item.status === 200);
  const sorted = completed.map((item) => item.durationMs).sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.ceil(sorted.length * 0.95) - 1] : null;

  return (
    <section className="space-y-4 border-t pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-700" />
          <h2 className="text-lg font-semibold">System Performance</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading performance data...</p> : null}
      {isError ? <p className="text-sm text-red-700">Performance data could not be loaded.</p> : null}
      {latest ? (
        <>
          <div className="grid gap-3 sm:grid-cols-4 text-sm">
            <div className="border p-3"><div className="text-muted-foreground">System CPU</div><div className="text-xl font-semibold">{percent(latest.cpuPercent)}</div></div>
            <div className="border p-3"><div className="text-muted-foreground">System RAM</div><div className="text-xl font-semibold">{memory(latest.usedRamMb)} / {memory(latest.totalRamMb)}</div></div>
            <div className="border p-3"><div className="text-muted-foreground">Requests in progress</div><div className="text-xl font-semibold">{latest.activeRequests}</div></div>
            <div className="border p-3"><div className="text-muted-foreground">Recent p95 latency</div><div className="text-xl font-semibold">{p95 === null ? "-" : `${(p95 / 1000).toFixed(1)} s`}</div></div>
          </div>
          <p className="text-xs text-muted-foreground">Sampled {new Date(latest.timestamp).toLocaleString()}. CPU and RAM are shared process measurements, not usage by an individual student. A dash means the process was not detected.</p>
          <div className="overflow-x-auto border">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-slate-50 text-left"><tr><th className="p-2">Process</th><th className="p-2">Instances</th><th className="p-2">CPU</th><th className="p-2">RAM</th></tr></thead>
              <tbody>{Object.entries(latest.processes).map(([name, item]) => (
                <tr key={name} className="border-t"><td className="p-2 capitalize">{name === "node" ? "Web server (Node)" : name}</td><td className="p-2">{item.count}</td><td className="p-2">{item.count ? percent(item.cpuPercent) : "-"}</td><td className="p-2">{item.count ? memory(item.ramMb) : "-"}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <div className="overflow-x-auto border">
            <table className="w-full min-w-[650px] text-sm">
              <thead className="bg-slate-50 text-left"><tr><th className="p-2">Time</th><th className="p-2">Session</th><th className="p-2">Request ID</th><th className="p-2">Total</th><th className="p-2">Rasa call</th><th className="p-2">Status</th></tr></thead>
              <tbody>{requests.slice(0, 30).map((item) => (
                <tr key={item.id} className="border-t"><td className="p-2">{new Date(item.timestamp).toLocaleString()}</td><td className="p-2 font-mono text-xs">{item.sessionKey || "-"}</td><td className="p-2 font-mono text-xs">{item.id.slice(0, 8)}</td><td className="p-2">{(item.durationMs / 1000).toFixed(2)} s</td><td className="p-2">{item.rasaMs === null ? "-" : `${(item.rasaMs / 1000).toFixed(2)} s`}</td><td className="p-2">{item.status}{item.fallback ? " / fallback" : ""}</td></tr>
              ))}</tbody>
            </table>
            {!requests.length ? <p className="p-4 text-sm text-muted-foreground">No recent chat requests recorded.</p> : null}
          </div>
          <div className="overflow-x-auto border">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-slate-50 text-left"><tr><th className="p-2">Sample time</th><th className="p-2">System CPU</th><th className="p-2">System RAM</th><th className="p-2">Node RAM</th><th className="p-2">Rasa RAM</th><th className="p-2">Actions RAM</th><th className="p-2">Postgres RAM</th><th className="p-2">In progress</th></tr></thead>
              <tbody>{data?.resources.slice(0, 20).map((sample) => (
                <tr key={sample.timestamp} className="border-t"><td className="p-2">{new Date(sample.timestamp).toLocaleTimeString()}</td><td className="p-2">{percent(sample.cpuPercent)}</td><td className="p-2">{memory(sample.usedRamMb)}</td><td className="p-2">{memory(sample.processes.node?.ramMb)}</td><td className="p-2">{sample.processes.rasa?.count ? memory(sample.processes.rasa.ramMb) : "-"}</td><td className="p-2">{sample.processes.actions?.count ? memory(sample.processes.actions.ramMb) : "-"}</td><td className="p-2">{sample.processes.postgres?.count ? memory(sample.processes.postgres.ramMb) : "-"}</td><td className="p-2">{sample.activeRequests}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </>
      ) : !isLoading && !isError ? <p className="text-sm text-muted-foreground">Waiting for the first resource sample.</p> : null}
    </section>
  );
}
