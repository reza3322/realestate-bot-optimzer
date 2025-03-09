import { supabase } from '@/lib/supabase';
import { Message, VisitorInfo } from './types';
import { v4 as uuidv4 } from 'uuid';

// Function to find relevant training data for the user's query
export const findRelevantTrainingData = async (userId: string, message: string) => {
  console.log("Searching for training data matches for:", message);
  
  try {
    // For demo mode or landing page (non-UUID userId), return empty training data
    if (userId === 'demo-user' || !isValidUUID(userId)) {
      console.log("Using demo mode, skipping training data lookup");
      return { 
        qaMatches: [],
        fileContent: [] 
      };
    }
    
    // Find Q&A matches
    const { data: qaMatches, error: qaError } = await supabase
      .from('chatbot_training_data')
      .select('question, answer, priority, category')
      .eq('user_id', userId)
      .or(`question.ilike.%${message}%,answer.ilike.%${message}%`)
      .order('priority', { ascending: false })
      .limit(5);
      
    if (qaError) {
      console.error("Error searching training data:", qaError);
      throw qaError;
    }
    
    // Find relevant file content
    const { data: fileContent, error: fileError } = await supabase
      .from('chatbot_training_files')
      .select('extracted_text, source_file, priority, category')
      .eq('user_id', userId)
      .order('priority', { ascending: false })
      .limit(5);
      
    if (fileError) {
      console.error("Error searching file content:", fileError);
      throw fileError;
    }
    
    return {
      qaMatches: qaMatches || [],
      fileContent: fileContent || []
    };
  } catch (error) {
    console.error("Error searching training data:", error);
    return { 
      qaMatches: [],
      fileContent: [] 
    };
  }
};

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Function to extract lead information from user message
export const extractLeadInfo = (message: string): Partial<VisitorInfo> => {
  const leadInfo: Partial<VisitorInfo> = {};
  
  // Extract email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = message.match(emailRegex);
  if (emailMatches && emailMatches.length > 0) {
    leadInfo.email = emailMatches[0];
  }
  
  // Extract phone number (simple pattern)
  const phoneRegex = /\b(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const phoneMatches = message.match(phoneRegex);
  if (phoneMatches && phoneMatches.length > 0) {
    leadInfo.phone = phoneMatches[0];
  }
  
  // Extract name patterns (simple approach)
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
};

// Function to generate response using AI or demo data
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');
const openai = new OpenAI({ apiKey: 'YOUR_OPENAI_KEY' });

export const testChatbotResponse = async (
  message, 
  userId, 
  visitorInfo = {}, 
  conversationId = `conv_${uuidv4()}`,
  previousMessages = []
) => {
  console.log(`Processing message: "${message}" for user ${userId}`);

  try {
    // Extract potential lead information from message (if applicable)
    const extractedLeadInfo = extractLeadInfo(message);
    const leadInfo = { ...extractedLeadInfo };
    console.log("Extracted lead info:", leadInfo);

    let relevantTrainingData = "";
    let source = null;

    // Check if this is an authenticated user (real estate agency)
    if (userId && isValidUUID(userId)) {
      console.log("Searching for relevant training data...");
      const { data: trainingData, error } = await supabase
        .from('chatbot_knowledge')
        .select('*')
        .textSearch('question', message);

      if (error) {
        console.error("Error fetching training data:", error);
      }

      // If a direct match is found, return it immediately
      if (trainingData && trainingData.length > 0) {
        source = 'training';
        return {
          response: trainingData[0].answer,
          source,
          leadInfo,
          conversationId,
        };
      }

      // If no direct match, include other related data as context for AI
      if (trainingData.length > 0) {
        relevantTrainingData += "### Agency Knowledge Base\n\n";
        trainingData.forEach(qa => {
          relevantTrainingData += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
        });
      }
    }

    // If this is a landing page chatbot (demo mode)
    const isDemoChat = !userId || !isValidUUID(userId);
    if (isDemoChat) {
      relevantTrainingData = `
      ### Company Information
      RealHomeAI is an AI-powered chatbot platform for real estate professionals...
      Features:
      - Lead qualification
      - Property recommendations
      - 24/7 engagement
      - CRM Integration
      Pricing:
      - Starter: $29/month
      - Pro: $79/month
      `;
    }

    // Call OpenAI with agency data (if available)
    try {
      const openaiPrompt = `
      You are a real estate chatbot. Answer the user based on the following knowledge base:
      ${relevantTrainingData}
      
      User: ${message}
      Chatbot:
      `;
      
      const response = await openai.completions.create({
        model: "gpt-4",
        prompt: openaiPrompt,
        max_tokens: 300,
      });

      return {
        response: response.choices[0].text,
        source: 'ai',
        leadInfo,
        conversationId,
      };
    } catch (error) {
      console.error("OpenAI error:", error);
      throw new Error("AI response generation failed");
    }
  } catch (error) {
    console.error("Error in testChatbotResponse:", error);
    return {
      response: "I'm sorry, I encountered an error processing your request.",
      source: 'error',
      leadInfo: {},
      conversationId,
    };
  }
};
