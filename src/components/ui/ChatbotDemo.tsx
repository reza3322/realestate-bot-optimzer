
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import Chatbot from "./chatbot/Chatbot";
import { ChatStylesType } from "./chatbot/chatStyles";

interface ChatbotDemoProps {
  apiKey?: string;
  apiKeyStatus?: "valid" | "invalid" | "checking" | "none";
  styles?: ChatStylesType;
}

const ChatbotDemo = ({ 
  apiKey = "",
  apiKeyStatus = "none",
  styles = { theme: "default", variation: "default" } 
}: ChatbotDemoProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <Card className="overflow-hidden border-0 shadow-none">
      <CardContent className="p-0 relative">
        {!isChatOpen ? (
          <div className="flex flex-col items-center justify-center p-6 min-h-[300px] text-center">
            <MessageCircle size={48} className="mb-4 text-primary" />
            <h3 className="text-xl font-medium mb-2">Live Chat Preview</h3>
            <p className="text-muted-foreground mb-4">
              Click the button below to see how your chatbot will appear to your
              website visitors
            </p>
            <Button 
              onClick={() => setIsChatOpen(true)}
              className="mt-2"
            >
              Open Chat
            </Button>
          </div>
        ) : (
          <div className="min-h-[500px] flex relative">
            <Chatbot
              theme={styles.theme}
              variation={styles.variation}
              primaryColor={styles.primaryColor}
              onClose={() => setIsChatOpen(false)}
              apiKey={apiKey}
              apiKeyStatus={apiKeyStatus}
              demoMode={true}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatbotDemo;
