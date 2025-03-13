import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { BotIcon } from './BotIcon';
import { cn } from '@/lib/utils';
import { Message, ChatStylesType } from './types';
import ReactMarkdown from 'react-markdown';

export interface ChatMessageProps {
  message: Message;
  index: number;
  styles: ChatStylesType;
  botIconName?: string;
  customBotIconStyle?: React.CSSProperties;
  customUserBubbleStyle?: React.CSSProperties;
  conversationId?: string;
}

const ChatMessage = ({ 
  message, 
  index, 
  styles,
  botIconName = 'bot',
  customBotIconStyle,
  customUserBubbleStyle,
  conversationId
}: ChatMessageProps) => {
  const [visible, setVisible] = useState(false);
  
  // Fade in animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Fix URL handling to keep links within the chat window
  const fixUrls = (content: string): string => {
    // Replace external URLs in markdown links with internal routes
    // This keeps property URLs within the application
    let fixedContent = content;
    
    // First fix markdown links
    fixedContent = fixedContent.replace(
      /\[([^\]]+)\]\(https?:\/\/[^)]+\/property\/([a-zA-Z0-9-]+)\)/g, 
      '[$1](./property/$2)'
    );
    
    // Also fix any other property URLs
    fixedContent = fixedContent.replace(
      /https?:\/\/[^)\s]+\/property\/([a-zA-Z0-9-]+)/g, 
      './property/$1'
    );
    
    return fixedContent;
  };
  
  return (
    <div
      className={cn(
        "flex items-start gap-3 transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      {message.role === 'bot' && (
        <div 
          className={cn(styles.botIcon)}
          style={customBotIconStyle}
        >
          <BotIcon iconName={botIconName} className="h-5 w-5" />
        </div>
      )}
      
      <div 
        className={cn(
          message.role === 'user' ? styles.userBubble : styles.botBubble,
          "chatbot-message"
        )}
        style={message.role === 'user' ? customUserBubbleStyle : {}}
      >
        {message.role === 'user' ? (
          message.content
        ) : (
          <ReactMarkdown
            components={{
              a: ({ node, ...props }) => {
                // Handle links to ensure they stay within the application
                const href = props.href || '';
                const isPropertyLink = href.includes('property/');
                
                return (
                  <a 
                    {...props} 
                    href={href}
                    target={isPropertyLink ? "_self" : "_blank"} 
                    rel="noopener noreferrer"
                    className="text-blue-500 underline hover:text-blue-700 transition-colors" 
                    // Use data attributes to store property info for context
                    data-conversation-id={isPropertyLink ? conversationId : undefined}
                    onClick={(e) => {
                      if (isPropertyLink) {
                        // Prevent default and handle within the app
                        e.preventDefault();
                        console.log(`Clicked property link: ${href}`);
                        // You could handle this with a router or state management
                      }
                    }}
                  />
                );
              },
              p: ({ node, ...props }) => (
                <p {...props} className="mb-3" />
              ),
              ul: ({ node, ...props }) => (
                <ul {...props} className="list-disc pl-5 mb-3" />
              ),
              ol: ({ node, ...props }) => (
                <ol {...props} className="list-decimal pl-5 mb-3" />
              ),
              li: ({ node, ...props }) => (
                <li {...props} className="mb-1" />
              ),
              strong: ({ node, ...props }) => (
                <strong {...props} className="font-semibold" />
              ),
              em: ({ node, ...props }) => (
                <em {...props} className="italic" />
              ),
              h2: ({ node, ...props }) => (
                <h2 {...props} className="text-lg font-bold mt-4 mb-2" />
              ),
              h3: ({ node, ...props }) => (
                <h3 {...props} className="text-md font-bold mt-3 mb-2" />
              )
            }}
          >
            {fixUrls(message.content)}
          </ReactMarkdown>
        )}
      </div>
      
      {message.role === 'user' && (
        <div className={cn(styles.userIcon)}>
          <User className="h-5 w-5" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
