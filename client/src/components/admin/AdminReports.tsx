import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteChatbotReport, fetchChatbotReports, type ChatbotReportGroup } from "@/lib/adminApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldAlert,
  Trash2,
  Mail,
  Search,
  MessageSquareWarning,
  HelpCircle,
  Users,
  Globe,
  Clock,
  ChevronRight,
  Eye,
  Filter,
  AlertCircle,
  FileQuestion,
  Bot
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AdminTooltip } from "@/components/admin/AdminTooltip";

export function AdminReports() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isMainAdmin } = useAuth();

  const [selected, setSelected] = useState<ChatbotReportGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "response" | "general">("all");

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["chatbotReports"],
    queryFn: fetchChatbotReports,
  });

  // Calculate statistics across all reports
  const allReports = groups.flatMap((g) => g.reports);
  const totalReportsCount = allReports.length;
  const responseIssuesCount = allReports.filter((r) => r.reportKind === "response").length;
  const generalInquiriesCount = totalReportsCount - responseIssuesCount;
  const uniqueIpsCount = groups.length;

  const responseRatio = totalReportsCount > 0 
    ? Math.round((responseIssuesCount / totalReportsCount) * 100) 
    : 0;

  // Filter groups according to search & kindFilter
  const filteredGroups = groups
    .map((group) => {
      const filteredReports = group.reports.filter((report) => {
        const matchesKind =
          kindFilter === "all" ||
          (kindFilter === "response" && report.reportKind === "response") ||
          (kindFilter === "general" && report.reportKind !== "response");

        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !searchTerm ||
          group.ipAddress.toLowerCase().includes(q) ||
          (report.email && report.email.toLowerCase().includes(q)) ||
          (report.report && report.report.toLowerCase().includes(q)) ||
          (report.question && report.question.toLowerCase().includes(q));

        return matchesKind && matchesSearch;
      });

      return {
        ...group,
        filteredReports,
      };
    })
    .filter((g) => g.filteredReports.length > 0);

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
      setSelected((current) => (current?.ipHash === ipHash ? null : current));
      toast({ title: "Report group deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete report group", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      {/* ── KPI Summary Cards (BukSU Brand Palette) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 shadow-sm relative overflow-hidden bg-white">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#001C38]" />
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Reports
              </CardDescription>
              <div className="p-2 rounded-lg bg-[#001C38]/5 text-[#001C38]">
                <MessageSquareWarning className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">{totalReportsCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-slate-500">Submitted by chatbot users</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm relative overflow-hidden bg-white">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Response Issues
              </CardDescription>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-700">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-amber-600">{responseIssuesCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-slate-500">{responseRatio}% of total inquiries</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm relative overflow-hidden bg-white">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sky-600" />
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                General Feedback
              </CardDescription>
              <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
                <HelpCircle className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-sky-700">{generalInquiriesCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-slate-500">General notes or inquiries</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm relative overflow-hidden bg-white">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Unique Reporters
              </CardDescription>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                <Globe className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-indigo-700">{uniqueIpsCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-slate-500">Distinct IP addresses</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Issue Ratio Visual Bar ── */}
      {totalReportsCount > 0 && (
        <Card className="border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 text-xs">
            <span className="font-semibold text-slate-700">Feedback Distribution Ratio</span>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Response Issues ({responseIssuesCount})
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-[#001C38]" />
                General Feedback ({generalInquiriesCount})
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
            <div
              className="bg-amber-500 h-2.5 transition-all duration-500"
              style={{ width: `${responseRatio}%` }}
              title={`Response Issues: ${responseRatio}%`}
            />
            <div
              className="bg-[#001C38] h-2.5 transition-all duration-500"
              style={{ width: `${100 - responseRatio}%` }}
              title={`General Feedback: ${100 - responseRatio}%`}
            />
          </div>
        </Card>
      )}

      {/* ── Main Reports Card ── */}
      <Card className="border-slate-200/80 shadow-sm overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <ShieldAlert className="h-5 w-5 text-[#001C38]" />
                Chatbot User Reports
              </CardTitle>
              <CardDescription className="mt-1 text-xs text-slate-500">
                Inquiries and flagged bot responses grouped by originating network IP.
              </CardDescription>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search IP, email, or message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
                />
              </div>
              <div className="w-full sm:w-44">
                <Select value={kindFilter} onValueChange={(val: any) => setKindFilter(val)}>
                  <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                    <Filter className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    <SelectValue placeholder="All Report Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Reports</SelectItem>
                    <SelectItem value="response" className="text-xs">Response Issues</SelectItem>
                    <SelectItem value="general" className="text-xs">General Feedback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-500">
              <div className="w-6 h-6 border-2 border-[#001C38] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading reports data...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              <div className="p-3 bg-slate-100 rounded-full w-max mx-auto mb-2 text-slate-400">
                <MessageSquareWarning className="w-6 h-6" />
              </div>
              <p className="font-medium text-slate-700">No chatbot reports found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm || kindFilter !== "all"
                  ? "No reports match your current filters. Try changing or resetting your search."
                  : "Student reports will be organized here as they submit feedback via the chatbot widget."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-5 py-3">Originating IP</th>
                    <th scope="col" className="px-5 py-3">Reports Count</th>
                    <th scope="col" className="px-5 py-3">Report Category</th>
                    <th scope="col" className="px-5 py-3">Latest Activity</th>
                    <th scope="col" className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredGroups.map((group) => {
                    const responseCount = group.reports.filter((r) => r.reportKind === "response").length;
                    const generalCount = group.reports.length - responseCount;

                    return (
                      <tr key={group.ipHash} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {group.ipAddress}
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#001C38]/10 text-[#001C38]">
                            {group.count} {group.count === 1 ? "report" : "reports"}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {responseCount > 0 && (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-normal text-[11px] gap-1 hover:bg-amber-50">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                {responseCount} Response
                              </Badge>
                            )}
                            {generalCount > 0 && (
                              <Badge variant="secondary" className="text-slate-600 font-normal text-[11px] gap-1">
                                <HelpCircle className="w-3 h-3 text-slate-500" />
                                {generalCount} General
                              </Badge>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(group.latestAt).toLocaleString()}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs gap-1 border-slate-200 text-slate-700 hover:text-[#001C38] hover:bg-slate-100"
                              onClick={() => setSelected(group)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Inspect
                            </Button>

                            {isMainAdmin && (
                              <AdminTooltip title="Delete IP Group" description="Permanently delete all reports from this IP address" side="left">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  onClick={() => deleteGroupMutation.mutate(group)}
                                  disabled={deleteGroupMutation.isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span className="sr-only">Delete Group</span>
                                </Button>
                              </AdminTooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── ENHANCED MODAL: Reports from Selected IP ── */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent
          className="max-w-3xl max-h-[85vh] flex flex-col p-0 rounded-xl overflow-hidden border-0 shadow-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Modal Header with BukSU Dark Blue & Gold Accent (Pinned at top) */}
          <div className="bg-[#001C38] text-white p-5 sm:p-6 relative shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-white/10 text-amber-400">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white tracking-tight">
                    Reports from {selected?.ipAddress}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-300 mt-0.5">
                    {selected?.count || 0} user-submitted report(s) under this IP address
                  </DialogDescription>
                </div>
              </div>
              <Badge className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs px-2.5 py-1">
                {selected?.reports.length} Items Recorded
              </Badge>
            </div>
          </div>

          {/* Modal Content List (Scrollable) */}
          <div className="p-5 sm:p-6 space-y-4 bg-slate-50/50 flex-1 min-h-0 overflow-y-auto">
            {selected?.reports.map((report) => (
              <div
                key={report.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow space-y-3"
              >
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{report.email || "No contact email provided"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        report.reportKind === "response"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}
                    >
                      {report.reportKind === "response" ? "Response Issue" : "General Feedback"}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {new Date(report.createdAt).toLocaleString()}
                    </span>
                    {isMainAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        onClick={() => deleteMutation.mutate(report.id)}
                        disabled={deleteMutation.isPending}
                        title="Delete Report"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Response Context (If reportKind === 'response') */}
                {report.reportKind === "response" && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 space-y-3 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900 mb-1">
                        <FileQuestion className="h-3.5 w-3.5 text-amber-600" />
                        <span>User Query</span>
                      </div>
                      <p className="bg-white p-2.5 rounded border border-slate-200 text-slate-800 font-mono text-[11px] leading-relaxed">
                        {report.question || "No specific question was captured."}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900 mb-1">
                        <Bot className="h-3.5 w-3.5 text-[#001C38]" />
                        <span>Chatbot Response Provided</span>
                      </div>
                      <p className="bg-white p-2.5 rounded border border-slate-200 text-slate-700 text-xs leading-relaxed max-h-36 overflow-y-auto">
                        {report.botResponse || "No bot response recorded."}
                      </p>
                    </div>
                  </div>
                )}

                {/* User Report Statement */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Student Issue Description
                  </div>
                  <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20 text-slate-800 text-xs leading-relaxed whitespace-pre-wrap">
                    {report.report}
                  </div>
                </div>

                {/* User Agent / Device Info */}
                {report.userAgent && (
                  <div className="text-[10px] text-slate-400 font-mono break-all pt-1 border-t border-slate-50">
                    Device / Browser: {report.userAgent}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Modal Footer (Pinned at bottom) */}
          <div className="p-4 bg-white border-t border-slate-200 flex justify-end shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelected(null)}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
