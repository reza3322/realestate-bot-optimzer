import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '../button';
import { BotIcon } from './BotIcon';
import { Message, ChatTheme } from './types';

interface ChatMessageProps {
  message: Message;
  index: number;
  styles: ChatTheme;
  botIconName?: string;
  customBotIconStyle?: React.CSSProperties;
  customUserBubbleStyle?: React.CSSProperties;
}

const ChatMessage = ({
  message,
  index,
  styles,
  botIconName = 'bot',
  customBotIconStyle = {},
  customUserBubbleStyle = {}
}: ChatMessageProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="flex items-start gap-2">
      {message.role === 'bot' ? (
        <>
          <div className={cn("flex-shrink-0", styles.botIcon)} style={customBotIconStyle}>
            <BotIcon iconName={botIconName} className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className={cn("relative inline-block", styles.botBubble)}>
              <p className={styles.font}>{message.content}</p>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 p-1"
                onClick={handleCopyClick}
              >
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex-grow"></div>
          <div className="flex flex-col items-end">
            <div className={cn("relative inline-block", styles.userBubble)} style={customUserBubbleStyle}>
              <p className={styles.font}>{message.content}</p>
            </div>
          </div>
          <div className={cn("flex-shrink-0", styles.userIcon)}>
            <BotIcon iconName="user" className="w-4 h-4" />
          </div>
        </>
      )}
    </div>
  );
};

export default ChatMessage;
