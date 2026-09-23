import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMapSettings, saveMapSettings, type MapSettings, type MapData } from "@/lib/adminApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Map, 
  MapPin, 
  Compass, 
  Upload, 
  Loader2, 
  Trash2, 
  CheckCircle2, 
  Eye, 
  AlertCircle,
  FileImage,
  Check
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

export function AdminMapSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [mapToDelete, setMapToDelete] = useState<MapData | null>(null);

  const { data: mapSettings } = useQuery({
    queryKey: ["mapSettings"],
    queryFn: fetchMapSettings,
  });

  const saveMutation = useMutation({
    mutationFn: saveMapSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapSettings"] });
      toast({ title: "Map settings saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save map settings", variant: "destructive" });
    }
  });

  const maps = mapSettings?.maps || [];

  const handleUploadFile = async (file: File) => {
    if (maps.length >= 2) {
      toast({
        title: "Map Limit Reached",
        description: "A maximum of 2 campus maps is allowed. Delete one before uploading a new map.",
        variant: "destructive"
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a valid image file (PNG, JPG, or WebP).",
        variant: "destructive"
      });
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
        const newMap: MapData = {
          id: data.id || `map_${Date.now()}`,
          url: data.url,
          active: maps.length === 0, // Auto-activate if it's the only one
          name: file.name
        };
        saveMutation.mutate({ maps: [...maps, newMap] });
        toast({ title: "Campus Map Uploaded", description: `${file.name} is now available.` });
      } else {
        toast({ title: "Upload Failed", description: data.message || "Could not process image.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Upload Error", description: error.message || "Network issue.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
    event.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleSetActive = (id: string) => {
    const updatedMaps = maps.map(m => ({ ...m, active: m.id === id }));
    saveMutation.mutate({ maps: updatedMaps });
    toast({ title: "Active Map Updated", description: "This campus map is now live in student responses." });
  };

  const confirmDelete = async () => {
    if (!mapToDelete) return;
    const id = mapToDelete.id;

    if (mapToDelete.url.startsWith("/api/images/")) {
      try {
        const token = localStorage.getItem("adminToken");
        await fetch(`/api/admin/images/${mapToDelete.id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
      } catch (e) {
        console.error("Failed to delete from server", e);
      }
    }

    const updatedMaps = maps.filter(m => m.id !== id);
    if (mapToDelete.active && updatedMaps.length > 0) {
      updatedMaps[0].active = true;
    }

    saveMutation.mutate({ maps: updatedMaps });
    setMapToDelete(null);
    toast({ title: "Map Deleted", description: "Campus map was permanently removed." });
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-slate-200/80 shadow-sm overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#001C38] via-[#0356a9] to-[#F59E0B]" />
        <CardHeader className="p-5 sm:p-6 bg-slate-50/50 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#001C38] text-white shadow-sm">
                <Map className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">Campus Map Backgrounds</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-500">
                  Manage interactive campus blueprints used for office locations and pin navigation.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                  maps.length >= 2 
                    ? "bg-amber-50 text-amber-800 border-amber-300" 
                    : "bg-blue-50 text-blue-800 border-blue-200"
                }`}
              >
                <FileImage className="mr-1.5 h-3.5 w-3.5" />
                {maps.length} of 2 Slots Used
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Upload Dropzone */}
          {maps.length < 2 ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("map-upload-input")?.click()}
              className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-[#001C38] bg-blue-50/50 scale-[1.005]"
                  : "border-slate-300 hover:border-[#001C38] hover:bg-slate-50/80 bg-white"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="map-upload-input"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#001C38] group-hover:scale-110 group-hover:bg-[#001C38] group-hover:text-white transition-all shadow-sm mb-3">
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
              </div>
              <h4 className="text-sm font-semibold text-slate-800">
                {isUploading ? "Uploading Campus Map..." : "Click to upload or drag & drop"}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                High-resolution PNG, JPG, or WebP campus blueprint (max 10MB).
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-amber-900 text-xs sm:text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <span className="font-semibold">Maximum capacity reached (2 maps).</span> Delete an existing map if you need to upload a revised campus layout.
              </div>
            </div>
          )}

          {/* Map Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {maps.map((map, idx) => {
              const isActive = !!map.active;
              return (
                <div
                  key={map.id}
                  className={`flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden bg-white shadow-sm ${
                    isActive 
                      ? "border-[#001C38] ring-2 ring-[#001C38]/15" 
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Top image preview */}
                  <div className="relative aspect-video w-full bg-slate-900/5 flex items-center justify-center overflow-hidden group">
                    <img 
                      src={map.url} 
                      alt={map.name || `Campus Map ${idx + 1}`} 
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" 
                    />
                    
                    {/* Active Ribbon */}
                    {isActive ? (
                      <div className="absolute top-3 left-3 bg-[#001C38] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 border border-amber-400/40">
                        <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                        Active Campus Map
                      </div>
                    ) : (
                      <div className="absolute top-3 left-3 bg-slate-800/70 text-white text-[11px] font-medium px-2 py-0.5 rounded-md backdrop-blur">
                        Inactive Slot
                      </div>
                    )}

                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={() => setPreviewImageUrl(map.url)}
                      className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-slate-800 p-2 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs font-semibold"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Full
                    </button>
                  </div>

                  {/* Body & Actions */}
                  <div className="p-4 flex flex-col justify-between flex-1 gap-3 bg-slate-50/40">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Map File</p>
                      <h4 className="text-sm font-semibold text-slate-800 truncate" title={map.name}>
                        {map.name || `Campus Map ${idx + 1}`}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
                      {!isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetActive(map.id)}
                          className="flex-1 text-xs font-semibold hover:bg-[#001C38] hover:text-white transition-colors"
                        >
                          <Check className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                          Set as Active
                        </Button>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg py-1.5 border border-emerald-200/80">
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                          Currently Displayed
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setMapToDelete(map)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty State */}
            {maps.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center bg-slate-50/50 min-h-[220px]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                  <Compass className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-700">No campus maps registered</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Upload a campus blueprint image above. The chatbot currently defaults to a fallback coordinate grid.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen Image Preview Dialog */}
      <Dialog open={!!previewImageUrl} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className="max-w-4xl p-2 bg-slate-950 border-slate-800">
          <div className="relative max-h-[80vh] flex items-center justify-center overflow-auto rounded-lg">
            {previewImageUrl && (
              <img 
                src={previewImageUrl} 
                alt="Campus Map Full View" 
                className="max-h-[75vh] w-auto object-contain rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!mapToDelete} onOpenChange={(open) => !open && setMapToDelete(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 mb-2">
              <Trash2 className="h-5 w-5" />
            </div>
            <DialogTitle>Delete Campus Map?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to remove <strong className="text-slate-800">{mapToDelete?.name}</strong>? If this is the active map, the alternate map or coordinate grid will be used instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" size="sm" onClick={() => setMapToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
