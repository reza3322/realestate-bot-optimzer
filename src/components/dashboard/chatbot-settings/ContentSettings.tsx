
import { useChatbotSettings } from "./ChatbotSettingsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ContentSettings = () => {
  const { settings, setSettings } = useChatbotSettings();

  return (
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
  );
};

export default ContentSettings;
