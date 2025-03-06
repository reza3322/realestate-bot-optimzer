
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Send, MessageCircle } from "lucide-react";
import { ChatStylesType } from './chatbot/chatStyles';

interface ChatbotDemoProps {
  apiKeyStatus?: "valid" | "invalid" | "not-set";
}

const ChatbotDemo = ({ apiKeyStatus = "not-set" }: ChatbotDemoProps) => {
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([
    { sender: 'bot', text: 'Hi there! How can I help you find your dream home today?' }
  ]);
  const [input, setInput] = useState('');
  
  // Define styles that match the ChatStylesType structure
  const styles: ChatStylesType = {
    chatWindow: {
      width: '100%',
      height: '400px',
      borderRadius: '0.5rem',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'white',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    },
    messageList: {
      flex: 1,
      overflowY: 'auto',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    },
    messageUser: {
      alignSelf: 'flex-end',
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '0.5rem 1rem',
      borderRadius: '1rem 1rem 0 1rem',
      maxWidth: '80%',
    },
    messageBot: {
      alignSelf: 'flex-start',
      backgroundColor: '#f3f4f6',
      color: '#1f2937',
      padding: '0.5rem 1rem',
      borderRadius: '1rem 1rem 1rem 0',
      maxWidth: '80%',
    },
    inputArea: {
      display: 'flex',
      padding: '0.5rem',
      borderTop: '1px solid #e5e7eb',
      backgroundColor: 'white',
    },
    input: {
      flex: 1,
      border: 'none',
      padding: '0.5rem',
      outline: 'none',
    },
    sendButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '0.25rem',
      padding: '0.5rem 1rem',
      cursor: 'pointer',
    },
    headerStyle: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.75rem 1rem',
      backgroundColor: '#3b82f6',
      color: 'white',
      borderBottom: '1px solid #e5e7eb',
    }
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text: input }]);
    
    // Simulate bot response
    setTimeout(() => {
      if (apiKeyStatus === "invalid") {
        setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I cannot respond right now due to an API configuration issue.' }]);
      } else {
        let response = "I'd be happy to help you find a property! Could you tell me more about what you're looking for? What area are you interested in?";
        
        if (input.toLowerCase().includes('price')) {
          response = "Our properties range from $200,000 to $1.5M depending on location, size, and amenities. Do you have a specific budget in mind?";
        } else if (input.toLowerCase().includes('bedroom') || input.toLowerCase().includes('bath')) {
          response = "We have properties ranging from studios to 5-bedroom houses. How many bedrooms are you looking for?";
        }
        
        setMessages(prev => [...prev, { sender: 'bot', text: response }]);
      }
    }, 1000);
    
    // Clear input
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div style={styles.chatWindow}>
      <div style={styles.headerStyle}>
        <div className="flex items-center gap-2">
          <MessageCircle size={20} />
          <span className="font-medium">RealHome Assistant</span>
        </div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-blue-600">
          <ChevronDown size={20} />
        </Button>
      </div>
      
      <div style={styles.messageList}>
        {messages.map((message, index) => (
          <div 
            key={index} 
            style={message.sender === 'user' ? styles.messageUser : styles.messageBot}
          >
            {message.text}
          </div>
        ))}
      </div>
      
      <div style={styles.inputArea}>
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Button size="sm" onClick={sendMessage}>
          <Send size={16} className="mr-1" />
          Send
        </Button>
      </div>
    </div>
  );
};

export default ChatbotDemo;
