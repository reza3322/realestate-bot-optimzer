
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { SendIcon } from 'lucide-react';

interface ChatInputProps {
  inputContainerStyle: string;
  onSendMessage: (message: string) => void;
  placeholderText?: string;
}

const ChatInput = ({ inputContainerStyle, onSendMessage, placeholderText = "Type your message..." }: ChatInputProps) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className={cn("p-3", inputContainerStyle)}
    >
      <div className="relative flex items-center">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholderText}
          className="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="absolute right-2 p-1 text-blue-500 rounded-full hover:bg-blue-50"
          disabled={!inputValue.trim()}
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
};

export default ChatInput;
