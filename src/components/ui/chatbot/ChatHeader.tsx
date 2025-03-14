
import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BotIcon } from './BotIcon';

interface ChatHeaderProps {
  botName?: string;
  headerStyle?: string;
  fontStyle?: string;
  apiKeyStatus?: 'set' | 'not-set';
  botIconName?: string;
  customStyle?: React.CSSProperties;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  botName = 'RealHome.AI Assistant',
  headerStyle,
  fontStyle,
  apiKeyStatus,
  botIconName = 'bot',
  customStyle
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 text-white',
        fontStyle,
        headerStyle
      )}
      style={customStyle}
    >
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-white/20 p-1">
          <BotIcon iconName={botIconName} size="24" className="text-white" />
        </div>
        <span className="font-medium">{botName}</span>
        {apiKeyStatus === 'not-set' && (
          <span className="ml-2 rounded-full bg-yellow-400 px-2 py-0.5 text-xs text-black">
            Demo mode
          </span>
        )}
      </div>
      <button className="rounded-full p-1 hover:bg-white/20">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ChatHeader;
