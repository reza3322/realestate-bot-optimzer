
import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BotIcon } from './chatbot/BotIcon';
import { Message, ChatStylesType } from './chatbot/types';

export interface ChatbotDemoProps {
  className?: string;
  maxHeight?: string;
}

const ChatbotDemo = ({ className, maxHeight = "300px" }: ChatbotDemoProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Hi there! I'm your assistant. How can I help you today?" },
    { role: 'user', content: "Can you tell me about your real estate services?" },
    { role: 'bot', content: "We offer a complete range of real estate services including property listings, buyer representation, and market analysis. Are you looking to buy or sell a property?" },
  ]);

  // Generate a demo styles object that matches ChatStylesType
  const styles: ChatStylesType = {
    container: 'bg-white dark:bg-gray-800 shadow-md rounded-lg',
    header: 'bg-primary text-white p-3 rounded-t-lg flex items-center',
    userBubble: 'bg-primary/10 text-foreground rounded-lg p-3 max-w-[80%] ml-auto',
    botBubble: 'bg-muted text-foreground rounded-lg p-3 max-w-[80%]',
    inputContainer: 'border-t border-border p-3 bg-background',
    botIcon: 'bg-primary text-white h-8 w-8 rounded-full flex items-center justify-center',
    userIcon: 'bg-primary/20 h-8 w-8 rounded-full flex items-center justify-center',
    font: 'font-sans'
  };

  return (
    <div className={cn(
      'flex flex-col overflow-hidden rounded-lg shadow-md',
      styles.container,
      className
    )}>
      {/* Chat Header */}
      <div className={cn(styles.header)}>
        <div className={cn(styles.botIcon, 'mr-2')}>
          <BotIcon iconName="bot" className="h-5 w-5" />
        </div>
        <span className="font-medium">RealHome Assistant</span>
      </div>
      
      {/* Messages Container */}
      <div 
        className="flex-1 p-3 overflow-y-auto space-y-3"
        style={{ height: maxHeight }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className="flex items-start gap-3"
          >
            {message.role === 'bot' && (
              <div className={cn(styles.botIcon)}>
                <BotIcon iconName="bot" className="h-5 w-5" />
              </div>
            )}
            
            <div 
              className={cn(
                message.role === 'user' ? styles.userBubble : styles.botBubble
              )}
            >
              {message.content}
            </div>
            
            {message.role === 'user' && (
              <div className={cn(styles.userIcon)}>
                <User className="h-5 w-5" />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Input Area (disabled in demo) */}
      <div className={cn(styles.inputContainer, 'flex items-center')}>
        <input 
          type="text" 
          disabled 
          className="flex-1 p-2 bg-muted rounded-md opacity-50 text-muted-foreground"
          placeholder="Type your message... (demo only)"
        />
        <button 
          disabled
          className="ml-2 p-2 bg-primary/50 text-primary-foreground rounded-md opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatbotDemo;
