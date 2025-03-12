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
    let leadInfo = visitorInfo;
    let shouldCaptureLeadInfo = false;
    
    // Check if the message seems to be asking about properties or contains potential lead information
    const isPropertyQuery = message.toLowerCase().match(/propert(y|ies)|house|apartment|villa|home|buy|rent|sale/i);
    const isPotentialLeadInfo = message.toLowerCase().match(/name|email|phone|call|contact|reach|interested/i);
    
    if (isPropertyQuery) {
      console.log("Message appears to be about real estate, searching for properties");
      shouldCaptureLeadInfo = true;
      
      // Extract search parameters from the message
      const searchParams = extractPropertySearchParams(message);
      
      // Search for properties in the user's database
      propertyRecommendations = await searchProperties(userId, searchParams);
      console.log(`Found ${propertyRecommendations.length} property recommendations`);
    }
    
    // Extract potential lead information from the message
    if (isPotentialLeadInfo || isPropertyQuery) {
      const extractedInfo = extractLeadInformation(message, leadInfo);
      if (extractedInfo) {
        leadInfo = { ...leadInfo, ...extractedInfo };
        console.log("Extracted lead information:", extractedInfo);
      }
    }
    
    // Format previous messages for API
    const formattedPreviousMessages = previousMessages.map(msg => ({
      role: msg.role === 'bot' ? 'assistant' : 'user',
      content: msg.content
    }));
    
    console.log(`Sending ${formattedPreviousMessages.length} previous messages for context`);
    
    // Call the Supabase Edge Function to get a response
    const { data, error } = await supabase.functions.invoke('chatbot-response', {
      body: {
        message,
        userId,
        visitorInfo: leadInfo,
        conversationId,
        previousMessages: formattedPreviousMessages,
        // Pass the property recommendations we found directly to the chatbot
        propertyRecommendations,
        shouldCaptureLeadInfo
      }
    });

    if (error) {
      console.error("Error getting chatbot response:", error);
      return { 
        response: "Sorry, there was an error processing your request.",
        error: error.message
      };
    }

    // If we have any new lead information, include it in the response
    if (leadInfo && Object.keys(leadInfo).length > 0) {
      return {
        ...data,
        leadInfo
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
      minPrice = String(parseFloat(minPrice) * 1000);
    } else if (lowerMessage.includes('m')) {
      minPrice = String(parseFloat(minPrice) * 1000000);
    }
    params.minPrice = parseFloat(minPrice);
  }
  
  const maxPriceRegex = /(?:up to|max|under|below|less than)\s*(?:€|euro|eur|£|\$|usd|dollar)?[ ]?(\d+[,.]\d+|\d+)[ ]?(?:€|euro|eur|£|\$|usd|dollar|k|m)?/i;
  const maxPriceMatch = lowerMessage.match(maxPriceRegex);
  if (maxPriceMatch) {
    let maxPrice = maxPriceMatch[1].replace(',', '');
    if (lowerMessage.includes('k')) {
      maxPrice = String(parseFloat(maxPrice) * 1000);
    } else if (lowerMessage.includes('m')) {
      maxPrice = String(parseFloat(maxPrice) * 1000000);
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
 * Extract lead information from a message
 */
export const extractLeadInformation = (message: string, existingInfo: any = {}): any => {
  const leadInfo: any = {};
  
  // Extract email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatch = message.match(emailRegex);
  if (emailMatch && !existingInfo.email) {
    leadInfo.email = emailMatch[0];
  }
  
  // Extract phone number (various formats)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phoneMatch = message.match(phoneRegex);
  if (phoneMatch && !existingInfo.phone) {
    leadInfo.phone = phoneMatch[0];
  }
  
  // Extract names - this is more complex and could lead to false positives
  // Look for phrases like "my name is" or "I am"
  const nameRegex = /(?:my name is|I am|I'm) ([A-Z][a-z]+ [A-Z][a-z]+)/i;
  const nameMatch = message.match(nameRegex);
  if (nameMatch && !existingInfo.firstName) {
    const fullName = nameMatch[1].split(' ');
    if (fullName.length >= 2) {
      leadInfo.firstName = fullName[0];
      leadInfo.lastName = fullName.slice(1).join(' ');
    }
  }
  
  // Extract budget - look for currency amounts in context of budget
  const budgetRegex = /(?:budget|afford|looking|spend|price range|range).*?(?:€|euro|eur|£|\$|usd|dollars?)?[ ]?(\d+[,.]\d+|\d+)[ ]?(?:k|m|million|thousand|€|euro|eur|£|\$|usd|dollars?)/i;
  const budgetMatch = message.match(budgetRegex);
  if (budgetMatch && !existingInfo.budget) {
    let budget = budgetMatch[1].replace(',', '');
    const budgetText = budgetMatch[0].toLowerCase();
    
    if (budgetText.includes('k') || budgetText.includes('thousand')) {
      budget = String(parseFloat(budget) * 1000);
    } else if (budgetText.includes('m') || budgetText.includes('million')) {
      budget = String(parseFloat(budget) * 1000000);
    }
    
    leadInfo.budget = budget;
  }
  
  // Extract property interest if mentioned
  const propertyTypeRegex = /(villa|apartment|penthouse|house|condo|flat|studio)/i;
  const propertyMatch = message.match(propertyTypeRegex);
  if (propertyMatch && !existingInfo.propertyInterest) {
    leadInfo.propertyInterest = propertyMatch[0];
  }
  
  return Object.keys(leadInfo).length > 0 ? leadInfo : null;
};

/**
 * Format property recommendations into a structured, markdown-friendly format
 */
export const formatPropertyRecommendations = (recommendations: any[], maxResults = 2) => {
  if (!recommendations || recommendations.length === 0) return "";
  
  // Limit to max number of results (default now 2)
  const limitedRecommendations = recommendations.slice(0, maxResults);
  
  let formattedResponse = "Here are **" + limitedRecommendations.length + " properties** that match what you're looking for:\n\n";
  
  limitedRecommendations.forEach((property, index) => {
    // Format price
    const price = typeof property.price === 'number' 
      ? new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(property.price)
      : property.price;
    
    // Get the property title or create one
    const title = property.title || `${property.type || 'Property'} in ${property.city || 'Exclusive Location'}`;
    
    // Create property listing with the exact requested format (but more concise)
    formattedResponse += `🏡 **${title} – ${price}**\n`;
    formattedResponse += `📍 **${property.location || (property.city && property.state ? `${property.city}, ${property.state}` : 'Exclusive Location')}**\n`;
    
    // Build features list - limited to 3 max features
    let features = [];
    if (property.bedrooms) features.push(`${property.bedrooms} Bed`);
    if (property.bathrooms) features.push(`${property.bathrooms} Bath`);
    if (property.has_pool) features.push(`Pool`);
    
    // Add features as a single line with commas - more concise
    if (features.length > 0) {
      formattedResponse += `✅ ${features.join(', ')}\n`;
    } else if (property.features && property.features.length > 0) {
      // Limit features to first 3
      const limitedFeatures = Array.isArray(property.features) ? 
        property.features.slice(0, 3).join(', ') : 
        property.features.split(',').slice(0, 3).join(',');
      formattedResponse += `✅ ${limitedFeatures}\n`;
    }
    
    // URL
    if (property.url) {
      formattedResponse += `🔗 [View Listing](${property.url})\n\n`;
    } else {
      // Use property ID if available, otherwise use a placeholder
      const listingId = property.id ? property.id.substring(0, 6) : (10000 + index);
      formattedResponse += `🔗 [View Listing](https://youragency.com/listing/${listingId})\n\n`;
    }
  });
  
  formattedResponse += "Would you like to see more options or schedule a viewing?";
  
  return formattedResponse;
};
