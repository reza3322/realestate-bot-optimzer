
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { OpenAI } from 'https://esm.sh/openai@4.11.1'

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
    console.log('📥 Chatbot function received request');
    
    // Get environment variables
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('🔑 Environment check: ');
    console.log('  - OpenAI API key set:', !!openAIApiKey);
    console.log('  - Supabase URL set:', !!supabaseUrl);
    console.log('  - Supabase Key set:', !!supabaseKey);
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    // Parse request body
    const { message, userId, visitorInfo, conversationId, previousMessages } = await req.json();
    console.log(`📝 Processing message: "${message.substring(0, 50)}..." for user: ${userId}`);
    
    if (!message) {
      throw new Error('Message is required');
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: openAIApiKey,
    });

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // First, check if there's a matching training data response
    let response = null;
    let responseSource = null;
    
    if (userId) {
      console.log('🔍 Checking for matching training data...');
      try {
        const { data: trainingMatches, error: trainingError } = await supabase
          .from('chatbot_training_data')
          .select('*')
          .eq('user_id', userId)
          .order('priority', { ascending: false });

        if (trainingError) {
          console.error('❌ Error fetching training data:', trainingError);
        } else if (trainingMatches && trainingMatches.length > 0) {
          console.log(`✅ Found ${trainingMatches.length} training entries to check`);
          
          // Find the closest match based on the question content
          const messageWords = message.toLowerCase().split(' ');
          let bestMatch = null;
          let highestMatchScore = 0;

          for (const training of trainingMatches) {
            const questionWords = training.question.toLowerCase().split(' ');
            let matchScore = 0;
            
            // Count how many words from the message appear in the training question
            for (const word of messageWords) {
              if (word.length > 3 && questionWords.includes(word)) {
                matchScore++;
              }
            }
            
            // Also check if the whole message is contained in the question
            if (training.question.toLowerCase().includes(message.toLowerCase())) {
              matchScore += 3; // Give extra weight to full matches
            }
            
            if (matchScore > highestMatchScore) {
              highestMatchScore = matchScore;
              bestMatch = training;
            }
          }
          
          // If we found a good match, use it
          if (bestMatch && (highestMatchScore > 2 || bestMatch.question.toLowerCase().includes(message.toLowerCase()))) {
            console.log(`🎯 Using training data match: "${bestMatch.question}" with score ${highestMatchScore}`);
            response = bestMatch.answer;
            responseSource = 'training';
          } else {
            console.log('❌ No good match found in training data. Highest score:', highestMatchScore);
          }
        } else {
          console.log('❌ No training data found for user');
        }
      } catch (trainingQueryError) {
        console.error('❌ Exception during training data query:', trainingQueryError);
      }
    }

    // If no match in training data, use OpenAI
    if (!response) {
      console.log('🤖 Generating response with OpenAI');
      
      try {
        // Create system message
        let systemPrompt = "You are a helpful AI assistant for a real estate business. ";
        systemPrompt += "Provide helpful, concise, and friendly responses. If asked about properties, ";
        systemPrompt += "provide specific details when available. If unsure, suggest checking with a real estate agent.";
        
        console.log('📋 System prompt:', systemPrompt);

        // Create messages array with system prompt and user message
        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ];
        
        // Add previous messages for context if available
        if (previousMessages && Array.isArray(previousMessages) && previousMessages.length > 0) {
          for (const prevMsg of previousMessages.slice(-4)) { // Add up to 4 previous messages
            const role = prevMsg.role === 'user' ? 'user' : 'assistant';
            messages.splice(1, 0, { role, content: prevMsg.content });
          }
        }

        console.log('🔄 Sending request to OpenAI...');

        // Generate response with OpenAI
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini", // Using a more affordable model
          messages: messages,
          max_tokens: 250,
          temperature: 0.7,
        });
        
        console.log('✅ OpenAI response received');
        response = completion.choices[0]?.message?.content || "I'm not sure how to respond to that.";
        responseSource = 'ai';
      } catch (openAiError) {
        console.error('❌ OpenAI error:', openAiError);
        throw new Error('Error connecting to OpenAI: ' + (openAiError.message || 'Unknown error'));
      }
    }

    // Generate conversation ID if not provided
    const chatConversationId = conversationId || crypto.randomUUID();
    
    // Store the conversation in the database
    if (userId) {
      try {
        console.log(`💾 Storing conversation for user ${userId}`);
        const { error: insertError } = await supabase
          .from('chatbot_conversations')
          .insert({
            user_id: userId,
            conversation_id: chatConversationId,
            message: message,
            response: response,
            visitor_id: visitorInfo?.visitorId || null
          });
          
        if (insertError) {
          console.error('❌ Error storing conversation:', insertError);
        } else {
          console.log('✅ Conversation saved to database');
        }
      } catch (dbError) {
        console.error('❌ Exception storing chat session:', dbError);
      }
    }
    
    console.log('📤 Response prepared:', { 
      responsePreview: response?.substring(0, 50) + '...',
      source: responseSource,
      conversationId: chatConversationId
    });
    
    return new Response(
      JSON.stringify({
        response,
        source: responseSource,
        conversationId: chatConversationId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error processing chatbot response:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        response: "I apologize, but I'm having trouble connecting to my knowledge base right now. Please try again later."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
