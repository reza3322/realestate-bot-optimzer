
import { supabase } from "@/lib/supabase";
import { ChatbotResponse, Message, PropertySearchParams } from "./types";

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
 * Search for properties based on specific criteria
 */
export const searchProperties = async (
  userId: string,
  params: PropertySearchParams
): Promise<any[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('search-properties', {
      body: { 
        userId,
        searchParams: params
      }
    });

    if (error) {
      console.error("Error searching properties:", error);
      return [];
    }

    return data?.properties || [];
  } catch (error) {
    console.error("Error searching properties:", error);
    return [];
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

/**
 * Format property recommendations into a structured, markdown-friendly format
 */
export const formatPropertyRecommendations = (recommendations: any[], maxResults = 3) => {
  if (!recommendations || recommendations.length === 0) return "";
  
  // Limit to max number of results (default 3)
  const limitedRecommendations = recommendations.slice(0, maxResults);
  
  let formattedResponse = "Here are **" + limitedRecommendations.length + " properties** that match what you're looking for:\n\n";
  
  limitedRecommendations.forEach(property => {
    // Format price
    const price = typeof property.price === 'number' 
      ? new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(property.price)
      : property.price;
    
    // Create property listing
    formattedResponse += `🏡 **${property.title} – ${price}**\n`;
    formattedResponse += `📍 **${property.location || property.city && property.state ? `${property.city}, ${property.state}` : 'Location available upon request'}**\n`;
    
    // Build features list
    let features = [];
    if (property.bedrooms) features.push(`${property.bedrooms} Bedrooms`);
    if (property.bathrooms) features.push(`${property.bathrooms} Bathrooms`);
    if (property.livingArea) features.push(`${property.livingArea} m² Living Area`);
    if (property.plotArea) features.push(`${property.plotArea} m² Plot`);
    if (property.terrace) features.push(`${property.terrace} m² Terrace`);
    if (property.hasPool) features.push(`Private Pool`);
    
    // Add features as bullet points
    if (features.length > 0) {
      formattedResponse += `✅ ${features.join(', ')}\n`;
    } else if (property.features && property.features.length > 0) {
      formattedResponse += `✅ ${Array.isArray(property.features) ? property.features.join(', ') : property.features}\n`;
    }
    
    // Add highlight if available
    if (property.highlight) {
      formattedResponse += `✨ ${property.highlight}\n`;
    }
    
    // Add URL if available
    if (property.url) {
      formattedResponse += `🔗 [View Listing](${property.url})\n`;
    }
    
    formattedResponse += "\n";
  });
  
  formattedResponse += "Would you like to **schedule a viewing** or hear about **more options**? 😊";
  
  return formattedResponse;
};
