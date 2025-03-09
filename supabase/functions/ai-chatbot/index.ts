
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize OpenAI API key
const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
if (!openAiApiKey) {
  console.error("OPENAI_API_KEY is not set");
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Product knowledge for the landing page chatbot
const PRODUCT_KNOWLEDGE = `
- RealHomeAI is an AI-powered chatbot for real estate professionals.
- It helps real estate agents capture leads, answer questions, and recommend properties.
- Features:
  - 24/7 AI chatbot for real estate websites
  - Customizable training for each agency
  - Lead qualification & automated follow-ups
  - Integration with real estate CRMs
  - Analytics dashboard for tracking conversations
- Pricing:
  - Starter: $29/month - Basic chatbot with lead capture
  - Pro: $79/month - AI chatbot with property recommendations
  - Enterprise: Custom pricing - Full integration with CRM and website
`;

// Detect language from input text
function detectLanguage(text: string): string {
  const languagePatterns = {
    es: /[áéíóúüñ¿¡]/i,
    fr: /[àâçéèêëîïôùûüÿœæ]/i,
    de: /[äöüßÄÖÜ]/i,
    pt: /[ãõáéíóúâêôç]/i,
  };

  for (const [lang, pattern] of Object.entries(languagePatterns)) {
    if (pattern.test(text)) {
      return lang;
    }
  }

  return 'en'; // Default to English
}

async function handleDemoMode(message: string, visitorInfo: any, conversationId: string) {
  console.log("Processing in demo mode with message:", message);
  
  try {
    // Detect the language from the user's message
    const detectedLang = detectLanguage(message);
    console.log(`Detected language: ${detectedLang}`);
    
    // Create system message based on detected language
    let systemMessage = "";
    
    switch (detectedLang) {
      case 'es':
        systemMessage = `Eres un asistente de IA para bienes raíces llamado RealHomeAI. SOLO respondes preguntas relacionadas con bienes raíces y sobre el producto RealHomeAI SaaS.
        Para cualquier otra pregunta, educadamente te niegas a responder y redirige la conversación hacia bienes raíces.
        Sé conversacional, amigable y útil. Haz preguntas de seguimiento para mantener la conversación e intenta obtener información del cliente.
        
        Aquí está la información del producto (responde en español):
        ${PRODUCT_KNOWLEDGE}`;
        break;
      case 'fr':
        systemMessage = `Vous êtes un assistant IA immobilier appelé RealHomeAI. Vous répondez UNIQUEMENT aux questions liées à l'immobilier et sur le produit SaaS RealHomeAI.
        Pour toute autre question, refusez poliment de répondre et redirigez la conversation vers l'immobilier.
        Soyez conversationnel, amical et utile. Posez des questions de suivi pour maintenir la conversation et essayez d'obtenir des informations client.
        
        Voici les informations sur le produit (répondez en français):
        ${PRODUCT_KNOWLEDGE}`;
        break;
      case 'de':
        systemMessage = `Sie sind ein KI-Immobilienassistent namens RealHomeAI. Sie beantworten NUR Fragen zu Immobilien und zum RealHomeAI SaaS-Produkt.
        Bei allen anderen Fragen lehnen Sie höflich ab zu antworten und lenken das Gespräch zurück auf Immobilien.
        Seien Sie gesprächig, freundlich und hilfsbereit. Stellen Sie Anschlussfragen, um das Gespräch aufrechtzuerhalten und versuchen Sie, Kundeninformationen zu erhalten.
        
        Hier sind die Produktinformationen (antworten Sie auf Deutsch):
        ${PRODUCT_KNOWLEDGE}`;
        break;
      case 'pt':
        systemMessage = `Você é um assistente imobiliário de IA chamado RealHomeAI. Você APENAS responde a perguntas relacionadas a imóveis e sobre o produto SaaS RealHomeAI.
        Para qualquer outra pergunta, educadamente recuse-se a responder e redirecione a conversa para imóveis.
        Seja conversacional, amigável e prestativo. Faça perguntas de acompanhamento para manter a conversa e tente obter informações do cliente.
        
        Aqui estão as informações do produto (responda em português):
        ${PRODUCT_KNOWLEDGE}`;
        break;
      default:
        systemMessage = `You are a real estate AI assistant named RealHomeAI. You ONLY answer real estate-related questions and about the RealHomeAI SaaS product.
        For any other question, politely refuse to answer and redirect the conversation to real estate.
        Be conversational, friendly, and helpful. Ask follow-up questions to keep the conversation going and try to obtain customer information.
        
        Here is the product information:
        ${PRODUCT_KNOWLEDGE}`;
        break;
    }
    
    // Create the message array for OpenAI
    const messages = [
      { role: "system", content: systemMessage },
      { role: "user", content: message }
    ];
    
    // If we have conversation history, add it (limited to last 5 messages)
    if (conversationId) {
      // Fetch conversation history from database
      const { data: historyData, error: historyError } = await supabase
        .from('chatbot_conversations')
        .select('message, response')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (!historyError && historyData && historyData.length > 0) {
        // Add conversation history (oldest messages first)
        for (const item of historyData.reverse()) {
          messages.push({ role: "user", content: item.message });
          messages.push({ role: "assistant", content: item.response });
        }
        
        // Add the current message
        messages.push({ role: "user", content: message });
      }
    }
    
    console.log("Sending to OpenAI with messages:", JSON.stringify(messages));
    
    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log("OpenAI response:", JSON.stringify(data));
    
    // Check if we got a valid response
    if (!data.choices || data.choices.length === 0) {
      throw new Error("Invalid response from OpenAI");
    }
    
    // Extract and save the customer information
    const leadInfo = extractLeadInfo(message);
    
    // Save conversation to database
    try {
      await supabase
        .from('chatbot_conversations')
        .insert({
          conversation_id: conversationId,
          visitor_id: visitorInfo?.visitorId || null,
          user_id: 'demo-user',
          message: message,
          response: data.choices[0].message.content
        });
      console.log("✅ Conversation saved to database");
    } catch (dbError) {
      console.error("Error saving conversation:", dbError);
    }
    
    return {
      response: data.choices[0].message.content,
      source: 'ai',
      leadInfo: leadInfo,
      conversationId: conversationId
    };
  } catch (error) {
    console.error("Error in handleDemoMode:", error);
    return {
      response: "I'm sorry, I encountered an error processing your request. Please try again later.",
      source: 'error',
      leadInfo: {},
      conversationId: conversationId
    };
  }
}

async function handleAgencyMode(message: string, userId: string, visitorInfo: any, conversationId: string) {
  console.log(`Processing in agency mode with user ID: ${userId}, message: ${message}`);
  
  try {
    // Extract lead information from the message
    const leadInfo = extractLeadInfo(message);
    
    // First, search for relevant training data
    const { data: relevantData, error: dataError } = await supabase.rpc('search_training_data', {
      user_id_param: userId,
      query_text: message
    });
    
    if (dataError) {
      console.error("Error searching training data:", dataError);
      throw dataError;
    }
    
    // Check if we found relevant training data
    if (relevantData && relevantData.length > 0) {
      console.log("Found relevant training data:", JSON.stringify(relevantData));
      
      // Get the best match (highest similarity)
      const bestMatch = relevantData[0];
      
      // We'll still use OpenAI but with the training data as context for better human-like rephrasing
      const detectedLang = detectLanguage(message);
      
      // Create system message based on detected language
      let systemMessage = "";
      
      switch (detectedLang) {
        case 'es':
          systemMessage = `Eres un asistente de bienes raíces para una agencia inmobiliaria. Usa esta respuesta existente y reformúlala de manera natural y conversacional en español, sin sonar como si estuvieras leyendo directamente de una base de datos. Incluye una pregunta de seguimiento para mantener la conversación en un tono amistoso.
          
          Pregunta del usuario: ${message}
          
          Respuesta existente a reformular: ${bestMatch.answer}`;
          break;
        case 'fr':
          systemMessage = `Vous êtes un assistant immobilier pour une agence immobilière. Utilisez cette réponse existante et reformulez-la de manière naturelle et conversationnelle en français, sans donner l'impression de lire directement depuis une base de données. Incluez une question de suivi pour maintenir la conversation dans un ton amical.
          
          Question de l'utilisateur: ${message}
          
          Réponse existante à reformuler: ${bestMatch.answer}`;
          break;
        case 'de':
          systemMessage = `Sie sind ein Immobilienassistent für eine Immobilienagentur. Verwenden Sie diese bestehende Antwort und formulieren Sie sie auf natürliche und gesprächige Weise auf Deutsch um, ohne den Eindruck zu erwecken, dass Sie direkt aus einer Datenbank lesen. Fügen Sie eine Anschlussfrage hinzu, um das Gespräch in einem freundlichen Ton zu halten.
          
          Benutzerfrage: ${message}
          
          Bestehende Antwort zum Umformulieren: ${bestMatch.answer}`;
          break;
        case 'pt':
          systemMessage = `Você é um assistente imobiliário para uma agência imobiliária. Use esta resposta existente e reformule-a de forma natural e conversacional em português, sem parecer que está lendo diretamente de um banco de dados. Inclua uma pergunta de acompanhamento para manter a conversa em um tom amigável.
          
          Pergunta do usuário: ${message}
          
          Resposta existente para reformular: ${bestMatch.answer}`;
          break;
        default:
          systemMessage = `You are a real estate assistant for a real estate agency. Use this existing answer and rephrase it in a natural, conversational way in English, without sounding like you're reading directly from a database. Include a follow-up question to keep the conversation going in a friendly tone.
          
          User query: ${message}
          
          Existing answer to rephrase: ${bestMatch.answer}`;
          break;
      }
      
      // Call OpenAI to rephrase the answer in a more natural way
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemMessage }],
          temperature: 0.7,
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Save conversation to database
      try {
        await supabase
          .from('chatbot_conversations')
          .insert({
            conversation_id: conversationId,
            visitor_id: visitorInfo?.visitorId || null,
            user_id: userId,
            message: message,
            response: data.choices[0].message.content
          });
        console.log("✅ Conversation saved to database");
      } catch (dbError) {
        console.error("Error saving conversation:", dbError);
      }
      
      return {
        response: data.choices[0].message.content,
        source: 'training',
        leadInfo: leadInfo,
        conversationId: conversationId
      };
    }
    
    // If no relevant training data is found, use OpenAI with agency-specific context
    console.log("No direct training data match found, fetching agency context...");
    
    // Get agency information and context from database
    const { data: agencyData, error: agencyError } = await supabase
      .from('profiles')
      .select('first_name, last_name, company')
      .eq('id', userId)
      .single();
      
    if (agencyError) {
      console.error("Error fetching agency data:", agencyError);
    }
    
    // Fetch some additional context - property listings, training files
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('title, price, address, city, state, bedrooms, bathrooms, description')
      .eq('user_id', userId)
      .limit(5);
      
    if (propertyError) {
      console.error("Error fetching property data:", propertyError);
    }
    
    // Combine all context for OpenAI
    let agencyContext = "You are a real estate assistant representing ";
    agencyContext += agencyData?.company || "a real estate agency";
    agencyContext += ".\n\n";
    
    // Add property listings if available
    if (propertyData && propertyData.length > 0) {
      agencyContext += "Here are some property listings:\n";
      propertyData.forEach((property, index) => {
        agencyContext += `${index + 1}. ${property.title} - $${property.price} - ${property.address}, ${property.city}, ${property.state} - ${property.bedrooms} bed, ${property.bathrooms} bath\n`;
      });
      agencyContext += "\n";
    }
    
    // Create the prompt for OpenAI
    const detectedLang = detectLanguage(message);
    let systemMessage = "";
    
    switch (detectedLang) {
      case 'es':
        systemMessage = `Eres un asistente de bienes raíces para una agencia inmobiliaria. Responde a la consulta del cliente de manera natural y conversacional en español. Sé amigable, útil y profesional. Incluye una pregunta de seguimiento para mantener la conversación. Si la consulta no está relacionada con bienes raíces, educadamente redirige la conversación a temas inmobiliarios.
        
        Contexto de la agencia:
        ${agencyContext}
        
        Pregunta del cliente: ${message}`;
        break;
      case 'fr':
        systemMessage = `Vous êtes un assistant immobilier pour une agence immobilière. Répondez à la demande du client de manière naturelle et conversationnelle en français. Soyez amical, utile et professionnel. Incluez une question de suivi pour maintenir la conversation. Si la demande n'est pas liée à l'immobilier, redirigez poliment la conversation vers des sujets immobiliers.
        
        Contexte de l'agence:
        ${agencyContext}
        
        Question du client: ${message}`;
        break;
      case 'de':
        systemMessage = `Sie sind ein Immobilienassistent für eine Immobilienagentur. Beantworten Sie die Anfrage des Kunden auf natürliche und gesprächige Weise auf Deutsch. Seien Sie freundlich, hilfsbereit und professionell. Fügen Sie eine Anschlussfrage hinzu, um das Gespräch aufrechtzuerhalten. Wenn die Anfrage nicht immobilienbezogen ist, lenken Sie das Gespräch höflich zurück auf Immobilienthemen.
        
        Agenturkontext:
        ${agencyContext}
        
        Kundenanfrage: ${message}`;
        break;
      case 'pt':
        systemMessage = `Você é um assistente imobiliário para uma agência imobiliária. Responda à consulta do cliente de forma natural e conversacional em português. Seja amigável, prestativo e profissional. Inclua uma pergunta de acompanhamento para manter a conversa. Se a consulta não estiver relacionada a imóveis, redirecione educadamente a conversa para tópicos imobiliários.
        
        Contexto da agência:
        ${agencyContext}
        
        Pergunta do cliente: ${message}`;
        break;
      default:
        systemMessage = `You are a real estate assistant for a real estate agency. Answer the client query in a natural, conversational way in English. Be friendly, helpful, and professional. Include a follow-up question to keep the conversation going. If the query is not real estate related, politely redirect the conversation to real estate topics.
        
        Agency context:
        ${agencyContext}
        
        Client query: ${message}`;
        break;
    }
    
    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemMessage }],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Save conversation to database
    try {
      await supabase
        .from('chatbot_conversations')
        .insert({
          conversation_id: conversationId,
          visitor_id: visitorInfo?.visitorId || null,
          user_id: userId,
          message: message,
          response: data.choices[0].message.content
        });
      console.log("✅ Conversation saved to database");
    } catch (dbError) {
      console.error("Error saving conversation:", dbError);
    }
    
    return {
      response: data.choices[0].message.content,
      source: 'ai',
      leadInfo: leadInfo,
      conversationId: conversationId
    };
  } catch (error) {
    console.error("Error in handleAgencyMode:", error);
    return {
      response: "I'm sorry, I encountered an error processing your request. Please try again later.",
      source: 'error',
      leadInfo: {},
      conversationId: conversationId
    };
  }
}

