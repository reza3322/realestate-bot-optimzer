
import { useState } from 'react';
import { GradientHeading } from '@/components/ui/gradient-heading';
import Chatbot from '@/components/ui/chatbot';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  Type, 
  Settings, 
  CircleUser,
  Bot,
  MessageCircle
} from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const Demo = () => {
  // Chat customization state
  const [theme, setTheme] = useState<'default' | 'modern' | 'minimal'>('modern');
  const [variation, setVariation] = useState<'default' | 'blue' | 'green' | 'purple'>('blue');
  const [fontStyle, setFontStyle] = useState<'default' | 'serif' | 'mono'>('default');

  return (
    <section id="demo" className="py-20 bg-secondary/50">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <GradientHeading size="lg" variant="secondary">
            See RealHomeAI in Action
          </GradientHeading>
          <p className="text-lg text-muted-foreground mt-4">
            Try our AI assistant to see how it can help you qualify leads, engage customers,
            and recommend properties. Customize the chat interface to match your brand.
          </p>
        </div>
        
        <div className="grid md:grid-cols-5 gap-8 max-w-5xl mx-auto">
          {/* Chat design tools */}
          <div className="md:col-span-2 bg-card rounded-xl shadow-sm p-6 border border-border">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-primary" />
              Chat Design Tools
            </h3>
            
            <Tabs defaultValue="appearance" className="w-full">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="appearance" className="flex-1">
                  <Palette className="w-4 h-4 mr-2" />
                  Style
                </TabsTrigger>
                <TabsTrigger value="typography" className="flex-1">
                  <Type className="w-4 h-4 mr-2" />
                  Typography
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="appearance" className="space-y-6">
                <div className="space-y-3">
                  <Label>Theme Style</Label>
                  <Select 
                    value={theme} 
                    onValueChange={(value) => setTheme(value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label>Color Scheme</Label>
                  <RadioGroup 
                    value={variation} 
                    onValueChange={(value) => setVariation(value as any)}
                    className="flex gap-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="default" id="default" />
                      <Label htmlFor="default" className="cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-primary"></div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="blue" id="blue" />
                      <Label htmlFor="blue" className="cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-blue-500"></div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="green" id="green" />
                      <Label htmlFor="green" className="cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-emerald-500"></div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="purple" id="purple" />
                      <Label htmlFor="purple" className="cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-purple-500"></div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </TabsContent>
              
              <TabsContent value="typography" className="space-y-6">
                <div className="space-y-3">
                  <Label>Font Style</Label>
                  <RadioGroup 
                    value={fontStyle} 
                    onValueChange={(value) => setFontStyle(value as any)}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="default" id="font-default" />
                      <Label htmlFor="font-default" className="font-sans cursor-pointer">
                        Default Sans (SF Pro)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="serif" id="font-serif" />
                      <Label htmlFor="font-serif" className="font-serif cursor-pointer">
                        Serif Font
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="mono" id="font-mono" />
                      <Label htmlFor="font-mono" className="font-mono cursor-pointer">
                        Monospace Font
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Customize RealHomeAI to match your branding. These settings would sync with your 
                account preferences when you sign up.
              </p>
            </div>
          </div>
          
          {/* Chat preview */}
          <div className="md:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4">
            <Chatbot 
              theme={theme}
              variation={variation}
              fontStyle={fontStyle}
              maxHeight="400px"
              welcomeMessage="👋 Hi there! I'm your RealHomeAI assistant. I can help you find properties, answer questions about listings, and even schedule viewings. Try asking me about available properties or how I can help with your real estate needs!"
              placeholderText="Type your message here..."
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Demo;
