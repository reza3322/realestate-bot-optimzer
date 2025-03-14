
import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, FilePlus, Upload, X } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export interface FileUploadProps {
  userId: string;
  onUploadComplete?: (success: boolean) => void;
}

const FileUpload = ({ userId, onUploadComplete }: FileUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      
      // Filter for accepted file types
      const acceptedFiles = filesArray.filter(file => {
        const fileType = file.type.toLowerCase();
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        
        if (fileType === 'application/pdf' || 
            fileType === 'text/plain' || 
            extension === 'pdf' || 
            extension === 'txt') {
          return true;
        }
        
        toast.error(`File type not supported: ${file.name}`);
        return false;
      });
      
      setFiles(acceptedFiles);
    }
  };

  const uploadFile = async (file: File) => {
    // Create a unique file path
    const timestamp = new Date().getTime();
    const filePath = `${userId}/${timestamp}_${file.name}`;

    try {
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chatbot_training_files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      console.log("File uploaded successfully:", uploadData);

      // Now process the file content
      const result = await supabase.functions.invoke('process-pdf-content', {
        body: {
          filePath: filePath,
          userId: userId,
          fileName: file.name,
          priority: 5 // Default priority
        }
      });

      if (!result.data.success) {
        throw new Error(result.data.error || 'Failed to process file content');
      }

      return true;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to upload ${file.name}: ${error.message || 'Unknown error'}`);
      return false;
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    setIsUploading(true);
    setProgress(0);

    let successCount = 0;
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const success = await uploadFile(files[i]);
      if (success) {
        successCount++;
      }
      setProgress(Math.round(((i + 1) / totalFiles) * 100));
    }

    setIsUploading(false);
    setFiles([]);
    resetFileInput();

    if (successCount > 0) {
      toast.success(
        successCount === totalFiles
          ? "All files uploaded successfully"
          : `${successCount} of ${totalFiles} files uploaded successfully`
      );
      if (onUploadComplete) {
        onUploadComplete(true);
      }
    } else {
      toast.error("Failed to upload any files");
      if (onUploadComplete) {
        onUploadComplete(false);
      }
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="file-upload">Upload PDF or Text Files</Label>
        <div className="mt-1 flex items-center gap-2">
          <Input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,application/pdf,text/plain"
            onChange={handleFileChange}
            disabled={isUploading}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <FilePlus className="mr-2 h-4 w-4" />
            Browse Files
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Upload PDF or text files to train your chatbot with your specific content.
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Files:</Label>
          <div className="border rounded-md p-2 space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-secondary/20 p-2 rounded"
              >
                <span className="text-sm truncate max-w-[240px]">
                  {file.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-secondary h-2 rounded-full">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || isUploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload {files.length > 0 ? `(${files.length})` : ""}
        </Button>
      </div>

      <Card className="mt-4 border-dashed border-muted">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Training Files</h4>
              <p className="text-sm text-muted-foreground">
                For best results, upload documents containing information about:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc pl-4">
                <li>Your business services and offerings</li>
                <li>Frequently asked questions</li>
                <li>Property details and descriptions</li>
                <li>Pricing information</li>
                <li>Process documents and guides</li>
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/20 text-xs text-muted-foreground">
          Supported file types: PDF, TXT
        </CardFooter>
      </Card>
    </div>
  );
};

export default FileUpload;
