import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchActivityLogs, deleteActivityLogApi, clearActivityLogsApi } from "@/lib/adminApi";
import type { ActivityLog } from "@/types/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Search,
  Trash2,
  Eye,
  RefreshCw,
  Clock,
  User,
  Shield,
  Layers,
  FileText,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  Edit3,
  XCircle,
  Image as ImageIcon,
  MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminTooltip } from "@/components/admin/AdminTooltip";

export function AdminActivityLogs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["activityLogs", selectedModule, search],
    queryFn: () => fetchActivityLogs({ module: selectedModule, search, limit: 100 }),
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const logs = data?.logs || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteActivityLogApi(id);
      if (!res.success) throw new Error(res.message || "Failed to delete log");
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["activityLogs"] });
      if (selectedLog?.id === id) {
        setSelectedLog(null);
      }
      toast({
        title: "Log Entry Deleted",
        description: "The activity log record has been removed.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Delete Failed",
        description: err?.message || "Failed to delete activity log",
        variant: "destructive",
      });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const res = await clearActivityLogsApi();
      if (!res.success) throw new Error(res.message || "Failed to clear logs");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activityLogs"] });
      setIsClearAllDialogOpen(false);
      setSelectedLog(null);
      toast({
        title: "Audit Trail Cleared",
        description: "All activity log records have been deleted.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Clear Failed",
        description: err?.message || "Failed to clear activity logs",
        variant: "destructive",
      });
    },
  });

  const formatLogTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return {
        date: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        time: d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      };
    } catch {
      return { date: isoString, time: "" };
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "main-admin") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-600/10 text-blue-700 border border-blue-600/20">
          <Shield className="w-3 h-3 text-blue-600" />
          main-admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20">
        <User className="w-3 h-3 text-amber-600" />
        co-admin
      </span>
    );
  };

  const getModuleBadge = (module: string) => {
    switch (module) {
      case "Knowledge Manager":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <Layers className="w-3 h-3" />
            Knowledge Manager
          </span>
        );
      case "Locations":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <MapPin className="w-3 h-3" />
            Locations
          </span>
        );
      case "Responses":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <FileText className="w-3 h-3" />
            Responses
          </span>
        );
      case "Images":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-pink-50 text-pink-700 border border-pink-200">
            <ImageIcon className="w-3 h-3" />
            Images
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Activity className="w-3 h-3" />
            {module}
          </span>
        );
    }
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case "create":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <PlusCircle className="w-3.5 h-3.5" />
            CREATE
          </span>
        );
      case "update":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
            <Edit3 className="w-3.5 h-3.5" />
            UPDATE
          </span>
        );
      case "delete":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
            <XCircle className="w-3.5 h-3.5" />
            DELETE
          </span>
        );
      case "upload":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600">
            <ImageIcon className="w-3.5 h-3.5" />
            UPLOAD
          </span>
        );
      default:
        return <span className="text-xs font-semibold uppercase">{actionType}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                <Activity className="h-5 w-5 text-blue-600" />
                Active Log (Audit Trail)
              </CardTitle>
              <CardDescription className="mt-1 text-slate-500">
                Monitors all data modifications across Knowledge Manager, Responses, Locations, and Images. Visible exclusively to Main Admin.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <AdminTooltip title="Refresh Logs" description="Reload the latest audit trail entries from the database" side="bottom">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading || isRefetching}
                  className="gap-1.5 text-slate-600 hover:text-slate-900 border-slate-300"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </AdminTooltip>
              <AdminTooltip title="Clear All Logs" description="Permanently delete all recorded audit log records" side="bottom">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsClearAllDialogOpen(true)}
                  disabled={logs.length === 0 || clearAllMutation.isPending}
                  className="gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All Logs
                </Button>
              </AdminTooltip>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by topic, summary, admin name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
              />
            </div>
            <div className="w-full sm:w-56">
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="bg-slate-50/50 border-slate-200 focus:bg-white text-sm">
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  <SelectItem value="Knowledge Manager">Knowledge Manager</SelectItem>
                  <SelectItem value="Locations">Locations</SelectItem>
                  <SelectItem value="Responses">Responses</SelectItem>
                  <SelectItem value="Images">Images</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              Loading audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500 border-t border-slate-100">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-700">No activity logs found</p>
              <p className="text-xs text-slate-400 mt-1">
                {search || selectedModule !== "all"
                  ? "Try clearing your search query or module filter."
                  : "Modifications made by admins will appear here automatically."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-t border-slate-200">
                <thead className="bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 w-1/4">User</th>
                    <th scope="col" className="px-6 py-3.5 w-1/5">Time</th>
                    <th scope="col" className="px-6 py-3.5">Active Log</th>
                    <th scope="col" className="px-6 py-3.5 text-right w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {logs.map((log) => {
                    const timeInfo = formatLogTime(log.createdAt);
                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/75 transition-colors group"
                      >
                        {/* User Column */}
                        <td className="px-6 py-4 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 text-sm">
                                {log.userName || "Admin"}
                              </span>
                              {getRoleBadge(log.userRole)}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                              {log.userEmail}
                            </div>
                          </div>
                        </td>

                        {/* Time Column */}
                        <td className="px-6 py-4 align-top">
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {timeInfo.date}
                            </div>
                            <div className="text-xs text-slate-500 font-mono pl-5">
                              {timeInfo.time}
                            </div>
                          </div>
                        </td>

                        {/* Active Log Column */}
                        <td className="px-6 py-4 align-top">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              {getModuleBadge(log.module)}
                              {getActionBadge(log.actionType)}
                            </div>
                            <div className="font-medium text-slate-800 text-sm leading-relaxed">
                              {log.summary}
                            </div>
                            {log.changes && log.changes.length > 0 && (
                              <div className="text-xs text-slate-500 flex flex-wrap gap-1.5 pt-0.5">
                                {log.changes.slice(0, 3).map((change, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]"
                                  >
                                    • {change.field}: {change.changeType}
                                  </span>
                                ))}
                                {log.changes.length > 3 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[11px]">
                                    +{log.changes.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="px-6 py-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <AdminTooltip title="View Modification Details" description="Inspect full before/after diff of changed responses, maps, or images" side="left">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedLog(log)}
                                className="h-8 px-2.5 gap-1 text-xs text-slate-700 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50/50"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Details
                              </Button>
                            </AdminTooltip>
                            <AdminTooltip title="Delete Log Entry" description="Permanently remove this individual log record" side="left">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to delete this log entry?")) {
                                    deleteMutation.mutate(log.id);
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </AdminTooltip>
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

      {/* MODAL: Modification Details */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <DialogTitle className="text-lg font-bold text-slate-800">
                Modification Details
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-500 text-xs mt-1">
              Detailed audit trail report for this administrative change.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-5 pt-2">
              {/* User and Meta Header Banner */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500">Performed By</div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedLog.userName || "Admin"}
                    </span>
                    {getRoleBadge(selectedLog.userRole)}
                  </div>
                  <div className="text-xs text-slate-600 font-mono">
                    {selectedLog.userEmail}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500">Timestamp & Origin</div>
                  <div className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(selectedLog.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    })}
                  </div>
                  {selectedLog.ipAddress && (
                    <div className="text-xs text-slate-500 font-mono">
                      IP: {selectedLog.ipAddress}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Summary Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Target Information
                  </div>
                  <div className="flex items-center gap-2">
                    {getModuleBadge(selectedLog.module)}
                    {getActionBadge(selectedLog.actionType)}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <div className="font-semibold text-slate-900 text-sm">
                    {selectedLog.summary}
                  </div>
                  {selectedLog.targetTitle && (
                    <div className="text-xs text-slate-600">
                      <span className="font-medium text-slate-500">Target:</span>{" "}
                      {selectedLog.targetTitle}
                      {selectedLog.targetId && (
                        <span className="text-slate-400 ml-1">({selectedLog.targetId})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Modification List */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>List of Modifications</span>
                  <span className="text-xs font-normal text-slate-400 lowercase">
                    {selectedLog.changes?.length || 0} change item(s)
                  </span>
                </div>

                {(!selectedLog.changes || selectedLog.changes.length === 0) ? (
                  <div className="p-4 rounded-lg bg-slate-50 text-center text-xs text-slate-500 border border-dashed border-slate-200">
                    No individual field diffs captured for this action.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedLog.changes.map((change, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            {change.field}
                          </span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${
                              change.changeType === "added"
                                ? "bg-emerald-100 text-emerald-700"
                                : change.changeType === "removed"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {change.changeType}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 leading-relaxed pl-3 border-l-2 border-slate-300">
                          {change.details}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this log entry?")) {
                      deleteMutation.mutate(selectedLog.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="gap-1.5 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Entry
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: Confirm Clear All Logs */}
      <Dialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Clear All Activity Logs?
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 text-sm mt-2">
              This action will permanently delete all audit trail records from the database. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearAllDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => clearAllMutation.mutate()}
              disabled={clearAllMutation.isPending}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearAllMutation.isPending ? "Clearing..." : "Yes, Clear All Logs"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
