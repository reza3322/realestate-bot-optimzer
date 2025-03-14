
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      query, 
      userId, 
      conversationId, 
      includeQA = true, 
      includeFiles = true,
      includeProperties = true,
      previousMessages = []
    } = await req.json();
    
    console.log(`Processing training search for user ${userId} with query: "${query}"`);
    
    // Extract keywords from the query for better matching
    const keywords = extractKeywords(query);
    console.log(`Extracted keywords: ${keywords.join(', ')}`);
    
    // Extract property-related keywords if looking for properties
    const propertyKeywords = includeProperties ? extractPropertyKeywords(query) : [];
    if (propertyKeywords.length > 0) {
      console.log(`Property-related keywords: ${propertyKeywords.join(', ')}`);
    }
    
    // Initialize response object
    const result = {
      qa_matches: [],
      file_content: [],
      property_listings: []
    };
    
    // Search Q&A training data if requested
    if (includeQA) {
      const { data: qaData, error: qaError } = await supabase.rpc(
        'search_training_data',
        { user_id_param: userId, query_text: query }
      );
      
      if (qaError) {
        console.error('Error searching training data:', qaError);
      } else if (qaData && qaData.length > 0) {
        console.log(`Found ${qaData.length} QA matches`);
        result.qa_matches = qaData;
      }
    }
    
    // Search file content if requested
    if (includeFiles) {
      // First, try a direct query from the single chatbot_training_files table
      const { data: fileData, error: fileError } = await supabase
        .from('chatbot_training_files')
        .select('id, source_file, extracted_text, category, priority')
        .eq('user_id', userId)
        .eq('content_type', 'file')
        .order('priority', { ascending: false })
        .limit(5);
        
      if (fileError) {
        console.error('Error fetching file content:', fileError);
      } else if (fileData && fileData.length > 0) {
        console.log(`Found ${fileData.length} file content matches`);
        
        // Process and add file content matches
        result.file_content = fileData.map(file => ({
          id: file.id,
          source: file.source_file,
          category: file.category,
          text: file.extracted_text,
          priority: file.priority
        }));
      }
    }
    
    // Search property listings if requested
    if (includeProperties) {
      try {
        // Use the search_properties function we created
        const { data: propertyData, error: propertyError } = await supabase.rpc(
          'search_properties',
          { 
            user_id_param: userId, 
            query_text: propertyKeywords.length > 0 ? propertyKeywords.join(' ') : query,
            max_results: 3 
          }
        );
        
        if (propertyError) {
          console.error('Error searching properties:', propertyError);
        } else if (propertyData && propertyData.length > 0) {
          console.log(`Found ${propertyData.length} property matches`);
          
          result.property_listings = propertyData.map(property => ({
            id: property.id,
            title: property.title || `Property in ${property.city || 'Exclusive Location'}`,
            price: property.price,
            location: property.city ? (property.state ? `${property.city}, ${property.state}` : property.city) : null,
            features: [
              property.bedrooms ? `${property.bedrooms} Bedrooms` : null,
              property.bathrooms ? `${property.bathrooms} Bathrooms` : null,
              property.living_area ? `${property.living_area} m² Living Area` : null,
              property.has_pool ? 'Swimming Pool' : null
            ].filter(Boolean),
            bedroomCount: property.bedrooms,
            bathroomCount: property.bathrooms,
            hasPool: property.has_pool,
            url: property.url || `./property/${property.id}`
          }));
        }
      } catch (error) {
        console.error('Error processing property search:', error);
      }
    }
    
    // Return the combined results
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in search-training-data function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        qa_matches: [],
        file_content: [],
        property_listings: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to extract meaningful keywords from a query
function extractKeywords(query) {
  // Remove common stop words and punctuation
  const stopWords = ['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
                    'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
                    'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
                    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
                    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
                    'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
                    'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
                    'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
                    'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
                    'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
                    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
                    'than', 'too', 'very', 'can', 'will', 'just', 'don', 'should', 'now', 'would', 'could'];
  
  // Normalize and split
  const words = query.toLowerCase()
                    .replace(/[^\w\s]/g, '')
                    .split(/\s+/)
                    .filter(word => word.length > 2 && !stopWords.includes(word));
  
  // Return unique words
  return [...new Set(words)];
}

// Helper function to extract property-related keywords
function extractPropertyKeywords(query) {
  const propertyTerms = [
    'property', 'house', 'home', 'apartment', 'condo', 'villa', 'townhouse', 'land', 'real estate',
    'buy', 'rent', 'lease', 'price', 'cost', 'bedroom', 'bathroom', 'kitchen', 'living', 'room',
    'garden', 'yard', 'garage', 'parking', 'basement', 'attic', 'floor', 'ceiling', 'roof',
    'pool', 'spa', 'jacuzzi', 'beach', 'ocean', 'sea', 'lake', 'river', 'mountain', 'view',
    'urban', 'suburban', 'rural', 'downtown', 'uptown', 'city', 'town', 'village',
    'square meters', 'square feet', 'acres', 'hectares', 'location'
  ];
  
  // Find property terms in the query
  const lowerQuery = query.toLowerCase();
  return propertyTerms.filter(term => lowerQuery.includes(term));
}
