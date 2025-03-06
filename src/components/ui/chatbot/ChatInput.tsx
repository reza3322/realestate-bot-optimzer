
import React, { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  inputContainerStyle?: string;
  placeholderText?: string;
  buttonStyle?: React.CSSProperties;
}

const ChatInput = ({ 
  onSendMessage, 
  inputContainerStyle = '',
  placeholderText = 'Type your message...',
  buttonStyle
}: ChatInputProps) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn('flex gap-2 items-center p-4', inputContainerStyle)}>
      <input
        type="text"
        placeholder={placeholderText}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800"
      />
      <button
        onClick={handleSend}
        className="p-2 rounded-md text-white"
        style={buttonStyle || { backgroundColor: '#3b82f6' }}
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ChatInput;
