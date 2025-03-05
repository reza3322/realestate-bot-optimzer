
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp } from 'lucide-react';

interface ChatInputProps {
  inputContainerStyle: string;
  inputFieldStyle?: string;
  sendButtonStyle?: string;
  onSendMessage: (message: string) => void;
  placeholderText?: string;
}

const ChatInput = ({ 
  inputContainerStyle, 
  inputFieldStyle = 'px-5 py-3 rounded-full bg-white text-gray-700 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500',
  sendButtonStyle = 'absolute right-2 p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50',
  onSendMessage, 
  placeholderText = "Type your message here..." 
}: ChatInputProps) => {
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
          className={cn("w-full", inputFieldStyle)}
        />
        <button
          type="submit"
          className={cn(sendButtonStyle)}
          disabled={!inputValue.trim()}
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};

export default ChatInput;
