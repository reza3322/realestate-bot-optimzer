import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Copy, Check, Code } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from '@/lib/supabase';
import { generateChatbotScript } from '@/lib/supabase';
import { toast } from 'sonner';
import { testChatbotResponse } from '@/components/ui/chatbot/responseHandlers';
import ChatbotDemo from '@/components/ui/ChatbotDemo';
import { ChatbotSettingsProps } from '@/components/ui/chatbot/types';

const ChatbotSettings = ({ userId, userPlan, isPremiumFeature }: ChatbotSettingsProps) => {
  const [settings, setSettings] = useState<any>(null);
  const [themeColor, setThemeColor] = useState<string>('#000000');
  const [primaryColor, setPrimaryColor] = useState<string>('#000000');
  const [secondaryColor, setSecondaryColor] = useState<string>('#000000');
  const [accentColor, setAccentColor] = useState<string>('#000000');
  const [fontSize, setFontSize] = useState<string>('16px');
  const [borderRadius, setBorderRadius] = useState<string>('8px');
  const [fontFamily, setFontFamily] = useState<string>('Arial, sans-serif');
  const [botName, setBotName] = useState<string>('RealHomeAI');
  const [welcomeMessage, setWelcomeMessage] = useState<string>("👋 Hi there! I'm your RealHomeAI assistant. How can I help you today?");
  const [showAvatar, setShowAvatar] = useState<boolean>(true);
  const [showTypingIndicator, setShowTypingIndicator] = useState<boolean>(true);
  const [customStyles, setCustomStyles] = useState<string>('');
  const [script, setScript] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('appearance');

  useEffect(() => {
    loadSettings();
    generateScript();
  }, [userId]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error) {
        console.error('Error loading settings:', error);
        return;
      }
      
      setSettings(data);
      
      setThemeColor(data?.settings?.themeColor || '#000000');
      setPrimaryColor(data?.settings?.primaryColor || '#000000');
      setSecondaryColor(data?.settings?.secondaryColor || '#000000');
      setAccentColor(data?.settings?.accentColor || '#000000');
      setFontSize(data?.settings?.fontSize || '16px');
      setBorderRadius(data?.settings?.borderRadius || '8px');
      setFontFamily(data?.settings?.fontFamily || 'Arial, sans-serif');
      setBotName(data?.settings?.botName || 'RealHomeAI');
      setWelcomeMessage(data?.settings?.welcomeMessage || "👋 Hi there! I'm your RealHomeAI assistant. How can I help you today?");
      setShowAvatar(data?.settings?.showAvatar !== false);
      setShowTypingIndicator(data?.settings?.showTypingIndicator !== false);
      setCustomStyles(data?.settings?.customStyles || '');
    } catch (error) {
      console.error('Error fetching chatbot settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const updates = {
        user_id: userId,
        settings: {
          themeColor,
          primaryColor,
          secondaryColor,
          accentColor,
          fontSize,
          borderRadius,
          fontFamily,
          botName,
          welcomeMessage,
          showAvatar,
          showTypingIndicator,
          customStyles
        }
      };
      
      const { error } = await supabase
        .from('chatbot_settings')
        .upsert(updates, { onConflict: 'user_id' });
        
      if (error) {
        console.error('Error saving settings:', error);
        toast.error('Failed to save settings');
        return;
      }
      
      toast.success('Settings saved successfully');
      loadSettings(); // Refresh settings
      generateScript(); // Regenerate script
    } catch (error) {
      console.error('Error updating chatbot settings:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const generateScript = async () => {
    setIsLoading(true);
    try {
      const { script: generatedScript, error } = await generateChatbotScript(userId);
      if (error) {
        console.error('Error generating script:', error);
        toast.error('Failed to generate script');
        return;
      }
      setScript(generatedScript);
    } catch (error) {
      console.error('Error generating chatbot script:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (script) {
      navigator.clipboard.writeText(script);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Chatbot Configuration</CardTitle>
        <CardDescription>
          Customize the appearance and behavior of your chatbot.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="appearance" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="behavior">Behavior</TabsTrigger>
          </TabsList>
          
          <TabsContent value="appearance" className="pt-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="themeColor">Theme Color</Label>
                <Popover>
                  <PopoverTrigger className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-between">
                    <span style={{ backgroundColor: themeColor, width: '20px', height: '20px', display: 'inline-block', borderRadius: '50%', marginRight: '8px' }}></span>
                    {themeColor}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2">
                    <HexColorPicker color={themeColor} onChange={setThemeColor} />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <Popover>
                    <PopoverTrigger className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-between">
                      <span style={{ backgroundColor: primaryColor, width: '20px', height: '20px', display: 'inline-block', borderRadius: '50%', marginRight: '8px' }}></span>
                      {primaryColor}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <HexColorPicker color={primaryColor} onChange={setPrimaryColor} />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <Popover>
                    <PopoverTrigger className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-between">
                      <span style={{ backgroundColor: secondaryColor, width: '20px', height: '20px', display: 'inline-block', borderRadius: '50%', marginRight: '8px' }}></span>
                      {secondaryColor}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <HexColorPicker color={secondaryColor} onChange={setSecondaryColor} />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <Popover>
                    <PopoverTrigger className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-between">
                      <span style={{ backgroundColor: accentColor, width: '20px', height: '20px', display: 'inline-block', borderRadius: '50%', marginRight: '8px' }}></span>
                      {accentColor}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <HexColorPicker color={accentColor} onChange={setAccentColor} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fontSize">Font Size</Label>
                  <Input
                    id="fontSize"
                    type="text"
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="borderRadius">Border Radius</Label>
                  <Input
                    id="borderRadius"
                    type="text"
                    value={borderRadius}
                    onChange={(e) => setBorderRadius(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="fontFamily">Font Family</Label>
                <Input
                  id="fontFamily"
                  type="text"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="customStyles">Custom Styles</Label>
                <Textarea
                  id="customStyles"
                  placeholder="Enter custom CSS styles"
                  value={customStyles}
                  onChange={(e) => setCustomStyles(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="behavior" className="pt-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="botName">Bot Name</Label>
                <Input
                  id="botName"
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="welcomeMessage">Welcome Message</Label>
                <Textarea
                  id="welcomeMessage"
                  placeholder="Enter a welcome message for your users"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="showAvatar" checked={showAvatar} onCheckedChange={setShowAvatar} />
                <Label htmlFor="showAvatar">Show Avatar</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="showTypingIndicator" checked={showTypingIndicator} onCheckedChange={setShowTypingIndicator} />
                <Label htmlFor="showTypingIndicator">Show Typing Indicator</Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <Button onClick={saveSettings}>Save Settings</Button>
        <ChatbotDemo />
      </CardFooter>
      
      <CardContent className="border-t px-6 py-4 bg-muted/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle size={16} />
          <p>
            Copy and paste the script below into your website to embed the chatbot.
          </p>
        </div>
        
        <div className="relative mt-4">
          <Button 
            variant="secondary" 
            size="sm" 
            className="absolute top-2 right-2"
            onClick={copyToClipboard}
            disabled={isLoading}
          >
            {isCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {isCopied ? "Copied!" : "Copy Script"}
          </Button>
          
          <Textarea
            readOnly
            value={script || 'Loading script...'}
            className="font-mono text-sm bg-muted/80 text-muted-foreground"
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatbotSettings;
