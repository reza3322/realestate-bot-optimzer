
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { FilePlus, FileText, Upload, Loader2, AlertCircle, CheckCircle2, FileX } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  contentType: string;
  createdAt: Date;
}

const FileUpload = ({ userId, onUploadComplete }: FileUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState<string>("faqs");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(true);

  const fetchUploadedFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const { data, error } = await supabase
        .storage
        .from('chatbot_training_files')
        .list(`${userId}`);
      
      if (error) {
        console.error('Error fetching uploaded files:', error);
        toast.error('Failed to load uploaded files');
      } else if (data) {
        const files: UploadedFile[] = data.map(item => ({
          id: item.id,
          name: item.name,
          path: `${userId}/${item.name}`,
          size: item.metadata?.size || 0,
          type: item.metadata?.mimetype || 'unknown',
          status: 'completed',
          contentType: 'unknown',
          createdAt: new Date(item.created_at)
        }));
        
        setUploadedFiles(files);
      }
    } catch (error) {
      console.error('Error in fetchUploadedFiles:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.type === 'text/plain') {
        setSelectedFile(file);
      } else {
        toast.error('Only PDF and text files are supported');
        e.target.value = '';
      }
    }
  };

  const uploadFile = async () => {
    if (!selectedFile || !userId) return;
    
    setIsUploading(true);
    
    const newFile: UploadedFile = {
      id: Date.now().toString(),
      name: selectedFile.name,
      path: `${userId}/${Date.now()}_${selectedFile.name}`,
      size: selectedFile.size,
      type: selectedFile.type,
      status: 'uploading',
      contentType,
      createdAt: new Date()
    };
    
    setUploadedFiles(prev => [newFile, ...prev]);
    
    try {
      const { data, error } = await supabase
        .storage
        .from('chatbot_training_files')
        .upload(newFile.path, selectedFile);
      
      if (error) {
        throw error;
      }
      
      setUploadedFiles(prev => 
        prev.map(file => 
          file.id === newFile.id 
            ? { ...file, status: 'completed' } 
            : file
        )
      );
      
      toast.success('File uploaded successfully.');
      
      setSelectedFile(null);
      if (onUploadComplete) onUploadComplete(true);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      
      setUploadedFiles(prev => 
        prev.map(file => 
          file.id === newFile.id 
            ? { ...file, status: 'error', error: error.message } 
            : file
        )
      );
      
      toast.error('Failed to upload file: ' + error.message);
      if (onUploadComplete) onUploadComplete(false);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (file: UploadedFile) => {
    if (file.type === 'application/pdf') return <FileText className="h-4 w-4" />;
    if (file.type === 'text/plain') return <FileText className="h-4 w-4" />;
    return <FilePlus className="h-4 w-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <FileX className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (file: UploadedFile) => {
    switch (file.status) {
      case 'uploading':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Uploading</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Upload Training Files</CardTitle>
        <CardDescription>
          Upload PDF or text files to be stored for reference. Note: Automatic content processing has been disabled.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select
              value={contentType}
              onValueChange={(value) => setContentType(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="faqs">FAQs</SelectItem>
                <SelectItem value="property">Property Details</SelectItem>
                <SelectItem value="business">Business Info</SelectItem>
                <SelectItem value="custom">Custom Content</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="relative flex-1">
              <Input
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileChange}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
              />
              <div className="border border-input rounded-md px-3 py-2 flex items-center justify-between h-10">
                <span className="text-sm text-muted-foreground overflow-hidden overflow-ellipsis whitespace-nowrap">
                  {selectedFile ? selectedFile.name : 'Choose a file...'}
                </span>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            <Button 
              onClick={uploadFile} 
              disabled={!selectedFile || isUploading}
              className="w-24"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Uploading</span>
                </>
              ) : (
                <span>Upload</span>
              )}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Files will be stored but not automatically processed. You'll need to manually add content to train your chatbot.
          </p>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Uploaded Files</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchUploadedFiles}
              disabled={isLoadingFiles}
              className="h-8"
            >
              {isLoadingFiles ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>Refresh</span>
              )}
            </Button>
          </div>
          
          {isLoadingFiles ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : uploadedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <FileText size={40} className="mb-2 opacity-20" />
              <p>No files uploaded yet</p>
              <p className="text-sm mt-1">Upload files for reference</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="border rounded-md p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file)}
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleString()}
                          </p>
                          {file.error && (
                            <p className="text-xs text-red-600 mt-1 flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {file.error}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center">
                        {getStatusBadge(file)}
                        <div className="ml-2">
                          {getStatusIcon(file.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="bg-muted/50 px-6 py-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle size={16} />
        <p>
          Files uploaded here are stored for reference only. To train your chatbot, use the manual entry feature
          to add specific questions and answers.
        </p>
      </CardFooter>
    </Card>
  );
};

export default FileUpload;
