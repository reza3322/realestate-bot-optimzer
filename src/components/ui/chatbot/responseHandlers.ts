
import { Message, ChatbotResponse } from './types';

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
): Promise<{ response: string; error?: string; source?: 'ai' | 'training' }> => {
  try {
    console.log(`Sending message to chatbot API: "${message}" for user: ${userId}`);
    
    // Hardcoded values instead of using process.env which isn't available in browser
    const supabaseUrl = 'https://ckgaqkbsnrvccctqxsqv.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ2Fxa2JzbnJ2Y2NjdHF4c3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwMTEyODksImV4cCI6MjA1NjU4NzI4OX0.z62BR5psK8FBR5lfqbnpbFMfQLKgzFCisqDiuWg4MKM';

    if (!supabaseUrl) {
      console.error('Supabase URL is undefined');
      return { response: '', error: 'Supabase URL is not configured' };
    }

    console.log(`Making request to: ${supabaseUrl}/functions/v1/chatbot-response`);
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/chatbot-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          message,
          userId,
          conversationId: 'test-' + Date.now(),
        }),
      });

      // Log response details for debugging
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            console.error('JSON error response:', errorData);
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error('Error parsing JSON error response:', e);
          }
        } else {
          // If not JSON, try to get text
          try {
            const errorText = await response.text();
            console.error('Non-JSON error response:', errorText);
            errorMessage = `Server error: ${response.status} - ${errorText.substring(0, 100)}`;
          } catch (e) {
            console.error('Error getting response text:', e);
          }
        }
        
        console.error('Test chatbot error:', errorMessage);
        return { response: '', error: errorMessage };
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response received:', contentType);
        const text = await response.text();
        console.error('Response text (first 200 chars):', text.substring(0, 200));
        return { response: '', error: 'Invalid response format from server' };
      }

      const data = await response.json();
      console.log('Successful response from chatbot API:', data);
      
      return { 
        response: data.response,
        source: data.source || 'ai'
      };
    } catch (fetchError) {
      console.error('Fetch error calling Edge Function:', fetchError);
      return { 
        response: '', 
        error: 'Network error connecting to chatbot API: ' + fetchError.message 
      };
    }
  } catch (error) {
    console.error('Test chatbot exception:', error);
    return { 
      response: '', 
      error: error instanceof Error ? error.message : 'Network error connecting to chatbot API' 
    };
  }
};
