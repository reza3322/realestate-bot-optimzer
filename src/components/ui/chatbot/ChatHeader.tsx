
import React from 'react';
import { cn } from '@/lib/utils';
import BotIcon from './BotIcon';

type ApiKeyStatus = 'not-set' | 'set' | 'error';

interface ChatHeaderProps {
  botName?: string;
  headerStyle?: string;
  fontStyle?: string;
  apiKeyStatus?: ApiKeyStatus;
  botIconName?: string;
  customStyle?: React.CSSProperties;
}

const ChatHeader = ({ 
  botName = "AI Assistant", 
  headerStyle, 
  fontStyle,
  apiKeyStatus = 'not-set',
  botIconName = 'bot',
  customStyle
}: ChatHeaderProps) => {
  return (
    <div 
      className={cn(
        "p-3 flex items-center justify-between border-b",
        headerStyle,
        fontStyle
      )}
      style={customStyle}
    >
      <div className="flex items-center gap-2">
        <BotIcon 
          iconName={botIconName} 
          size="md" 
          className="h-8 w-8 flex-shrink-0"
        />
        <div>
          <div className="font-medium">{botName}</div>
          <div className="text-xs text-muted-foreground">
            {apiKeyStatus === 'set' 
              ? 'Online' 
              : apiKeyStatus === 'error' 
                ? 'Connection Error' 
                : 'Demo Mode'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
