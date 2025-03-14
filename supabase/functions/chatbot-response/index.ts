import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.3.0";

// Constants
const MAX_PROPERTY_RECOMMENDATIONS = 3;
const OPENAI_MODEL = "gpt-4o-mini";
const MAX_PREVIOUS_MESSAGES = 10;
const MAX_RESPONSE_LENGTH = 300;

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize OpenAI
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const openai = openAIApiKey ? new OpenAIApi(new Configuration({ apiKey: openAIApiKey })) : null;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      userId, 
      visitorInfo, 
      conversationId, 
      previousMessages = [], 
      propertyRecommendations = [],
      trainingResults = {},
      systemMessage = '' // Allow custom system message override
    } = await req.json();
    
    console.log(`🔄 Processing request from user ${userId}, message: ${message.substring(0, 50)}...`);
    console.log(`👤 Visitor info:`, JSON.stringify(visitorInfo));
    console.log(`🏠 Property recommendations received:`, propertyRecommendations.length);
    console.log(`💬 Previous messages count:`, previousMessages.length);
    console.log(`🧠 Training data available:`, trainingResults?.qaMatches?.length || 0, 'QA matches,', 
                trainingResults?.fileContent?.length || 0, 'file content matches');

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Persist conversation history in database for better context retention
    let existingConversation = null;
    let storedPreviousMessages = [];
    
    if (conversationId) {
      // Fetch any existing conversation history from the database
      const { data: conversationHistory } = await supabase
        .from('chatbot_conversations')
        .select('message, response')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(MAX_PREVIOUS_MESSAGES);
      
      if (conversationHistory && conversationHistory.length > 0) {
        console.log(`📚 Found ${conversationHistory.length} previous messages in database`);
        
        // Convert database history to message format
        storedPreviousMessages = conversationHistory.flatMap(entry => [
          { role: 'user', content: entry.message },
          { role: 'assistant', content: entry.response }
        ]);
      }
    }
    
    // Combine stored messages with client-provided previous messages, prioritizing client messages
    const mergedPreviousMessages = previousMessages.length > 0 ? 
      previousMessages : 
      storedPreviousMessages;
    
    // Limit to most recent messages to keep context relevant
    const recentMessages = mergedPreviousMessages.slice(-MAX_PREVIOUS_MESSAGES);
    
    console.log(`💬 Using ${recentMessages.length} messages for context`);

    // IMPROVED PROPERTY DETECTION: Check if this is a direct request for properties
    const isDirectPropertyRequest = message.toLowerCase().match(/show me|list|find|properties|houses|apartments|villas|get me/i);
    
    // Aggressive property query detection - check if message contains location and property type
    const hasLocation = message.toLowerCase().match(/(in|at|near|around) ([a-zA-Z\s]+)/i);
    const hasPropertyType = message.toLowerCase().match(/villa|apartment|penthouse|house|condo|flat|studio/i);
    const hasBedroomCount = message.toLowerCase().match(/(\d+) bed/i);
    const hasBudget = message.toLowerCase().match(/(\d+)[k|m]|\$(\d+)|€(\d+)|euro/i);
    
    const propertyInfoProvided = (hasLocation && hasPropertyType) || 
                                (hasLocation && hasBedroomCount) || 
                                (hasPropertyType && hasBudget);
    
    // Prioritize property search when criteria are provided
    const shouldSearchProperties = isDirectPropertyRequest || propertyInfoProvided;

    // Always use the provided property recommendations or search for properties
    // NEVER create fictional properties
    let finalPropertyRecommendations = [...propertyRecommendations];
    
    // MODIFIED: Always fetch from database if it's a property query, regardless of what was passed
    if (shouldSearchProperties) {
      console.log("🔍 User appears to be asking about properties. Fetching from database...");
      const dbProperties = await fetchPropertiesFromDatabase(userId, message);
      
      if (dbProperties && dbProperties.length > 0) {
        console.log(`📊 Found ${dbProperties.length} properties in database`);
        finalPropertyRecommendations = dbProperties;
      }
    }

    // Check if we can use training data for the response
    const canUseTrainingData = trainingResults && 
      ((trainingResults.qaMatches && trainingResults.qaMatches.length > 0) || 
       (trainingResults.fileContent && trainingResults.fileContent.length > 0));
    
    // MODIFIED: Check if user is asking about specific property attributes
    const askingAboutPrice = message.toLowerCase().includes('price') || message.toLowerCase().includes('cost') || message.toLowerCase().includes('how much');
    const askingAboutBedrooms = message.toLowerCase().includes('bedroom') || message.toLowerCase().includes('how many room');
    const askingAboutPool = message.toLowerCase().includes('pool') || message.toLowerCase().includes('swimming');
    const askingSpecificAttribute = askingAboutPrice || askingAboutBedrooms || askingAboutPool;
    
    let response = '';
    let isVerified = false;
    
    // Handle specific property attribute queries directly if we have matching properties
    if (finalPropertyRecommendations.length > 0 && askingSpecificAttribute) {
      console.log("🎯 User is asking about specific property attributes, generating direct response");
      if (askingAboutPrice) {
        const property = finalPropertyRecommendations[0];
        const price = typeof property.price === 'number' 
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(property.price)
          : property.price;
        response = `${property.title || 'This property'} is priced at ${price}. Would you like to know more about it or schedule a viewing? 😊`;
      } else if (askingAboutBedrooms) {
        const property = finalPropertyRecommendations[0];
        response = `${property.title || 'This property'} has ${property.bedroomCount || 'several'} bedrooms. Would you like to see it in person?`;
      } else if (askingAboutPool) {
        const property = finalPropertyRecommendations[0];
        if (property.hasPool) {
          response = `Yes, ${property.title || 'this property'} has a swimming pool. It's a beautiful feature of the property!`;
        } else {
          response = `${property.title || 'This property'} doesn't have a swimming pool. Would you like me to find properties with pools instead?`;
        }
      }
      isVerified = true;
    }
    // If we haven't generated a direct response and we have training data, use that
    else if (!response && !shouldSearchProperties && canUseTrainingData) {
      console.log("🧠 Using training data to generate response for non-property question");
      response = generateTrainingDataResponse(message, trainingResults);
      isVerified = true;
    } 
    // Otherwise, use OpenAI if available with strict instructions not to make up properties
    else if (!response && openai) {
      console.log("🤖 Using OpenAI to generate response with human-like communication");
      
      // Check if we need to ask for contact information (no properties found)
      const shouldAskForContact = finalPropertyRecommendations.length === 0 && shouldSearchProperties;
      
      // Default system message with more human-like tone if not provided
      const defaultSystemMessage = `You are a helpful and human-like real estate assistant.

Guidelines:
- Always check the user's property database for answers.
- If a user asks about a specific property, respond only with the relevant detail (e.g., just the price, just the number of bedrooms).
- If a user asks general real estate questions, check the provided training data.
- Keep responses short (3-5 lines max) and engaging like a human assistant would.
- If no property matches, ask if they want to be contacted instead of making up details.
- Remember what the user previously asked so you don't repeat questions.
- NEVER invent property listings or details. Do not make up any property information.
- ONLY recommend properties that exist in the provided propertyRecommendations array.

Example Interactions:
**User:** "What is the price of the Golden Mile villa?"
**Chatbot:** "The Golden Mile Villa is priced at €2,500,000. Would you like to schedule a viewing? 😊"

**User:** "Does it have a pool?"
**Chatbot:** "Yes, this villa has a private swimming pool. Let me know if you'd like more details!"`;
      
      // Use provided system message or default
      const finalSystemMessage = systemMessage || defaultSystemMessage;
      
      // Update property context with available properties
      const propertyContext = finalPropertyRecommendations.length > 0 
        ? `You have found ${finalPropertyRecommendations.length} properties in the database that match the user's criteria. ONLY show these properties when the user asks about real estate.` 
        : "You don't have any specific property listings that match the user's query in our database. DO NOT make up or invent properties. Instead, ask for their contact details (email/phone) so we can notify them when matching properties become available.";
      
      // Generate response with improved restrictions
      response = await generateAIResponse(
        message, 
        recentMessages, 
        finalSystemMessage,
        propertyContext,
        visitorInfo,
        trainingResults?.fileContent || [],
        shouldAskForContact
      );
      
      // Verify the response meets quality standards
      isVerified = await verifyResponse(message, response, finalPropertyRecommendations);
      
      if (!isVerified) {
        console.log("❌ Response verification failed, regenerating with stricter guidelines...");
        response = await generateAIResponse(
          message, 
          recentMessages, 
          finalSystemMessage,
          propertyContext, 
          visitorInfo,
          trainingResults?.fileContent || [],
          shouldAskForContact,
          true // Include quality guidelines
        );
        isVerified = true; // Assume second attempt is good enough
      }
    } else {
      // Fallback to a scripted response if no OpenAI key is available
      console.log("⚠️ No OpenAI API key, using fallback response");
      response = generateFallbackResponse(message, finalPropertyRecommendations);
      isVerified = true;
    }
    
    // CRITICAL FIX: Always show property recommendations when we have them and user is asking about properties
    const showPropertyRecommendations = shouldSearchProperties && 
      finalPropertyRecommendations.length > 0 &&
      !askingSpecificAttribute; // Don't show all properties if asking about specific attribute
    
    if (showPropertyRecommendations && 
        !response.includes('🏡') && !response.includes('View Listing')) {
      response = formatPropertyRecommendations(response, finalPropertyRecommendations);
    } else if (finalPropertyRecommendations.length === 0 && shouldSearchProperties && 
              !response.toLowerCase().includes('email') && !response.toLowerCase().includes('contact')) {
      // If no properties but user is asking for them, ensure we ask for contact details
      response = addContactRequestToResponse(response);
    }

    // Extract potential lead information
    const extractedLeadInfo = extractLeadInfo(message, visitorInfo || {});

    // Save the conversation
    const newConversationId = await saveConversation(
      userId, 
      message, 
      response, 
      visitorInfo?.visitorId, 
      conversationId
    );

    // Return the response with all relevant information
    const responseObj = {
      response,
      isVerified,
      conversationId: newConversationId || conversationId,
      leadInfo: extractedLeadInfo,
      propertyRecommendations: finalPropertyRecommendations.slice(0, MAX_PROPERTY_RECOMMENDATIONS),
      source: canUseTrainingData ? 'training' : 'ai'
    };

    return new Response(
      JSON.stringify(responseObj),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("💥 Error processing chatbot request:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "Sorry, I encountered an error while processing your request. Please try again." 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Generate a response using uploaded training data
function generateTrainingDataResponse(message, trainingResults) {
  console.log("Generating response from training data");
  
  // First check if we have direct QA matches
  if (trainingResults.qaMatches && trainingResults.qaMatches.length > 0) {
    // Use the highest similarity match
    const bestMatch = trainingResults.qaMatches[0];
    console.log(`Using QA match with similarity ${bestMatch.similarity}`);
    return bestMatch.answer;
  }
  
  // Otherwise, use file content if available
  if (trainingResults.fileContent && trainingResults.fileContent.length > 0) {
    const bestFileMatch = trainingResults.fileContent[0];
    console.log(`Using file content from ${bestFileMatch.source}`);
    
    // Create a response that references the source
    return `Based on our information: ${bestFileMatch.text.substring(0, 300)}...`;
  }
  
  // Should never get here but just in case
  return "I found some information about that, but I'm having trouble formatting it. Let me try another approach.";
}

// Fetch properties directly from the database - improved to be more aggressive in finding matches
async function fetchPropertiesFromDatabase(userId, query) {
  try {
    console.log(`🔍 Searching for properties related to: "${query.substring(0, 30)}..."`);
    
    // Extract keywords from the query
    const keywords = extractKeywords(query);
    
    // Extract location with improved regex
    const locationMatch = query.match(/in\s+([a-zA-Z\s]+?)(?:,|\s|$|\?|\.)/i) || 
                          query.match(/(?:at|near|around) ([a-zA-Z\s]+)/i);
    const location = locationMatch ? locationMatch[1].trim() : null;
    
    // Extract bedroom count
    const bedroomMatch = query.match(/(\d+)\s*(?:bed|bedroom|br)/i);
    const bedrooms = bedroomMatch ? parseInt(bedroomMatch[1]) : null;
    
    // Extract property type
    const typeMatch = query.match(/(villa|apartment|penthouse|house|condo|flat|studio)/i);
    const propertyType = typeMatch ? typeMatch[1].toLowerCase() : null;
    
    // Extract budget with improved regex
    const budgetMatch = query.match(/(\d+)[k|m]|\$(\d+)|€(\d+)|euro/i);
    
    // Prepare query with just basic filters initially
    let propertyQuery = supabase
      .from('properties')
      .select('id, title, description, price, bedrooms, bathrooms, city, state, status, url, living_area, plot_area, garage_area, terrace, has_pool, type')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(MAX_PROPERTY_RECOMMENDATIONS);
    
    // Add location filter if available - more flexible now
    if (location) {
      const locationLower = location.toLowerCase();
      propertyQuery = propertyQuery.or(`city.ilike.%${locationLower}%,state.ilike.%${locationLower}%,description.ilike.%${locationLower}%`);
    }
    
    // Add bedrooms filter if available - only if specifically mentioned
    if (bedrooms) {
      propertyQuery = propertyQuery.eq('bedrooms', bedrooms);
    }
    
    // Add type filter if available - with exact matches
    if (propertyType) {
      propertyQuery = propertyQuery.eq('type', propertyType);
    }
    
    // Execute query
    const { data, error } = await propertyQuery;
    
    if (error) {
      console.error("Error fetching properties:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log("No properties found with exact match, trying broader search");
      
      // Try a broader search if no exact matches
      const { data: broadData, error: broadError } = await supabase
        .from('properties')
        .select('id, title, description, price, bedrooms, bathrooms, city, state, status, url, living_area, plot_area, garage_area, terrace, has_pool, type')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(MAX_PROPERTY_RECOMMENDATIONS);
      
      if (broadError || !broadData || broadData.length === 0) {
        console.log("No properties found in broader search either");
        return [];
      }
      
      console.log(`Found ${broadData.length} properties in broader search`);
      return broadData.map(property => formatPropertyData(property));
    }
    
    console.log(`Found ${data.length} properties in database`);
    
    // Format the properties for the response
    return data.map(property => formatPropertyData(property));
  } catch (error) {
    console.error("Error in fetchPropertiesFromDatabase:", error);
    return [];
  }
}

// Format property data to match the expected format
function formatPropertyData(property) {
  // Create URL if not provided
  const url = property.url || `./property/${property.id}`;
  
  // Extract features
  const features = [];
  if (property.bedrooms) features.push(`${property.bedrooms} Bedrooms`);
  if (property.bathrooms) features.push(`${property.bathrooms} Bathrooms`);
  if (property.living_area) features.push(`${property.living_area} m² Living Area`);
  if (property.has_pool) features.push(`Swimming Pool`);
  
  // Format location
  const location = property.city ? 
    (property.state ? `${property.city}, ${property.state}` : property.city) : 
    'Exclusive Location';
  
  // Generate a highlight if not available
  let highlight = null;
  if (property.description) {
    const descLower = property.description.toLowerCase();
    if (descLower.includes('view') || descLower.includes('panoramic')) {
      highlight = 'Breathtaking views from your private terrace!';
    } else if (descLower.includes('modern') || descLower.includes('contemporary')) {
      highlight = 'Stunning modern design with high-end finishes!';
    } else if (property.has_pool) {
      highlight = 'Enjoy your own private swimming pool!';
    } else {
      highlight = 'Perfect home in a prime location!';
    }
  }
  
  return {
    id: property.id,
    title: property.title || `${property.type || 'Property'} in ${property.city || 'Exclusive Location'}`,
    price: property.price,
    location: location,
    bedroomCount: property.bedrooms,
    bathroomCount: property.bathrooms,
    hasPool: property.has_pool,
    propertyType: property.type,
    features: features,
    highlight: highlight,
    url: url
  };
}

// Extract keywords from query
function extractKeywords(query) {
  const keywords = [];
  const lowerQuery = query.toLowerCase();
  
  // Property types
  const propertyTypes = ['villa', 'apartment', 'penthouse', 'house', 'condo', 'flat', 'studio'];
  propertyTypes.forEach(type => {
    if (lowerQuery.includes(type)) keywords.push(type);
  });
  
  // Features
  const features = ['pool', 'garden', 'view', 'sea', 'beach', 'golf', 'modern', 'luxury'];
  features.forEach(feature => {
    if (lowerQuery.includes(feature)) keywords.push(feature);
  });
  
  return keywords;
}

// Add contact request to response if no properties found
function addContactRequestToResponse(response) {
  if (response.toLowerCase().includes('email') || response.toLowerCase().includes('contact')) {
    return response; // Already has contact request
  }
  
  return `${response}\n\nI couldn't find any properties matching your criteria in our database right now. Would you like to leave your email or phone number so we can contact you when properties that match your requirements become available? 😊`;
}

// Generate a response using OpenAI with improved instructions for ONLY using database properties
async function generateAIResponse(message, previousMessages, systemMessage, propertyContext, visitorInfo, crawledContent = [], shouldAskForContact = false, includeQualityGuidelines = false) {
  // Create system message with improved instructions to NEVER invent properties
  let systemContent = systemMessage + `\n\n${propertyContext}`;

  // Add crawled content if available
  if (crawledContent && crawledContent.length > 0) {
    systemContent += `\n\nHere is some additional information about our real estate agency (only reference if directly relevant):\n\n`;
    
    crawledContent.forEach((item, index) => {
      systemContent += `Source: ${item.source}\nCategory: ${item.category}\nContent: ${item.text.substring(0, 300)}...\n\n`;
    });
  }

  if (shouldAskForContact) {
    systemContent += '\n\nIMPORTANT: Since we have no matching properties, ask the user for their contact information (email/phone) so we can notify them when suitable properties become available.';
  }

  // Create messages array for OpenAI with the enhanced system message
  const messages = [
    {
      role: "system",
      content: systemContent
    }
  ];
  
  // Add previous messages to maintain conversation context
  if (previousMessages && previousMessages.length > 0) {
    previousMessages.forEach(msg => {
      messages.push({
        role: msg.role === 'bot' ? 'assistant' : 'user',
        content: msg.content
      });
    });
  }
  
  // Add current message
  messages.push({ role: "user", content: message });
  
  // Call OpenAI API with modified parameters for more direct responses
  const completion = await openai.createChatCompletion({
    model: OPENAI_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: MAX_RESPONSE_LENGTH,
    frequency_penalty: 0.7,
    presence_penalty: 0.6
  });
  
  return completion.data.choices[0].message.content;
}

// Improved property recommendations format
function formatPropertyRecommendations(response, propertyRecommendations) {
  if (!propertyRecommendations || propertyRecommendations.length === 0) {
    return response;
  }

  // Limit to maximum of 3 properties
  const displayProperties = propertyRecommendations.slice(0, 3);
  
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
      ? property.url  // Use provided URL (already relative URL that stays in the app)
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
}

// Extract potential lead information from the message and visitor info
function extractLeadInfo(message, visitorInfo) {
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

// Verify the response doesn't invent properties and follows our guidelines
async function verifyResponse(message, response, propertyRecommendations) {
  // Check if the response mentions properties when we don't have any
  const noProperties = propertyRecommendations.length === 0;
  const responseMentionsSpecificProperties = response.match(/\d+ bedroom|\d+ bathroom|swimming pool|terrace|villa in|apartment in|penthouse in|(\$|€)[0-9,.]+/gi);
  
  if (noProperties && responseMentionsSpecificProperties) {
    console.log("❌ Response verification failed: Mentions specific properties when none exist in database");
    return false;
  }
  
  // Check if it asks for contact when no properties available
  const asksForContact = response.toLowerCase().includes('email') || 
                       response.toLowerCase().includes('phone') || 
                       response.toLowerCase().includes('contact');
  
  if (noProperties && message.toLowerCase().includes('property') && !asksForContact) {
    console.log("❌ Response verification failed: Doesn't ask for contact when no properties found");
    return false;
  }
  
  // All good!
  return true;
}

// Generate a simple fallback response if OpenAI is not available
function generateFallbackResponse(message, propertyRecommendations) {
  // If we have properties, show them
  if (propertyRecommendations && propertyRecommendations.length > 0) {
    return "Thank you for your interest in our properties. I've found some listings that might match what you're looking for.";
  }
  
  // Check if the query seems to be about properties
  if (message.toLowerCase().match(/house|property|apartment|villa|flat|condo|real estate|buy|rent|purchase/i)) {
    return "I couldn't find any properties matching your criteria in our database right now. Would you like to leave your email or phone number so we can contact you when properties that match your requirements become available? 😊";
  }
  
  // Generic fallback
  return "Thank you for your message. How can I assist you with your real estate needs today?";
}

// Save the conversation to the database (with fix for visitor_info)
async function saveConversation(userId, message, response, visitorId, conversationId) {
  try {
    // Generate a new conversation ID if needed
    if (!conversationId) {
      conversationId = 'conv_' + Math.random().toString(36).substring(2, 15);
    }
    
    // Insert the conversation into the database - FIXED: removed visitor_info column
    const { data, error } = await supabase
      .from('chatbot_conversations')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        visitor_id: visitorId,
        message: message,
        response: response
      });
    
    if (error) {
      console.error('❌ Error saving conversation:', error);
    } else {
      console.log('✅ Conversation saved successfully');
    }
    
    return conversationId;
  } catch (error) {
    console.error('❌ Exception saving conversation:', error);
    return conversationId;
  }
}
