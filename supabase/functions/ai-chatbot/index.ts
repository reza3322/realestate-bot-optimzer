
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize OpenAI API key
const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
if (!openAiApiKey) {
  console.error("OPENAI_API_KEY is not set");
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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
      searchResults,
      previousMessages = []
    } = await req.json();
    
    console.log(`Processing chatbot message for user ${userId}: ${message}`);
    
    if (!message || !userId) {
      return new Response(
        JSON.stringify({ 
          error: 'Message and user ID are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a conversation ID if not provided
    const chatConversationId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Extract properties and training data from search results
    const propertyListings = searchResults?.property_listings || [];
    const qaMatches = searchResults?.qa_matches || [];
    const fileContent = searchResults?.file_content || [];
    const conversationContext = searchResults?.conversation_context || [];
    
    // Detect language from input text
    const detectedLang = detectLanguage(message);
    console.log(`Detected language: ${detectedLang}`);
    
    // Create the system message for OpenAI
    let systemMessage = createSystemPrompt(detectedLang, propertyListings, qaMatches, fileContent);
    
    // Build the message array for OpenAI
    const messages = [
      { role: "system", content: systemMessage }
    ];
    
    // Add conversation history if available
    if (conversationContext.length > 0) {
      console.log(`Adding ${conversationContext.length} previous conversation exchanges`);
      
      // Add previous exchanges (oldest first)
      for (const exchange of conversationContext) {
        messages.push({ role: "user", content: exchange.message });
        messages.push({ role: "assistant", content: exchange.response });
      }
    }
    
    // Add previous messages from current session
    if (previousMessages.length > 0) {
      console.log(`Adding ${previousMessages.length} messages from current session`);
      for (const msg of previousMessages) {
        if (msg.role === 'user') {
          messages.push({ role: "user", content: msg.content });
        } else if (msg.role === 'bot') {
          messages.push({ role: "assistant", content: msg.content });
        }
      }
    }
    
    // Add the current message
    messages.push({ role: "user", content: message });
    
    console.log(`Sending ${messages.length} messages to OpenAI`);
    
    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7,
        max_tokens: 800
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log("OpenAI response received");
    
    // Extract the AI response
    const aiResponse = data.choices[0].message.content;
    
    // Extract lead information from the message
    const leadInfo = extractLeadInfo(message, visitorInfo);
    
    // Save conversation to database
    try {
      await supabase
        .from('chatbot_conversations')
        .insert({
          conversation_id: chatConversationId,
          visitor_id: visitorInfo?.visitorId || null,
          user_id: userId,
          message: message,
          response: aiResponse
        });
      console.log("✅ Conversation saved to database");
    } catch (dbError) {
      console.error("Error saving conversation:", dbError);
    }
    
    return new Response(
      JSON.stringify({
        response: aiResponse,
        source: 'ai',
        leadInfo: leadInfo,
        conversationId: chatConversationId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in chatbot function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        response: "I'm sorry, I encountered an error processing your request. Please try again in a moment."
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Creates the system prompt for OpenAI based on available data
 */
function createSystemPrompt(language: string, properties: any[], qaMatches: any[], fileContent: any[]) {
  // Base system prompt that focuses on using only user data
  let systemPrompt = '';
  
  // Set language-specific base prompt
  switch (language) {
    case 'es':
      systemPrompt = `Eres un asistente inmobiliario profesional, amigable y conversacional que SOLO responde basándose en los datos proporcionados por el usuario, nunca inventando información.`;
      break;
    case 'fr':
      systemPrompt = `Vous êtes un assistant immobilier professionnel, amical et conversationnel qui répond UNIQUEMENT en fonction des données fournies par l'utilisateur, sans jamais inventer d'informations.`;
      break;
    case 'de':
      systemPrompt = `Sie sind ein professioneller, freundlicher und kommunikativer Immobilienassistent, der NUR auf der Grundlage der vom Benutzer bereitgestellten Daten antwortet und niemals Informationen erfindet.`;
      break;
    default:
      systemPrompt = `You are a professional, friendly, and conversational real estate assistant who ONLY responds based on the user-provided data, never inventing information.`;
      break;
  }
  
  // Add guidelines
  systemPrompt += `\n\nGuidelines:
- ONLY use the data provided to you - never make up information about properties
- Respond directly to the user's query without unnecessary information
- If asked about a specific property detail (like price or bedrooms), focus just on that detail
- Keep responses short (3-5 lines max) unless detailed information is requested
- If no matching properties are found, suggest the user contact the agency directly
- Sound natural and human-like in your responses`;
  
  // Add properties if available
  if (properties && properties.length > 0) {
    systemPrompt += `\n\nAvailable properties (ONLY talk about these - DO NOT make up any others):\n`;
    
    properties.forEach((property, index) => {
      systemPrompt += `Property ${index + 1}: ${JSON.stringify(property)}\n`;
    });
  } else {
    systemPrompt += `\n\nNo specific properties found in the database. Do not invent property listings.`;
  }
  
  // Add Q&A matches if available
  if (qaMatches && qaMatches.length > 0) {
    systemPrompt += `\n\nAgency's training data (use this information when asked general questions):\n`;
    
    qaMatches.forEach((qa, index) => {
      systemPrompt += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
    });
  }
  
  // Add file content if available
  if (fileContent && fileContent.length > 0) {
    systemPrompt += `\n\nAdditional agency information (use this for general inquiries):\n`;
    
    fileContent.forEach((file, index) => {
      systemPrompt += `From "${file.source}": ${file.text.substring(0, 500)}${file.text.length > 500 ? '...' : ''}\n\n`;
    });
  }
  
  return systemPrompt;
}

/**
 * Detects language from input text
 */
function detectLanguage(text: string): string {
  const languagePatterns = {
    es: /[áéíóúüñ¿¡]/i,
    fr: /[àâçéèêëîïôùûüÿœæ]/i,
    de: /[äöüßÄÖÜ]/i,
  };

  for (const [lang, pattern] of Object.entries(languagePatterns)) {
    if (pattern.test(text)) {
      return lang;
    }
  }

  return 'en'; // Default to English
}

/**
 * Extracts potential lead information from the message
 */
function extractLeadInfo(message: string, existingInfo: any = {}) {
  const leadInfo: Record<string, string> = { ...existingInfo };
  
  // Email extraction
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = message.match(emailRegex);
  if (emailMatches && !leadInfo.email) {
    leadInfo.email = emailMatches[0];
  }
  
  // Phone extraction
  const phoneRegex = /(?:\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
  const phoneMatches = message.match(phoneRegex);
  if (phoneMatches && !leadInfo.phone) {
    leadInfo.phone = phoneMatches[0];
  }
  
  // Name extraction (simple approach)
  if (message.includes('my name is') && !leadInfo.name) {
    const nameMatch = message.match(/my name is\s+([A-Za-z]+(\s+[A-Za-z]+)?)/i);
    if (nameMatch && nameMatch[1]) {
      const fullName = nameMatch[1].trim();
      const nameParts = fullName.split(' ');
      
      if (!leadInfo.firstName && nameParts.length > 0) {
        leadInfo.firstName = nameParts[0];
      }
      
      if (!leadInfo.lastName && nameParts.length > 1) {
        leadInfo.lastName = nameParts.slice(1).join(' ');
      }
    }
  }
  
  return leadInfo;
}
