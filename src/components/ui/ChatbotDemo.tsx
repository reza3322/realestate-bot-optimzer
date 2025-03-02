
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SendIcon, User, Bot } from 'lucide-react';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

const ChatbotDemo = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: 'Hello! I'm RealAssist.AI. How can I help you today?' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const demoResponses = [
    "I'd be happy to help you find a property. What's your budget range?",
    "Great! And what neighborhoods are you interested in?",
    "I've found 3 properties that match your criteria. Would you like to schedule a viewing?",
    "Perfect! I've notified your agent and scheduled a viewing for Saturday at 2pm. You'll receive a confirmation email shortly."
  ];
  
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    // Add user message
    const userMessage = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Simulate bot typing
    setIsTyping(true);
    
    // Get next response based on conversation length
    const responseIndex = Math.min(messages.length - 1, demoResponses.length - 1);
    
    // Add bot response after a delay
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'bot', content: demoResponses[responseIndex] }]);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col">
      <div className="bg-primary/10 p-4 border-b border-border">
        <h3 className="font-medium text-center">RealAssist.AI Demo</h3>
      </div>
      
      <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[300px] min-h-[300px]">
        {messages.map((message, i) => (
          <div 
            key={i}
            className={cn(
              "flex items-start gap-3 animate-fade-in-up",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            {message.role === 'bot' && (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            
            <div 
              className={cn(
                "max-w-[80%] rounded-xl p-3 text-sm",
                message.role === 'user' 
                  ? "bg-primary text-primary-foreground rounded-tr-none" 
                  : "bg-secondary text-secondary-foreground rounded-tl-none"
              )}
            >
              {message.content}
            </div>
            
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-secondary text-secondary-foreground rounded-xl rounded-tl-none p-3 text-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 min-h-10 max-h-24 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            rows={1}
          />
          <Button 
            type="button" 
            size="icon" 
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
          >
            <SendIcon className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatbotDemo;
