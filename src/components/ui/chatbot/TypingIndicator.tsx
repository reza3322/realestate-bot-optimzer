
import { BotIcon } from './BotIcon';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  botIconStyle: string;
  botBubbleStyle: string;
  botIconName?: string;
  customBotIconStyle?: React.CSSProperties;
}

const TypingIndicator = ({ 
  botIconStyle, 
  botBubbleStyle, 
  botIconName = 'bot',
  customBotIconStyle
}: TypingIndicatorProps) => {
  return (
    <div className="flex items-start gap-3">
      <div 
        className={cn(botIconStyle)}
        style={customBotIconStyle}
      >
        <BotIcon iconName={botIconName} className="h-5 w-5" />
      </div>
      
      <div className={cn(botBubbleStyle, "flex items-center justify-center space-x-1 min-w-16")}>
        <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-pulse"></div>
        <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-pulse delay-150"></div>
        <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-pulse delay-300"></div>
      </div>
    </div>
  );
};

export default TypingIndicator;
