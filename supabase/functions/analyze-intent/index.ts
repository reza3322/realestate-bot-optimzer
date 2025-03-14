
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.3.0";

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
    const { message, userId, conversationId, previousMessages = [] } = await req.json();
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, do a simple rule-based check for common agency-related queries
    // This ensures we catch obvious agency questions without relying on AI
    const lowerMessage = message.toLowerCase();
    const isAgencyQuestion = 
      lowerMessage.includes('agency') || 
      lowerMessage.includes('company') || 
      lowerMessage.includes('firm') ||
      lowerMessage.includes('business') ||
      lowerMessage.includes('office') ||
      lowerMessage.includes('about you') ||
      lowerMessage.includes('your name') ||
      lowerMessage.includes('who are you') ||
      lowerMessage.includes('your website') ||
      lowerMessage.includes('your location') ||
      lowerMessage.includes('your address') ||
      lowerMessage.includes('contact information') ||
      lowerMessage.includes('how can i contact');
      
    if (isAgencyQuestion) {
      console.log('Direct agency question detected through keyword matching');
      return new Response(
        JSON.stringify({
          intent: 'agency_info',
          should_search_training: true,
          should_search_properties: false,
          confidence: 0.95
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Next, check for obvious property-related queries
    const isPropertyQuestion = 
      lowerMessage.includes('property') || 
      lowerMessage.includes('house') || 
      lowerMessage.includes('apartment') ||
      lowerMessage.includes('villa') ||
      lowerMessage.includes('condo') ||
      lowerMessage.includes('bedroom') ||
      lowerMessage.includes('bathroom') ||
      lowerMessage.includes('price') ||
      lowerMessage.includes('cost') ||
      lowerMessage.includes('buy') ||
      lowerMessage.includes('rent') ||
      lowerMessage.includes('sell');
      
    if (isPropertyQuestion) {
      console.log('Direct property question detected through keyword matching');
      return new Response(
        JSON.stringify({
          intent: 'property_search',
          should_search_training: true, // Still search training but prioritize properties
          should_search_properties: true,
          confidence: 0.9
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For more complex queries, use OpenAI to classify the intent
    if (openai) {
      // System prompt to analyze user's intent
      const systemPrompt = `You are an AI assistant for a real estate agency, analyzing customer queries to determine their intent.

Intent Categories:
1. agency_info: Questions about the real estate agency itself, its services, agents, history, contact information, location, or policies.
2. property_search: Questions about available properties, specific property features, pricing, or locations.
3. real_estate_advice: Questions about the real estate market, buying/selling process, or investment advice.
4. faq: Frequently asked questions about real estate or the agency's processes.
5. lead_qualification: User sharing personal information or requirements that indicate they're interested in buying/selling.
6. greeting: Simple greetings or conversation starters.
7. general_query: Other questions not fitting into above categories.

Examples:
"What properties do you have in Madrid?" → property_search
"Tell me about your agency" → agency_info
"How long has your company been in business?" → agency_info
"What's your agency called?" → agency_info
"Where are you located?" → agency_info
"Who is the owner of your company?" → agency_info
"Do you offer property management services?" → agency_info
"Is there a fee for property viewings?" → faq
"Do you have any 3-bedroom villas?" → property_search
"What's the best time to buy property?" → real_estate_advice
"My name is John and I'm looking for a house" → lead_qualification

For ANY question that could possibly be about the agency, its people, services, contact info, or operations, classify as "agency_info".

IMPORTANT: For agency_info AND faq intents, ALWAYS set "should_search_training" to true.`;

      // Format previous messages for context
      let conversationContext = '';
      if (previousMessages && previousMessages.length > 0) {
        conversationContext = "Previous conversation:\n" + 
          previousMessages.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join("\n");
      }

      // Call OpenAI API to analyze intent
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this query: "${message}"${conversationContext ? '\n\n' + conversationContext : ''}` }
        ],
        temperature: 0.3,
        max_tokens: 150,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        function_call: {
          name: "classify_intent"
        },
        functions: [
          {
            name: "classify_intent",
            description: "Classifies the intent of the user's message",
            parameters: {
              type: "object",
              properties: {
                intent: {
                  type: "string",
                  enum: ["agency_info", "property_search", "real_estate_advice", "faq", "lead_qualification", "greeting", "general_query"],
                  description: "The classified intent of the user's message"
                },
                should_search_training: {
                  type: "boolean",
                  description: "Whether to search the training data for this query. Should be true for agency_info, faq, and real_estate_advice."
                },
                should_search_properties: {
                  type: "boolean",
                  description: "Whether to search for property listings for this query. Should be true for property_search."
                },
                confidence: {
                  type: "number",
                  description: "Confidence score between 0 and 1"
                }
              },
              required: ["intent", "should_search_training", "should_search_properties"]
            }
          }
        ]
      });

      // Extract the function call results
      if (completion.data.choices[0].message?.function_call) {
        const functionCallResult = JSON.parse(completion.data.choices[0].message.function_call.arguments);
        
        // Force should_search_training to true for agency_info and faq intents
        if (functionCallResult.intent === 'agency_info' || functionCallResult.intent === 'faq') {
          functionCallResult.should_search_training = true;
        }
        
        // Log the result for debugging
        console.log('OpenAI intent classification:', functionCallResult);
        
        return new Response(
          JSON.stringify(functionCallResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback to a simple rule-based approach if OpenAI is unavailable
    // or if the function call failed
    const lowerCaseMessage = message.toLowerCase();
    
    // Default fallback classification
    const fallbackResult = {
      intent: 'general_query',
      should_search_training: true, // Always search training data in fallback
      should_search_properties: lowerCaseMessage.includes('property') || 
                              lowerCaseMessage.includes('house') || 
                              lowerCaseMessage.includes('apartment'),
      confidence: 0.7
    };
    
    console.log('Fallback intent classification:', fallbackResult);
    
    return new Response(
      JSON.stringify(fallbackResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in intent analysis:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        intent: 'general_query',
        should_search_training: true,
        should_search_properties: false,
        confidence: 0.5
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
