// This file has errors with LanguageCode type. Let's define it and fix the chatbot settings

// Adding a type definition for LanguageCode at the top of the file
type LanguageCode = "en" | "es" | "fr" | "de" | "it" | "pt" | "nl" | "ja" | "ko" | "zh" | "ar" | "ru";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ColorPicker } from "@/components/ui/color-picker";
import { ListChecks, MessageCircle, MessageSquare, ShoppingBag, User, GraduationCap, Rocket, Heart, HelpCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

const formSchema = z.object({
  theme: z.string(),
  variation: z.string(),
  fontFamily: z.string(),
  fontSize: z.string(),
  position: z.string(),
  botName: z.string(),
  welcomeMessage: z.string(),
  placeholderText: z.string(),
  primaryColor: z.string(),
  botIcon: z.string(),
  enabled: z.boolean(),
  buttonText: z.string(),
  buttonIcon: z.string(),
  buttonSize: z.string(),
  buttonColor: z.string(),
  buttonTextColor: z.string(),
  buttonStyle: z.string(),
  buttonPosition: z.string(),
});

interface ChatbotSettingsProps {
  userId: string;
  userPlan?: string; // Add userPlan as an optional prop
  isPremiumFeature?: (requiredPlan: string) => boolean; // Add isPremiumFeature as an optional function
}

const ChatbotSettings = ({ userId, userPlan = 'starter', isPremiumFeature }: ChatbotSettingsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // When setting chatbotSettings state, make sure to include the language property
  const [chatbotSettings, setChatbotSettings] = useState({
    primaryColor: '#3b82f6',
    theme: 'default',
    variation: 'default',
    botIcon: 'message-circle',
    fontFamily: 'Inter',
    fontSize: 16,
    botName: 'RealHome Assistant',
    welcomeMessage: 'Hi there! How can I help you find your dream home today?',
    placeholderText: 'Type your message...',
    enabled: true,
    position: 'right',
    buttonText: 'Chat with us',
    buttonIcon: 'message-circle',
    buttonSize: 'medium',
    buttonColor: '#3b82f6',
    buttonTextColor: '#ffffff',
    buttonStyle: 'pill',
    buttonPosition: 'bottom-right',
    language: 'en' as LanguageCode
  });
  
  useEffect(() => {
    const fetchChatbotSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('chatbot_settings')
          .select('settings')
          .eq('user_id', userId)
          .single();
          
        if (error) {
          console.error('Error fetching chatbot settings:', error);
          toast.error('Failed to load chatbot settings');
        } else if (data && data.settings) {
          // Ensure language is included in the settings
          setChatbotSettings(prevSettings => ({
            ...prevSettings,
            ...data.settings,
            language: (data.settings.language || 'en') as LanguageCode
          }));
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId) {
      fetchChatbotSettings();
    }
  }, [userId]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      theme: chatbotSettings.theme,
      variation: chatbotSettings.variation,
      fontFamily: chatbotSettings.fontFamily,
      fontSize: chatbotSettings.fontSize.toString(),
      position: chatbotSettings.position,
      botName: chatbotSettings.botName,
      welcomeMessage: chatbotSettings.welcomeMessage,
      placeholderText: chatbotSettings.placeholderText,
      primaryColor: chatbotSettings.primaryColor,
      botIcon: chatbotSettings.botIcon,
      enabled: chatbotSettings.enabled,
      buttonText: chatbotSettings.buttonText,
      buttonIcon: chatbotSettings.buttonIcon,
      buttonSize: chatbotSettings.buttonSize,
      buttonColor: chatbotSettings.buttonColor,
      buttonTextColor: chatbotSettings.buttonTextColor,
      buttonStyle: chatbotSettings.buttonStyle,
      buttonPosition: chatbotSettings.buttonPosition,
    },
  });
  
  useEffect(() => {
    form.reset({
      theme: chatbotSettings.theme,
      variation: chatbotSettings.variation,
      fontFamily: chatbotSettings.fontFamily,
      fontSize: chatbotSettings.fontSize.toString(),
      position: chatbotSettings.position,
      botName: chatbotSettings.botName,
      welcomeMessage: chatbotSettings.welcomeMessage,
      placeholderText: chatbotSettings.placeholderText,
      primaryColor: chatbotSettings.primaryColor,
      botIcon: chatbotSettings.botIcon,
      enabled: chatbotSettings.enabled,
      buttonText: chatbotSettings.buttonText,
      buttonIcon: chatbotSettings.buttonIcon,
      buttonSize: chatbotSettings.buttonSize,
      buttonColor: chatbotSettings.buttonColor,
      buttonTextColor: chatbotSettings.buttonTextColor,
      buttonStyle: chatbotSettings.buttonStyle,
      buttonPosition: chatbotSettings.buttonPosition,
    });
  }, [chatbotSettings, form]);
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true);
    try {
      // Make sure when updating settings to include the language property
      const updatedSettings = {
        theme: values.theme,
        variation: values.variation,
        fontFamily: values.fontFamily,
        fontSize: parseInt(values.fontSize),
        position: values.position,
        botName: values.botName,
        welcomeMessage: values.welcomeMessage,
        placeholderText: values.placeholderText,
        primaryColor: values.primaryColor,
        botIcon: values.botIcon,
        enabled: values.enabled,
        buttonText: values.buttonText,
        buttonIcon: values.buttonIcon,
        buttonSize: values.buttonSize,
        buttonColor: values.buttonColor,
        buttonTextColor: values.buttonTextColor,
        buttonStyle: values.buttonStyle,
        buttonPosition: values.buttonPosition,
        language: chatbotSettings.language // Preserve existing language setting
      };
      
      const { data, error } = await supabase
        .from('chatbot_settings')
        .upsert(
          {
            user_id: userId,
            settings: updatedSettings,
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();
        
      if (error) {
        console.error('Error saving chatbot settings:', error);
        toast.error('Failed to save chatbot settings');
      } else {
        toast.success('Chatbot settings saved successfully');
        setChatbotSettings(prevSettings => ({
          ...prevSettings,
          ...updatedSettings
        }));
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleLanguageChange = async (language: LanguageCode) => {
    setChatbotSettings(prevSettings => ({
      ...prevSettings,
      language: language
    }));
    
    // Save the new language setting to the database
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .upsert(
          {
            user_id: userId,
            settings: {
              ...chatbotSettings,
              language: language
            },
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();
        
      if (error) {
        console.error('Error saving chatbot settings:', error);
        toast.error('Failed to save chatbot settings');
      } else {
        toast.success('Chatbot language saved successfully');
      }
    } catch (error) {
      console.error('Error updating language:', error);
      toast.error('Failed to update language');
    }
  };

  if (isLoading) {
    return <p>Loading chatbot settings...</p>;
  }
  
  const botIcons = [
    { value: 'message-circle', label: 'Message Circle', icon: <MessageCircle className="h-4 w-4 mr-2" /> },
    { value: 'message-square', label: 'Message Square', icon: <MessageSquare className="h-4 w-4 mr-2" /> },
    { value: 'shopping-bag', label: 'Shopping Bag', icon: <ShoppingBag className="h-4 w-4 mr-2" /> },
    { value: 'user', label: 'User', icon: <User className="h-4 w-4 mr-2" /> },
    { value: 'graduation-cap', label: 'Graduation Cap', icon: <GraduationCap className="h-4 w-4 mr-2" /> },
    { value: 'rocket', label: 'Rocket', icon: <Rocket className="h-4 w-4 mr-2" /> },
    { value: 'heart', label: 'Heart', icon: <Heart className="h-4 w-4 mr-2" /> },
    { value: 'help-circle', label: 'Help Circle', icon: <HelpCircle className="h-4 w-4 mr-2" /> },
    { value: 'list-checks', label: 'List Checks', icon: <ListChecks className="h-4 w-4 mr-2" /> },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chatbot Settings</CardTitle>
        <CardDescription>Customize your chatbot to match your brand</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Chatbot</FormLabel>
                      <FormDescription>
                        Turn the chatbot on or off
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a theme" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="modern">Modern</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose a theme for your chatbot
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="variation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variation</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a variation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="rounded">Rounded</SelectItem>
                        <SelectItem value="outline">Outline</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose a variation for your chatbot
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fontFamily"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Font Family</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a font" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Roboto">Roboto</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose a font family for your chatbot
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fontSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Font Size</FormLabel>
                    <FormControl>
                      <Slider
                        defaultValue={[parseInt(field.value)]}
                        max={24}
                        min={12}
                        step={1}
                        onValueChange={(value) => field.onChange(value[0].toString())}
                      />
                    </FormControl>
                    <FormDescription>
                      Choose a font size for your chatbot
                    </FormDescription>
                    <FormMessage />
                    <div className="text-sm text-muted-foreground mt-2">
                      Selected: {field.value}px
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chatbot Position</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose a position for your chatbot
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="botName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bot Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter bot name" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter a name for your chatbot
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="welcomeMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Welcome Message</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter welcome message" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter a welcome message for your chatbot
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="placeholderText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placeholder Text</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter placeholder text" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter a placeholder text for your chatbot
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Color</FormLabel>
                    <FormControl>
                      <ColorPicker value={field.value} onValueChange={field.onChange} />
                    </FormControl>
                    <FormDescription>
                      Choose a primary color for your chatbot
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="botIcon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bot Icon</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {botIcons.map((icon) => (
                          <SelectItem key={icon.value} value={icon.value}>
                            {icon.icon} {icon.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose an icon for your chatbot
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="buttonText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Button Text</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter button text" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter a text for your chatbot button
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="buttonIcon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Button Icon</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {botIcons.map((icon) => (
                          <SelectItem key={icon.value} value={icon.value}>
                            {icon.icon} {icon.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose an icon for your chatbot button
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="buttonSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Button Size</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose a size for your chatbot button
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="buttonColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Button Color</FormLabel>
                    <FormControl>
                      <ColorPicker value={field.value} onValueChange={field.onChange} />
                    </FormControl>
                    <FormDescription>
                      Choose a color for your chatbot button
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="buttonTextColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Button Text Color</FormLabel>
                    <FormControl>
                      <ColorPicker value={field.value} onValueChange={field.onChange} />
                    </FormControl>
                    <FormDescription>
                      Choose a text color for your chatbot button
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="buttonStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Button Style</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="pill">Pill</SelectItem>
                        <SelectItem value="outline">Outline</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose a style for your chatbot button
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="buttonPosition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Button Position</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="top-left">Top Left</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose a position for your chatbot button
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="col-span-2">
                <Label htmlFor="language">Language</Label>
                <Select value={chatbotSettings.language} onValueChange={(value) => handleLanguageChange(value as LanguageCode)}>
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="nl">Dutch</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="ko">Korean</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                    <SelectItem value="ru">Russian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ChatbotSettings;
