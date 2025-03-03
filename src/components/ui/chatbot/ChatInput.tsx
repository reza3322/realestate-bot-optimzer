
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SendIcon } from 'lucide-react';
import { useState } from 'react';

interface ChatInputProps {
  inputContainerStyle: string;
  onSendMessage: (message: string) => void;
}

const ChatInput = ({ inputContainerStyle, onSendMessage }: ChatInputProps) => {
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn(
      "p-4",
      inputContainerStyle
    )}>
      <div className="flex items-center gap-2">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="flex-1 min-h-10 max-h-24 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          rows={1}
        />
        <Button 
          type="button" 
          size="icon" 
          onClick={handleSend}
          disabled={!inputValue.trim()}
        >
          <SendIcon className="h-4 w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
