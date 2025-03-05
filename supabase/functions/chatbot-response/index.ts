
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
    console.log('Starting chatbot response function');
    
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

    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (error) {
      console.error('Error parsing request JSON:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { message, userId, conversationId, visitorId } = requestData;
    console.log(`Received message request:`, { message, userId, conversationId, visitorId });

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Processing message from user ${userId || 'anonymous'}: "${message}"`);
    
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

    // First, check for matches in the user's training data
    let customResponse = null;
    
    if (userId) {
      try {
        console.log('Checking user training data for response matches');
        
        // Search for matching questions in the training data
        // We'll do a simple search here - in a production system, you'd want 
        // to use similarity search or embeddings for better matching
        const { data: matches, error } = await supabase
          .from('chatbot_training_data')
          .select('*')
          .eq('user_id', userId)
          .order('priority', { ascending: false });
        
        if (error) {
          console.error('Error fetching training data:', error);
        } else if (matches && matches.length > 0) {
          console.log(`Found ${matches.length} potential training data items`);
          
          // Simple matching algorithm - normalize and check for keyword matches
          const normalizedQuery = message.toLowerCase().trim();
          
          // Find the best match
          let bestMatch = null;
          let bestMatchScore = 0;
          
          for (const item of matches) {
            const normalizedQuestion = item.question.toLowerCase().trim();
            
            // Calculate a simple match score
            // 1. Exact match gets highest score
            if (normalizedQuery === normalizedQuestion) {
              bestMatch = item;
              break;
            }
            
            // 2. Check if query contains the question or vice versa
            let score = 0;
            if (normalizedQuery.includes(normalizedQuestion)) {
              score = normalizedQuestion.length / normalizedQuery.length * 10;
            } else if (normalizedQuestion.includes(normalizedQuery)) {
              score = normalizedQuery.length / normalizedQuestion.length * 8;
            } else {
              // 3. Check for word matches
              const queryWords = normalizedQuery.split(/\s+/);
              const questionWords = normalizedQuestion.split(/\s+/);
              
              const matchedWords = queryWords.filter(word => 
                questionWords.some(qWord => qWord.includes(word) || word.includes(qWord))
              );
              
              if (matchedWords.length > 0) {
                score = (matchedWords.length / queryWords.length) * 5;
                
                // Boost score based on priority
                if (item.priority && item.priority > 0) {
                  score = score * (1 + item.priority/10);
                }
              }
            }
            
            if (score > bestMatchScore) {
              bestMatchScore = score;
              bestMatch = item;
            }
          }
          
          // Use the custom response if we found a good enough match
          if (bestMatch && bestMatchScore > 4) {
            console.log(`Using custom response from training data with score ${bestMatchScore}:`, bestMatch);
            customResponse = bestMatch.answer;
          } else {
            console.log(`No good match found in training data. Best score: ${bestMatchScore}`);
          }
        }
      } catch (err) {
        console.error('Error processing training data:', err);
      }
    }
    
    // If we found a custom response, use it directly
    if (customResponse) {
      console.log('Using custom response from training data');
      
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
            response: customResponse,
          });

        if (insertError) {
          console.error('Error storing conversation:', insertError);
        } else {
          console.log(`Conversation stored with ID: ${conv_id}`);
        }
      }

      console.log('Returning custom response to client');
      
      return new Response(
        JSON.stringify({ 
          response: customResponse,
          suggestedFollowUp: getSuggestedFollowUp(message, customResponse),
          source: 'training'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('No matching training data found, sending request to OpenAI API');
    
    try {
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
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error response:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error?.message || 'Failed to generate response');
        } catch (e) {
          throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 100)}...`);
        }
      }
      
      const data = await response.json();
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
          });

        if (insertError) {
          console.error('Error storing conversation:', insertError);
        } else {
          console.log(`Conversation stored with ID: ${conv_id}`);
        }
      }

      console.log('Returning response to client');
      
      return new Response(
        JSON.stringify({ 
          response: aiMessage,
          suggestedFollowUp: getSuggestedFollowUp(message, aiMessage),
          source: 'ai'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Error communicating with OpenAI' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Function to generate follow-up suggestions based on conversation context
function getSuggestedFollowUp(userMessage: string, aiResponse: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('buy') || lowerMessage.includes('purchase')) {
    return "What is your budget range for this purchase?";
  }
  
  if (lowerMessage.includes('sell')) {
    return "When are you planning to sell your property?";
  }
  
  if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
    return "Would you like to schedule a viewing of any particular properties?";
  }
  
  if (lowerMessage.includes('location') || lowerMessage.includes('area')) {
    return "Are schools or proximity to public transportation important to you?";
  }
  
  return "Would you prefer to continue this conversation with one of our real estate agents?";
}
