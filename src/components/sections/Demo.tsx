
import { useState } from 'react';
import { GradientHeading } from '@/components/ui/gradient-heading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  Type, 
  Settings, 
  CircleUser,
  Bot,
  MessageCircle,
  Sliders
} from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

const Demo = () => {
  // Chat customization state
  const [theme, setTheme] = useState<'default' | 'modern' | 'minimal'>('modern');
  const [variation, setVariation] = useState<'default' | 'blue' | 'green' | 'purple'>('blue');
  const [fontStyle, setFontStyle] = useState<'default' | 'serif' | 'mono'>('default');
  const [useRealAPI, setUseRealAPI] = useState(true);
  const [buttonText, setButtonText] = useState("Chat with us");
  const [buttonColor, setButtonColor] = useState("#3b82f6");
  const [buttonSize, setButtonSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [buttonStyle, setButtonStyle] = useState<'rounded' | 'square' | 'pill'>('pill');

  // Prevent default form submission behavior
  const preventScroll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Button preview rendering
  const renderButtonPreview = () => {
    let sizeClass = "text-base";
    if (buttonSize === "small") sizeClass = "text-sm";
    if (buttonSize === "large") sizeClass = "text-lg";

    let styleClass = "rounded-md";
    if (buttonStyle === "square") styleClass = "rounded-none";
    if (buttonStyle === "pill") styleClass = "rounded-full";

    return (
      <div 
        className={`flex items-center gap-2 px-4 py-2 ${sizeClass} ${styleClass}`}
        style={{ backgroundColor: buttonColor, color: "#ffffff" }}
      >
        <MessageCircle className="w-4 h-4" />
        <span>{buttonText}</span>
      </div>
    );
  };

  // Get the button style object based on current settings
  const getButtonStyleObject = () => {
    return {
      backgroundColor: buttonColor,
      color: "#ffffff",
      borderRadius: buttonStyle === 'pill' ? '9999px' : 
                  buttonStyle === 'rounded' ? '0.375rem' : '0'
    };
  };

  return (
    <section id="demo" className="py-20 bg-secondary/50 relative">
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
            
            <Tabs defaultValue="appearance" className="w-full" onClick={preventScroll}>
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="appearance" className="flex-1">
                  <Palette className="w-4 h-4 mr-2" />
                  Style
                </TabsTrigger>
                <TabsTrigger value="typography" className="flex-1">
                  <Type className="w-4 h-4 mr-2" />
                  Typography
                </TabsTrigger>
                <TabsTrigger value="button" className="flex-1">
                  <Sliders className="w-4 h-4 mr-2" />
                  Button
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

                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="use-real-api" className="cursor-pointer">
                      Use Real AI (OpenAI API)
                    </Label>
                    <Switch 
                      id="use-real-api" 
                      checked={useRealAPI}
                      onCheckedChange={setUseRealAPI}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {useRealAPI 
                      ? "Powered by OpenAI GPT-4o. Real responses may take a moment." 
                      : "Using demo responses without API calls."}
                  </p>
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
              
              <TabsContent value="button" className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="buttonText">Button Text</Label>
                  <Input
                    id="buttonText"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="Chat with us"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="buttonColor">Button Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="buttonColor" 
                      type="color" 
                      value={buttonColor}
                      onChange={(e) => setButtonColor(e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input 
                      type="text" 
                      value={buttonColor}
                      onChange={(e) => setButtonColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>Button Size</Label>
                  <RadioGroup 
                    value={buttonSize} 
                    onValueChange={(value) => setButtonSize(value as any)}
                    className="flex gap-3"
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="small" id="size-small" />
                      <Label htmlFor="size-small" className="cursor-pointer text-sm">
                        Small
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="medium" id="size-medium" />
                      <Label htmlFor="size-medium" className="cursor-pointer">
                        Medium
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="large" id="size-large" />
                      <Label htmlFor="size-large" className="cursor-pointer text-lg">
                        Large
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-3">
                  <Label>Button Style</Label>
                  <RadioGroup 
                    value={buttonStyle} 
                    onValueChange={(value) => setButtonStyle(value as any)}
                    className="flex gap-3"
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="rounded" id="style-rounded" />
                      <Label htmlFor="style-rounded" className="cursor-pointer">
                        <div className="w-12 h-6 rounded-md bg-blue-500"></div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="square" id="style-square" />
                      <Label htmlFor="style-square" className="cursor-pointer">
                        <div className="w-12 h-6 bg-blue-500"></div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="pill" id="style-pill" />
                      <Label htmlFor="style-pill" className="cursor-pointer">
                        <div className="w-12 h-6 rounded-full bg-blue-500"></div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="pt-3 border-t border-border">
                  <div className="bg-muted p-4 rounded-lg flex items-center justify-between">
                    <div className="text-sm">Button Preview:</div>
                    {renderButtonPreview()}
                  </div>
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
          
          {/* Static chat preview mockup */}
          <div className="md:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4">
            <div className="h-full flex flex-col">
              <div className="p-3 bg-blue-500 text-white rounded-t-lg">
                <h3 className="font-medium">RealHome Assistant</h3>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="flex flex-col gap-3">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg max-w-[80%] self-start">
                    <p>👋 Hi there! I'm your RealHomeAI assistant. I can help you find properties, answer questions about listings, and even schedule viewings.</p>
                  </div>
                  
                  <div className="bg-blue-500 text-white p-3 rounded-lg max-w-[80%] self-end">
                    <p>Hi! I'm looking for a villa near the beach.</p>
                  </div>
                  
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg max-w-[80%] self-start">
                    <p>I'd be happy to help you find a beach villa! Here are some options from our database:</p>
                    <div className="mt-2">
                      <p className="font-medium">🏡 Beach Villa Serenity – €1,250,000</p>
                      <p>📍 Beachfront, Costa del Sol</p>
                      <p>✅ 4 Bedrooms, 3 Bathrooms, Private Pool</p>
                      <p className="text-blue-600 underline">View Listing</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-3 border-t flex gap-2">
                <input 
                  type="text" 
                  className="flex-1 p-2 rounded-full border" 
                  placeholder="Type your message..."
                  disabled
                />
                <button className="bg-blue-500 text-white p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Demo;
