
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import Chatbot from "./chatbot/Chatbot";

type ThemeVariant = "default" | "blue" | "green" | "purple";
type ChatTheme = "default" | "modern" | "minimal";

export default function ChatbotDemo() {
  const [open, setOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ChatTheme>("default");
  const [selectedVariant, setSelectedVariant] = useState<ThemeVariant>("default");
  const [fontSize, setFontSize] = useState(16);
  const [botName, setBotName] = useState("RealHomeAI");
  const [welcomeMessage, setWelcomeMessage] = useState("👋 Hi there! I'm your RealHomeAI assistant. How can I help you today?");

  const handleDemoClick = () => {
    setOpen(true);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Button onClick={handleDemoClick} size="lg">
        Try Chatbot Demo
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[800px] sm:h-[600px] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="grid sm:grid-cols-2 h-full">
            <div className="hidden sm:flex flex-col border-r p-6 overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Customize the Chatbot</DialogTitle>
                <DialogDescription>
                  Change the appearance and settings for the chatbot preview.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex flex-col gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={selectedTheme} onValueChange={(value: ChatTheme) => setSelectedTheme(value)}>
                    <SelectTrigger id="theme">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="variant">Variant</Label>
                  <Select value={selectedVariant} onValueChange={(value: ThemeVariant) => setSelectedVariant(value)}>
                    <SelectTrigger id="variant">
                      <SelectValue placeholder="Select variant" />
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
                  <Label htmlFor="fontSize">Font Size: {fontSize}px</Label>
                  <Slider 
                    id="fontSize"
                    min={12} 
                    max={20} 
                    step={1}
                    value={[fontSize]}
                    onValueChange={(values) => setFontSize(values[0])}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="botName">Bot Name</Label>
                  <input
                    id="botName"
                    className="w-full border rounded p-2"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="welcomeMessage">Welcome Message</Label>
                  <textarea
                    id="welcomeMessage"
                    className="w-full border rounded p-2"
                    rows={3}
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                  />
                </div>
              </div>
              
              <DialogFooter className="mt-auto pt-4">
                <Button onClick={() => setOpen(false)}>Close Preview</Button>
              </DialogFooter>
            </div>
            
            <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <Chatbot 
                theme={selectedTheme}
                variation={selectedVariant}
                botName={botName}
                welcomeMessage={welcomeMessage}
                fontSize={fontSize}
                userId="demo-user" // Added userId prop
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
