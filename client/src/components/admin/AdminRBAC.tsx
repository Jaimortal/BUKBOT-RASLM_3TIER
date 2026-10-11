import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminAccountsApi,
  updateAdminPermissionsApi,
  toggleAdminStatusApi,
  fetchPendingSignupsApi,
  approvePendingSignupApi,
  rejectPendingSignupApi,
  fetchSignupSettingsApi,
  updateSignupSettingsApi,
  type AdminAccount,
} from "@/lib/adminApi";
import { AdminPermissions, useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
  SlidersHorizontal,
  Mail,
  UserCheck,
  UserX,
  Lock,
  Layers,
  MessageSquare,
  BookOpen,
  MapPin,
  RefreshCw,
  Activity,
  Zap,
  FileText,
  Palette,
  Image as ImageIcon,
  KeyRound,
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle
} from "lucide-react";

interface PermissionGroupConfig {
  title: string;
  description: string;
  icon: any;
  items: {
    key: keyof AdminPermissions;
    label: string;
    description: string;
  }[];
}

const PERMISSION_GROUPS: PermissionGroupConfig[] = [
  {
    title: "1. Navigation Tabs Access",
    description: "Controls which main tabs are visible in the left sidebar navigation",
    icon: Layers,
    items: [
      { key: "nav_responses", label: "Responses Tab", description: "Knowledge base topics and campus location entries" },
      { key: "nav_reports", label: "Reports Tab", description: "Audit logs, user reports, and system telemetry" },
      { key: "nav_gallery", label: "Gallery Tab", description: "Campus imagery and landmarks showcase" },
      { key: "nav_settings", label: "Settings Tab", description: "Student privileges, chathead studio, and system controls" },
      { key: "nav_rbac", label: "Rules Modification Tab", description: "Admin permissions and sign-up authorization controls" },
    ],
  },
  {
    title: "2. Responses & Knowledge Features",
    description: "Controls data management and migration features under Responses",
    icon: BookOpen,
    items: [
      { key: "responses_knowledge", label: "Knowledge Manager Sub-tab", description: "Browse and edit categorized chatbot topics and responses" },
      { key: "responses_locations", label: "Campus Locations Sub-tab", description: "Browse and edit campus building coordinates and pins" },
      { key: "responses_sync", label: "Sync Records Button", description: "Synchronize and persist knowledge database records" },
    ],
  },
  {
    title: "3. Reports & Telemetry Features",
    description: "Controls which reporting and audit sections are accessible",
    icon: Activity,
    items: [
      { key: "reports_chatbot", label: "Chatbot Reports", description: "View end-user problem reports and flagged interactions" },
      { key: "reports_activity_logs", label: "Active Log (Audit Trail)", description: "View and trace administrative actions and modifications" },
      { key: "reports_performance", label: "System Performance", description: "Telemetry, response latencies, and service up-time" },
      { key: "reports_faq_gaps", label: "FAQ Gap Evaluation", description: "Rasa intent evaluation and unmapped question gap reports" },
    ],
  },
  {
    title: "4. Settings Sub-Tabs",
    description: "Controls inner configuration tabs under Settings",
    icon: SlidersHorizontal,
    items: [
      { key: "settings_chatbox_controls", label: "Chatbox Controls", description: "Toggle live chatbox features and audio privileges" },
      { key: "settings_chathead_studio", label: "Chathead Studio", description: "Customize avatar icons, colors, and live simulator" },
      { key: "settings_maps", label: "Campus Maps", description: "Campus map layer configurations" },
      { key: "settings_credentials", label: "Account & Security", description: "Admin password update credentials" },
    ],
  },
  {
    title: "5. Data Edit Modal Tabs (Knowledge & Locations)",
    description: "Controls what content tabs can be edited inside the record modal",
    icon: MessageSquare,
    items: [
      { key: "modal_responses", label: "Responses Sub-Tab", description: "Edit English & Cebuano response dialogue bubbles" },
      { key: "modal_images", label: "Images Sub-Tab", description: "Upload or edit landmark and reference photos" },
      { key: "modal_map", label: "Map & Navigation Sub-Tab", description: "Place and adjust campus map pins and floor coordinates" },
    ],
  },
];

