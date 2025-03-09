import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { FilePlus, FileText, Upload, Loader2, AlertCircle, CheckCircle2, FileX, FileSearch, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface FileUploadProps {
  userId: string;
  onUploadComplete?: (success: boolean) => void;
}

interface UploadedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  status: "uploading" | "processing" | "completed" | "error";
  error?: string;
  contentType: string;
  priority?: number;
  createdAt: Date;
}

const FileUpload = ({ userId, onUploadComplete }: FileUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [priority, setPriority] = useState<number>(5);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(true);
  const [isDeletingFile, setIsDeletingFile] = useState<string | null>(null);

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  // ✅ Fetch files from chatbot_training_files
  const fetchUploadedFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const { data, error } = await supabase
        .storage
        .from("chatbot_training_files")
        .list(`${userId}`);

      if (error) {
        console.error("Error fetching uploaded files:", error);
        toast.error("Failed to load uploaded files");
      } else if (data) {
        const files: UploadedFile[] = data.map((item) => ({
          id: item.id,
          name: item.name,
          path: `${userId}/${item.name}`,
          size: item.metadata?.size || 0,
          type: item.metadata?.mimetype || "unknown",
          status: "completed",
          contentType: "file",
          createdAt: new Date(item.created_at),
        }));

        setUploadedFiles(files);
      }
    } catch (error) {
      console.error("Error in fetchUploadedFiles:", error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // ✅ Handles file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf" || file.type === "text/plain") {
        setSelectedFile(file);
      } else {
        toast.error("Only PDF and text files are supported");
        e.target.value = "";
      }
    }
  };

  // ✅ Processes the uploaded file (calls Edge Function)
  const processPdfContent = async (filePath: string, fileName: string, fileId: string, priority: number = 5) => {
    setUploadedFiles((prev) =>
      prev.map((file) =>
        file.id === fileId ? { ...file, status: "processing" } : file
      )
    );

    try {
      console.log(`Processing file ${fileName} with path ${filePath}`);

      const response = await supabase.functions.invoke("process-pdf-content", {
        body: {
          filePath,
          userId,
          fileName,
          priority,
        },
      });

      console.log("✅ Edge Function Response:", response);

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Failed to process file");
      }

      setUploadedFiles((prev) =>
        prev.map((file) =>
          file.id === fileId
            ? { ...file, status: "completed", priority }
            : file
        )
      );
      toast.success("File processed and stored in chatbot_training_files!");

    } catch (error) {
      console.error("Error processing file:", error);

      setUploadedFiles((prev) =>
        prev.map((file) =>
          file.id === fileId
            ? { ...file, status: "error", error: error.message }
            : file
        )
      );
      toast.error(`Failed to process file: ${error.message || "Unknown error"}`);
    }
  };

  // ✅ Upload file to Supabase Storage
  const uploadFile = async () => {
    if (!selectedFile || !userId) return;

    setIsUploading(true);

    const fileName = `${Date.now()}_${selectedFile.name}`;
    const filePath = `${userId}/${fileName}`;

    const newFile: UploadedFile = {
      id: Date.now().toString(),
      name: selectedFile.name,
      path: filePath,
      size: selectedFile.size,
      type: selectedFile.type,
      status: "uploading",
      contentType: "file",
      priority,
      createdAt: new Date(),
    };

    setUploadedFiles((prev) => [newFile, ...prev]);

    try {
      const { error } = await supabase
        .storage
        .from("chatbot_training_files") // ✅ Correct Storage Bucket
        .upload(filePath, selectedFile);

      if (error) throw error;

      setUploadedFiles((prev) =>
        prev.map((file) =>
          file.id === newFile.id ? { ...file, status: "completed" } : file
        )
      );
      toast.success("File uploaded successfully.");

      await processPdfContent(filePath, selectedFile.name, newFile.id, priority);

      setSelectedFile(null);
      if (onUploadComplete) onUploadComplete(true);

    } catch (error) {
      setUploadedFiles((prev) =>
        prev.map((file) =>
          file.id === newFile.id ? { ...file, status: "error", error: error.message } : file
        )
      );
      toast.error("Failed to upload file: " + error.message);
      if (onUploadComplete) onUploadComplete(false);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Upload Training Files</CardTitle>
        <CardDescription>Upload PDF or text files to train your chatbot.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Input type="file" accept=".pdf,.txt" onChange={handleFileChange} />
        <Slider value={[priority]} min={0} max={10} step={1} onValueChange={([v]) => setPriority(v)} />

        <Button onClick={uploadFile} disabled={!selectedFile || isUploading}>
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Upload
        </Button>

        <ScrollArea className="mt-6 h-[200px]">
          {uploadedFiles.map((file) => (
            <div key={file.id} className="p-2 border rounded-md flex items-center justify-between">
              <span>{file.name}</span>
              {file.status === "completed" ? <CheckCircle2 className="text-green-500" /> : <FileSearch className="text-blue-500" />}
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default FileUpload;
