
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getChatStyles, applyFontStyle } from './chatbot/chatStyles';
import { getResponseForMessage, demoResponses } from './chatbot/responseHandlers';
import { Message, ChatbotDemoProps } from './chatbot/types';
import ChatHeader from './chatbot/ChatHeader';
import ChatMessage from './chatbot/ChatMessage';
import TypingIndicator from './chatbot/TypingIndicator';
import ChatInput from './chatbot/ChatInput';

const ChatbotDemo = ({ 
  theme = 'default',
  variation = 'default',
  fontStyle = 'default' 
}: ChatbotDemoProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Hello! I'm RealHomeAI. How can I help you today?" },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'not-set' | 'set' | 'checking'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Check if API key exists in localStorage for demo purposes
    const hasApiKey = localStorage.getItem('openai-api-key');
    setApiKeyStatus(hasApiKey ? 'set' : 'not-set');
  }, []);

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

  return (
    <div className={cn(
      "w-full max-w-md mx-auto rounded-xl shadow-lg overflow-hidden flex flex-col",
      styles.container,
      styles.font
    )}>
      <ChatHeader headerStyle={styles.header} apiKeyStatus={apiKeyStatus} />
      
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
      
      <ChatInput
        inputContainerStyle={styles.inputContainer}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default ChatbotDemo;
