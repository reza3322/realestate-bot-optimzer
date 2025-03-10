import { supabase } from "@/lib/supabase";

export const searchTrainingData = async (
  query: string,
  userId: string,
  options: {
    includeQA?: boolean;
    includeFiles?: boolean;
    includeProperties?: boolean;
    maxResults?: number;
  } = {}
) => {
  const { includeQA = true, includeFiles = true, includeProperties = true, maxResults = 5 } = options;
  
  try {
    const { data, error } = await supabase.functions.invoke('search-training-data', {
      body: { 
        query,
        userId,
        includeQA,
        includeFiles,
        includeProperties,
        maxResults
      }
    });

    if (error) {
      console.error("Error searching training data:", error);
      throw error;
    }

    const { qa_matches: qaMatches, file_content: fileContent, property_listings: propertyListings } = data || {};
    
    return {
      qaMatches: qaMatches || [],
      fileContent: fileContent || [],
      propertyListings: Array.isArray(propertyListings) ? propertyListings : []
    };
  } catch (error) {
    console.error("Error searching training data:", error);
    return {
      qaMatches: [],
      fileContent: [],
      propertyListings: []
    };
  }
};
