import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.3.0";

// Constants
const MAX_PROPERTY_RECOMMENDATIONS = 2;
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
    const { message, userId, visitorInfo, conversationId, previousMessages = [], propertyRecommendations = [] } = await req.json();
    
    console.log(`🔄 Processing request from user ${userId}, message: ${message.substring(0, 50)}...`);
    console.log(`👤 Visitor info:`, JSON.stringify(visitorInfo));
    console.log(`🏠 Property recommendations received:`, propertyRecommendations.length);
    console.log(`💬 Previous messages count:`, previousMessages.length);

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

    // Fetch properties from database if none were provided
    let finalPropertyRecommendations = [...propertyRecommendations];
    
    if (finalPropertyRecommendations.length === 0 && message.toLowerCase().match(/propert(y|ies)|house|apartment|villa|home|buy|rent|sale/i)) {
      console.log("🔍 No properties provided but message is about real estate. Fetching from database...");
      const dbProperties = await fetchPropertiesFromDatabase(userId, message);
      
      if (dbProperties && dbProperties.length > 0) {
        console.log(`📊 Found ${dbProperties.length} properties in database`);
        finalPropertyRecommendations = dbProperties;
      }
    }

    // Fetch crawled content from training files
    const crawledContent = await fetchCrawledContent(userId, message);
    console.log(`📚 Crawled content found: ${crawledContent.length > 0 ? 'Yes' : 'No'}`);
    
    // Generate a response using OpenAI or fall back to hardcoded response
    let response, isVerified = false;
    if (openai) {
      console.log("🤖 Using OpenAI to generate response");
      
      // Get property context for OpenAI - keep it shorter now
      const propertyContext = finalPropertyRecommendations.length > 0 
        ? `You have found ${finalPropertyRecommendations.length} properties that might interest the user. Only mention them if directly relevant.`
        : "You don't have any specific property listings that match the user's query.";
      
      // Generate response
      response = await generateAIResponse(
        message, 
        recentMessages, 
        propertyContext, 
        visitorInfo,
        crawledContent
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
          crawledContent,
          true // Include quality guidelines
        );
        isVerified = true; // Assume second attempt is good enough
      }
      
      // Check if we need to format property recommendations - only if user explicitly asked for properties
      const explicitPropertyRequest = message.toLowerCase().match(/show me|list|properties|houses|apartments|villas/i);
      
      if (finalPropertyRecommendations.length > 0 && explicitPropertyRequest && 
          !response.includes('🏡') && !response.includes('View Listing')) {
        response = formatPropertyRecommendations(response, finalPropertyRecommendations);
      }
    } else {
      // Fallback to a scripted response if no OpenAI key is available
      console.log("⚠️ No OpenAI API key, using fallback response");
      response = generateFallbackResponse(message, finalPropertyRecommendations);
      isVerified = true;
    }

    // Extract potential lead information
    const extractedLeadInfo = extractLeadInfo(message, visitorInfo);

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
      propertyRecommendations: finalPropertyRecommendations.slice(0, MAX_PROPERTY_RECOMMENDATIONS)
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

