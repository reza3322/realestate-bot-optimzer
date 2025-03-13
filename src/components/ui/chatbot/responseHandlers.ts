
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
    // Check if this is the demo chatbot (landing page) or a real user's chatbot
    const isDemoChatbot = userId === 'demo-user';
    console.log(`Chatbot mode: ${isDemoChatbot ? 'Demo/Landing Page' : 'Real User Chatbot'}`);

    // Get conversation history if available
    let conversationHistory = [];
    if (conversationId) {
      try {
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
      } catch (error) {
        console.error('Error fetching conversation history:', error);
      }
    }

    // DIFFERENT HANDLING FOR DEMO VS CLIENT CHATBOT
    if (isDemoChatbot) {
      // DEMO CHATBOT (LANDING PAGE) LOGIC
      // This chatbot only explains our services, doesn't recommend properties
      return handleDemoChatbotResponse(message, conversationId, previousMessages);
    } else {
      // CLIENT CHATBOT (REAL ESTATE AGENCY) LOGIC
      // This chatbot searches training data and properties database
      return handleClientChatbotResponse(message, userId, visitorInfo, conversationId, previousMessages, conversationHistory);
    }
  } catch (error) {
    console.error('Error in chatbot response:', error);
    // Return a standardized error response with all expected properties
    return {
      response: "I'm sorry, I encountered an error while processing your request.",
      error: error instanceof Error ? error.message : String(error),
      conversationId: conversationId || ('conv_error_' + Date.now()),
      propertyRecommendations: [],
      source: 'ai',
      leadInfo: {} // Add empty leadInfo
    };
  }
};

/**
 * Handle demo chatbot responses (landing page) - explains our service only
 */
const handleDemoChatbotResponse = async (
  message: string,
  conversationId?: string,
  previousMessages: Message[] = []
) => {
  try {
    // For the demo chatbot, only use OpenAI to talk about our services
    const chatbotResponse = await fetch(
      'https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/chatbot-response',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userId: 'demo-user',
          visitorInfo: {},
          conversationId,
          previousMessages,
          // Special system message for the demo chatbot
          systemMessage: `You are an AI assistant for RealHomeAI, a SaaS platform that provides AI chatbots for real estate agencies.
          Your purpose is to explain our services to potential customers.
          IMPORTANT: You should NEVER recommend any properties yourself. Instead, explain that our client chatbots recommend properties from real estate agencies' databases.
          Explain that RealHomeAI helps real estate agents qualify leads and recommend properties to their customers.
          You can explain how the chatbot technology works, pricing, features, but do NOT pretend to be a real estate agent or try to sell properties.
          NEVER invent or make up any details that are not provided in this instruction.
          
          Keep your responses short (3-5 lines max) and engaging, like a friendly human assistant would.
          Use conversational language and be helpful.`
        }),
      }
    );

    if (!chatbotResponse.ok) {
      throw new Error(`Chatbot response failed: ${chatbotResponse.statusText}`);
    }

    const result = await chatbotResponse.json();
    console.log('Demo chatbot response:', result);
    
    return {
      response: result.response || "I apologize, but I couldn't generate a proper response at the moment.",
      conversationId: conversationId || ('conv_' + Math.random().toString(36).substring(2, 15)),
      propertyRecommendations: [],
      source: 'ai',
      leadInfo: {} // Add empty leadInfo
    };
  } catch (error) {
    console.error('Error in demo chatbot response:', error);
    return {
      response: "I'm sorry, I encountered an error while processing your request.",
      error: error instanceof Error ? error.message : String(error),
      conversationId: conversationId || ('conv_error_' + Date.now()),
      propertyRecommendations: [],
      source: 'ai',
      leadInfo: {} // Add empty leadInfo
    };
  }
};

/**
 * Handle client chatbot responses - uses training data and property database
 */
