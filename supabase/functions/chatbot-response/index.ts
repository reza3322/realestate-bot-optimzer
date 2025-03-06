
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { OpenAI } from 'https://esm.sh/openai@4.8.0'

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? ''
    
    // Initialize OpenAI and Supabase clients
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { message, userId, conversationId, visitorId, previousMessages } = await req.json()

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Processing message: "${message}" for conversation: ${conversationId || 'new'}`);
    
    // Get conversation history if there's a conversationId
    let chatHistory = [];
    if (conversationId && userId) {
      console.log(`Fetching history for conversation ID: ${conversationId}`);
      const { data: history, error } = await supabase
        .from('chat_sessions')
        .select('user_message, ai_response, created_at')
        .eq('session_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(10); // Get the last 10 messages for context
      
      if (error) {
        console.error('Error fetching chat history:', error);
      } else if (history && history.length > 0) {
        chatHistory = history;
        console.log(`Found ${history.length} previous messages for context`);
      }
    }
    
    // If previousMessages was provided from the client, use that as a fallback
    if (chatHistory.length === 0 && previousMessages && previousMessages.length > 0) {
      chatHistory = previousMessages.map(msg => ({
        user_message: msg.role === 'user' ? msg.content : '',
        ai_response: msg.role === 'bot' ? msg.content : '',
        created_at: new Date().toISOString()
      })).filter(msg => msg.user_message || msg.ai_response);
      console.log(`Using ${chatHistory.length} client-provided messages for context`);
    }
    
    // Prepare messages for OpenAI including context
    const messages = [
      {
        role: "system",
        content: `You are an AI assistant for a real estate website. Your job is to help users find properties, 
        answer questions about real estate, and provide helpful information about buying, selling, or renting properties.
        
        Key guidelines:
        1. Maintain a natural, conversational tone.
        2. Remember context from previous messages in the conversation.
        3. Ask clarifying questions when the user's intent is not clear.
        4. If the user's request is vague, ask follow-up questions before suggesting specific properties.
        5. If the user asks about properties with specific criteria, ask about budget, location, or preferences if that information is missing.
        6. Don't reset the conversation with each message - continue the flow naturally.
        7. Respond with concise but helpful answers, formatted in a conversational way.
        8. Always reference previous parts of the conversation when appropriate.
        9. If the user asks a follow-up question, make sure to answer in the context of the previous conversation.
        
        Remember that you should never make up property listings - only reference information you have been trained on or 
        that the user has provided. If asked for specific properties that you don't have information about, 
        acknowledge this and offer to help with general advice.`
      }
    ];
    
    // Add conversation history to provide context
    if (chatHistory.length > 0) {
      // Convert the history into a format OpenAI can understand
      for (const item of chatHistory) {
        if (item.user_message) {
          messages.push({ role: "user", content: item.user_message });
        }
        if (item.ai_response) {
          messages.push({ role: "assistant", content: item.ai_response });
        }
      }
      
      console.log(`Added ${chatHistory.length} historical messages to context`);
    }
    
    // Add the current message
    messages.push({ role: "user", content: message });
    
    console.log(`Sending ${messages.length} messages to OpenAI (including system prompt)`);
    
    // Get AI response from OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    });
    
    const aiResponse = completion.choices[0].message.content;
    
    console.log(`AI response: "${aiResponse.substring(0, 100)}..."`);
    
    // Generate or use existing conversationId
    const sessionId = conversationId || crypto.randomUUID();
    
    // Store the conversation in the database if there's a userId
    if (userId) {
      console.log(`Storing conversation with session ID: ${sessionId}`);
      
      // Store in chat_sessions for memory/context
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          session_id: sessionId,
          user_message: message,
          ai_response: aiResponse
        });
      
      if (sessionError) {
        console.error('Error storing chat session:', sessionError);
      }
      
      // Also store in chatbot_conversations for historical record
      const { error: convError } = await supabase
        .from('chatbot_conversations')
        .insert({
          user_id: userId,
          visitor_id: visitorId || null,
          conversation_id: sessionId,
          message,
          response: aiResponse
        });
      
      if (convError) {
        console.error('Error storing conversation:', convError);
      }
    }

    // Analyze the message for potential lead qualification
    const isQualifying = 
      message.toLowerCase().includes('buy') || 
      message.toLowerCase().includes('price') ||
      message.toLowerCase().includes('cost') ||
      message.toLowerCase().includes('interested');
    
    // Generate a follow-up suggestion based on the context
    let suggestedFollowUp = '';
    if (message.toLowerCase().includes('buy') || message.toLowerCase().includes('purchase')) {
      suggestedFollowUp = "What is your budget range for this purchase?";
    } else if (message.toLowerCase().includes('sell')) {
      suggestedFollowUp = "When are you planning to sell your property?";
    } else if (message.toLowerCase().includes('price') || message.toLowerCase().includes('cost')) {
      suggestedFollowUp = "Would you like to schedule a viewing of any particular properties?";
    } else if (message.toLowerCase().includes('location') || message.toLowerCase().includes('area')) {
      suggestedFollowUp = "Are schools or proximity to public transportation important to you?";
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        conversationId: sessionId,
        isQualifying,
        suggestedFollowUp
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
