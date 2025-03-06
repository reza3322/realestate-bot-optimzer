
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { getChatStyles, applyFontStyle } from './chatStyles';
import { Message } from './types';
import { testChatbotResponse } from './responseHandlers';

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
  userId?: string;
  useRealAPI?: boolean;
  botIconName?: string;
  primaryColor?: string;
}

const Chatbot = ({
  className,
  theme = 'default',
  variation = 'default',
  fontStyle = 'default',
  botName = "RealHomeAI Assistant",
  welcomeMessage = "Hi there! I'm your RealHomeAI assistant. How can I help you today?",
  placeholderText = "Type your message...",
  maxHeight = "400px",
  onSendMessage,
  userId = 'demo-user',
  useRealAPI = false,
  botIconName = 'bot',
  primaryColor
}: ChatbotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: welcomeMessage }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Apply theme styles
  const baseStyles = getChatStyles(theme, variation, primaryColor);
  const styles = applyFontStyle(baseStyles, fontStyle);

  // Update messages if welcome message changes
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'bot') {
      setMessages([{ role: 'bot', content: welcomeMessage }]);
    }
  }, [welcomeMessage]);

  // Scroll chat messages to bottom without affecting page scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.parentElement;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    
    // Call optional callback
    onSendMessage?.(message);
    
    // Simulate typing
    setIsTyping(true);
    setError(null);
    
    if (useRealAPI) {
      try {
        // Use the real OpenAI API through Supabase edge function
        const { response, error } = await testChatbotResponse(message, userId);
        
        if (error) {
          console.error('Chatbot error:', error);
          setError(`Error: ${error}`);
        } else {
          // Add bot response
          setMessages(prev => [...prev, { role: 'bot', content: response }]);
        }
      } catch (err) {
        console.error('Chatbot exception:', err);
        setError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsTyping(false);
      }
    } else {
      // Use demo responses with delay
      setTimeout(async () => {
        // Simple logic for demo purposes - get a random response
        const demoResponses = [
          "I'd be happy to help you find a property. What's your budget range?",
          "Great! And what neighborhoods are you interested in?",
          "I've found 3 properties that match your criteria. Would you like to schedule a viewing?",
          "Perfect! I've notified your agent and scheduled a viewing for Saturday at 2pm.",
          "Our agents specialize in luxury properties in downtown and suburban areas.",
          "Yes, we have several properties with pools available right now.",
          "The average price in that neighborhood has increased by 12% over the last year.",
          "I can help you get pre-approved for a mortgage through our partner lenders."
        ];
        
        const randomIndex = Math.floor(Math.random() * demoResponses.length);
        const demoResponse = demoResponses[randomIndex];
        
        setIsTyping(false);
        setMessages(prev => [...prev, { role: 'bot', content: demoResponse }]);
      }, 1500);
    }
  };

  // Generate the appropriate font class based on the fontStyle prop
  const getFontClass = () => {
    switch (fontStyle) {
      case 'serif':
        return 'font-serif';
      case 'mono':
        return 'font-mono';
      case 'default':
      default:
        return 'font-sans';
    }
  };

  // Apply custom color styling to elements if provided
  const headerStyle = styles.customColor ? {
    backgroundColor: styles.customColor
  } : undefined;

  const botIconStyle = styles.customColor ? {
    backgroundColor: styles.customColor
  } : undefined;

  const userBubbleStyle = styles.customColor ? {
    backgroundColor: `${styles.customColor}25` // 25 is hex for 15% opacity
  } : undefined;

  return (
    <div className={cn(
      'flex flex-col overflow-hidden rounded-lg shadow-md',
      'h-[500px]', // Fixed height
      styles.container,
      getFontClass(), // Apply font class dynamically
      className
    )}>
      {/* Chat Header */}
      <ChatHeader 
        botName={botName}
        headerStyle={styles.header}
        fontStyle={styles.font}
        apiKeyStatus={useRealAPI ? "set" : "not-set"}
        botIconName={botIconName}
        customStyle={headerStyle}
      />
      
      {/* Messages Container */}
      <div 
        className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-none relative"
        style={{ height: `calc(100% - 120px)` }}
      >
        {messages.map((message, index) => (
          <ChatMessage 
            key={index}
            message={message}
            index={index}
            styles={styles}
            botIconName={botIconName}
            customBotIconStyle={botIconStyle}
            customUserBubbleStyle={userBubbleStyle}
          />
        ))}
        
        {isTyping && (
          <TypingIndicator 
            botIconStyle={styles.botIcon}
            botBubbleStyle={styles.botBubble}
            botIconName={botIconName}
            customBotIconStyle={botIconStyle}
          />
        )}
        
        {error && (
          <div className="p-2 rounded-md bg-red-50 text-red-500 text-sm">
            {error}
          </div>
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
