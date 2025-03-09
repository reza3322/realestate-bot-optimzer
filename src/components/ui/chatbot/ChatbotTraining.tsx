
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { AlertCircle, FileText } from "lucide-react";
import FileUpload from "./FileUpload";
import WebsiteCrawler from "./WebsiteCrawler";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChatbotTrainingProps {
  userId: string;
  userPlan?: string;
  isPremiumFeature?: (requiredPlan: string) => boolean;
}

interface TrainingFile {
  id: string;
  source_file: string;
  category: string;
  priority: number;
  created_at: string;
}

const ChatbotTraining = ({ userId, userPlan, isPremiumFeature }: ChatbotTrainingProps) => {
  const [trainingFiles, setTrainingFiles] = useState<TrainingFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTrainingFiles();
  }, []);

  const fetchTrainingFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chatbot_training_files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setTrainingFiles(data || []);
    } catch (error) {
      console.error('Error fetching training files:', error);
      toast.error('Failed to load training files');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (success: boolean) => {
    if (success) {
      fetchTrainingFiles();
    }
  };

  const handleCrawlComplete = (success: boolean) => {
    if (success) {
      fetchTrainingFiles();
    }
  };

  const deleteFile = async (id: string) => {
    try {
      const { error } = await supabase
        .from('chatbot_training_files')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      setTrainingFiles(trainingFiles.filter(file => file.id !== id));
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const filteredFiles = trainingFiles.filter(file => 
    file.source_file.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (file.category && file.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Train Your Chatbot</CardTitle>
        <CardDescription>
          Upload documents or crawl your website to train your chatbot with your specific content.
          The system will automatically extract and use this content for better, more relevant responses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <Tabs defaultValue="upload">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload Files</TabsTrigger>
                <TabsTrigger value="crawl">Crawl Website</TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="pt-4">
                <FileUpload userId={userId} onUploadComplete={handleUploadComplete} />
              </TabsContent>
              <TabsContent value="crawl" className="pt-4">
                <WebsiteCrawler userId={userId} onCrawlComplete={handleCrawlComplete} />
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Training Content</h3>
              <Input 
                placeholder="Search content..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48"
              />
            </div>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <FileText size={40} className="mb-2 opacity-20" />
                <p>
                  {searchQuery 
                    ? 'No matching content found' 
                    : 'No training content added yet'}
                </p>
                <p className="text-sm mt-1">
                  {searchQuery 
                    ? 'Try a different search term'
                    : 'Upload files or crawl your website to help your chatbot provide better responses'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[450px] pr-4">
                <div className="space-y-3">
                  {filteredFiles.map((file) => (
                    <Card key={file.id} className="p-3 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-medium">{file.source_file}</p>
                          {file.category && (
                            <div className="flex items-center mt-1">
                              <Badge className="text-xs">
                                {file.category}
                              </Badge>
                              {file.priority > 0 && (
                                <Badge variant="outline" className="text-xs ml-2">
                                  Priority: {file.priority}
                                </Badge>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(file.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteFile(file.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4 bg-muted/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle size={16} />
          <p>
            Upload files or crawl your website to improve your chatbot's responses.
            For best results, provide high-quality, relevant content about your business and services.
          </p>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ChatbotTraining;
