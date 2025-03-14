
import { useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/lib/supabase';

interface FileUploadProps {
  userId: string;
  onFileProcessed?: () => void;
}

const FileUpload = ({ userId, onFileProcessed }: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [priority, setPriority] = useState("3");
  const [category, setCategory] = useState("File Import");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Check for valid file types
      const validTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/html',
        'text/markdown'
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Invalid file type. Please upload a PDF, Word document, or text file.');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const uploadAndProcessFile = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setProcessingStatus('Uploading file...');
    
    try {
      // Upload file to Supabase Storage
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `${userId}/${fileName}`;
      
      // Upload to the 'chatbot_training_files' bucket
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('chatbot_training_files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        toast.error(`Failed to upload file: ${uploadError.message}`);
        setIsUploading(false);
        return;
      }
      
      setUploadProgress(50);
      setProcessingStatus('Processing file content...');
      
      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('chatbot_training_files')
        .getPublicUrl(filePath);
      
      // Process the file content using the edge function
      const { data: processResult, error: processError } = await supabase.functions.invoke('process-pdf-content', {
        body: {
          filePath,
          userId,
          fileName: file.name,
          priority: parseInt(priority),
          contentType: file.type
        }
      });
      
      if (processError) {
        console.error('Error processing file:', processError);
        toast.error(`Failed to process file: ${processError.message}`);
        setIsUploading(false);
        return;
      }
      
      setUploadProgress(100);
      setProcessingStatus('File processed successfully!');
      
      toast.success('File uploaded and processed successfully!');
      
      // Reset form
      setFile(null);
      setPriority("3");
      setCategory("File Import");
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Trigger refresh callback
      if (onFileProcessed) {
        onFileProcessed();
      }
    } catch (error) {
      console.error('Exception uploading/processing file:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsUploading(false);
      setProcessingStatus(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Training Document</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Upload PDF, Word documents, or text files to train your chatbot.
              The content will be extracted and used to answer user questions.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select Document</Label>
            <Input 
              id="file-upload" 
              type="file" 
              accept=".pdf,.doc,.docx,.txt,.md,.html"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={category} 
                onValueChange={setCategory}
                disabled={isUploading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="File Import">File Import</SelectItem>
                  <SelectItem value="Properties">Properties</SelectItem>
                  <SelectItem value="Services">Services</SelectItem>
                  <SelectItem value="Documentation">Documentation</SelectItem>
                  <SelectItem value="Knowledge Base">Knowledge Base</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={priority} 
                onValueChange={setPriority}
                disabled={isUploading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Low (1)</SelectItem>
                  <SelectItem value="2">Medium-Low (2)</SelectItem>
                  <SelectItem value="3">Medium (3)</SelectItem>
                  <SelectItem value="4">Medium-High (4)</SelectItem>
                  <SelectItem value="5">High (5)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-muted-foreground">{processingStatus}</p>
            </div>
          )}
          
          <Button 
            className="w-full"
            onClick={uploadAndProcessFile}
            disabled={!file || isUploading}
          >
            {isUploading ? (
              'Processing...'
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                {file ? 'Upload and Process Document' : 'Select a Document First'}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;
