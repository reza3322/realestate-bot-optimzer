
import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, MessageCircle } from 'lucide-react';

interface TypingIndicatorProps {
  botIconStyle: string;
  botBubbleStyle: string;
  BotIcon?: LucideIcon;
}

const TypingIndicator = ({ botIconStyle, botBubbleStyle, BotIcon = MessageCircle }: TypingIndicatorProps) => {
  return (
    <div className="flex gap-2">
      <div className={cn(
        'rounded-full w-8 h-8 flex items-center justify-center',
        botIconStyle
      )}>
        <BotIcon className="w-5 h-5" />
      </div>
      <div className={cn(
        'py-2 px-3 rounded-lg',
        botBubbleStyle
      )}>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
