
import { supabase } from "@/lib/supabase";
import { VisitorInfo } from "./types";

// Define a structure for the response from the chatbot
export interface ChatbotResponseResult {
  response: string;
  error?: string;
  source?: 'ai' | 'training';
  conversationId?: string;
  leadInfo?: VisitorInfo;
}

interface Message {
  role: string;
  content: string;
}

// Extract lead information from a message
const extractLeadInfo = (message: string): Partial<VisitorInfo> => {
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

// Find the most relevant training data for a user's question
async function findRelevantTrainingData(
  userId: string, 
  question: string
): Promise<{ answer: string; source: 'training' } | null> {
  try {
    // Fetch matching training data using basic text search
    // In a production system, you'd use vector embeddings or a more sophisticated matching system
    const searchableQuestion = question.toLowerCase();
    
    // First, try to find an exact match in the training data
    const { data: exactMatches, error: exactMatchError } = await supabase
      .from('chatbot_training_data')
      .select('question, answer, priority')
      .eq('user_id', userId)
      .or(`question.ilike.%${searchableQuestion}%,answer.ilike.%${searchableQuestion}%`)
      .order('priority', { ascending: false })
      .limit(5);
    
    if (exactMatchError) {
      console.error('Error searching training data:', exactMatchError);
      return null;
    }
    
    // If we found matches, return the highest priority one
    if (exactMatches && exactMatches.length > 0) {
      return {
        answer: exactMatches[0].answer,
        source: 'training'
      };
    }
    
    // If no exact matches, try a more permissive search by splitting the question into words
    // and finding training data that contains multiple of these words
    const words = searchableQuestion.split(/\s+/).filter(word => word.length > 3);
    if (words.length < 2) return null; // Not enough significant words to match
    
    // Build a query that looks for training data containing at least 2 of the significant words
    const wordLikeConditions = words.map(word => `question.ilike.%${word}%`).join(',');
    
    const { data: wordMatches, error: wordMatchError } = await supabase
      .from('chatbot_training_data')
      .select('question, answer, priority')
      .eq('user_id', userId)
      .or(wordLikeConditions)
      .order('priority', { ascending: false })
      .limit(3);
    
    if (wordMatchError) {
      console.error('Error searching training data by words:', wordMatchError);
      return null;
    }
    
    // If we found word-based matches, return the highest priority one
    if (wordMatches && wordMatches.length > 0) {
      return {
        answer: wordMatches[0].answer,
        source: 'training'
      };
    }
    
    // No matches found in training data
    return null;
    
  } catch (error) {
    console.error('Error in findRelevantTrainingData:', error);
    return null;
  }
}

// Check if a question is about properties
async function isAboutProperties(question: string): Promise<boolean> {
  const propertyKeywords = [
    'house', 'property', 'home', 'apartment', 'condo', 'real estate',
    'buying', 'selling', 'renting', 'mortgage', 'loan', 'bedroom', 'bathroom',
    'square feet', 'location', 'neighborhood', 'price', 'cost', 'value'
  ];
  
  const lowerQuestion = question.toLowerCase();
  return propertyKeywords.some(keyword => lowerQuestion.includes(keyword));
}

// Get relevant property listings for a user
async function getRelevantPropertyListings(userId: string, question: string): Promise<string> {
  try {
    // Fetch user's property listings
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, title, description, price, address, bedrooms, bathrooms, size, type')
      .eq('user_id', userId)
      .limit(5);
    
    if (error) {
      console.error('Error fetching property listings:', error);
      return '';
    }
    
    if (!properties || properties.length === 0) {
      return "I don't have any property listings to share at the moment.";
    }
    
    // Format property listings for inclusion in the response
    const formattedListings = properties.map(property => {
      return `
Property: ${property.title}
${property.description ? `Description: ${property.description}` : ''}
Price: $${Number(property.price).toLocaleString()}
${property.address ? `Location: ${property.address}` : ''}
${property.bedrooms ? `Bedrooms: ${property.bedrooms}` : ''}${property.bathrooms ? `, Bathrooms: ${property.bathrooms}` : ''}
${property.size ? `Size: ${property.size} sq ft` : ''}
${property.type ? `Type: ${property.type}` : ''}
      `.trim();
    }).join('\n\n');
    
    return `Here are some property listings that might interest you:\n\n${formattedListings}`;
    
  } catch (error) {
    console.error('Error in getRelevantPropertyListings:', error);
    return '';
  }
}

// Chat history management
async function saveConversation(
  userId: string,
  message: string,
  response: string,
  visitorInfo?: VisitorInfo,
  conversationId?: string
): Promise<string> {
  try {
    // Generate a new conversation ID if none provided
    const newConversationId = conversationId || `conv_${Date.now()}`;
    
    // Save the conversation
    const { error } = await supabase
      .from('chatbot_conversations')
      .insert({
        user_id: userId,
        visitor_id: visitorInfo?.visitorId,
        conversation_id: newConversationId,
        message,
        response
      });
    
    if (error) {
      console.error('Error saving conversation:', error);
    }
    
    return newConversationId;
    
  } catch (error) {
    console.error('Error in saveConversation:', error);
    return conversationId || `conv_${Date.now()}`;
  }
}

// Main function to test the chatbot response
export async function testChatbotResponse(
  message: string,
  userId: string,
  visitorInfo?: VisitorInfo,
  conversationId?: string,
  previousMessages?: Message[]
): Promise<ChatbotResponseResult> {
  try {
    console.log(`Processing message: "${message}" for user ${userId}`);
    
    // Extract lead information from the message
    const extractedLeadInfo = extractLeadInfo(message);
    console.log('Extracted lead info:', extractedLeadInfo);
    
    // Combine with existing visitor info
    const updatedVisitorInfo = {
      ...visitorInfo,
      ...extractedLeadInfo
    };
    
    // First, check if we have relevant training data for this question
    const trainingDataMatch = await findRelevantTrainingData(userId, message);
    
    if (trainingDataMatch) {
      console.log('Found matching training data');
      
      // Save the conversation
      const newConversationId = await saveConversation(
        userId,
        message,
        trainingDataMatch.answer,
        updatedVisitorInfo,
        conversationId
      );
      
      return {
        response: trainingDataMatch.answer,
        source: 'training',
        conversationId: newConversationId,
        leadInfo: Object.keys(extractedLeadInfo).length > 0 ? extractedLeadInfo : undefined
      };
    }
    
    // Check if the question is about properties
    const aboutProperties = await isAboutProperties(message);
    
    // Construct the messages for the AI
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are a helpful real estate assistant. Be friendly, professional, and concise in your responses.
        Your primary goal is to assist with real estate inquiries and provide helpful information about properties.
        Always be truthful and if you don't know something, say so rather than making up information.
        ${aboutProperties ? 'The user is asking about properties. Include relevant property details in your response.' : ''}
        If the user shares contact information or shows interest in a property, acknowledge it and offer to help them further.`
      }
    ];
    
    // Add previous messages for context if provided
    if (previousMessages && previousMessages.length > 0) {
      messages.push(...previousMessages.slice(-4)); // Add last 4 messages for context
    }
    
    // Add the current user message
    messages.push({ role: 'user', content: message });
    
    // If the question is about properties, fetch relevant listings
    let propertyListings = '';
    if (aboutProperties) {
      propertyListings = await getRelevantPropertyListings(userId, message);
      if (propertyListings) {
        messages.push({
          role: 'system',
          content: `Use the following property listing information in your response if relevant: ${propertyListings}`
        });
      }
    }
    
    // Call the OpenAI API through the Supabase function
    const { data, error } = await supabase.functions.invoke('ai-chatbot', {
      body: { messages }
    });
    
    if (error) {
      console.error('Error calling AI chatbot function:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
    
    const aiResponse = data?.response || 'I apologize, but I am unable to generate a response at the moment.';
    
    // Save the conversation
    const newConversationId = await saveConversation(
      userId,
      message,
      aiResponse,
      updatedVisitorInfo,
      conversationId
    );
    
    // Create a lead if enough information is available
    if (Object.keys(extractedLeadInfo).length > 0) {
      if (extractedLeadInfo.email || extractedLeadInfo.phone) {
        try {
          // Check if lead already exists with this email or phone
          const { data: existingLeads, error: searchError } = await supabase
            .from('leads')
            .select('id')
            .or(`email.eq.${extractedLeadInfo.email || ''},phone.eq.${extractedLeadInfo.phone || ''}`)
            .eq('user_id', userId)
            .limit(1);
          
          if (searchError) {
            console.error('Error searching for existing lead:', searchError);
          } else if (!existingLeads || existingLeads.length === 0) {
            // Create a new lead
            const leadData = {
              user_id: userId,
              email: extractedLeadInfo.email || '',
              phone: extractedLeadInfo.phone || '',
              first_name: extractedLeadInfo.name ? extractedLeadInfo.name.split(' ')[0] : '',
              last_name: extractedLeadInfo.name && extractedLeadInfo.name.split(' ').length > 1 
                ? extractedLeadInfo.name.split(' ').slice(1).join(' ') 
                : '',
              budget: extractedLeadInfo.budget || null,
              property_interest: extractedLeadInfo.propertyInterest || null,
              source: 'Chatbot',
              notes: `Created from chatbot conversation. First message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`
            };
            
            const { error: insertError } = await supabase
              .from('leads')
              .insert([leadData]);
            
            if (insertError) {
              console.error('Error creating lead:', insertError);
            } else {
              console.log('Created new lead from chatbot conversation');
              
              // Log this activity
              await supabase
                .from('activities')
                .insert({
                  user_id: userId,
                  type: 'lead',
                  description: `New lead created from chatbot: ${extractedLeadInfo.name || extractedLeadInfo.email || extractedLeadInfo.phone}`,
                  target_type: 'lead'
                });
            }
          } else {
            console.log('Lead already exists, not creating duplicate');
          }
        } catch (leadError) {
          console.error('Error handling lead creation:', leadError);
        }
      }
    }
    
    return {
      response: aiResponse,
      source: 'ai',
      conversationId: newConversationId,
      leadInfo: Object.keys(extractedLeadInfo).length > 0 ? extractedLeadInfo : undefined
    };
    
  } catch (error) {
    console.error('Error in testChatbotResponse:', error);
    return {
      response: 'I apologize, but I encountered an error while processing your request. Please try again later.',
      error: error.message
    };
  }
}
