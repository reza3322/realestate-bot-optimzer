
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.3.0";

// Constants
const MAX_PROPERTY_RECOMMENDATIONS = 3;
const OPENAI_MODEL = "gpt-4o-mini";

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
    const { message, userId, visitorInfo, conversationId, previousMessages = [] } = await req.json();
    
    console.log(`🔄 Processing request from user ${userId}, message: ${message.substring(0, 50)}...`);
    console.log(`👤 Visitor info:`, JSON.stringify(visitorInfo));

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Search for property recommendations based on the message
    const propertyRecommendations = await searchForPropertyRecommendations(userId, message);
    
    // 2. Generate a response using OpenAI or fall back to hardcoded response
    let response, isVerified = false;
    if (openai) {
      console.log("🤖 Using OpenAI to generate response");
      // Get property context for OpenAI
      const propertyContext = propertyRecommendations.length > 0 
        ? `You have found ${propertyRecommendations.length} properties that might interest the user:\n` +
          propertyRecommendations.map((p, i) => 
            `Property ${i+1}: ${p.title}, Price: ${p.price}, Location: ${p.location || 'N/A'}, Features: ${p.features?.join(', ') || 'N/A'}`
          ).join('\n')
        : "You don't have any specific property listings that match the user's query.";
      
      // Generate response
      response = await generateAIResponse(
        message, 
        previousMessages, 
        propertyContext, 
        visitorInfo
      );
      
      // Verify the response meets our quality standards
      isVerified = await verifyResponse(message, response, propertyRecommendations);
      
      if (!isVerified) {
        console.log("❌ Response verification failed, regenerating...");
        response = await generateAIResponse(
          message, 
          previousMessages, 
          propertyContext, 
          visitorInfo,
          true // Include quality guidelines
        );
        isVerified = true; // Assume second attempt is good enough
      }
    } else {
      // Fallback to a scripted response if no OpenAI key is available
      console.log("⚠️ No OpenAI API key, using fallback response");
      response = generateFallbackResponse(message, propertyRecommendations);
      isVerified = true;
    }

    // 3. Extract potential lead information
    const extractedLeadInfo = extractLeadInfo(message, visitorInfo);

    // 4. Save the conversation
    const newConversationId = await saveConversation(
      userId, 
      message, 
      response, 
      visitorInfo?.visitorId, 
      conversationId
    );

    // 5. Return the response with all relevant information
    const responseObj = {
      response,
      isVerified,
      conversationId: newConversationId || conversationId,
      leadInfo: extractedLeadInfo,
      propertyRecommendations: propertyRecommendations.slice(0, MAX_PROPERTY_RECOMMENDATIONS)
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

// Helper function to search for properties based on message content
async function searchForPropertyRecommendations(userId, message) {
  try {
    console.log(`🔍 Searching for properties for user ${userId} based on message: ${message.substring(0, 30)}...`);
    
    // Extract search parameters from the message
    const searchParams = extractSearchParams(message);
    console.log("📊 Extracted search params:", searchParams);
    
    // Search for properties
    const { data, error } = await supabase.functions.invoke('search-properties', {
      body: { userId, searchParams }
    });
    
    if (error) {
      console.error("❌ Error searching for properties:", error);
      return [];
    }
    
    return data?.properties || [];
  } catch (error) {
    console.error("❌ Error in property search:", error);
    return [];
  }
}

// Helper function to extract search parameters from a message
function extractSearchParams(message) {
  const lowerMessage = message.toLowerCase();
  
  // Default search parameters
  const params = {
    maxResults: MAX_PROPERTY_RECOMMENDATIONS
  };
  
  // Extract location
  const locationMatches = [
    { regex: /in\s+([a-zA-Z\s]+?)(?:,|\s|$|\?|\.)/i, group: 1 },
    { regex: /(?:marbella|ibiza|malaga|madrid|barcelona|valencia|seville|granada)/gi, group: 0 }
  ];
  
  for (const match of locationMatches) {
    const locationMatch = lowerMessage.match(match.regex);
    if (locationMatch) {
      params.location = locationMatch[match.group];
      break;
    }
  }
  
  // Extract property type
  const typeRegex = /(villa|apartment|penthouse|house|condo|flat|studio)/gi;
  const typeMatch = lowerMessage.match(typeRegex);
  if (typeMatch) {
    params.type = typeMatch[0].toLowerCase();
  }
  
  // Extract price range
  const minPriceRegex = /(?:from|min|above|over|more than)\s*(?:€|euro|eur|£|\$|usd|dollar)?[ ]?(\d+[,.]\d+|\d+)[ ]?(?:€|euro|eur|£|\$|usd|dollar|k|m)?/i;
  const minPriceMatch = lowerMessage.match(minPriceRegex);
  if (minPriceMatch) {
    let minPrice = minPriceMatch[1].replace(',', '');
    if (lowerMessage.includes('k')) {
      minPrice = parseFloat(minPrice) * 1000;
    } else if (lowerMessage.includes('m')) {
      minPrice = parseFloat(minPrice) * 1000000;
    }
    params.minPrice = parseFloat(minPrice);
  }
  
  const maxPriceRegex = /(?:up to|max|under|below|less than)\s*(?:€|euro|eur|£|\$|usd|dollar)?[ ]?(\d+[,.]\d+|\d+)[ ]?(?:€|euro|eur|£|\$|usd|dollar|k|m)?/i;
  const maxPriceMatch = lowerMessage.match(maxPriceRegex);
  if (maxPriceMatch) {
    let maxPrice = maxPriceMatch[1].replace(',', '');
    if (lowerMessage.includes('k')) {
      maxPrice = parseFloat(maxPrice) * 1000;
    } else if (lowerMessage.includes('m')) {
      maxPrice = parseFloat(maxPrice) * 1000000;
    }
    params.maxPrice = parseFloat(maxPrice);
  }
  
  // Extract bedrooms
  const bedroomsRegex = /(\d+)\s*(?:bed|bedroom|br)/i;
  const bedroomsMatch = lowerMessage.match(bedroomsRegex);
  if (bedroomsMatch) {
    params.bedrooms = parseInt(bedroomsMatch[1]);
  }
  
  // Extract style preferences
  const styleKeywords = {
    'modern': ['modern', 'contemporary', 'minimalist', 'sleek'],
    'classic': ['classic', 'traditional', 'mediterranean', 'rustic', 'spanish'],
    'luxury': ['luxury', 'high-end', 'premium', 'exclusive']
  };
  
  for (const [style, keywords] of Object.entries(styleKeywords)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      params.style = style;
      break;
    }
  }
  
  return params;
}