const DEFAULT_ADMIN_PERMS: AdminPermissions = {
  nav_responses: true,
  nav_reports: true,
  nav_gallery: true,
  nav_settings: true,
  nav_rbac: false,
  responses_knowledge: true,
  responses_locations: true,
  responses_sync: false,
  reports_chatbot: true,
  reports_activity_logs: false,
  reports_performance: false,
  reports_faq_gaps: false,
  settings_chatbox_controls: true,
  settings_chathead_studio: true,
  settings_maps: false,
  settings_credentials: true,
  modal_responses: true,
  modal_images: true,
  modal_map: true,
};

export function AdminRBAC() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser, isMainAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "main-admin" | "admin">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");

  // State for modifying an existing admin's rules
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<AdminPermissions>(DEFAULT_ADMIN_PERMS);

  // State for reviewing and approving a pending sign-up
  const [reviewingSignup, setReviewingSignup] = useState<AdminAccount | null>(null);
  const [approvalPermissions, setApprovalPermissions] = useState<AdminPermissions>(DEFAULT_ADMIN_PERMS);
  const [approvalCustomMessage, setApprovalCustomMessage] = useState("");
  const [showDoubleConfirmationDialog, setShowDoubleConfirmationDialog] = useState(false);

  // Queries
  const { data: accountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["adminAccounts"],
    queryFn: fetchAdminAccountsApi,
  });

  const { data: pendingData, isLoading: isLoadingPending } = useQuery({
    queryKey: ["pendingSignups"],
    queryFn: fetchPendingSignupsApi,
  });

  const { data: signupSettings } = useQuery({
    queryKey: ["signupSettings"],
    queryFn: fetchSignupSettingsApi,
  });

  const allAccounts = accountsData?.data || [];
  const pendingSignups = pendingData?.data || [];

  // Mutations
  const updatePermissionsMutation = useMutation({
    mutationFn: ({ email, permissions }: { email: string; permissions: AdminPermissions }) =>
      updateAdminPermissionsApi(email, permissions),
    onSuccess: (res) => {
      if (res.success) {
        toast({ title: "Permissions Saved", description: res.message || "Rules updated successfully." });
        queryClient.invalidateQueries({ queryKey: ["adminAccounts"] });
        setEditingAdmin(null);
      } else {
        toast({ title: "Update Failed", description: res.message, variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to update rules.", variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ email, status }: { email: string; status: "active" | "disabled" }) =>
      toggleAdminStatusApi(email, status),
    onSuccess: (res) => {
      if (res.success) {
        toast({ title: "Status Updated", description: res.message });
        queryClient.invalidateQueries({ queryKey: ["adminAccounts"] });
      } else {
        toast({ title: "Action Failed", description: res.message, variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to toggle status.", variant: "destructive" });
    },
  });

  const approveSignupMutation = useMutation({
    mutationFn: ({
      email,
      permissions,
      customMessage,
    }: {
      email: string;
      permissions: AdminPermissions;
      customMessage?: string;
    }) => approvePendingSignupApi(email, permissions, customMessage),
    onSuccess: (res) => {
      if (res.success) {
        toast({ title: "Sign-Up Confirmed", description: res.message });
        queryClient.invalidateQueries({ queryKey: ["adminAccounts"] });
        queryClient.invalidateQueries({ queryKey: ["pendingSignups"] });
        setShowDoubleConfirmationDialog(false);
        setReviewingSignup(null);
      } else {
        toast({ title: "Approval Failed", description: res.message, variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Approval failed.", variant: "destructive" });
    },
  });

  const rejectSignupMutation = useMutation({
    mutationFn: ({ email, reason }: { email: string; reason?: string }) =>
      rejectPendingSignupApi(email, reason),
    onSuccess: (res) => {
      if (res.success) {
        toast({ title: "Sign-Up Declined", description: res.message });
        queryClient.invalidateQueries({ queryKey: ["pendingSignups"] });
      } else {
        toast({ title: "Action Failed", description: res.message, variant: "destructive" });
      }
    },
  });

  const toggleSignupEnabledMutation = useMutation({
    mutationFn: (enabled: boolean) => updateSignupSettingsApi(enabled),
    onSuccess: (res) => {
      if (res.success) {
        toast({
          title: res.signupEnabled ? "Sign-Ups Enabled" : "Sign-Ups Disabled",
          description: res.message,
        });
        queryClient.invalidateQueries({ queryKey: ["signupSettings"] });
      } else {
        toast({ title: "Failed to Update Setting", description: res.message, variant: "destructive" });
      }
    },
  });

  // Filtered accounts list
  const filteredAccounts = useMemo(() => {
    return allAccounts.filter((account) => {
      // Exclude pending signups from main accounts table (they live in Pending queue)
      if (account.status === "pending_approval") return false;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        account.name.toLowerCase().includes(q) ||
        account.email.toLowerCase().includes(q);

      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "main-admin" && (account.role === "main-admin" || account.email === "thepersonaljaime@gmail.com")) ||
        (roleFilter === "admin" && account.role === "admin" && account.email !== "thepersonaljaime@gmail.com");

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && account.status !== "disabled") ||
        (statusFilter === "disabled" && account.status === "disabled");

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [allAccounts, searchQuery, roleFilter, statusFilter]);

  // Open Edit Modal for existing admin
  const handleOpenEditRules = (admin: AdminAccount) => {
    setEditingAdmin(admin);
    setSelectedPermissions({ ...DEFAULT_ADMIN_PERMS, ...(admin.permissions || {}) });
  };

  // Open Review Modal for pending signup
  const handleOpenReviewSignup = (signup: AdminAccount) => {
    setReviewingSignup(signup);
    setApprovalPermissions({ ...DEFAULT_ADMIN_PERMS });
    setApprovalCustomMessage("");
  };

  // Check whether current actor is allowed to grant/modify a specific permission key
  const canActorToggleRule = (key: keyof AdminPermissions): boolean => {
    if (isMainAdmin) return true;
    if (key === "nav_rbac") return false;
    return Boolean(currentUser?.permissions?.[key]);
  };

  // Toggle single permission key
  const handleToggleRule = (
    key: keyof AdminPermissions,
    target: "edit" | "review"
  ) => {
    if (!canActorToggleRule(key)) return;
    if (target === "edit") {
      setSelectedPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
    } else {
      setApprovalPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  // Toggle all permissions in a specific group
  const handleToggleGroup = (
    group: PermissionGroupConfig,
    enable: boolean,
    target: "edit" | "review"
  ) => {
    const patch: Partial<AdminPermissions> = {};
    group.items.forEach((item) => {
      if (canActorToggleRule(item.key)) {
        patch[item.key] = enable;
      }
    });
    if (target === "edit") {
      setSelectedPermissions((prev) => ({ ...prev, ...patch }));
    } else {
      setApprovalPermissions((prev) => ({ ...prev, ...patch }));
    }
  };

  // Count active permissions
  const countActiveRules = (perms?: AdminPermissions) => {
    if (!perms) return 0;
    return Object.values(perms).filter(Boolean).length;
  };

  const isSignupGloballyOpen = signupSettings?.signupEnabled ?? true;

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#001C38] text-amber-400 shadow-xs shrink-0">
            <SlidersHorizontal className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Rules Modification & Access Control (RBAC)
              </h2>
              <Badge variant="outline" className="bg-blue-50 text-[#001C38] border-blue-200 text-[11px] font-semibold">
                Admin Roles & Rules
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Govern user rules, disable or enable navigation tabs and feature tools, approve new sign-ups, and restrict accounts.
            </p>
          </div>
        </div>

        {/* Global Sign-Up Control Switch */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl self-start lg:self-center shadow-2xs">
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Admin Sign-Up Portal:</span>
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                isSignupGloballyOpen
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-red-100 text-red-800"
              }`}>
                {isSignupGloballyOpen ? "Open" : "Disabled"}
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              {isSignupGloballyOpen
                ? "Prospective admins can submit registration requests"
                : "New sign-ups are blocked on login page"}
            </p>
          </div>
          <Switch
            checked={isSignupGloballyOpen}
            onCheckedChange={(checked) => toggleSignupEnabledMutation.mutate(checked)}
            disabled={!isMainAdmin || toggleSignupEnabledMutation.isPending}
            aria-label="Toggle Global Admin Sign-Up"
          />
        </div>
      </div>

      {/* SECTION 1: PENDING SIGN-UPS QUEUE */}
      <Card className="border border-amber-200/80 bg-gradient-to-b from-amber-50/40 via-white to-white shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-amber-100 flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900">
                  Pending Admin Sign-Up Queue
                </CardTitle>
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] px-2">
                  {pendingSignups.length} Pending
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500">
                New accounts waiting for Main Admin approval and permission assignment.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoadingPending ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" />
              Loading pending queue...
            </div>
          ) : pendingSignups.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2 opacity-80" />
              <p className="font-semibold text-slate-700">No Pending Sign-Up Requests</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                All administrator registration submissions have been reviewed.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              {pendingSignups.map((pending) => (
                <div
                  key={pending.email}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-amber-50/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#001C38] text-amber-400 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                      {pending.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {pending.name}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          Awaiting Approval
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono truncate mt-0.5">
                        {pending.email}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Registered: {new Date(pending.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectSignupMutation.mutate({ email: pending.email })}
                      disabled={rejectSignupMutation.isPending}
                      className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-8 rounded-lg"
                    >
                      <UserX className="h-3.5 w-3.5 mr-1" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOpenReviewSignup(pending)}
                      className="bg-[#001C38] hover:bg-[#002b54] text-white text-xs h-8 font-semibold rounded-lg shadow-xs"
                    >
                      <UserCheck className="h-3.5 w-3.5 mr-1 text-amber-400" />
                      Review & Configure Rules
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: ADMINISTRATOR ACCOUNTS & RULES TABLE */}
      <Card className="border border-slate-200/80 bg-white shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#001C38]" />
                Administrator Accounts & Role Filters
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Manage granular rules, tab visibility, and account access for all active and disabled administrators.
              </CardDescription>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Input
                  type="text"
                  placeholder="Search admin name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8.5 pl-8 pr-3 text-xs rounded-xl border-slate-200"
                />
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Role filter */}
              <select
                aria-label="Filter accounts by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="h-8.5 px-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="main-admin">Main Admin Only</option>
                <option value="admin">Admin Only</option>
              </select>

              {/* Status filter */}
              <select
                aria-label="Filter accounts by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-8.5 px-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="disabled">Disabled Only</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoadingAccounts ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" />
              Loading administrators...
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No administrator accounts matched the current filter criteria.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              {filteredAccounts.map((account) => {
                const isTargetMainAdmin =
                  account.role === "main-admin" ||
                  account.email.toLowerCase() === "thepersonaljaime@gmail.com";
                const isSelf =
                  currentUser?.email?.toLowerCase() === account.email.toLowerCase();
                const isDisabled = account.status === "disabled" || !account.enabled;
                const activeRuleCount = isTargetMainAdmin ? 18 : countActiveRules(account.permissions);

                return (
                  <div
                    key={account.email}
                    className={`p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                      isDisabled ? "bg-red-50/30" : "hover:bg-slate-50/60"
                    }`}
                  >
                    {/* User Identification */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-2xs shrink-0 ${
                        isTargetMainAdmin
                          ? "bg-[#001C38] text-amber-400 ring-2 ring-amber-400/30"
                          : isDisabled
                          ? "bg-red-100 text-red-600"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {account.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {account.name}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              (You)
                            </span>
                          )}
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${
                            isTargetMainAdmin
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}>
                            {isTargetMainAdmin ? "Main Admin" : "Admin"}
                          </span>

                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 flex items-center gap-1 ${
                            isDisabled
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isDisabled ? "bg-red-500" : "bg-emerald-500"}`} />
                            {isDisabled ? "Disabled" : "Active"}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 font-mono truncate mt-0.5">
                          {account.email}
                        </div>

                        {/* Rules Summary Pill */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[10px] font-semibold text-slate-600 border-slate-200 bg-slate-50">
                            {isTargetMainAdmin ? "All 18 Rules Unrestricted (Main-Admin)" : `${activeRuleCount} of 18 Features Enabled`}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Actions on this account */}
                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      {/* Account Status Switch (Disable / Enable) */}
                      {!isTargetMainAdmin && !isSelf && (
                        <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
                          <span className="text-xs font-semibold text-slate-600">
                            {isDisabled ? "Enable" : "Active"}
                          </span>
                          <Switch
                            checked={!isDisabled}
                            onCheckedChange={(checked) =>
                              toggleStatusMutation.mutate({
                                email: account.email,
                                status: checked ? "active" : "disabled",
                              })
                            }
                            disabled={!isMainAdmin || toggleStatusMutation.isPending}
                            aria-label={`Toggle account status for ${account.name}`}
                          />
                        </div>
                      )}

                      {/* Modify Rules Button */}
                      {!isTargetMainAdmin ? (
                        isSelf ? (
                          <Badge variant="outline" className="text-[11px] font-semibold py-1 px-2.5 bg-slate-100 text-slate-600 border-slate-200">
                            Own Rules Locked
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleOpenEditRules(account)}
                            className="bg-[#001C38] hover:bg-[#002b54] text-white text-xs h-8.5 font-semibold rounded-xl shadow-xs"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
                            Modify Rules
                          </Button>
                        )
                      ) : (
                        <Badge variant="outline" className="text-[11px] font-semibold py-1 px-2.5 bg-blue-50/50 text-[#001C38] border-blue-200">
                          Full Main-Admin Authority
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL 1: EDIT RULES FOR EXISTING ADMIN */}
      <Dialog open={!!editingAdmin} onOpenChange={(open) => !open && setEditingAdmin(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="p-5 bg-slate-50 border-b border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#001C38] text-amber-400 flex items-center justify-center font-bold">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Modify Rules: {editingAdmin?.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-mono">
                  {editingAdmin?.email} • Admin
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Granular Permission Toggles */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p>
                Enabling or disabling rules will instantly adjust navigation menus, sub-tabs, and data modal tabs for this administrator.
              </p>
            </div>

            {PERMISSION_GROUPS.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.title} className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-[#001C38]" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{group.title}</h4>
                        <p className="text-[10px] text-slate-500">{group.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleGroup(group, true, "edit")}
                        className="text-[10px] text-blue-700 hover:underline font-semibold"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => handleToggleGroup(group, false, "edit")}
                        className="text-[10px] text-slate-500 hover:underline font-semibold"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {group.items.map((item) => {
                      const isChecked = Boolean(selectedPermissions[item.key]);
                      const canToggle = canActorToggleRule(item.key);
                      return (
                        <div
                          key={item.key}
                          onClick={() => canToggle && handleToggleRule(item.key, "edit")}
                          className={`p-2.5 rounded-lg border text-xs transition-all flex items-start justify-between gap-2 ${
                            !canToggle
                              ? "border-slate-200 bg-slate-50/70 text-slate-400 cursor-not-allowed opacity-70"
                              : isChecked
                              ? "border-[#001C38]/40 bg-blue-50/40 text-slate-900 ring-1 ring-[#001C38]/10 cursor-pointer"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 cursor-pointer"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-xs block text-slate-900 leading-tight">
                              {item.label}
                            </span>
                            <span className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                              {item.description}
                            </span>
                          </div>
                          <div onClick={(e) => e.stopPropagation()} className="shrink-0 mt-0.5">
                            <Switch
                              checked={isChecked}
                              disabled={!canToggle}
                              onCheckedChange={() => handleToggleRule(item.key, "edit")}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setEditingAdmin(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingAdmin) {
                  updatePermissionsMutation.mutate({
                    email: editingAdmin.email,
                    permissions: selectedPermissions,
                  });
                }
              }}
              disabled={updatePermissionsMutation.isPending}
              className="bg-[#001C38] hover:bg-[#002b54] text-white text-xs font-semibold px-5 rounded-xl shadow-xs"
            >
              {updatePermissionsMutation.isPending ? "Saving..." : "Save Rule Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: REVIEW & CONFIGURE RULES FOR PENDING SIGN-UP */}
      <Dialog open={!!reviewingSignup && !showDoubleConfirmationDialog} onOpenChange={(open) => !open && setReviewingSignup(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="p-5 bg-amber-50/60 border-b border-amber-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Review Sign-Up & Assign Rules
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600 font-mono">
                  Applicant: {reviewingSignup?.name} ({reviewingSignup?.email})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Optional message input for the email */}
            <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-amber-500" />
                Optional Approval Message (Included in Confirmation Email)
              </Label>
              <Textarea
                placeholder="e.g. Welcome aboard! You have been granted access to update Knowledge Manager topics for the Admissions office."
                value={approvalCustomMessage}
                onChange={(e) => setApprovalCustomMessage(e.target.value)}
                rows={2}
                className="text-xs rounded-lg border-slate-200"
              />
              <p className="text-[10px] text-slate-500">
                This note will be formatted inside the approval notification email sent to the user.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Select Permissions For New Admin:
              </h4>
              <p className="text-[11px] text-slate-500">
                Configure which navigation tabs and editing features this administrator can access.
              </p>
            </div>

            {PERMISSION_GROUPS.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.title} className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-[#001C38]" />
                      <h4 className="text-xs font-bold text-slate-900">{group.title}</h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleGroup(group, true, "review")}
                        className="text-[10px] text-blue-700 hover:underline font-semibold"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => handleToggleGroup(group, false, "review")}
                        className="text-[10px] text-slate-500 hover:underline font-semibold"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {group.items.map((item) => {
                      const isChecked = Boolean(approvalPermissions[item.key]);
                      const canToggle = canActorToggleRule(item.key);
                      return (
                        <div
                          key={item.key}
                          onClick={() => canToggle && handleToggleRule(item.key, "review")}
                          className={`p-2.5 rounded-lg border text-xs transition-all flex items-start justify-between gap-2 ${
                            !canToggle
                              ? "border-slate-200 bg-slate-50/70 text-slate-400 cursor-not-allowed opacity-70"
                              : isChecked
                              ? "border-[#001C38]/40 bg-blue-50/40 text-slate-900 ring-1 ring-[#001C38]/10 cursor-pointer"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 cursor-pointer"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-xs block text-slate-900 leading-tight">
                              {item.label}
                            </span>
                            <span className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                              {item.description}
                            </span>
                          </div>
                          <div onClick={(e) => e.stopPropagation()} className="shrink-0 mt-0.5">
                            <Switch
                              checked={isChecked}
                              disabled={!canToggle}
                              onCheckedChange={() => handleToggleRule(item.key, "review")}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setReviewingSignup(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => setShowDoubleConfirmationDialog(true)}
              className="bg-[#001C38] hover:bg-[#002b54] text-white text-xs font-semibold px-5 rounded-xl shadow-xs"
            >
              Continue to Confirmation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DOUBLE CONFIRMATION ALERT DIALOG */}
      <AlertDialog open={showDoubleConfirmationDialog} onOpenChange={setShowDoubleConfirmationDialog}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2 mx-auto">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-center text-base font-bold text-slate-900">
              Confirm Admin Account Activation
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs text-slate-600 leading-relaxed">
              (make sure that all the feature and other rules are perfectly correct, are you sure you want to confirm the user sign up) for <strong>{reviewingSignup?.name}</strong> ({reviewingSignup?.email})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 sm:justify-center mt-3">
            <AlertDialogCancel
              onClick={() => setShowDoubleConfirmationDialog(false)}
              className="text-xs rounded-xl"
            >
              Review Rules Again
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (reviewingSignup) {
                  approveSignupMutation.mutate({
                    email: reviewingSignup.email,
                    permissions: approvalPermissions,
                    customMessage: approvalCustomMessage.trim() || undefined,
                  });
                }
              }}
              disabled={approveSignupMutation.isPending}
              className="bg-[#001C38] hover:bg-[#002b54] text-white text-xs font-semibold rounded-xl"
            >
              {approveSignupMutation.isPending ? "Activating..." : "Yes, Confirm & Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

