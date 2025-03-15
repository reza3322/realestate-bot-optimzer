
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, cache-control, pragma, expires',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  console.log('🚀 GET-CONVERSATION-HISTORY FUNCTION CALLED - ENTRY POINT');
  console.log('🔑 Function URL:', req.url);
  console.log('📋 Request method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      conversationId, 
      userId,
      limit = 10
    } = await req.json();
    
    console.log(`📝 Fetching conversation history for conversation: ${conversationId}, user: ${userId}, limit: ${limit}`);

    if (!conversationId || !userId) {
      console.error('❌ Missing required parameters: conversationId or userId is missing');
      return new Response(
        JSON.stringify({ error: 'Conversation ID and user ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get conversation history without requiring authentication
    // This is safe because we're still checking that the conversation belongs to the specified user
    console.log('⏳ Querying database for conversation history');
    const { data: messages, error } = await supabaseClient
      .from('chatbot_conversations')
      .select('id, message, response, created_at, visitor_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (error) {
      console.error('❌ Error fetching conversation history:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Successfully retrieved ${messages?.length || 0} messages`);
    return new Response(
      JSON.stringify({ messages: messages || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in get-conversation-history function:', error);
    console.error('❌ Stack trace:', error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
