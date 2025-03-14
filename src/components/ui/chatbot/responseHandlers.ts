
import { ChatMessage, Property, TrainingContent } from './types';
import { supabase } from '@/lib/supabase';

// Filter and limit context based on relevance
export const truncateContext = (context: string, maxLength: number = 4000): string => {
  if (context.length <= maxLength) return context;
  return context.substring(0, maxLength) + '...';
};

// Search for relevant training content and property data
export const searchTrainingAndProperties = async (
  query: string, 
  userId: string
): Promise<{ trainingContent: string; propertyData: Property[] }> => {
  try {
    const { data, error } = await supabase.functions.invoke('search-training-data', {
      body: {
        query,
        userId,
        includeQA: true,
        includeFiles: true,
        includeProperties: true
      }
    });

    if (error) {
      console.error('Error fetching training data:', error);
      return { trainingContent: '', propertyData: [] };
    }

    console.log('Training data search results:', data);

    // Process Q&A matches
    const qaContent = data.qa_matches?.map((item: any) => 
      `Q: ${item.question}\nA: ${item.answer}`
    ).join('\n\n') || '';

    // Process file content
    const fileContent = data.file_content?.map((item: any) => 
      `${item.extracted_text}`
    ).join('\n\n') || '';

    // Combine all content sources with proper labels
    let combinedContent = '';
    
    if (qaContent) {
      combinedContent += `### Q&A CONTENT ###\n${qaContent}\n\n`;
    }
    
    if (fileContent) {
      combinedContent += `### DOCUMENT CONTENT ###\n${fileContent}\n\n`;
    }

    // Process property listings and format them for the AI
    const propertyListings = data.property_listings || [];
    
    // Map property data to a more usable format
    const formattedProperties = propertyListings.map((property: any) => ({
      id: property.id,
      title: property.title,
      description: property.description,
      price: property.price,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      location: `${property.city || ''}, ${property.state || ''}`.trim(),
      status: property.status,
      url: property.url,
      livingArea: property.living_area,
      plotArea: property.plot_area,
      garageArea: property.garage_area,
      terrace: property.terrace,
      hasPool: property.has_pool
    }));

    return { 
      trainingContent: truncateContext(combinedContent),
      propertyData: formattedProperties
    };
  } catch (error) {
    console.error('Exception searching training data:', error);
    return { trainingContent: '', propertyData: [] };
  }
};

// Search for property listings specifically (used for direct property search)
export const searchProperties = async (
  userId: string, 
  searchParams: any
): Promise<Property[]> => {
  try {
    console.log('Searching properties with params:', searchParams);
    
    const { data, error } = await supabase.functions.invoke('search-properties', {
      body: {
        userId,
        searchParams
      }
    });

    if (error) {
      console.error('Error searching properties:', error);
      return [];
    }

    console.log('Property search results:', data);
    
    // Format the property data
    const properties = (data.properties || []).map((property: any) => ({
      id: property.id,
      title: property.title,
      description: property.description,
      price: property.price,
      bedrooms: property.bedrooms ? Number(property.bedrooms) : undefined,
      bathrooms: property.bathrooms ? Number(property.bathrooms) : undefined,
      location: `${property.city || ''}, ${property.state || ''}`.trim(),
      status: property.status,
      url: property.url,
      livingArea: property.living_area ? Number(property.living_area) : undefined,
      plotArea: property.plot_area ? Number(property.plot_area) : undefined,
      garageArea: property.garage_area ? Number(property.garage_area) : undefined,
      terrace: property.terrace ? Number(property.terrace) : undefined,
      hasPool: property.has_pool
    }));

    return properties;
  } catch (error) {
    console.error('Exception searching properties:', error);
    return [];
  }
};

// Generate a system prompt based on user settings, training data, and property data
export const generateSystemPrompt = (
  trainingContent: string,
  propertyData: Property[]
): string => {
  // Base system prompt
  let systemPrompt = `You are an AI assistant for a real estate business. Your goal is to provide helpful, accurate information about the business, its properties, and services. 
  
  If you are asked about specific properties, you should share relevant information about them based on the property data provided. 
  If you don't know the answer to a question, admit that you don't know rather than making up information.
  
  Keep your responses concise and professional. Use a conversational, helpful tone that's appropriate for a real estate business.`;

  // Add training content if available
  if (trainingContent) {
    systemPrompt += `\n\n### TRAINING CONTENT ###\nUse the following content to answer questions about the business, its services, and policies:\n\n${trainingContent}`;
  }

  // Add property data if available
  if (propertyData && propertyData.length > 0) {
    systemPrompt += `\n\n### PROPERTY LISTINGS ###\nHere are details about available properties that you can reference when answering questions:\n\n`;
    
    propertyData.forEach((property, index) => {
      systemPrompt += `Property ${index + 1}:\n`;
      systemPrompt += `- Title: ${property.title || 'N/A'}\n`;
      systemPrompt += `- Price: ${property.price ? `$${property.price.toLocaleString()}` : 'N/A'}\n`;
      systemPrompt += `- Bedrooms: ${property.bedrooms || 'N/A'}\n`;
      systemPrompt += `- Bathrooms: ${property.bathrooms || 'N/A'}\n`;
      if (property.livingArea) systemPrompt += `- Living Area: ${property.livingArea} sq ft\n`;
      if (property.plotArea) systemPrompt += `- Plot Area: ${property.plotArea} sq ft\n`;
      if (property.location) systemPrompt += `- Location: ${property.location}\n`;
      if (property.description) systemPrompt += `- Description: ${property.description}\n`;
      if (property.url) systemPrompt += `- URL: ${property.url}\n`;
      systemPrompt += '\n';
    });
  }

  return systemPrompt;
};

// Process and store the conversation
export const saveConversation = async (
  userId: string, 
  visitorId: string,
  conversationId: string,
  message: string, 
  response: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('chatbot_conversations')
      .insert({
        user_id: userId,
        visitor_id: visitorId,
        conversation_id: conversationId,
        message: message,
        response: response
      });

    if (error) {
      console.error('Error saving conversation:', error);
    }
  } catch (error) {
    console.error('Exception saving conversation:', error);
  }
};