// Fetch properties directly from the database
async function fetchPropertiesFromDatabase(userId, query) {
  try {
    console.log(`🔍 Searching for properties related to: "${query.substring(0, 30)}..."`);
    
    // Extract keywords from the query
    const keywords = extractKeywords(query);
    const locationMatch = query.match(/in\s+([a-zA-Z\s]+?)(?:,|\s|$|\?|\.)/i);
    const location = locationMatch ? locationMatch[1].trim() : null;
    
    // Prepare query
    let propertyQuery = supabase
      .from('properties')
      .select('id, title, description, price, bedrooms, bathrooms, city, state, status, url, living_area, plot_area, garage_area, terrace, has_pool')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(MAX_PROPERTY_RECOMMENDATIONS);
    
    // Add location filter if available
    if (location) {
      propertyQuery = propertyQuery.or(`city.ilike.%${location}%,state.ilike.%${location}%`);
    }
    
    // Execute query
    const { data, error } = await propertyQuery;
    
    if (error) {
      console.error("Error fetching properties:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log("No properties found in database");
      
      // Try searching by style if no direct match
      if (keywords.length > 0) {
        console.log("Attempting to search by style/keywords:", keywords.join(', '));
        const styleQuery = keywords.join(' ');
        
        const { data: styleData, error: styleError } = await supabase
          .rpc('search_properties_by_style', {
            user_id_param: userId,
            style_query: styleQuery,
            max_results: MAX_PROPERTY_RECOMMENDATIONS
          });
        
        if (styleError) {
          console.error("Error searching by style:", styleError);
          return [];
        }
        
        if (styleData && styleData.length > 0) {
          console.log(`Found ${styleData.length} properties by style matching`);
          
          return styleData.map(property => formatPropertyData(property));
        }
      }
      
      return [];
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
  if (property.plot_area) features.push(`${property.plot_area} m² Plot`);
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

// Fetch crawled content from the database
async function fetchCrawledContent(userId, query) {
  try {
    console.log(`🔍 Searching for crawled content related to: "${query.substring(0, 30)}..."`);
    
    // Search chatbot_training_files table for relevant content
    const { data, error } = await supabase
      .from('chatbot_training_files')
      .select('id, extracted_text, source_file, category')
      .eq('user_id', userId)
      .eq('content_type', 'text/html')
      .limit(3);
    
    if (error) {
      console.error("Error fetching crawled content:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log("No crawled content found");
      return [];
    }
    
    console.log(`Found ${data.length} crawled content items`);
    
    // Process the crawled content to find the most relevant parts
    const relevantContent = data.map(item => {
      // Extract a relevant snippet from the text (up to 1500 characters)
      const snippet = item.extracted_text.substring(0, 1500);
      return {
        source: item.source_file,
        category: item.category,
        content: snippet
      };
    });
    
    return relevantContent;
  } catch (error) {
    console.error("Error in fetchCrawledContent:", error);
    return [];
  }
}

// Generate a response using OpenAI with improved instructions for conversational responses
async function generateAIResponse(message, previousMessages, propertyContext, visitorInfo, crawledContent = [], includeQualityGuidelines = false) {
  // Create system message with crawled content and better instructions
  let systemContent = `You are a friendly and conversational real estate assistant. Keep your responses SHORT (5-6 lines max) and ENGAGING.
      
IMPORTANT GUIDELINES:
1. Be concise and direct - users prefer brief, helpful answers over lengthy explanations.
2. Ask follow-up questions to keep the conversation flowing naturally.
3. Vary your responses instead of repeating the same information or phrases.
4. Use a warm, friendly tone like a helpful human agent would.
5. When recommending properties, only do so if explicitly asked, and limit to ${MAX_PROPERTY_RECOMMENDATIONS} max.
6. Remember previous parts of the conversation and refer back to them when relevant.
7. Don't repeat information the user already knows.

${propertyContext}

When a visitor shows interest in a property, ask for their contact details to organize a viewing.`;

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
  
  // Call OpenAI API with modified parameters
  const completion = await openai.createChatCompletion({
    model: OPENAI_MODEL,
    messages,
    temperature: 0.8,
    max_tokens: MAX_RESPONSE_LENGTH,
    frequency_penalty: 0.7,
    presence_penalty: 0.6
  });
  
  return completion.data.choices[0].message.content;
}

// More concise property recommendations format
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
    
    // Only show key features (limit to most important)
    if (property.features && property.features.length > 0) {
      const featuresText = Array.isArray(property.features) ? 
        property.features.slice(0, 3).join(', ') : 
        property.features.split(',').slice(0, 3).join(',');
      formattedProperties += `✅ ${featuresText}\n`;
    }
    
    // URL
    if (property.url) {
      formattedProperties += `🔗 [View Listing](${property.url})\n\n`;
    } else {
      const listingId = property.id ? property.id.substring(0, 6) : Math.floor(Math.random() * 100000);
      formattedProperties += `🔗 [View Listing](https://youragency.com/listing/${listingId})\n\n`;
    }
  });
  
  formattedProperties += "Would you like to see more options or schedule a viewing?";
  
  // Append or replace existing property listings
  if (response.toLowerCase().includes("here are some properties") || 
      response.toLowerCase().includes("found the following") ||
      response.toLowerCase().includes("these properties")) {
    // Response already trying to show properties - replace that part
    return response.split(/(?:here are|i found|check out|these are).*properties/i)[0] + formattedProperties;
  } else {
    // Just append to the end
    return response + formattedProperties;
  }
}

// Verify the quality of the response with improved check for conversational quality
async function verifyResponse(userQuestion, generatedResponse, propertyRecommendations) {
  try {
    // Skip verification if no OpenAI API key
    if (!openai) return true;
    
    // Create verification prompt with emphasis on conciseness and conversation
    const prompt = `You are an AI assistant verifying chatbot responses.

- The user asked: "${userQuestion}"
- The chatbot wants to reply: "${generatedResponse}"

✅ Give "APPROVED" if the response is:
- Concise (5-6 lines or less)
- Conversational and engaging
- Relevant to real estate
- Free from repetition
- Includes follow-up questions where appropriate

❌ Give "REJECTED" if the response:
- Is too long or verbose
- Sounds robotic or generic
- Contains repetitive phrases
- Shows more than ${MAX_PROPERTY_RECOMMENDATIONS} property recommendations
- Is overly formal or lacks conversational flow

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

// More conversational fallback responses
function generateFallbackResponse(message, propertyRecommendations) {
  const lowerMessage = message.toLowerCase();
  
  // Check for property inquiry with shorter responses
  if (lowerMessage.includes('property') || 
      lowerMessage.includes('house') || 
      lowerMessage.includes('villa') || 
      lowerMessage.includes('apartment')) {
    
    if (propertyRecommendations.length > 0) {
      // Format property recommendations (more concise)
      return `I found some great options for you! What kind of features are most important to you?`;
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
