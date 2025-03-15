
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.3.0";

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
    const { 
      message, 
      userId, 
      conversationId,
      previousMessages = [],
      trainingResults = {},
      propertyRecommendations = [],
      intentClassification,
      responseSource = 'ai',
      trainingContext = '',
      isAgencyQuestion = false,
      strictMode = false,
      debugInfo = {}
    } = await req.json();
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`AI chatbot processing - User ID: ${userId}, Intent: ${intentClassification}`);
    console.log(`Is agency question: ${isAgencyQuestion}, Response source: ${responseSource}`);
    console.log(`Previous messages count: ${previousMessages.length}`);
    console.log(`Strict mode: ${strictMode}, Debug info:`, debugInfo);
    
    // Enhanced logging for debugging training data issues
    if (trainingResults) {
      console.log(`Training results provided: QA matches: ${trainingResults.qaMatches?.length || 0}, File content: ${trainingResults.fileContent?.length || 0}`);
      
      // Log first few training matches to help debug
      if (trainingResults.qaMatches && trainingResults.qaMatches.length > 0) {
        console.log(`First QA match: Q: "${trainingResults.qaMatches[0].question?.substring(0, 50)}...", A: "${trainingResults.qaMatches[0].answer?.substring(0, 50)}..."`);
      }
      
      if (trainingResults.fileContent && trainingResults.fileContent.length > 0) {
        console.log(`First file content: "${trainingResults.fileContent[0].text?.substring(0, 100)}..."`);
      }
    }
    
    // Log and validate training context for agency questions
    if (isAgencyQuestion) {
      console.log('🏢 AGENCY QUESTION DETECTED IN AI FUNCTION');
      
      // Debug log training context for agency questions
      if (trainingContext) {
        console.log('🏢 TRAINING CONTEXT FOR AGENCY QUESTION:');
        console.log(trainingContext.substring(0, 500) + '...');
      } else {
        console.log('⚠️ NO TRAINING CONTEXT PROVIDED FOR AGENCY QUESTION!');
      }
      
      // Debug log training results for agency questions
      if (trainingResults.qaMatches && trainingResults.qaMatches.length > 0) {
        console.log(`🏢 QA MATCHES: ${trainingResults.qaMatches.length}`);
        trainingResults.qaMatches.forEach((match, i) => {
          console.log(`QA Match ${i+1}: Q: ${match.question?.substring(0, 100)}`);
          console.log(`A: ${match.answer?.substring(0, 100)}`);
        });
      } else {
        console.log('⚠️ NO QA MATCHES FOR AGENCY QUESTION!');
      }
      
      if (trainingResults.fileContent && trainingResults.fileContent.length > 0) {
        console.log(`🏢 FILE CONTENT MATCHES: ${trainingResults.fileContent.length}`);
        trainingResults.fileContent.forEach((content, i) => {
          console.log(`File Content ${i+1}: ${content.text?.substring(0, 100)}`);
        });
      } else {
        console.log('⚠️ NO FILE CONTENT MATCHES FOR AGENCY QUESTION!');
      }
    }
    
    // Format previous messages for OpenAI - ensure we map internal roles to OpenAI roles
    const formattedPreviousMessages = previousMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    // Create a system prompt that includes agency information and strict instructions
    let systemContent = trainingContext || `You are an AI assistant for a real estate agency. Respond in a helpful, friendly manner.`;
    
    // If strict mode is enabled (default now), add strong instructions about ONLY using provided data
    if (strictMode) {
      systemContent = `You are an AI assistant for a real estate agency.
Your ONLY source of truth is the agency's training data and property listings provided below.
DO NOT make up ANY information about properties, the agency, or real estate topics.
If you don't have the information in the provided data, say: "I don't have that information."
`;
    }
    
    // Check if we're dealing with an agency question - if so, prioritize training data
    if (isAgencyQuestion) {
      console.log('🏢 Handling agency question, prioritizing training data');
      
      // Add specific agency instructions for this type of question
      systemContent += `\n\nIMPORTANT: This is a question about our agency. ONLY use the provided training data to answer this question. DO NOT make up information about the agency. If no training data is available, politely explain that you don't have that specific information.`;
      
      // Include any training context at the top of the prompt
      if (trainingContext) {
        systemContent += `\n\nHere is information about our agency:\n${trainingContext}`;
      }
    }
    else {
      // For non-agency questions, add general instructions
      systemContent += `\n\nFollow these guidelines:
- Always be accurate and specific.
- If you don't know something, say so rather than making up information.
- Keep responses concise and easy to understand.
- Be friendly and conversational in tone.
- ALWAYS refer to previous messages in the conversation when relevant.
- NEVER invent or make up property details.`;
      
      // Include training context if available
      if (trainingContext) {
        systemContent += `\n\nHere is relevant information from our knowledge base that may help with your response:\n${trainingContext}`;
      }
    }
    
    // Add property information if available
    if (propertyRecommendations && propertyRecommendations.length > 0) {
      systemContent += `\n\nThe following properties may be relevant to the user's query:`;
      propertyRecommendations.forEach((property, index) => {
        systemContent += `\nProperty ${index + 1}: ${property.title}, Price: ${property.price}, ${property.bedroomCount || 0} bedrooms, Location: ${property.location || 'Not specified'}`;
        if (property.features && property.features.length > 0) {
          systemContent += `, Features: ${property.features.join(', ')}`;
        }
      });
      
      // Add additional instructions about ONLY referring to these properties
      systemContent += `\n\nIMPORTANT: ONLY mention these specific properties. DO NOT make up or invent any other properties.`;
    } else if (intentClassification === 'property_search' || message.toLowerCase().includes('property') || message.toLowerCase().includes('house')) {
      // If user is asking about properties but none were found
      systemContent += `\n\nIMPORTANT: No property listings were found that match the user's query. DO NOT make up any property details. Instead, suggest that the user provide more details about what they're looking for or offer to take their contact information.`;
    }
    
    // Log the system content for debugging
    console.log(`System content preview: ${systemContent.substring(0, 200)}...`);
    
    // Create messages array starting with the system message
    const messages = [
      { role: 'system', content: systemContent }
    ];
    
    // Add previous messages to maintain conversation context
    if (formattedPreviousMessages.length > 0) {
      console.log(`Adding ${formattedPreviousMessages.length} previous messages to conversation context`);
      messages.push(...formattedPreviousMessages);
    }
    
    // Add the current user message
    messages.push({ role: "user", content: message });
    
    // 🔍 Debug: Log the final data being sent to OpenAI
    console.log('🔍 Training Data Sent to OpenAI:', JSON.stringify({
      qaMatches: trainingResults.qaMatches?.length || 0,
      fileContent: trainingResults.fileContent?.length || 0
    }, null, 2));
    console.log('🔍 Training Context Sent to OpenAI:', systemContent.substring(0, 500));
    
    // Call OpenAI API with increased temperature for more dynamic responses
    // and increased max_tokens to allow for fuller responses
    const chatCompletion = await openai.createChatCompletion({
      model: 'gpt-4o-mini', // Using the most recent model
      messages: messages,
      temperature: 0.75, // Slightly increased for more natural responses
      max_tokens: 800,    // Increased to allow for more detailed responses
      presence_penalty: 0.2, // Slight penalty to avoid repetition
      frequency_penalty: 0.2 // Slight penalty to encourage diversity
    });
    
    // Get the response
    const aiResponse = chatCompletion.data.choices[0].message.content;
    
    // Determine the response source - we'll pass the original but might override
    let finalResponseSource = responseSource;
    
    // For agency questions, if we had training data, mark as training source
    if (isAgencyQuestion && trainingContext) {
      finalResponseSource = 'training';
      console.log('🏢 Marking response as training source for agency question');
    }
    
    // Log the final response
    console.log(`Response (from ${finalResponseSource}):`);
    console.log(aiResponse.substring(0, 200) + '...');
    
    return new Response(
      JSON.stringify({
        response: aiResponse,
        source: finalResponseSource || responseSource || 'training', // Default to training source
        conversationId: conversationId || `conv_${Date.now()}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in AI chatbot function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "I'm sorry, I encountered an error. Please try again."
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
