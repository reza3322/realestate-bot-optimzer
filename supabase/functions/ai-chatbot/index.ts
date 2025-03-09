
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
    const requestData = await req.json();
    const { message, userId, sessionId, trainingData, context } = requestData;
    
    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing message for user: ${userId || 'anonymous'}, session: ${sessionId || 'new'}`);
    console.log(`Message: ${message}`);
    console.log(`Has training data: ${!!trainingData}`);
    console.log(`Has context: ${Array.isArray(context) && context.length > 0}`);
    
    // Determine if this is the landing page demo chatbot or a user's chatbot
    const isLandingPageChatbot = userId === 'demo-user';
    
    // Create Supabase client for storing conversations
    let supabase = null;
    if (userId && userId !== 'demo-user') {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        supabase = createClient(supabaseUrl, supabaseKey);
      } catch (error) {
        console.error("Error creating Supabase client:", error);
      }
    }

    // Generate response using OpenAI with context from training data
    const response = await generateChatbotResponse(message, trainingData, context, isLandingPageChatbot);
    
    // Store the conversation in the database if sessionId is provided
    if (supabase && sessionId && userId && userId !== 'demo-user') {
      try {
        await storeConversation(supabase, userId, sessionId, message, response);
      } catch (error) {
        console.error("Error storing conversation:", error);
        // Continue even if storage fails
      }
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
async function generateChatbotResponse(
  message: string, 
  trainingData?: string, 
  context?: any[],
  isLandingPageChatbot: boolean = false
) {
  if (!OPENAI_API_KEY) {
    console.error("OpenAI API key is not configured");
    return "I'm sorry, but I'm not properly configured to respond right now. Please contact support.";
  }

  try {
    console.log("Generating response with OpenAI");
    
    // Different system prompts for landing page chatbot vs. user chatbots
    let systemPrompt = "";
    
    if (isLandingPageChatbot) {
      systemPrompt = `You are the official AI assistant for RealHomeAI, a company that provides AI chatbot solutions for real estate professionals.
Base your responses primarily on the following company information and be detailed and helpful about our services, pricing, and capabilities.

COMPANY INFORMATION:
${trainingData || `
RealHomeAI is an AI-powered chatbot platform for real estate professionals. It helps real estate agents and companies qualify leads, engage customers, and recommend properties. The platform uses advanced AI to understand and respond to customer inquiries about real estate, provide property recommendations, and help with scheduling viewings.

Key features:
- Lead qualification and capture
- Property recommendation
- 24/7 customer engagement
- Integration with real estate websites
- Customizable to match branding
- Training on company-specific information
- Analytics dashboard

The platform helps real estate professionals save time, increase conversion rates, and provide better customer service through automation and AI assistance.

Pricing:
- Starter: $29/month - Basic chatbot with lead capture
- Pro: $79/month - Advanced chatbot with property recommendations
- Enterprise: Custom pricing - Full integration with CRM and website

The RealHomeAI chatbot can be embedded on any real estate website with a simple script. Once installed, visitors can interact with the chatbot to ask questions about properties, schedule viewings, or get information about the real estate company.
`}

Be conversational, enthusiastic, and knowledgeable about RealHomeAI. If asked about something not related to our company or services, politely bring the conversation back to how we can help with real estate chatbot solutions.`;
    } else {
      // For user chatbots
      systemPrompt = `You are a helpful AI assistant that provides accurate and useful information about real estate and the specific real estate business you're representing. 
Base your responses on the following knowledge base when relevant, and if the information isn't in the knowledge base, 
provide a general helpful response without making up information about the specific business or services.

KNOWLEDGE BASE:
${trainingData || "No specific training data provided for this real estate business yet."}

Be conversational, helpful, and concise in your responses. If you're not sure about something related to the specific business, 
just say you don't have that information rather than making it up.`;
    }

    // Create the chat history array
    const messages = [{ role: "system", content: systemPrompt }];
    
    // Add context messages if provided
    if (context && Array.isArray(context) && context.length > 0) {
      messages.push(...context);
    } else {
      // Otherwise just add the current message
      messages.push({ role: "user", content: message });
    }

    console.log(`Sending ${messages.length} messages to OpenAI`);

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
