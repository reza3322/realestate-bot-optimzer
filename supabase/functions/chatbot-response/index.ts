
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      console.error('OpenAI API key is not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is not configured in Supabase project' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { message, userId, conversationId, visitorId } = await req.json();

    console.log(`Received message request:`, { message, userId, conversationId, visitorId });

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Processing message from user ${userId || 'anonymous'}: "${message}"`)
    
    // Get chatbot settings if userId is provided
    let chatbotSettings = null;
    if (userId) {
      const { data: settings, error: settingsError } = await supabase
        .from('chatbot_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();
      
      if (settingsError) {
        console.log(`Error fetching settings: ${settingsError.message}`);
      }
      
      if (settings) {
        chatbotSettings = settings.settings;
        console.log(`Retrieved chatbot settings:`, chatbotSettings);
      }
    }
    
    console.log('Sending request to OpenAI API');
    
    // Use OpenAI API to generate response
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a helpful real estate assistant. You help potential buyers and sellers with real estate questions. Be friendly, concise, and knowledgeable about property buying, selling, mortgages, and market trends.' 
          },
          { role: 'user', content: message }
        ],
        max_tokens: 300,
      }),
    });

    console.log('OpenAI API status:', response.status);
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'Failed to generate response');
    }
    
    const aiMessage = data.choices[0].message.content;
    console.log('AI response generated:', aiMessage);
    
    // Store the conversation in the database if userId is provided
    if (userId) {
      console.log('Storing conversation in database');
      
      const conv_id = conversationId || crypto.randomUUID();
      
      const { error: insertError } = await supabase
        .from('chatbot_conversations')
        .insert({
          user_id: userId,
          visitor_id: visitorId || null,
          conversation_id: conv_id,
          message,
          response: aiMessage,
        })

      if (insertError) {
        console.error('Error storing conversation:', insertError)
      } else {
        console.log(`Conversation stored with ID: ${conv_id}`);
      }
    }

    console.log('Returning response to client');
    
    return new Response(
      JSON.stringify({ 
        response: aiMessage,
        suggestedFollowUp: getSuggestedFollowUp(message, aiMessage)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Function to generate follow-up suggestions based on conversation context
function getSuggestedFollowUp(userMessage: string, aiResponse: string): string {
  const lowerMessage = userMessage.toLowerCase()
  
  if (lowerMessage.includes('buy') || lowerMessage.includes('purchase')) {
    return "What is your budget range for this purchase?"
  }
  
  if (lowerMessage.includes('sell')) {
    return "When are you planning to sell your property?"
  }
  
  if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
    return "Would you like to schedule a viewing of any particular properties?"
  }
  
  if (lowerMessage.includes('location') || lowerMessage.includes('area')) {
    return "Are schools or proximity to public transportation important to you?"
  }
  
  return "Would you prefer to continue this conversation with one of our real estate agents?"
}
