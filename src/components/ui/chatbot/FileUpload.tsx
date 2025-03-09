
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Upload, Loader2, AlertCircle, FileText } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
  userId: string;
  onUploadComplete?: (success: boolean) => void;
}

const FileUpload = ({ userId, onUploadComplete }: FileUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [priority, setPriority] = useState<number>(5);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [fileStatus, setFileStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>("");

  const uploadFile = async () => {
    if (!selectedFile || !userId) {
      toast.error("Please select a file first");
      return;
    }

    setIsUploading(true);
    setStage("uploading");
    setFileStatus("Uploading file to storage...");
    setUploadProgress(10);
    setError("");

    const fileName = `${Date.now()}_${selectedFile.name}`;
    const filePath = `${userId}/${fileName}`;

    try {
      const { error: uploadError } = await supabase
        .storage
        .from("chatbot_training_files")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;
      
      setUploadProgress(50);
      setStage("processing");
      setFileStatus("Processing file content...");
      
      // For text files, we'll process directly
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const fileContent = event.target?.result as string;
          
          // Store text content directly in the database
          const { error: insertError } = await supabase
            .from("chatbot_training_files")
            .insert({
              user_id: userId,
              source_file: selectedFile.name,
              extracted_text: fileContent,
              category: "File Import",
              priority: priority,
              content_type: "text/plain",
              processing_status: "complete"
            });

          if (insertError) throw insertError;
          
          setUploadProgress(100);
          setStage("complete");
          setFileStatus("File processed successfully!");
          toast.success("File uploaded and processed successfully!");
          
          setSelectedFile(null);
          
          setTimeout(() => {
            setUploadProgress(0);
            setStage("");
          }, 3000);
          
          if (onUploadComplete) onUploadComplete(true);
        } catch (error: any) {
          console.error("Processing error:", error);
          setError(error.message || "Failed to process file");
          setStage("error");
          setUploadProgress(0);
          toast.error(`Failed to process file: ${error.message || "Unknown error"}`);
          if (onUploadComplete) onUploadComplete(false);
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setError("Failed to read file content");
        setStage("error");
        setUploadProgress(0);
        setIsUploading(false);
        toast.error("Failed to read file content");
        if (onUploadComplete) onUploadComplete(false);
      };

      reader.readAsText(selectedFile);
    } catch (error: any) {
      console.error("Upload error:", error);
      setError(error.message || "Unknown error occurred");
      toast.error(`Failed to upload file: ${error.message || "Unknown error"}`);
      setFileStatus("Upload failed. Please try again.");
      setStage("error");
      setUploadProgress(0);
      setIsUploading(false);
      if (onUploadComplete) onUploadComplete(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "text/plain") {
        setSelectedFile(file);
        setFileStatus("");
        setError("");
        setStage("");
        setUploadProgress(0);
      } else {
        toast.error("Only text files are supported at this time");
        e.target.value = "";
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload Training Files</CardTitle>
        <CardDescription>Upload text files (.txt) to train your chatbot</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload">Select Text File (.txt only)</Label>
          <Input 
            id="file-upload" 
            type="file" 
            accept=".txt" 
            onChange={handleFileChange} 
            disabled={isUploading}
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
            disabled={isUploading}
          />
        </div>

        {selectedFile && (
          <div className="text-sm">
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{selectedFile.name}</span> 
              <span className="text-muted-foreground">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
          </div>
        )}

        {(fileStatus || uploadProgress > 0) && (
          <div className="space-y-2">
            {uploadProgress > 0 && (
              <Progress value={uploadProgress} className="h-2" />
            )}
            <div className="text-sm text-muted-foreground">
              Status: {fileStatus}
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={uploadFile} 
          disabled={!selectedFile || isUploading} 
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              {stage === "uploading" ? "Uploading..." : 
               stage === "processing" ? "Processing..." : 
               "Uploading..."}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload & Process
            </>
          )}
        </Button>
        
        <div className="text-xs text-muted-foreground mt-2">
          <p>For best results:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Upload plain text (.txt) files only</li>
            <li>Ensure text is clearly formatted and readable</li>
            <li>Use multiple smaller files rather than one large file</li>
            <li>You can later edit uploaded content in the "Manage Content" tab</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;
