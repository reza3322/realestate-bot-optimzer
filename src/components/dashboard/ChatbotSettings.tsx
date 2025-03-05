
import { useState, useEffect } from "react";
import { supabase, generateChatbotScript, createChatbotSettingsTable } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Chatbot from "@/components/ui/chatbot/Chatbot";
import { MessageCircle, Bot, Headphones, MessageSquare, BrainCircuit } from "lucide-react";
import { testChatbotResponse } from "@/components/ui/chatbot/responseHandlers";
import ChatbotTraining from "@/components/ui/chatbot/ChatbotTraining";

interface ChatbotSettingsProps {
  userId: string;
  userPlan: string;
  isPremiumFeature: (plan: string) => boolean;
}

const CHATBOT_ICONS = [
  { value: "message-circle", label: "Message Circle", icon: MessageCircle },
  { value: "bot", label: "Bot", icon: Bot },
  { value: "headphones", label: "Support", icon: Headphones },
  { value: "message-square", label: "Message Square", icon: MessageSquare },
  { value: "brain", label: "AI Brain", icon: BrainCircuit },
];

const FONT_FAMILIES = [
  { value: "default", label: "Default (System UI)" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Monospace" },
  { value: "sans", label: "Sans-serif" },
  { value: "inter", label: "Inter" },
];

const THEMES = [
  { value: "default", label: "Default" },
  { value: "modern", label: "Modern" },
  { value: "minimal", label: "Minimal" },
];

const COLORS = [
  { value: "default", label: "Default Blue" },
  { value: "blue", label: "Sky Blue" },
  { value: "green", label: "Green" },
  { value: "purple", label: "Purple" },
];

const BUTTON_SIZES = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const ChatbotSettings = ({ userId, userPlan, isPremiumFeature }: ChatbotSettingsProps) => {
  const [activeTab, setActiveTab] = useState<"customize" | "training">("customize");
  const [settings, setSettings] = useState({
    primaryColor: "#3b82f6",
    theme: "default",
    variation: "default",
    botIcon: "message-circle",
    fontFamily: "default",
    fontSize: 16,
    botName: "RealHome Assistant",
    welcomeMessage: "Hi there! I'm your RealHome assistant. How can I help you today?",
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
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState<"desktop" | "mobile">("desktop");
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);

  useEffect(() => {
    const initChatbotSettings = async () => {
      try {
        console.log("Initializing chatbot settings table");
        const { success, error } = await createChatbotSettingsTable();
        
        if (!success) {
          console.error("Error initializing chatbot settings table:", error);
          toast.error("Failed to initialize settings. Please try again.");
        } else {
          console.log("Successfully initialized chatbot settings table");
        }
      } catch (err) {
        console.error("Exception initializing chatbot settings:", err);
        toast.error("Something went wrong. Please try again.");
      }
    };
    
    initChatbotSettings();
  }, []);

  useEffect(() => {
    const updateGeneratedScript = async () => {
      try {
        // First update with client-side script as a fallback
        const clientScript = generateClientSideScript();
        setGeneratedScript(clientScript);
        
        if (userId) {
          console.log("Generating script for user:", userId);
          const { script, error } = await generateChatbotScript(userId);
          
          if (!error && script) {
            console.log("Setting generated script:", script);
            setGeneratedScript(script);
          } else if (error) {
            console.error("Error generating script:", error);
            toast.error("Failed to generate embed script");
          }
        }
      } catch (err) {
        console.error("Error updating script:", err);
      }
    };
    
    updateGeneratedScript();
  }, [settings, userId]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!userId) {
        console.log("No userId provided, skipping settings fetch");
        return;
      }
      
      setLoading(true);
      try {
        // Ensure the chatbot_settings table exists
        await createChatbotSettingsTable();
        
        // Use proper format for Supabase query
        console.log(`Fetching settings for user ID: ${userId}`);
        const { data, error } = await supabase
          .from("chatbot_settings")
          .select("settings")
          .eq("user_id", userId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            console.log("No settings found for this user, using defaults");
          } else {
            console.error("Error fetching chatbot settings:", error);
            toast.error("Could not load your chatbot settings");
          }
        } else if (data && data.settings) {
          console.log("Loaded settings:", data.settings);
          setSettings(data.settings);
        } else {
          console.log("No settings found, using defaults");
        }
      } catch (error) {
        console.error("Exception fetching chatbot settings:", error);
        toast.error("Error loading chatbot settings");
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [userId]);

  const saveSettings = async () => {
    if (!userId) {
      toast.error("User ID is required to save settings");
      return;
    }
    
    setSaving(true);
    try {
      console.log(`Saving settings for user ID: ${userId}`);
      
      const { data, error } = await supabase
        .from("chatbot_settings")
        .upsert({ 
          user_id: userId,
          settings,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error("Error saving settings:", error);
        toast.error("Failed to save settings");
        throw error;
      }
      
      // Generate updated script
      const { script, error: scriptError } = await generateChatbotScript(userId);
      if (scriptError) {
        console.error("Error generating script:", scriptError);
        toast.error("Settings saved but failed to generate embed script");
      } else {
        setGeneratedScript(script);
        toast.success("Chatbot settings saved successfully");
      }
    } catch (error) {
      console.error("Exception saving chatbot settings:", error);
      toast.error("Error saving chatbot settings");
    } finally {
      setSaving(false);
    }
  };

  const generateClientSideScript = () => {
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

  const generateEmbedCode = () => {
    return generatedScript || generateClientSideScript();
  };

  const testChatbot = async () => {
    if (!testMessage.trim()) {
      toast.error("Please enter a test message");
      return;
    }

    setIsTesting(true);
    try {
      const { response, error } = await testChatbotResponse(testMessage, userId);
      
      if (error) {
        throw new Error(error);
      }

      setTestResponse(response);
      toast.success("Test message processed successfully");
    } catch (error) {
      console.error("Error testing chatbot:", error);
      toast.error(`Error testing chatbot: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
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
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize how your chatbot looks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <Select 
                        value={settings.theme} 
                        onValueChange={(value) => setSettings({...settings, theme: value})}
                      >
                        <SelectTrigger id="theme">
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                          {THEMES.map((theme) => (
                            <SelectItem key={theme.value} value={theme.value}>
                              {theme.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="color">Color Variation</Label>
                      <Select 
                        value={settings.variation} 
                        onValueChange={(value) => setSettings({...settings, variation: value})}
                      >
                        <SelectTrigger id="color">
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                        <SelectContent>
                          {COLORS.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              {color.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="primary-color" 
                          type="color" 
                          value={settings.primaryColor}
                          onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                          className="w-12 h-10 p-1"
                        />
                        <Input 
                          type="text" 
                          value={settings.primaryColor}
                          onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="botIcon">Chat Icon</Label>
                      <Select 
                        value={settings.botIcon} 
                        onValueChange={(value) => setSettings({...settings, botIcon: value})}
                      >
                        <SelectTrigger id="botIcon">
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                        <SelectContent>
                          {CHATBOT_ICONS.map((icon) => (
                            <SelectItem key={icon.value} value={icon.value} className="flex items-center">
                              <div className="flex items-center">
                                <icon.icon className="mr-2 h-4 w-4" />
                                {icon.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="fontFamily">Font Family</Label>
                      <Select 
                        value={settings.fontFamily} 
                        onValueChange={(value) => setSettings({...settings, fontFamily: value})}
                      >
                        <SelectTrigger id="fontFamily">
                          <SelectValue placeholder="Select font" />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_FAMILIES.map((font) => (
                            <SelectItem 
                              key={font.value} 
                              value={font.value} 
                              className={font.value === "serif" ? "font-serif" : 
                                         font.value === "mono" ? "font-mono" : 
                                         font.value === "sans" ? "font-sans" : 
                                         font.value === "inter" ? "font-sans" : ""}
                            >
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Select 
                        value={settings.position} 
                        onValueChange={(value) => setSettings({...settings, position: value})}
                      >
                        <SelectTrigger id="position">
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Bottom Left</SelectItem>
                          <SelectItem value="right">Bottom Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fontSize">Font Size: {settings.fontSize}px</Label>
                    <Slider 
                      id="fontSize"
                      min={12}
                      max={24}
                      step={1}
                      value={[settings.fontSize]}
                      onValueChange={(value) => setSettings({...settings, fontSize: value[0]})}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Chat Button</CardTitle>
                  <CardDescription>Customize the button that opens your chatbot</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="buttonText">Button Text</Label>
                      <Input 
                        id="buttonText" 
                        value={settings.buttonText}
                        onChange={(e) => setSettings({...settings, buttonText: e.target.value})}
                        placeholder="Chat with us"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="buttonIcon">Button Icon</Label>
                      <Select 
                        value={settings.buttonIcon} 
                        onValueChange={(value) => setSettings({...settings, buttonIcon: value})}
                      >
                        <SelectTrigger id="buttonIcon">
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                        <SelectContent>
                          {CHATBOT_ICONS.map((icon) => (
                            <SelectItem key={icon.value} value={icon.value} className="flex items-center">
                              <div className="flex items-center">
                                <icon.icon className="mr-2 h-4 w-4" />
                                {icon.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="buttonSize">Button Size</Label>
                      <Select 
                        value={settings.buttonSize} 
                        onValueChange={(value) => setSettings({...settings, buttonSize: value})}
                      >
                        <SelectTrigger id="buttonSize">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUTTON_SIZES.map((size) => (
                            <SelectItem key={size.value} value={size.value}>
                              {size.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="buttonStyle">Button Style</Label>
                      <Select 
                        value={settings.buttonStyle} 
                        onValueChange={(value) => setSettings({...settings, buttonStyle: value})}
                      >
                        <SelectTrigger id="buttonStyle">
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rounded">Rounded</SelectItem>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="pill">Pill</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="button-color">Button Color</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="button-color" 
                          type="color" 
                          value={settings.buttonColor}
                          onChange={(e) => setSettings({...settings, buttonColor: e.target.value})}
                          className="w-12 h-10 p-1"
                        />
                        <Input 
                          type="text" 
                          value={settings.buttonColor}
                          onChange={(e) => setSettings({...settings, buttonColor: e.target.value})}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="button-text-color">Button Text Color</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="button-text-color" 
                          type="color" 
                          value={settings.buttonTextColor}
                          onChange={(e) => setSettings({...settings, buttonTextColor: e.target.value})}
                          className="w-12 h-10 p-1"
                        />
                        <Input 
                          type="text" 
                          value={settings.buttonTextColor}
                          onChange={(e) => setSettings({...settings, buttonTextColor: e.target.value})}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="buttonPosition">Button Position</Label>
                      <Select 
                        value={settings.buttonPosition} 
                        onValueChange={(value) => setSettings({...settings, buttonPosition: value})}
                      >
                        <SelectTrigger id="buttonPosition">
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                          <SelectItem value="bottom-left">Bottom Left</SelectItem>
                          <SelectItem value="bottom-center">Bottom Center</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>Button Preview:</div>
                        <div 
                          className={`
                            flex items-center gap-2 px-4 py-2
                            ${settings.buttonStyle === 'rounded' ? 'rounded-md' : 
                              settings.buttonStyle === 'pill' ? 'rounded-full' : 'rounded-none'}
                            ${settings.buttonSize === 'small' ? 'text-sm' : 
                              settings.buttonSize === 'large' ? 'text-lg' : 'text-base'}
                          `} 
                          style={{ 
                            backgroundColor: settings.buttonColor,
                            color: settings.buttonTextColor
                          }}
                        >
                          {(() => {
                            const IconComponent = CHATBOT_ICONS.find(icon => icon.value === settings.buttonIcon)?.icon;
                            return IconComponent && <IconComponent className="w-4 h-4" />;
                          })()}
                          <span>{settings.buttonText}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Content</CardTitle>
                  <CardDescription>Customize what your chatbot says</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="botName">Chatbot Name</Label>
                    <Input 
                      id="botName" 
                      value={settings.botName}
                      onChange={(e) => setSettings({...settings, botName: e.target.value})}
                      placeholder="e.g. Property Assistant"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="welcomeMessage">Welcome Message</Label>
                    <Textarea 
                      id="welcomeMessage" 
                      value={settings.welcomeMessage}
                      onChange={(e) => setSettings({...settings, welcomeMessage: e.target.value})}
                      placeholder="Hi there! How can I help you today?"
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="placeholderText">Input Placeholder</Label>
                    <Input 
                      id="placeholderText" 
                      value={settings.placeholderText}
                      onChange={(e) => setSettings({...settings, placeholderText: e.target.value})}
                      placeholder="Type your message..."
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Test Chatbot</CardTitle>
                  <CardDescription>Send a test message to verify the OpenAI API integration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="testMessage">Test Message</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="testMessage" 
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        placeholder="Enter a test message..."
                        className="flex-1"
                      />
                      <Button 
                        onClick={testChatbot} 
                        disabled={isTesting}
                      >
                        {isTesting ? "Testing..." : "Send Test"}
                      </Button>
                    </div>
                  </div>
                  
                  {testResponse && (
                    <div className="space-y-2">
                      <Label htmlFor="testResponse">Response</Label>
                      <div className="border rounded-md p-4 bg-secondary/20">
                        <p>{testResponse}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Installation</CardTitle>
                  <CardDescription>Copy this code to embed the chatbot on your website</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="embedCode">Embed Code</Label>
                    <div className="relative">
                      <Textarea 
                        id="embedCode" 
                        value={generateEmbedCode()}
                        readOnly
                        className="font-mono text-sm h-24 pr-20"
                      />
                      <Button
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          navigator.clipboard.writeText(generateEmbedCode());
                          toast.success("Embed code copied to clipboard");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button onClick={saveSettings} disabled={saving}>
                    {saving ? "Saving..." : "Save Settings"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="md:col-span-2">
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
                        botIconName={settings.botIcon}
                        primaryColor={settings.primaryColor}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
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

export default ChatbotSettings;
