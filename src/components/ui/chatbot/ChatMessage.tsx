
import React from 'react';
import { User, Bot } from 'lucide-react';
import BotIcon from './BotIcon';
import { Message, ChatStylesType } from './types';

interface ChatMessageProps {
  message: Message;
  index: number;
  styles: ChatStylesType;
  botIconName?: string;
  customBotIconStyle?: React.CSSProperties;
  customUserBubbleStyle?: React.CSSProperties;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  index, 
  styles,
  botIconName = 'bot',
  customBotIconStyle,
  customUserBubbleStyle
}) => {
  const isUser = message.role === 'user';
  
  return (
    <div 
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      data-message-index={index}
    >
      {isUser ? (
        <div className={`flex-shrink-0 ${styles.userIcon}`}>
          <User className="h-5 w-5" />
        </div>
      ) : (
        <div className={`flex-shrink-0 ${styles.botIcon}`} style={customBotIconStyle}>
          <BotIcon iconName={botIconName} className="h-5 w-5" />
        </div>
      )}
      
      <div 
        className={`${isUser ? styles.userBubble : styles.botBubble} max-w-[75%] ${styles.font}`}
        style={isUser ? customUserBubbleStyle : undefined}
      >
        {message.content}
      </div>
    </div>
  );
};

export default ChatMessage;
