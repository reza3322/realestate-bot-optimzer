
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
    // Step 1: First, fetch training data from user's uploaded files
    const searchResponse = await fetch('https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/search-training-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: message,
        userId: userId,
        conversationId: conversationId,
        includeQA: true,
        includeFiles: true,  // Make sure file content is included
        includeProperties: true,
        previousMessages: previousMessages
      })
    });

    if (!searchResponse.ok) {
      throw new Error(`Search API returned ${searchResponse.status}`);
    }

    const searchResults = await searchResponse.json();
    console.log('Search results:', searchResults);

    // Step 2: Extract training data matches
    const trainingResults = {
      qaMatches: searchResults.qa_matches || [],
      fileContent: searchResults.file_content || []
    };

    // Step 3: Extract property recommendations
    const propertyRecommendations: PropertyRecommendation[] = searchResults.property_listings || [];
    
    // Step 4: Determine if we have any user-specific data to use
    const hasTrainingData = trainingResults.qaMatches.length > 0 || trainingResults.fileContent.length > 0;
    const hasPropertyData = propertyRecommendations.length > 0;
    
    console.log(`Found training data: ${hasTrainingData}, property data: ${hasPropertyData}`);
    
    // Step 5: Send the message, search results, and training data to the OpenAI API 
    const aiResponse = await fetch('https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/ai-chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        userId: userId,
        visitorInfo: visitorInfo,
        conversationId: conversationId,
        previousMessages: previousMessages,
        trainingResults: trainingResults,  // Pass training results to the AI
        propertyRecommendations: propertyRecommendations
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', aiData);

    // Step 6: Determine response source based on if training data was used
    const responseSource = 
      (hasTrainingData) ? 'training' : 
      (hasPropertyData) ? 'properties' : 
      'ai';

    // Step 7: Return the AI response with property recommendations and source
    return {
      response: aiData.response,
      source: aiData.source || responseSource,
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
