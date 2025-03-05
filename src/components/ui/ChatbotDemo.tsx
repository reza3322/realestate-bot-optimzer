
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getChatStyles, applyFontStyle } from './chatbot/chatStyles';
import { getResponseForMessage, demoResponses } from './chatbot/responseHandlers';
import { Message, ChatbotDemoProps } from './chatbot/types';
import ChatHeader from './chatbot/ChatHeader';
import ChatMessage from './chatbot/ChatMessage';
import TypingIndicator from './chatbot/TypingIndicator';
import ChatInput from './chatbot/ChatInput';
import { Bot, MessageCircle, Headphones, MessageSquare, BrainCircuit } from 'lucide-react';

const ICON_MAP = {
  'bot': Bot,
  'message-circle': MessageCircle,
  'headphones': Headphones,
  'message-square': MessageSquare,
  'brain': BrainCircuit
};

const ChatbotDemo = ({ 
  theme = 'default',
  variation = 'default',
  fontStyle = 'default',
  primaryColor = '#3b82f6',
  botIcon = 'message-circle',
  apiKeyStatus = 'not-set'
}: ChatbotDemoProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Hello! I'm RealHomeAI. How can I help you today?" },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (inputValue: string) => {
    if (!inputValue.trim()) return;
    
    // Add user message
    const userMessage: Message = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    
    // Simulate bot typing
    setIsTyping(true);
    
    try {
      // For demo purposes we'll use the demo responses
      // In a production environment, we would call an API endpoint 
      // that securely uses the OpenAI API with your key
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { role: 'bot', content: getResponseForMessage(prev) }]);
      }, 1500);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'bot', content: "Sorry, I encountered an error. Please try again later." }]);
    }
  };

  // Get and apply styles based on props
  let baseStyles = getChatStyles(theme, variation);
  const styles = applyFontStyle(baseStyles, fontStyle);
  
  // Get the appropriate icon component
  const BotIconComponent = ICON_MAP[botIcon as keyof typeof ICON_MAP] || MessageCircle;

  return (
    <div className={cn(
      "w-full max-w-md mx-auto rounded-xl shadow-lg overflow-hidden flex flex-col",
      styles.container,
      styles.font
    )}>
      <ChatHeader 
        botName="RealHome Assistant" 
        headerStyle={styles.header} 
        fontStyle={styles.font}
        apiKeyStatus={apiKeyStatus}
        BotIcon={BotIconComponent}
      />
      
      <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[300px] min-h-[300px]">
        {messages.map((message, i) => (
          <ChatMessage 
            key={i} 
            message={message} 
            index={i} 
            styles={{
              userBubble: styles.userBubble,
              botBubble: styles.botBubble,
              userIcon: styles.userIcon,
              botIcon: styles.botIcon
            }} 
            BotIcon={BotIconComponent}
          />
        ))}
        
        {isTyping && (
          <TypingIndicator 
            botIconStyle={styles.botIcon} 
            botBubbleStyle={styles.botBubble}
            BotIcon={BotIconComponent} 
          />
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput
        inputContainerStyle={styles.inputContainer}
        onSendMessage={handleSendMessage}
        placeholderText="Type your message..."
      />
    </div>
  );
};

export default ChatbotDemo;
