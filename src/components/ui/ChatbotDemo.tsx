
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SendIcon, User, Bot, Info, Settings, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

interface ChatbotDemoProps {
  theme?: 'default' | 'modern' | 'minimal';
  variation?: 'default' | 'blue' | 'green' | 'purple';
  fontStyle?: 'default' | 'serif' | 'mono';
}

const ChatbotDemo = ({ 
  theme = 'default',
  variation = 'default',
  fontStyle = 'default' 
}: ChatbotDemoProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Hello! I'm RealHomeAI. How can I help you today?" },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'not-set' | 'set' | 'checking'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const demoResponses = [
    "I'd be happy to help you find a property. What's your budget range?",
    "Great! And what neighborhoods are you interested in?",
    "I've found 3 properties that match your criteria. Would you like to schedule a viewing?",
    "Perfect! I've notified your agent and scheduled a viewing for Saturday at 2pm. You'll receive a confirmation email shortly."
  ];
  
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

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Add user message
    const userMessage: Message = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Simulate bot typing
    setIsTyping(true);
    
    try {
      // For demo purposes we'll use the demo responses
      // In a production environment, we would call an API endpoint 
      // that securely uses the OpenAI API with your key
      setTimeout(() => {
        const responseIndex = Math.min(messages.length - 1, demoResponses.length - 1);
        setIsTyping(false);
        setMessages(prev => [...prev, { role: 'bot', content: demoResponses[responseIndex] }]);
      }, 1500);
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

  const handleApiKeyCheck = () => {
    if (apiKeyStatus === 'not-set') {
      toast({
        title: "API Key Required",
        description: "For a live demo, this would connect to a secure backend. In a real implementation, you wouldn't store API keys in the browser.",
        duration: 5000,
      });
    } else {
      toast({
        title: "API Key Status",
        description: "API key is configured. In a production app, this would securely connect to OpenAI through a backend service.",
        duration: 3000,
      });
    }
  };

  const getThemeStyles = () => {
    // Base theme styles
    let styles = {
      container: "bg-card border border-border",
      header: "bg-primary/10 border-b border-border",
      userBubble: "bg-primary text-primary-foreground rounded-xl rounded-tr-none",
      botBubble: "bg-secondary text-secondary-foreground rounded-xl rounded-tl-none",
      inputContainer: "border-t border-border",
      botIcon: "bg-primary/20 text-primary",
      userIcon: "bg-secondary text-secondary-foreground",
      font: "",
    };
    
    // Apply theme variations
    switch (theme) {
      case 'modern':
        styles = {
          ...styles,
          container: "bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800",
          header: "bg-gradient-to-r from-indigo-500 to-blue-600 text-white",
          userBubble: "bg-blue-600 text-white rounded-2xl rounded-tr-none shadow-md",
          botBubble: "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-none shadow-md border border-gray-100 dark:border-gray-700",
          inputContainer: "bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700",
          botIcon: "bg-gradient-to-r from-indigo-500 to-blue-600 text-white",
          userIcon: "bg-blue-600 text-white",
        };
        break;
      case 'minimal':
        styles = {
          ...styles,
          container: "bg-gray-50 dark:bg-gray-900",
          header: "bg-transparent border-b border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100",
          userBubble: "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg",
          botBubble: "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-200 dark:border-gray-700",
          inputContainer: "bg-transparent border-t border-gray-200 dark:border-gray-800",
          botIcon: "bg-transparent border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400",
          userIcon: "bg-transparent border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400",
        };
        break;
    }
    
    // Apply color variations
    switch (variation) {
      case 'blue':
        styles = {
          ...styles,
          header: styles.header.replace('from-indigo-500 to-blue-600', 'from-blue-400 to-blue-700').replace('bg-primary/10', 'bg-blue-100 dark:bg-blue-900/30'),
          userBubble: styles.userBubble.replace('bg-primary', 'bg-blue-600').replace('bg-blue-600', 'bg-blue-600'),
          botIcon: styles.botIcon.replace('bg-primary/20', 'bg-blue-100 dark:bg-blue-900/30').replace('text-primary', 'text-blue-700 dark:text-blue-400'),
        };
        break;
      case 'green':
        styles = {
          ...styles,
          header: styles.header.replace('from-indigo-500 to-blue-600', 'from-emerald-400 to-green-600').replace('bg-primary/10', 'bg-emerald-100 dark:bg-emerald-900/30'),
          userBubble: styles.userBubble.replace('bg-primary', 'bg-emerald-600').replace('bg-blue-600', 'bg-emerald-600'),
          botIcon: styles.botIcon.replace('bg-primary/20', 'bg-emerald-100 dark:bg-emerald-900/30').replace('text-primary', 'text-emerald-700 dark:text-emerald-400'),
        };
        break;
      case 'purple':
        styles = {
          ...styles,
          header: styles.header.replace('from-indigo-500 to-blue-600', 'from-purple-400 to-violet-600').replace('bg-primary/10', 'bg-purple-100 dark:bg-purple-900/30'),
          userBubble: styles.userBubble.replace('bg-primary', 'bg-purple-600').replace('bg-blue-600', 'bg-purple-600'),
          botIcon: styles.botIcon.replace('bg-primary/20', 'bg-purple-100 dark:bg-purple-900/30').replace('text-primary', 'text-purple-700 dark:text-purple-400'),
        };
        break;
    }
    
    // Apply font styles
    switch (fontStyle) {
      case 'serif':
        styles.font = "font-serif";
        break;
      case 'mono':
        styles.font = "font-mono";
        break;
      default:
        styles.font = "font-sans";
    }
    
    return styles;
  };

  const styles = getThemeStyles();

  return (
    <div className={cn(
      "w-full max-w-md mx-auto rounded-xl shadow-lg overflow-hidden flex flex-col",
      styles.container,
      styles.font
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
                onClick={handleApiKeyCheck}
              >
                {apiKeyStatus === 'not-set' ? 
                  <Lock className="h-4 w-4" /> : 
                  <Settings className="h-4 w-4" />
                }
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>API Configuration</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
