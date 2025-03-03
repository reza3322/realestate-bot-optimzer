
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ChatbotDemo from '@/components/ui/ChatbotDemo';
import { Bot, Palette, Settings, Type, ColorSwatch } from 'lucide-react';

const Demo = () => {
  return (
    <section id="how-it-works" className="py-20 bg-secondary/20">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">See It In Action</h2>
          <p className="text-lg text-muted-foreground">
            Experience how RealHomeAI engages with leads and automates your workflow.
            Fully customizable to match your brand's unique identity.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="w-full lg:w-1/2 order-2 lg:order-1">
            <Tabs defaultValue="theme-default" className="w-full">
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <h3 className="text-sm font-medium mb-2">Theme Style</h3>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="theme-default" className="flex items-center gap-2 text-xs">
                      <Bot className="h-3 w-3" />
                      <span>Default</span>
                    </TabsTrigger>
                    <TabsTrigger value="theme-modern" className="flex items-center gap-2 text-xs">
                      <Palette className="h-3 w-3" />
                      <span>Modern</span>
                    </TabsTrigger>
                    <TabsTrigger value="theme-minimal" className="flex items-center gap-2 text-xs">
                      <Settings className="h-3 w-3" />
                      <span>Minimal</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Color Scheme</h3>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="color-default" className="flex items-center gap-2 text-xs">
                      <ColorSwatch className="h-3 w-3" />
                      <span>Default</span>
                    </TabsTrigger>
                    <TabsTrigger value="color-green" className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <span>Green</span>
                    </TabsTrigger>
                    <TabsTrigger value="color-purple" className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span>Purple</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Typography</h3>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="font-default" className="flex items-center gap-2 text-xs">
                      <Type className="h-3 w-3" />
                      <span>Sans</span>
                    </TabsTrigger>
                    <TabsTrigger value="font-serif" className="flex items-center gap-2 text-xs font-serif">
                      <Type className="h-3 w-3" />
                      <span>Serif</span>
                    </TabsTrigger>
                    <TabsTrigger value="font-mono" className="flex items-center gap-2 text-xs font-mono">
                      <Type className="h-3 w-3" />
                      <span>Mono</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>
              
              {/* Default theme with color variations */}
              <TabsContent value="theme-default" className="focus:outline-none">
                <ChatbotDemo theme="default" variation="default" fontStyle="default" />
              </TabsContent>
              <TabsContent value="theme-modern" className="focus:outline-none">
                <ChatbotDemo theme="modern" variation="default" fontStyle="default" />
              </TabsContent>
              <TabsContent value="theme-minimal" className="focus:outline-none">
                <ChatbotDemo theme="minimal" variation="default" fontStyle="default" />
              </TabsContent>
              
              {/* Color variations */}
              <TabsContent value="color-default" className="focus:outline-none">
                <ChatbotDemo theme="default" variation="default" fontStyle="default" />
              </TabsContent>
              <TabsContent value="color-green" className="focus:outline-none">
                <ChatbotDemo theme="default" variation="green" fontStyle="default" />
              </TabsContent>
              <TabsContent value="color-purple" className="focus:outline-none">
                <ChatbotDemo theme="default" variation="purple" fontStyle="default" />
              </TabsContent>
              
              {/* Font variations */}
              <TabsContent value="font-default" className="focus:outline-none">
                <ChatbotDemo theme="default" variation="default" fontStyle="default" />
              </TabsContent>
              <TabsContent value="font-serif" className="focus:outline-none">
                <ChatbotDemo theme="default" variation="default" fontStyle="serif" />
              </TabsContent>
              <TabsContent value="font-mono" className="focus:outline-none">
                <ChatbotDemo theme="default" variation="default" fontStyle="mono" />
              </TabsContent>
            </Tabs>
          </div>

          <div className="w-full lg:w-1/2 order-1 lg:order-2">
            <h3 className="text-2xl font-bold mb-4">How It Works</h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">1</div>
                <div>
                  <h4 className="font-medium mb-1">Engage Visitors</h4>
                  <p className="text-muted-foreground">
                    The AI chatbot proactively engages with visitors across your website with fully customizable UI that matches your brand identity.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">2</div>
                <div>
                  <h4 className="font-medium mb-1">Qualify Leads</h4>
                  <p className="text-muted-foreground">
                    Through natural conversation, it gathers preferences, budget, timeline, and other qualifying information.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">3</div>
                <div>
                  <h4 className="font-medium mb-1">Recommend Properties</h4>
                  <p className="text-muted-foreground">
                    Based on collected data, it suggests relevant properties from your inventory.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">4</div>
                <div>
                  <h4 className="font-medium mb-1">Schedule Viewings</h4>
                  <p className="text-muted-foreground">
                    The AI can schedule property viewings and notify your agents automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Demo;
