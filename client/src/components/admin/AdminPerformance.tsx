import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  RefreshCw,
  Cpu,
  HardDrive,
  Clock,
  Zap,
  Server,
  Layers,
  CheckCircle2,
  AlertTriangle,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
type PerformanceReport = {
  latest: Snapshot | null;
  requests: RequestTiming[];
  resources: Snapshot[];
};

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
  const [activeSubTab, setActiveSubTab] = useState<"requests" | "processes" | "history">("requests");

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

  // Chart data: reverse requests to chronological order for the timeline
  const chartData = [...requests]
    .reverse()
    .slice(-20)
    .map((r, idx) => ({
      index: idx + 1,
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      totalMs: Math.round(r.durationMs),
      rasaMs: r.rasaMs ? Math.round(r.rasaMs) : 0,
      fallback: r.fallback,
    }));

  return (
    <div className="space-y-6">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#001C38] text-amber-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              System Health & Performance Telemetry
            </h2>
            <p className="text-xs text-slate-500">
              Real-time resource utilization, process workloads, and Rasa chatbot request latency
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-mono text-[10px]">
            MAIN-ADMIN ONLY
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="h-8 text-xs gap-1.5 border-slate-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-[#001C38]" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="py-16 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
          <div className="w-6 h-6 border-2 border-[#001C38] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Sampling system metrics...
        </div>
      )}

      {isError && (
        <div className="p-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <div>
            <p className="font-semibold">Performance Telemetry Unavailable</p>
            <p className="text-xs text-rose-600 mt-0.5">Could not poll system CPU/RAM or Rasa metrics. Check server connectivity.</p>
          </div>
        </div>
      )}

      {latest && (
        <>
          {/* ── KPI Metric Cards (BukSU Brand Palette) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU */}
            <Card className="border-slate-200/80 shadow-sm relative overflow-hidden bg-white">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#001C38]" />
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    System CPU
                  </CardDescription>
                  <div className="p-2 rounded-lg bg-[#001C38]/5 text-[#001C38]">
                    <Cpu className="h-4 w-4" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {percent(latest.cpuPercent)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1">
                  <div
                    className="bg-[#001C38] h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, latest.cpuPercent || 0))}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">Total system load</p>
              </CardContent>
            </Card>

            {/* RAM */}
            <Card className="border-slate-200/80 shadow-sm relative overflow-hidden bg-white">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    System Memory
                  </CardDescription>
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-700">
                    <HardDrive className="h-4 w-4" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-amber-600">
                  {memory(latest.usedRamMb)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round(((latest.usedRamMb || 0) / (latest.totalRamMb || 1)) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  of {memory(latest.totalRamMb)} total capacity
                </p>
              </CardContent>
            </Card>

            {/* In Progress */}
            <Card className="border-slate-200/80 shadow-sm relative overflow-hidden bg-white">
              <div className="absolute top-0 left-0 right-0 h-1 bg-sky-600" />
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Active Requests
                  </CardDescription>
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
                    <Zap className="h-4 w-4" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-sky-700">
                  {latest.activeRequests}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-slate-500">Live chat processing</p>
              </CardContent>
            </Card>

            {/* P95 Latency */}
            <Card className="border-slate-200/80 shadow-sm relative overflow-hidden bg-white">
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Recent p95 Latency
                  </CardDescription>
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-indigo-700">
                  {p95 === null ? "-" : `${(p95 / 1000).toFixed(2)}s`}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-slate-500">95% of queries faster than this</p>
              </CardContent>
            </Card>
          </div>

          {/* ── Visual Telemetry Chart (Recharts) ── */}
          {chartData.length > 0 && (
            <Card className="border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Chatbot Request Latency Trend (Last {chartData.length} Requests)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Total roundtrip latency vs. Rasa NLP processing time in milliseconds
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#001C38]" />
                    Total Latency
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Rasa NLP Time
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="totalLatencyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#001C38" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#001C38" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="rasaLatencyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} unit="ms" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#001C38",
                        borderRadius: "8px",
                        border: "none",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                      formatter={(val: any, name: any) => [
                        `${val} ms (${(val / 1000).toFixed(2)}s)`,
                        name === "totalMs" ? "Total Roundtrip" : "Rasa Processing",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalMs"
                      stroke="#001C38"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#totalLatencyGrad)"
                      name="totalMs"
                    />
                    <Area
                      type="monotone"
                      dataKey="rasaMs"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#rasaLatencyGrad)"
                      name="rasaMs"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* ── Sub-Sections Tabs (Uncluttering the UI) ── */}
          <Card className="border-slate-200/80 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Tabs value={activeSubTab} onValueChange={(v: any) => setActiveSubTab(v)} className="w-full sm:w-auto">
                <TabsList className="bg-slate-100 p-1">
                  <TabsTrigger value="requests" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#001C38] data-[state=active]:font-semibold">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    Recent Chat Requests ({requests.length})
                  </TabsTrigger>
                  <TabsTrigger value="processes" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#001C38] data-[state=active]:font-semibold">
                    <Server className="w-3.5 h-3.5 mr-1" />
                    Process Workloads
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#001C38] data-[state=active]:font-semibold">
                    <History className="w-3.5 h-3.5 mr-1" />
                    Resource Snapshots
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <span className="text-[11px] text-slate-400">
                Sampled {new Date(latest.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <CardContent className="p-0">
              {/* Tab 1: Recent Chat Requests */}
              {activeSubTab === "requests" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Timestamp</th>
                        <th className="px-5 py-3">Session Key</th>
                        <th className="px-5 py-3">Total Duration</th>
                        <th className="px-5 py-3">Rasa NLP Call</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {requests.slice(0, 25).map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="px-5 py-3 text-slate-600">
                            {new Date(item.timestamp).toLocaleString()}
                          </td>
                          <td className="px-5 py-3 font-mono text-[11px] text-slate-700">
                            {item.sessionKey ? `${item.sessionKey.slice(0, 16)}…` : "anonymous"}
                          </td>
                          <td className="px-5 py-3 font-medium text-slate-900">
                            {(item.durationMs / 1000).toFixed(2)}s ({item.durationMs}ms)
                          </td>
                          <td className="px-5 py-3 text-slate-600">
                            {item.rasaMs === null ? "-" : `${(item.rasaMs / 1000).toFixed(2)}s`}
                          </td>
                          <td className="px-5 py-3">
                            {item.status === 200 ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1 hover:bg-emerald-50">
                                <CheckCircle2 className="w-3 h-3" />
                                {item.status} {item.fallback ? "(Fallback)" : "OK"}
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px] gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                HTTP {item.status}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                      {requests.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            No chat requests recorded yet in this telemetry window.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Process Breakdown */}
              {activeSubTab === "processes" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Process Service</th>
                        <th className="px-5 py-3">Active Instances</th>
                        <th className="px-5 py-3">CPU Usage</th>
                        <th className="px-5 py-3">Resident RAM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {Object.entries(latest.processes).map(([name, item]) => {
                        const friendlyName =
                          name === "node"
                            ? "Web & API Server (Node.js)"
                            : name === "rasa"
                            ? "Rasa Core NLP Engine (Python)"
                            : name === "actions"
                            ? "Rasa Action Server (Python)"
                            : name === "postgres"
                            ? "PostgreSQL Database Engine"
                            : name;

                        return (
                          <tr key={name} className="hover:bg-slate-50/75 transition-colors">
                            <td className="px-5 py-3.5 font-semibold text-slate-800">
                              {friendlyName}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                {item.count} running
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-slate-700 font-medium">
                              {item.count ? percent(item.cpuPercent) : "-"}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-slate-700 font-medium">
                              {item.count ? memory(item.ramMb) : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Historical Snapshots */}
              {activeSubTab === "history" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Sample Time</th>
                        <th className="px-5 py-3">System CPU</th>
                        <th className="px-5 py-3">System RAM</th>
                        <th className="px-5 py-3">Node RAM</th>
                        <th className="px-5 py-3">Rasa RAM</th>
                        <th className="px-5 py-3">In Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {data?.resources.slice(0, 15).map((sample) => (
                        <tr key={sample.timestamp} className="hover:bg-slate-50/75 transition-colors">
                          <td className="px-5 py-3 text-slate-600">
                            {new Date(sample.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="px-5 py-3 font-mono">{percent(sample.cpuPercent)}</td>
                          <td className="px-5 py-3 font-mono">{memory(sample.usedRamMb)}</td>
                          <td className="px-5 py-3 font-mono">{memory(sample.processes.node?.ramMb)}</td>
                          <td className="px-5 py-3 font-mono">
                            {sample.processes.rasa?.count ? memory(sample.processes.rasa.ramMb) : "-"}
                          </td>
                          <td className="px-5 py-3 font-mono font-medium text-slate-800">
                            {sample.activeRequests}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
