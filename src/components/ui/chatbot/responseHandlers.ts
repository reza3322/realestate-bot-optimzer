
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
    console.log(`Searching properties with params:`, params);
    
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

    console.log(`Found ${data?.properties?.length || 0} properties in database`);
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
    // First, explicitly search for property recommendations
    let propertyRecommendations = [];
    
    // Only search for properties if the message seems to be asking about real estate
    if (message.toLowerCase().match(/propert(y|ies)|house|apartment|villa|home|buy|rent|sale/i)) {
      console.log("Message appears to be about real estate, searching for properties");
      
      // Extract search parameters from the message
      const searchParams = extractPropertySearchParams(message);
      
      // Search for properties in the user's database
      propertyRecommendations = await searchProperties(userId, searchParams);
      console.log(`Found ${propertyRecommendations.length} property recommendations`);
    }
    
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
        })),
        // Pass the property recommendations we found directly to the chatbot
        propertyRecommendations
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
 * Extract property search parameters from a message
 */
export const extractPropertySearchParams = (message: string): PropertySearchParams => {
  const lowerMessage = message.toLowerCase();
  
  // Default search parameters
  const params: PropertySearchParams = {
    maxResults: 3
  };
  
  // Extract location
  const locationMatches = [
    { regex: /in\s+([a-zA-Z\s]+?)(?:,|\s|$|\?|\.)/i, group: 1 },
    { regex: /(?:marbella|ibiza|malaga|madrid|barcelona|valencia|seville|granada)/gi, group: 0 }
  ];
  
  for (const match of locationMatches) {
    const locationMatch = lowerMessage.match(match.regex);
    if (locationMatch) {
      params.location = locationMatch[match.group];
      break;
    }
  }
  
  // Extract property type
  const typeRegex = /(villa|apartment|penthouse|house|condo|flat|studio)/gi;
  const typeMatch = lowerMessage.match(typeRegex);
  if (typeMatch) {
    params.type = typeMatch[0].toLowerCase();
  }
  
  // Extract price range
  const minPriceRegex = /(?:from|min|above|over|more than)\s*(?:€|euro|eur|£|\$|usd|dollar)?[ ]?(\d+[,.]\d+|\d+)[ ]?(?:€|euro|eur|£|\$|usd|dollar|k|m)?/i;
  const minPriceMatch = lowerMessage.match(minPriceRegex);
  if (minPriceMatch) {
    let minPrice = minPriceMatch[1].replace(',', '');
    if (lowerMessage.includes('k')) {
      minPrice = parseFloat(minPrice) * 1000;
    } else if (lowerMessage.includes('m')) {
      minPrice = parseFloat(minPrice) * 1000000;
    }
    params.minPrice = parseFloat(minPrice);
  }
  
  const maxPriceRegex = /(?:up to|max|under|below|less than)\s*(?:€|euro|eur|£|\$|usd|dollar)?[ ]?(\d+[,.]\d+|\d+)[ ]?(?:€|euro|eur|£|\$|usd|dollar|k|m)?/i;
  const maxPriceMatch = lowerMessage.match(maxPriceRegex);
  if (maxPriceMatch) {
    let maxPrice = maxPriceMatch[1].replace(',', '');
    if (lowerMessage.includes('k')) {
      maxPrice = parseFloat(maxPrice) * 1000;
    } else if (lowerMessage.includes('m')) {
      maxPrice = parseFloat(maxPrice) * 1000000;
    }
    params.maxPrice = parseFloat(maxPrice);
  }
  
  // Extract bedrooms
  const bedroomsRegex = /(\d+)\s*(?:bed|bedroom|br)/i;
  const bedroomsMatch = lowerMessage.match(bedroomsRegex);
  if (bedroomsMatch) {
    params.bedrooms = parseInt(bedroomsMatch[1]);
  }
  
  // Extract pool preference
  if (lowerMessage.includes('pool') || lowerMessage.includes('swimming')) {
    params.hasPool = true;
  }
  
  // Extract style preferences
  const styleKeywords = {
    'modern': ['modern', 'contemporary', 'minimalist', 'sleek'],
    'classic': ['classic', 'traditional', 'mediterranean', 'rustic', 'spanish'],
    'luxury': ['luxury', 'high-end', 'premium', 'exclusive']
  };
  
  for (const [style, keywords] of Object.entries(styleKeywords)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      params.style = style;
      break;
    }
  }
  
  console.log("Extracted property search parameters:", params);
  return params;
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
    formattedResponse += `📍 **${property.location || (property.city && property.state ? `${property.city}, ${property.state}` : 'Location available upon request')}**\n`;
    
    // Build features list
    let features = [];
    if (property.bedrooms) features.push(`${property.bedrooms} Bedrooms`);
    if (property.bathrooms) features.push(`${property.bathrooms} Bathrooms`);
    if (property.living_area) features.push(`${property.living_area} m² Living Area`);
    if (property.plot_area) features.push(`${property.plot_area} m² Plot`);
    if (property.terrace) features.push(`${property.terrace} m² Terrace`);
    if (property.has_pool) features.push(`Private Pool`);
    
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
