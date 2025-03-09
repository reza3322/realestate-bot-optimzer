
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// OpenAI API configuration
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
      status: 204,
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: `Unsupported method: ${req.method}` }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { message, userId, sessionId } = await req.json();
    
    if (!message || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing message for user: ${userId}, session: ${sessionId || 'new'}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch relevant training data based on the user's message
    const trainingData = await fetchRelevantTrainingData(supabase, userId, message);
    
    // Generate response using OpenAI with context from training data
    const response = await generateChatbotResponse(message, trainingData, userId, sessionId);
    
    // Store the conversation in the database if sessionId is provided
    if (sessionId) {
      await storeConversation(supabase, userId, sessionId, message, response);
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: response,
        session_id: sessionId || crypto.randomUUID()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Function to fetch relevant training data based on the user's message
async function fetchRelevantTrainingData(supabase, userId, message) {
  console.log("Fetching relevant training data");
  
  try {
    // First, check for exact Q&A matches in chatbot_training_data
    const { data: qaMatches, error: qaError } = await supabase
      .from('chatbot_training_data')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: false });
      
    if (qaError) throw qaError;
    
    // Find Q&A pairs with similar questions using basic string matching
    // In a production environment, you might use vector embeddings for better matching
    const relevantQAPairs = qaMatches.filter(qa => {
      const questionWords = message.toLowerCase().split(/\s+/);
      const qaWords = qa.question.toLowerCase().split(/\s+/);
      
      // Check for word overlap
      const overlap = questionWords.filter(word => 
        qaWords.includes(word) && word.length > 3 // Only consider significant words
      );
      
      return overlap.length > 0;
    });
    
    // Then, fetch file and web crawler content from chatbot_training_files
    const { data: fileMatches, error: fileError } = await supabase
      .from('chatbot_training_files')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: false });
      
    if (fileError) throw fileError;

    // Combine all training data
    let combinedTrainingData = "";
    
    // Add Q&A pairs
    if (relevantQAPairs.length > 0) {
      combinedTrainingData += "### Frequently Asked Questions\n\n";
      
      relevantQAPairs.forEach(qa => {
        combinedTrainingData += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
      });
    }
    
    // Filter and add most relevant file content
    // In a production environment, use embeddings for better context selection
    if (fileMatches.length > 0) {
      combinedTrainingData += "### Additional Knowledge Base\n\n";
      
      // Use a simple keyword matching for now
      const messageKeywords = message.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);
        
      // Calculate relevance score for each file
      const scoredFiles = fileMatches.map(file => {
        const fileText = file.extracted_text.toLowerCase();
        let score = 0;
        
        messageKeywords.forEach(keyword => {
          // Count occurrences of each keyword
          const regex = new RegExp(`\\b${keyword}\\b`, 'g');
          const matches = fileText.match(regex);
          if (matches) {
            score += matches.length;
          }
        });
        
        // Adjust score by priority
        score *= (file.priority || 1);
        
        return { file, score };
      });
      
      // Sort by relevance score
      scoredFiles.sort((a, b) => b.score - a.score);
      
      // Add the most relevant file content (limited to prevent token limit issues)
      let totalChars = 0;
      const maxChars = 20000; // Limit total context size
      
      for (const { file, score } of scoredFiles) {
        if (score > 0 && totalChars < maxChars) {
          // Extract a relevant portion of the text
          const excerpt = extractRelevantExcerpt(file.extracted_text, messageKeywords, 1000);
          
          if (excerpt) {
            const sourceInfo = `[Source: ${file.source_file}]\n`;
            combinedTrainingData += sourceInfo + excerpt + "\n\n";
            totalChars += excerpt.length + sourceInfo.length;
          }
        }
        
        if (totalChars >= maxChars) break;
      }
    }
    
    console.log(`Collected ${combinedTrainingData.length} characters of training data`);
    return combinedTrainingData;
  } catch (error) {
    console.error("Error fetching training data:", error);
    return ""; // Return empty string on error
  }
}

// Function to extract relevant excerpts from longer texts
function extractRelevantExcerpt(text, keywords, maxLength = 1000) {
  // Find the most relevant paragraph(s) containing keywords
  const paragraphs = text.split(/\n\n+/);
  
  // Score each paragraph
  const scoredParagraphs = paragraphs.map(para => {
    let score = 0;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = para.match(regex);
      if (matches) {
        score += matches.length;
      }
    });
    return { paragraph: para, score };
  });
  
  // Sort by relevance
  scoredParagraphs.sort((a, b) => b.score - a.score);
  
  // Return the most relevant paragraphs up to maxLength
  let result = "";
  let currentLength = 0;
  
  for (const { paragraph, score } of scoredParagraphs) {
    if (score > 0 && currentLength + paragraph.length <= maxLength) {
      result += paragraph + "\n\n";
      currentLength += paragraph.length + 2;
    }
  }
  
  return result;
}

// Function to generate a response using OpenAI
async function generateChatbotResponse(message, trainingData, userId, sessionId) {
  if (!OPENAI_API_KEY) {
    console.error("OpenAI API key is not configured");
    return "I'm sorry, but I'm not properly configured to respond right now. Please contact support.";
  }

  try {
    console.log("Generating response with OpenAI");
    
    // Create system prompt with context
    const systemPrompt = `You are a helpful AI assistant that provides accurate and useful information. 
Base your responses on the following knowledge base when relevant, and if the information isn't in the knowledge base, 
provide a general helpful response without making up information about the specific business or services.

KNOWLEDGE BASE:
${trainingData || "No specific knowledge base provided."}

Be conversational, helpful, and concise in your responses. If you're not sure about something related to the specific business, 
just say you don't have that information rather than making it up.`;

    // Create the chat history array
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ];

    // Call OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Using gpt-4o-mini for faster, more affordable responses
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI API error:", error);
      throw new Error(error.error?.message || "Failed to generate response");
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error generating response:", error);
    return "I'm sorry, I encountered a problem generating a response. Please try again in a moment.";
  }
}

// Function to store conversations in the database
async function storeConversation(supabase, userId, sessionId, message, response) {
  try {
    const { error } = await supabase
      .from('chatbot_conversations')
      .insert({
        user_id: userId,
        conversation_id: sessionId,
        message: message,
        response: response
      });
      
    if (error) throw error;
    
    console.log(`Stored conversation for session: ${sessionId}`);
  } catch (error) {
    console.error("Error storing conversation:", error);
    // Continue execution even if storage fails
  }
}