const handleClientChatbotResponse = async (
  message: string,
  userId: string,
  visitorInfo?: any,
  conversationId?: string,
  previousMessages: Message[] = [],
  conversationHistory: any[] = []
) => {
  try {
    // 1. First check training data matches
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
          maxResults: 5,
          previousMessages
        }),
      }
    );

    if (!trainingResponse.ok) {
      throw new Error(`Training data search failed: ${trainingResponse.statusText}`);
    }

    const trainingResults = await trainingResponse.json();
    console.log('Training search results:', trainingResults);

    // 2. Check if the message is about properties to search directly in the database
    const isPropertyQuery = message.toLowerCase().match(/buy|rent|house|apartment|villa|property|home|spain|marbella|location|bedroom|bathroom|pool/i);
    
    // 3. Search for properties in the database - MODIFIED: ALWAYS search for properties when it's a property query
    let dbProperties = [];
    if (isPropertyQuery) {
      console.log('Property query detected, searching properties directly in database');
      
      // Extract location if mentioned
      const locationMatch = message.toLowerCase().match(/in\s+([a-zA-Z\s]+)/i);
      const location = locationMatch ? locationMatch[1].trim() : null;
      
      // Search for properties in the database directly - ALWAYS search when property-related
      try {
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
        } else {
          console.error(`Properties search failed: ${propertiesResponse.statusText}`);
        }
      } catch (error) {
        console.error('Error searching properties:', error);
      }
    }

    // 4. Check if we have training data that answers the question directly
    let useTrainingDataResponse = false;
    let trainingDataResponse = '';
    
    // Non-property queries should prioritize training data
    if (!isPropertyQuery && trainingResults.qaMatches && trainingResults.qaMatches.length > 0) {
      const bestMatch = trainingResults.qaMatches[0];
      if (bestMatch.similarity > 0.7) { // Higher threshold for better matches
        console.log(`Using training data QA match with similarity ${bestMatch.similarity}`);
        trainingDataResponse = bestMatch.answer;
        useTrainingDataResponse = true;
      }
    }
    
    // Next check for file content matches if no good QA match
    if (!useTrainingDataResponse && !isPropertyQuery && trainingResults.fileContent && trainingResults.fileContent.length > 0) {
      const bestFileMatch = trainingResults.fileContent[0];
      if (bestFileMatch.similarity > 0.7) { // Higher threshold for better matches
        console.log(`Using training file content match with similarity ${bestFileMatch.similarity}`);
        trainingDataResponse = `Based on our information: ${bestFileMatch.text.substring(0, 300)}...`;
        useTrainingDataResponse = true;
      }
    }
    
    let response = '';
    let propertyRecommendations = [];
    
    // 5. Decide on final response based on available data
    
    if (useTrainingDataResponse) {
      // Use training data response if good match found
      response = trainingDataResponse;
      // Still include property recommendations if available
      propertyRecommendations = dbProperties.length > 0 ? dbProperties : [];
      console.log('Using direct training data response');
    } else {
      // Prepare proper message history for OpenAI by combining previous messages and conversation history
      const storedPreviousMessages = conversationHistory.flatMap(entry => [
        { role: 'user', content: entry.message },
        { role: 'assistant', content: entry.response }
      ]);
      
      // Combine stored history with current session messages for better context
      const combinedHistory = [
        ...storedPreviousMessages,
        ...previousMessages.map(msg => ({
          role: msg.role === 'bot' ? 'assistant' : 'user',
          content: msg.content
        }))
      ];
      
      // Otherwise, send message to the chatbot response function
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
            previousMessages: combinedHistory.length > 0 ? combinedHistory : [],
            trainingResults,
            propertyRecommendations: dbProperties,
            // IMPROVED system message for more human-like responses
            systemMessage: `You are a helpful and human-like real estate assistant.

Guidelines:
- Always check the user's property database for answers.
- If a user asks about a specific property, respond only with the relevant detail (e.g., just the price, just the number of bedrooms).
- If a user asks general real estate questions, use the provided training data.
- Keep responses short (3-5 lines max) and engaging like a human assistant would.
- If no property matches, ask if they want to be contacted instead of making up details.
- Remember what the user previously asked so you don't repeat questions.
- NEVER invent property listings or details. Do not make up any property information.
- ONLY recommend properties that exist in the provided propertyRecommendations array.

Example Interactions:
**User:** "What is the price of the Golden Mile villa?"
**Chatbot:** "The Golden Mile Villa is priced at €2,500,000. Would you like to schedule a viewing? 😊"

**User:** "Does it have a pool?"
**Chatbot:** "Yes, this villa has a private swimming pool. Let me know if you'd like more details!"

**User:** "Can you show me beachfront villas?"
**Chatbot:** "Here are 3 beachfront villas in Marbella: 
🏡 **Villa Azul – €3,100,000**  
📍 Location: Marbella Beach  
✅ 4 Bedrooms, Private Pool  
🔗 [View Listing](https://youragency.com/listing/67890)"
            `
          }),
        }
      );

      if (!chatbotResponse.ok) {
        throw new Error(`Chatbot response failed: ${chatbotResponse.statusText}`);
      }

      const result = await chatbotResponse.json();
      console.log('Chatbot response result:', result);
      
      response = result.response || "I apologize, but I couldn't generate a proper response at the moment.";
      propertyRecommendations = result.propertyRecommendations || dbProperties || [];
    }
    
    // 6. Format the response based on property availability and question specificity
    if (isPropertyQuery) {
      if (dbProperties.length > 0) {
        // Determine if user is asking about specific property attributes
        const askingAboutPrice = message.toLowerCase().includes('price') || message.toLowerCase().includes('cost') || message.toLowerCase().includes('how much');
        const askingAboutBedrooms = message.toLowerCase().includes('bedroom') || message.toLowerCase().includes('how many room');
        const askingAboutPool = message.toLowerCase().includes('pool') || message.toLowerCase().includes('swimming');
        
        if (askingAboutPrice || askingAboutBedrooms || askingAboutPool) {
          // Format a response that focuses just on what was asked
          response = formatSpecificPropertyResponse(message, dbProperties, askingAboutPrice, askingAboutBedrooms, askingAboutPool);
        } else {
          // If we have properties, ensure they are shown properly
          response = formatPropertyRecommendations(response, dbProperties);
        }
      } else if (!response.toLowerCase().includes('contact') && !response.toLowerCase().includes('email') && !response.toLowerCase().includes('phone')) {
        // If no properties found but it's a property query, ensure we ask for contact details
        response += "\n\nI couldn't find any properties matching your criteria in our database right now. Would you like to leave your email or phone number so we can contact you when properties that match your requirements become available? 😊";
      }
    }

    return {
      response,
      leadInfo: extractLeadInfo(message, visitorInfo || {}),
      conversationId: conversationId || ('conv_' + Math.random().toString(36).substring(2, 15)),
      propertyRecommendations: propertyRecommendations,
      source: useTrainingDataResponse ? 'training' : 'ai'
    };
  } catch (error) {
    console.error('Error in client chatbot response:', error);
    return {
      response: "I'm sorry, I encountered an error while processing your request.",
      error: error instanceof Error ? error.message : String(error),
      conversationId: conversationId || ('conv_error_' + Date.now()),
      propertyRecommendations: [],
      source: 'ai',
      leadInfo: {} // Add empty leadInfo
    };
  }
};

