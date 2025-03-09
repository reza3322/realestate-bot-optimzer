
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// OpenAI API configuration
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
      status: 204,
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: `Unsupported method: ${req.method}` }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { message, userId, sessionId, trainingData, context } = await req.json();
    
    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing message for user: ${userId}, session: ${sessionId || 'new'}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate response using OpenAI with context from training data
    const response = await generateChatbotResponse(message, trainingData, context);
    
    // Store the conversation in the database if sessionId is provided
    if (sessionId && userId) {
      await storeConversation(supabase, userId, sessionId, message, response);
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: response,
        source: trainingData ? 'training' : 'ai',
        session_id: sessionId || crypto.randomUUID()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Function to generate a response using OpenAI
async function generateChatbotResponse(message: string, trainingData?: string, context?: any[]) {
  if (!OPENAI_API_KEY) {
    console.error("OpenAI API key is not configured");
    return "I'm sorry, but I'm not properly configured to respond right now. Please contact support.";
  }

  try {
    console.log("Generating response with OpenAI");
    
    // Create system prompt with context
    const systemPrompt = `You are a helpful AI assistant that provides accurate and useful information about real estate. 
Base your responses on the following knowledge base when relevant, and if the information isn't in the knowledge base, 
provide a general helpful response without making up information about the specific business or services.

KNOWLEDGE BASE:
${trainingData || "No specific knowledge base provided."}

Be conversational, helpful, and concise in your responses. If you're not sure about something related to the specific business, 
just say you don't have that information rather than making it up.`;

    // Create the chat history array
    const messages = context && Array.isArray(context) ? 
      [{ role: "system", content: systemPrompt }, ...context] : 
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ];

    // Call OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Using gpt-4o-mini for faster, more affordable responses
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI API error:", error);
      throw new Error(error.error?.message || "Failed to generate response");
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error generating response:", error);
    return "I'm sorry, I encountered a problem generating a response. Please try again in a moment.";
  }
}

// Function to store conversations in the database
async function storeConversation(supabase: any, userId: string, sessionId: string, message: string, response: string) {
  try {
    const { error } = await supabase
      .from('chatbot_conversations')
      .insert({
        user_id: userId,
        conversation_id: sessionId,
        message: message,
        response: response
      });
      
    if (error) throw error;
    
    console.log(`Stored conversation for session: ${sessionId}`);
  } catch (error) {
    console.error("Error storing conversation:", error);
    // Continue execution even if storage fails
  }
}
