
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.3.0";

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
    const { message, userId, conversationId, previousMessages = [] } = await req.json();
    
    console.log(`Analyzing intent for message: "${message}"`);
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a condensed version of previous messages for context
    const recentMessages = previousMessages.slice(-3).map(msg => ({
      role: msg.role === 'bot' ? 'assistant' : 'user',
      content: msg.content
    }));
    
    // Analyze intent using OpenAI
    const prompt = `
    Analyze the following user message in a real estate chatbot context: "${message}"

    Based on the message, classify the primary intent into EXACTLY ONE of these categories:
    1. "general_query" - General real estate questions, greetings, or small talk
    2. "faq" - Questions about the business, services, policies, or other company-specific information
    3. "property_search" - Questions about specific properties, listings, or availability
    
    Return ONLY the category name as your answer, nothing else.
    `;
    
    const messages = [
      { role: "system", content: "You are an intent classifier for a real estate chatbot. Your job is to categorize user messages." }
    ];
    
    // Add recent conversation history for context if available
    if (recentMessages.length > 0) {
      messages.push(...recentMessages);
    }
    
    // Add the classification prompt
    messages.push({ role: "user", content: prompt });
    
    // Call OpenAI API with our classification prompt
    const completion = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.3, // Low temperature for more consistent classification
      max_tokens: 50
    });
    
    const intentText = completion.data.choices[0].message.content.trim().toLowerCase();
    
    // Parse the intent from the response
    let intent = "general_query"; // Default intent
    
    if (intentText.includes("faq")) {
      intent = "faq";
    } else if (intentText.includes("property_search")) {
      intent = "property_search";
    }
    
    console.log(`Classified intent: ${intent}`);
    
    // Create a more detailed intent object with confidence scores
    const intentAnalysis = {
      intent: intent,
      property_relevance: intent === "property_search" ? "high" : (intent === "general_query" ? "low" : "medium"),
      faq_relevance: intent === "faq" ? "high" : (intent === "general_query" ? "low" : "medium"),
      should_search_training: intent === "faq" || intent === "general_query",
      should_search_properties: intent === "property_search" || intent === "general_query"
    };
    
    // Return the intent analysis
    return new Response(
      JSON.stringify(intentAnalysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error analyzing intent:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        intent: "general_query" // Default to general query on error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
