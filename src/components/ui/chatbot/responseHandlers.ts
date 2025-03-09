
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
    
    // Find Q&A matches with improved property and lead-capture focused matching
    const { data: qaMatches, error: qaError } = await supabase
      .rpc('search_training_data', {
        user_id_param: userId,
        query_text: message
      });
      
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

// Enhanced function to extract lead information from user message
export const extractLeadInfo = (message: string): Partial<VisitorInfo> => {
  const leadInfo: Partial<VisitorInfo> = {};
  
  // Extract email - improved regex
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = message.match(emailRegex);
  if (emailMatches && emailMatches.length > 0) {
    leadInfo.email = emailMatches[0];
  }
  
  // Extract phone number - enhanced pattern for multiple formats
  const phoneRegex = /\b(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const phoneMatches = message.match(phoneRegex);
  if (phoneMatches && phoneMatches.length > 0) {
    leadInfo.phone = phoneMatches[0];
  }
  
  // Extract name patterns - multiple patterns for better detection
  const namePatterns = [
    /(?:my name is|i am|i'm|this is) ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/i,
    /([A-Z][a-z]+(?: [A-Z][a-z]+)?) here/i,
    /^([A-Z][a-z]+(?: [A-Z][a-z]+)?)$/i  // Message is just a name
  ];
  
  for (const pattern of namePatterns) {
    const nameMatch = message.match(pattern);
    if (nameMatch && nameMatch[1]) {
      leadInfo.name = nameMatch[1];
      break;
    }
  }
  
  // Extract budget - enhanced pattern
  const budgetRegex = /(?:budget|afford|looking to spend|price range|under|up to|max|maximum)[^\d]*(\$?[\d,]+(?:[\d,.]+k)?(?:\s*-\s*\$?[\d,]+(?:[\d,.]+k)?)?)/i;
  const budgetMatch = message.match(budgetRegex);
  if (budgetMatch && budgetMatch[1]) {
    leadInfo.budget = budgetMatch[1];
  }
  
  // Extract property interest - enhanced with more patterns
  const propertyTerms = ['house', 'home', 'property', 'condo', 'apartment', 'townhouse'];
  const actionTerms = {
    'buying': 'Buying',
    'looking to buy': 'Buying',
    'purchase': 'Buying',
    'interested in buying': 'Buying',
    'selling': 'Selling',
    'sell': 'Selling',
    'renting': 'Renting',
    'rent': 'Renting',
    'lease': 'Renting'
  };
  
  // Check for property interest
  const messageLower = message.toLowerCase();
  if (propertyTerms.some(term => messageLower.includes(term))) {
    for (const [action, value] of Object.entries(actionTerms)) {
      if (messageLower.includes(action)) {
        leadInfo.propertyInterest = value;
        break;
      }
    }
    
    // Default to "Buying" if property term found but no action specified
    if (!leadInfo.propertyInterest && propertyTerms.some(term => messageLower.includes(term))) {
      leadInfo.propertyInterest = 'Buying';
    }
  }
  
  // Extract location interest
  const locationRegex = /(?:in|near|around|at) ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/i;
  const locationMatch = message.match(locationRegex);
  if (locationMatch && locationMatch[1]) {
    leadInfo.location = locationMatch[1];
  }
  
  return leadInfo;
};

// Function to generate response using AI or demo data
export const testChatbotResponse = async (
  message: string, 
  userId: string, 
  visitorInfo = {}, 
  conversationId?: string,
  previousMessages: Message[] = []
) => {
  console.log(`Processing message: "${message}" for user ${userId}`);

  try {
    // Call our Edge Function
    const response = await supabase.functions.invoke('chatbot-response', {
      body: {
        message,
        userId,
        visitorInfo,
        conversationId,
        previousMessages
      }
    });
    
    if (response.error) {
      console.error("Error calling AI Chatbot Edge Function:", response.error);
      throw new Error(response.error.message || "AI response generation failed");
    }
    
    console.log("AI Chatbot response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error in testChatbotResponse:", error);
    const errorLeadInfo = {}; // Initialize empty object for leadInfo in error case
    return {
      response: "I'm sorry, I encountered an error processing your request.",
      source: 'error',
      leadInfo: errorLeadInfo,
      conversationId,
    };
  }
};
