
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import { Moon, Sun, Smartphone, Monitor } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { chatStyles, ThemeVariant } from '@/components/ui/chatbot/chatStyles';
import Chatbot from '@/components/ui/chatbot/Chatbot';

export function ChatbotDemo({
  theme = 'light',
  variation = 'default',
  primaryColor = '#3b82f6',
  fontFamily = 'Inter',
  fontSize = 16,
  botName = 'RealHome Assistant',
  welcomeMessage = 'Hi there! How can I help you find your dream property today?',
  placeholderText = 'Type your message...',
  botIcon = 'message-circle',
}) {
  const [viewMode, setViewMode] = useState('desktop');
  const [colorMode, setColorMode] = useState(theme);

  const resolvedVariation = (variation as ThemeVariant) || 'default';
  const themeClass = chatStyles[colorMode][resolvedVariation].container;
  const fontClass = chatStyles[colorMode][resolvedVariation].font;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex justify-between mb-6">
        <Tabs defaultValue={viewMode} onValueChange={setViewMode}>
          <TabsList>
            <TabsTrigger value="desktop">
              <Monitor className="h-4 w-4 mr-2" />
              Desktop
            </TabsTrigger>
            <TabsTrigger value="mobile">
              <Smartphone className="h-4 w-4 mr-2" />
              Mobile
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex space-x-2">
          <Toggle
            pressed={colorMode === 'light'}
            onPressedChange={() => setColorMode('light')}
            aria-label="Toggle light mode"
          >
            <Sun className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={colorMode === 'dark'}
            onPressedChange={() => setColorMode('dark')}
            aria-label="Toggle dark mode"
          >
            <Moon className="h-4 w-4" />
          </Toggle>
        </div>
      </div>

      <div 
        className={twMerge(
          "border rounded-lg p-6",
          colorMode === 'dark' ? "bg-gray-900 border-gray-800" : "bg-gray-100 border-gray-200",
          viewMode === 'mobile' ? "max-w-[375px] mx-auto" : "w-full" 
        )}
      >
        <Card className={twMerge(
          "overflow-hidden",
          viewMode === 'mobile' ? "w-full" : "max-w-md mx-auto",
          colorMode === 'dark' ? "border-gray-800" : "border-gray-200",
        )}>
          <CardContent className="p-0">
            <div className={twMerge(
              "w-full",
              viewMode === 'mobile' ? "h-[550px]" : "h-[500px]",
            )}>
              <Chatbot
                theme={colorMode as 'light' | 'dark'}
                variation={resolvedVariation}
                primaryColor={primaryColor}
                fontFamily={fontFamily}
                fontSize={fontSize}
                botName={botName}
                welcomeMessage={welcomeMessage}
                placeholderText={placeholderText}
                botIcon={botIcon}
                demoMode={true}
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>The preview above shows how your chatbot will appear to visitors</p>
        </div>
      </div>
    </div>
  );
}

export default ChatbotDemo;
