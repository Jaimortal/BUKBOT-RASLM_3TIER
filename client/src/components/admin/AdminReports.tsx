import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteChatbotReport, fetchChatbotReports, type ChatbotReportGroup } from "@/lib/adminApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, ShieldAlert, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminTooltip } from "@/components/admin/AdminTooltip";
import { AdminPerformance } from "@/components/admin/AdminPerformance";

export function AdminReports() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<ChatbotReportGroup | null>(null);
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["chatbotReports"],
    queryFn: fetchChatbotReports,
  });
  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const result = await deleteChatbotReport(reportId);
      if (!result.success) throw new Error(result.message || "Failed to delete report");
      return reportId;
    },
    onSuccess: (_result, reportId) => {
      queryClient.invalidateQueries({ queryKey: ["chatbotReports"] });
      setSelected((current) => {
        if (!current) return current;
        const reports = current.reports.filter((report) => report.id !== reportId);
        return { ...current, reports, count: reports.length };
      });
      toast({ title: "Report deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete report", variant: "destructive" });
    },
  });
  const deleteGroupMutation = useMutation({
    mutationFn: async (group: ChatbotReportGroup) => {
      const confirmed = window.confirm(`Delete all ${group.count} report(s) from ${group.ipAddress}?`);
      if (!confirmed) return null;

      for (const report of group.reports) {
        const result = await deleteChatbotReport(report.id);
        if (!result.success) throw new Error(result.message || "Failed to delete report group");
      }
      return group.ipHash;
    },
    onSuccess: (ipHash) => {
      if (!ipHash) return;
      queryClient.invalidateQueries({ queryKey: ["chatbotReports"] });
      setSelected((current) => current?.ipHash === ipHash ? null : current);
      toast({ title: "Report group deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete report group", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <AdminPerformance />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldAlert className="h-5 w-5 text-blue-700" />
            Chatbot Reports
          </CardTitle>
          <CardDescription>Reports are grouped by IP address. Emails are encrypted in storage and decrypted only for this admin view.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading reports...</div>
          ) : groups.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed py-12 text-center text-sm text-muted-foreground">No reports submitted yet.</div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-12 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-600 sticky top-0 z-10 border-b">
                <div className="col-span-4">IP</div>
                <div className="col-span-3">Reports</div>
                <div className="col-span-3">Latest</div>
                <div className="col-span-2 text-right">Action</div>
              </div>
              <div className="max-h-[290px] overflow-y-auto divide-y divide-slate-100">
                {groups.map((group) => (
                  <div key={group.ipHash} className="grid grid-cols-12 items-center px-4 py-3 text-sm hover:bg-slate-50/75 transition-colors">
                    <div className="col-span-4 font-mono text-xs">{group.ipAddress}</div>
                    <div className="col-span-3 font-medium">{group.count} report(s)</div>
                    <div className="col-span-3 text-xs text-muted-foreground">{new Date(group.latestAt).toLocaleString()}</div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <AdminTooltip title="View Reports" description="Inspect reports submitted under this IP address" side="left">
                        <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" onClick={() => setSelected(group)}>View</Button>
                      </AdminTooltip>
                      <AdminTooltip title="Delete IP Group" description="Permanently delete all reports from this IP address" side="left">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 gap-1 px-2.5 text-xs"
                          onClick={() => deleteGroupMutation.mutate(group)}
                          disabled={deleteGroupMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </AdminTooltip>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reports from {selected?.ipAddress}</DialogTitle>
            <DialogDescription>{selected?.count || 0} report(s) under this IP group.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {selected?.reports.map((report) => (
              <div key={report.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {report.email || "Unreadable email"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                      {report.reportKind === "response" ? "Response" : "General"}
                    </span>
                    <span>{new Date(report.createdAt).toLocaleString()}</span>
                    <AdminTooltip title="Delete Report" description="Permanently remove this specific report" side="left">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => deleteMutation.mutate(report.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </AdminTooltip>
                  </div>
                </div>
                {report.reportKind === "response" && (
                  <div className="mb-3 max-h-64 overflow-y-auto rounded-lg border bg-slate-50 p-3 text-xs text-slate-700">
                    <div className="mb-3">
                      <p className="mb-1 font-semibold text-slate-900">Question</p>
                      <p className="whitespace-pre-wrap">{report.question || "No question recorded."}</p>
                    </div>
                    <div>
                      <p className="mb-1 font-semibold text-slate-900">Chatbot response</p>
                      <p className="whitespace-pre-wrap">{report.botResponse || "No response recorded."}</p>
                    </div>
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.report}</p>
                {report.userAgent ? (
                  <p className="mt-3 break-all rounded bg-slate-50 p-2 text-[11px] text-muted-foreground">{report.userAgent}</p>
                ) : null}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
