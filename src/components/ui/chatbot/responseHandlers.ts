
import { Message, PropertyRecommendation, VisitorInfo } from './types';

/**
 * Handles the chatbot response for the user's message
 */
export const testChatbotResponse = async (
  message: string,
  userId: string,
  visitorInfo: VisitorInfo,
  conversationId?: string,
  previousMessages: Message[] = []
) => {
  console.log(`Processing chatbot response for user: ${userId}`);
  
  try {
    // Always call the search-training-data endpoint to find relevant content
    const searchResponse = await fetch('https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/search-training-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: message,
        userId: userId,
        conversationId: conversationId,
        includeQA: true,
        includeFiles: true,
        includeProperties: true,
        previousMessages: previousMessages
      })
    });

    if (!searchResponse.ok) {
      throw new Error(`Search API returned ${searchResponse.status}`);
    }

    const searchResults = await searchResponse.json();
    console.log('Search results:', searchResults);

    // Extract property recommendations
    const propertyRecommendations: PropertyRecommendation[] = searchResults.property_listings || [];
    
    // Send the message, search results, and property info to the OpenAI API 
    const aiResponse = await fetch('https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/ai-chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        userId: userId,
        visitorInfo: visitorInfo,
        conversationId: conversationId,
        searchResults: searchResults,
        previousMessages: previousMessages
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', aiData);

    // Return the AI response with property recommendations
    return {
      response: aiData.response,
      source: aiData.source,
      leadInfo: aiData.leadInfo,
      conversationId: aiData.conversationId || conversationId,
      propertyRecommendations: propertyRecommendations
    };
  } catch (error) {
    console.error('Error in chatbot response:', error);
    return {
      response: "I'm sorry, I encountered an error processing your request. Please try again in a moment.",
      error: error instanceof Error ? error.message : String(error),
      conversationId: conversationId
    };
  }
};

/**
 * Helper function to format property recommendations for display
 */
export const formatPropertyRecommendations = (properties: PropertyRecommendation[]): string => {
  if (!properties || properties.length === 0) {
    return '';
  }

  let result = 'Here are some properties that might interest you:\n\n';
  
  properties.forEach(property => {
    result += `🏡 **${property.title}** - ${property.price}\n`;
    if (property.location) result += `📍 ${property.location}\n`;
    if (property.features && property.features.length > 0) {
      result += `✅ ${property.features.join(', ')}\n`;
    }
    result += `🔗 [View Listing](${property.url})\n\n`;
  });

  return result;
};
