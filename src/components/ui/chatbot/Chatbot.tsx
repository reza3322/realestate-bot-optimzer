
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { getChatStyles, applyFontStyle } from './chatStyles';
import { Message } from './types';
import { testChatbotResponse } from './responseHandlers';
import { Bot, MessageCircle, Headphones, MessageSquare, BrainCircuit } from 'lucide-react';

interface ChatbotProps {
  apiKey?: string;
  className?: string;
  theme?: 'default' | 'modern' | 'minimal';
  variation?: 'default' | 'blue' | 'green' | 'purple';
  fontStyle?: 'default' | 'serif' | 'mono' | 'sans' | 'inter';
  botName?: string;
  welcomeMessage?: string;
  placeholderText?: string;
  maxHeight?: string;
  onSendMessage?: (message: string) => void;
  userId?: string;
  useRealAPI?: boolean;
  primaryColor?: string;
  botIcon?: string;
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
  primaryColor,
  botIcon = 'message-circle'
}: ChatbotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: welcomeMessage }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Apply theme styles with primary color
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

  // Get the right icon component based on bot icon setting
  const getBotIconComponent = () => {
    switch (botIcon) {
      case 'message-circle':
        return MessageCircle;
      case 'bot':
        return Bot;
      case 'headphones':
        return Headphones;
      case 'message-square':
        return MessageSquare;
      case 'brain':
        return BrainCircuit;
      default:
        return MessageCircle;
    }
  };

  const BotIconComponent = getBotIconComponent();

  return (
    <div className={cn(
      'flex flex-col overflow-hidden rounded-lg shadow-md',
      'h-[500px]', // Fixed height
      styles.container,
      styles.font, // Apply font class from styles
      className
    )}>
      {/* Chat Header */}
      <ChatHeader 
        botName={botName}
        headerStyle={styles.header}
        fontStyle={styles.font}
        apiKeyStatus={useRealAPI ? "set" : "not-set"}
        BotIcon={BotIconComponent}
      />
      
      {/* Messages Container - Fixed height with overflow */}
      <div 
        className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-none relative"
        style={{ height: `calc(100% - 120px)` }} // Subtract header and input heights
      >
        {messages.map((message, index) => (
          <ChatMessage 
            key={index}
            message={message}
            index={index}
            styles={styles}
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
