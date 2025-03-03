
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { getChatStyles, applyFontStyle } from './chatStyles';
import { Message } from './types';
import { demoResponses } from './responseHandlers';

interface ChatbotProps {
  apiKey?: string;
  className?: string;
  theme?: 'default' | 'modern' | 'minimal';
  variation?: 'default' | 'blue' | 'green' | 'purple';
  fontStyle?: 'default' | 'serif' | 'mono';
  botName?: string;
  welcomeMessage?: string;
  placeholderText?: string;
  maxHeight?: string;
  onSendMessage?: (message: string) => void;
}

// Custom hook for demo response generation
const useDemoResponse = () => {
  const generateDemoResponse = async (message: string): Promise<string> => {
    // Simple logic for demo purposes
    // In a real app, this would call an API
    
    // Get a random response from the demo responses
    const randomIndex = Math.floor(Math.random() * demoResponses.length);
    
    // Add a small delay to simulate thinking
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(demoResponses[randomIndex]);
      }, 500);
    });
  };

  return { generateDemoResponse };
};

const Chatbot = ({
  className,
  theme = 'default',
  variation = 'default',
  fontStyle = 'default',
  botName = 'RealHomeAI Assistant',
  welcomeMessage = "Hi there! I'm your RealHomeAI assistant. How can I help you today?",
  placeholderText = "Type your message...",
  maxHeight = "500px",
  onSendMessage
}: ChatbotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: welcomeMessage }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { generateDemoResponse } = useDemoResponse();

  // Apply theme styles
  const baseStyles = getChatStyles(theme, variation);
  const styles = applyFontStyle(baseStyles, fontStyle);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    
    // Call optional callback
    onSendMessage?.(message);
    
    // Simulate typing
    setIsTyping(true);
    
    // Get demo response with delay
    setTimeout(async () => {
      const response = await generateDemoResponse(message);
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'bot', content: response }]);
    }, 1500);
  };

  return (
    <div className={cn(
      'flex flex-col overflow-hidden rounded-lg shadow-md',
      styles.container,
      styles.font,
      className
    )}>
      {/* Chat Header */}
      <ChatHeader 
        botName={botName}
        headerStyle={styles.header}
        fontStyle={styles.font}
        apiKeyStatus="not-set"
      />
      
      {/* Messages Container */}
      <div 
        className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-none"
        style={{ maxHeight }}
      >
        {messages.map((message, index) => (
          <ChatMessage 
            key={index}
            message={message}
            index={index}
            styles={styles}
          />
        ))}
        
        {isTyping && (
          <TypingIndicator 
            botIconStyle={styles.botIcon}
            botBubbleStyle={styles.botBubble}
          />
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <ChatInput 
        inputContainerStyle={styles.inputContainer}
        onSendMessage={handleSendMessage}
        placeholderText={placeholderText}
      />
    </div>
  );
};

export default Chatbot;
