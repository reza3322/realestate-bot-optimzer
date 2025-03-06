
import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { BotIcon } from './BotIcon';
import { cn } from '@/lib/utils';
import { Message, ChatStylesType } from './types';

export interface ChatMessageProps {
  message: Message;
  index: number;
  styles: ChatStylesType;
  botIconName?: string;
  customBotIconStyle?: React.CSSProperties;
  customUserBubbleStyle?: React.CSSProperties;
}

const ChatMessage = ({ 
  message, 
  index, 
  styles,
  botIconName = 'bot',
  customBotIconStyle,
  customUserBubbleStyle
}: ChatMessageProps) => {
  const [visible, setVisible] = useState(false);
  
  // Fade in animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div
      className={cn(
        "flex items-start gap-3 transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      {message.role === 'bot' && (
        <div 
          className={cn(styles.botIcon)}
          style={customBotIconStyle}
        >
          <BotIcon iconName={botIconName} className="h-5 w-5" />
        </div>
      )}
      
      <div 
        className={cn(
          message.role === 'user' ? styles.userBubble : styles.botBubble
        )}
        style={message.role === 'user' ? customUserBubbleStyle : {}}
      >
        {message.content}
      </div>
      
      {message.role === 'user' && (
        <div className={cn(styles.userIcon)}>
          <User className="h-5 w-5" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
