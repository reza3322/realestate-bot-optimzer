
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
    // Convert the Message[] to the format expected by the Edge Function
    const formattedMessages = previousMessages?.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    // Prepare the request to the Edge Function
    const response = await supabase.functions.invoke('chatbot-response', {
      body: {
        message,
        userId,
        visitorId,
        conversationId,
        previousMessages: formattedMessages
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

// Adding this function to fix the build error
export const testChatbotResponse = async (
  message: string,
  userId?: string
): Promise<{ response: string; error?: string }> => {
  try {
    // This is a simplified test version
    const response = await getAIResponse(message, userId);
    return { response: response.response };
  } catch (error) {
    console.error('Error in test chatbot response:', error);
    return { 
      response: "I'm sorry, I encountered an error processing your request.",
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const getTrainingResponse = async (
  message: string,
  userId: string
): Promise<ChatbotResponse | null> => {
  try {
    // Query the training data to find relevant responses
    const { data } = await supabase
      .from('chatbot_training_data')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: false });
    
    if (!data || data.length === 0) {
      return null;
    }
    
    // Simple matching logic - look for keywords in the question
    const lowerMessage = message.toLowerCase();
    const matchedItem = data.find(item => {
      // Check if message includes keywords from the training question
      const keywords = item.question.toLowerCase().split(' ');
      const significantKeywords = keywords.filter(word => word.length > 3);
      return significantKeywords.some(keyword => lowerMessage.includes(keyword));
    });
    
    if (matchedItem) {
      return {
        response: matchedItem.answer,
        source: 'training'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting training response:', error);
    return null;
  }
};
