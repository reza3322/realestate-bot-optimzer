
import { useState } from "react";
import { Message, ChatStylesType } from "./chatbot/types";
import ChatHeader from "./chatbot/ChatHeader";
import ChatMessage from "./chatbot/ChatMessage";
import ChatInput from "./chatbot/ChatInput";
import TypingIndicator from "./chatbot/TypingIndicator";
import { cn } from "@/lib/utils";

interface ChatbotDemoProps {
  className?: string;
  styles: ChatStylesType;
  botName?: string;
  placeholderText?: string;
}

const ChatbotDemo = ({
  className,
  styles,
  botName = "RealHome Assistant",
  placeholderText = "Type your message..."
}: ChatbotDemoProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Hi! I'm your AI assistant. How can I help you today?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = (message: string) => {
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: "I'm a demo bot. In the real app, I'll help you manage your real estate business!" 
      }]);
    }, 1000);
  };

  return (
    <div className={cn(
      'flex flex-col overflow-hidden rounded-lg shadow-md h-[500px]',
      className
    )}>
      <ChatHeader 
        botName={botName}
        botIconName="bot"
        apiKeyStatus="not-set"
      />
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((message, index) => (
          <ChatMessage 
            key={index}
            message={message}
            index={index}
            styles={styles}
            botIconName="bot"
          />
        ))}
        
        {isTyping && (
          <TypingIndicator 
            botIconStyle={styles.botIcon}
            botBubbleStyle={styles.botBubble}
            botIconName="bot"
          />
        )}
      </div>
      
      <ChatInput 
        onSendMessage={handleSendMessage}
        placeholderText={placeholderText}
      />
    </div>
  );
};

export default ChatbotDemo;
