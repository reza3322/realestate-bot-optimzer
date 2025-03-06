
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import ChatbotTraining from '@/components/ui/chatbot/ChatbotTraining';

interface ChatbotTrainingManagerProps {
  userId: string;
  userPlan?: string;
  isPremiumFeature?: (requiredPlan: string) => boolean;
}

const ChatbotTrainingManager = ({ userId, userPlan = 'starter', isPremiumFeature }: ChatbotTrainingManagerProps) => {
  const [activeTab, setActiveTab] = useState<string>("training");
  
  // Function to check if a plan is allowed (fallback if isPremiumFeature is not provided)
  const checkPlanAccess = (requiredPlan: string): boolean => {
    if (isPremiumFeature) {
      return isPremiumFeature(requiredPlan);
    }
    
    // Simple fallback logic
    const planLevels = {
      'starter': 0,
      'professional': 1,
      'enterprise': 2
    };
    
    return (planLevels[userPlan as keyof typeof planLevels] ?? 0) >= 
           (planLevels[requiredPlan as keyof typeof planLevels] ?? 0);
  };

  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle>Train Your Chatbot</CardTitle>
        <CardDescription>
          Improve your chatbot's responses by providing training data and setting up custom behaviors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="training">Training Data</TabsTrigger>
            <TabsTrigger 
              value="advanced" 
              disabled={!checkPlanAccess('professional')}
              title={!checkPlanAccess('professional') ? "Requires Professional plan or higher" : ""}
            >
              Advanced Settings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="training">
            <ChatbotTraining userId={userId} />
          </TabsContent>
          
          <TabsContent value="advanced">
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-amber-50 text-amber-800 rounded-md">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">
                  Advanced training features are available on the Professional and Enterprise plans.
                </p>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <CardTitle className="text-lg mb-2">AI Behavior Control</CardTitle>
                  <p className="text-sm text-muted-foreground mb-4">
                    Adjust how your chatbot thinks and responds
                  </p>
                  <Button disabled={!checkPlanAccess('professional')}>Configure</Button>
                </Card>
                
                <Card className="p-4">
                  <CardTitle className="text-lg mb-2">Knowledge Integration</CardTitle>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect external data sources to your chatbot
                  </p>
                  <Button disabled={!checkPlanAccess('professional')}>Connect Sources</Button>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ChatbotTrainingManager;
