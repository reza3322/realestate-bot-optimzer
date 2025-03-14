
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.3.0";

// Constants
const OPENAI_MODEL = "gpt-4o-mini";
const MAX_TRAINING_CONTEXT_LENGTH = 8000;

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize OpenAI
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
      visitorInfo = {}, 
      conversationId, 
      previousMessages = [],
      trainingResults = {},
      propertyRecommendations = []
    } = await req.json();
    
    console.log(`Processing request for user ${userId}`);
    console.log(`Query: "${message}"`);
    console.log(`Training data: ${JSON.stringify({
      qaCount: trainingResults.qaMatches?.length || 0,
      fileCount: trainingResults.fileContent?.length || 0,
      propertyCount: propertyRecommendations?.length || 0
    })}`);
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format training content for the AI prompt
    let trainingContext = "";
    
    // Add Q&A pairs from training data
    if (trainingResults.qaMatches && trainingResults.qaMatches.length > 0) {
      trainingContext += "Here are some knowledge base Q&A pairs that may be relevant to the user's question:\n\n";
      
      trainingResults.qaMatches.forEach((match, index) => {
        trainingContext += `Q: ${match.question}\nA: ${match.answer}\n\n`;
      });
    }
    
    // Add content from uploaded files
    if (trainingResults.fileContent && trainingResults.fileContent.length > 0) {
      trainingContext += "Here is relevant information from our knowledge base:\n\n";
      
      trainingResults.fileContent.forEach((content, index) => {
        trainingContext += `Source: ${content.source || 'Uploaded file'}\n`;
        trainingContext += `Content: ${content.text.substring(0, 1000)}\n\n`;
      });
    }
    
    // Create property information context if we have recommendations
    let propertyContext = "";
    if (propertyRecommendations.length > 0) {
      propertyContext += "Here are properties from our database that may be relevant to the user's query:\n\n";
      
      propertyRecommendations.forEach((property, index) => {
        propertyContext += `Property ${index + 1}: ${property.title}\n`;
        propertyContext += `Price: ${property.price}\n`;
        propertyContext += `Location: ${property.location || 'Not specified'}\n`;
        
        if (property.bedrooms || property.bathroomCount) {
          propertyContext += `Details: `;
          if (property.bedroomCount) propertyContext += `${property.bedroomCount} bedrooms, `;
          if (property.bathroomCount) propertyContext += `${property.bathroomCount} bathrooms, `;
          propertyContext += '\n';
        }
        
        if (property.features && property.features.length > 0) {
          propertyContext += `Features: ${property.features.join(', ')}\n`;
        }
        
        if (property.hasPool) {
          propertyContext += `Swimming pool: Yes\n`;
        }
        
        propertyContext += `URL: ${property.url}\n\n`;
      });
    }
    
    // Combine contexts
    let combinedContext = trainingContext;
    if (propertyContext) {
      combinedContext += "\n" + propertyContext;
    }
    
    // Truncate if too long
    if (combinedContext.length > MAX_TRAINING_CONTEXT_LENGTH) {
      combinedContext = combinedContext.substring(0, MAX_TRAINING_CONTEXT_LENGTH) + "...";
    }
    
    // Previous messages for context
    const formattedPreviousMessages = previousMessages.map(msg => ({
      role: msg.role === 'bot' ? 'assistant' : 'user',
      content: msg.content
    }));
    
    // Create appropriate system message
    let systemPrompt = `You are a friendly and professional real estate assistant representing a real estate agency.`;
    
    if (combinedContext) {
      systemPrompt += `\n\nIMPORTANT - Use the following information from the user's database to answer their questions:

${combinedContext}

When responding:
1. Prioritize using information from the user's database (training files and property listings).
2. If the database contains relevant property information, highlight those details in your response.
3. If the database doesn't contain information needed to answer the question completely, use your general knowledge but clearly indicate what information is not in the database.
4. Always respond in a helpful, conversational tone as if you're a knowledgeable real estate agent.`;
    } else {
      systemPrompt += `\n\nI don't have any specific property listings or training data in my database for this query. I should respond using my general knowledge about real estate.`;
    }
    
    systemPrompt += `\n\nGuidelines:
- Always be helpful, friendly, and professional.
- Keep responses concise (3-5 sentences) and engaging.
- If the user asks about contact options, encourage them to share their email or phone.
- Follow up with relevant questions to better understand their needs.`;

    // Create messages array for OpenAI
    const messages = [
      { role: "system", content: systemPrompt }
    ];
    
    // Add previous messages for context
    if (formattedPreviousMessages.length > 0) {
      messages.push(...formattedPreviousMessages);
    }
    
    // Add current message
    messages.push({ role: "user", content: message });
    
    // Call OpenAI API with our enhanced prompt
    const completion = await openai.createChatCompletion({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 500
    });
    
    const response = completion.data.choices[0].message.content;
    
    // Extract potential lead information from user's message
    const extractedLeadInfo = extractLeadInfo(message, visitorInfo);
    
    // Determine source based on what information was used
    const source = trainingResults.qaMatches?.length > 0 || trainingResults.fileContent?.length > 0
      ? 'training'
      : propertyRecommendations.length > 0
        ? 'properties'
        : 'ai';
    
    // Return the response with source information
    return new Response(
      JSON.stringify({
        response,
        leadInfo: extractedLeadInfo,
        conversationId,
        source
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "Sorry, I encountered an error while processing your request. Please try again." 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Extract potential lead information from the message and visitor info
function extractLeadInfo(message, visitorInfo) {
  const extractedInfo = { ...visitorInfo };
  const lowerMessage = message.toLowerCase();
  
  // Extract email
  const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch && !extractedInfo.email) {
    extractedInfo.email = emailMatch[0];
  }
  
  // Extract phone number (various formats)
  const phoneMatches = message.match(/(?:\+\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/g) || 
                     message.match(/(?:\+\d{1,3}[ -]?)?\d{10,}/g);
  if (phoneMatches && !extractedInfo.phone) {
    extractedInfo.phone = phoneMatches[0];
  }
  
  // Extract name (simple approach)
  const nameMatch = message.match(/(?:my name is|I am|I'm) ([A-Za-z]+(?: [A-Za-z]+)?)/i);
  if (nameMatch && !extractedInfo.firstName) {
    const fullName = nameMatch[1].split(' ');
    if (fullName.length > 1) {
      extractedInfo.firstName = fullName[0];
      extractedInfo.lastName = fullName.slice(1).join(' ');
    } else {
      extractedInfo.firstName = fullName[0];
    }
  }
  
  return extractedInfo;
}