/**
 * Format a response that focuses on a specific property attribute
 */
export const formatSpecificPropertyResponse = (
  message: string, 
  properties: PropertyRecommendation[], 
  askingAboutPrice: boolean,
  askingAboutBedrooms: boolean,
  askingAboutPool: boolean
) => {
  if (!properties || properties.length === 0) {
    return "I don't have information about properties matching your criteria at the moment.";
  }

  // Use the first property for specific questions (usually means they're asking about a particular one)
  const property = properties[0];
  
  if (askingAboutPrice) {
    // Format price with currency
    const price = typeof property.price === 'number' 
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(property.price)
      : property.price;
    
    return `${property.title || 'This property'} is priced at ${price}. Would you like to know more about it or schedule a viewing? 😊`;
  }
  
  if (askingAboutBedrooms) {
    return `${property.title || 'This property'} has ${property.bedroomCount || 'several'} bedrooms. Would you like to see it in person?`;
  }
  
  if (askingAboutPool) {
    if (property.hasPool) {
      return `Yes, ${property.title || 'this property'} has a swimming pool. It's a beautiful feature of the property!`;
    } else {
      return `${property.title || 'This property'} doesn't have a swimming pool. Would you like me to find properties with pools instead?`;
    }
  }
  
  // If we get here, just show the property normally
  return formatPropertyRecommendations(`Here's a property that might interest you:`, [property]);
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
  
  displayProperties.forEach((property) => {
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
    const propertyId = property.id || Math.random().toString(36).substring(2, 15);
    const clickableUrl = property.url ? property.url : `./property/${propertyId}`;
    
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

/**
 * Extract potential lead information from the message and visitor info
 */
function extractLeadInfo(message: string, visitorInfo: any) {
  const extractedInfo = { ...visitorInfo };
  const lowerMessage = message.toLowerCase();
  
  // Extract email
  const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch && !extractedInfo.email) {
    extractedInfo.email = emailMatch[0];
  }
  
  // Extract phone number (various formats)
  const phoneMatches = message.match(/(?:\+\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/g) || 
                     message.match(/(?:\+\d{1,3}[ -]?)?\d{10,}/g);
  if (phoneMatches && !extractedInfo.phone) {
    extractedInfo.phone = phoneMatches[0];
  }
  
  // Extract name (simple approach)
  const nameMatch = message.match(/(?:my name is|I am|I'm) ([A-Za-z]+(?: [A-Za-z]+)?)/i);
  if (nameMatch && !extractedInfo.firstName) {
    const fullName = nameMatch[1].split(' ');
    if (fullName.length > 1) {
      extractedInfo.firstName = fullName[0];
      extractedInfo.lastName = fullName.slice(1).join(' ');
    } else {
      extractedInfo.firstName = fullName[0];
    }
  }
  
  return extractedInfo;
}
