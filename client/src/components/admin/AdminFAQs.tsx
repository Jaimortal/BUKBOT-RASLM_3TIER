import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllFaqs, saveFaq, deleteFaqApi, fetchBotTopics, BotCategory, BotTopic } from "@/lib/adminApi";
import type { FaqConfig } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Plus, Trash2, Search, Zap, ZapOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, AlertCircle } from "lucide-react";

export function AdminFAQs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [editingFaq, setEditingFaq] = useState<Partial<FaqConfig> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPayloadDialogOpen, setIsPayloadDialogOpen] = useState(false);
  const [showPayloadConfirm, setShowPayloadConfirm] = useState(false);
  const [payloadDraft, setPayloadDraft] = useState("");
  const [activeTab, setActiveTab] = useState<string>("responses.json");

  // Fetch Faq Configs (DB)
  const { data: faqs = [], isLoading: loadingFaqs } = useQuery({
    queryKey: ["adminFaqs"],
    queryFn: fetchAllFaqs
  });

  // Fetch Bot Topics (Parsed from Backend JSON)
  const { data: botCategories = [], isLoading: loadingBotTopics } = useQuery({
    queryKey: ["botTopics"],
    queryFn: fetchBotTopics
  });

  const saveMutation = useMutation({
    mutationFn: saveFaq,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminFaqs"] });
      toast({ title: "FAQ Saved successfully" });
      setIsDialogOpen(false);
    },
    onError: () => toast({ title: "Failed to save FAQ", variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFaqApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminFaqs"] });
      toast({ title: "FAQ removed successfully" });
    },
    onError: () => toast({ title: "Failed to remove FAQ", variant: "destructive" })
  });

  const payloadMutation = useMutation({
    mutationFn: saveFaq,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["adminFaqs"] });
      setEditingFaq(prev => prev ? { ...prev, payload: variables.payload } : prev);
      setIsPayloadDialogOpen(false);
      setShowPayloadConfirm(false);
      toast({ title: "Payload updated" });
    },
    onError: () => {
      toast({ title: "Failed to update payload", variant: "destructive" });
      setShowPayloadConfirm(false);
    }
  });

  const toggleEnabled = (faq: FaqConfig, checked: boolean) => {
    saveMutation.mutate({ ...faq, enabled: checked });
  };

  const handleCreateOrEdit = (botTopic: BotTopic, existingFaq?: FaqConfig) => {
    if (existingFaq) {
      setEditingFaq(existingFaq);
    } else {
      setEditingFaq({
        superIntent: botTopic.superIntent,
        topicKey: botTopic.topicKey,
        payload: botTopic.payload,
        displayLabel: botTopic.defaultLabel,
        icon: botTopic.defaultIcon,
        subtitle: "",
        enabled: true,
        sortOrder: 0
      });
    }
    setIsDialogOpen(true);
  };

  const openPayloadEditor = () => {
    if (!editingFaq) return;
    setPayloadDraft(editingFaq.payload || "");
    setIsPayloadDialogOpen(true);
  };

  const confirmPayloadUpdate = () => {
    if (!editingFaq) return;
    const nextPayload = payloadDraft.trim();
    if (!nextPayload) {
      toast({ title: "Payload cannot be empty", variant: "destructive" });
      return;
    }

    const updatedFaq = {
      ...editingFaq,
      payload: nextPayload,
      subtitle: editingFaq.subtitle || "",
      sortOrder: editingFaq.sortOrder ?? 0,
    } as FaqConfig;

    if (editingFaq.id) {
      payloadMutation.mutate(updatedFaq);
    } else {
      setEditingFaq(updatedFaq);
      setIsPayloadDialogOpen(false);
      setShowPayloadConfirm(false);
      toast({ title: "Payload updated locally" });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this topic from FAQs?")) {
      deleteMutation.mutate(id);
    }
  };

  if (loadingFaqs || loadingBotTopics) {
    return <div className="text-center py-10 text-muted-foreground animate-pulse">Loading Topics...</div>;
  }

  // Pre-select first tab if no active
  if (!activeTab && botCategories.length > 0) {
    setActiveTab(botCategories[0].id);
  }

  const currentCategory = botCategories.find((c: BotCategory) => c.id === activeTab) || botCategories[0];
  
  let currentTopics = currentCategory?.topics || [];
  if (searchTerm) {
    currentTopics = currentTopics.filter((t: BotTopic) => 
      t.topicKey.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.defaultLabel.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col items-start space-y-2">
          <CardTitle className="text-xl px-2 mt-2">FAQ Configuration</CardTitle>
          <CardDescription className="px-2">Select chatbot topics securely routed to Rasa and add them to the User FAQ Carousel.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 border-t">
          <div className="flex gap-0 h-[640px] rounded-b-xl overflow-hidden bg-white">
            {/* ── LEFT: Bot Categories vertical nav ── */}
            <div className="w-56 shrink-0 border-r bg-gray-50 flex flex-col">
              <div
                className="px-4 py-3 border-b shrink-0"
                style={{ background: "linear-gradient(to right, #001C38, #0356a9ff)" }}
              >
                <p className="text-white font-semibold text-xs uppercase tracking-wider">Categories</p>
                <p className="text-blue-200 text-[10px] mt-0.5">{botCategories.length} available files</p>
              </div>

              <nav
                className="flex-1 overflow-y-auto py-2"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
              >
                {botCategories.map((cat: BotCategory) => {
                  const isActive = cat.id === activeTab;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveTab(cat.id)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-150 flex items-center justify-between gap-2 ${
                        isActive
                          ? "text-white font-semibold shadow-sm"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                      style={isActive ? { background: "linear-gradient(to right, #001C38, #0356a9ff)" } : undefined}
                    >
                      <span className="leading-tight truncate max-w-[130px]">{cat.displayName}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"}`}>
                        {cat.topics.length}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* ── RIGHT: Topics panel ── */}
            <div className="flex-1 min-w-0 p-5 flex flex-col bg-slate-50/50">
              <div className="mb-4 relative max-w-sm shrink-0">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input 
                   placeholder={`Search ${currentCategory?.displayName || ""}...`}
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   className="pl-9 bg-white"
                 />
              </div>

              <div className="flex-1 overflow-y-auto px-1 pb-4" style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}>
                {currentTopics.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No topics found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                    {currentTopics.map((topic: BotTopic) => {
                      const existingFaq = faqs.find(f => f.topicKey === topic.topicKey && f.superIntent === topic.superIntent);
                      
                      return (
                        <div key={topic.topicKey} className={`group flex flex-col rounded-xl border bg-white shadow-sm hover:shadow-md transition-all p-4 ${existingFaq ? 'border-primary/20' : 'border-gray-200'}`}>
                          
                          <div className="flex justify-between items-start mb-2">
                             {/* Header Icon + Titles */}
                             <div className="flex items-start gap-2.5 max-w-[85%]">
                                <span className="text-3xl bg-secondary/30 rounded flex items-center justify-center p-1.5 leading-none shrink-0 border">
                                  {existingFaq ? existingFaq.icon : topic.defaultIcon}
                                </span>
                                <div>
                                   <p className="font-bold text-[14px] text-gray-800 leading-tight">
                                     {existingFaq ? existingFaq.displayLabel : topic.defaultLabel}
                                   </p>
                                   <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate max-w-[130px]">{topic.topicKey}</p>
                                </div>
                             </div>

                             {/* Status Dropdown (only for existing FAQs) */}
                             {existingFaq && (
                               <DropdownMenu>
                                 <DropdownMenuTrigger asChild>
                                   <button className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border transition-colors shrink-0 ${existingFaq.enabled ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}>
                                     {existingFaq.enabled ? 'Active' : 'Disabled'}
                                     <ChevronDown className="h-3 w-3" />
                                   </button>
                                 </DropdownMenuTrigger>
                                 <DropdownMenuContent align="end" className="w-32 z-50">
                                   <DropdownMenuItem onClick={() => toggleEnabled(existingFaq, true)} className="text-green-600 font-medium cursor-pointer">
                                     Active FAQ
                                   </DropdownMenuItem>
                                   <DropdownMenuItem onClick={() => toggleEnabled(existingFaq, false)} className="text-gray-600 font-medium cursor-pointer">
                                     Deactivate
                                   </DropdownMenuItem>
                                 </DropdownMenuContent>
                               </DropdownMenu>
                             )}
                          </div>

                          <div className="flex-1 mt-1 mb-3">
                             <p className="text-xs text-muted-foreground line-clamp-3">
                               {existingFaq?.subtitle ? (
                                 <span className="italic">"{existingFaq.subtitle}"</span>
                               ) : topic.previewResponse ? (
                                 topic.previewResponse
                               ) : (
                                 "No preview available."
                               )}
                             </p>
                          </div>

                          <div className="pt-3 border-t mt-auto flex justify-between items-center bg-gray-50/50 -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl border-t-gray-100">
                             {!existingFaq ? (
                               <div className="w-full">
                                 <Button variant="default" size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-xs h-8" onClick={() => handleCreateOrEdit(topic)}>
                                   <Plus className="h-3.5 w-3.5 mr-1.5" /> Add to FAQs
                                 </Button>
                               </div>
                             ) : (
                               <>
                                 <p className="text-[9px] text-gray-400 font-mono tracking-tighter truncate max-w-[100px]">
                                   {topic.payload}
                                 </p>
                                 <div className="flex gap-1.5">
                                   <Button variant="outline" size="sm" className="h-7 px-2.5 hover:bg-gray-100 border-gray-200" onClick={() => handleCreateOrEdit(topic, existingFaq)}>
                                     <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                                   </Button>
                                   <Button variant="outline" size="sm" className="h-7 px-2.5 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border-gray-200" onClick={() => handleDelete(existingFaq.id!)}>
                                     <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                   </Button>
                                 </div>
                               </>
                             )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFaq?.id ? 'Customize FAQ Card' : 'Add to FAQ'}</DialogTitle>
            <DialogDescription>
              Edit the visible quick chat card. Payload editing is hidden under the footer for advanced fixes only.
            </DialogDescription>
          </DialogHeader>
          
          {editingFaq && (
             <div className="space-y-4 mt-2">
               <div>
                  <Label>Display Label</Label>
                  <Input 
                    value={editingFaq.displayLabel || ""} 
                    onChange={e => setEditingFaq({...editingFaq, displayLabel: e.target.value})}
                    placeholder="e.g., Enrollment"
                  />
                  <p className="text-xs text-muted-foreground mt-1">What users will see on the button.</p>
               </div>
               
               
               <div>
                    <Label>Icon / Emoji</Label>
                    <Input 
                      value={editingFaq.icon || ""} 
                      onChange={e => setEditingFaq({...editingFaq, icon: e.target.value})}
                      placeholder="e.g., 🎓"
                    />
               </div>
               
               <div className="mt-4 bg-muted p-4 rounded-xl border border-primary/10">
                 <Label className="text-xs text-muted-foreground mb-3 block uppercase tracking-wider font-semibold">Client quick chat preview</Label>
                 <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-full px-3 py-1.5 shadow-sm whitespace-nowrap h-9 max-w-full">
                      <span className="text-[13px]">{editingFaq.icon || "✨"}</span>
                      <span className="font-medium text-[13px] truncate max-w-[220px]">{editingFaq.displayLabel || "Label"}</span>
                    </div>
                 </div>
                 </div>

               <Button 
                onClick={() => saveMutation.mutate({ ...editingFaq, subtitle: editingFaq.subtitle || "", sortOrder: editingFaq.sortOrder ?? 0 } as FaqConfig)}
                className="w-full mt-4"
                disabled={!editingFaq.displayLabel}
               >
                 {editingFaq.id ? "Save Changes" : "Save to FAQs"}
               </Button>
               <button
                type="button"
                onDoubleClick={openPayloadEditor}
                title="Double-click to edit payload"
                className="block w-full text-center text-[10px] text-muted-foreground hover:text-blue-700 transition-colors"
               >
                 payload: <code className="bg-muted px-1 py-0.5 rounded text-[9px]">{editingFaq.payload}</code>
               </button>
             </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPayloadDialogOpen} onOpenChange={setIsPayloadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit FAQ payload</DialogTitle>
            <DialogDescription>
              The payload is the exact message sent to Rasa when users click this FAQ. Use the default unless the current payload is wrong.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Payload</Label>
              <Input
                value={payloadDraft}
                onChange={(event) => setPayloadDraft(event.target.value)}
                placeholder="where is OVPCAS Office"
                className="font-mono text-xs"
              />
              <p className="mt-1 text-xs text-amber-700">
                Incorrect payloads can route the button to the wrong answer.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPayloadDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowPayloadConfirm(true)}
                disabled={!payloadDraft.trim() || payloadMutation.isPending}
              >
                Save payload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showPayloadConfirm} onOpenChange={setShowPayloadConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modify this FAQ payload?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to modify the payload? If the payload is incorrect, this FAQ may send users to the wrong chatbot answer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={payloadMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPayloadUpdate}
              disabled={payloadMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirm and save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
