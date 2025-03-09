
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
export const testChatbotResponse = async (
  message: string, 
  userId: string,
  visitorInfo: VisitorInfo = {},
  conversationId?: string,
  previousMessages: Message[] = []
) => {
  console.log(`Processing message: "${message}" for user ${userId}`);
  
  try {
    // Extract potential lead information from message
    const extractedLeadInfo = extractLeadInfo(message);
    const leadInfo = { ...extractedLeadInfo };
    console.log("Extracted lead info:", leadInfo);
    
    // For authenticated users, search for relevant training data
    let relevantTrainingData = "";
    let source: 'ai' | 'training' | null = null;
    
    try {
      if (userId && userId !== 'demo-user' && isValidUUID(userId)) {
        console.log("Searching for relevant training data...");
        const trainingData = await findRelevantTrainingData(userId, message);
        
        // Process QA matches
        if (trainingData.qaMatches && trainingData.qaMatches.length > 0) {
          // If we have an exact match, use the answer directly
          const exactMatch = trainingData.qaMatches.find(
            qa => qa.question.toLowerCase() === message.toLowerCase()
          );
          
          if (exactMatch) {
            source = 'training';
            return {
              response: exactMatch.answer,
              source,
              leadInfo,
              conversationId: conversationId || `conv_${uuidv4()}`
            };
          }
          
          // Otherwise, include relevant QA pairs as context
          relevantTrainingData += "### Frequently Asked Questions\n\n";
          trainingData.qaMatches.forEach(qa => {
            relevantTrainingData += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
          });
        }
        
        // Process file content
        if (trainingData.fileContent && trainingData.fileContent.length > 0) {
          relevantTrainingData += "### Additional Knowledge\n\n";
          trainingData.fileContent.forEach(file => {
            relevantTrainingData += `Source: ${file.source_file}\n${file.extracted_text}\n\n`;
          });
        }
      }
    } catch (error) {
      console.error("Error in findRelevantTrainingData:", error);
      // Continue without training data if there's an error
    }
    
    // If this is a demo user for the landing page, use special company info
    if (userId === 'demo-user' || !isValidUUID(userId)) {
      // Add company information for the landing page demo chatbot
      const companyInfo = `
      ### Company Information
      
      RealHomeAI is an AI-powered chatbot platform for real estate professionals. It helps real estate agents and companies qualify leads, engage customers, and recommend properties. The platform uses advanced AI to understand and respond to customer inquiries about real estate, provide property recommendations, and help with scheduling viewings.
      
      Key features:
      - Lead qualification and capture
      - Property recommendation
      - 24/7 customer engagement
      - Integration with real estate websites
      - Customizable to match branding
      - Training on company-specific information
      - Analytics dashboard
      
      The platform helps real estate professionals save time, increase conversion rates, and provide better customer service through automation and AI assistance.
      
      Pricing:
      - Starter: $29/month - Basic chatbot with lead capture
      - Pro: $79/month - Advanced chatbot with property recommendations
      - Enterprise: Custom pricing - Full integration with CRM and website
      
      The RealHomeAI chatbot can be embedded on any real estate website with a simple script. Once installed, visitors can interact with the chatbot to ask questions about properties, schedule viewings, or get information about the real estate company.
      `;
      
      try {
        // Call the Supabase Edge Function for demo mode
        const { data, error } = await supabase.functions.invoke('ai-chatbot', {
          body: {
            message,
            userId: 'demo-user',
            sessionId: conversationId || `conv_${uuidv4()}`,
            trainingData: companyInfo,
            context: previousMessages.map(msg => ({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content
            }))
          }
        });
        
        if (error) {
          console.error("Error calling AI chatbot function:", error);
          throw error;
        }
        
        if (data && data.success) {
          return {
            response: data.response,
            source: data.source || 'ai',
            leadInfo: leadInfo,  // Fixed: Using explicit property assignment instead of shorthand
            conversationId: data.session_id || conversationId || `conv_${uuidv4()}`
          };
        } else {
          throw new Error(data?.error || "Unknown error occurred");
        }
      } catch (error) {
        console.error("Error in demo mode:", error);
        // Fallback to static responses if the API call fails
        const demoResponses = [
          "I'd be happy to help you find a property. What's your budget range?",
          "Great! And what neighborhoods are you interested in?",
          "I've found 3 properties that match your criteria. Would you like to schedule a viewing?",
          "Perfect! I've notified your agent and scheduled a viewing for Saturday at 2pm.",
          "Our agents specialize in luxury properties in downtown and suburban areas.",
          "Yes, we have several properties with pools available right now.",
          "The average price in that neighborhood has increased by 12% over the last year.",
          "I can help you get pre-approved for a mortgage through our partner lenders.",
          "Hi there! How can I assist with your real estate needs today?",
          "I can definitely help you find information about rental properties in that area."
        ];
        
        const randomIndex = Math.floor(Math.random() * demoResponses.length);
        return {
          response: demoResponses[randomIndex],
          source: 'ai',
          leadInfo: leadInfo,  // Fixed: Using explicit property assignment instead of shorthand
          conversationId: conversationId || `conv_${uuidv4()}`
        };
      }
    }
    
    // For authenticated users, call the AI chatbot function
    try {
      // Prepare the conversation context
      const context = previousMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // Add the current message
      context.push({
        role: 'user',
        content: message
      });
      
      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('ai-chatbot', {
        body: {
          message,
          userId,
          sessionId: conversationId,
          trainingData: relevantTrainingData,
          context
        }
      });
      
      if (error) {
        console.error("Error calling AI chatbot function:", error);
        throw new Error(`Failed to generate response: ${error.message}`);
      }
      
      if (data && data.success) {
        return {
          response: data.response,
          source: data.source || 'ai',
          leadInfo: leadInfo,  // Fixed: Using explicit property assignment instead of shorthand
          conversationId: data.session_id || conversationId || `conv_${uuidv4()}`
        };
      } else {
        throw new Error(data?.error || "Unknown error occurred");
      }
    } catch (error) {
      console.error("Error in testChatbotResponse:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in testChatbotResponse:", error);
    // Make sure leadInfo is defined here
    const errorLeadInfo = {}; // Define an empty leadInfo object for error case
    return {
      response: "I'm sorry, I encountered an error processing your request. Please try again later.",
      error: error.message,
      leadInfo: errorLeadInfo,  // Fixed: Using a defined variable instead of undeclared leadInfo
      conversationId: conversationId || `conv_${uuidv4()}`
    };
  }
};

