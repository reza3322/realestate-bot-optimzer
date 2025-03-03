
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ChatbotDemo from '@/components/ui/ChatbotDemo';
import { Bot, Palette, Settings } from 'lucide-react';

const Demo = () => {
  return (
    <section id="how-it-works" className="py-20 bg-secondary/50">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">See It In Action</h2>
          <p className="text-lg text-muted-foreground">
            Experience how RealHomeAI engages with leads and automates your workflow.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="w-full lg:w-1/2 order-2 lg:order-1">
            <Tabs defaultValue="default" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="default" className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <span>Default</span>
                </TabsTrigger>
                <TabsTrigger value="modern" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <span>Modern</span>
                </TabsTrigger>
                <TabsTrigger value="minimal" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Minimal</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="default" className="focus:outline-none">
                <ChatbotDemo theme="default" />
              </TabsContent>
              <TabsContent value="modern" className="focus:outline-none">
                <ChatbotDemo theme="modern" />
              </TabsContent>
              <TabsContent value="minimal" className="focus:outline-none">
                <ChatbotDemo theme="minimal" />
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
                    The AI chatbot proactively engages with visitors across your website with fully customizable UI.
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
