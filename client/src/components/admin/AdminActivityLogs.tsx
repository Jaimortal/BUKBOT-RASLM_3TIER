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
  MapPin,
  Lock,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AdminTooltip } from "@/components/admin/AdminTooltip";

export function AdminActivityLogs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isMainAdmin } = useAuth();

  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [page, setPage] = useState(1);
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
    refetchInterval: 30000,
  });

  const rawLogs = data?.logs || [];

  // Filter logs locally by actionType and userRole
  const logs = rawLogs.filter((log) => {
    const matchesAction = selectedAction === "all" || log.actionType?.toLowerCase() === selectedAction.toLowerCase();
    const matchesRole = selectedRole === "all" || log.userRole?.toLowerCase() === selectedRole.toLowerCase();
    return matchesAction && matchesRole;
  });

  // Calculate statistics
  const totalCount = rawLogs.length;
  const createCount = rawLogs.filter((l) => l.actionType === "create").length;
  const updateCount = rawLogs.filter((l) => l.actionType === "update").length;
  const deleteCount = rawLogs.filter((l) => l.actionType === "delete").length;

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(logs.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#001C38]/10 text-[#001C38] border border-[#001C38]/20">
          <Shield className="w-3 h-3 text-[#001C38]" />
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#001C38]/10 text-[#001C38] border border-[#001C38]/20">
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
            {module || "System"}
          </span>
        );
    }
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType?.toLowerCase()) {
      case "create":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <PlusCircle className="w-3.5 h-3.5" />
            CREATE
          </span>
        );
      case "update":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            <Edit3 className="w-3.5 h-3.5" />
            UPDATE
          </span>
        );
      case "delete":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            DELETE
          </span>
        );
      case "upload":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
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
      {/* ── Security Banner for Non-Main-Admin ── */}
      {!isMainAdmin && (
        <div className="flex items-center gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">Audit Trail Protection:</span> Log entries are in read-only mode for your role. Modifying or deleting audit history is restricted to prevent tampering and ensure accountability.
          </div>
          <Badge className="bg-amber-600 text-white font-mono text-[10px]">READ ONLY</Badge>
        </div>
      )}

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 shadow-sm relative overflow-hidden bg-white">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#001C38]" />
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Audit Logs
              </CardDescription>
              <div className="p-2 rounded-lg bg-[#001C38]/5 text-[#001C38]">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">{totalCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-slate-500">Changes tracked in database</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm relative overflow-hidden bg-white">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Created Items
              </CardDescription>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                <PlusCircle className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-emerald-700">{createCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-slate-500">New records added</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm relative overflow-hidden bg-white">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Updates Made
              </CardDescription>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                <Edit3 className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-blue-700">{updateCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-slate-500">Modified fields or answers</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm relative overflow-hidden bg-white">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Deletions
              </CardDescription>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-700">
                <XCircle className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-rose-700">{deleteCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-slate-500">Records removed</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Activity Logs Card ── */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Activity className="h-5 w-5 text-[#001C38]" />
                Active Log (Audit Trail)
              </CardTitle>
              <CardDescription className="mt-1 text-xs text-slate-500">
                Monitors all administrative changes across Knowledge Manager, Responses, Locations, and Images.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <AdminTooltip title="Refresh Logs" description="Reload the latest audit trail entries from the database" side="bottom">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading || isRefetching}
                  className="gap-1.5 text-xs text-slate-600 hover:text-slate-900 border-slate-300"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </AdminTooltip>

              {/* Clear All Logs button (Main-Admin ONLY) */}
              {isMainAdmin && (
                <AdminTooltip title="Clear All Logs" description="Permanently delete all recorded audit log records" side="bottom">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsClearAllDialogOpen(true)}
                    disabled={logs.length === 0 || clearAllMutation.isPending}
                    className="gap-1.5 text-xs shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All
                  </Button>
                </AdminTooltip>
              )}
            </div>
          </div>

          {/* ── Specific Filters Bar (User Requested) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-4">
            {/* Search */}
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search topic, summary, email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 h-9 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
              />
            </div>

            {/* Filter: Module */}
            <div>
              <Select value={selectedModule} onValueChange={(val) => {
                setSelectedModule(val);
                setPage(1);
              }}>
                <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                  <Layers className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Modules</SelectItem>
                  <SelectItem value="Knowledge Manager" className="text-xs">Knowledge Manager</SelectItem>
                  <SelectItem value="Locations" className="text-xs">Locations</SelectItem>
                  <SelectItem value="Responses" className="text-xs">Responses</SelectItem>
                  <SelectItem value="Images" className="text-xs">Images</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter: Action Type */}
            <div>
              <Select value={selectedAction} onValueChange={(val) => {
                setSelectedAction(val);
                setPage(1);
              }}>
                <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                  <Filter className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Actions</SelectItem>
                  <SelectItem value="create" className="text-xs">Create Operations</SelectItem>
                  <SelectItem value="update" className="text-xs">Update Operations</SelectItem>
                  <SelectItem value="delete" className="text-xs">Delete Operations</SelectItem>
                  <SelectItem value="upload" className="text-xs">Upload Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter: Admin Role */}
            <div>
              <Select value={selectedRole} onValueChange={(val) => {
                setSelectedRole(val);
                setPage(1);
              }}>
                <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                  <Shield className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Roles</SelectItem>
                  <SelectItem value="main-admin" className="text-xs">Main Admin Only</SelectItem>
                  <SelectItem value="co-admin" className="text-xs">Co-Admin Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-500">
              <div className="w-6 h-6 border-2 border-[#001C38] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-700">No activity logs found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {search || selectedModule !== "all" || selectedAction !== "all" || selectedRole !== "all"
                  ? "No log entries match your filter criteria. Try clearing some filters."
                  : "Administrative actions performed on knowledge or settings will be automatically recorded here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-5 py-3 w-1/4">Administrator</th>
                    <th scope="col" className="px-5 py-3 w-1/5">Timestamp</th>
                    <th scope="col" className="px-5 py-3">Action & Summary</th>
                    <th scope="col" className="px-5 py-3 text-right w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {visibleLogs.map((log) => {
                    const timeInfo = formatLogTime(log.createdAt);
                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/75 transition-colors group"
                      >
                        {/* User Column */}
                        <td className="px-5 py-3.5 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 text-xs">
                                {log.userName || "Admin"}
                              </span>
                              {getRoleBadge(log.userRole)}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {log.userEmail}
                            </div>
                          </div>
                        </td>

                        {/* Time Column */}
                        <td className="px-5 py-3.5 align-top">
                          <div className="space-y-0.5">
                            <div className="text-xs font-medium text-slate-800 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {timeInfo.date}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono pl-5">
                              {timeInfo.time}
                            </div>
                          </div>
                        </td>

                        {/* Active Log Column */}
                        <td className="px-5 py-3.5 align-top">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              {getModuleBadge(log.module)}
                              {getActionBadge(log.actionType)}
                            </div>
                            <div className="font-medium text-slate-800 text-xs leading-relaxed">
                              {log.summary}
                            </div>
                            {log.changes && log.changes.length > 0 && (
                              <div className="text-xs text-slate-500 flex flex-wrap gap-1.5 pt-0.5">
                                {log.changes.slice(0, 3).map((change, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]"
                                  >
                                    • {change.field}: {change.changeType}
                                  </span>
                                ))}
                                {log.changes.length > 3 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">
                                    +{log.changes.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="px-5 py-3.5 align-top text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedLog(log)}
                              className="h-7 px-2 text-xs text-slate-700 hover:text-[#001C38] hover:border-slate-300"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Details
                            </Button>

                            {/* Delete button (Main-Admin ONLY) */}
                            {isMainAdmin && (
                              <AdminTooltip title="Delete Log Entry" description="Permanently delete this audit log record" side="left">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to delete this log entry?")) {
                                      deleteMutation.mutate(log.id);
                                    }
                                  }}
                                  disabled={deleteMutation.isPending}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="sr-only">Delete</span>
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

              {pageCount > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
                  <span>Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, logs.length)} of {logs.length}</span>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                      Previous
                    </Button>
                    <span className="min-w-10 text-center font-medium">{currentPage} / {pageCount}</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── ENHANCED MODAL: Modification Details (BukSU Themed) ── */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent
          className="max-w-2xl max-h-[85vh] flex flex-col p-0 rounded-xl overflow-hidden border-0 shadow-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header (Pinned at top) */}
          <div className="bg-[#001C38] text-white p-5 sm:p-6 relative shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-white/10 text-amber-400">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white tracking-tight">
                    Audit Log Details
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-300 mt-0.5">
                    Detailed record of changes made to system data
                  </DialogDescription>
                </div>
              </div>
              {selectedLog && getActionBadge(selectedLog.actionType)}
            </div>
          </div>

          {/* Scrollable Body (flex-1 min-h-0 overflow-y-auto) */}
          {selectedLog && (
            <div className="p-5 sm:p-6 space-y-5 bg-slate-50/50 flex-1 min-h-0 overflow-y-auto">
              {/* User and Meta Header Banner */}
              <div className="bg-white rounded-lg p-4 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-sm">
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Administrator
                  </div>
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
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Timestamp & IP
                  </div>
                  <div className="text-xs font-medium text-slate-800 flex items-center gap-1.5">
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
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Target Information
                  </div>
                  {getModuleBadge(selectedLog.module)}
                </div>
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-1 shadow-sm">
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
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Modifications Detail</span>
                  <span className="text-xs font-normal text-slate-400 lowercase">
                    {selectedLog.changes?.length || 0} field(s) impacted
                  </span>
                </div>

                {(!selectedLog.changes || selectedLog.changes.length === 0) ? (
                  <div className="p-4 rounded-lg bg-white text-center text-xs text-slate-500 border border-dashed border-slate-200">
                    No field-level diffs captured for this operation.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedLog.changes.map((change, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-slate-200 bg-white shadow-sm space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#001C38]" />
                            {change.field}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
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
            </div>
          )}

          {/* Modal Footer Actions (Pinned at bottom - ALWAYS visible) */}
          {selectedLog && (
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              {isMainAdmin ? (
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
              ) : (
                <div className="text-xs text-slate-400 italic">
                  Read-only audit record
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Confirm Clear All Logs (Main-Admin ONLY) ── */}
      {isMainAdmin && (
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
      )}
    </div>
  );
}
