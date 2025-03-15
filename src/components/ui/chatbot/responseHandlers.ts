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
  console.log(`🔍 CHATBOT RESPONSE FUNCTION CALLED for user: ${userId}`);
  console.log(`🔍 Current message: "${message}"`);
  console.log(`🔍 Previous messages count: ${previousMessages.length}`);
  console.log(`🔍 Conversation ID: ${conversationId || 'New conversation'}`);
  
  try {
    // Step 1: First, do quick check for agency-related keywords
    const lowerMessage = message.toLowerCase();
    const agencyKeywords = [
      // Basic agency keywords
      'agency', 'company', 'firm', 'business', 'office', 'realtor', 'broker',
      'name', 'who are you', 'about you',
      
      // Questions about identity
      'about you', 'your name', 'who are you', 'tell me about', 'what is your',
      'who is', 'your website', 'your team', 'your agents', 'your staff',
      
      // Location-related
      'your location', 'your address', 'where are you', 'where is your office',
      'your office location', 'located', 'based',
      
      // Contact info
      'contact information', 'how can i contact', 'phone', 'email', 'reach you',
      
      // Services
      'your service', 'do you offer', 'can you help', 'what do you do',
      'services provided', 'your expertise', 'your specialty', 'specialize',
      
      // Experience and background
      'how long', 'experience', 'years in business', 'established', 'founded',
      'when did you start', 'history', 'your background',
      
      // Fees and commissions
      'fee', 'commission', 'charge', 'cost', 'pricing', 'rate',
      
      // Credentials and qualifications
      'licensed', 'certified', 'qualification', 'credentials', 'accredited'
    ];
    
    // Check if any agency keyword is found in the message
    const isObviousAgencyQuestion = agencyKeywords.some(keyword => {
      const keywordFound = lowerMessage.includes(keyword);
      if (keywordFound) {
        console.log(`🏢 DETECTED AGENCY KEYWORD "${keyword}" in message: "${message}"`);
      }
      return keywordFound;
    });
    
    // CRITICAL: Always call analyze-intent regardless of message content
    console.log('⚠️ CALLING ANALYZE-INTENT - CRITICAL SECTION');
    console.log('🔍 Calling analyze-intent with message:', message);
    
    let intentData;
    try {
      // Use full URL with https and correct project ID
      const intentAnalysisUrl = 'https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/analyze-intent';
      console.log('🔍 Intent analysis URL:', intentAnalysisUrl);
      
      const intentPayload = {
        message: message,
        userId: userId || 'public_user', // Always provide a userId, use 'public_user' as fallback
        conversationId: conversationId,
        previousMessages: previousMessages,
        visitorInfo: visitorInfo
      };
      
      console.log('🔍 Intent analysis payload:', JSON.stringify(intentPayload, null, 2));
      
      // Add cache-busting parameter to URL
      const cacheBuster = Date.now();
      const uniqueAnalysisUrl = `${intentAnalysisUrl}?_=${cacheBuster}`;
      
      // Disable any caching with explicit headers
      const intentAnalysis = await fetch(uniqueAnalysisUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(intentPayload)
      });

      console.log('✅ Intent analysis response status:', intentAnalysis.status);
      
      if (!intentAnalysis.ok) {
        const errorText = await intentAnalysis.text();
        console.error(`❌ Intent analysis API returned ${intentAnalysis.status}: ${errorText}`);
        throw new Error(`Intent analysis API returned ${intentAnalysis.status}: ${errorText}`);
      }

      const responseText = await intentAnalysis.text();
      console.log('✅ Intent analysis raw response:', responseText);
      
      intentData = JSON.parse(responseText);
      console.log('✅ Intent analysis response parsed:', JSON.stringify(intentData, null, 2));
    } catch (intentError) {
      console.error('❌ Failed to get intent analysis:', intentError);
      console.error('❌ Stack trace:', intentError.stack);
      
      // Fallback intent data if analyze-intent fails
      intentData = {
        intent: 'general_query',
        confidence: 0.5,
        should_search_training: true,
        should_search_properties: false,
        detected_via: 'error_fallback'
      };
    }
    
    console.log('🔍 FINAL INTENT ANALYSIS:', JSON.stringify(intentData, null, 2));
    
    // Initialize result containers
    const trainingResults = {
      qaMatches: [],
      fileContent: []
    };
    let propertyRecommendations: PropertyRecommendation[] = [];
    let responseSource = null; // Default to null until we determine source
    
    // CRITICAL FIX: ALWAYS CALL search-training-data with the correct userId parameter
    console.log('⚠️ CALLING SEARCH-TRAINING-DATA - CRITICAL SECTION');
    console.log('⏳ STARTING SEARCH TRAINING DATA CALL...');
    console.log('🔍 STARTING TRAINING DATA SEARCH for message:', message);
    console.log('🔍 USING USER ID:', userId);
    
    // ENHANCED DEBUGGING: Log everything before the search call
    console.log("🔍 PREPARING TO FETCH TRAINING DATA...");
    
    // Use full URL with https and correct project ID
    const searchTrainingUrl = 'https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/search-training-data';
    console.log('🔍 SEARCH TRAINING DATA URL:', searchTrainingUrl);
    
    const searchPayload = {
      query: message,
      userId: userId, // CRITICAL: Always use the provided userId - this is the business owner's ID
      conversationId: conversationId,
      includeQA: true,
      includeFiles: true,  
      includeProperties: intentData.should_search_properties || 
                         lowerMessage.includes('property') || 
                         lowerMessage.includes('house') || 
                         lowerMessage.includes('apartment'),
      previousMessages: previousMessages,
      isAgencyQuestion: isObviousAgencyQuestion || intentData.intent === 'agency_info'
    };
    
    console.log('🔍 SEARCH PAYLOAD:', JSON.stringify(searchPayload, null, 2));
    
    const searchStartTime = Date.now();
    console.log(`⏱️ SEARCH CALL STARTED at ${new Date().toISOString()}`);
    
    try {
      // Create a unique ID for debugging
      const uniqueId = Math.random().toString(36).substring(2, 15);
      const timeStamp = Date.now();
      const uniqueUrl = `${searchTrainingUrl}?_=${timeStamp}&id=${uniqueId}`;
      
      console.log(`Using URL with cache busting: ${uniqueUrl}`);
      
      // Make the real request with full data and explicit cache control
      console.log('🔍 EXECUTING FETCH to search-training-data NOW');
      const searchResponse = await fetch(uniqueUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Request-ID': uniqueId
        },
        body: JSON.stringify(searchPayload)
      });
      
      console.log(`✅ SEARCH FETCH COMPLETED with status: ${searchResponse.status}, ok: ${searchResponse.ok}`);
      
      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error(`❌ Search API error: HTTP ${searchResponse.status}`);
        console.error(`Error details: ${errorText}`);
        throw new Error(`Search API error: ${errorText}`);
      }
      
      // Parse the search results - WITH ERROR HANDLING
      const responseText = await searchResponse.text();
      console.log('🔍 RAW RESPONSE TEXT (first 500 chars):', responseText.substring(0, 500));
      const searchResults = JSON.parse(responseText);
      
      console.log('🔍 RECEIVED TRAINING DATA (first 500 chars):', 
                 JSON.stringify(searchResults).substring(0, 500));
      console.log('Training search results counts:', 
                 `QA matches: ${searchResults.qa_matches?.length || 0}`, 
                 `File content: ${searchResults.file_content?.length || 0}`,
                 `Properties: ${searchResults.property_listings?.length || 0}`);
      
      // Update training results
      trainingResults.qaMatches = searchResults.qa_matches || [];
      trainingResults.fileContent = searchResults.file_content || [];
      
      // Update property recommendations from the same search if available
      propertyRecommendations = searchResults.property_listings || [];
      
    } catch (searchError) {
      console.error('🔴 ERROR IN TRAINING DATA SEARCH:', searchError);
      console.error('🔴 Stack trace:', searchError.stack);
      
      // SAFETY FALLBACK: If the search fails, log the error but continue
      console.error('🔴 Training data search failed, continuing with empty results');
    }
    
    // Step 4: Determine if we have valid training data to base response on
    // MODIFIED: Use lower threshold for any training data match
    const similarityThreshold = 0.15;
    const hasGoodTrainingMatches = (trainingResults.qaMatches.length > 0 && 
                                  trainingResults.qaMatches[0].similarity > similarityThreshold) || 
                                  (trainingResults.fileContent.length > 0 && 
                                  trainingResults.fileContent[0].similarity > similarityThreshold);
    
    // For agency questions, force using training data even with lower similarities
    const forceTrainingDataForAgency = (isObviousAgencyQuestion || intentData.intent === 'agency_info') && 
                                      (trainingResults.qaMatches.length > 0 || 
                                      trainingResults.fileContent.length > 0);
    
    // PRINCIPLE #2: Use training data if available
    if (hasGoodTrainingMatches || forceTrainingDataForAgency) {
      console.log('Found training matches, setting source to training');
      if (forceTrainingDataForAgency) {
        console.log('⭐️ FORCING training data source for agency question');
      }
      responseSource = 'training';
    }
    
    // Step 5: If we didn't get property data and need it, fetch it separately
    if (intentData.should_search_properties && propertyRecommendations.length === 0) {
      console.log('Searching property data separately...');
      try {
        const propertyResponse = await fetch('https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/search-property-listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: message,
            userId: userId,
            conversationId: conversationId,
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
    
    // Step 6: Special handling for agency questions
    if (isObviousAgencyQuestion || intentData.intent === 'agency_info') {
      console.log('⭐️ DETECTED AGENCY QUESTION - Special handling enabled');
      
      // For obvious agency questions, if we have training data, use it directly
      if (trainingResults.qaMatches.length > 0) {
        console.log('⭐️ USING DIRECT QA MATCH FOR AGENCY QUESTION');
        
        // Return the best match directly
        return {
          response: trainingResults.qaMatches[0].answer,
          source: 'training',
          conversationId: conversationId || `conv_${Date.now()}`,
          propertyRecommendations: []
        };
      } else if (trainingResults.fileContent.length > 0) {
        console.log('⭐️ USING DIRECT FILE CONTENT FOR AGENCY QUESTION');
        
        // Get agency details from the file content
        const agencyContent = trainingResults.fileContent[0].text;
        return {
          response: `Based on our information: ${agencyContent.substring(0, 500)}`,
          source: 'training',
          conversationId: conversationId || `conv_${Date.now()}`,
          propertyRecommendations: []
        };
      } else {
        // PRINCIPLE #3: If no training data, say "I don't have that information"
        console.log('⚠️ NO TRAINING DATA FOR AGENCY QUESTION - USING FALLBACK RESPONSE');
        return {
          response: "I don't have that information about our agency at the moment. Please contact our office directly for the most accurate information.",
          source: 'fallback',
          conversationId: conversationId || `conv_${Date.now()}`,
          propertyRecommendations: []
        };
      }
    }

    // Step 7: PRINCIPLE #3 - If no training data for general questions - say "I don't have that information"
    if (!trainingResults.qaMatches.length && !trainingResults.fileContent.length && !propertyRecommendations.length) {
      console.log('⚠️ NO TRAINING DATA OR PROPERTIES - USING FALLBACK RESPONSE');
      return {
        response: "I don't have that information in my knowledge base. Is there something specific about our properties or services that you'd like to know?",
        source: 'fallback',
        conversationId: conversationId || `conv_${Date.now()}`,
        propertyRecommendations: []
      };
    }
    
    // Step 8: Generate OpenAI prompt with strict instructions
    // Prepare more detailed context from training data to help OpenAI
    let trainingContext = '';
    
    // Create a system prompt that enforces training data usage as the ONLY source of truth
    let systemContent = `
You are an AI assistant for a real estate agency.
Your ONLY source of truth is the agency's training data and property database. 
DO NOT make up any information. 
If you don't find the answer in the training data or property listings, say: 
"I don't have that information, but I can assist you in other ways."
`;
    
    if (trainingResults.qaMatches.length > 0 || trainingResults.fileContent.length > 0) {
      if (trainingResults.qaMatches.length > 0) {
        systemContent += '\n\n📚 **Agency Q&A:**\n';
        trainingResults.qaMatches.forEach((match, index) => {
          systemContent += `Q: ${match.question}\nA: ${match.answer}\n\n`;
        });
      }
      
      if (trainingResults.fileContent.length > 0) {
        systemContent += '\n\n📜 **Additional Agency Information:**\n';
        trainingResults.fileContent.forEach((content) => {
          systemContent += `Source: ${content.source || 'Website'}\nCategory: ${content.category || 'General'}\nContent: ${content.text.substring(0, 500)}...\n\n`;
        });
      }
      
      console.log('📚 Prepared training context for OpenAI:', systemContent.substring(0, 200) + '...');
    }
    
    // 🔍 Debug: Log the final data being sent to OpenAI
    console.log('🔍 FINAL DATA SENT TO OPENAI:');
    console.log(`Training Context: ${systemContent ? systemContent.substring(0, 500) + '...' : 'None'}`);
    console.log(`Training Results Count: QA=${trainingResults.qaMatches.length}, Files=${trainingResults.fileContent.length}`);
    console.log(`IsAgencyQuestion flag: ${isObviousAgencyQuestion || intentData.intent === 'agency_info'}`);
    
    // Step 9: Send the message, intent, and any found data to the OpenAI API 
    console.log('🔍 Making request to ai-chatbot endpoint with data');
    
    try {
      // PRINCIPLE #4: Add strict instructions about ONLY using provided data
      const aiResponse = await fetch('https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/ai-chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          userId: userId,
          visitorInfo: visitorInfo,
          conversationId: conversationId || `conv_${Date.now()}`, // Generate a new ID if none exists
          previousMessages: previousMessages,
          trainingResults: trainingResults,  // Always pass training results to the AI
          propertyRecommendations: propertyRecommendations,
          intentClassification: intentData.intent, // Pass the intent classification
          responseSource: responseSource, // Pass the determined source to help OpenAI prioritize
          trainingContext: systemContent, // Pass the formatted training context with strict instructions
          isAgencyQuestion: isObviousAgencyQuestion || intentData.intent === 'agency_info', // Explicitly flag agency questions
          // Add strict instruction to ONLY use provided data
          strictMode: true, // PRINCIPLE #4: Prevent made-up answers
          // Add debugging info for OpenAI
          debugInfo: {
            keywordMatched: isObviousAgencyQuestion,
            intent: intentData.intent,
            intentSource: intentData.detected_via || 'api',
            hasTrainingData: trainingResults.qaMatches.length > 0 || trainingResults.fileContent.length > 0,
            totalResults: {
              qa: trainingResults.qaMatches.length,
              files: trainingResults.fileContent.length,
              properties: propertyRecommendations.length
            }
          }
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

      // Step 10: Return the AI response with property recommendations and source
      return {
        response: aiData.response,
        source: aiData.source || responseSource || 'training', // Default to training source
        leadInfo: aiData.leadInfo,
        conversationId: aiData.conversationId || conversationId || `conv_${Date.now()}`,
        propertyRecommendations: propertyRecommendations
      };
    } catch (aiError) {
      console.error('Error in AI chatbot request:', aiError);
      // PRINCIPLE #3: If AI fails, don't make up an answer
      return {
        response: "I'm unable to access my knowledge base at the moment. Please try again in a few moments or contact our office directly for assistance.",
        source: 'error',
        conversationId: conversationId || `conv_${Date.now()}`,
        propertyRecommendations: []
      };
    }
  } catch (error) {
    console.error('🔴 UNCAUGHT ERROR in chatbot response:', error);
    console.error('🔴 Stack trace:', error.stack);
    // PRINCIPLE #3: If anything fails, don't make up an answer
    return {
      response: "I'm sorry, I encountered an error processing your request. Please try again.",
      error: error instanceof Error ? error.message : String(error),
      source: 'error',
      conversationId: conversationId || `conv_${Date.now()}`
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
