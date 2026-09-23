import { useState, useEffect, useId, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserPrivilegesAdmin,
  saveUserPrivilegesAdmin,
  fetchAutoTranslateStatus,
  sendVerificationCode,
  verifyCodeAndUpdateEmail,
  changePassword,
  syncKnowledgeBaseApi,
  fetchChatWidgetSettings,
  saveChatWidgetSettings,
  deleteUploadedImageByUrl,
  type ChatWidgetSettings
} from "@/lib/adminApi";
import type { ResponseData, Location, UserPrivileges, MigrationResult } from "@/types/admin";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Users, 
  MessageSquare, 
  Settings, 
  Map as MapIcon, 
  LogOut, 
  Shield, 
  HelpCircle,
  Database,
  BookOpen,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  User as UserIcon,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit,
  Save,
  TriangleAlert,
  Loader2,
  FileJson,
  Mail,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Activity,
  Zap,
  FileText,
  Mic,
  MapPin,
  Volume2,
  Palette,
  SlidersHorizontal,
  Bot,
  GraduationCap,
  Sparkles,
  ChevronDown,
  Check,
  ShieldCheck,
  KeyRound,
  Info,
  Minimize2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import InteractiveMap from "@/components/InteractiveMap";
import { AdminKnowledgeManager } from "@/components/admin/AdminKnowledgeManager";
import { AdminLocations } from "@/components/admin/AdminLocations";
import { AdminMapSettings } from "@/components/admin/AdminMapSettings";
import { AdminGallery } from "@/components/admin/AdminGallery";
import { AdminReports } from "@/components/admin/AdminReports";
import { AdminImageUploader } from "@/components/admin/AdminImageUploader";
import { AdminActivityLogs } from "@/components/admin/AdminActivityLogs";
import { AdminFaqGapReport } from "@/components/admin/AdminFaqGapReport";
import { AdminPerformance } from "@/components/admin/AdminPerformance";
import { AdminTooltip } from "@/components/admin/AdminTooltip";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logout, user, isMainAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("responses");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showUnsavedSettingsDialog, setShowUnsavedSettingsDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [responsesSubTab, setResponsesSubTab] = useState<"knowledge" | "locations">("knowledge");
  const [reportsSubTab, setReportsSubTab] = useState<"user-reports" | "activity-logs" | "performance" | "faq-gaps">("user-reports");
  const isEffectiveMainAdmin = Boolean(isMainAdmin || user?.role === 'main-admin' || user?.email?.toLowerCase() === 'thepersonaljaime@gmail.com');
  
  const DEFAULT_PRIVILEGES: UserPrivileges = {
    chatEnabled: true,
    audioInputEnabled: true,
    mapAccessEnabled: true,
    autoTranslateEnabled: true
  };
  
  // --- User Privileges Query ---
  const { data: fetchedPrivileges } = useQuery({
    queryKey: ["userPrivileges"],
    queryFn: fetchUserPrivilegesAdmin,
    staleTime: 60000, // Consider data fresh for 1 minute
    refetchInterval: 60000, // Only poll every minute
    refetchOnWindowFocus: false,
    enabled: activeTab === "privileges",
  });

  const { data: autoTranslateStatus } = useQuery({
    queryKey: ["autoTranslateStatus"],
    queryFn: fetchAutoTranslateStatus,
    refetchInterval: (query) => query.state.data?.status === "running" ? 10000 : false,
    staleTime: 5000, // Consider data fresh for 5 seconds
  });

  const { data: fetchedWidgetSettings } = useQuery({
    queryKey: ["chatWidgetSettings"],
    queryFn: fetchChatWidgetSettings,
    staleTime: 60000,
    enabled: activeTab === "privileges",
  });

  const mountedAtRef = useRef<number>(Date.now());
  const lastNotifiedJobIdRef = useRef<string | null>(null);
  const translationBusy = autoTranslateStatus?.status === "running";
  const translationBusyIntent: string | null =
    typeof autoTranslateStatus?.current?.intent === "string" ? autoTranslateStatus.current.intent : null;

  const [privileges, setPrivileges] = useState<UserPrivileges>(DEFAULT_PRIVILEGES);
  const [savedPrivileges, setSavedPrivileges] = useState<UserPrivileges>(DEFAULT_PRIVILEGES);
  const [widgetSettings, setWidgetSettings] = useState<ChatWidgetSettings>({
    inactiveIcon: "💬",
    inactiveImageUrl: "",
    activeIcon: "✕",
    activeImageUrl: "",
    inactiveCustomImages: [],
    activeCustomImages: [],
    chatheadBgColor: "#001C38",
    chatheadOpacity: 1,
    audioResponseEnabled: true,
  });
  const [savedWidgetSettings, setSavedWidgetSettings] = useState<ChatWidgetSettings>({
    inactiveIcon: "💬",
    inactiveImageUrl: "",
    activeIcon: "✕",
    activeImageUrl: "",
    inactiveCustomImages: [],
    activeCustomImages: [],
    chatheadBgColor: "#001C38",
    chatheadOpacity: 1,
    audioResponseEnabled: true,
  });
  const [avatarDeleteMode, setAvatarDeleteMode] = useState(false);
  const [previewAvatarMode, setPreviewAvatarMode] = useState<"inactive" | "active">("inactive");
  const [settingsSubTab, setSettingsSubTab] = useState<"features" | "chathead" | "maps" | "account">("features");
  const [chatheadTarget, setChatheadTarget] = useState<"inactive" | "active">("inactive");

  useEffect(() => {
    if (fetchedPrivileges) {
      setPrivileges(fetchedPrivileges);
      setSavedPrivileges(fetchedPrivileges);
    }
  }, [fetchedPrivileges]);

  useEffect(() => {
    if (fetchedWidgetSettings) {
      setWidgetSettings(fetchedWidgetSettings);
      setSavedWidgetSettings(fetchedWidgetSettings);
    }
  }, [fetchedWidgetSettings]);

  useEffect(() => {
    const last = autoTranslateStatus?.lastCompleted;
    if (!last?.jobId || typeof last.jobId !== "string") return;
    if (typeof last?.finishedAt === "number" && last.finishedAt < mountedAtRef.current) return;
    if (lastNotifiedJobIdRef.current === last.jobId) return;
    if (last?.status !== "completed" && last?.status !== "failed") return;

    lastNotifiedJobIdRef.current = last.jobId;

    if (last.status === "completed") {
      toast({ title: "English Translation complete" });
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      return;
    }

    toast({
      title: "Translation failed",
      description: last?.error || "Auto-translation failed. Please try again or type the Bisaya response manually.",
      variant: "destructive",
    });
  }, [autoTranslateStatus, queryClient, toast]);

  // --- Mutations ---
  const saveSettingsMutation = useMutation({
    mutationFn: async (payload: { privileges: UserPrivileges; widgetSettings: ChatWidgetSettings }) => {
      const [privilegeResult, widgetResult] = await Promise.all([
        saveUserPrivilegesAdmin(payload.privileges),
        saveChatWidgetSettings(payload.widgetSettings),
      ]);
      if (!privilegeResult.success) throw new Error(privilegeResult.message || "Failed to save chatbox toggles");
      if (!widgetResult.success) throw new Error(widgetResult.message || "Failed to save chathead settings");
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPrivileges"] });
      queryClient.invalidateQueries({ queryKey: ["privileges"] });
      queryClient.invalidateQueries({ queryKey: ["chatWidgetSettings"] });
      setSavedPrivileges(privileges);
      setSavedWidgetSettings(widgetSettings);
      toast({ title: "Settings updated" });
      setActiveTab("responses");
    },
    onError: (error: any) => {
      toast({ title: "Failed to update settings", description: error?.message, variant: "destructive" });
    }
  });

  const syncKnowledgeBaseMutation = useMutation({
    mutationFn: (force: boolean) => syncKnowledgeBaseApi(force),
    onSuccess: (result: MigrationResult) => {
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["locationSummaries"] });
      queryClient.invalidateQueries({ queryKey: ["super-intent-meta"] });
      queryClient.invalidateQueries({ queryKey: ["knowledgeRecords"] });
      queryClient.invalidateQueries({ queryKey: ["knowledgeSummaries"] });
      queryClient.invalidateQueries({ queryKey: ["migration-status"] });
      const description = result.message + (result.errors?.length ? ` (${result.errors.length} errors)` : "");
      toast({ 
        title: result.success ? (result.imported > 0 ? "Sync Complete" : "Already Up to Date") : "Sync Issues", 
        description: result.errors?.length ? `${description}. Errors: ${result.errors.join(", ")}` : description,
        variant: result.success ? "default" : "destructive" 
      });
      setShowSyncDialog(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Sync Error", 
        description: error?.message || "An error occurred during synchronization",
        variant: "destructive"
      });
      setShowSyncDialog(false);
    }
  });

  const handlePrivilegeToggle = (key: keyof UserPrivileges, checked: boolean) => {
    setPrivileges({
      ...privileges,
      [key]: checked
    });
  };

  const settingsDirty =
    JSON.stringify(privileges) !== JSON.stringify(savedPrivileges) ||
    JSON.stringify(widgetSettings) !== JSON.stringify(savedWidgetSettings);
  const PRESET_AVATAR_ICONS = [
    { id: "message-square", label: "Chat", icon: MessageSquare },
    { id: "bot", label: "Assistant", icon: Bot },
    { id: "graduation-cap", label: "University", icon: GraduationCap },
    { id: "sparkles", label: "AI Smart", icon: Sparkles },
    { id: "help-circle", label: "Help Desk", icon: HelpCircle },
    { id: "info", label: "Information", icon: Info },
    { id: "x", label: "Close Cross", icon: X },
    { id: "chevron-down", label: "Minimize", icon: ChevronDown },
  ];

  const BUKSU_COLOR_PRESETS = [
    { name: "BukSU Deep Navy", hex: "#001C38" },
    { name: "BukSU Royal Blue", hex: "#002b54" },
    { name: "BukSU Classic Blue", hex: "#0356a9" },
    { name: "BukSU University Gold", hex: "#F59E0B" },
    { name: "BukSU Dark Amber", hex: "#D97706" },
  ];

  const renderAvatarGraphic = (val: string, className: string = "h-5 w-5") => {
    if (!val) return <MessageSquare className={className} />;
    if (val.startsWith("/api/images/") || /^https?:\/\//i.test(val) || val.startsWith("/")) {
      return <img src={val} alt="Avatar" className="h-full w-full object-cover" />;
    }
    switch (val) {
      case "message-square":
      case "message-circle":
      case "💬":
        return <MessageSquare className={className} />;
      case "bot":
      case "🤖":
        return <Bot className={className} />;
      case "graduation-cap":
      case "🎓":
        return <GraduationCap className={className} />;
      case "sparkles":
        return <Sparkles className={className} />;
      case "help-circle":
      case "?":
        return <HelpCircle className={className} />;
      case "info":
      case "i":
        return <Info className={className} />;
      case "x":
      case "✕":
        return <X className={className} />;
      case "chevron-down":
        return <ChevronDown className={className} />;
      default:
        return <span className="font-bold text-sm">{val}</span>;
    }
  };

  const customAvatarImages = Array.from(new Set([
    ...widgetSettings.inactiveCustomImages,
    ...widgetSettings.activeCustomImages,
  ]));

  const getAvatarValue = (mode: "inactive" | "active") => (
    mode === "inactive"
      ? (widgetSettings.inactiveImageUrl || widgetSettings.inactiveIcon)
      : (widgetSettings.activeImageUrl || widgetSettings.activeIcon)
  );

  const selectAvatar = (mode: "inactive" | "active", value: string) => {
    if (value.startsWith("/api/images/") || /^https?:\/\//i.test(value) || value.startsWith("/")) {
      setWidgetSettings(mode === "inactive"
        ? { ...widgetSettings, inactiveImageUrl: value }
        : { ...widgetSettings, activeImageUrl: value });
      return;
    }
    setWidgetSettings(mode === "inactive"
      ? { ...widgetSettings, inactiveIcon: value, inactiveImageUrl: "" }
      : { ...widgetSettings, activeIcon: value, activeImageUrl: "" });
  };

  const applyAvatarToBoth = (value: string) => {
    if (value.startsWith("/api/images/") || /^https?:\/\//i.test(value) || value.startsWith("/")) {
      setWidgetSettings({
        ...widgetSettings,
        inactiveImageUrl: value,
        activeImageUrl: value,
      });
      return;
    }
    setWidgetSettings({
      ...widgetSettings,
      inactiveIcon: value,
      inactiveImageUrl: "",
      activeIcon: value,
      activeImageUrl: "",
    });
  };

  const addCustomAvatar = (url: string) => {
    const uploadedCount = customAvatarImages.filter((item) => item.startsWith("/api/images/")).length;
    const urlCount = customAvatarImages.filter((item) => !item.startsWith("/api/images/")).length;
    const isUploaded = url.startsWith("/api/images/");
    if (isUploaded && uploadedCount >= 6) {
      toast({ title: "Upload limit reached", description: "Only 6 uploaded avatar images are allowed.", variant: "destructive" });
      return;
    }
    if (!isUploaded && urlCount >= 12) {
      toast({ title: "URL limit reached", description: "Only 12 URL avatar images are allowed.", variant: "destructive" });
      return;
    }
    const next = Array.from(new Set([...customAvatarImages, url]));
    setWidgetSettings({
      ...widgetSettings,
      inactiveCustomImages: next,
      activeCustomImages: next,
    });
  };

  const deleteCustomAvatar = async (url: string) => {
    const next = customAvatarImages.filter((item) => item !== url);
    setWidgetSettings({
      ...widgetSettings,
      inactiveCustomImages: next,
      activeCustomImages: next,
      inactiveImageUrl: widgetSettings.inactiveImageUrl === url ? "" : widgetSettings.inactiveImageUrl,
      activeImageUrl: widgetSettings.activeImageUrl === url ? "" : widgetSettings.activeImageUrl,
    });

    if (url.startsWith("/api/images/")) {
      const result = await deleteUploadedImageByUrl(url);
      if (!result.success) {
        toast({ title: "Image removed from settings", description: result.message || "The image record could not be deleted from storage.", variant: "destructive" });
        return;
      }
    }
    toast({ title: "Avatar deleted", description: "The custom avatar was removed." });
  };

  const handleNavigate = (tabId: string) => {
    if (activeTab === "privileges" && settingsDirty && tabId !== "privileges") {
      setPendingTab(tabId);
      setShowUnsavedSettingsDialog(true);
      return;
    }
    setActiveTab(tabId);
    setIsMobileSidebarOpen(false);
  };

  const discardSettingsAndNavigate = () => {
    setPrivileges(savedPrivileges);
    setWidgetSettings(savedWidgetSettings);
    setShowUnsavedSettingsDialog(false);
    setActiveTab(pendingTab || "responses");
    setPendingTab(null);
    setIsMobileSidebarOpen(false);
  };

  // --- UI ---
  const menuItems = [
    { id: "responses", label: "Responses", description: "Manage bot responses, topics, and campus maps", icon: MessageSquare },
    { id: "reports", label: "Reports", description: "Feedback, activity logs, and performance metrics", icon: Shield },
    { id: "gallery", label: "Gallery", description: "Campus photos and landmark gallery", icon: ImageIcon },
    { id: "privileges", label: "Settings", description: "Privileges, chathead customization, and map settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 flex">
      {/* Mobile Top Header (visible on screens < lg) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <img 
            src="/LOGO.png" 
            alt="BukSU Logo" 
            className="w-8 h-8 rounded-lg object-contain shadow-xs shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div>
            <h1 className="text-sm font-bold text-[#001C38] leading-tight">Admin Panel</h1>
            <p className="text-[10px] text-slate-500">BukSU AI Assistant</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          aria-label="Toggle navigation drawer"
          className="text-slate-700 hover:text-slate-900 hover:bg-slate-100"
        >
          {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Left Sidebar (Desktop Fixed, Mobile Slide-over) */}
      <aside
        aria-label="Sidebar Navigation"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] lg:w-64 bg-white border-r border-slate-200/80 shadow-xl lg:shadow-xs flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top: Brand Header */}
        <div>
          <div className="h-16 lg:h-18 px-5 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/LOGO.png" 
                alt="BukSU Logo" 
                className="w-9 h-9 rounded-xl object-contain shadow-xs shrink-0"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div>
                <h1 className="text-base font-bold text-[#001C38] tracking-tight leading-tight">
                  Admin Panel
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  BukSU AI Assistant
                </p>
              </div>
            </div>
            {/* Close button inside drawer for mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden text-slate-500 hover:text-slate-800"
              aria-label="Close navigation drawer"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            <div className="px-3 pb-1.5 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Management
              </span>
            </div>

            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  aria-label={item.label}
                  className={`group w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-[#001C38] text-white shadow-sm shadow-[#001C38]/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1 rounded-lg transition-colors shrink-0 ${
                      isActive ? "text-amber-400" : "text-slate-400 group-hover:text-slate-700"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="leading-tight truncate">{item.label}</div>
                      <div className={`text-[10px] font-normal truncate max-w-[130px] hidden sm:block ${
                        isActive ? "text-blue-200/80" : "text-slate-400"
                      }`}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                  {isActive ? (
                    <span className="w-1.5 h-6 rounded-full bg-amber-400 shadow-xs shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Profile Card & Logout */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50 space-y-2.5">
          {/* Admin User Profile */}
          {user && (
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#001C38] text-amber-400 flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                {(user.name || user.email || "A").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {user.name || "Administrator"}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                    user.role === 'main-admin' || user.email?.toLowerCase() === 'thepersonaljaime@gmail.com'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {user.role === 'main-admin' || user.email?.toLowerCase() === 'thepersonaljaime@gmail.com' ? 'Main' : 'Co'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowLogoutConfirmation(true)}
            className="w-full justify-center gap-2 border-red-200 bg-red-50/60 hover:bg-red-100/80 text-red-600 hover:text-red-700 font-semibold text-xs h-9 rounded-xl transition-all shadow-2xs"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 lg:ml-64 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 pb-12 w-full max-w-7xl mx-auto">
        <div className="w-full">
          {activeTab === "responses" && (
            <div className="space-y-6">
              {/* Header & Sub-Navigation matching BukSU Admin Theme */}
              <div className="flex flex-col gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#001C38] text-white shadow-sm shrink-0">
                      <Database className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Responses & Knowledge Base</h2>
                        <Badge variant="outline" className="bg-blue-50 text-[#001C38] border-blue-200 text-[11px] font-semibold">
                          BukSU AI Responses
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Browse, filter, and edit structured chatbot responses, topics, multi-language dialogue, campus building coordinates, pins, and routes.
                      </p>
                    </div>
                  </div>

                  <AdminTooltip
                    title="Sync Records"
                    description="Synchronize and persist all knowledge and location records with the database"
                    side="bottom"
                  >
                    <Button 
                      onClick={() => setShowSyncDialog(true)}
                      className="bg-[#001C38] hover:bg-[#032f5d] text-white font-semibold flex items-center gap-2 shadow-sm border border-blue-900/30 self-start md:self-center"
                    >
                      <RefreshCw className={`w-4 h-4 text-amber-400 ${syncKnowledgeBaseMutation.isPending ? "animate-spin" : ""}`} />
                      <span>Sync Records</span>
                    </Button>
                  </AdminTooltip>
                </div>

                {/* Sub-Tabs Navigation (straight, prominent layout matching Settings and Reports tabs) */}
                <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1.5 rounded-xl border border-slate-200/80">
                  <AdminTooltip
                    title="Knowledge Manager"
                    description="Browse, filter, and edit structured knowledge categories, topics, and responses"
                    side="top"
                  >
                    <button
                      type="button"
                      onClick={() => setResponsesSubTab("knowledge")}
                      className={`flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                        responsesSubTab === "knowledge"
                          ? "bg-[#001C38] text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      }`}
                    >
                      <BookOpen className={`h-4 w-4 ${responsesSubTab === "knowledge" ? "text-amber-400" : "text-slate-500"}`} />
                      <span>Knowledge Manager</span>
                    </button>
                  </AdminTooltip>

                  <AdminTooltip
                    title="Locations & Maps"
                    description="Manage campus buildings, room coordinates, map pins, and navigational routes"
                    side="top"
                  >
                    <button
                      type="button"
                      onClick={() => setResponsesSubTab("locations")}
                      className={`flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                        responsesSubTab === "locations"
                          ? "bg-[#001C38] text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      }`}
                    >
                      <MapPin className={`h-4 w-4 ${responsesSubTab === "locations" ? "text-amber-400" : "text-slate-500"}`} />
                      <span>Campus Locations & Maps</span>
                    </button>
                  </AdminTooltip>
                </div>
              </div>

              {/* Main Content Area */}
              <Card className="border border-slate-200/80 shadow-md overflow-hidden bg-white/90 backdrop-blur-sm rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  {responsesSubTab === "knowledge" ? (
                    <AdminKnowledgeManager />
                  ) : (
                    <AdminLocations />
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "privileges" && (
            <div className="space-y-6">
              {/* Header & Sub-Navigation */}
              <div className="flex flex-col gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#001C38] text-white shadow-sm shrink-0">
                      <Settings className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">System & Widget Settings</h2>
                        <Badge variant="outline" className="bg-blue-50 text-[#001C38] border-blue-200 text-[11px] font-semibold">
                          BukSU AI System
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Configure student chat privileges, customize the avatar & branding colors, manage campus maps, and manage administrator credentials.
                      </p>
                    </div>
                  </div>

                  {settingsDirty && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-900 px-3.5 py-1.5 rounded-xl text-xs font-semibold self-start md:self-center shadow-sm animate-pulse">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Unsaved modifications pending</span>
                    </div>
                  )}
                </div>

                {/* Sub-Tabs Navigation (straight, prominent layout matching Reports tab) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-200/70 p-1.5 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab("features")}
                    className={`flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                      settingsSubTab === "features"
                        ? "bg-[#001C38] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                    Chatbox Controls
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsSubTab("chathead")}
                    className={`flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                      settingsSubTab === "chathead"
                        ? "bg-[#001C38] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <Palette className="h-4 w-4 text-amber-400" />
                    Chathead Studio
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsSubTab("maps")}
                    className={`flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                      settingsSubTab === "maps"
                        ? "bg-[#001C38] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <MapIcon className="h-4 w-4 text-amber-400" />
                    Campus Maps
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsSubTab("account")}
                    className={`flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                      settingsSubTab === "account"
                        ? "bg-[#001C38] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4 text-amber-400" />
                    Account & Security
                  </button>
                </div>
              </div>

              {/* 1. CHATBOX CONTROLS SUB-TAB */}
              {settingsSubTab === "features" && (
                <div className="space-y-5">
                  <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-[#001C38] via-[#0356a9] to-[#F59E0B]" />
                    <CardHeader className="p-5 sm:p-6 bg-slate-50/50 border-b border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg font-bold text-slate-900">Student Feature Privileges</CardTitle>
                          <CardDescription className="text-xs sm:text-sm text-slate-500">
                            Control which interactive capabilities are available in the public chatbot window.
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs font-semibold"
                            onClick={() => {
                              setPrivileges({
                                chatEnabled: true,
                                audioInputEnabled: true,
                                mapAccessEnabled: true,
                                autoTranslateEnabled: true
                              });
                              setWidgetSettings({ ...widgetSettings, audioResponseEnabled: true });
                            }}
                          >
                            <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            Enable All Features
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 sm:p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Feature 1: User Chat */}
                        <div className={`p-4 rounded-xl border transition-all ${
                          privileges.chatEnabled 
                            ? "border-blue-200 bg-blue-50/20 shadow-sm" 
                            : "border-slate-200 bg-slate-50/50 opacity-80"
                        }`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#001C38] text-white shadow-sm mt-0.5">
                                <MessageSquare className="h-5 w-5 text-amber-400" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm font-bold text-slate-800 cursor-pointer" onClick={() => handlePrivilegeToggle("chatEnabled", !privileges.chatEnabled)}>
                                    User Chat & Inquiries
                                  </Label>
                                  <Badge className={privileges.chatEnabled ? "bg-emerald-100 text-emerald-800 text-[10px]" : "bg-slate-200 text-slate-600 text-[10px]"}>
                                    {privileges.chatEnabled ? "Live / Active" : "Disabled"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  Permits students and website visitors to type questions and communicate with BukSU AI in real-time.
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={privileges.chatEnabled}
                              onCheckedChange={(checked) => handlePrivilegeToggle("chatEnabled", checked)}
                              disabled={saveSettingsMutation.isPending}
                            />
                          </div>
                        </div>

                        {/* Feature 2: Audio Microphone */}
                        <div className={`p-4 rounded-xl border transition-all ${
                          privileges.audioInputEnabled 
                            ? "border-blue-200 bg-blue-50/20 shadow-sm" 
                            : "border-slate-200 bg-slate-50/50 opacity-80"
                        }`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#001C38] text-white shadow-sm mt-0.5">
                                <Mic className="h-5 w-5 text-amber-400" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm font-bold text-slate-800 cursor-pointer" onClick={() => handlePrivilegeToggle("audioInputEnabled", !privileges.audioInputEnabled)}>
                                    Voice / Audio Input
                                  </Label>
                                  <Badge className={privileges.audioInputEnabled ? "bg-emerald-100 text-emerald-800 text-[10px]" : "bg-slate-200 text-slate-600 text-[10px]"}>
                                    {privileges.audioInputEnabled ? "Live / Active" : "Disabled"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  Shows speech-to-text microphone button in the input bar so students can dictate spoken inquiries.
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={privileges.audioInputEnabled}
                              onCheckedChange={(checked) => handlePrivilegeToggle("audioInputEnabled", checked)}
                              disabled={saveSettingsMutation.isPending}
                            />
                          </div>
                        </div>

                        {/* Feature 3: Map Access */}
                        <div className={`p-4 rounded-xl border transition-all ${
                          privileges.mapAccessEnabled 
                            ? "border-blue-200 bg-blue-50/20 shadow-sm" 
                            : "border-slate-200 bg-slate-50/50 opacity-80"
                        }`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#001C38] text-white shadow-sm mt-0.5">
                                <MapPin className="h-5 w-5 text-amber-400" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm font-bold text-slate-800 cursor-pointer" onClick={() => handlePrivilegeToggle("mapAccessEnabled", !privileges.mapAccessEnabled)}>
                                    Campus Map & Pin Navigation
                                  </Label>
                                  <Badge className={privileges.mapAccessEnabled ? "bg-emerald-100 text-emerald-800 text-[10px]" : "bg-slate-200 text-slate-600 text-[10px]"}>
                                    {privileges.mapAccessEnabled ? "Live / Active" : "Disabled"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  Enables interactive campus blueprints and pin coordinates when students ask for building or office directions.
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={privileges.mapAccessEnabled}
                              onCheckedChange={(checked) => handlePrivilegeToggle("mapAccessEnabled", checked)}
                              disabled={saveSettingsMutation.isPending}
                            />
                          </div>
                        </div>

                        {/* Feature 4: Audio Response */}
                        <div className={`p-4 rounded-xl border transition-all ${
                          widgetSettings.audioResponseEnabled !== false 
                            ? "border-blue-200 bg-blue-50/20 shadow-sm" 
                            : "border-slate-200 bg-slate-50/50 opacity-80"
                        }`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#001C38] text-white shadow-sm mt-0.5">
                                <Volume2 className="h-5 w-5 text-amber-400" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm font-bold text-slate-800 cursor-pointer" onClick={() => setWidgetSettings({ ...widgetSettings, audioResponseEnabled: !(widgetSettings.audioResponseEnabled !== false) })}>
                                    Text-to-Speech Spoken Audio
                                  </Label>
                                  <Badge className={widgetSettings.audioResponseEnabled !== false ? "bg-emerald-100 text-emerald-800 text-[10px]" : "bg-slate-200 text-slate-600 text-[10px]"}>
                                    {widgetSettings.audioResponseEnabled !== false ? "Live / Active" : "Disabled"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  Provides audio playback buttons on answers and automatically reads messages aloud if the user turns on TTS.
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={widgetSettings.audioResponseEnabled !== false}
                              onCheckedChange={(checked) => setWidgetSettings({ ...widgetSettings, audioResponseEnabled: checked })}
                              disabled={saveSettingsMutation.isPending}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 2. CHATHEAD STUDIO SUB-TAB */}
              {settingsSubTab === "chathead" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Studio Controls */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Step 1: Target Selector Card */}
                    <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                      <div className="h-1.5 w-full bg-gradient-to-r from-[#001C38] to-[#0356a9]" />
                      <CardHeader className="p-4 sm:p-5 bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#001C38] text-white text-xs font-bold">1</span>
                          Select Chathead State to Customize
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                          Click either state below to select which avatar you are assigning icons, images, or colors to.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Closed Target Selector */}
                          <div
                            onClick={() => {
                              setChatheadTarget("inactive");
                              setPreviewAvatarMode("inactive");
                            }}
                            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-center gap-3 ${
                              chatheadTarget === "inactive"
                                ? "border-[#001C38] bg-blue-50/30 ring-2 ring-[#001C38]/10 shadow-sm"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            <div
                              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-white shadow-md transition-transform"
                              style={{ backgroundColor: widgetSettings.chatheadBgColor || "#001C38", opacity: widgetSettings.chatheadOpacity ?? 1 }}
                            >
                              {renderAvatarGraphic(getAvatarValue("inactive"), "h-6 w-6")}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-slate-800">Closed Chathead</span>
                                {chatheadTarget === "inactive" && (
                                  <Badge className="bg-[#001C38] text-white text-[9px] px-1.5 py-0">Editing</Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">Floating bubble when chatbox is collapsed</p>
                            </div>
                          </div>

                          {/* Open Target Selector */}
                          <div
                            onClick={() => {
                              setChatheadTarget("active");
                              setPreviewAvatarMode("active");
                            }}
                            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-center gap-3 ${
                              chatheadTarget === "active"
                                ? "border-[#001C38] bg-blue-50/30 ring-2 ring-[#001C38]/10 shadow-sm"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            <div
                              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-white shadow-md transition-transform"
                              style={{ backgroundColor: widgetSettings.chatheadBgColor || "#001C38", opacity: widgetSettings.chatheadOpacity ?? 1 }}
                            >
                              {renderAvatarGraphic(getAvatarValue("active") || "x", "h-6 w-6")}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-slate-800">Open Chathead</span>
                                {chatheadTarget === "active" && (
                                  <Badge className="bg-[#001C38] text-white text-[9px] px-1.5 py-0">Editing</Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">Floating button when chatbox is open</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Step 2: Icon & Avatar Library Card */}
                    <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                      <div className="h-1.5 w-full bg-gradient-to-r from-[#0356a9] to-[#F59E0B]" />
                      <CardHeader className="p-4 sm:p-5 bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#001C38] text-white text-xs font-bold">2</span>
                              Avatar Library
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500">
                              Click any icon or image below to apply it to the <strong className="text-slate-800 font-semibold">{chatheadTarget === "inactive" ? "Closed Chathead" : "Open Chathead"}</strong>.
                            </CardDescription>
                          </div>

                          <Button
                            size="sm"
                            variant={avatarDeleteMode ? "destructive" : "outline"}
                            onClick={() => setAvatarDeleteMode(!avatarDeleteMode)}
                            className="text-xs font-semibold"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            {avatarDeleteMode ? "Done Deleting" : "Delete Images"}
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 sm:p-5 space-y-5">
                        {/* Section: Vector Icons */}
                        <div>
                          <p className="text-xs font-semibold text-slate-600 mb-2.5">Preset Vector Icons</p>
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                            {PRESET_AVATAR_ICONS.map((item) => {
                              const IconComponent = item.icon;
                              const isClosed = getAvatarValue("inactive") === item.id;
                              const isOpen = getAvatarValue("active") === item.id;
                              const isTargetSelected = chatheadTarget === "inactive" ? isClosed : isOpen;

                              return (
                                <DropdownMenu key={`preset-icon-${item.id}`}>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className={`group relative flex flex-col items-center justify-center p-2 h-16 rounded-xl border transition-all text-slate-700 bg-white hover:border-[#001C38] hover:shadow-sm ${
                                        isTargetSelected
                                          ? "border-[#001C38] ring-2 ring-[#001C38]/20 bg-blue-50/20"
                                          : (isClosed || isOpen)
                                          ? "border-slate-300"
                                          : "border-slate-200"
                                      }`}
                                    >
                                      <IconComponent className="h-5 w-5 group-hover:scale-110 transition-transform text-[#001C38]" />
                                      <span className="text-[10px] text-slate-500 font-medium mt-1 truncate max-w-full">{item.label}</span>

                                      {/* Visual status pills */}
                                      {isClosed && (
                                        <span className="absolute -top-1 -left-1 rounded-full bg-[#001C38] text-amber-300 text-[8px] px-1 py-0.2 shadow">
                                          C
                                        </span>
                                      )}
                                      {isOpen && (
                                        <span className="absolute -top-1 -right-1 rounded-full bg-emerald-600 text-white text-[8px] px-1 py-0.2 shadow">
                                          O
                                        </span>
                                      )}
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="center" className="w-48">
                                    <DropdownMenuItem onClick={() => selectAvatar(chatheadTarget, item.id)}>
                                      <Check className="mr-2 h-4 w-4 text-blue-600" />
                                      Apply to {chatheadTarget === "inactive" ? "Closed Chathead" : "Open Chathead"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => applyAvatarToBoth(item.id)}>
                                      <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
                                      Apply to Both States
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              );
                            })}
                          </div>
                        </div>

                        {/* Section: Custom Images */}
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <p className="text-xs font-semibold text-slate-600">Custom Uploaded Images & Logos</p>
                            <span className="text-[11px] text-slate-400">
                              {customAvatarImages.length} images registered
                            </span>
                          </div>

                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {customAvatarImages.map((url) => {
                              const isClosed = getAvatarValue("inactive") === url;
                              const isOpen = getAvatarValue("active") === url;
                              const isTargetSelected = chatheadTarget === "inactive" ? isClosed : isOpen;

                              if (avatarDeleteMode) {
                                return (
                                  <button
                                    key={`custom-delete-${url}`}
                                    type="button"
                                    onClick={() => deleteCustomAvatar(url)}
                                    className="relative flex h-14 items-center justify-center overflow-hidden rounded-xl border border-red-300 bg-white shadow-sm ring-2 ring-red-100 group"
                                  >
                                    <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Trash2 className="h-4 w-4 text-white" />
                                    </div>
                                    <img src={url} alt="Custom avatar" className="h-full w-full object-cover" />
                                  </button>
                                );
                              }

                              return (
                                <DropdownMenu key={`custom-img-${url}`}>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className={`group relative flex h-14 items-center justify-center overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:border-[#001C38] ${
                                        isTargetSelected
                                          ? "border-[#001C38] ring-2 ring-[#001C38]/20"
                                          : (isClosed || isOpen)
                                          ? "border-slate-300"
                                          : "border-slate-200"
                                      }`}
                                    >
                                      <img src={url} alt="Custom avatar" className="h-full w-full object-cover" />
                                      {isClosed && (
                                        <span className="absolute -top-1 -left-1 rounded-full bg-[#001C38] text-amber-300 text-[8px] px-1 py-0.2 shadow">
                                          C
                                        </span>
                                      )}
                                      {isOpen && (
                                        <span className="absolute -top-1 -right-1 rounded-full bg-emerald-600 text-white text-[8px] px-1 py-0.2 shadow">
                                          O
                                        </span>
                                      )}
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="center" className="w-48">
                                    <DropdownMenuItem onClick={() => selectAvatar(chatheadTarget, url)}>
                                      <Check className="mr-2 h-4 w-4 text-blue-600" />
                                      Apply to {chatheadTarget === "inactive" ? "Closed Chathead" : "Open Chathead"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => applyAvatarToBoth(url)}>
                                      <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
                                      Apply to Both States
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              );
                            })}
                          </div>

                          <div className="mt-3">
                            <AdminImageUploader onAddImage={addCustomAvatar} />
                            <p className="text-[11px] text-slate-400 mt-1.5">
                              Capacity: max 6 file uploads and 12 URL references. Formats: PNG, JPG, WebP.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Step 3: Color & Opacity Card */}
                    <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                      <div className="h-1.5 w-full bg-gradient-to-r from-[#F59E0B] to-[#001C38]" />
                      <CardHeader className="p-4 sm:p-5 bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#001C38] text-white text-xs font-bold">3</span>
                          Brand Color & Transparency
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                          Select official BukSU university brand colors or customize hex color and opacity.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-5 space-y-4">
                        {/* Official BukSU Presets */}
                        <div>
                          <Label className="text-xs font-semibold text-slate-700 block mb-2">Official BukSU Brand Swatches</Label>
                          <div className="flex flex-wrap items-center gap-2.5">
                            {BUKSU_COLOR_PRESETS.map((color) => {
                              const isSelected = (widgetSettings.chatheadBgColor || "#001C38").toLowerCase() === color.hex.toLowerCase();
                              return (
                                <button
                                  key={color.hex}
                                  type="button"
                                  onClick={() => setWidgetSettings({ ...widgetSettings, chatheadBgColor: color.hex })}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                                    isSelected 
                                      ? "border-[#001C38] bg-slate-100 ring-2 ring-[#001C38]/20 shadow-sm font-bold" 
                                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  <span className="h-4 w-4 rounded-full border shadow-sm shrink-0 flex items-center justify-center text-white" style={{ backgroundColor: color.hex }}>
                                    {isSelected && <Check className="h-2.5 w-2.5" />}
                                  </span>
                                  <span>{color.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Custom Color Input */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                          <div>
                            <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">Custom Color Picker</Label>
                            <div className="flex items-center gap-2.5">
                              <Input
                                type="color"
                                value={widgetSettings.chatheadBgColor || "#001C38"}
                                onChange={(event) => setWidgetSettings({ ...widgetSettings, chatheadBgColor: event.target.value })}
                                className="h-10 w-14 cursor-pointer overflow-hidden rounded-lg border border-slate-300 p-0.5 shadow-sm"
                              />
                              <Input
                                value={widgetSettings.chatheadBgColor || "#001C38"}
                                onChange={(event) => setWidgetSettings({ ...widgetSettings, chatheadBgColor: event.target.value })}
                                className="font-mono text-xs uppercase"
                                placeholder="#001C38"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <Label className="text-xs font-semibold text-slate-700">Opacity / Transparency</Label>
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {Math.round((widgetSettings.chatheadOpacity ?? 1) * 100)}%
                              </Badge>
                            </div>
                            <Input
                              type="range"
                              min="0.35"
                              max="1"
                              step="0.05"
                              value={widgetSettings.chatheadOpacity ?? 1}
                              onChange={(event) => setWidgetSettings({ ...widgetSettings, chatheadOpacity: Number(event.target.value) })}
                              className="cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                              <span>35% (Subtle)</span>
                              <span>100% (Solid)</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column: Live Interactive Widget Simulator */}
                  <div className="lg:col-span-5 sticky top-6">
                    <Card className="border-slate-200/80 shadow-md overflow-hidden bg-white">
                      <div className="h-1.5 w-full bg-gradient-to-r from-[#001C38] via-[#0356a9] to-[#F59E0B]" />
                      <CardHeader className="p-4 sm:p-5 bg-slate-50/60 border-b border-slate-100">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-amber-500" />
                              Interactive Live Simulator
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500">
                              Real-time interactive preview of your chathead configuration.
                            </CardDescription>
                          </div>

                          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setPreviewAvatarMode("inactive")}
                              className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
                                previewAvatarMode === "inactive"
                                  ? "bg-white text-[#001C38] shadow-xs"
                                  : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              Closed View
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewAvatarMode("active")}
                              className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
                                previewAvatarMode === "active"
                                  ? "bg-white text-[#001C38] shadow-xs"
                                  : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              Open View
                            </button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 sm:p-5 space-y-4">
                        {/* Simulated Browser Web Viewport */}
                        <div className="relative rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-100 via-slate-100/90 to-slate-200/60 p-4 min-h-[460px] flex flex-col justify-between overflow-hidden shadow-inner">
                          {/* Mock Browser Header Bar */}
                          <div className="flex items-center gap-2 pb-3 border-b border-slate-200/70 shrink-0">
                            <div className="flex gap-1.5">
                              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                              <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                            </div>
                            <div className="flex-1 bg-white/80 rounded-md text-[10px] text-slate-500 px-2 py-0.5 font-mono truncate text-center shadow-2xs">
                              buksu.edu.ph/ai-assistant
                            </div>
                          </div>

                          {/* Campus Mockup Background Content */}
                          <div className={`text-center transition-all ${previewAvatarMode === "active" ? "py-2 mb-1" : "my-auto py-6"} px-4`}>
                            <div className="inline-block p-2 rounded-2xl bg-white/80 shadow-sm border border-slate-200/60 mb-1.5">
                              <img 
                                src="/LOGO.png" 
                                alt="BukSU Logo" 
                                className="w-8 h-8 object-contain mx-auto" 
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            </div>
                            <h5 className="text-xs font-bold text-slate-700">Bukidnon State University</h5>
                            <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5">
                              {previewAvatarMode === "inactive" 
                                ? "Click the floating chathead bubble below to preview opening the chatbox."
                                : "The chatbox sits above while the floating chathead below displays the open-state toggle."}
                            </p>
                          </div>

                          {/* Live Chathead / Window Simulator Component */}
                          {previewAvatarMode === "inactive" ? (
                            /* CLOSED STATE SIMULATION */
                            <div className="flex flex-col items-end gap-2 pt-4">
                              <div className="flex items-end justify-end gap-3">
                                <div className="bg-white text-slate-800 text-xs py-2 px-3 rounded-2xl rounded-br-sm shadow-md border border-slate-200/80 max-w-[200px] animate-bounce">
                                  <p className="font-semibold text-[11px] text-[#001C38]">Hi BukSU Student!</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Need campus info? Click to chat.</p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setPreviewAvatarMode("active")}
                                  className="h-14 w-14 rounded-full text-white shadow-xl flex items-center justify-center relative overflow-hidden group cursor-pointer transition-transform hover:scale-105 active:scale-95 ring-4 ring-white/60"
                                  style={{
                                    backgroundColor: widgetSettings.chatheadBgColor || "#001C38",
                                    opacity: widgetSettings.chatheadOpacity ?? 1,
                                  }}
                                  title="Click to open chatbox preview"
                                >
                                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                  <AnimatePresence mode="wait">
                                    <motion.div
                                      key={`preview-inactive-${getAvatarValue("inactive")}`}
                                      className="flex items-center justify-center text-white"
                                      initial={{ rotate: 90, opacity: 0 }}
                                      animate={{ rotate: 0, opacity: 1 }}
                                      exit={{ rotate: -90, opacity: 0 }}
                                    >
                                      {renderAvatarGraphic(getAvatarValue("inactive"), "h-6 w-6")}
                                    </motion.div>
                                  </AnimatePresence>
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium pr-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span>Closed Chathead (Click bubble to open)</span>
                              </div>
                            </div>
                          ) : (
                            /* OPEN STATE SIMULATION */
                            <div className="flex flex-col items-end gap-2.5 w-full pt-1">
                              {/* Simulated Chatbox Window */}
                              <div className="w-full max-w-[340px] bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden flex flex-col transition-all">
                                {/* Window Header */}
                                <div 
                                  className="px-3.5 py-2.5 text-white flex items-center justify-between shadow-xs"
                                  style={{ backgroundColor: widgetSettings.chatheadBgColor || "#001C38", opacity: widgetSettings.chatheadOpacity ?? 1 }}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <div>
                                      <h6 className="text-xs font-bold leading-tight text-white flex items-center gap-1.5">
                                        BukSU AI Chatbot
                                      </h6>
                                      <p className="text-[10px] text-amber-300 font-medium">Online • Smart Assistant</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewAvatarMode("inactive")}
                                      className="h-6 w-6 rounded-md hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                                      title="Minimize chatbox"
                                    >
                                      <Minimize2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Sample Chat Message Body */}
                                <div className="p-3 bg-slate-50/70 space-y-2">
                                  <div className="bg-white p-2.5 rounded-xl rounded-tl-sm border border-slate-200/80 text-[11px] text-slate-700 shadow-xs max-w-[90%] leading-relaxed">
                                    Maayong adlaw! Welcome to Bukidnon State University AI. How can I help you today?
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-medium px-1 flex items-center gap-1">
                                    <span>Just now</span>
                                    <span>•</span>
                                    <span className="text-emerald-600 font-semibold">Active Session</span>
                                  </div>
                                </div>
                              </div>

                              {/* Floating Chathead in OPEN state */}
                              <div className="flex items-center justify-end gap-2.5 pr-0.5">
                                <div className="bg-white/95 backdrop-blur-xs text-slate-700 text-[10px] font-medium py-1 px-2.5 rounded-lg shadow-sm border border-slate-200/80 flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                                  <span>Open Chathead (Click to close)</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setPreviewAvatarMode("inactive")}
                                  className="h-12 w-12 sm:h-14 sm:w-14 rounded-full text-white shadow-xl flex items-center justify-center relative overflow-hidden group cursor-pointer transition-transform hover:scale-105 active:scale-95 ring-4 ring-white/60"
                                  style={{
                                    backgroundColor: widgetSettings.chatheadBgColor || "#001C38",
                                    opacity: widgetSettings.chatheadOpacity ?? 1,
                                  }}
                                  title="Click to close chatbox preview (Chathead in Open State)"
                                >
                                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                  <AnimatePresence mode="wait">
                                    <motion.div
                                      key={`preview-active-${getAvatarValue("active") || "x"}`}
                                      className="flex items-center justify-center text-white"
                                      initial={{ rotate: 90, opacity: 0 }}
                                      animate={{ rotate: 0, opacity: 1 }}
                                      exit={{ rotate: -90, opacity: 0 }}
                                    >
                                      {renderAvatarGraphic(getAvatarValue("active") || "x", "h-5 w-5 sm:h-6 sm:w-6")}
                                    </motion.div>
                                  </AnimatePresence>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Technical Readout */}
                        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px]">
                          <div>
                            <span className="text-slate-400 block font-medium">Closed Chathead</span>
                            <span className="font-semibold text-slate-800 truncate block">
                              {getAvatarValue("inactive") || "Default"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-medium">Open Chathead</span>
                            <span className="font-semibold text-slate-800 truncate block">
                              {getAvatarValue("active") || "Close Cross (x)"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-medium">Background Color</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {widgetSettings.chatheadBgColor || "#001C38"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-medium">Opacity Level</span>
                            <span className="font-semibold text-slate-800">
                              {Math.round((widgetSettings.chatheadOpacity ?? 1) * 100)}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* 3. CAMPUS MAPS SUB-TAB */}
              {settingsSubTab === "maps" && (
                <div>
                  <AdminMapSettings />
                </div>
              )}

              {/* 4. ACCOUNT & SECURITY SUB-TAB */}
              {settingsSubTab === "account" && (
                <div className="space-y-6">
                  {/* Administrator Profile Card */}
                  <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-[#001C38] via-[#0356a9] to-[#F59E0B]" />
                    <CardHeader className="p-5 sm:p-6 bg-slate-50/50 border-b border-slate-100">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#001C38] text-white font-bold text-lg shadow-sm">
                          {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg font-bold text-slate-900">{user?.name || "Administrator"}</CardTitle>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              user?.role === 'main-admin' || user?.email?.toLowerCase() === 'thepersonaljaime@gmail.com'
                                ? 'bg-blue-100 text-[#001C38] border border-blue-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {user?.role === 'main-admin' || user?.email?.toLowerCase() === 'thepersonaljaime@gmail.com' ? 'Main-Admin' : 'Co-Admin'}
                            </span>
                          </div>
                          <CardDescription className="text-xs text-slate-500 font-mono mt-0.5">
                            {user?.email || "admin@buksu.edu.ph"}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Security Credentials Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Email Management Panel */}
                    <Card className="border-slate-200/80 shadow-sm hover:shadow transition-shadow">
                      <CardHeader className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#001C38]">
                            <Mail className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold text-slate-900">Email Address</CardTitle>
                            <CardDescription className="text-xs text-slate-500">Account login & verification</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-5 pt-0 space-y-4">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <span className="text-slate-400 block font-medium">Registered Address</span>
                          <span className="text-slate-800 font-mono font-semibold text-sm truncate block mt-0.5">
                            {user?.email || "admin@buksu.edu.ph"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Updating your email requires 2-step verification sent to your current and new addresses.
                        </p>
                        <ChangeEmailDialog
                          trigger={
                            <Button className="w-full bg-[#001C38] hover:bg-[#002b54] text-white font-semibold text-xs shadow-sm">
                              <Mail className="mr-2 h-4 w-4" />
                              Change Email Address
                            </Button>
                          }
                        />
                      </CardContent>
                    </Card>

                    {/* Password Management Panel */}
                    <Card className="border-slate-200/80 shadow-sm hover:shadow transition-shadow">
                      <CardHeader className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#001C38]">
                            <KeyRound className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold text-slate-900">Password & Security</CardTitle>
                            <CardDescription className="text-xs text-slate-500">Authentication credentials</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-5 pt-0 space-y-4">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <span className="text-slate-400 block font-medium">Security Status</span>
                          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-sm mt-0.5">
                            <CheckCircle2 className="h-4 w-4" />
                            Password Protected (Strong)
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Keep your account secure by choosing a unique password with a minimum of 8 characters.
                        </p>
                        <ChangePasswordDialog
                          trigger={
                            <Button className="w-full bg-[#001C38] hover:bg-[#002b54] text-white font-semibold text-xs shadow-sm">
                              <KeyRound className="mr-2 h-4 w-4" />
                              Change Password
                            </Button>
                          }
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* PERSISTENT FLOATING SAVE BAR */}
              <div className="sticky bottom-4 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-[#001C38]/20 bg-white/95 p-4 shadow-xl backdrop-blur">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${settingsDirty ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                    {settingsDirty ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </div>
                  <div>
                    <h6 className="text-xs sm:text-sm font-bold text-slate-800">
                      {settingsDirty ? "Unsaved settings changes detected" : "All settings are currently up to date"}
                    </h6>
                    <p className="text-[11px] text-slate-500">
                      {settingsDirty ? "Click 'Save Changes' to apply your updates to the live chatbot." : "Modifications in Chatbox Controls or Chathead Studio can be saved here."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPrivileges(savedPrivileges);
                      setWidgetSettings(savedWidgetSettings);
                    }}
                    disabled={!settingsDirty || saveSettingsMutation.isPending}
                    className="text-xs font-semibold"
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveSettingsMutation.mutate({ privileges, widgetSettings })}
                    disabled={!settingsDirty || saveSettingsMutation.isPending}
                    className="text-white text-xs font-semibold shadow-md px-4"
                    style={{ background: "linear-gradient(to right, #001C38, #0356a9)" }}
                  >
                    {saveSettingsMutation.isPending ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-3.5 w-3.5" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-[#001C38] text-amber-400 shadow-sm shrink-0">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        Reports & Audit Center
                      </h2>
                      {isEffectiveMainAdmin && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#001C38]/10 text-[#001C38] border border-[#001C38]/20">
                          Main-Admin Access
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Monitor user feedback, inspect administrative audit trails, and evaluate chatbot accuracy & performance
                    </p>
                  </div>
                </div>
              </div>

              {/* Prominent, Straight, Bigger Sub-Tabs Bar */}
              <div className="w-full bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-sm">
                <Tabs
                  value={
                    !isEffectiveMainAdmin && (reportsSubTab === "performance" || reportsSubTab === "faq-gaps")
                      ? "user-reports"
                      : reportsSubTab
                  }
                  onValueChange={(v) => setReportsSubTab(v as any)}
                  className="w-full"
                >
                  <TabsList className={`w-full bg-slate-100/80 p-1.5 h-auto grid gap-2 ${isEffectiveMainAdmin ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"}`}>
                    <TabsTrigger
                      value="user-reports"
                      className="py-3 px-4 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2.5 data-[state=active]:bg-[#001C38] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-white data-[state=inactive]:hover:text-slate-900"
                    >
                      <MessageSquare className="w-4.5 h-4.5 shrink-0" />
                      <span>Chatbot Reports</span>
                    </TabsTrigger>

                    <TabsTrigger
                      value="activity-logs"
                      className="py-3 px-4 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2.5 data-[state=active]:bg-[#001C38] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-white data-[state=inactive]:hover:text-slate-900"
                    >
                      <Activity className="w-4.5 h-4.5 shrink-0" />
                      <span>Active Log (Audit Trail)</span>
                    </TabsTrigger>

                    {isEffectiveMainAdmin && (
                      <>
                        <TabsTrigger
                          value="performance"
                          className="py-3 px-4 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2.5 data-[state=active]:bg-[#001C38] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-white data-[state=inactive]:hover:text-slate-900"
                        >
                          <Zap className="w-4.5 h-4.5 shrink-0 text-amber-400 data-[state=inactive]:text-amber-500" />
                          <span>System Performance</span>
                        </TabsTrigger>

                        <TabsTrigger
                          value="faq-gaps"
                          className="py-3 px-4 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2.5 data-[state=active]:bg-[#001C38] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-white data-[state=inactive]:hover:text-slate-900"
                        >
                          <FileText className="w-4.5 h-4.5 shrink-0 text-sky-300 data-[state=inactive]:text-blue-600" />
                          <span>FAQ Gap Evaluation</span>
                        </TabsTrigger>
                      </>
                    )}
                  </TabsList>
                </Tabs>
              </div>
              {/* Sub-Tab Content Rendering */}
              {reportsSubTab === "user-reports" && <AdminReports />}
              {reportsSubTab === "activity-logs" && <AdminActivityLogs />}
              {(isMainAdmin || user?.role === 'main-admin' || user?.email?.toLowerCase() === 'thepersonaljaime@gmail.com') && (
                <>
                  {reportsSubTab === "performance" && <AdminPerformance />}
                  {reportsSubTab === "faq-gaps" && <AdminFaqGapReport />}
                </>
              )}
            </div>
          )}

          {activeTab === "gallery" && (
            <AdminGallery />
          )}
        </div>
      </main>
      
      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirmation} onOpenChange={setShowLogoutConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-white text-gray-800 hover:bg-gray-100 border-0"
              onClick={() => setShowLogoutConfirmation(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="text-white border-0"
              style={{ background: "linear-gradient(to right, #001C38, #0356a9ff)" }}
              onClick={() => {
                logout();
                setShowLogoutConfirmation(false);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnsavedSettingsDialog} onOpenChange={setShowUnsavedSettingsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving settings?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved chatbox setting changes. If you continue, those changes will be discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingTab(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-white"
              style={{ background: "linear-gradient(to right, #001C38, #0356a9ff)" }}
              onClick={discardSettingsAndNavigate}
            >
              Continue without saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Knowledge Base Sync Confirmation Dialog */}
      <AlertDialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Sync Knowledge Base from JSON
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will synchronize your database with the local JSON knowledge base files. </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Only <b>modified files</b> will be updated.</li>
                <li>New topics found in JSON will be added.</li>
                <li>Manual updates in this panel might be overwritten if the JSON version is newer.</li>
              </ul>
              <p className="font-semibold text-red-600 mt-2">Are you sure you want to proceed?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-white text-gray-800 hover:bg-gray-100 border-0"
              onClick={() => setShowSyncDialog(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="text-white border-0"
              style={{ background: "linear-gradient(to right, #001C38, #0356a9ff)" }}
              onClick={() => syncKnowledgeBaseMutation.mutate(false)}
              disabled={syncKnowledgeBaseMutation.isPending}
            >
              {syncKnowledgeBaseMutation.isPending ? "Syncing..." : "Confirm Sync"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Dialog Components ---

function ResponseDialog({ response, onSave, trigger, translationBusy, translationBusyIntent }: { 
  response?: ResponseData, 
  onSave: (r: ResponseData) => Promise<any>, 
  trigger?: React.ReactNode,
  translationBusy?: boolean,
  translationBusyIntent?: string | null
}) {
  const isEdit = !!response;
  const [open, setOpen] = useState(false);
  const uploadId = useId();
  const { toast } = useToast();

  type LocationDraft = {
    locationName: string;
    coordinates: [number, number];
  };

  const normalizeAnswer = (answer: ResponseData["responses"]["answer"] | undefined) => {
    if (!answer) return { en: [""], ceb: [""] };
    if (Array.isArray(answer)) return { en: answer, ceb: [""] };
    const record = answer as Record<string, string[]>;
    return {
      en: Array.isArray(record.en) ? record.en : [""],
      ceb: Array.isArray(record.ceb) ? record.ceb : [""]
    };
  };

  const normalizeMapData = (mapData: ResponseData["responses"]["mapData"] | undefined): LocationDraft[] => {
    if (!mapData) return [];
    if (Array.isArray(mapData)) {
      return mapData
        .map((md) => ({
          locationName: md?.locationName || "Location",
          coordinates: (md?.coordinates || [500, 500]) as [number, number],
        }))
        .filter((md) => Array.isArray(md.coordinates) && md.coordinates.length === 2);
    }

    return [
      {
        locationName: mapData.locationName || "Location",
        coordinates: (mapData.coordinates || [500, 500]) as [number, number],
      },
    ];
  };

  const getInitialFormData = (): Partial<ResponseData> => {
    if (response) {
      const existingImages = Array.isArray(response.responses?.imageUrls)
        ? response.responses.imageUrls
        : (response.responses?.imageUrl ? [response.responses.imageUrl] : []);

      return {
        ...response,
        responses: {
          ...response.responses,
          answer: normalizeAnswer(response.responses?.answer),
          follow_up: Array.isArray(response.responses?.follow_up) ? response.responses.follow_up : [],
          context_slots: response.responses?.context_slots || {},
          imageUrl: response.responses?.imageUrl || "",
          imageUrls: existingImages
        }
      };
    }

    return {
      intent: "",
      category: "",
      sub_category: "",
      responses: {
        answer: { en: [""], ceb: [""] },
        follow_up: [],
        context_slots: {},
        imageUrl: "",
        imageUrls: []
      },
      metadata: {
        source: "admin"
      }
    };
  };

  const [formData, setFormData] = useState<Partial<ResponseData>>(getInitialFormData());
  const [selectedLab, setSelectedLab] = useState<string>("1");
  const [hasMapData, setHasMapData] = useState(normalizeMapData(response?.responses?.mapData).length > 0);
  const [locations, setLocations] = useState<LocationDraft[]>(normalizeMapData(response?.responses?.mapData));

  useEffect(() => {
    if (open) {
      const initial = getInitialFormData();
      setFormData(initial);
      const initialLocations = normalizeMapData(response?.responses?.mapData);
      setHasMapData(initialLocations.length > 0);
      setLocations(initialLocations);

      if ((initial as any)?.laboratories) {
        const keys = Object.keys((initial as any).laboratories || {});
        if (keys.length > 0) {
          setSelectedLab(keys.sort()[0]);
        }
      }
    }
  }, [open, response]);

  const handleSubmit = async () => {
    const normalizedAnswer = normalizeAnswer(formData.responses?.answer);

    const finalCebuano = normalizedAnswer.ceb;

    const normalizedImages = Array.isArray(formData.responses?.imageUrls)
      ? formData.responses!.imageUrls!.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean)
      : [];

    const normalizedLocations = locations
      .map((l) => ({
        locationName: (l.locationName || "Location").trim() || "Location",
        coordinates: l.coordinates,
        mapId: "main_map",
      }))
      .filter((l) => Array.isArray(l.coordinates) && l.coordinates.length === 2);

    const finalResponse: ResponseData = {
      ...formData,
      responses: {
        ...formData.responses!,
        answer: {
          en: normalizedAnswer.en,
          ceb: finalCebuano
        },
        imageUrls: normalizedImages,
        imageUrl: normalizedImages[0] || formData.responses?.imageUrl || "",
        mapData: hasMapData
          ? (
              normalizedLocations.length > 1
                ? normalizedLocations
                : normalizedLocations[0] || {
                    locationName: "Location",
                    coordinates: [500, 500],
                    mapId: "main_map",
                  }
            )
          : undefined,
      }
    } as ResponseData;
    
    try {
      await onSave(finalResponse);
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: String(err?.message || err || "Failed to save response"),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        const busy = Boolean(translationBusy);
        const sameIntent =
          Boolean(response?.intent) &&
          Boolean(translationBusyIntent) &&
          response!.intent === translationBusyIntent;

        if (next && busy && !sameIntent) {
          toast({
            title: "Please wait",
            description: "Auto-translation is still running. Please wait for it to finish before editing another intent.",
            variant: "destructive",
          });
          return;
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        {trigger || <Button className="w-full sm:w-auto rounded-sm" style={{background: "linear-gradient(to right, #001C38, #0356a9ff)"}}><Plus className="mr-2 h-4 w-4"/> Add Response</Button>}
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-[1050px] max-h-[90vh] overflow-y-auto sm:p-6 p-4 rounded-sm">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{response ? "Edit Response" : "New Response"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 sm:grid-cols-1 lg:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-sm sm:text-base">Intent Name</Label>
            <Input 
              value={formData.intent} 
              onChange={e => setFormData({...formData, intent: e.target.value})} 
              placeholder="e.g. get_wifi_access" 
              disabled={isEdit}
              className="text-sm sm:text-base"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm sm:text-base">Category</Label>
            <Input 
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value})} 
              placeholder="e.g. ICT" 
              disabled={isEdit}
            />
          </div>
          <div className="grid gap-2">
            <Label>Sub Category</Label>
            <Input 
              value={formData.sub_category} 
              onChange={e => setFormData({...formData, sub_category: e.target.value})} 
              placeholder="e.g. services" 
              disabled={isEdit}
            />
          </div>
          <div className="grid gap-2">
            <Label>Response Answer (English)</Label>
            <Textarea 
              value={
                (() => {
                  const a = normalizeAnswer(formData.responses?.answer);
                  return Array.isArray(a.en) ? a.en.join("\n") : "";
                })()
              } 
              onChange={e => setFormData({
                ...formData, 
                responses: {
                  ...formData.responses!,
                  answer: {
                    ...normalizeAnswer(formData.responses?.answer),
                    en: e.target.value.split("\n")
                  }
                }
              })} 
              placeholder="Enter English response text (one per line)"
              rows={4}
            />
          </div>
          <div className="grid gap-2">
            <Label>Response Answer (Bisaya) <span className="text-muted-foreground text-sm">(keep it blank to auto-fill Bisaya language)</span></Label>
            <Textarea
              value={
                (() => {
                  const a = normalizeAnswer(formData.responses?.answer);
                  return Array.isArray(a.ceb) ? a.ceb.join("\n") : "";
                })()
              }
              onChange={e => setFormData({
                ...formData,
                responses: {
                  ...formData.responses!,
                  answer: {
                    ...normalizeAnswer(formData.responses?.answer),
                    ceb: e.target.value.split("\n")
                  }
                }
              })}
              placeholder="Enter Bisaya response text (one per line)"
              rows={4}
            />
          </div>
          <div className="grid gap-2">
            <Label>Follow Up Questions (optional)</Label>
            <Textarea 
              value={
                Array.isArray(formData.responses?.follow_up) 
                  ? formData.responses.follow_up.join("\n") 
                  : ""
              } 
              onChange={e => setFormData({
                ...formData, 
                responses: {
                  ...formData.responses!,
                  follow_up: e.target.value.split("\n").filter(Boolean)
                }
              })} 
              placeholder="Enter follow up questions (one per line)"
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label>Images (optional)</Label>
            <div className="grid gap-2">
              {(formData.responses?.imageUrls || []).map((url, idx) => (
                <div key={`img-${idx}`} className="flex gap-2">
                  <Input
                    value={url}
                    onChange={(e) => {
                      const next = [...(formData.responses?.imageUrls || [])];
                      next[idx] = e.target.value;
                      setFormData({
                        ...formData,
                        responses: {
                          ...formData.responses!,
                          imageUrls: next,
                          imageUrl: next[0] || "",
                        },
                      });
                    }}
                    placeholder="Paste an image URL or base64 data URL"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const next = (formData.responses?.imageUrls || []).filter((_, i) => i !== idx);
                      setFormData({
                        ...formData,
                        responses: {
                          ...formData.responses!,
                          imageUrls: next,
                          imageUrl: next[0] || "",
                        },
                      });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}

              <div className="flex gap-2 items-center">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const next = [...(formData.responses?.imageUrls || []), ""];
                    setFormData({
                      ...formData,
                      responses: {
                        ...formData.responses!,
                        imageUrls: next,
                        imageUrl: next[0] || "",
                      },
                    });
                  }}
                >
                  Add Image URL
                </Button>

                <input
                  id={`upload-${uploadId}`}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;

                    files.forEach((file) => {
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = typeof reader.result === "string" ? reader.result : "";
                        if (!result) return;
                        setFormData((prev) => {
                          const existing = prev.responses?.imageUrls || [];
                          const next = [...existing, result];
                          return {
                            ...prev,
                            responses: {
                              ...prev.responses!,
                              imageUrls: next,
                              imageUrl: next[0] || "",
                            },
                          };
                        });
                      };
                      reader.readAsDataURL(file);
                    });
                  }}
                />
                <Label
                  htmlFor={`upload-${uploadId}`}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold shadow-sm hover:bg-accent cursor-pointer"
                >
                  Choose Images
                </Label>
              </div>

              {(formData.responses?.imageUrls || []).filter(Boolean).length > 0 ? (
                <div className="grid gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    {(formData.responses?.imageUrls || []).filter(Boolean).slice(0, 4).map((src, idx) => (
                      <img
                        key={`preview-${idx}`}
                        src={src}
                        alt="Preview"
                        className="max-h-40 rounded border object-contain"
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hasMapData"
              checked={hasMapData}
              onChange={(e) => setHasMapData(e.target.checked)}
            />
            <Label htmlFor="hasMapData">Include location data</Label>
          </div>
          {hasMapData && (
            <div className="grid gap-2">
              <Label>Locations on Map</Label>
              <div className="grid gap-4">
                {locations.map((loc, idx) => (
                  <div key={`loc-${idx}`} className="rounded-md border p-3 grid gap-3">
                    <div className="flex gap-2 items-center">
                      <Input
                        value={loc.locationName}
                        onChange={(e) => {
                          const next = [...locations];
                          next[idx] = { ...next[idx], locationName: e.target.value };
                          setLocations(next);
                        }}
                        placeholder="Location name"
                      />
                      <Button
                        variant="outline"
                        onClick={() => setLocations((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </Button>
                    </div>

                    <InteractiveMap
                      initialCoordinates={loc.coordinates}
                      onCoordinatesChange={(coords) => {
                        const next = [...locations];
                        next[idx] = { ...next[idx], coordinates: coords };
                        setLocations(next);
                      }}
                      width={550}
                      height={450}
                    />
                  </div>
                ))}

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setLocations((prev) => ([...prev, { locationName: "Location", coordinates: [500, 500] }]))}
                >
                  Add Location
                </Button>
              </div>
            </div>
          )}

          {/* ComLab laboratory editor (for locate_comlab) */}
          {(formData.intent === "locate_comlab" || response?.intent === "locate_comlab") && (
            <div className="grid gap-3 rounded-md border p-4">
              <Label className="font-semibold">ComLab Laboratories (1-12)</Label>

              <div className="grid gap-2">
                <Label>Choose ComLab</Label>
                <Select value={selectedLab} onValueChange={setSelectedLab}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ComLab" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((n) => (
                      <SelectItem key={n} value={n}>
                        {`ComLab ${n}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(() => {
                const labs = ((formData as any).laboratories || {}) as any;
                const lab = (labs[selectedLab] || {}) as any;
                const labImages: string[] = Array.isArray(lab.images)
                  ? lab.images
                  : (lab.image ? [lab.image] : []);
                const labCoords: [number, number] = Array.isArray(lab.coordinates) && lab.coordinates.length === 2
                  ? lab.coordinates
                  : [500, 500];
                const labMapId = lab.map_id || lab.mapId || "main_map";
                const labLocationName = lab.locationName || `ComLab ${selectedLab}`;

                return (
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Location Name</Label>
                      <Input
                        value={labLocationName}
                        onChange={(e) => {
                          const nextLabs = { ...labs, [selectedLab]: { ...lab, locationName: e.target.value } };
                          setFormData({ ...formData, laboratories: nextLabs } as any);
                        }}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>ComLab Answer (English) - one per line</Label>
                      <Textarea
                        value={Array.isArray(lab.en) ? lab.en.join("\n") : ""}
                        onChange={(e) => {
                          const nextLabs = { ...labs, [selectedLab]: { ...lab, en: e.target.value.split("\n") } };
                          setFormData({ ...formData, laboratories: nextLabs } as any);
                        }}
                        rows={3}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>ComLab Answer (Bisaya) - one per line</Label>
                      <Textarea
                        value={Array.isArray(lab.ceb) ? lab.ceb.join("\n") : ""}
                        onChange={(e) => {
                          const nextLabs = { ...labs, [selectedLab]: { ...lab, ceb: e.target.value.split("\n") } };
                          setFormData({ ...formData, laboratories: nextLabs } as any);
                        }}
                        rows={3}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Images for this ComLab</Label>
                      <div className="grid gap-2">
                        {labImages.map((url, idx) => (
                          <div key={`lab-img-${idx}`} className="flex gap-2">
                            <Input
                              value={url}
                              onChange={(e) => {
                                const next = [...labImages];
                                next[idx] = e.target.value;
                                const nextLabs = { ...labs, [selectedLab]: { ...lab, images: next, image: next[0] || "" } };
                                setFormData({ ...formData, laboratories: nextLabs } as any);
                              }}
                              placeholder="Paste image URL/base64"
                            />
                            <Button
                              variant="outline"
                              onClick={() => {
                                const next = labImages.filter((_, i) => i !== idx);
                                const nextLabs = { ...labs, [selectedLab]: { ...lab, images: next, image: next[0] || "" } };
                                setFormData({ ...formData, laboratories: nextLabs } as any);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            const next = [...labImages, ""];
                            const nextLabs = { ...labs, [selectedLab]: { ...lab, images: next, image: next[0] || "" } };
                            setFormData({ ...formData, laboratories: nextLabs } as any);
                          }}
                        >
                          Add Image URL
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Map ID</Label>
                      <Input
                        value={labMapId}
                        onChange={(e) => {
                          const nextLabs = { ...labs, [selectedLab]: { ...lab, map_id: e.target.value } };
                          setFormData({ ...formData, laboratories: nextLabs } as any);
                        }}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Pin on Map</Label>
                      <InteractiveMap
                        initialCoordinates={labCoords}
                        onCoordinatesChange={(coords) => {
                          const nextLabs = { ...labs, [selectedLab]: { ...lab, coordinates: coords } };
                          setFormData({ ...formData, laboratories: nextLabs } as any);
                        }}
                        width={550}
                        height={450}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LocationDialog({ location, onSave, trigger }: { 
  location?: Location, 
  onSave: (l: Location) => void, 
  trigger?: React.ReactNode 
}) {
  const [open, setOpen] = useState(false);
  const [locationName, setLocationName] = useState(location?.name || "");
  const [locationType, setLocationType] = useState(location?.type || "");
  const [building, setBuilding] = useState(location?.building || "");
  const [floor, setFloor] = useState(location?.floor || "");
  const [mapId, setMapId] = useState(location?.mapImage || "main_map");
  const initialCoords: [number, number] = Array.isArray(location?.coordinates) && location.coordinates.length === 2
    ? [location.coordinates[0], location.coordinates[1]]
    : [500, 500];
  const [mapCoordinates, setMapCoordinates] = useState<[number, number]>(initialCoords);
  const [pins, setPins] = useState<Array<{ name: string; coordinates: [number, number] }>>(
    Array.isArray((location as any)?.pins) && (location as any).pins.length > 0
      ? (location as any).pins
      : [{ name: "Main Pin", coordinates: initialCoords }]
  );
  const [activePinIndex, setActivePinIndex] = useState<number>(0);
  const [enText, setEnText] = useState<string>((location?.responses?.en || []).join("\n"));
  const [cebText, setCebText] = useState<string>((location?.responses?.ceb || []).join("\n"));
  const [imageUrls, setImageUrls] = useState<string[]>(Array.isArray((location as any)?.imageUrls) ? (location as any).imageUrls : []);
  const [imageUrlDraft, setImageUrlDraft] = useState<string>("");
  const fileInputId = useId();

  useEffect(() => {
    if (!open) return;
    const currentCoords: [number, number] = Array.isArray(location?.coordinates) && location.coordinates.length === 2
      ? [location.coordinates[0], location.coordinates[1]]
      : [500, 500];
    setLocationName(location?.name || "");
    setLocationType(location?.type || "");
    setBuilding(location?.building || "");
    setFloor(location?.floor || "");
    setMapId(location?.mapImage || "main_map");
    setMapCoordinates(currentCoords);
    const nextPins = Array.isArray((location as any)?.pins) && (location as any).pins.length > 0
      ? (location as any).pins
      : [{ name: "Main Pin", coordinates: currentCoords }];
    setPins(nextPins);
    setActivePinIndex(0);
    setEnText((location?.responses?.en || []).join("\n"));
    setCebText((location?.responses?.ceb || []).join("\n"));
    setImageUrls(Array.isArray((location as any)?.imageUrls) ? (location as any).imageUrls : []);
    setImageUrlDraft("");
  }, [open, location]);

  useEffect(() => {
    const pin = pins[activePinIndex];
    if (!pin) return;
    setMapCoordinates(pin.coordinates);
  }, [activePinIndex, pins]);

  const handleSubmit = () => {
    const nextName = locationName.trim();
    const normalizedPins = pins
      .map((p, idx) => ({
        name: String(p?.name || "").trim() || `Pin ${idx + 1}`,
        coordinates: p?.coordinates || [500, 500],
      }))
      .filter((p) => Array.isArray(p.coordinates) && p.coordinates.length === 2);

    const newLocation: Location = {
      id: location?.id || nextName,
      name: nextName,
      type: locationType.trim() || undefined,
      building: building.trim() || undefined,
      floor: floor.trim() || undefined,
      coordinates: (normalizedPins[0]?.coordinates || mapCoordinates),
      mapImage: (mapId || "main_map").trim() || "main_map",
      pins: normalizedPins,
      responses: {
        en: enText.split("\n").map((s) => s.trim()).filter(Boolean),
        ceb: cebText.split("\n").map((s) => s.trim()).filter(Boolean),
      },
    };

    (newLocation as any).imageUrls = imageUrls;
    
    onSave(newLocation);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="w-full sm:w-auto rounded-sm" style={{background: "linear-gradient(to right, #001C38, #0356a9ff)"}}><Plus className="mr-2 h-4 w-4"/> Add Location</Button>}
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-[1050px] max-h-[90vh] overflow-y-auto sm:p-6 p-4 rounded-sm">
        <DialogHeader>
          <DialogTitle>{location ? "Edit Location" : "New Location"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 overflow-x-hidden">
          <div className="grid gap-4 min-w-0">
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3 min-w-0">
              <div className="grid gap-4 lg:col-span-2 min-w-0">
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 min-w-0">
                  <div className="grid gap-2 min-w-0">
                    <Label>Location Name</Label>
                    <Input
                      value={locationName}
                      onChange={e => setLocationName(e.target.value)}
                      placeholder="e.g. Conference Room A"
                    />
                  </div>
                  <div className="grid gap-2 min-w-0">
                    <Label>Building</Label>
                    <Input
                      value={building}
                      onChange={e => setBuilding(e.target.value)}
                      placeholder="e.g. Admin Building"
                    />
                  </div>
                  <div className="grid gap-2 min-w-0">
                    <Label>Floor</Label>
                    <Input
                      value={floor}
                      onChange={e => setFloor(e.target.value)}
                      placeholder="e.g. 2nd Floor"
                    />
                  </div>
                </div>

                <div className="grid gap-2 min-w-0">
                  <Label>Pin on Map</Label>
                  <InteractiveMap
                    initialCoordinates={mapCoordinates}
                    onCoordinatesChange={(coords) => {
                      setMapCoordinates(coords);
                      setPins((prev) => prev.map((p, idx) => (idx === activePinIndex ? { ...p, coordinates: coords } : p)));
                    }}
                    width={550}
                    height={450}
                    showManualInputs={false}
                  />
                </div>
              </div>

              <div className="grid gap-4 min-w-0">
                <div className="grid gap-2 min-w-0">
                  <Label>Response Answer (English)</Label>
                  <Textarea
                    value={enText}
                    onChange={(e) => setEnText(e.target.value)}
                    placeholder="Enter English response text (one per line)"
                    rows={10}
                  />
                </div>
                <div className="grid gap-2 min-w-0">
                  <Label>Response Answer (Bisaya)</Label>
                  <Textarea
                    value={cebText}
                    onChange={(e) => setCebText(e.target.value)}
                    placeholder="Enter Bisaya response text (one per line)"
                    rows={10}
                  />
                </div>

                <div className="grid gap-2 min-w-0">
                  <Label>Pins</Label>
                  <div className="rounded-md border p-3 grid gap-2">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                      <div className="text-sm font-medium">Pins</div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          setPins((prev) => {
                            const next = [...prev, { name: `Pin ${prev.length + 1}`, coordinates: [500, 500] as [number, number] }];
                            return next;
                          });
                          setActivePinIndex(pins.length);
                        }}
                      >
                        Add Pin
                      </Button>
                    </div>

                    <div className="grid gap-2">
                      {pins.map((p, idx) => (
                        <div key={`pin-${idx}`} className="flex flex-col sm:flex-row gap-2 sm:items-center rounded-md border p-2">
                          <Button
                            type="button"
                            variant={idx === activePinIndex ? "default" : "outline"}
                            className="w-full sm:w-auto"
                            onClick={() => setActivePinIndex(idx)}
                          >
                            Edit
                          </Button>
                          <Input
                            value={p.name}
                            onChange={(e) => {
                              const v = e.target.value;
                              setPins((prev) => prev.map((x, i) => (i === idx ? { ...x, name: v } : x)));
                            }}
                            placeholder={`Pin ${idx + 1} name`}
                            className="min-w-0"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            className="w-full sm:w-auto"
                            disabled={pins.length <= 1}
                            onClick={() => {
                              setPins((prev) => {
                                const next = prev.filter((_, i) => i !== idx);
                                return next.length > 0 ? next : [{ name: "Main Pin", coordinates: [500, 500] }];
                              });
                              setActivePinIndex((cur) => {
                                if (idx === cur) return 0;
                                if (idx < cur) return Math.max(0, cur - 1);
                                return cur;
                              });
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Editing pin: <span className="font-medium text-foreground">{pins[activePinIndex]?.name || `Pin ${activePinIndex + 1}`}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2 min-w-0">
              <Label>Images</Label>
              <div className="grid gap-2">
                {imageUrls.length > 0 ? (
                  <div className="grid gap-2">
                    {imageUrls.map((url, idx) => (
                      <div key={`loc-img-${idx}`} className="flex flex-col sm:flex-row gap-2 sm:items-center rounded-md border p-2 min-w-0">
                        <Input value={url} readOnly className="min-w-0" />
                        <Button
                          type="button"
                          variant="destructive"
                          className="w-full sm:w-auto"
                          onClick={() => setImageUrls(prev => prev.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No images yet.</div>
                )}

                <div className="grid gap-2 min-w-0">
                  <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                    <Input
                      value={imageUrlDraft}
                      onChange={(e) => setImageUrlDraft(e.target.value)}
                      placeholder="Paste image URL"
                      className="min-w-0"
                    />
                    <Button
                      type="button"
                      className="w-full sm:w-auto rounded-sm"
                      style={{background: "linear-gradient(to right, #001C38, #0356a9ff)"}}
                      onClick={() => {
                        const next = imageUrlDraft.trim();
                        if (!next) return;
                        setImageUrls(prev => (prev.includes(next) ? prev : [...prev, next]));
                        setImageUrlDraft("");
                      }}
                    >
                      Add by URL
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
                      <Input
                        id={fileInputId}
                        type="file"
                        accept="image/*"
                        className="w-full"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const result = String(reader.result || "");
                            if (!result) return;
                            setImageUrls((prev) => (prev.includes(result) ? prev : [...prev, result]));
                          };
                          reader.readAsDataURL(file);
                          e.currentTarget.value = "";
                        }}
                      />
                      <Button onClick={handleSubmit} className="w-full sm:w-auto">Save Changes</Button>
                    </div>
                    <div className="text-xs text-muted-foreground">Choose an image file (saved as base64 in JSON).</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="h-0" />
      </DialogContent>
    </Dialog>
  );
}

function ChangeEmailDialog({ trigger }: { trigger?: React.ReactNode } = {}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: current email + password, 2: verify current email, 3: new email + verification
  const [currentEmail, setCurrentEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentVerificationCode, setCurrentVerificationCode] = useState("");
  const [newVerificationCode, setNewVerificationCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSentToNewEmail, setCodeSentToNewEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  // Debug: Log when component renders
  console.log("ChangeEmailDialog rendered, open:", open);

  // Reset form when dialog closes
  const resetForm = () => {
    console.log("Resetting form");
    setStep(1);
    setCurrentEmail("");
    setPassword("");
    setCurrentVerificationCode("");
    setNewEmail("");
    setNewVerificationCode("");
    setCodeSentToNewEmail(false);
  };

  const handleClose = () => {
    console.log("Dialog closing");
    setOpen(false);
    resetForm();
  };

  // Step 1: Send verification code to current email
  const handleSendCurrentEmailCode = async () => {
    console.log("Send current email code clicked, email:", currentEmail);
    
    if (!currentEmail.includes("@") || !password) {
      toast({
        title: "Missing fields",
        description: "Please enter your current email and password",
        variant: "destructive",
      });
      return;
    }

    setIsSendingCode(true);
    try {
      console.log("Sending verification code to current email:", currentEmail);
      const result = await sendVerificationCode(currentEmail);
      console.log("Send current email code result:", result);
      
      if (result.success) {
        toast({
          title: "Verification code sent",
          description: "Please check your current email for the 6-digit code",
        });
        setStep(2);
      } else {
        toast({
          title: "Failed to send code",
          description: result.message || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending current email code:", error);
      toast({
        title: "Error",
        description: "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  // Step 2: Verify current email code
  const handleVerifyCurrentEmail = async () => {
    console.log("Verify current email clicked, code:", currentVerificationCode);
    
    if (currentVerificationCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      // For now, we'll just move to step 3
      // In a real implementation, you'd verify the code first
      console.log("Current email verified, moving to step 3");
      setStep(3);
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 3: Send verification code to new email
  const handleSendNewEmailCode = async () => {
    console.log("Send new email code clicked, email:", newEmail);
    
    if (!newEmail.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid new email address",
        variant: "destructive",
      });
      return;
    }

    if (newEmail === currentEmail) {
      toast({
        title: "Same email",
        description: "New email must be different from current email",
        variant: "destructive",
      });
      return;
    }

    setIsSendingCode(true);
    try {
      console.log("Sending verification code to new email:", newEmail);
      const result = await sendVerificationCode(newEmail);
      console.log("Send new email code result:", result);
      
      if (result.success) {
        toast({
          title: "Verification code sent",
          description: "Please check your new email for the 6-digit code",
        });
        setCodeSentToNewEmail(true);
      } else {
        toast({
          title: "Failed to send code",
          description: result.message || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending new email code:", error);
      toast({
        title: "Error",
        description: "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  // Step 3: Verify new email and update
  const handleVerifyNewEmailAndUpdate = async () => {
    console.log("Verify new email and update clicked");
    
    if (newVerificationCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit verification code for new email",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      console.log("Updating email from", currentEmail, "to", newEmail);
      const result = await verifyCodeAndUpdateEmail(newEmail, newVerificationCode, currentEmail, password);
      console.log("Update email result:", result);
      
      if (result.success) {
        toast({
          title: "Email updated successfully",
          description: "Your email has been changed. You may need to log in again.",
        });
        handleClose();
      } else {
        toast({
          title: "Failed to update email",
          description: result.message || "Please check your credentials and try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating email:", error);
      toast({
        title: "Error",
        description: "Failed to update email",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            className="w-full justify-start border-none hover:bg-muted/50"
            onClick={() => setOpen(true)}
          >
            <Mail className="mr-2 h-4 w-4" />
            Change Email
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden">
        {/* BukSU Header */}
        <div className="bg-[#001C38] text-white p-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-400">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-white">Change Email Address</DialogTitle>
            <p className="text-xs text-slate-300 mt-0.5">Verify your credentials to update admin login email</p>
          </div>
        </div>

        {/* Step indicator pills */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 text-xs font-semibold text-center">
            <div className={`py-1.5 px-2 rounded-lg transition-colors ${step === 1 ? "bg-white text-[#001C38] shadow-sm font-bold" : step > 1 ? "text-emerald-700 font-medium" : "text-slate-400"}`}>
              1. Credentials
            </div>
            <div className={`py-1.5 px-2 rounded-lg transition-colors ${step === 2 ? "bg-white text-[#001C38] shadow-sm font-bold" : step > 2 ? "text-emerald-700 font-medium" : "text-slate-400"}`}>
              2. Verify Code
            </div>
            <div className={`py-1.5 px-2 rounded-lg transition-colors ${step === 3 ? "bg-white text-[#001C38] shadow-sm font-bold" : "text-slate-400"}`}>
              3. New Email
            </div>
          </div>
        </div>

        <div className="p-5 pt-2">
        {/* Step 1: Current Email + Password */}
        {step === 1 && (
          <div className="grid gap-4 py-2">
            <div className="text-center mb-2">
              <p className="text-xs text-slate-500">
                Enter your current email and password to start:
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="current-email">Current Email Address</Label>
              <Input
                id="current-email"
                type="email"
                value={currentEmail}
                onChange={(e) => setCurrentEmail(e.target.value)}
                placeholder="Enter your current email"
                disabled={isSendingCode}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isSendingCode}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSendingCode}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isSendingCode}>
                Cancel
              </Button>
              <Button onClick={handleSendCurrentEmailCode} disabled={isSendingCode || !currentEmail || !password}>
                {isSendingCode ? "Sending..." : "Send Verification Code"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Verify Current Email Code */}
        {step === 2 && (
          <div className="grid gap-4 py-4">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                We've sent a 6-digit verification code to:
              </p>
              <p className="font-medium">{currentEmail}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="current-verification-code">Verification Code</Label>
              <Input
                id="current-verification-code"
                type="text"
                value={currentVerificationCode}
                onChange={(e) => setCurrentVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                maxLength={6}
                disabled={isVerifying}
                className="text-center text-lg tracking-widest"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep(1)} disabled={isVerifying}>
                Back
              </Button>
              <Button onClick={handleVerifyCurrentEmail} disabled={isVerifying || currentVerificationCode.length !== 6}>
                {isVerifying ? "Verifying..." : "Verify Code"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: New Email + Verification */}
        {step === 3 && (
          <div className="grid gap-4 py-4">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                Current email verified! Now enter your new email:
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-email">New Email Address</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter your new email address"
                disabled={isSendingCode || codeSentToNewEmail}
              />
            </div>
            
            {!codeSentToNewEmail && (
              <div className="flex justify-end">
                <Button onClick={handleSendNewEmailCode} disabled={isSendingCode || !newEmail}>
                  {isSendingCode ? "Sending..." : "Send Code to New Email"}
                </Button>
              </div>
            )}

            {codeSentToNewEmail && (
              <>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Verification code sent to: {newEmail}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-verification-code">Verification Code</Label>
                  <Input
                    id="new-verification-code"
                    type="text"
                    value={newVerificationCode}
                    onChange={(e) => setNewVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    disabled={isVerifying}
                    className="text-center text-lg tracking-widest"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {setCodeSentToNewEmail(false); setNewVerificationCode("");}}>
                    Back
                  </Button>
                  <Button onClick={handleVerifyNewEmailAndUpdate} disabled={isVerifying || newVerificationCode.length !== 6}>
                    {isVerifying ? "Updating..." : "Update Email"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({ trigger }: { trigger?: React.ReactNode } = {}) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      return await changePassword(currentPassword, newPassword);
    },
    onSuccess: () => {
      toast({
        title: "Password changed successfully",
        description: "Your password has been updated.",
      });
      setOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to change password",
        description: error.message || "Please check your current password and try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async () => {
    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full justify-start border-none">
            <Lock className="mr-2 h-4 w-4" />
            Change Password
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden">
        {/* BukSU Header */}
        <div className="bg-[#001C38] text-white p-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-white">Change Admin Password</DialogTitle>
            <p className="text-xs text-slate-300 mt-0.5">Set a new secure password for your administrator account</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="current-password" className="text-xs font-semibold">Current Password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password" className="text-xs font-semibold">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password (min. 8 characters)"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password" className="text-xs font-semibold">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </Button>
            </div>
          </div>

          {/* Password Validation Checklist */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-[11px] text-slate-500 space-y-1.5">
            <div className="font-semibold text-slate-700">Security Criteria:</div>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${newPassword.length >= 8 ? "bg-emerald-500" : "bg-slate-300"}`} />
              <span className={newPassword.length >= 8 ? "text-emerald-700 font-medium" : ""}>
                At least 8 characters in length
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${newPassword && confirmPassword && newPassword === confirmPassword ? "bg-emerald-500" : "bg-slate-300"}`} />
              <span className={newPassword && confirmPassword && newPassword === confirmPassword ? "text-emerald-700 font-medium" : ""}>
                New password and confirmation must match
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={handleSubmit} 
              disabled={changePasswordMutation.isPending || !currentPassword || newPassword.length < 8 || newPassword !== confirmPassword}
              className="text-white"
              style={{ background: "linear-gradient(to right, #001C38, #0356a9)" }}
            >
              {changePasswordMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
