import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
  summary: { total: number; completed: number; duration_seconds: number; p50_ms: number; p95_ms: number; outcomes: Record<string, number>; resources: { samples: number; system_cpu_peak_percent?: number; system_ram_peak_mb?: number; system_ram_total_mb?: number; in_progress_peak?: number; node_ram_peak_mb?: number; rasa_ram_peak_mb?: number; actions_ram_peak_mb?: number; postgres_ram_peak_mb?: number } };
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
  const { data, isLoading, error } = useQuery<Report>({
    queryKey: ["faq-gap-report"],
    enabled: open,
    queryFn: async () => {
      const response = await fetch("/api/admin/faq-gap-report", {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}` },
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.message || "Report unavailable");
      return body.data;
    },
  });
  const cases = data?.cases.filter((item) =>
    (filter === "all" || item.outcome === filter) &&
    `${item.case_id} ${item.query} ${item.answer}`.toLowerCase().includes(search.toLowerCase()),
  ) || [];

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">FAQ gap evaluation</h2>
        <p className="text-sm text-slate-600">Live first-year question test, grouped by topic.</p>
      </div>
      <Button variant="outline" onClick={() => setOpen(true)}><FileText className="mr-2 h-4 w-4" />Open test report</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] w-[min(96vw,1100px)] max-w-none flex-col overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="text-xl">02 FAQ gaps: test report</DialogTitle>
            <DialogDescription>Live chatbot responses and performance. Generated {data?.generated_at || "after testing"}.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto px-6 pb-6">
            {isLoading && <p className="py-10 text-sm text-slate-600">Loading report...</p>}
            {error && <p role="alert" className="py-10 text-sm text-red-700">{(error as Error).message}</p>}
            {data && <>
              <div className="grid grid-cols-2 gap-3 py-5 md:grid-cols-4">
                {[
                  ["Completed", `${data.summary.completed}/${data.summary.total}`],
                  ["Runtime", `${(data.summary.duration_seconds / 60).toFixed(1)} min`],
                  ["Median", `${(data.summary.p50_ms / 1000).toFixed(1)} s`],
                  ["P95", `${(data.summary.p95_ms / 1000).toFixed(1)} s`],
                ].map(([label, value]) => <div key={label} className="border-l-2 border-teal-600 bg-slate-50 px-3 py-2"><div className="text-xs text-slate-600">{label}</div><div className="text-lg font-semibold text-slate-900">{value}</div></div>)}
              </div>
              <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 border-y py-3 text-xs text-slate-700">
                <span>Resource samples: <strong>{data.summary.resources.samples}</strong></span>
                <span>Peak system CPU: <strong>{data.summary.resources.system_cpu_peak_percent ?? "-"}%</strong></span>
                <span>Peak system RAM: <strong>{data.summary.resources.system_ram_peak_mb ?? "-"} MB</strong></span>
                <span>Peak Actions RAM: <strong>{data.summary.resources.actions_ram_peak_mb ?? "-"} MB</strong></span>
                <span>Peak in progress: <strong>{data.summary.resources.in_progress_peak ?? "-"}</strong></span>
              </div>
              <p className="mb-4 flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{data.caveat}</p>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <select aria-label="Filter by outcome" className="h-9 rounded border border-slate-300 bg-white px-2 text-sm" value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="all">All outcomes</option>
                  {Object.keys(data.summary.outcomes).map((outcome) => <option key={outcome} value={outcome}>{outcome} ({data.summary.outcomes[outcome]})</option>)}
                </select>
                <div className="relative min-w-[180px] flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><Input aria-label="Search questions and answers" className="pl-9" placeholder="Search questions or answers" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
                <span className="text-xs text-slate-600">{cases.length} shown</span>
              </div>
              <div className="space-y-2">
                {cases.map((item) => <details key={item.case_id} className="rounded border border-slate-200 bg-white open:border-slate-400">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-3 text-sm hover:bg-slate-50">
                    <span className="font-mono text-xs text-slate-500">{item.case_id}</span>
                    <span className="min-w-0 flex-1 font-medium text-slate-900">{item.query}</span>
                    <span className={`rounded border px-2 py-0.5 text-xs font-medium ${outcomeColor[item.outcome] || outcomeColor["Needs review"]}`}>{item.outcome}</span>
                    <span className="text-xs text-slate-600">{(item.latency_ms / 1000).toFixed(1)} s</span>
                  </summary>
                  <div className="space-y-3 border-t bg-slate-50 p-4 text-sm">
                    <div><span className="font-semibold">Response</span><p className="mt-1 whitespace-pre-wrap text-slate-800">{item.answer || "No response"}</p></div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600"><span>Source: {item.source}</span><span>Language: {item.language}</span><span>Section: {item.section}</span></div>
                    {item.note && <p className="text-xs text-slate-700">Assessment: {item.note}</p>}
                  </div>
                </details>)}
                {cases.length === 0 && <p className="py-8 text-center text-sm text-slate-600">No cases match this filter.</p>}
              </div>
            </>}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
