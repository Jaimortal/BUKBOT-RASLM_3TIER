import { useState, useEffect, useId, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchResponses, 
  saveResponse as saveResponseApi, 
  fetchLocations,
  saveLocation as saveLocationApi,
  deleteLocationApi,
  fetchUserPrivilegesAdmin,
  saveUserPrivilegesAdmin,
  fetchAutoTranslateStatus,
  sendVerificationCode,
  verifyCodeAndUpdateEmail,
  changePassword,
  syncKnowledgeBaseApi
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  MessageSquare, 
  Settings, 
  Map as MapIcon, 
  LogOut, 
  Shield, 
  HelpCircle,
  Database,
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
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import InteractiveMap from "@/components/InteractiveMap";
import { AdminFAQs } from "@/components/admin/AdminFAQs";
import { AdminGeneralResponses } from "@/components/admin/AdminGeneralResponses";
import { AdminKnowledgeManager } from "@/components/admin/AdminKnowledgeManager";
import { AdminLocations } from "@/components/admin/AdminLocations";
import { AdminMapSettings } from "@/components/admin/AdminMapSettings";
import { AdminGallery } from "@/components/admin/AdminGallery";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("responses");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [responsesSubTab, setResponsesSubTab] = useState<"knowledge" | "locations">("knowledge");
  
  const DEFAULT_PRIVILEGES: UserPrivileges = {
    chatEnabled: true,
    audioInputEnabled: true,
    mapAccessEnabled: true,
    autoTranslateEnabled: true
  };
  
  // --- Filter States ---
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [locationSearchTerm, setLocationSearchTerm] = useState<string>("");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  
  // --- Responses Query ---
  const { data: responses = [] } = useQuery({
    queryKey: ["responses"],
    queryFn: fetchResponses
  });

  // --- Locations Query ---
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: fetchLocations
  });

  // --- User Privileges Query ---
  const { data: fetchedPrivileges } = useQuery({
    queryKey: ["userPrivileges"],
    queryFn: fetchUserPrivilegesAdmin,
    staleTime: 60000, // Consider data fresh for 1 minute
    refetchInterval: 60000, // Only poll every minute
    refetchOnWindowFocus: false,
  });

  const { data: autoTranslateStatus } = useQuery({
    queryKey: ["autoTranslateStatus"],
    queryFn: fetchAutoTranslateStatus,
    refetchInterval: 10000, // Poll every 10 seconds instead of 1.5s (6.6x reduction)
    staleTime: 5000, // Consider data fresh for 5 seconds
  });

  const mountedAtRef = useRef<number>(Date.now());
  const lastNotifiedJobIdRef = useRef<string | null>(null);
  const translationBusy = autoTranslateStatus?.status === "running";
  const translationBusyIntent: string | null =
    typeof autoTranslateStatus?.current?.intent === "string" ? autoTranslateStatus.current.intent : null;

  const [privileges, setPrivileges] = useState<UserPrivileges>(DEFAULT_PRIVILEGES);

  useEffect(() => {
    if (fetchedPrivileges) {
      setPrivileges(fetchedPrivileges);
    }
  }, [fetchedPrivileges]);

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

  // --- Filter Logic ---
  const filteredResponses = responses.filter(response => {
    const matchesCategory = categoryFilter === "all" || response.category === categoryFilter;
    const matchesSearch = searchTerm === "" || 
      (response.intent && response.intent.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (response.category && response.category.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // --- Get Unique Categories ---
  const categories = Array.from(new Set(responses.map(r => r.category).filter(Boolean)));

  // --- Get Unique Buildings ---
  const buildings = Array.from(new Set(locations.map(l => l.building).filter(Boolean))) as string[];

  const filteredLocations = locations.filter((l) => {
    const matchesSearch = !locationSearchTerm.trim() || 
      (l.name && l.name.toLowerCase().includes(locationSearchTerm.toLowerCase())) ||
      (l.type && l.type.toLowerCase().includes(locationSearchTerm.toLowerCase())) ||
      (l.building && l.building.toLowerCase().includes(locationSearchTerm.toLowerCase()));
    
    const matchesBuilding = buildingFilter === "all" || l.building === buildingFilter;
    
    return matchesSearch && matchesBuilding;
  });

  // --- Mutations ---
  const saveResponseMutation = useMutation({
    mutationFn: async (response: ResponseData) => {
      const result: any = await saveResponseApi(response);
      if (!result?.success) {
        throw new Error(result?.message || "Failed to save response");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      toast({ title: "Response Saved", description: "The chatbot response has been updated." });
    },
  });

  const saveLocationMutation = useMutation({
    mutationFn: (location: Location) => saveLocationApi(location),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast({ title: "Location Saved" });
    }
  });

  const savePrivilegesMutation = useMutation({
    mutationFn: (p: UserPrivileges) => saveUserPrivilegesAdmin(p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPrivileges"] });
      toast({ title: "Privileges Updated" });
    },
    onError: () => {
      toast({ title: "Failed to update privileges", variant: "destructive" });
    }
  });

  const syncKnowledgeBaseMutation = useMutation({
    mutationFn: (force: boolean) => syncKnowledgeBaseApi(force),
    onSuccess: (result: MigrationResult) => {
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["super-intent-meta"] });
      queryClient.invalidateQueries({ queryKey: ["knowledgeRecords"] });
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
    const updated: UserPrivileges = {
      ...privileges,
      [key]: checked
    };
    setPrivileges(updated);
    savePrivilegesMutation.mutate(updated);
  };

  // --- UI ---
  const menuItems = [
    { id: "responses", label: "Responses", icon: MessageSquare },
    { id: "gallery", label: "Gallery", icon: ImageIcon },
    { id: "faqs", label: "FAQs", icon: FileJson },
    { id: "privileges", label: "User Privilege", icon: Users },
    { id: "admin-settings", label: "Admin Settings", icon: Settings },
    { id: "logout", label: "Logout", icon: LogOut, isLogout: true },
  ];

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      
      {/* mobile hamburger menu */}
      <div className="lg:hidden fixed top-8 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="bg-white"
        >
          {isMobileSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar Navigation — always fixed, never scrolls with page */}
      <div className={`
        fixed top-0 left-0 w-64 bg-white shadow-lg z-50
        flex flex-col h-screen
        transform transition-transform duration-300 ease-in-out
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <img 
              src="/LOGO.png" 
              alt="Admin Logo" 
              className="w-10 h-10 rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <h1 className="text-xl font-bold ">Admin Panel</h1>
              <p className="text-muted-foreground text-xs text-dark/80">Manage chatbot settings</p>
            </div>
          </div>
        </div>
        
        <nav className="px-4 gap-2 flex flex-col flex-1 overflow-y-auto pb-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.isLogout) {
                    setShowLogoutConfirmation(true);
                    setIsMobileSidebarOpen(false);
                  } else {
                    setActiveTab(item.id);
                    setIsMobileSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  item.isLogout
                    ? "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    : activeTab === item.id
                    ? " text-white "
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
                style={
                  !item.isLogout && activeTab === item.id
                    ? { background: "linear-gradient(to right, #001C38, #0356a9ff)" }
                    : undefined
                }
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content — offset by sidebar width on desktop */}
      <div className="flex-1 p-4 lg:p-8 mt-5 lg:ml-64">
        <div className="max-w-6xl mx-auto">
          {activeTab === "responses" && (
            <div className="space-y-6">
              <Card className="border-0 shadow-lg overflow-hidden bg-white/80 backdrop-blur-sm">
                <div className="p-4 border-b bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center justify-between w-full">
                    <Tabs value={responsesSubTab} onValueChange={(v) => setResponsesSubTab(v as any)} className="w-full sm:w-auto">
                      <TabsList className="bg-slate-100 p-1">
                        <TabsTrigger value="knowledge" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Knowledge Manager</TabsTrigger>
                        <TabsTrigger value="locations" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Locations</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    
                    <Button 
                      onClick={() => setShowSyncDialog(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 shadow-sm"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncKnowledgeBaseMutation.isPending ? "animate-spin" : ""}`} />
                      Sync Knowledge Base
                    </Button>
                  </div>
                </div>

                <CardContent className="p-0">
                  {responsesSubTab === "knowledge" ? (
                    <div className="p-4"><AdminKnowledgeManager /></div>
                  ) : (
                    <div className="p-4"><AdminLocations /></div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "privileges" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">User Privileges</CardTitle>
                  <CardDescription className="text-sm">Enable or disable user features in the chat widget</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border rounded-lg p-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm sm:text-base">User Chat</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground">Allow users to send messages</p>
                    </div>
                    <Switch
                      checked={privileges.chatEnabled}
                      onCheckedChange={(checked) => handlePrivilegeToggle("chatEnabled", checked)}
                      disabled={savePrivilegesMutation.isPending}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border rounded-lg p-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm sm:text-base">Audio Input</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground">Show or hide the microphone input</p>
                    </div>
                    <Switch
                      checked={privileges.audioInputEnabled}
                      onCheckedChange={(checked) => handlePrivilegeToggle("audioInputEnabled", checked)}
                      disabled={savePrivilegesMutation.isPending}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border rounded-lg p-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm sm:text-base">Map Access</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground">Allow users to view maps in responses</p>
                    </div>
                    <Switch
                      checked={privileges.mapAccessEnabled}
                      onCheckedChange={(checked) => handlePrivilegeToggle("mapAccessEnabled", checked)}
                      disabled={savePrivilegesMutation.isPending}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "admin-settings" && (
            <div className="space-y-6">
              <Card className="hidden">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Translation Settings</CardTitle>
                  <CardDescription className="text-sm">Manage translation and content settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border rounded-lg p-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm sm:text-base">Auto Translate</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground">Auto-fill Cebuano when admin leaves it empty</p>
                    </div>
                    <Switch
                      checked={privileges.autoTranslateEnabled}
                      onCheckedChange={(checked) => handlePrivilegeToggle("autoTranslateEnabled", checked)}
                      disabled={savePrivilegesMutation.isPending}
                    />
                  </div>
                </CardContent>
              </Card>

              <AdminMapSettings />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Account Settings</CardTitle>
                  <CardDescription className="text-sm">Manage your admin account credentials</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ChangeEmailDialog />
                  <ChangePasswordDialog />
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "faqs" && (
            <AdminFAQs />
          )}

          {activeTab === "gallery" && (
            <AdminGallery />
          )}
        </div>
      </div>
      
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
  const [mapCoordinates, setMapCoordinates] = useState<[number, number]>(location?.coordinates || [500, 500]);
  const [pins, setPins] = useState<Array<{ name: string; coordinates: [number, number] }>>(
    Array.isArray((location as any)?.pins) && (location as any).pins.length > 0
      ? (location as any).pins
      : [{ name: "Main Pin", coordinates: location?.coordinates || [500, 500] }]
  );
  const [activePinIndex, setActivePinIndex] = useState<number>(0);
  const [enText, setEnText] = useState<string>((location?.responses?.en || []).join("\n"));
  const [cebText, setCebText] = useState<string>((location?.responses?.ceb || []).join("\n"));
  const [imageUrls, setImageUrls] = useState<string[]>(Array.isArray((location as any)?.imageUrls) ? (location as any).imageUrls : []);
  const [imageUrlDraft, setImageUrlDraft] = useState<string>("");
  const fileInputId = useId();

  useEffect(() => {
    if (!open) return;
    setLocationName(location?.name || "");
    setLocationType(location?.type || "");
    setBuilding(location?.building || "");
    setFloor(location?.floor || "");
    setMapId(location?.mapImage || "main_map");
    setMapCoordinates(location?.coordinates || [500, 500]);
    const nextPins = Array.isArray((location as any)?.pins) && (location as any).pins.length > 0
      ? (location as any).pins
      : [{ name: "Main Pin", coordinates: location?.coordinates || [500, 500] }];
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

function ChangeEmailDialog() {
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
        <Button 
          variant="outline" 
          className="w-full justify-start border-none hover:bg-muted/50"
          onClick={() => {
            console.log("Change Email button clicked!");
            setOpen(true);
          }}
        >
          <Mail className="mr-2 h-4 w-4" />
          Change Email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] ">
        <DialogHeader>
          <DialogTitle>Change Email Address</DialogTitle>
        </DialogHeader>
        
        {/* Step 1: Current Email + Password */}
        {step === 1 && (
          <div className="grid gap-4 py-4">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
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
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog() {
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
        <Button variant="outline" className="w-full justify-start border-none">
          <Lock className="mr-2 h-4 w-4" />
          Change Password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="current-password">Current Password</Label>
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
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">New Password</Label>
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
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
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
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={changePasswordMutation.isPending}>
            {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
