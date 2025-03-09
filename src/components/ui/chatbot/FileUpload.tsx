
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Upload, Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface FileUploadProps {
  userId: string;
  onUploadComplete?: (success: boolean) => void;
}

const FileUpload = ({ userId, onUploadComplete }: FileUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [priority, setPriority] = useState<number>(5);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [fileStatus, setFileStatus] = useState<string>("");

  // ✅ Upload file to Supabase Storage
  const uploadFile = async () => {
    if (!selectedFile || !userId) {
      toast.error("Please select a file first");
      return;
    }

    setIsUploading(true);
    setFileStatus("Uploading file...");

    const fileName = `${Date.now()}_${selectedFile.name}`;
    const filePath = `${userId}/${fileName}`;

    try {
      // Step 1: Upload to storage
      const { error: uploadError } = await supabase
        .storage
        .from("chatbot_training_files")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;
      
      setFileStatus("Processing file content...");
      
      // Determine content type based on file extension
      let contentType = "application/octet-stream"; // Default
      if (selectedFile.name.toLowerCase().endsWith(".pdf")) {
        contentType = "application/pdf";
      } else if (selectedFile.name.toLowerCase().endsWith(".txt")) {
        contentType = "text/plain";
      } else {
        contentType = selectedFile.type || "application/octet-stream";
      }
      
      console.log("Content Type being sent:", contentType);
      
      // Step 2: Process the file content
      const { data, error: processError } = await supabase.functions.invoke("process-pdf-content", {
        body: {
          filePath,
          userId,
          fileName: selectedFile.name,
          priority,
          contentType: contentType // Explicitly passing content type
        },
      });

      if (processError || !data?.success) {
        throw new Error(processError?.message || data?.error || "Failed to process file");
      }

      setFileStatus("File processed successfully!");
      toast.success("File uploaded and processed successfully!");
      setSelectedFile(null);
      if (onUploadComplete) onUploadComplete(true);

    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Failed to upload file: ${error.message || "Unknown error"}`);
      setFileStatus("Upload failed. Please try again.");
      if (onUploadComplete) onUploadComplete(false);
    } finally {
      setIsUploading(false);
    }
  };

  // ✅ Handles file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf" || file.type === "text/plain") {
        setSelectedFile(file);
        setFileStatus("");
      } else {
        toast.error("Only PDF and text files are supported");
        e.target.value = "";
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload Training Files</CardTitle>
        <CardDescription>Upload PDF or text files to train your chatbot</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload">Select File (PDF or TXT)</Label>
          <Input 
            id="file-upload" 
            type="file" 
            accept=".pdf,.txt" 
            onChange={handleFileChange} 
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Priority Level ({priority})</Label>
            <span className="text-xs text-muted-foreground">Higher values = higher priority</span>
          </div>
          <Slider 
            value={[priority]} 
            min={0} 
            max={10} 
            step={1} 
            onValueChange={([v]) => setPriority(v)} 
          />
        </div>

        {selectedFile && (
          <div className="text-sm">
            Selected file: <span className="font-medium">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(1)} KB)
          </div>
        )}

        {fileStatus && (
          <div className="text-sm text-muted-foreground">
            Status: {fileStatus}
          </div>
        )}

        <Button 
          onClick={uploadFile} 
          disabled={!selectedFile || isUploading} 
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Processing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload & Process
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FileUpload;
