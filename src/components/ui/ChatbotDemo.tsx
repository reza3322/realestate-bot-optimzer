
import React, { useState } from 'react';
import Chatbot from '@/components/ui/chatbot/Chatbot';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getChatStyles } from '@/components/ui/chatbot/chatStyles';
import type { ChatStylesType, ChatTheme } from '@/components/ui/chatbot/types';

// Type for the theme options
type ThemeOption = "default" | "modern" | "minimal";
type VariationOption = "default" | "blue" | "green" | "purple";

const ChatbotDemo = () => {
  const [theme, setTheme] = useState<ThemeOption>('default');
  const [variation, setVariation] = useState<VariationOption>('default');
  const [fontStyle, setFontStyle] = useState('default');
  const [showCode, setShowCode] = useState(false);
  
  // Generate embed code for the selected theme/variation
  const generateEmbedCode = () => {
    return `<script src="https://realhome.ai/chatbot.js?theme=${theme}&variation=${variation}&font=${fontStyle}"></script>`;
  };
  
  // Convert the theme options to the actual chat styles
  const styles: ChatTheme = getChatStyles(theme, variation);
  
  // Convert the styles to the type expected by ChatMessage
  const chatStyles: ChatStylesType = {
    botBubble: styles.botBubble,
    userBubble: styles.userBubble,
    botIcon: styles.botIcon,
    userIcon: styles.userIcon,
    font: styles.font
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Tabs defaultValue="theme" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="theme" className="flex-1">Theme</TabsTrigger>
              <TabsTrigger value="font" className="flex-1">Font</TabsTrigger>
              <TabsTrigger value="code" className="flex-1">Embed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="theme" className="space-y-4 py-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Chat Theme</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant={theme === 'default' ? 'default' : 'outline'} 
                    onClick={() => setTheme('default')}
                    className="justify-start"
                  >
                    Default
                  </Button>
                  <Button 
                    variant={theme === 'modern' ? 'default' : 'outline'} 
                    onClick={() => setTheme('modern')}
                    className="justify-start"
                  >
                    Modern
                  </Button>
                  <Button 
                    variant={theme === 'minimal' ? 'default' : 'outline'} 
                    onClick={() => setTheme('minimal')}
                    className="justify-start"
                  >
                    Minimal
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Color Scheme</h3>
                <div className="grid grid-cols-4 gap-2">
                  <Button 
                    variant={variation === 'default' ? 'default' : 'outline'} 
                    onClick={() => setVariation('default')}
                    className="justify-start"
                  >
                    Default
                  </Button>
                  <Button 
                    variant={variation === 'blue' ? 'default' : 'outline'} 
                    onClick={() => setVariation('blue')}
                    className="justify-start"
                    className="bg-blue-500 text-white hover:bg-blue-600"
                  >
                    Blue
                  </Button>
                  <Button 
                    variant={variation === 'green' ? 'default' : 'outline'} 
                    onClick={() => setVariation('green')}
                    className="justify-start"
                    className="bg-green-500 text-white hover:bg-green-600"
                  >
                    Green
                  </Button>
                  <Button 
                    variant={variation === 'purple' ? 'default' : 'outline'} 
                    onClick={() => setVariation('purple')}
                    className="justify-start"
                    className="bg-purple-500 text-white hover:bg-purple-600"
                  >
                    Purple
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="font" className="space-y-4 py-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Font Style</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant={fontStyle === 'default' ? 'default' : 'outline'} 
                    onClick={() => setFontStyle('default')}
                    className="justify-start font-sans"
                  >
                    Sans Serif
                  </Button>
                  <Button 
                    variant={fontStyle === 'serif' ? 'default' : 'outline'} 
                    onClick={() => setFontStyle('serif')}
                    className="justify-start font-serif"
                  >
                    Serif
                  </Button>
                  <Button 
                    variant={fontStyle === 'mono' ? 'default' : 'outline'} 
                    onClick={() => setFontStyle('mono')}
                    className="justify-start font-mono"
                  >
                    Monospace
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="code" className="py-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Embed Code</h3>
                <p className="text-sm text-gray-500 mb-2">
                  Copy this code and place it in your website's HTML to add the chatbot.
                </p>
                <div className="relative">
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto">
                    <code>{generateEmbedCode()}</code>
                  </pre>
                  <Button 
                    size="sm" 
                    className="absolute top-2 right-2"
                    onClick={() => {
                      navigator.clipboard.writeText(generateEmbedCode());
                      alert('Copied to clipboard!');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="flex justify-center items-start">
          <Chatbot 
            theme={theme} 
            variation={variation} 
            fontStyle={fontStyle as any}
            maxHeight="500px"
            botName="RealHome Assistant"
            useRealAPI={false}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatbotDemo;
