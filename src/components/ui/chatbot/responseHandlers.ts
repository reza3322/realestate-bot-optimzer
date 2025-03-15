import { Message, PropertyRecommendation, VisitorInfo, ChatbotResponse } from './types';

/**
 * Handles the chatbot response for the user's message
 */
export const testChatbotResponse = async (
  message: string,
  userId: string,
  visitorInfo: VisitorInfo,
  conversationId?: string,
  previousMessages: Message[] = []
): Promise<ChatbotResponse> => {
  console.log(`Processing chatbot response for user: ${userId}`);
  console.log(`Current message: "${message}"`);
  console.log(`Previous messages count: ${previousMessages.length}`);
  
  try {
    // Step 1: First, analyze the intent using OpenAI to determine search strategy
    // Check for obvious agency-related questions with simple pattern matching first
    const lowerMessage = message.toLowerCase();
    const isObviousAgencyQuestion = 
      lowerMessage.includes('agency') || 
      lowerMessage.includes('company') || 
      lowerMessage.includes('firm') ||
      lowerMessage.includes('business') ||
      lowerMessage.includes('office') ||
      lowerMessage.includes('about you') ||
      lowerMessage.includes('your name') ||
      lowerMessage.includes('who are you') ||
      lowerMessage.includes('your website') ||
      lowerMessage.includes('your location') ||
      lowerMessage.includes('your address') ||
      lowerMessage.includes('contact information') ||
      lowerMessage.includes('how can i contact') || 
      lowerMessage.includes('tell me about your') ||
      lowerMessage.includes('what is your') ||
      lowerMessage.includes('where are you') ||
      lowerMessage.includes('your team') ||
      lowerMessage.includes('your services') ||
      lowerMessage.includes('your experience') ||
      lowerMessage.includes('how long have you') ||
      lowerMessage.includes('your hours') ||
      lowerMessage.includes('when are you');
    
    // If it's an obvious agency question, set intent directly
    let intentData;
    
    if (isObviousAgencyQuestion) {
      console.log('🏢 DETECTED AGENCY QUESTION via direct keyword matching:', message);
      intentData = {
        intent: 'agency_info',
        should_search_training: true,
        should_search_properties: false,
        confidence: 0.95
      };
    } else {
      // Otherwise, use the intent classification API
      console.log('Calling intent analysis API...');
      const intentAnalysis = await fetch('https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/analyze-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          userId: userId,
          conversationId: conversationId,
          previousMessages: previousMessages
        })
      });

      if (!intentAnalysis.ok) {
        console.error(`Intent analysis API returned ${intentAnalysis.status}: ${await intentAnalysis.text()}`);
        throw new Error(`Intent analysis API returned ${intentAnalysis.status}`);
      }

      intentData = await intentAnalysis.json();
      console.log('Intent analysis response:', intentData);
    }
    
    console.log('Intent analysis:', intentData);
    
    // Step 2: Determine search strategy based on intent
    const shouldSearchTraining = intentData.should_search_training;
    const shouldSearchProperties = intentData.should_search_properties;
    
    // If the intent is agency_info or faq, we should ALWAYS search training data
    const isAgencyOrFaqIntent = intentData.intent === 'agency_info' || 
                                intentData.intent === 'faq' || 
                                intentData.intent === 'general_query';
                                
    // Force training search for agency/faq questions regardless of intent analysis result
    const finalShouldSearchTraining = shouldSearchTraining || isAgencyOrFaqIntent;
    
    console.log(`Search strategy - Training: ${finalShouldSearchTraining}, Properties: ${shouldSearchProperties}`);
    console.log(`Intent: ${intentData.intent}, Is Agency/FAQ: ${isAgencyOrFaqIntent}`);
    
    // Initialize result containers
    const trainingResults = {
      qaMatches: [],
      fileContent: []
    };
    let propertyRecommendations: PropertyRecommendation[] = [];
    let responseSource = 'ai'; // Default source
    
    // Step 3: ALWAYS fetch training data first for any intent - this is critical for agency info
    console.log('🔍 STARTING TRAINING DATA SEARCH for message:', message);
    console.log('🔍 Making request to search-training-data endpoint with userId:', userId);
    
    try {
      const searchTrainingUrl = 'https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/search-training-data';
      console.log('🔍 Request URL:', searchTrainingUrl);
      
      const searchPayload = {
        query: message,
        userId: userId,
        conversationId: conversationId,
        includeQA: true,
        includeFiles: true,  
        includeProperties: false,
        previousMessages: previousMessages
      };
      
      console.log('🔍 Request payload:', JSON.stringify(searchPayload));
      
      const searchResponse = await fetch(searchTrainingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchPayload)
      });

      console.log('🔍 Search API status:', searchResponse.status);
      
      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error(`Search API returned ${searchResponse.status}: ${errorText}`);
        throw new Error(`Search API returned ${searchResponse.status}: ${errorText}`);
      }

      const searchResults = await searchResponse.json();
      console.log('🔍 Training search results received:', 
                 `QA matches: ${searchResults.qa_matches?.length || 0}`, 
                 `File content: ${searchResults.file_content?.length || 0}`);
      
      // IMPORTANT: Log detailed training results to debug agency-related issues
      console.log('🔍 Training search results:', JSON.stringify(searchResults, null, 2));
      
      if (isAgencyOrFaqIntent) {
        console.log('🏢 Agency-related question detected, QA matches:', 
                   searchResults.qa_matches?.length || 0, 
                   'File content:', 
                   searchResults.file_content?.length || 0);
        
        // Log the actual content for debugging
        if (searchResults.qa_matches?.length > 0) {
          searchResults.qa_matches.forEach((match: any, index: number) => {
            console.log(`QA Match ${index + 1} (similarity: ${match.similarity?.toFixed(2) || 'N/A'}):`, 
                       `Q: ${match.question || 'No question'}`, 
                       `A: ${match.answer || 'No answer'}`);
          });
        }
        
        if (searchResults.file_content?.length > 0) {
          searchResults.file_content.forEach((content: any, index: number) => {
            console.log(`File Content ${index + 1} (similarity: ${content.similarity?.toFixed(2) || 'N/A'}):`, 
                       content.text?.substring(0, 100) + '...' || 'No text');
          });
        }
      }
      
      // Update training results
      trainingResults.qaMatches = searchResults.qa_matches || [];
      trainingResults.fileContent = searchResults.file_content || [];
      
    } catch (searchError) {
      console.error('🔴 Error in training data search:', searchError);
    }
    
    // Check if we found good training matches - LOWER the threshold for agency questions
    const hasGoodTrainingMatches = (trainingResults.qaMatches.length > 0 && 
                                   trainingResults.qaMatches[0].similarity > 0.15) || 
                                  (trainingResults.fileContent.length > 0 && 
                                   trainingResults.fileContent[0].similarity > 0.15);
    
    // For agency questions, force using training data even with lower similarities
    const forceTrainingDataForAgency = isAgencyOrFaqIntent && 
                                      (trainingResults.qaMatches.length > 0 || 
                                       trainingResults.fileContent.length > 0);
    
    if (hasGoodTrainingMatches || forceTrainingDataForAgency) {
      console.log('Found training matches, setting source to training');
      if (forceTrainingDataForAgency) {
        console.log('⭐️ FORCING training data source for agency question');
      }
      responseSource = 'training';
    }
    
    // Step 4: Fetch property data if needed and if we're not dealing with a clear agency/FAQ question
    if (shouldSearchProperties && (responseSource !== 'training' || intentData.intent === 'property_search')) {
      console.log('Searching property data based on intent analysis...');
      try {
        const propertyResponse = await fetch('https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/search-training-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: message,
            userId: userId,
            conversationId: conversationId,
            includeQA: false,
            includeFiles: false,
            includeProperties: true,
            previousMessages: previousMessages
          })
        });

        if (!propertyResponse.ok) {
          const errorText = await propertyResponse.text();
          console.error(`Property search API returned ${propertyResponse.status}: ${errorText}`);
          throw new Error(`Property search API returned ${propertyResponse.status}: ${errorText}`);
        }

        const propertyResults = await propertyResponse.json();
        console.log('Property search results:', propertyResults);
        
        // Update property recommendations
        propertyRecommendations = propertyResults.property_listings || [];
        
        // If we found property matches and didn't already find training data
        if (propertyRecommendations.length > 0 && responseSource !== 'training') {
          responseSource = 'properties';
        }
      } catch (propertyError) {
        console.error('Error in property search:', propertyError);
      }
    }
    
    // Step 5: Check if we have any user-specific data to use
    const hasTrainingData = trainingResults.qaMatches.length > 0 || trainingResults.fileContent.length > 0;
    const hasPropertyData = propertyRecommendations.length > 0;
    
    console.log(`Found training data: ${hasTrainingData}, property data: ${hasPropertyData}, intent: ${intentData.intent}`);
    
    // Step 6: Prepare more detailed context from training data to help OpenAI
    let trainingContext = '';
    if (hasTrainingData) {
      if (trainingResults.qaMatches.length > 0) {
        trainingContext += 'Relevant agency information from our knowledge base:\n\n';
        trainingResults.qaMatches.forEach((match: any, index: number) => {
          trainingContext += `Q: ${match.question}\nA: ${match.answer}\n\n`;
        });
      }
      
      if (trainingResults.fileContent.length > 0) {
        trainingContext += 'Additional information from our website and documents:\n\n';
        trainingResults.fileContent.forEach((content: any) => {
          trainingContext += `Source: ${content.source || 'Website'}\nCategory: ${content.category || 'General'}\nContent: ${content.text.substring(0, 800)}...\n\n`;
        });
      }
      
      console.log('📚 Prepared training context for OpenAI:', trainingContext.substring(0, 200) + '...');
    }
    
    // 🔍 Debug: Log the final data being sent to OpenAI
    console.log('🔍 Final data sent to OpenAI:');
    console.log(`Training Context: ${trainingContext ? trainingContext.substring(0, 300) + '...' : 'None'}`);
    console.log(`Training Results Count: QA=${trainingResults.qaMatches.length}, Files=${trainingResults.fileContent.length}`);
    console.log(`IsAgencyQuestion flag: ${isAgencyOrFaqIntent}`);
    
    // Step 7: Send the message, intent, and any found data to the OpenAI API 
    console.log('🔍 Making request to ai-chatbot endpoint with data');
    
    try {
      const aiResponse = await fetch('https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/ai-chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          userId: userId,
          visitorInfo: visitorInfo,
          conversationId: conversationId,
          previousMessages: previousMessages,
          trainingResults: trainingResults,  // Always pass training results to the AI
          propertyRecommendations: propertyRecommendations,
          intentClassification: intentData.intent, // Pass the intent classification
          responseSource: responseSource, // Pass the determined source to help OpenAI prioritize
          trainingContext: trainingContext, // Pass the formatted training context
          isAgencyQuestion: isAgencyOrFaqIntent // Explicitly flag agency questions
        })
      });

      console.log('🔍 AI API status:', aiResponse.status);
      
      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`AI API returned ${aiResponse.status}: ${errorText}`);
        throw new Error(`AI API returned ${aiResponse.status}: ${errorText}`);
      }

      const aiData = await aiResponse.json();
      console.log('AI response:', aiData);

      // Step 8: Return the AI response with property recommendations and source
      return {
        response: aiData.response,
        source: aiData.source || responseSource,
        leadInfo: aiData.leadInfo,
        conversationId: aiData.conversationId || conversationId,
        propertyRecommendations: propertyRecommendations
      };
    } catch (aiError) {
      console.error('Error in AI chatbot request:', aiError);
      throw aiError;
    }
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
