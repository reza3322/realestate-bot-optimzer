
import React from 'react';
import { cn } from '@/lib/utils';
import { Message } from './types';
import { LucideIcon, MessageCircle, User } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  index: number;
  styles: {
    userBubble: string;
    botBubble: string;
    userIcon: string;
    botIcon: string;
  };
  BotIcon?: LucideIcon;
}

const ChatMessage = ({ message, index, styles, BotIcon = MessageCircle }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn(
      'flex gap-2 mb-3', 
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      <div className={cn(
        'rounded-full w-8 h-8 flex items-center justify-center',
        isUser ? styles.userIcon : styles.botIcon
      )}>
        {isUser ? (
          <User className="w-5 h-5" />
        ) : (
          <BotIcon className="w-5 h-5" />
        )}
      </div>
      <div className={cn(
        'py-2 px-3 rounded-lg max-w-[75%]',
        isUser ? styles.userBubble : styles.botBubble
      )}>
        {message.content}
      </div>
    </div>
  );
};

export default ChatMessage;
