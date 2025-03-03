
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SendIcon, User, Bot, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

interface ChatbotDemoProps {
  theme?: 'default' | 'modern' | 'minimal';
}

const ChatbotDemo = ({ theme = 'default' }: ChatbotDemoProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Hello! I'm RealHomeAI. How can I help you today?" },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(localStorage.getItem('openai-api-key'));
  const [showApiKeyInput, setShowApiKeyInput] = useState(!apiKey);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const demoResponses = [
    "I'd be happy to help you find a property. What's your budget range?",
    "Great! And what neighborhoods are you interested in?",
    "I've found 3 properties that match your criteria. Would you like to schedule a viewing?",
    "Perfect! I've notified your agent and scheduled a viewing for Saturday at 2pm. You'll receive a confirmation email shortly."
  ];
  
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Add user message
    const userMessage: Message = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Simulate bot typing
    setIsTyping(true);
    
    try {
      if (apiKey) {
        // In a real implementation, you would call OpenAI API here
        // For demo purposes, we'll simulate a response
        setTimeout(() => {
          const responseIndex = Math.min(messages.length - 1, demoResponses.length - 1);
          setIsTyping(false);
          setMessages(prev => [...prev, { role: 'bot', content: demoResponses[responseIndex] }]);
        }, 1500);
      } else {
        // Without API key, just use demo responses
        const responseIndex = Math.min(messages.length - 1, demoResponses.length - 1);
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, { role: 'bot', content: demoResponses[responseIndex] }]);
        }, 1500);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'bot', content: "Sorry, I encountered an error. Please try again later." }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const saveApiKey = (key: string) => {
    localStorage.setItem('openai-api-key', key);
    setApiKey(key);
    setShowApiKeyInput(false);
  };

  const getThemeStyles = () => {
    switch (theme) {
      case 'modern':
        return {
          container: "bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800",
          header: "bg-gradient-to-r from-indigo-500 to-blue-600 text-white",
          userBubble: "bg-blue-600 text-white rounded-2xl rounded-tr-none shadow-md",
          botBubble: "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-none shadow-md border border-gray-100 dark:border-gray-700",
          inputContainer: "bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700",
          botIcon: "bg-gradient-to-r from-indigo-500 to-blue-600 text-white",
          userIcon: "bg-blue-600 text-white",
        };
      case 'minimal':
        return {
          container: "bg-gray-50 dark:bg-gray-900",
          header: "bg-transparent border-b border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100",
          userBubble: "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg",
          botBubble: "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-200 dark:border-gray-700",
          inputContainer: "bg-transparent border-t border-gray-200 dark:border-gray-800",
          botIcon: "bg-transparent border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400",
          userIcon: "bg-transparent border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400",
        };
      default:
        return {
          container: "bg-card border border-border",
          header: "bg-primary/10 border-b border-border",
          userBubble: "bg-primary text-primary-foreground rounded-xl rounded-tr-none",
          botBubble: "bg-secondary text-secondary-foreground rounded-xl rounded-tl-none",
          inputContainer: "border-t border-border",
          botIcon: "bg-primary/20 text-primary",
          userIcon: "bg-secondary text-secondary-foreground",
        };
    }
  };

  const styles = getThemeStyles();

  return (
    <div className={cn(
      "w-full max-w-md mx-auto rounded-xl shadow-lg overflow-hidden flex flex-col",
      styles.container
    )}>
      <div className={cn(
        "p-4 flex justify-between items-center",
        styles.header
      )}>
        <h3 className="font-medium text-center flex-1">RealHomeAI Demo</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              >
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Configure OpenAI API Key</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {showApiKeyInput && (
        <div className="p-4 bg-muted/50 border-b border-border">
          <p className="text-xs mb-2">Enter your OpenAI API key to enable live AI responses:</p>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="sk-..."
              value={apiKey || ''}
              onChange={(e) => setApiKey(e.target.value)}
              className="text-xs"
            />
            <Button size="sm" onClick={() => saveApiKey(apiKey || '')}>Save</Button>
          </div>
          <p className="text-xs mt-2 text-muted-foreground">Your API key is stored locally in your browser.</p>
        </div>
      )}
      
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
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                styles.botIcon
              )}>
                <Bot className="w-4 h-4" />
              </div>
            )}
            
            <div 
              className={cn(
                "max-w-[80%] p-3 text-sm",
                message.role === 'user' 
                  ? styles.userBubble
                  : styles.botBubble
              )}
            >
              {message.content}
            </div>
            
            {message.role === 'user' && (
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                styles.userIcon
              )}>
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              styles.botIcon
            )}>
              <Bot className="w-4 h-4" />
            </div>
            <div className={cn(
              "p-3 text-sm",
              styles.botBubble
            )}>
              <div className="flex space-x-1">
                <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className={cn(
        "p-4",
        styles.inputContainer
      )}>
        <div className="flex items-center gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
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
