
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
    let leadInfo = visitorInfo || {};
    let shouldCollectLeadInfo = false;
    let isQualifyingConversation = false;
    
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

    // Check if we should collect lead info based on previous messages
    if (previousMessages && Array.isArray(previousMessages)) {
      // Check if this is a qualifying conversation
      const qualifyingKeywords = ['buy', 'purchase', 'looking for', 'interested in', 'property', 'house', 'apartment', 'home'];
      
      // Check user messages for qualifying keywords
      const containsQualifyingKeywords = previousMessages
        .filter(msg => msg.role === 'user')
        .some(msg => qualifyingKeywords.some(keyword => msg.content.toLowerCase().includes(keyword)));
      
      if (containsQualifyingKeywords) {
        isQualifyingConversation = true;
        
        // Check if we have already collected contact info
        const hasName = leadInfo.name || previousMessages.some(msg => msg.role === 'bot' && msg.content.includes('name'));
        const hasEmail = leadInfo.email || previousMessages.some(msg => msg.role === 'bot' && msg.content.includes('email'));
        const hasBudget = leadInfo.budget || previousMessages.some(msg => msg.role === 'bot' && msg.content.includes('budget'));
        
        shouldCollectLeadInfo = !hasName || !hasEmail || !hasBudget;
        
        console.log('📊 Lead qualification check:', { 
          isQualifyingConversation, 
          shouldCollectLeadInfo,
          hasName,
          hasEmail,
          hasBudget
        });
      }
    }

    // Extract lead info from the current message
    if (isQualifyingConversation) {
      // Try to extract an email address
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
      const emailMatch = message.match(emailRegex);
      if (emailMatch && !leadInfo.email) {
        leadInfo.email = emailMatch[0];
        console.log('📧 Extracted email from message:', leadInfo.email);
      }
      
      // Try to extract a budget figure
      const budgetRegex = /\b(\$|€|£)?(\d{1,3}(,\d{3})*(\.\d+)?|\d+)(k|K|thousand|million|M)?\b/;
      const budgetMatch = message.match(budgetRegex);
      if (budgetMatch && !leadInfo.budget) {
        leadInfo.budget = budgetMatch[0];
        console.log('💰 Extracted budget from message:', leadInfo.budget);
      }
      
      // Check for name if the bot previously asked for it
      const nameCheck = previousMessages && previousMessages.length > 0 && 
                        previousMessages[previousMessages.length - 1].role === 'bot' && 
                        previousMessages[previousMessages.length - 1].content.includes('name');
      
      if (nameCheck && !leadInfo.name && message.length < 50) {
        // If the bot just asked for a name and the reply is short, it's likely a name
        leadInfo.name = message;
        console.log('👤 Extracted name from message:', leadInfo.name);
      }
    }

    // If no match in training data, use OpenAI
    if (!response) {
      console.log('🤖 Generating response with OpenAI');
      
      try {
        // Create system message with lead qualification instructions if needed
        let systemPrompt = "You are a helpful AI assistant for a real estate business. ";
        
        if (isQualifyingConversation && shouldCollectLeadInfo) {
          systemPrompt += "Your primary goal is to collect the following visitor information in a conversational way: name, email, phone (if possible), property interest, and budget. ";
          systemPrompt += "Ask for only ONE piece of missing information at a time. ";
          systemPrompt += "Also evaluate their interest level and urgency to buy or sell on a scale from 1-10 based on their responses. ";
          systemPrompt += "Be natural and friendly, not robotic or formulaic. ";
        } else {
          systemPrompt += "Provide helpful, concise, and friendly responses. If asked about properties, ";
          systemPrompt += "provide specific details when available. If unsure, suggest checking with a real estate agent.";
        }
        
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
            visitor_id: leadInfo?.visitorId || null
          });
          
        if (insertError) {
          console.error('❌ Error storing conversation:', insertError);
        } else {
          console.log('✅ Conversation saved to database');
        }
        
        // If we have collected enough lead info, create a lead
        if (leadInfo.email && (leadInfo.name || leadInfo.phone || leadInfo.budget)) {
          console.log('👥 Creating or updating lead with info:', leadInfo);
          
          // Check if lead already exists
          const { data: existingLeads, error: findError } = await supabase
            .from('leads')
            .select('*')
            .eq('user_id', userId)
            .eq('email', leadInfo.email);
            
          if (findError) {
            console.error('❌ Error checking for existing lead:', findError);
          } else if (existingLeads && existingLeads.length > 0) {
            // Update existing lead
            const existingLead = existingLeads[0];
            const updates = {};
            
            if (leadInfo.name && !existingLead.first_name) {
              // Split name into first and last
              const nameParts = leadInfo.name.split(' ');
              updates.first_name = nameParts[0];
              if (nameParts.length > 1) {
                updates.last_name = nameParts.slice(1).join(' ');
              }
            }
            
            if (leadInfo.phone && !existingLead.phone) updates.phone = leadInfo.phone;
            if (leadInfo.budget && !existingLead.budget) {
              // Convert budget string to number if possible
              const budgetNum = parseFloat(leadInfo.budget.replace(/[^0-9.]/g, ''));
              if (!isNaN(budgetNum)) updates.budget = budgetNum;
            }
            if (leadInfo.propertyInterest && !existingLead.property_interest) updates.property_interest = leadInfo.propertyInterest;
            
            // Only update if we have new information
            if (Object.keys(updates).length > 0) {
              const { error: updateError } = await supabase
                .from('leads')
                .update(updates)
                .eq('id', existingLead.id);
                
              if (updateError) {
                console.error('❌ Error updating existing lead:', updateError);
              } else {
                console.log('✅ Lead updated successfully');
              }
            }
          } else {
            // Create new lead
            const nameData = {};
            // Split name into first and last if available
            if (leadInfo.name) {
              const nameParts = leadInfo.name.split(' ');
              nameData.first_name = nameParts[0];
              if (nameParts.length > 1) {
                nameData.last_name = nameParts.slice(1).join(' ');
              }
            }
            
            // Convert budget string to number if possible
            let budgetNum = null;
            if (leadInfo.budget) {
              budgetNum = parseFloat(leadInfo.budget.replace(/[^0-9.]/g, ''));
              if (isNaN(budgetNum)) budgetNum = null;
            }
            
            const { error: insertLeadError } = await supabase
              .from('leads')
              .insert({
                user_id: userId,
                ...nameData,
                email: leadInfo.email,
                phone: leadInfo.phone || null,
                source: 'AI Chatbot',
                property_interest: leadInfo.propertyInterest || null,
                budget: budgetNum,
                conversation_id: chatConversationId,
                status: 'new'
              });
              
            if (insertLeadError) {
              console.error('❌ Error creating new lead:', insertLeadError);
            } else {
              console.log('✅ New lead created successfully');
              
              // Also create an activity record
              await supabase
                .from('activities')
                .insert({
                  user_id: userId,
                  type: 'lead',
                  description: 'New lead captured via chatbot',
                  target_type: 'lead',
                  target_id: chatConversationId  // Using conversation ID as reference
                });
            }
          }
        }
      } catch (dbError) {
        console.error('❌ Exception storing chat session:', dbError);
      }
    }
    
    console.log('📤 Response prepared:', { 
      responsePreview: response?.substring(0, 50) + '...',
      source: responseSource,
      conversationId: chatConversationId,
      leadInfo
    });
    
    return new Response(
      JSON.stringify({
        response,
        source: responseSource,
        conversationId: chatConversationId,
        leadInfo
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
