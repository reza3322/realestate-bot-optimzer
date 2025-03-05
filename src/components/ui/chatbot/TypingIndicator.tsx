
import { cn } from '@/lib/utils';
import { BotIcon } from './BotIcon';

interface TypingIndicatorProps {
  botIconStyle: string;
  botBubbleStyle: string;
  botIconName?: string;
}

const TypingIndicator = ({ botIconStyle, botBubbleStyle, botIconName = 'bot' }: TypingIndicatorProps) => {
  return (
    <div className="flex items-start gap-3">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        botIconStyle
      )}>
        <BotIcon iconName={botIconName} className="w-4 h-4" />
      </div>
      <div className={cn(
        "p-3 text-sm",
        botBubbleStyle
      )}>
        <div className="flex space-x-1">
          <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
