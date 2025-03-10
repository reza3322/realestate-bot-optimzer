
import { supabase } from "@/lib/supabase";
import { ChatbotResponse, Message } from "./types";

export const searchTrainingData = async (
  query: string,
  userId: string,
  options: {
    includeQA?: boolean;
    includeFiles?: boolean;
    includeProperties?: boolean;
    maxResults?: number;
  } = {}
) => {
  const { includeQA = true, includeFiles = true, includeProperties = true, maxResults = 5 } = options;
  
  try {
    const { data, error } = await supabase.functions.invoke('search-training-data', {
      body: { 
        query,
        userId,
        includeQA,
        includeFiles,
        includeProperties,
        maxResults
      }
    });

    if (error) {
      console.error("Error searching training data:", error);
      throw error;
    }

    const { qa_matches: qaMatches, file_content: fileContent, property_listings: propertyListings } = data || {};
    
    return {
      qaMatches: qaMatches || [],
      fileContent: fileContent || [],
      propertyListings: Array.isArray(propertyListings) ? propertyListings : []
    };
  } catch (error) {
    console.error("Error searching training data:", error);
    return {
      qaMatches: [],
      fileContent: [],
      propertyListings: []
    };
  }
};

/**
 * Test the chatbot response functionality
 */
export const testChatbotResponse = async (
  message: string, 
  userId: string,
  visitorInfo: any = {},
  conversationId?: string,
  previousMessages: Message[] = []
): Promise<ChatbotResponse> => {
  try {
    // Call the Supabase Edge Function to get a response
    const { data, error } = await supabase.functions.invoke('chatbot-response', {
      body: {
        message,
        userId,
        visitorInfo,
        conversationId,
        previousMessages: previousMessages.map(msg => ({
          role: msg.role === 'bot' ? 'assistant' : 'user',
          content: msg.content
        }))
      }
    });

    if (error) {
      console.error("Error getting chatbot response:", error);
      return { 
        response: "Sorry, there was an error processing your request.",
        error: error.message
      };
    }

    return data || { response: "No response from the server" };
  } catch (error) {
    console.error("Exception getting chatbot response:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { 
      response: "Sorry, there was an unexpected error.",
      error: errorMessage
    };
  }
};
