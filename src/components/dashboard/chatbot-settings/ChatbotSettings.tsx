import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, BrainCircuit } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ChatbotTraining from "@/components/ui/chatbot/ChatbotTraining";
import AppearanceSettings from "./AppearanceSettings";
import ButtonSettings from "./ButtonSettings";
import ContentSettings from "./ContentSettings";
import TestChatbot from "./TestChatbot";
import InstallationSettings from "./InstallationSettings";
import ChatbotPreview from "./ChatbotPreview";
import { ChatbotSettingsProvider, useChatbotSettings } from "./ChatbotSettingsContext";

interface ChatbotSettingsProps {
  userId: string;
  userPlan: string;
  isPremiumFeature: (plan: string) => boolean;
}

const ChatbotSettingsContent = ({ userId, userPlan, isPremiumFeature }: ChatbotSettingsProps) => {
  const { settings, setSettings, loading, saving, setSaving } = useChatbotSettings();
  const [activeTab, setActiveTab] = useState<"customize" | "training">("customize");
  
  const saveSettings = async () => {
    setSaving(true);
    try {
      try {
        await supabase.rpc('create_chatbot_settings_table_if_not_exists');
      } catch (err) {
        console.log('RPC not available or failed, will try direct upsert', err);
      }
      
      const { error } = await supabase
        .from("chatbot_settings")
        .upsert({ 
          user_id: userId,
          settings,
          updated_at: new Date()
        });
      
      if (error) {
        throw error;
      }
      
      toast.success("Chatbot settings saved successfully");
    } catch (error) {
      console.error("Error saving chatbot settings:", error);
      toast.error("Error saving chatbot settings");
    } finally {
      setSaving(false);
    }
  };

  const generateEmbedCode = () => {
    const params = new URLSearchParams({
      user: userId,
      theme: settings.theme,
      variation: settings.variation,
      font: settings.fontFamily,
      position: settings.position,
      fontSize: settings.fontSize.toString(),
      botName: encodeURIComponent(settings.botName),
      welcomeMessage: encodeURIComponent(settings.welcomeMessage),
      placeholderText: encodeURIComponent(settings.placeholderText),
      primaryColor: encodeURIComponent(settings.primaryColor.replace('#', '')),
      botIcon: settings.botIcon,
      enabled: settings.enabled.toString(),
      buttonText: encodeURIComponent(settings.buttonText),
      buttonIcon: settings.buttonIcon,
      buttonSize: settings.buttonSize,
      buttonColor: encodeURIComponent(settings.buttonColor.replace('#', '')),
      buttonTextColor: encodeURIComponent(settings.buttonTextColor.replace('#', '')),
      buttonStyle: settings.buttonStyle,
      buttonPosition: settings.buttonPosition
    });
    
    const baseUrl = window.location.hostname.includes('localhost') 
      ? 'https://realhome.ai'
      : window.location.origin;
      
    return `<script src="${baseUrl}/chatbot.js?${params.toString()}"></script>`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h2 className="text-2xl font-bold">Chatbot Settings</h2>
          <p className="text-muted-foreground">
            Customize your website chatbot and get your embed code
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="enabled" className="text-sm">Enable Chatbot</Label>
          <Switch 
            id="enabled" 
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings({...settings, enabled: checked})}
          />
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "customize" | "training")} className="space-y-6">
        <TabsList>
          <TabsTrigger value="customize" className="flex-1">
            <Bot className="w-4 h-4 mr-2" />
            Customize Chatbot
          </TabsTrigger>
          <TabsTrigger value="training" className="flex-1">
            <BrainCircuit className="w-4 h-4 mr-2" />
            Train Your Chatbot
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="customize" className="space-y-0">
          <div className="grid md:grid-cols-5 gap-6">
            <div className="md:col-span-3 space-y-6">
              <AppearanceSettings />
              <ButtonSettings />
              <ContentSettings />
              <TestChatbot userId={userId} />
              <InstallationSettings 
                generateEmbedCode={generateEmbedCode} 
                saveSettings={saveSettings}
                saving={saving}
              />
            </div>
            
            <div className="md:col-span-2">
              <ChatbotPreview />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="training">
          <ChatbotTraining userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ChatbotSettings = (props: ChatbotSettingsProps) => {
  return (
    <ChatbotSettingsProvider userId={props.userId}>
      <ChatbotSettingsContent {...props} />
    </ChatbotSettingsProvider>
  );
};

export default ChatbotSettings;
