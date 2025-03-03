
import { Message } from './types';

// Demo responses for testing the chatbot
export const demoResponses = [
  "I'd be happy to help you find a property. What's your budget range?",
  "Great! And what neighborhoods are you interested in?",
  "I've found 3 properties that match your criteria. Would you like to schedule a viewing?",
  "Perfect! I've notified your agent and scheduled a viewing for Saturday at 2pm. You'll receive a confirmation email shortly."
];

export const getResponseForMessage = (messages: Message[]): string => {
  const responseIndex = Math.min(messages.length - 1, demoResponses.length - 1);
  return demoResponses[responseIndex];
};

// Custom hook for demo response generation
export const useDemoResponse = () => {
  const generateDemoResponse = async (message: string): Promise<string> => {
    // Simple logic for demo purposes
    // In a real app, this would call an API
    
    // Get a random response from the demo responses
    const randomIndex = Math.floor(Math.random() * demoResponses.length);
    return demoResponses[randomIndex];
  };

  return { generateDemoResponse };
};
