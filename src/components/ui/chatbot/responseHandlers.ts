
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
