
import { supabase } from '@/lib/supabase';
import { ChatMessage, Property, TrainingContent } from './types';

// Function to format a property recommendation for display in chat
export const formatPropertyRecommendations = (properties: Property[]): string => {
  if (!properties || properties.length === 0) {
    return "I couldn't find any properties matching your criteria at the moment.";
  }

  let response = "Based on your preferences, here are some properties you might be interested in:\n\n";

  properties.forEach((property, index) => {
    response += `**${property.title}**\n`;
    if (property.price) response += `Price: $${property.price.toLocaleString()}\n`;
    if (property.bedrooms) response += `Bedrooms: ${property.bedrooms}\n`;
    if (property.bathrooms) response += `Bathrooms: ${property.bathrooms}\n`;
    if (property.city && property.state) response += `Location: ${property.city}, ${property.state}\n`;
    if (property.description) response += `Description: ${property.description.substring(0, 100)}...\n`;
    if (property.url) response += `[View Property](${property.url})\n`;
    
    if (index < properties.length - 1) response += "\n---\n\n";
  });

  return response;
};

// Function to parse and format search results from Supabase
export const formatSearchResults = (results: any): string => {
  if (!results || !results.length) {
    return "I don't have specific information about that in my knowledge base. Is there something else I can help with?";
  }

  // Initialize the response
  let response = "Based on the information I have:\n\n";

  // Process each result
  results.forEach((item: any) => {
    if (item.question && item.answer) {
      // This is a Q&A pair
      response += `Q: ${item.question}\n`;
      response += `A: ${item.answer}\n\n`;
    } else if (item.extracted_text) {
      // This is extracted content from a file or webpage
      const source = item.source_file ? `Source: ${item.source_file}\n` : '';
      response += `${source}${item.extracted_text}\n\n`;
    }
  });

  return response.trim();
};

// Test function for chatbot response retrieval
export const testChatbotResponse = async (
  message: string,
  userId: string
): Promise<{ content: string }> => {
  try {
    // Call the Supabase function to retrieve training data
    const { data, error } = await supabase
      .from('chatbot_training_files')
      .select('*')
      .eq('user_id', userId)
      .eq('content_type', 'qa_pair')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching training data:", error);
      return {
        content: "I'm sorry, I encountered an error retrieving information. Please try again later."
      };
    }

    // Format the response
    const responseContent = formatSearchResults(data);
    return { content: responseContent };
  } catch (err) {
    console.error("Exception in testChatbotResponse:", err);
    return {
      content: "I'm sorry, I encountered an unexpected error. Please try again later."
    };
  }
};

// Function to search training content via edge function
export const searchTrainingContent = async (
  message: string,
  userId: string
): Promise<string> => {
  try {
    console.log(`Searching training content for: "${message.substring(0, 30)}..."`);
    
    // Call the edge function to search training data
    const { data, error } = await supabase.functions.invoke('search-training-data', {
      body: {
        query: message,
        userId: userId,
        includeQA: true,
        includeFiles: true
      }
    });
    
    if (error) {
      console.error("Error searching training content:", error);
      return "I'm having trouble accessing my knowledge base. Let me try to help based on what I generally know.";
    }
    
    console.log("Training content search results:", data);
    
    // Process results from various sources
    const qaResults = data?.qa_matches || [];
    const fileResults = data?.file_content || [];
    
    // Combine all relevant results
    const allResults = [...qaResults, ...fileResults];
    
    if (allResults.length === 0) {
      return "I don't have specific information about that in my knowledge base. Is there something else I can help with?";
    }
    
    // Format the combined results
    return formatSearchResults(allResults);
  } catch (err) {
    console.error("Exception in searchTrainingContent:", err);
    return "I'm sorry, I encountered an unexpected error while searching my knowledge base.";
  }
};

// Function to search properties via edge function
export const searchProperties = async (
  message: string,
  userId: string,
  searchParams = {}
): Promise<Property[]> => {
  try {
    console.log(`Searching properties for: "${message.substring(0, 30)}..." with params:`, searchParams);
    
    // Call the edge function to search properties
    const { data, error } = await supabase.functions.invoke('search-properties', {
      body: {
        userId: userId,
        searchParams: {
          ...searchParams,
          query: message
        }
      }
    });
    
    if (error) {
      console.error("Error searching properties:", error);
      return [];
    }
    
    console.log("Properties search results:", data);
    
    // Return the properties
    return data?.properties || [];
  } catch (err) {
    console.error("Exception in searchProperties:", err);
    return [];
  }
};
