
import { Message, PropertyRecommendation } from './types';

/**
 * Simulate a chatbot response for demo/testing purposes.
 */
export const testChatbotResponse = async (
  message: string,
  userId: string,
  visitorInfo?: any,
  conversationId?: string,
  previousMessages: Message[] = []
) => {
  try {
    // Call the Supabase Edge Function that searches for training data matches
    const trainingResponse = await fetch(
      'https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/search-training-data',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: message,
          userId,
          conversationId,
          includeQA: true,
          includeFiles: true,
          includeProperties: true,
          maxResults: 3,
          previousMessages // Pass previous messages for better context
        }),
      }
    );

    if (!trainingResponse.ok) {
      throw new Error(`Training data search failed: ${trainingResponse.statusText}`);
    }

    const trainingResults = await trainingResponse.json();
    console.log('Training search results:', trainingResults);

    // Get conversation history
    let conversationHistory = [];
    if (conversationId) {
      const historyResponse = await fetch(
        'https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/get-conversation-history',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId,
            userId,
            limit: 10
          }),
        }
      );
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        conversationHistory = historyData.messages || [];
        console.log('Conversation history retrieved:', conversationHistory.length, 'messages');
      }
    }

    // Check if the message is about locations or properties
    const isPropertyQuery = message.toLowerCase().match(/buy|rent|house|apartment|villa|property|spain|marbella/i);
    
    // If the user is asking about properties, first try to search directly in the database
    let dbProperties = [];
    if (isPropertyQuery) {
      console.log('Property query detected, searching properties directly in database');
      const locationMatch = message.toLowerCase().match(/in\s+([a-zA-Z\s]+)/i);
      const location = locationMatch ? locationMatch[1].trim() : null;
      
      // Search for properties in the database directly
      const propertiesResponse = await fetch(
        'https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/search-properties',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            searchParams: {
              location: location,
              keywords: message.split(' ').filter(word => word.length > 3)
            }
          }),
        }
      );
      
      if (propertiesResponse.ok) {
        const propertiesData = await propertiesResponse.json();
        dbProperties = propertiesData.properties || [];
        console.log(`Found ${dbProperties.length} properties in database matching query`);
      }
    }

    // Send message to the chatbot response function along with training results
    const chatbotResponse = await fetch(
      'https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/chatbot-response',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userId,
          visitorInfo,
          conversationId,
          previousMessages: previousMessages.length > 0 ? previousMessages : conversationHistory,
          trainingResults,
          propertyRecommendations: dbProperties.length > 0 ? dbProperties : (trainingResults.property_listings || [])
        }),
      }
    );

    if (!chatbotResponse.ok) {
      throw new Error(`Chatbot response failed: ${chatbotResponse.statusText}`);
    }

    const result = await chatbotResponse.json();
    console.log('Chatbot response result:', result);

    return {
      response: result.response || "I apologize, but I couldn't generate a proper response at the moment.",
      leadInfo: result.leadInfo,
      conversationId: result.conversationId,
      propertyRecommendations: result.propertyRecommendations || [],
      source: result.source
    };
  } catch (error) {
    console.error('Error in chatbot response:', error);
    return {
      response: "I'm sorry, I encountered an error while processing your request.",
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Format property recommendations for display in the chatbot.
 */
export const formatPropertyRecommendations = (response: string, properties: PropertyRecommendation[]) => {
  if (!properties || properties.length === 0) {
    return response;
  }

  // Limit to maximum of 3 properties
  const displayProperties = properties.slice(0, 3);
  
  // Create a property showcase section
  let propertySection = "\n\nHere are some properties you might like:\n\n";
  
  displayProperties.forEach((property, index) => {
    // Format price with currency
    const price = typeof property.price === 'number' 
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(property.price)
      : property.price;
      
    // Create emoji icons based on property features
    const icons = [];
    if (property.propertyType === 'villa') icons.push('🏠');
    else if (property.propertyType === 'apartment') icons.push('🏢');
    else icons.push('🏡');
    
    if (property.hasPool) icons.push('🏊');
    
    // Add property entry
    propertySection += `${icons.join(' ')} **${property.title || 'Exclusive Property'} – ${price}**\n`;
    
    // Add location if available
    if (property.location) {
      propertySection += `📍 ${property.location}\n`;
    }
    
    // Add basic details
    if (property.bedroomCount || property.bathroomCount) {
      const details = [];
      if (property.bedroomCount) details.push(`${property.bedroomCount} Bedrooms`);
      if (property.bathroomCount) details.push(`${property.bathroomCount} Bathrooms`);
      propertySection += `✅ ${details.join(', ')}\n`;
    }
    
    // Ensure URLs are formatted for in-app navigation
    const clickableUrl = property.url 
      ? `./property/${property.id}`  // Use relative URL that stays in the app
      : `./property/${property.id}`; // Fallback to a generated URL
    
    propertySection += `🔗 [View Listing](${clickableUrl})\n\n`;
  });
  
  propertySection += "Would you like more information about any of these properties?";

  // If the original response already has property listings, replace them
  if (response.toLowerCase().includes('property') && 
      (response.toLowerCase().includes('listing') || response.includes('🏡'))) {
    // Get the first sentence of the original response
    const firstSentence = response.split(/[.!?]/)[0] + '.';
    return firstSentence + propertySection;
  } else {
    // Otherwise add the property section to the response
    return response + propertySection;
  }
};
