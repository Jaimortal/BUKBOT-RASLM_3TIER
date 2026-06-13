import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchResponses, 
  fetchLocations, 
  saveResponse, 
  saveLocation, 
  fetchKnowledgeRecords,
  updateKnowledgeRecord,
  type KnowledgeRecord
} from "@/lib/adminApi";
import type { ResponseData, Location } from "@/types/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Image as ImageIcon, Trash2, Upload, Loader2, X, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";

interface GalleryTopic {
  type: "response" | "location" | "knowledge";
  id: string; // intent, location id, or knowledge record id
  displayName: string;
  imageUrls: string[];
  original: ResponseData | Location | KnowledgeRecord;
}

export function AdminGallery() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<GalleryTopic | null>(null);
  const [editingImages, setEditingImages] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageToPendingDelete, setImageToPendingDelete] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: responses = [], isLoading: loadingResponses } = useQuery({
    queryKey: ["adminResponses"],
    queryFn: fetchResponses,
  });

  const { data: locations = [], isLoading: loadingLocations } = useQuery({
    queryKey: ["adminLocations"],
    queryFn: fetchLocations,
  });

  const { data: knowledgeData = { records: [], files: [] }, isLoading: loadingKnowledge } = useQuery({
    queryKey: ["knowledgeRecords"],
    queryFn: fetchKnowledgeRecords,
  });

  const saveResponseMutation = useMutation({
    mutationFn: saveResponse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminResponses"] });
      toast({ title: "Updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  });

  const saveLocationMutation = useMutation({
    mutationFn: saveLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminLocations"] });
      toast({ title: "Updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  });

  const updateKnowledgeMutation = useMutation({
    mutationFn: (vars: { file: string, record: KnowledgeRecord, images: string[] }) => updateKnowledgeRecord(vars.file, {
      path: vars.record.path,
      topic: vars.record.topic,
      images: vars.images,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeRecords"] });
      toast({ title: "Updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  });

  // Extract topics that have images
  const galleryTopics = useMemo(() => {
    const topics: GalleryTopic[] = [];

    responses.forEach(res => {
      const urls = res.responses?.imageUrls || [];
      // Backward compatibility for single imageUrl
      if (res.responses?.imageUrl && !urls.includes(res.responses.imageUrl)) {
        urls.push(res.responses.imageUrl);
      }
      
      if (urls.length > 0) {
        // Derive a display name
        const resAny = res as any;
        const displayName = resAny.topic_ui_name || resAny.displayName || res.intent.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        topics.push({
          type: "response",
          id: res.intent,
          displayName,
          imageUrls: urls,
          original: res
        });
      }
    });

    locations.forEach(loc => {
      const urls = loc.imageUrls || [];
      if (urls.length > 0) {
        topics.push({
          type: "location",
          id: loc.id,
          displayName: loc.name || loc.id,
          imageUrls: urls,
          original: loc
        });
      }
    });

    knowledgeData.records.forEach((record) => {
      const urls = record.images || [];
      if (urls.length > 0) {
        topics.push({
          type: "knowledge",
          id: record.id,
          displayName: record.displayName || record.topic,
          imageUrls: urls,
          original: record
        });
      }
    });

    return topics.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [responses, locations, knowledgeData.records]);

  const filteredTopics = useMemo(() => {
    return galleryTopics.filter(t => t.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [galleryTopics, searchTerm]);

  const handleOpenTopic = (topic: GalleryTopic) => {
    setSelectedTopic(topic);
    setEditingImages(topic.imageUrls);
  };

  const handleCommitChanges = () => {
    if (!selectedTopic) return;
    
    // Check if we actually have changes
    const original = selectedTopic.imageUrls;
    const hasChanges = JSON.stringify(original) !== JSON.stringify(editingImages);
    
    if (!hasChanges) {
      setSelectedTopic(null);
      return;
    }

    handleUpdateTopicImages(selectedTopic, editingImages);
  };

  const handleUpdateTopicImages = (topic: GalleryTopic, newImageUrls: string[]) => {
    if (topic.type === "response") {
      const res = topic.original as ResponseData;
      saveResponseMutation.mutate({
        ...res,
        responses: {
          ...res.responses,
          imageUrls: newImageUrls,
          // Clear legacy field to migrate completely to imageUrls
          imageUrl: undefined
        }
      });
      setSelectedTopic({ ...topic, imageUrls: newImageUrls, original: { ...res, responses: { ...res.responses, imageUrls: newImageUrls } } });
      
      // If no images left, close dialog
      if (newImageUrls.length === 0) {
        setSelectedTopic(null);
      }
    } else if (topic.type === "location") {
      const loc = topic.original as Location;
      saveLocationMutation.mutate({
        ...loc,
        imageUrls: newImageUrls
      });
      setSelectedTopic({ ...topic, imageUrls: newImageUrls, original: { ...loc, imageUrls: newImageUrls } });
      
      if (newImageUrls.length === 0) {
        setSelectedTopic(null);
      }
    } else if (topic.type === "knowledge") {
      const record = topic.original as KnowledgeRecord;
      updateKnowledgeMutation.mutate({
        file: record.file,
        record,
        images: newImageUrls,
      });
      setSelectedTopic({ 
        ...topic, 
        imageUrls: newImageUrls, 
        original: { ...record, images: newImageUrls } 
      });
      
      if (newImageUrls.length === 0) {
        setSelectedTopic(null);
      }
    }
  };

  const handleRemoveImage = (url: string) => {
    setImageToPendingDelete(url);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteImage = () => {
    if (imageToPendingDelete) {
      setEditingImages(prev => prev.filter(img => img !== imageToPendingDelete));
      setImageToPendingDelete(null);
    }
    setShowDeleteConfirm(false);
  };

  const handleFileUpload = async (topic: GalleryTopic, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid File", description: "Please upload an image file.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/admin/upload-image", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.url) {
        setEditingImages(prev => [...prev, data.url]);
      } else {
        toast({ title: "Upload Failed", description: data.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Upload Error", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const isLoading = loadingResponses || loadingLocations || loadingKnowledge;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search gallery topic..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredTopics.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No images found in your topics or locations.</p>
          <p className="text-sm">Upload images inside specific Responses or Locations to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredTopics.map((topic) => (
            <Card 
              key={`${topic.type}-${topic.id}`} 
              className="overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all group"
              onClick={() => handleOpenTopic(topic)}
            >
              <div className="aspect-square relative bg-slate-100">
                {topic.imageUrls.length > 1 ? (
                  // Collage style for multiple images
                  <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[1px] bg-white">
                    {topic.imageUrls.slice(0, 4).map((url, idx) => (
                      <div key={idx} className={`relative overflow-hidden ${idx === 0 && topic.imageUrls.length === 3 ? "col-span-2" : ""}`}>
                        <img 
                          src={url} 
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                        {idx === 3 && topic.imageUrls.length > 4 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-medium text-sm">
                            +{topic.imageUrls.length - 4}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Single image
                  <img 
                    src={topic.imageUrls[0]} 
                    alt={topic.displayName}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <span className="text-white font-medium text-sm truncate w-full text-center sm:text-left drop-shadow-md">
                    {topic.displayName}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Viewing & Editing Modal */}
      <Dialog open={!!selectedTopic} onOpenChange={(open) => !open && setSelectedTopic(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {selectedTopic && (
            <>
              <DialogHeader className="p-6 border-b shrink-0 bg-white">
                <DialogTitle className="text-xl">{selectedTopic.displayName}</DialogTitle>
                <DialogDescription>
                  Reviewing {(editingImages || []).length} image(s) for this {selectedTopic.type}.
                  Click "Update & Save" to permanently commit these image changes to the database.
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 flex-1 overflow-y-auto bg-slate-50 min-h-[300px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {editingImages.map((url, idx) => (
                    <div key={idx} className="group relative bg-white rounded-lg border shadow-sm overflow-hidden flex flex-col">
                      <div className="aspect-square relative flex items-center justify-center bg-slate-100 p-2">
                        <img src={url} alt="Topic Image" className="max-w-full max-h-full object-contain" />
                      </div>
                      <div className="p-3 border-t bg-white flex justify-between items-center">
                        <span className="text-xs text-muted-foreground truncate mr-2" title={url}>
                          {url.split('/').pop() || "Image source"}
                        </span>
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="h-8 w-8 shrink-0 relative z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(url);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Upload New Image Button */}
                  <div className="aspect-square relative rounded-lg border-2 border-dashed border-muted flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition-colors text-muted-foreground w-full">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id={`gallery-upload-${selectedTopic.id.replace(/[:\\.]/g, '-')}`}
                      onChange={(e) => handleFileUpload(selectedTopic, e)}
                      disabled={isUploading || saveResponseMutation.isPending || saveLocationMutation.isPending || updateKnowledgeMutation.isPending}
                    />
                    <Button 
                      variant="ghost" 
                      className="w-full h-full flex flex-col items-center justify-center space-y-2 hover:bg-transparent"
                      onClick={() => document.getElementById(`gallery-upload-${selectedTopic.id.replace(/[:\\.]/g, '-')}`)?.click()}
                      disabled={isUploading || saveResponseMutation.isPending || saveLocationMutation.isPending || updateKnowledgeMutation.isPending}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8" />
                          <span>Add Image</span>
                        </>
                      )}
                    </Button>
                  </div>

                </div>
              </div>

              <div className="p-4 border-t bg-white flex justify-end gap-3 sticky bottom-0 z-20">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedTopic(null)}
                  disabled={isUploading || saveResponseMutation.isPending || saveLocationMutation.isPending || updateKnowledgeMutation.isPending}
                >
                  Discard Changes
                </Button>
                <Button 
                  onClick={handleCommitChanges}
                  disabled={isUploading || saveResponseMutation.isPending || saveLocationMutation.isPending || updateKnowledgeMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {(saveResponseMutation.isPending || saveLocationMutation.isPending || updateKnowledgeMutation.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update & Save
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the image from the list. It will only be permanently deleted from the database once you click "Update & Save".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteImage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Removal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
