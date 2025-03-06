import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import ChatbotDemo from "@/components/ui/ChatbotDemo";
import { LanguageCode } from "@/components/ui/chatbot/types";  // Add this import

interface ChatbotSettingsProps {
  userId: string;
  userPlan: string;
  isPremiumFeature: (plan: string) => boolean;
}

const ChatbotSettings = ({ userId, userPlan, isPremiumFeature }: ChatbotSettingsProps) => {
  const [settings, setSettings] = useState({
    enabled: false,
    botName: 'RealHomeAI Assistant',
    primaryColor: '#007BFF',
    language: 'en' as LanguageCode
  });
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    fetchSettings();
  }, [userId]);
  
  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error) {
        // If no settings exist, that's okay, we'll use the defaults
        if (error.code !== 'PGRST116') {
          console.error('Error fetching chatbot settings:', error);
          toast.error('Failed to load chatbot settings');
        }
      } else {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching chatbot settings:', error);
      toast.error('Failed to load chatbot settings');
    } finally {
      setIsLoading(false);
    }
  };
  
  const saveSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .upsert({
          user_id: userId,
          ...settings
        }, { onConflict: 'user_id' })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      toast.success('Chatbot settings saved successfully');
    } catch (error) {
      console.error('Error saving chatbot settings:', error);
      toast.error('Failed to save chatbot settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (setting: string, value: any) => {
    setSettings({
      ...settings,
      [setting]: value
    });
  };
  
  const themeStyles = {
    botBubble: 'bg-muted',
    userBubble: 'bg-primary/10 text-primary-foreground',
    botIcon: 'bg-primary text-primary-foreground',
    userIcon: 'bg-secondary text-secondary-foreground',
    font: 'font-sans'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Chatbot Settings</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Chatbot Configuration</CardTitle>
          <CardDescription>
            Customize your chatbot to match your brand
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">Enable Chatbot</Label>
            <Switch 
              id="enabled" 
              checked={settings.enabled}
              onCheckedChange={(checked) => handleSettingChange('enabled', checked)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="botName">Bot Name</Label>
            <Input 
              id="botName" 
              placeholder="e.g. RealEstateAI Assistant" 
              value={settings.botName}
              onChange={(e) => handleSettingChange('botName', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <Input 
              id="primaryColor" 
              type="color"
              value={settings.primaryColor}
              onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={settings.language} onValueChange={(value) => handleSettingChange('language', value as LanguageCode)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <Button onClick={saveSettings} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Chatbot Preview</CardTitle>
          <CardDescription>
            See how your chatbot will look
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChatbotDemo 
            styles={themeStyles} 
            botName={settings.botName}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatbotSettings;
