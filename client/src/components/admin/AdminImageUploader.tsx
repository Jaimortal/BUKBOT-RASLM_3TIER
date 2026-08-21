import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImagePlus, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminImageUploaderProps {
  onAddImage: (url: string) => void;
}

export function AdminImageUploader({ onAddImage }: AdminImageUploaderProps) {
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUrlAdd = () => {
    if (newImageUrl.trim()) {
      onAddImage(newImageUrl.trim());
      setNewImageUrl("");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid File", description: "Please upload an image file.", variant: "destructive" });
      return;
    }

    const maxFileSize = 10 * 1024 * 1024; // 10MB limit (server auto-compresses to WebP)
    if (file.size > maxFileSize) {
      toast({ title: "File too large", description: "Image must be under 10MB. Large images are automatically compressed on upload.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      // Get jwt token explicitly for upload
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/admin/upload-image", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.url) {
        onAddImage(data.url);
        toast({ title: "Upload Success", description: "Image has been uploaded and added." });
      } else {
        toast({ title: "Upload Failed", description: data.message || "Failed to upload image.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Upload Error", description: error.message || "Server error occurred.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex gap-2 w-full">
      <Input
        placeholder="Paste image URL…"
        value={newImageUrl}
        onChange={(e) => setNewImageUrl(e.target.value)}
        className="flex-1"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleUrlAdd();
        }}
      />
      <Button
        size="sm"
        disabled={!newImageUrl.trim() || isUploading}
        onClick={handleUrlAdd}
      >
        <ImagePlus className="h-4 w-4 mr-1" /> Add URL
      </Button>
      
      {/* Hidden file input */}
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />
      
      <Button 
        size="sm" 
        variant="secondary"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
        Upload
      </Button>
    </div>
  );
}
