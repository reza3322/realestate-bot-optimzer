import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { Message, VisitorInfo } from './types';

// Initialize OpenAI Client
const openai = new OpenAI({ apiKey: 'YOUR_OPENAI_KEY' });

export const testChatbotResponse = async (
  message: string, 
  userId: string,
  visitorInfo: VisitorInfo = {},
  conversationId: string = `conv_${uuidv4()}`,
  previousMessages: Message[] = []
) => {
  console.log(`Processing message: "${message}" for user ${userId}`);

  try {
    // ✅ **1️⃣ Extract Lead Information from Message**
    const extractedLeadInfo: Partial<VisitorInfo> = extractLeadInfo(message);
    const updatedLeadInfo = { ...visitorInfo, ...extractedLeadInfo }; // Merge old & new lead info
    let source: 'ai' | 'training' | null = null;
    let contextData = '';

    // ✅ **2️⃣ Store Lead Info in Supabase (If Available)**
    if (userId !== 'demo-user' && Object.keys(extractedLeadInfo).length > 0) {
      await saveLeadInfo(userId, updatedLeadInfo);
    }

    // ✅ **3️⃣ Landing Page Chatbot: OpenAI for Real Estate-Only Answers**
    if (!userId || userId === 'demo-user') {
      console.log("Landing page chatbot activated...");
      
      const openaiPrompt = `
      You are an AI assistant specialized in real estate and chatbot technology.
      Only answer questions related to real estate, chatbot functionality, and property management.
      If the user asks something unrelated (e.g., jokes, history, sports), politely redirect them.

      User: ${message}
      Chatbot:
      `;

      const aiResponse = await openai.completions.create({
        model: 'gpt-4',
        prompt: openaiPrompt,
        max_tokens: 300,
      });

      return {
        response: aiResponse.choices[0].text.trim(),
        source: 'ai',
        leadInfo: updatedLeadInfo,
        conversationId
      };
    }

    // ✅ **4️⃣ Agency-Specific Chatbot: Fetch Training Data First**
    console.log("Fetching agency-specific training data...");
    
    const { data: faqMatches } = await supabase
      .from('chatbot_training_data')
      .select('*')
      .textSearch('question', message)
      .eq('user_id', userId)
      .limit(5);

    const { data: uploadedDocs } = await supabase
      .from('chatbot_training_files')
      .select('extracted_text, source_file')
      .eq('user_id', userId)
      .limit(5);

    const { data: properties } = await supabase
      .from('property_listings')
      .select('title, description, price')
      .eq('user_id', userId)
      .limit(5);

    // ✅ **5️⃣ If an FAQ Match Exists, Return It Immediately**
    if (faqMatches && faqMatches.length > 0) {
      console.log("FAQ match found! Using agency's predefined answer.");
      source = 'training';
      return {
        response: faqMatches[0].answer,
        source,
        leadInfo: updatedLeadInfo,
        conversationId
      };
    }

    // ✅ **6️⃣ If No FAQ Match, Include Additional Context for AI**
    if (uploadedDocs && uploadedDocs.length > 0) {
      contextData += "### Uploaded Agency Documents:\n";
      uploadedDocs.forEach(doc => {
        contextData += `Source: ${doc.source_file}\n${doc.extracted_text}\n\n`;
      });
    }

    if (properties && properties.length > 0) {
      contextData += "### Available Properties:\n";
      properties.forEach(prop => {
        contextData += `- ${prop.title}: ${prop.description}, Price: ${prop.price}\n`;
      });
    }

    // ✅ **7️⃣ If No Database Answer is Found, Use OpenAI with Context**
    console.log("No direct match found, using AI with agency-specific data...");

    const openaiPrompt = `
    You are an AI real estate assistant for this agency. You have access to their uploaded FAQs, documents, and property listings.

    Use this agency's knowledge base to answer:

    ${contextData || "No pre-existing training data available."}

    If the answer is not in this data, try to respond based on general real estate knowledge.

    User: ${message}
    Chatbot:
    `;

    const aiResponse = await openai.completions.create({
      model: 'gpt-4',
      prompt: openaiPrompt,
      max_tokens: 300,
    });

    return {
      response: aiResponse.choices[0].text.trim(),
      source: 'ai',
      leadInfo: updatedLeadInfo,
      conversationId
    };

  } catch (error) {
    console.error("Error in testChatbotResponse:", error);
    return {
      response: "I'm sorry, I encountered an error processing your request. Please try again later.",
      source: 'error',
      leadInfo: {},
      conversationId
    };
  }
};

// ✅ **Function to Extract Lead Information (Email, Phone, Budget, etc.)**
const extractLeadInfo = (message: string): Partial<VisitorInfo> => {
  const leadInfo: Partial<VisitorInfo> = {};

  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = message.match(emailRegex);
  if (emailMatches) leadInfo.email = emailMatches[0];

  const phoneRegex = /\b(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const phoneMatches = message.match(phoneRegex);
  if (phoneMatches) leadInfo.phone = phoneMatches[0];

  const budgetRegex = /(?:budget|afford|price range)[^\d]*(\$?[\d,]+(?:[\d,.]+k)?(?:\s*-\s*\$?[\d,]+(?:[\d,.]+k)?)?)/i;
  const budgetMatch = message.match(budgetRegex);
  if (budgetMatch) leadInfo.budget = budgetMatch[1];

  return leadInfo;
};

// ✅ **Function to Store Lead Info in Supabase**
const saveLeadInfo = async (userId: string, leadInfo: Partial<VisitorInfo>) => {
  try {
    const { data, error } = await supabase.from('leads').insert([{ user_id: userId, ...leadInfo }]);
    if (error) console.error("Error saving lead info:", error);
  } catch (err) {
    console.error("Unexpected error saving lead:", err);
  }
};
