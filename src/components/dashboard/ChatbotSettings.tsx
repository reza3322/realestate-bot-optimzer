
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Loader2, Check } from "lucide-react";
import { ColorPicker } from "@/components/ui/color-picker";

// Define the supported language codes
type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'nl' | 'ja' | 'zh' | 'ko';

export interface ChatbotSettings {
  primaryColor: string;
  theme: string;
  variation: string;
  botIcon: string;
  fontFamily: string;
  fontSize: number;
  botName: string;
  welcomeMessage: string;
  placeholderText: string;
  enabled: boolean;
  position: string;
  buttonText: string;
  buttonIcon: string;
  buttonSize: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonStyle: string;
  buttonPosition: string;
  language: LanguageCode;
}

export interface ChatbotSettingsProps {
  userId: string;
  userPlan: string;
  isPremiumFeature: (plan: string) => boolean;
}

const ChatbotSettings = ({ userId, userPlan, isPremiumFeature }: ChatbotSettingsProps) => {
  const [settings, setSettings] = useState<ChatbotSettings>({
    primaryColor: "#3b82f6",
    theme: "default",
    variation: "default",
    botIcon: "message-circle",
    fontFamily: "sans",
    fontSize: 16,
    botName: "RealHome Assistant",
    welcomeMessage: "Hi there! How can I help you find your dream property today?",
    placeholderText: "Type your message...",
    enabled: true,
    position: "right",
    buttonText: "Chat with us",
    buttonIcon: "message-circle",
    buttonSize: "medium",
    buttonColor: "#3b82f6",
    buttonTextColor: "#ffffff",
    buttonStyle: "pill",
    buttonPosition: "bottom-right",
    language: "en"
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [embedCode, setEmbedCode] = useState("");
  const [activeTab, setActiveTab] = useState("appearance");
  
  useEffect(() => {
    if (userId) {
      fetchSettings();
    }
  }, [userId]);
  
  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('settings')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        setSettings({ ...settings, ...data[0].settings });
      }
      
      await fetchEmbedCode();
      
    } catch (error) {
      console.error('Error fetching chatbot settings:', error);
      toast.error('Failed to load chatbot settings');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchEmbedCode = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_chatbot_script', {
        user_uuid: userId
      });
      
      if (error) {
        throw error;
      }
      
      setEmbedCode(data || "");
      
    } catch (error) {
      console.error('Error generating embed code:', error);
    }
  };
  
  const handleSettingChange = (key: keyof ChatbotSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value
    }));
  };
  
  const saveSettings = async () => {
    if (!userId) return;
    
    setIsSaving(true);
    
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .upsert({
          user_id: userId,
          settings: settings
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      toast.success('Chatbot settings saved successfully');
      await fetchEmbedCode();
      
    } catch (error) {
      console.error('Error saving chatbot settings:', error);
      toast.error('Failed to save chatbot settings');
    } finally {
      setIsSaving(false);
    }
  };
  
  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    toast.success('Embed code copied to clipboard');
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Chatbot Settings</h2>
        
        <div className="flex items-center gap-2">
          <Label htmlFor="enabled" className="mr-2">
            {settings.enabled ? "Enabled" : "Disabled"}
          </Label>
          <Switch
            id="enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => handleSettingChange('enabled', checked)}
          />
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="button">Chat Button</TabsTrigger>
          <TabsTrigger value="embed">Embed Code</TabsTrigger>
        </TabsList>
        
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how your chatbot looks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Theme Style</Label>
                  <Select 
                    value={settings.theme} 
                    onValueChange={(value) => handleSettingChange('theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Color Variation</Label>
                  <Select 
                    value={settings.variation} 
                    onValueChange={(value) => handleSettingChange('variation', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a color variation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <ColorPicker 
                    color={settings.primaryColor}
                    onChange={(color) => handleSettingChange('primaryColor', color)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select 
                    value={settings.fontFamily} 
                    onValueChange={(value) => handleSettingChange('fontFamily', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a font" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sans">Sans-serif</SelectItem>
                      <SelectItem value="serif">Serif</SelectItem>
                      <SelectItem value="mono">Monospace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Font Size: {settings.fontSize}px</Label>
                  <Slider 
                    min={12} 
                    max={20} 
                    step={1}
                    value={[settings.fontSize]}
                    onValueChange={(values) => handleSettingChange('fontSize', values[0])}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Chat Position</Label>
                  <Select 
                    value={settings.position} 
                    onValueChange={(value) => handleSettingChange('position', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Behavior</CardTitle>
              <CardDescription>
                Customize how your chatbot behaves
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="botName">Bot Name</Label>
                  <Input 
                    id="botName" 
                    value={settings.botName} 
                    onChange={(e) => handleSettingChange('botName', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="welcomeMessage">Welcome Message</Label>
                  <Textarea 
                    id="welcomeMessage" 
                    value={settings.welcomeMessage}
                    onChange={(e) => handleSettingChange('welcomeMessage', e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="placeholderText">Input Placeholder</Label>
                  <Input 
                    id="placeholderText" 
                    value={settings.placeholderText}
                    onChange={(e) => handleSettingChange('placeholderText', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select 
                    value={settings.language} 
                    onValueChange={(value: LanguageCode) => handleSettingChange('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="it">Italian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="button" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chat Button</CardTitle>
              <CardDescription>
                Customize the button that opens your chat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="buttonText">Button Text</Label>
                  <Input 
                    id="buttonText" 
                    value={settings.buttonText}
                    onChange={(e) => handleSettingChange('buttonText', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Button Size</Label>
                  <Select 
                    value={settings.buttonSize} 
                    onValueChange={(value) => handleSettingChange('buttonSize', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Button Color</Label>
                  <ColorPicker
                    color={settings.buttonColor}
                    onChange={(color) => handleSettingChange('buttonColor', color)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Button Text Color</Label>
                  <ColorPicker
                    color={settings.buttonTextColor}
                    onChange={(color) => handleSettingChange('buttonTextColor', color)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Button Style</Label>
                  <Select 
                    value={settings.buttonStyle} 
                    onValueChange={(value) => handleSettingChange('buttonStyle', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pill">Pill</SelectItem>
                      <SelectItem value="rounded">Rounded</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Button Position</Label>
                  <Select 
                    value={settings.buttonPosition} 
                    onValueChange={(value) => handleSettingChange('buttonPosition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="top-left">Top Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="embed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Embed Code</CardTitle>
              <CardDescription>
                Copy this code and paste it in your website's HTML
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md">
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                    {embedCode}
                  </pre>
                </div>
                <Button onClick={copyEmbedCode}>
                  Copy to Clipboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ChatbotSettings;
