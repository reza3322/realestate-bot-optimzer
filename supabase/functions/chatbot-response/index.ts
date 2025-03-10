
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
    let propertyRecommendation = false;
    let propertyListings = [];
    
    // Step 1: Find relevant training data for this user
    if (userId) {
      console.log('🔍 Searching for relevant training data...');
      try {
        // First check the chatbot_training_data table (for manually entered Q&A)
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
              
              // Extra points for key real estate and lead capture terms
              const realEstateTerms = ['property', 'house', 'price', 'buy', 'sell', 'rent', 'mortgage', 'bedroom', 'bathroom', 'condo', 'apartment'];
              const leadCaptureTerms = ['contact', 'email', 'phone', 'schedule', 'viewing', 'tour', 'visit', 'details', 'more information'];
              
              if (realEstateTerms.includes(term)) {
                matchScore += 0.8; // Boosted weight for real estate terms
              }
              
              if (leadCaptureTerms.includes(term)) {
                matchScore += 1.0; // Higher weight for lead capture terms
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
            
            // Apply category-specific boosts
            let categoryBoost = 1.0;
            if (item.category && 
                (item.category.toLowerCase().includes('property') || 
                 item.category.toLowerCase().includes('listing'))) {
              categoryBoost = 1.3; // Higher priority for property listings
            } else if (item.category && 
                      (item.category.toLowerCase().includes('lead') || 
                       item.category.toLowerCase().includes('contact'))) {
              categoryBoost = 1.2; // Higher priority for lead capture content
            }
            
            // Apply the priority multiplier from the training data
            const priorityMultiplier = 1 + (item.priority || 0) / 10;
            
            // Final score calculation with category boost
            const finalScore = (matchScore + exactPhraseBonus) * priorityMultiplier * categoryBoost;
            
            return {
              ...item,
              relevanceScore: finalScore,
              source: 'training'
            };
          });
          
          // Now also check the chatbot_training_files table
          console.log('🔍 Searching for relevant uploaded file content...');
          const { data: fileMatches, error: fileError } = await supabase
            .from('chatbot_training_files')
            .select('*')
            .eq('user_id', userId)
            .order('priority', { ascending: false });
            
          if (fileError) {
            console.error('❌ Error fetching uploaded file content:', fileError);
          } else if (fileMatches && fileMatches.length > 0) {
            console.log(`✅ Found ${fileMatches.length} training files to check`);
            
            // Score file content matches similar to training data
            const scoredFileMatches = fileMatches.map(item => {
              // Check if message terms appear in the extracted text
              const extractedText = item.extracted_text.toLowerCase();
              let matchScore = 0;
              
              // Check for term presence in extracted text
              for (const term of messageTerms) {
                if (extractedText.includes(term)) {
                  matchScore += 0.5; // Lower weight per term than exact QA matches
                }
                
                // Boost property and lead capture terms
                const propertyTerms = ['property', 'house', 'condo', 'apartment', 'bedroom', 'bathroom', 'pool', 'garage'];
                const locationTerms = ['location', 'city', 'neighborhood', 'area', 'miami', 'new york', 'los angeles'];
                const priceTerms = ['price', 'budget', '$', 'dollar', 'cost', 'afford'];
                
                if (propertyTerms.includes(term)) matchScore += 0.7;
                if (locationTerms.includes(term)) matchScore += 0.7;
                if (priceTerms.includes(term)) matchScore += 0.8;
              }
              
              // Check for exact phrase match
              if (extractedText.includes(message.toLowerCase())) {
                matchScore += 2;
              }
              
              // Check for partial phrase matches
              const messagePhrases = splitIntoPhrases(message.toLowerCase());
              for (const phrase of messagePhrases) {
                if (phrase.length > 5 && extractedText.includes(phrase)) {
                  matchScore += 0.5;
                }
              }
              
              // Apply priority multiplier
              const priorityMultiplier = 1 + (item.priority || 0) / 10;
              const finalScore = matchScore * priorityMultiplier;
              
              // Limit length of extracted text to avoid including large chunks
              const maxExtractLength = 250;
              const truncatedText = item.extracted_text.length > maxExtractLength ? 
                                    item.extracted_text.substring(0, maxExtractLength) + "..." : 
                                    item.extracted_text;
              
              // Convert file to a "fake" Q&A pair for consistency
              return {
                question: `What information is in ${item.source_file}?`,
                answer: truncatedText,
                relevanceScore: finalScore,
                source: 'file'
              };
            });
            
            // Check for property listings separately if they exist
            const containsPropertySearchTerms = messageTerms.some(term => 
              ['property', 'house', 'condo', 'apartment', 'home', 'bedroom'].includes(term)
            );
            
            // Check for location terms
            const locationTerms = ['in', 'near', 'around', 'at'];
            const containsLocationTerms = messageTerms.some(term => locationTerms.includes(term));
            
            // Check for price/budget terms
            const priceTerms = ['under', 'below', 'above', 'over', 'between', 'affordable', 'luxury', 'budget'];
            const containsPriceTerms = messageTerms.some(term => priceTerms.includes(term));
            
            if (containsPropertySearchTerms || containsLocationTerms || containsPriceTerms) {
              // This is likely a property search query
              console.log('🏠 Detected property search intent');
              propertyRecommendation = true;
              
              // Try to find properties in the training data that match the query
              try {
                // Simple proof of concept - in a real system this would be more sophisticated
                const { data: properties, error: propertiesError } = await supabase
                  .from('properties')
                  .select('*')
                  .eq('user_id', userId)
                  .limit(3); // Limit to max 3 properties
                
                if (propertiesError) {
                  console.error('❌ Error fetching properties:', propertiesError);
                } else if (properties && properties.length > 0) {
                  console.log(`✅ Found ${properties.length} properties to recommend (limited to 3)`);
                  propertyListings = properties;
                  
                  // Format properties for inclusion in the AI prompt
                  const propertyDescriptions = properties.map(property => {
                    return `
🏡 **${property.title}** - $${property.price} 
📍 Location: ${property.city}, ${property.state}
✅ ${property.bedrooms} BR, ${property.bathrooms} Bath
🔗 [View Listing](https://youragency.com/listing/${property.id})
`;
                  }).join('\n');
                  
                  // Add this to the relevant training data with high priority
                  relevantTrainingData.unshift({
                    question: "What properties do you have available?",
                    answer: "Here are some properties you might be interested in:\n" + propertyDescriptions
                  });
                }
              } catch (propertiesError) {
                console.error('❌ Exception during property search:', propertiesError);
              }
            }
            
            // Combine both types of matches
            const allScoredMatches = [...scoredMatches, ...scoredFileMatches];
            
            // Sort by relevance score and take top matches
            const relevantMatches = allScoredMatches
              .filter(item => item.relevanceScore > 1) // Only consider reasonably relevant items
              .sort((a, b) => b.relevanceScore - a.relevanceScore)
              .slice(0, 3); // Take top 3 most relevant items
            
            console.log(`🔍 Found ${relevantMatches.length} relevant items (from both Q&A and files)`);
            
            if (relevantMatches.length > 0) {
              // If we have a highly relevant match, use it directly
              const bestMatch = relevantMatches[0];
              if (bestMatch.relevanceScore > 5) {
                console.log(`🎯 Using match: "${bestMatch.question}" with score ${bestMatch.relevanceScore} from source: ${bestMatch.source}`);
                response = bestMatch.answer;
                responseSource = bestMatch.source;
              } else {
                // Otherwise, collect relevant training data to enhance the AI response
                relevantTrainingData = relevantMatches.map(item => ({
                  question: item.question,
                  answer: item.answer
                }));
                console.log(`📚 Using ${relevantTrainingData.length} items to enhance AI response`);
              }
            }
          }
        } else {
          console.log('❌ No training data found for user');
        }
      } catch (trainingQueryError) {
        console.error('❌ Exception during training data query:', trainingQueryError);
      }
    }

    // Enhanced lead qualification logic - more triggers for lead collection
    if (previousMessages && Array.isArray(previousMessages)) {
      // Check for qualifying keywords in the conversation - expanded list
      const qualifyingKeywords = [
        'buy', 'purchase', 'looking for', 'interested in', 'property', 'house', 'apartment', 'home',
        'send details', 'more information', 'tell me about', 'pricing', 'schedule', 'viewing',
        'tour', 'visit', 'availability', 'when can I see', 'contact', 'agent', 'broker', 'realtor'
      ];
      
      // Check user messages for qualifying keywords
      const containsQualifyingKeywords = previousMessages
        .filter(msg => msg.role === 'user')
        .some(msg => qualifyingKeywords.some(keyword => msg.content.toLowerCase().includes(keyword)));
      
      // Also check current message
      const currentMessageHasQualifyingKeywords = qualifyingKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
      );
      
      if (containsQualifyingKeywords || currentMessageHasQualifyingKeywords) {
        isQualifyingConversation = true;
        
        // Check if we have already collected contact info
        const hasName = leadInfo.name || previousMessages.some(msg => msg.role === 'bot' && msg.content.includes('name'));
        const hasEmail = leadInfo.email || previousMessages.some(msg => msg.role === 'bot' && msg.content.includes('email'));
        const hasPhone = leadInfo.phone || previousMessages.some(msg => msg.role === 'bot' && msg.content.includes('phone'));
        const hasBudget = leadInfo.budget || previousMessages.some(msg => msg.role === 'bot' && msg.content.includes('budget'));
        
        // More refined logic for when to collect lead info
        shouldCollectLeadInfo = !hasEmail || (!hasPhone && Math.random() > 0.5) || (!hasName && Math.random() > 0.7) || (!hasBudget && propertyRecommendation);
        
        console.log('📊 Lead qualification check:', { 
          isQualifyingConversation, 
          shouldCollectLeadInfo,
          hasName,
          hasEmail,
          hasPhone,
          hasBudget,
          propertyRecommendation
        });
      }
    }

    // Enhanced lead info extraction from the current message
    if (isQualifyingConversation) {
      // Extract email with improved regex
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const emailMatches = message.match(emailRegex);
      if (emailMatches && !leadInfo.email) {
        leadInfo.email = emailMatches[0];
        console.log('📧 Extracted email from message:', leadInfo.email);
      }
      
      // Enhanced phone extraction with international formats
      const phoneRegex = /\b(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
      const phoneMatches = message.match(phoneRegex);
      if (phoneMatches && !leadInfo.phone) {
        leadInfo.phone = phoneMatches[0];
        console.log('📱 Extracted phone from message:', leadInfo.phone);
      }
      
      // Improved name extraction
      const namePatterns = [
        /(?:my name is|i am|i'm|this is) ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/i,
        /([A-Z][a-z]+(?: [A-Z][a-z]+)?) here/i,
        /^([A-Z][a-z]+(?: [A-Z][a-z]+)?)$/i  // Message is just a name
      ];
      
      for (const pattern of namePatterns) {
        const nameMatch = message.match(pattern);
        if (nameMatch && nameMatch[1] && !leadInfo.name) {
          leadInfo.name = nameMatch[1];
          console.log('👤 Extracted name from message:', leadInfo.name);
          break;
        }
      }
      
      // Enhanced budget extraction
      const budgetRegex = /(?:budget|afford|looking to spend|price range|under|up to|max|maximum)[^\d]*(\$?[\d,]+(?:[\d,.]+k)?(?:\s*-\s*\$?[\d,]+(?:[\d,.]+k)?)?)/i;
      const budgetMatch = message.match(budgetRegex);
      if (budgetMatch && budgetMatch[1] && !leadInfo.budget) {
        leadInfo.budget = budgetMatch[1];
        console.log('💰 Extracted budget from message:', leadInfo.budget);
      }
      
      // Enhanced property interest detection
      const propertyTypeTerms = {
        'house': 'House',
        'home': 'House',
        'condo': 'Condo',
        'apartment': 'Apartment',
        'townhouse': 'Townhouse',
        'duplex': 'Duplex',
        'penthouse': 'Penthouse',
        'studio': 'Studio',
        'loft': 'Loft'
      };
      
      const interestTypeTerms = {
        'buy': 'Buying',
        'buying': 'Buying',
        'purchase': 'Buying',
        'invest': 'Buying',
        'sell': 'Selling',
        'selling': 'Selling',
        'rent': 'Renting',
        'renting': 'Renting',
        'lease': 'Renting'
      };
      
      // Detect property type interest
      for (const [term, value] of Object.entries(propertyTypeTerms)) {
        if (message.toLowerCase().includes(term) && !leadInfo.propertyType) {
          leadInfo.propertyType = value;
          console.log('🏠 Extracted property type interest:', leadInfo.propertyType);
          break;
        }
      }
      
      // Detect buying/selling/renting interest
      for (const [term, value] of Object.entries(interestTypeTerms)) {
        if (message.toLowerCase().includes(term) && !leadInfo.propertyInterest) {
          leadInfo.propertyInterest = value;
          console.log('🔑 Extracted property interest type:', leadInfo.propertyInterest);
          break;
        }
      }
      
      // Extract location interest
      const locationRegex = /(?:in|near|around|at) ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/i;
      const locationMatch = message.match(locationRegex);
      if (locationMatch && locationMatch[1] && !leadInfo.location) {
        leadInfo.location = locationMatch[1];
        console.log('📍 Extracted location interest:', leadInfo.location);
      }
    }

    // If no direct match in training data or files, use enhanced OpenAI
    if (!response) {
      console.log('🤖 Generating enhanced response with OpenAI');
      
      try {
        // Create system message with enhanced lead qualification and property recommendation instructions
        let systemPrompt = "";
        
        // Different system prompts based on whether it's demo mode or real user chatbot
        if (userId === 'demo-user') {
          // DEMO MODE SYSTEM PROMPT - Focused on explaining RealHomeAI product
          systemPrompt = `You are an AI chatbot representing RealHomeAI, a SaaS product for real estate professionals. 
          
Your primary goal is to explain the RealHomeAI product features, answer real estate industry questions, and engage with potential customers in a friendly, conversational way.

RealHomeAI is an AI-powered chatbot for real estate professionals.
It helps real estate agents capture leads, answer questions, and recommend properties.

Key Features:
- 24/7 AI chatbot for real estate websites
- Customizable training for each agency
- Lead qualification & automated follow-ups
- Integration with real estate CRMs
- Analytics dashboard for tracking conversations

Pricing:
- Starter: $29/month - Basic chatbot with lead capture
- Pro: $79/month - AI chatbot with property recommendations
- Enterprise: Custom pricing - Full integration with CRM and website

IMPORTANT BEHAVIORS:
1. ONLY answer questions related to real estate industry, SaaS products, or the RealHomeAI product itself. 
2. If asked about unrelated topics (politics, jokes, etc.), politely steer the conversation back to real estate.
3. Be friendly, helpful, and conversational in tone. Sound like a knowledgeable real estate tech consultant.
4. Always try to highlight how RealHomeAI solves problems for real estate professionals.
5. When appropriate, ask for the visitor's email to "send more information about RealHomeAI" - but don't be pushy.`;
        } else {
          // REAL USER CHATBOT SYSTEM PROMPT - Focused on lead generation and property recommendations
          systemPrompt = `You are a friendly, conversational real estate assistant for a property agency. Your goal is to help potential clients find properties, answer questions, and ultimately connect them with a real estate agent.

IMPORTANT GUIDELINES:
1. Always sound natural, friendly, and helpful - like a real estate agent who genuinely wants to help.
2. Keep responses clear, structured, and concise - use bullet points and formatting.
3. NEVER recommend more than 3 properties at once - quality over quantity.
4. NEVER include large blocks of unformatted text from websites.
5. DO NOT include unnecessary metadata, page titles, nav menus or legal disclaimers.
6. When recommending properties, use a structured format with bullet points and lots of spacing.
7. After offering property recommendations, ask if they want to see more or schedule a viewing.
8. If a user expresses interest in a property, ask for their contact information naturally.
9. Extract useful lead information (name, email, phone, budget, location preferences) through natural conversation.
10. Focus on being helpful first - lead capture should feel natural and beneficial to the user.
11. Ask follow-up questions to maintain a natural conversation flow and learn more about their needs.`;

          // Format structured property recommendations if available
          if (propertyListings.length > 0) {
            systemPrompt += "\n\nHere are up to 3 properties to recommend if they match the user's request:\n\n";
            
            propertyListings.forEach(property => {
              systemPrompt += `
🏡 **${property.title}** - $${property.price} 
📍 Location: ${property.city || 'Local Area'}, ${property.state || ''}
✅ ${property.bedrooms || '?'} BR, ${property.bathrooms || '?'} Bath${property.size ? ', ' + property.size + ' sqft' : ''}
${property.description ? '📝 ' + property.description.substring(0, 100) + '...' : ''}
🔗 Property ID: ${property.id}

`;
            });
          }

          // Add relevant training data to the system prompt
          if (relevantTrainingData.length > 0) {
            systemPrompt += "\n\nHere is some specific information provided by the real estate agency that you should prioritize in your answers:\n\n";
            
            for (const item of relevantTrainingData) {
              systemPrompt += `Question: ${item.question}\nAnswer: ${item.answer}\n\n`;
            }
            
            systemPrompt += "When the user's question relates to the information above, make sure to incorporate those details into your response. If their question isn't related to the above information, you can provide general real estate knowledge.";
          }
          
          // If we detected property intent, add specific instructions
          if (propertyRecommendation) {
            systemPrompt += "\n\nThe user appears to be looking for property recommendations. Make sure to:\n";
            systemPrompt += "1. Suggest specific properties that match their criteria when possible (maximum of 3).\n";
            systemPrompt += "2. Present each property in a structured format with bullet points.\n";
            systemPrompt += "3. Ask follow-up questions about their preferences (location, size, amenities, etc.).\n";
            systemPrompt += "4. Offer to send them more property details, and then naturally ask for their contact information.\n";
            systemPrompt += "5. Suggest a viewing or consultation with an agent as a helpful next step.\n";
            systemPrompt += "6. Always ask if they want to see more options after showing properties.\n";
          }
          
          // If we need to collect lead info, add specific guidance
          if (shouldCollectLeadInfo) {
            systemPrompt += "\n\nThis conversation has potential for lead capture. Without being pushy:\n";
            
            if (!leadInfo.email && !leadInfo.phone) {
              systemPrompt += "- After providing helpful information, offer to send more details and ask how they prefer to receive them (email or phone).\n";
            } else if (leadInfo.email && !leadInfo.name) {
              systemPrompt += "- Try to naturally ask for their name in the conversation flow.\n";
            } else if (leadInfo.name && !leadInfo.propertyInterest) {
              systemPrompt += "- Try to determine what type of property they're interested in and whether they're looking to buy, sell, or rent.\n";
            }
            
            if (propertyRecommendation && !leadInfo.budget) {
              systemPrompt += "- When appropriate, ask about their budget or price range to help find suitable properties.\n";
            }
            
            systemPrompt += "Remember: Always provide value first, then ask for information as a way to better help them.";
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
        
        // NEW: Verify response quality with OpenAI before sending
        const isQualityResponse = await verifyResponseQuality(
          openai, 
          message, 
          response, 
          propertyRecommendation
        );
        
        // If response fails verification, regenerate it with stricter guidelines
        if (!isQualityResponse) {
          console.log('⚠️ Response failed quality verification, regenerating...');
          
          const improvedPrompt = systemPrompt + `

IMPORTANT CORRECTION NEEDED:
The previous response was too verbose, unstructured, or contained too many recommendations.
Please follow these STRICT guidelines:
1. Keep your response BRIEF and structured - use bullet points.
2. NEVER include more than 3 property recommendations.
3. DO NOT include metadata, page titles, menus, or legal disclaimers.
4. Make sure your response is focused on the user's specific question.
5. Use proper whitespace and formatting for readability.`;

          const updatedMessages = [
            { role: "system", content: improvedPrompt },
            { role: "user", content: message }
          ];
          
          if (previousMessages && Array.isArray(previousMessages) && previousMessages.length > 0) {
            const contextMessages = previousMessages
              .slice(-4) // Use fewer messages for context to save tokens
              .map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
              }));
            
            updatedMessages.splice(1, 0, ...contextMessages);
          }
          
          console.log('🔄 Sending improved request to OpenAI...');
          
          const improvedCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: updatedMessages,
            max_tokens: 200, // Reduced token count to encourage brevity
            temperature: 0.5, // Lower temperature for more consistent response
          });
          
          response = improvedCompletion.choices[0]?.message?.content || "I apologize, but I need to provide you with a more focused response. Could you please specify exactly what you're looking for?";
        }
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
        if (leadInfo.email || leadInfo.phone) {
          console.log('👥 Creating or updating lead with info:', leadInfo);
          
          // Check if lead already exists
          const { data: existingLeads, error: findError } = await supabase
            .from('leads')
            .select('*')
            .eq('user_id', userId)
            .or(`email.eq.${leadInfo.email},phone.eq.${leadInfo.phone}`);
            
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
            
            if (leadInfo.email && !existingLead.email) updates.email = leadInfo.email;
            if (leadInfo.phone && !existingLead.phone) updates.phone = leadInfo.phone;
            if (leadInfo.budget && !existingLead.budget) {
              // Convert budget string to number if possible
              const budgetNum = parseFloat(leadInfo.budget.replace(/[^0-9.]/g, ''));
              if (!isNaN(budgetNum)) updates.budget = budgetNum;
            }
            if (leadInfo.propertyInterest && !existingLead.property_interest) updates.property_interest = leadInfo.propertyInterest;
            
            // Add location to notes if available
            if (leadInfo.location) {
              updates.notes = existingLead.notes 
                ? `${existingLead.notes}\nInterested in: ${leadInfo.location}`
                : `Interested in: ${leadInfo.location}`;
            }
            
            // Add property type to notes if available
            if (leadInfo.propertyType) {
              updates.notes = updates.notes || existingLead.notes || '';
              if (updates.notes) updates.notes += '\n';
              updates.notes += `Property type: ${leadInfo.propertyType}`;
            }
            
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
            
            // Prepare notes with additional lead info
            let notes = '';
            if (leadInfo.location) notes += `Interested in: ${leadInfo.location}\n`;
            if (leadInfo.propertyType) notes += `Property type: ${leadInfo.propertyType}\n`;
            
            const { error: insertLeadError } = await supabase
              .from('leads')
              .insert({
                user_id: userId,
                ...nameData,
                email: leadInfo.email || null,
                phone: leadInfo.phone || null,
                source: 'AI Chatbot',
                property_interest: leadInfo.propertyInterest || null,
                budget: budgetNum,
                notes: notes || null,
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
        leadInfo,
        isVerified: true
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

// New function to verify response quality with OpenAI
async function verifyResponseQuality(openai, userQuestion, generatedResponse, isPropertyRecommendation) {
  try {
    console.log('🔍 Verifying response quality with OpenAI...');
    
    const verificationPrompt = `You are an AI assistant verifying chatbot responses. 

- The user asked: "${userQuestion}"
- The chatbot wants to reply: "${generatedResponse}"

✅ If the response is correct, relevant to real estate, and useful, reply with "APPROVED".
❌ If the response contains marketing spam, unnecessary metadata, or is unclear, reply with "REJECTED".
❌ If the response contains more than 3 property recommendations, reply with "REJECTED".
❌ If the response contains long, unstructured text, reply with "REJECTED".

Only respond with "APPROVED" or "REJECTED".`;

    const verification = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: verificationPrompt },
      ],
      max_tokens: 20,
      temperature: 0.1,
    });
    
    const result = verification.choices[0]?.message?.content || "";
    console.log('✅ Verification result:', result);
    
    return result.toUpperCase().includes("APPROVED");
  } catch (error) {
    console.error('❌ Error during response verification:', error);
    // If verification fails, assume the response is OK to avoid blocking the conversation
    return true;
  }
}
