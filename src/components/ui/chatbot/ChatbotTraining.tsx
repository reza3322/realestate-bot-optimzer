
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import FileUpload from "./FileUpload";
import WebsiteCrawler from "./WebsiteCrawler";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TrainingContentManager from "./TrainingContentManager";

interface ChatbotTrainingProps {
  userId: string;
  userPlan?: string;
  isPremiumFeature?: (requiredPlan: string) => boolean;
}

const ChatbotTraining = ({ userId, userPlan = "starter", isPremiumFeature }: ChatbotTrainingProps) => {
  const [activeTab, setActiveTab] = useState("upload");
  const [contentUpdated, setContentUpdated] = useState(false);

  const handleUploadComplete = (success: boolean) => {
    if (success) {
      setContentUpdated(prev => !prev);
    }
  };

  const handleCrawlComplete = (success: boolean) => {
    if (success) {
      setContentUpdated(prev => !prev);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Train Your Chatbot</CardTitle>
        <CardDescription>
          Upload text files, add Q&A pairs, or crawl your website to train your chatbot with your specific content.
          The system will automatically extract and use this content for better, more relevant responses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload Files</TabsTrigger>
            <TabsTrigger value="crawl">Crawl Website</TabsTrigger>
            <TabsTrigger value="manage">Manage Content</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="pt-4">
            <FileUpload 
              userId={userId} 
              onUploadComplete={handleUploadComplete} 
            />
          </TabsContent>
          
          <TabsContent value="crawl" className="pt-4">
            <WebsiteCrawler 
              userId={userId} 
              userPlan={userPlan}
              onCrawlComplete={handleCrawlComplete} 
            />
          </TabsContent>
          
          <TabsContent value="manage" className="pt-4">
            <TrainingContentManager 
              userId={userId}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t px-6 py-4 bg-muted/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle size={16} />
          <p>
            Train your chatbot by adding content in various ways. You can upload text files, create Q&A pairs, 
            or crawl your website to improve your chatbot's responses.
            For best results, provide high-quality, relevant content about your business and services.
            {userPlan !== "starter" && " With your premium plan, you can train with more content!"}
          </p>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ChatbotTraining;
