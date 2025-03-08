import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.36.0';
import { OpenAI } from 'https://esm.sh/openai@4.11.1';
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  console.log("📥 Chatbot function received request");

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    
    // Variables for response tracking
    let response = null;
    let responseSource = null;
    let leadInfo = visitorInfo || {};
    let shouldCollectLeadInfo = false;
    let isQualifyingConversation = false;
    let relevantTrainingData = [];
    
    // Step 1: Find relevant training data for this user
    if (userId) {
      console.log('🔍 Searching for relevant training data...');
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
          
          // Enhanced NLP matching: Convert message to vector of terms
          const messageTerms = message.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .split(/\s+/) // Split on whitespace
            .filter(word => word.length > 2); // Filter out short words
          
          // Calculate relevance scores for each training item
          const scoredMatches = trainingMatches.map(item => {
            // Split question into terms for comparison
            const questionTerms = item.question.toLowerCase()
              .replace(/[^\w\s]/g, '')
              .split(/\s+/)
              .filter(word => word.length > 2);
            
            // Calculate term frequency overlap
            let matchScore = 0;
            let exactPhraseBonus = 0;
            
            // Check for term matches
            for (const term of messageTerms) {
              if (questionTerms.includes(term)) {
                matchScore += 1;
              }
              // Extra points for key real estate terms
              if (['property', 'house', 'price', 'buy', 'sell', 'rent', 'mortgage', 'bedroom', 'bathroom'].includes(term)) {
                matchScore += 0.5;
              }
            }
            
            // Check for exact phrase matches (stronger signal)
            if (item.question.toLowerCase().includes(message.toLowerCase())) {
              exactPhraseBonus = 3;
            } else {
              // Check for partial phrase matches
              const messagePhrases = splitIntoPhrases(message.toLowerCase());
              for (const phrase of messagePhrases) {
                if (phrase.length > 5 && item.question.toLowerCase().includes(phrase)) {
                  exactPhraseBonus += 1;
                }
              }
            }
            
            // Apply the priority multiplier from the training data
            const priorityMultiplier = 1 + (item.priority || 0) / 10;
            
            // Final score calculation
            const finalScore = (matchScore + exactPhraseBonus) * priorityMultiplier;
            
            return {
              ...item,
              relevanceScore: finalScore
            };
          });
          
          // Sort by relevance score and take top matches
          const relevantMatches = scoredMatches
            .filter(item => item.relevanceScore > 1) // Only consider reasonably relevant items
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 3); // Take top 3 most relevant items
          
          console.log(`🔍 Found ${relevantMatches.length} relevant training items`);
          
          if (relevantMatches.length > 0) {
            // If we have a highly relevant match, use it directly
            const bestMatch = relevantMatches[0];
            if (bestMatch.relevanceScore > 5) {
              console.log(`🎯 Using training data match: "${bestMatch.question}" with score ${bestMatch.relevanceScore}`);
              response = bestMatch.answer;
              responseSource = 'training';
            } else {
              // Otherwise, collect relevant training data to enhance the AI response
              relevantTrainingData = relevantMatches.map(item => ({
                question: item.question,
                answer: item.answer
              }));
              console.log(`📚 Using ${relevantTrainingData.length} training items to enhance AI response`);
            }
          }
        } else {
          console.log('❌ No training data found for user');
        }
      } catch (trainingQueryError) {
        console.error('❌ Exception during training data query:', trainingQueryError);
      }
    }

    // Check if this is a qualifying conversation to collect lead info
    if (previousMessages && Array.isArray(previousMessages)) {
      // Check for qualifying keywords in the conversation
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
      // Extract email
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
      const emailMatch = message.match(emailRegex);
      if (emailMatch && !leadInfo.email) {
        leadInfo.email = emailMatch[0];
        console.log('📧 Extracted email from message:', leadInfo.email);
      }
      
      // Extract budget
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
        leadInfo.name = message;
        console.log('👤 Extracted name from message:', leadInfo.name);
      }
    }

    // If no direct match in training data, use enhanced OpenAI
    if (!response) {
      console.log('🤖 Generating enhanced response with OpenAI');
      
      try {
        // Create system message with lead qualification instructions if needed
        let systemPrompt = "You are a helpful AI assistant for a real estate business. ";
        
        if (isQualifyingConversation && shouldCollectLeadInfo) {
          systemPrompt += "Your primary goal is to collect the following visitor information in a conversational way: name, email, phone (if possible), property interest, and budget. ";
          systemPrompt += "Ask for only ONE piece of missing information at a time. ";
          systemPrompt += "Also evaluate their interest level and urgency to buy or sell on a scale from 1-10 based on their responses. ";
          systemPrompt += "Be natural and friendly, not robotic or formulaic. ";
        } else {
          systemPrompt += "Provide helpful, concise, and friendly responses about real estate. ";
          
          // Add relevant training data to the system prompt
          if (relevantTrainingData.length > 0) {
            systemPrompt += "\n\nHere is some specific information provided by the real estate agent that you should prioritize in your answers:\n\n";
            
            for (const item of relevantTrainingData) {
              systemPrompt += `Question: ${item.question}\nAnswer: ${item.answer}\n\n`;
            }
            
            systemPrompt += "When the user's question relates to the information above, make sure to incorporate those details into your response. If their question isn't related to the above information, you can provide general real estate knowledge.";
          }
        }
        
        console.log('📋 System prompt length:', systemPrompt.length);

        // Create messages array with system prompt and user message
        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ];
        
        // Add previous messages for context if available
        if (previousMessages && Array.isArray(previousMessages) && previousMessages.length > 0) {
          // Format previous messages for the ChatGPT API
          const contextMessages = previousMessages
            .slice(-6) // Use last 6 messages for context
            .map(msg => ({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content
            }));
          
          // Insert contextMessages before the current user message
          messages.splice(1, 0, ...contextMessages);
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

// Helper function to split text into meaningful phrases
function splitIntoPhrases(text) {
  // Simple splitting on punctuation and conjunctions
  return text
    .replace(/[,;:.!?]/g, '#')
    .split('#')
    .map(phrase => phrase.trim())
    .filter(phrase => phrase.length > 0);
}
