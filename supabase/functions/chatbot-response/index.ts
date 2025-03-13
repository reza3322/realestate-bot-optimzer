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
      trainingResults = {} 
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

    // If no properties provided and should search, try to fetch them directly 
    let finalPropertyRecommendations = [...propertyRecommendations];
    
    if (finalPropertyRecommendations.length === 0 && shouldSearchProperties) {
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
    
    let response = '';
    let isVerified = false;
    
    // If we have matching training data, prioritize using that
    if (canUseTrainingData) {
      console.log("🧠 Using training data to generate response");
      response = generateTrainingDataResponse(message, trainingResults);
      isVerified = true;
    } 
    // Otherwise, use OpenAI if available
    else if (openai) {
      console.log("🤖 Using OpenAI to generate response");
      
      // Improve property context for OpenAI - more actionable now
      const propertyContext = finalPropertyRecommendations.length > 0 
        ? `You have found ${finalPropertyRecommendations.length} properties that match the user's criteria. DO show these properties when the user asks about real estate.` 
        : "You don't have any specific property listings that match the user's query right now.";
      
      // Generate response with the improved directive to show properties
      response = await generateAIResponse(
        message, 
        recentMessages, 
        propertyContext, 
        visitorInfo,
        trainingResults?.fileContent || []
      );
      
      // Verify the response meets our quality standards
      isVerified = await verifyResponse(message, response, finalPropertyRecommendations);
      
      if (!isVerified) {
        console.log("❌ Response verification failed, regenerating...");
        response = await generateAIResponse(
          message, 
          recentMessages, 
          propertyContext, 
          visitorInfo,
          trainingResults?.fileContent || [],
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
    
    // CRITICAL FIX: Always check if we need to show property recommendations 
    // Make sure properties are ALWAYS included when we have them available
    const showPropertyRecommendations = shouldSearchProperties || 
      (finalPropertyRecommendations.length > 0 && message.toLowerCase().match(/property|house|villa|apartment|flat|condo|real estate|buy|rent|purchase/i));
    
    if (finalPropertyRecommendations.length > 0 && showPropertyRecommendations && 
        !response.includes('🏡') && !response.includes('View Listing')) {
      response = formatPropertyRecommendations(response, finalPropertyRecommendations);
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
  const url = property.url || `https://youragency.com/listing/${property.id.substring(0, 6)}`;
  
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
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    has_pool: property.has_pool,
    features: features,
    highlight: highlight,
    url: url,
    type: property.type
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

// Generate a response using OpenAI with improved instructions for direct property responses
async function generateAIResponse(message, previousMessages, propertyContext, visitorInfo, crawledContent = [], includeQualityGuidelines = false) {
  // Create system message with improved instructions for more direct property responses
  let systemContent = `You are a friendly and conversational real estate assistant. Your PRIMARY GOAL is to recommend properties when users ask for them.

CRITICAL GUIDELINES:
1. SHOW PROPERTIES IMMEDIATELY when a user asks about real estate. Don't ask unnecessary questions if you already have property info.
2. Keep responses EXTREMELY BRIEF (2-3 lines) - users prefer direct answers over explanations.
3. Always include PROPERTY LISTINGS with details when they're available and relevant.
4. Don't ask questions the user has already answered (like location, bedrooms, etc).
5. When recommending properties, ALWAYS include the property URL.
6. Only ask for contact details AFTER showing properties and getting interest.
7. Remember previous parts of the conversation and don't repeat questions.
8. NEVER make up information about properties - only use data that has been provided.

${propertyContext}

VERY IMPORTANT: When a user asks about real estate, ALWAYS show them properties.`;

  // Add crawled content if available
  if (crawledContent && crawledContent.length > 0) {
    systemContent += `\n\nHere is some additional information about our real estate agency and properties (only reference if directly relevant):\n\n`;
    
    crawledContent.forEach((item, index) => {
      systemContent += `Source: ${item.source}\nCategory: ${item.category}\nContent: ${item.content.substring(0, 300)}...\n\n`;
    });
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

// More improved property recommendations format
function formatPropertyRecommendations(response, propertyRecommendations) {
  if (!propertyRecommendations || propertyRecommendations.length === 0) {
    return response;
  }
  
  // Only show top properties
  const limitedRecommendations = propertyRecommendations.slice(0, MAX_PROPERTY_RECOMMENDATIONS);
  
  // Create a concise format
  let formattedProperties = "\n\nHere are some properties you might like:\n\n";
  
  limitedRecommendations.forEach((property) => {
    // Format the price
    const price = typeof property.price === 'number' 
      ? new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(property.price)
      : property.price;
    
    // Get the property title
    const title = property.title || `${property.type || 'Property'} in ${property.city || 'Exclusive Location'}`;
    
    // Create a more concise listing
    formattedProperties += `🏡 **${title} – ${price}**\n`;
    
    // Location (if available)
    if (property.location) {
      formattedProperties += `📍 ${property.location}\n`;
    }
    
    // Only show key features (limit to most important)
    if (property.features && property.features.length > 0) {
      const featuresText = Array.isArray(property.features) ? 
        property.features.slice(0, 3).join(', ') : 
        property.features.split(',').slice(0, 3).join(',');
      formattedProperties += `✅ ${featuresText}\n`;
    } else {
      // Add basic features directly
      let basicFeatures = [];
      if (property.bedrooms) basicFeatures.push(`${property.bedrooms} Bed`);
      if (property.bathrooms) basicFeatures.push(`${property.bathrooms} Bath`);
      if (property.has_pool) basicFeatures.push(`Pool`);
      
      if (basicFeatures.length > 0) {
        formattedProperties += `✅ ${basicFeatures.join(', ')}\n`;
      }
    }
    
    // URL - always include
    if (property.url) {
      formattedProperties += `🔗 [View Listing](${property.url})\n\n`;
    } else {
      const listingId = property.id ? property.id.substring(0, 6) : Math.floor(Math.random() * 100000);
      formattedProperties += `🔗 [View Listing](https://youragency.com/listing/${listingId})\n\n`;
    }
  });
  
  formattedProperties += "Would you like to see more options or schedule a viewing?";
  
  // If the response already contains property information, replace it
  if (response.toLowerCase().includes("here are some properties") || 
      response.toLowerCase().includes("found the following") ||
      response.toLowerCase().includes("these properties")) {
    // Response already trying to show properties - replace that part
    return response.split(/(?:here are|i found|check out|these are).*properties/i)[0] + formattedProperties;
  } else {
    // Keep response brief and put properties first
    const briefResponse = response.split('.')[0] + '. ';
    return briefResponse + formattedProperties;
  }
}

// Verify the quality of the response with emphasis on property listing inclusion
async function verifyResponse(userQuestion, generatedResponse, propertyRecommendations) {
  try {
    // Skip verification if no OpenAI API key
    if (!openai) return true;
    
    // Check if this is a property request and if the response includes property info
    const isPropertyRequest = userQuestion.toLowerCase().match(/property|house|villa|apartment|rent|buy|real estate/i);
    const hasPropertyResponse = generatedResponse.includes('🏡') || 
                               generatedResponse.includes('property') || 
                               generatedResponse.toLowerCase().includes('listing');
    
    // If user asked for properties but response doesn't include them, reject automatically
    if (isPropertyRequest && propertyRecommendations.length > 0 && !hasPropertyResponse) {
      console.log("❌ Automatic rejection: User asked for properties but response doesn't include them");
      return false;
    }
    
    // Create verification prompt with emphasis on conciseness and property inclusion
    const prompt = `You are an AI assistant verifying chatbot responses for a real estate agency.

- The user asked: "${userQuestion}"
- The chatbot wants to reply: "${generatedResponse}"

✅ Give "APPROVED" if the response is:
- Concise (3-5 lines max)
- Direct and to the point
- Includes property information when the user is asking about real estate
- Free from unnecessary questions when the user has been specific

❌ Give "REJECTED" if the response:
- Is too long or verbose
- Asks questions the user has already answered
- Ignores the user's request for property information
- Sounds too robotic or formal
- Fails to include property details when they should be included

Only respond with "APPROVED" or "REJECTED".`;

    // Call OpenAI for verification
    const verification = await openai.createChatCompletion({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 10
    });
    
    const result = verification.data.choices[0].message.content.trim();
    console.log(`🔍 Response verification result: ${result}`);
    
    return result === "APPROVED";
  } catch (error) {
    console.error("❌ Error verifying response:", error);
    // If verification fails, assume the response is good enough
    return true;
  }
}

// More direct and property-focused fallback responses
function generateFallbackResponse(message, propertyRecommendations) {
  const lowerMessage = message.toLowerCase();
  
  // Check for property inquiry - now much more direct
  if (lowerMessage.includes('property') || 
      lowerMessage.includes('house') || 
      lowerMessage.includes('villa') || 
      lowerMessage.includes('apartment')) {
    
    if (propertyRecommendations.length > 0) {
      // Direct property response
      let response = "Here are some properties that might interest you:\n\n";
      
      propertyRecommendations.slice(0, MAX_PROPERTY_RECOMMENDATIONS).forEach((property) => {
        const price = formatPrice(property.price);
        response += `🏡 **${property.title || 'Luxury Property'} - ${price}**\n`;
        if (property.location) response += `📍 ${property.location}\n`;
        if (property.features) response += `✅ ${Array.isArray(property.features) ? 
          property.features.join(', ') : property.features}\n`;
        response += `🔗 [View Listing](${property.url || 'https://youragency.com/properties'})\n\n`;
      });
      
      return response + "Would you like to schedule a viewing?";
    } else {
      return "I'd be happy to help you find a property! What area are you interested in and what's your budget?";
    }
  }
  
  // Greeting - more conversational
  if (lowerMessage.includes('hello') || 
      lowerMessage.includes('hi') || 
      lowerMessage.includes('hey')) {
    return "Hello! 👋 How can I help with your property search today?";
  }
  
  // Default response - shorter and with a question
  return "Thanks for reaching out! I'm your personal real estate assistant. Are you looking to buy, sell, or rent a property?";
}

// Extract potential lead information from the message
function extractLeadInfo(message, currentVisitorInfo) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const phoneRegex = /(\+?[0-9]{1,4}[\s.-]?)?(\()?[0-9]{3}(\))?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}\b/g;
  const nameRegex = /(?:my name is|i am|i'm) ([A-Za-z]+)(?: [A-Za-z]+)?/i;
  
  const leadInfo = { ...currentVisitorInfo };
  
  // Extract email
  const emailMatch = message.match(emailRegex);
  if (emailMatch && !leadInfo.email) {
    leadInfo.email = emailMatch[0];
  }
  
  // Extract phone
  const phoneMatch = message.match(phoneRegex);
  if (phoneMatch && !leadInfo.phone) {
    leadInfo.phone = phoneMatch[0];
  }
  
  // Extract name
  const nameMatch = message.match(nameRegex);
  if (nameMatch && !leadInfo.name) {
    leadInfo.name = nameMatch[1];
  }
  
  return leadInfo;
}

// Save the conversation to the database
async function saveConversation(userId, message, response, visitorId, conversationId) {
  try {
    const { data, error } = await supabase
      .from('chatbot_conversations')
      .insert({
        user_id: userId,
        message,
        response,
        visitor_id: visitorId,
        conversation_id: conversationId || `conv-${Date.now()}`
      })
      .select('conversation_id');
    
    if (error) {
      console.error("❌ Error saving conversation:", error);
      return conversationId;
    }
    
    return data && data.length > 0 ? data[0].conversation_id : conversationId;
  } catch (error) {
    console.error("❌ Error in saveConversation:", error);
    return conversationId;
  }
}

// Helper function to format price
function formatPrice(price) {
  if (!price) return 'Price on request';
  
  try {
    if (typeof price === 'string') {
      if (price.includes('€') || price.includes('$') || price.includes('£')) {
        return price;
      }
      price = parseFloat(price.replace(/[^\d.-]/g, ''));
    }
    
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'EUR', 
      maximumFractionDigits: 0 
    }).format(price);
  } catch (e) {
    return `€${price}`;
  }
}
