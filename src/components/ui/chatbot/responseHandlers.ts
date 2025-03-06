
import { supabase } from '@/lib/supabase';
import { ChatbotResponse, Message } from './types';

export const getAIResponse = async (
  message: string, 
  userId?: string, 
  visitorId?: string,
  conversationId?: string,
  previousMessages?: Message[]
): Promise<ChatbotResponse> => {
  try {
    // Prepare the request to the Edge Function
    const response = await supabase.functions.invoke('chatbot-response', {
      body: {
        message,
        userId,
        visitorId,
        conversationId,
        previousMessages
      }
    });
    
    if (response.error) {
      console.error('Error from Edge Function:', response.error);
      return { 
        response: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        source: 'ai'
      };
    }
    
    return {
      response: response.data.response,
      suggestedFollowUp: response.data.suggestedFollowUp,
      conversationId: response.data.conversationId,
      isQualifying: response.data.isQualifying,
      source: 'ai'
    };
  } catch (error) {
    console.error('Error getting AI response:', error);
    return {
      response: "I'm sorry, I encountered an error while processing your request. Please try again later.",
      source: 'ai'
    };
  }
};

export const getTrainingResponse = async (
  message: string,
  userId: string
): Promise<ChatbotResponse | null> => {
  try {
    // You could implement a training response handler here
    // This would be used to get responses from the training data
    // For now, we'll just return null to fall back to the AI response
    return null;
  } catch (error) {
    console.error('Error getting training response:', error);
    return null;
  }
};
