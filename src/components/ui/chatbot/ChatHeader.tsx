
import { cn } from '@/lib/utils';
import { Bot, LucideIcon } from 'lucide-react';

interface ChatHeaderProps {
  botName: string;
  headerStyle: string;
  fontStyle: string;
  apiKeyStatus?: 'set' | 'not-set' | 'checking';
  BotIcon?: LucideIcon;
}

const ChatHeader = ({ 
  botName, 
  headerStyle, 
  fontStyle,
  apiKeyStatus,
  BotIcon = Bot
}: ChatHeaderProps) => {
  return (
    <div className={cn("p-4 flex items-center gap-2", headerStyle)}>
      <div className="rounded-full w-8 h-8 flex items-center justify-center bg-white/20">
        <BotIcon className="w-5 h-5" />
      </div>
      <div className={cn("font-medium", fontStyle)}>
        {botName}
        {apiKeyStatus === 'not-set' && (
          <span className="ml-2 text-xs opacity-70">(Demo Mode)</span>
        )}
        {apiKeyStatus === 'checking' && (
          <span className="ml-2 text-xs opacity-70">(Checking API...)</span>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
