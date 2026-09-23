import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Layers,
  Sparkles,
  ChevronDown,
  FileCheck2,
  Cpu,
  HardDrive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Case = {
  case_id: string;
  section: string;
  language: string;
  query: string;
  answer: string;
  outcome: string;
  source: string;
  latency_ms: number;
  note: string;
};
type Report = {
  title: string;
  generated_at: string;
  summary: {
    total: number;
    completed: number;
    duration_seconds: number;
    p50_ms: number;
    p95_ms: number;
    outcomes: Record<string, number>;
    resources: {
      samples: number;
      system_cpu_peak_percent?: number;
      system_ram_peak_mb?: number;
      system_ram_total_mb?: number;
      in_progress_peak?: number;
      node_ram_peak_mb?: number;
      rasa_ram_peak_mb?: number;
      actions_ram_peak_mb?: number;
      postgres_ram_peak_mb?: number;
    };
  };
  caveat: string;
  cases: Case[];
};

const outcomeColor: Record<string, string> = {
  "Wrong data": "bg-red-50 text-red-800 border-red-200",
  "Fallback": "bg-amber-50 text-amber-800 border-amber-200",
  "Error": "bg-red-50 text-red-800 border-red-200",
  "Correct limitation/referral": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Correct data": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Partially supported": "bg-sky-50 text-sky-800 border-sky-200",
  "Needs review": "bg-slate-50 text-slate-700 border-slate-200",
};