// Function to extract lead information
function extractLeadInfo(message: string) {
  const leadInfo: any = {};
  
  // Extract email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = message.match(emailRegex);
  if (emailMatches && emailMatches.length > 0) {
    leadInfo.email = emailMatches[0];
  }
  
  // Extract phone number
  const phoneRegex = /\b(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const phoneMatches = message.match(phoneRegex);
  if (phoneMatches && phoneMatches.length > 0) {
    leadInfo.phone = phoneMatches[0];
  }
  
  // Extract name 
  const nameRegex = /(?:my name is|i am|i'm) ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/i;
  const nameMatch = message.match(nameRegex);
  if (nameMatch && nameMatch[1]) {
    leadInfo.name = nameMatch[1];
  }
  
  // Extract budget
  const budgetRegex = /(?:budget|afford|looking to spend|price range)[^\d]*(\$?[\d,]+(?:[\d,.]+k)?(?:\s*-\s*\$?[\d,]+(?:[\d,.]+k)?)?)/i;
  const budgetMatch = message.match(budgetRegex);
  if (budgetMatch && budgetMatch[1]) {
    leadInfo.budget = budgetMatch[1];
  }
  
  // Extract property interest
  if (message.toLowerCase().includes('house') || 
      message.toLowerCase().includes('home') || 
      message.toLowerCase().includes('property')) {
    if (message.toLowerCase().includes('buying') || message.toLowerCase().includes('purchase')) {
      leadInfo.propertyInterest = 'Buying';
    } else if (message.toLowerCase().includes('selling') || message.toLowerCase().includes('sell')) {
      leadInfo.propertyInterest = 'Selling';
    } else if (message.toLowerCase().includes('renting') || message.toLowerCase().includes('rent')) {
      leadInfo.propertyInterest = 'Renting';
    }
  }
  
  return leadInfo;
}

// Main serve function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const body = await req.json();
    const { message, userId, visitorInfo, conversationId } = body;
    
    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Determine which mode to use based on userId
    let response;
    if (!userId || userId === 'demo-user') {
      // Landing page demo mode
      response = await handleDemoMode(message, visitorInfo, conversationId || `conv_${crypto.randomUUID()}`);
    } else {
      // Agency chatbot mode
      response = await handleAgencyMode(message, userId, visitorInfo, conversationId || `conv_${crypto.randomUUID()}`);
    }
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("Error in ai-chatbot function:", error);
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      message: error.message,
      response: "I'm sorry, I encountered an error processing your request. Please try again later.",
      source: 'error',
      leadInfo: {},
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