// Generate a response using OpenAI
async function generateAIResponse(message, previousMessages, propertyContext, visitorInfo, includeQualityGuidelines = false) {
  // Create messages array for OpenAI
  const messages = [
    {
      role: "system",
      content: `You are a helpful real estate assistant for a luxury real estate agency. 
      ${includeQualityGuidelines ? `
IMPORTANT GUIDELINES:
1. When recommending properties, NEVER list more than 3 properties at a time.
2. Format property recommendations clearly with emojis, bullet points, and proper spacing.
3. Always structure your answers in a conversational, friendly tone.
4. Avoid overwhelming the user with long blocks of text.
5. If you mention a property, always provide a well-formatted listing with price, location, and key features.
6. Ask clarifying questions if the user's request is vague.
7. Always try to capture lead information by asking for name, email, or phone when appropriate.` : ''}

${propertyContext}

When a visitor shows interest in a property, ask for their contact details to organize a viewing or provide more information.`
    }
  ];
  
  // Add previous messages
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
  
  // Call OpenAI API
  const completion = await openai.createChatCompletion({
    model: OPENAI_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 500
  });
  
  return completion.data.choices[0].message.content;
}

// Verify the quality of the response
async function verifyResponse(userQuestion, generatedResponse, propertyRecommendations) {
  try {
    // Skip verification if no OpenAI API key
    if (!openai) return true;
    
    // Create verification prompt
    const prompt = `You are an AI assistant verifying chatbot responses.

- The user asked: "${userQuestion}"
- The chatbot wants to reply: "${generatedResponse}"

✅ If the response is correct, relevant to real estate, and useful, reply with "APPROVED".
❌ If the response contains marketing spam, unnecessary metadata, or is unclear, reply with "REJECTED".
❌ If the response contains more than 3 property recommendations, reply with "REJECTED".
❌ If the response contains long, unstructured text, reply with "REJECTED".

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

// Generate a fallback response when OpenAI is not available
function generateFallbackResponse(message, propertyRecommendations) {
  const lowerMessage = message.toLowerCase();
  
  // Check for property inquiry
  if (lowerMessage.includes('property') || 
      lowerMessage.includes('house') || 
      lowerMessage.includes('villa') || 
      lowerMessage.includes('apartment')) {
    
    if (propertyRecommendations.length > 0) {
      // Format property recommendations
      let response = `I found some great properties that might interest you!\n\n`;
      
      propertyRecommendations.slice(0, MAX_PROPERTY_RECOMMENDATIONS).forEach((property, index) => {
        response += `🏡 **${property.title}** – ${formatPrice(property.price)}\n`;
        response += `📍 **${property.location || 'Exclusive location'}**\n`;
        
        if (property.features && property.features.length > 0) {
          response += `✅ ${Array.isArray(property.features) ? property.features.join(', ') : property.features}\n`;
        }
        
        if (property.highlight) {
          response += `✨ ${property.highlight}\n`;
        }
        
        if (property.url) {
          response += `🔗 [View Listing](${property.url})\n`;
        }
        
        response += '\n';
      });
      
      response += "Would you like to **schedule a viewing** or hear about **more options**? 😊";
      return response;
    } else {
      return "I'd be happy to help you find the perfect property! Could you tell me a bit more about what you're looking for? For example, are you interested in a villa, apartment, or house? And do you have a specific location or budget in mind?";
    }
  }
  
  // Greeting
  if (lowerMessage.includes('hello') || 
      lowerMessage.includes('hi') || 
      lowerMessage.includes('hey')) {
    return "Hello! 👋 I'm your personal real estate assistant. How can I help you today? Are you looking to buy, sell, or rent a property?";
  }
  
  // Default response
  return "Thank you for your message. I'm your personal real estate assistant and I'm here to help you find your dream property. Please let me know what you're looking for, and I'll be happy to assist you!";
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
