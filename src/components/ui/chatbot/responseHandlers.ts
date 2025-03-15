
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
  console.log(`Conversation ID: ${conversationId || 'New conversation'}`);
  
  try {
    // Step 1: First, do quick check for agency-related keywords
    // EXPANDED: Using a more comprehensive list of agency-related keywords
    const lowerMessage = message.toLowerCase();
    const agencyKeywords = [
      // Basic agency keywords
      'agency', 'company', 'firm', 'business', 'office', 'realtor', 'broker',
      
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
    
    // If it's an obvious agency question, set intent directly and log it
    let intentData;
    
    if (isObviousAgencyQuestion) {
      console.log('🏢 DETECTED AGENCY QUESTION via direct keyword matching:', message);
      console.log('WITH CONVERSATION HISTORY:', JSON.stringify(previousMessages, null, 2));
      intentData = {
        intent: 'agency_info',
        should_search_training: true,
        should_search_properties: false,
        confidence: 0.95,
        detected_via: 'keyword_matching'
      };
      
      // Additional logging to help debug
      console.log('🔍 AGENCY INTENT SET BY KEYWORD MATCHING:', intentData);
    } else {
      // Otherwise, use the intent classification API
      console.log('Calling intent analysis API...');
      
      try {
        console.log('🔍 Making request to analyze-intent endpoint with message:', message);
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

        console.log('🔍 Intent analysis response status:', intentAnalysis.status);
        
        if (!intentAnalysis.ok) {
          const errorText = await intentAnalysis.text();
          console.error(`Intent analysis API returned ${intentAnalysis.status}: ${errorText}`);
          throw new Error(`Intent analysis API returned ${intentAnalysis.status}: ${errorText}`);
        }

        intentData = await intentAnalysis.json();
        console.log('Intent analysis response:', intentData);
      } catch (intentError) {
        console.error('Failed to get intent analysis:', intentError);
        // If intent analysis fails, check for basic keywords manually as fallback
        const basicKeywords = ['agency', 'company', 'office', 'about you', 'who are you'];
        const isBasicAgencyQuestion = basicKeywords.some(keyword => lowerMessage.includes(keyword));
        
        if (isBasicAgencyQuestion) {
          console.log('⚠️ Intent API failed but detected basic agency question keywords');
          intentData = {
            intent: 'agency_info',
            should_search_training: true,
            should_search_properties: false,
            confidence: 0.8,
            detected_via: 'fallback_keywords'
          };
        } else {
          // Otherwise use general query as fallback
          intentData = {
            intent: 'general_query',
            should_search_training: true, // Always search training on error
            should_search_properties: false,
            confidence: 0.5,
            detected_via: 'error_fallback'
          };
        }
      }
    }
    
    console.log('Intent analysis:', intentData);
    
    // Step 2: PRINCIPLE #1 - ALWAYS search training data for EVERY query
    // Determine search strategy based on intent
    const shouldSearchTraining = true; // ALWAYS search training data first for ALL queries
    const shouldSearchProperties = intentData.should_search_properties || 
                                 lowerMessage.includes('property') || 
                                 lowerMessage.includes('house') || 
                                 lowerMessage.includes('apartment');
    
    console.log(`🔍 ALWAYS SEARCHING TRAINING DATA for: "${message}"`);
    console.log(`Search strategy - Training: Always, Properties: ${shouldSearchProperties}`);
    
    // Initialize result containers
    const trainingResults = {
      qaMatches: [],
      fileContent: []
    };
    let propertyRecommendations: PropertyRecommendation[] = [];
    let responseSource = null; // Default to null until we determine source
    
    // Step 3: ALWAYS fetch training data first for any intent - this is critical for agency info
    console.log('Searching training data regardless of intent...');
    
    // ENHANCED DEBUGGING: Log everything before the search call
    console.log("🔍 PREPARING TO FETCH TRAINING DATA...");
    
    // CRITICAL FIX: Use full URL with https protocol to ensure the function is called
    const searchTrainingUrl = 'https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/search-training-data';
    console.log('🔍 FULL Request URL:', searchTrainingUrl);
    
    const searchPayload = {
      query: message,
      userId: userId,
      conversationId: conversationId,
      includeQA: true,
      includeFiles: true,  
      includeProperties: shouldSearchProperties,
      previousMessages: previousMessages,
      // Add explicit flag for agency questions to prioritize training data
      isAgencyQuestion: isObviousAgencyQuestion || intentData.intent === 'agency_info'
    };
    
    console.log('🔍 SEARCH PAYLOAD:', JSON.stringify(searchPayload, null, 2));
    
    // ENHANCED LOGGING: Add timing for the search-training-data call
    const searchStartTime = Date.now();
    console.log(`⏱️ SEARCH CALL STARTED at ${new Date().toISOString()}`);
    
    try {
      // FORCED DATABASE SEARCH: Always search before generating any response
      console.log('⚠️ FORCED DATABASE SEARCH: Ensuring training data is always searched first');
      
      // Add retry mechanism to ensure the search-training-data function is called
      let searchResponse = null;
      let retryCount = 0;
      const maxRetries = 5; // Increased number of retries
      
      // Direct fetch with explicit error handling
      while (retryCount <= maxRetries) {
        try {
          console.log(`🔄 ATTEMPT ${retryCount + 1} TO CALL SEARCH-TRAINING-DATA FUNCTION`);
          
          // Add unique timestamp to prevent caching
          const uniqueId = Math.random().toString(36).substring(2, 15);
          const timeStamp = Date.now();
          const uniqueUrl = `${searchTrainingUrl}?_=${timeStamp}&id=${uniqueId}`;
          
          console.log(`Using URL with cache busting: ${uniqueUrl}`);
          
          // PRE-REQUEST VALIDATION: Log the full request configuration
          console.log('Request headers:', {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Request-ID': uniqueId
          });
          console.log('Request method:', 'POST');
          console.log('Request body size:', JSON.stringify(searchPayload).length, 'bytes');
          
          // CRITICALLY IMPORTANT: This is the actual fetch call that needs to work
          searchResponse = await fetch(uniqueUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
              'Pragma': 'no-cache',
              'Expires': '0',
              'X-Request-ID': uniqueId
            },
            body: JSON.stringify(searchPayload),
            cache: 'no-store',
            mode: 'cors',
            credentials: 'omit',
            redirect: 'follow'
          });
          
          console.log(`Response status: ${searchResponse.status}, ok: ${searchResponse.ok}`);
          
          // If successful, break out of retry loop
          if (searchResponse.ok) {
            console.log(`✅ SUCCESS: Called search-training-data on attempt ${retryCount + 1}`);
            break;
          } else {
            let errorText = '';
            try {
              errorText = await searchResponse.text();
            } catch (e) {
              errorText = 'Could not read error response';
            }
            
            console.error(`❌ Search API error: HTTP ${searchResponse.status} on attempt ${retryCount + 1}`);
            console.error(`Error details: ${errorText}`);
            retryCount++;
            
            if (retryCount <= maxRetries) {
              const delay = 1000 * Math.pow(2, retryCount); // Exponential backoff
              console.log(`🔄 Retrying in ${delay}ms... (${retryCount}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        } catch (fetchError) {
          console.error(`❌ NETWORK ERROR on attempt ${retryCount + 1}:`, fetchError);
          console.error(`Stack trace: ${fetchError.stack || 'No stack trace available'}`);
          retryCount++;
          
          if (retryCount <= maxRetries) {
            const delay = 1000 * Math.pow(2, retryCount); // Exponential backoff
            console.log(`🔄 Retrying after network error in ${delay}ms... (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      const searchEndTime = Date.now();
      console.log(`⏱️ SEARCH CALL COMPLETED at ${new Date().toISOString()} (took ${searchEndTime - searchStartTime}ms)`);
      
      if (!searchResponse || !searchResponse.ok) {
        throw new Error(`Failed to fetch training data after ${maxRetries} retries`);
      }
      
      console.log('🔍 Search API status:', searchResponse.status);
      
      // Parse the search results
      const searchResults = await searchResponse.json();
      console.log('🔍 RECEIVED TRAINING DATA:', JSON.stringify(searchResults, null, 2));
      console.log('Training search results received:', 
                 `QA matches: ${searchResults.qa_matches?.length || 0}`, 
                 `File content: ${searchResults.file_content?.length || 0}`);
      
      // Update training results
      trainingResults.qaMatches = searchResults.qa_matches || [];
      trainingResults.fileContent = searchResults.file_content || [];
      
      // Update property recommendations from the same search if available
      propertyRecommendations = searchResults.property_listings || [];
      
      // ENHANCED LOGGING: Add summary of what was found
      if (trainingResults.qaMatches.length > 0) {
        console.log('✅ Found QA matches with similarities:', 
          trainingResults.qaMatches.map(m => m.similarity.toFixed(2)).join(', '));
      } else {
        console.log('⚠️ No QA matches found in training data');
      }
      
      if (trainingResults.fileContent.length > 0) {
        console.log('✅ Found file content with similarities:', 
          trainingResults.fileContent.map(c => c.similarity.toFixed(2)).join(', '));
      } else {
        console.log('⚠️ No file content found in training data');
      }
      
    } catch (searchError) {
      console.error('🔴 ERROR IN TRAINING DATA SEARCH:', searchError);
      console.error('🔴 Stack trace:', searchError.stack);
      
      // SAFETY FALLBACK: If the search fails, return a fallback message instead of proceeding
      console.error('🔴 CRITICAL ERROR: Training data search failed, returning fallback response');
      return {
        response: "I'm having trouble accessing my knowledge base at the moment. Please try your question again in a moment.",
        source: 'error',
        conversationId: conversationId || `conv_${Date.now()}`,
        propertyRecommendations: []
      };
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
    if (shouldSearchProperties && propertyRecommendations.length === 0) {
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
    if (!hasGoodTrainingMatches && !propertyRecommendations.length) {
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
    console.error('Error in chatbot response:', error);
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