export function AdminFaqGapReport() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, error, refetch } = useQuery<Report>({
    queryKey: ["faq-gap-report"],
    queryFn: async () => {
      const response = await fetch("/api/admin/faq-gap-report", {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}` },
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.message || "Report unavailable");
      return body.data;
    },
  });

  const cases =
    data?.cases.filter(
      (item) =>
        (filter === "all" || item.outcome === filter) &&
        `${item.case_id} ${item.query} ${item.answer}`.toLowerCase().includes(search.toLowerCase())
    ) || [];

  return (
    <div className="space-y-6">
      {/* ── Summary Card ── */}
      <Card className="border-slate-200/80 bg-white shadow-sm overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#001C38]" />
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#001C38] text-amber-400">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">
                  FAQ Gap Evaluation
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Automated benchmark query tests evaluating accuracy and identifying missing knowledge
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-mono text-[10px]">
                MAIN-ADMIN ONLY
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                className="h-8 text-xs gap-1.5 border-[#001C38] text-[#001C38] hover:bg-[#001C38]/5"
              >
                <FileText className="h-3.5 w-3.5" />
                Open Full Evaluation Modal
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading && (
            <p className="text-xs text-slate-500 py-4">Loading benchmark evaluation data...</p>
          )}
          {error && (
            <p className="text-xs text-rose-600 py-4">
              Evaluation report could not be loaded: {(error as Error).message}
            </p>
          )}
          {data && (
            <div className="space-y-4">
              {/* Metric Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Evaluated Cases
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {data.summary.completed} / {data.summary.total}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Median Latency
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {(data.summary.p50_ms / 1000).toFixed(2)}s
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    p95 Latency
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {(data.summary.p95_ms / 1000).toFixed(2)}s
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Test Runtime
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {(data.summary.duration_seconds / 60).toFixed(1)} min
                  </div>
                </div>
              </div>

              {/* Outcomes Breakdown */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-xs font-semibold text-slate-700 mr-1">Outcome Distribution:</span>
                {Object.entries(data.summary.outcomes).map(([outcome, count]) => (
                  <Badge
                    key={outcome}
                    variant="outline"
                    className={`text-xs ${outcomeColor[outcome] || "bg-slate-50 text-slate-700"}`}
                  >
                    {outcome}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── ENHANCED MODAL: Full FAQ Gap Test Report (BukSU Themed) ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex max-h-[90vh] w-[min(96vw,1100px)] max-w-none flex-col overflow-hidden p-0 rounded-xl border-0 shadow-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* BukSU Dark Blue & Gold Modal Header */}
          <div className="bg-[#001C38] text-white p-6 relative shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-white/10 text-amber-400">
                  <FileCheck2 className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white tracking-tight">
                    FAQ Gap Evaluation Test Report
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-300 mt-0.5">
                    Live chatbot response benchmarks and accuracy evaluation. Generated {data?.generated_at || "recently"}.
                  </DialogDescription>
                </div>
              </div>
              <Badge className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs px-2.5 py-1 w-max">
                Benchmark Results
              </Badge>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto px-6 py-6 space-y-5 bg-slate-50/50">
            {isLoading && <p className="py-10 text-sm text-slate-600 text-center">Loading full test report...</p>}
            {error && (
              <p role="alert" className="py-10 text-sm text-red-700 text-center font-medium">
                {(error as Error).message}
              </p>
            )}

            {data && (
              <>
                {/* Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    ["Completed", `${data.summary.completed}/${data.summary.total}`],
                    ["Runtime", `${(data.summary.duration_seconds / 60).toFixed(1)} min`],
                    ["Median Latency", `${(data.summary.p50_ms / 1000).toFixed(2)}s`],
                    ["P95 Latency", `${(data.summary.p95_ms / 1000).toFixed(2)}s`],
                  ].map(([label, value]) => (
                    <div key={label} className="border-l-4 border-amber-500 bg-white p-3 rounded-r-lg shadow-sm border border-slate-200">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
                      <div className="text-xl font-bold text-slate-900 mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Resource Metrics Strip */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 shadow-sm">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Samples: <strong>{data.summary.resources.samples}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#001C38]" />
                    Peak CPU: <strong>{data.summary.resources.system_cpu_peak_percent ?? "-"}%</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                    Peak RAM: <strong>{data.summary.resources.system_ram_peak_mb ?? "-"} MB</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    Actions RAM: <strong>{data.summary.resources.actions_ram_peak_mb ?? "-"} MB</strong>
                  </span>
                </div>

                {/* Caveat */}
                {data.caveat && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-300 bg-amber-50/80 text-amber-900 text-xs leading-relaxed">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <span>{data.caveat}</span>
                  </div>
                )}

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <select
                    aria-label="Filter by outcome"
                    className="h-9 w-full sm:w-56 rounded-lg border border-slate-300 bg-white px-3 text-xs focus:ring-1 focus:ring-[#001C38]"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All Outcomes ({data.cases.length})</option>
                    {Object.keys(data.summary.outcomes).map((outcome) => (
                      <option key={outcome} value={outcome}>
                        {outcome} ({data.summary.outcomes[outcome]})
                      </option>
                    ))}
                  </select>

                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      className="pl-8 h-9 text-xs bg-white border-slate-300"
                      placeholder="Search test questions, answers, or case IDs..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {cases.length} cases shown
                  </span>
                </div>

                {/* Cases List */}
                <div className="space-y-2.5">
                  {cases.map((item) => (
                    <details
                      key={item.case_id}
                      className="rounded-lg border border-slate-200 bg-white open:border-slate-400 overflow-hidden shadow-sm transition-all"
                    >
                      <summary className="flex cursor-pointer flex-wrap items-center gap-2.5 p-3.5 text-xs hover:bg-slate-50/80">
                        <span className="font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.case_id}
                        </span>
                        <span className="min-w-0 flex-1 font-medium text-slate-900 text-xs">
                          {item.query}
                        </span>
                        <span
                          className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${
                            outcomeColor[item.outcome] || outcomeColor["Needs review"]
                          }`}
                        >
                          {item.outcome}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {(item.latency_ms / 1000).toFixed(2)}s
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      </summary>

                      <div className="space-y-2.5 border-t border-slate-100 bg-slate-50/60 p-4 text-xs">
                        <div>
                          <span className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">
                            Chatbot Response
                          </span>
                          <p className="mt-1 whitespace-pre-wrap rounded bg-white p-2.5 border border-slate-200 text-slate-800 text-xs leading-relaxed">
                            {item.answer || "No response returned."}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-500">
                          <span>Source: <strong className="text-slate-700">{item.source}</strong></span>
                          <span>Language: <strong className="text-slate-700">{item.language}</strong></span>
                          <span>Section: <strong className="text-slate-700">{item.section}</strong></span>
                        </div>
                        {item.note && (
                          <p className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded border border-amber-200">
                            Assessment: {item.note}
                          </p>
                        )}
                      </div>
                    </details>
                  ))}

                  {cases.length === 0 && (
                    <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                      No test cases match this filter.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-200 flex justify-end shrink-0">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="text-xs">
              Close Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
