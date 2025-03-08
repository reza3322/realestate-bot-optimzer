
import { useState, useEffect } from 'react';
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
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  contentType: string;
  priority?: number;
  createdAt: Date;
}

const FileUpload = ({ userId, onUploadComplete }: FileUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState<string>("faqs");
  const [priority, setPriority] = useState<number>(5);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(true);
  const [isDeletingFile, setIsDeletingFile] = useState<string | null>(null);

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

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

  const processPdfContent = async (filePath: string, fileName: string, fileId: string, priority: number = 5) => {
    // Update file status to processing
    setUploadedFiles(prev => 
      prev.map(file => 
        file.id === fileId 
          ? { ...file, status: 'processing' as const } 
          : file
      )
    );

    try {
      const response = await supabase.functions.invoke('process-pdf-content', {
        body: {
          filePath,
          userId,
          contentType,
          fileName,
          priority
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to process file');
      }

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to process file');
      }

      // Update file status to completed
      setUploadedFiles(prev => 
        prev.map(file => 
          file.id === fileId 
            ? { ...file, status: 'completed' as const, priority } 
            : file
        )
      );

      if (fileName.toLowerCase().endsWith('.pdf')) {
        toast.success('File uploaded successfully. Note: PDF text extraction is limited. For best results, consider uploading text files.');
      } else {
        toast.success('File processed and content extracted successfully');
      }
      
    } catch (error) {
      console.error('Error processing file:', error);
      
      // Update file status to error
      setUploadedFiles(prev => 
        prev.map(file => 
          file.id === fileId 
            ? { ...file, status: 'error' as const, error: error.message } 
            : file
        )
      );
      
      toast.error(`Failed to process file: ${error.message}`);
    }
  };

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
      status: 'uploading',
      contentType,
      priority,
      createdAt: new Date()
    };
    
    setUploadedFiles(prev => [newFile, ...prev]);
    
    try {
      const { data, error } = await supabase
        .storage
        .from('chatbot_training_files')
        .upload(filePath, selectedFile);
      
      if (error) {
        throw error;
      }
      
      // Update file status to processing if it's a PDF or text file
      const updatedFile = { 
        ...newFile, 
        status: 'completed' as const 
      };
      
      setUploadedFiles(prev => 
        prev.map(file => 
          file.id === newFile.id 
            ? updatedFile
            : file
        )
      );
      
      toast.success('File uploaded successfully.');
      
      // If it's a PDF or text file, process its content
      if (selectedFile.type === 'application/pdf' || selectedFile.type === 'text/plain') {
        await processPdfContent(filePath, selectedFile.name, newFile.id, priority);
      }
      
      setSelectedFile(null);
      if (onUploadComplete) onUploadComplete(true);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      
      setUploadedFiles(prev => 
        prev.map(file => 
          file.id === newFile.id 
            ? { ...file, status: 'error' as const, error: error.message } 
            : file
        )
      );
      
      toast.error('Failed to upload file: ' + error.message);
      if (onUploadComplete) onUploadComplete(false);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (filePath: string, fileId: string) => {
    setIsDeletingFile(fileId);
    try {
      // First, try to delete from storage
      const { error: storageError } = await supabase
        .storage
        .from('chatbot_training_files')
        .remove([filePath]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        toast.error('Failed to delete file from storage');
      }

      // Then, try to delete related training data
      const { error: dbError } = await supabase
        .from('chatbot_training_data')
        .delete()
        .eq('user_id', userId)
        .ilike('question', `%${filePath.split('/').pop() || ''}%`);

      if (dbError) {
        console.error('Error deleting associated training data:', dbError);
        // Continue even if this fails, as the file itself was deleted
      }

      // Remove from local state
      setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
      toast.success('File deleted successfully');
      
      // Notify parent component that files have changed
      if (onUploadComplete) onUploadComplete(true);
    } catch (error) {
      console.error('Error in deleteFile:', error);
      toast.error('Failed to delete file');
    } finally {
      setIsDeletingFile(null);
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
      case 'processing':
        return <FileSearch className="h-4 w-4 animate-pulse text-blue-500" />;
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
      case 'processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return null;
    }
  };

  const processFile = async (file: UploadedFile) => {
    await processPdfContent(file.path, file.name, file.id, file.priority || 5);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Upload Training Files</CardTitle>
        <CardDescription>
          Upload PDF or text files to train your chatbot. Files will be processed and their content used for training.
          For best results, use text (.txt) files as PDF text extraction is limited.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={contentType}
                onValueChange={(value) => setContentType(value)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
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
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Priority: {priority}</span>
                <span className="text-xs text-muted-foreground">(Higher priority = more influence)</span>
              </div>
              <Slider 
                value={[priority]} 
                min={0} 
                max={10} 
                step={1} 
                onValueChange={(value) => setPriority(value[0])}
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={uploadFile} 
                disabled={!selectedFile || isUploading}
                className="w-full sm:w-auto"
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
          </div>
          
          <p className="text-xs text-muted-foreground">
            PDF and text files will be automatically processed and their content will be used to train your chatbot.
            The priority level determines how much weight this content gets when answering questions.
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
              <p className="text-sm mt-1">Upload files to train your chatbot</p>
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
                          {file.priority !== undefined && (
                            <Badge className="mt-1 text-xs" variant="secondary">Priority: {file.priority}</Badge>
                          )}
                          {file.error && (
                            <p className="text-xs text-red-600 mt-1 flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {file.error}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(file)}
                        {getStatusIcon(file.status)}
                        
                        <div className="flex gap-1">
                          {file.status === 'completed' && (file.type === 'application/pdf' || file.type === 'text/plain') && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => processFile(file)}
                              className="h-8 w-8 p-0"
                              title="Reprocess file content"
                            >
                              <FileSearch className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Delete file"
                              >
                                {isDeletingFile === file.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete File</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{file.name}"? This will also remove any training data extracted from this file.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteFile(file.path, file.id)} className="bg-red-500 hover:bg-red-600">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
      
      <CardFooter className="bg-muted/50 px-6 py-4 border-t flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle size={16} className="flex-shrink-0 mt-1 sm:mt-0" />
        <p>
          Uploaded files will be processed and their content will be used to train your chatbot.
          Higher priority files will have more influence on chatbot responses.
          For best results, use text (.txt) files rather than PDFs.
        </p>
      </CardFooter>
    </Card>
  );
};

export default FileUpload;
