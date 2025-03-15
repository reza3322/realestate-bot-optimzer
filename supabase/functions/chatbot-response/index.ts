import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Function to determine if a message is about the agency
function isAgencyQuestion(message: string, providedFlag?: boolean): boolean {
  // If the flag is explicitly provided, use it
  if (providedFlag !== undefined) {
    return providedFlag;
  }
  
  // Otherwise, do our own detection
  const lowerMessage = message.toLowerCase();
  const agencyKeywords = [
    // Basic agency keywords
    'agency', 'company', 'firm', 'business', 'office', 'realtor', 'broker',
    'name', 'who are you', 'about you',
    
    // Questions about identity
    'about you', 'your name', 'who are you', 'tell me about', 'what is your',
    'who is', 'your website', 'your team', 'your agents', 'your staff',
    
    // Location-related
    'your location', 'your address', 'where are you', 'where is your office',
    'your office location', 'located', 'based',
    
    // Contact info
    'contact information', 'how can i contact', 'phone', 'email', 'reach you'
  ];
  
  return agencyKeywords.some(keyword => lowerMessage.includes(keyword));
}

serve(async (req) => {
  console.log('🚀 CHATBOT-RESPONSE FUNCTION CALLED');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const requestData = await req.json();
    const { 
      message, 
      userId, 
      visitorInfo, 
      conversationId, 
      previousMessages = [],
      isAgencyQuestion: providedAgencyFlag
    } = requestData;
    
    console.log(`Processing message from user ID: ${userId}`);
    console.log(`Message: "${message}"`);
    
    // Check if this is an agency question (using either the provided flag or our own detection)
    const isAgencyFlag = isAgencyQuestion(message, providedAgencyFlag);
    console.log(`Agency question detection: ${isAgencyFlag ? 'YES' : 'NO'}`);
    
    // If this is an agency question and we don't have training data, use consistent fallback
    if (isAgencyFlag) {
      console.log('Using agency question handling logic');
      
      // Call search-training-data to check if we have any matching training data
      const searchResponse = await fetch('https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/search-training-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: message,
          userId: userId,
          includeQA: true,
          includeFiles: true
        })
      });
      
      if (searchResponse.ok) {
        const searchResults = await searchResponse.json();
        
        console.log(`Found QA matches: ${searchResults.qa_matches?.length || 0}`);
        console.log(`Found file content matches: ${searchResults.file_content?.length || 0}`);
        
        // If we have no good training data for agency questions, use the standard fallback
        if (!searchResults.qa_matches?.length && !searchResults.file_content?.length) {
          console.log('No training data found for agency question, using fallback response');
          
          // Save the conversation
          await saveConversation(userId, conversationId, message, 
            "I don't have that information about our agency at the moment. Please contact our office directly for the most accurate information.");
          
          // Return the same fallback response that the dashboard uses
          return new Response(
            JSON.stringify({
              response: "I don't have that information about our agency at the moment. Please contact our office directly for the most accurate information.",
              conversationId: conversationId || `conv_${Date.now()}`,
              source: 'fallback'
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
    }
    
    // For normal messages or agency questions WITH training data, call the standard AI chatbot function
    const aiResponse = await fetch('https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/ai-chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        userId,
        visitorInfo,
        conversationId: conversationId || `conv_${Date.now()}`,
        previousMessages,
        isAgencyQuestion: isAgencyFlag
      })
    });
    
    if (!aiResponse.ok) {
      throw new Error(`AI response error: ${aiResponse.status}`);
    }
    
    const responseData = await aiResponse.json();
    
    // Save the conversation
    await saveConversation(userId, responseData.conversationId || conversationId, message, responseData.response);
    
    // Return the formatted response
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in chatbot response:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "I'm sorry, I encountered an error processing your request. Please try again.",
        conversationId: `conv_${Date.now()}`
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper function to save the conversation
async function saveConversation(userId: string, conversationId: string, message: string, response: string) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not available');
      return;
    }
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.7.1');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase
      .from('chatbot_conversations')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        message,
        response
      });
      
    console.log('Conversation saved successfully');
  } catch (saveError) {
    console.error('Error saving conversation:', saveError);
  }
}
