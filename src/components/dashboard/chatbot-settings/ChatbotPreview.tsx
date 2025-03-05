
import { useState } from "react";
import { useChatbotSettings } from "./ChatbotSettingsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Chatbot from "@/components/ui/chatbot/Chatbot";

const ChatbotPreview = () => {
  const { settings } = useChatbotSettings();
  const [previewTab, setPreviewTab] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className="sticky top-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <Tabs value={previewTab} onValueChange={(value) => setPreviewTab(value as "desktop" | "mobile")} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="desktop" className="flex-1">Desktop</TabsTrigger>
              <TabsTrigger value="mobile" className="flex-1">Mobile</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className={`bg-gray-100 dark:bg-gray-900 rounded-lg shadow-inner overflow-hidden flex items-center justify-center ${previewTab === "mobile" ? "h-[500px] w-[300px] mx-auto" : "h-[500px]"}`}>
            <Chatbot 
              theme={settings.theme as any}
              variation={settings.variation as any}
              fontStyle={settings.fontFamily as any}
              botName={settings.botName}
              welcomeMessage={settings.welcomeMessage}
              placeholderText={settings.placeholderText}
              primaryColor={settings.primaryColor}
              botIcon={settings.botIcon}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatbotPreview;
