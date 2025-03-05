
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import { Message } from './types';
import { BotIcon } from './BotIcon';

interface ChatMessageProps {
  message: Message;
  index: number;
  styles: {
    userBubble: string;
    botBubble: string;
    userIcon: string;
    botIcon: string;
  };
  botIconName?: string;
}

const ChatMessage = ({ message, index, styles, botIconName = 'bot' }: ChatMessageProps) => {
  return (
    <div 
      className={cn(
        "flex items-start gap-3 animate-fade-in-up",
        message.role === 'user' ? "justify-end" : "justify-start"
      )}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {message.role === 'bot' && (
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          styles.botIcon
        )}>
          <BotIcon iconName={botIconName} className="w-4 h-4" />
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
  );
};

export default ChatMessage;
