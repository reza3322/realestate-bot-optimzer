
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
      isAgencyQuestion = false
    } = await req.json();
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`AI chatbot processing - User ID: ${userId}, Intent: ${intentClassification}`);
    console.log(`Is agency question: ${isAgencyQuestion}, Response source: ${responseSource}`);
    
    if (isAgencyQuestion) {
      console.log('🏢 AGENCY QUESTION DETECTED IN AI FUNCTION');
    }
    
    // Format previous messages for OpenAI
    const formattedPreviousMessages = previousMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    // Create a system prompt that includes agency information and instructions
    let systemContent = `You are an AI assistant for a real estate agency. Respond in a helpful, friendly manner.`;
    
    // Check if we're dealing with an agency question - if so, prioritize training data
    if (isAgencyQuestion) {
      console.log('🏢 Handling agency question, prioritizing training data');
      
      // Add specific agency instructions for this type of question
      systemContent += `\n\nThis is a question about our agency. ONLY use the provided training data to answer this question. DO NOT make up information about the agency. If no training data is available, politely explain that you don't have that specific information.`;
      
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
- Be friendly and conversational in tone.`;
      
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
    }
    
    // Log the system content for debugging
    console.log(`System content preview: ${systemContent.substring(0, 200)}...`);
    
    // Create messages array starting with the system message
    const messages = [
      { role: 'system', content: systemContent }
    ];
    
    // Add conversation history for context
    if (formattedPreviousMessages.length > 0) {
      messages.push(...formattedPreviousMessages);
    }
    
    // Add the current user message
    messages.push({ role: 'user', content: message });
    
    // Call OpenAI API
    const chatCompletion = await openai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
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
    console.log(aiResponse.substring(0, 100) + '...');
    
    return new Response(
      JSON.stringify({
        response: aiResponse,
        source: finalResponseSource,
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
