
import { Message } from './types';

// Demo responses for testing the chatbot
export const demoResponses = [
  "I'd be happy to help you find a property. What's your budget range?",
  "Great! And what neighborhoods are you interested in?",
  "I've found 3 properties that match your criteria. Would you like to schedule a viewing?",
  "Perfect! I've notified your agent and scheduled a viewing for Saturday at 2pm. You'll receive a confirmation email shortly.",
  "Our agents specialize in luxury properties in downtown and suburban areas.",
  "Yes, we have several properties with pools available right now.",
  "The average price in that neighborhood has increased by 12% over the last year.",
  "I can help you get pre-approved for a mortgage through our partner lenders."
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
    
    // Add a small delay to simulate thinking
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(demoResponses[randomIndex]);
      }, 500);
    });
  };

  return { generateDemoResponse };
};

// Function to test chatbot with real OpenAI API
export const testChatbotResponse = async (
  message: string,
  userId: string
): Promise<{ response: string; error?: string }> => {
  try {
    const response = await fetch('/api/v1/chatbot-response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        userId,
        conversationId: 'test-' + Date.now(),
      }),
    });

    if (!response.ok) {
      let errorMessage = `Server error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If we can't parse JSON, try to get text
        const errorText = await response.text();
        errorMessage = `Server error: ${response.status} - ${errorText.substring(0, 100)}`;
      }
      console.error('Test chatbot error:', errorMessage);
      return { response: '', error: errorMessage };
    }

    const data = await response.json();
    return { response: data.response };
  } catch (error) {
    console.error('Test chatbot exception:', error);
    return { 
      response: '', 
      error: error instanceof Error ? error.message : 'Network error connecting to chatbot API' 
    };
  }
};
