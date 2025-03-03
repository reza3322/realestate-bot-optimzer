
import { useState, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  inputContainerStyle?: string;
  onSendMessage: (message: string) => void;
  placeholderText?: string;
}

const ChatInput = ({ 
  inputContainerStyle, 
  onSendMessage,
  placeholderText = "Type a message..." 
}: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent event from bubbling up
    }
    
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation(); // Prevent event from bubbling up
      handleSubmit();
    }
  };

  return (
    <div className={cn(
      "border-t p-3 flex items-center gap-2",
      inputContainerStyle
    )}>
      <input
        ref={inputRef}
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholderText}
        className="flex-1 bg-transparent border border-input rounded-md h-10 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <button
        onClick={(e) => handleSubmit(e)}
        disabled={!message.trim()}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors h-10 w-10",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          message.trim() 
            ? "text-primary-foreground bg-primary hover:bg-primary/90" 
            : "text-muted-foreground bg-secondary hover:bg-secondary/80"
        )}
      >
        <Send className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ChatInput;
