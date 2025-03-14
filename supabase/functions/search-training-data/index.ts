
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
      // First, try fuzzy text search for best matches
      const { data: fileData, error: fileError } = await supabase
        .from('chatbot_training_files')
        .select('id, source_file, extracted_text, category, priority')
        .eq('user_id', userId)
        .textSearch('extracted_text', query.split(' ').join(' & '), {
          type: 'plain',
          config: 'english'
        })
        .limit(5);
      
      if (fileError) {
        console.error('Error searching file content:', fileError);
      } else if (fileData && fileData.length > 0) {
        console.log(`Found ${fileData.length} file content matches using text search`);
        
        result.file_content = fileData.map(file => ({
          id: file.id,
          source: file.source_file,
          category: file.category,
          text: file.extracted_text,
          priority: file.priority
        }));
      } else {
        // If no results from text search, try broader keyword-based search
        console.log('No text search matches, trying keywords search');
        
        // Only proceed if we have keywords
        if (keywords.length > 0) {
          const keywordQueries = keywords.map(keyword => {
            return supabase
              .from('chatbot_training_files')
              .select('id, source_file, extracted_text, category, priority')
              .eq('user_id', userId)
              .ilike('extracted_text', `%${keyword}%`)
              .limit(2);
          });
          
          const keywordResults = await Promise.all(keywordQueries);
          
          // Combine results and remove duplicates
          const uniqueResults = new Map();
          keywordResults.forEach(result => {
            if (result.data) {
              result.data.forEach(file => {
                if (!uniqueResults.has(file.id)) {
                  uniqueResults.set(file.id, file);
                }
              });
            }
          });
          
          if (uniqueResults.size > 0) {
            console.log(`Found ${uniqueResults.size} file content matches using keywords`);
            
            result.file_content = Array.from(uniqueResults.values()).map(file => ({
              id: file.id,
              source: file.source_file,
              category: file.category,
              text: file.extracted_text,
              priority: file.priority
            })).slice(0, 3); // Limit to top 3
          }
        }
      }
    }
    
    // Search property listings if requested
    if (includeProperties) {
      // Prepare search parameters based on the query
      const searchParams = analyzePropertyQuery(query);
      
      if (searchParams) {
        console.log('Searching properties with params:', searchParams);
        
        const { data: propertyData, error: propertyError } = await supabase.functions.invoke(
          'search-properties',
          {
            body: { 
              userId: userId, 
              searchParams: searchParams
            }
          }
        );
        
        if (propertyError) {
          console.error('Error searching properties:', propertyError);
        } else if (propertyData && propertyData.properties && propertyData.properties.length > 0) {
          console.log(`Found ${propertyData.properties.length} property matches`);
          
          result.property_listings = propertyData.properties.map(property => ({
            id: property.id,
            title: property.title || `Property in ${property.city || 'Exclusive Location'}`,
            price: property.price,
            location: property.location,
            features: property.features,
            bedroomCount: property.bedrooms,
            bathroomCount: property.bathrooms,
            hasPool: property.has_pool,
            url: property.url || `./property/${property.id}`
          }));
        } else {
          console.log('No property matches found');
        }
      } else if (propertyKeywords.length > 0) {
        // If we couldn't construct comprehensive search params but have property keywords,
        // use them to search directly with the search_properties function
        console.log(`Searching properties with keywords: ${propertyKeywords.join(', ')}`);
        
        const { data: propertyData, error: propertyError } = await supabase.rpc(
          'search_properties',
          { user_id_param: userId, query_text: propertyKeywords.join(' '), max_results: 3 }
        );
        
        if (propertyError) {
          console.error('Error searching properties with keywords:', propertyError);
        } else if (propertyData && propertyData.length > 0) {
          console.log(`Found ${propertyData.length} property matches with keywords`);
          
          result.property_listings = propertyData.map(property => ({
            id: property.id,
            title: property.title || `Property in ${property.city || 'Exclusive Location'}`,
            price: property.price,
            location: property.city ? (property.state ? `${property.city}, ${property.state}` : property.city) : null,
            features: [
              property.bedrooms ? `${property.bedrooms} Bedrooms` : null,
              property.bathrooms ? `${property.bathrooms} Bathrooms` : null,
              property.living_area ? `${property.living_area} m² Living Area` : null
            ].filter(Boolean),
            bedroomCount: property.bedrooms,
            bathroomCount: property.bathrooms,
            hasPool: property.has_pool,
            url: property.url || `./property/${property.id}`
          }));
        }
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

// Helper function to analyze property-related queries and extract search parameters
function analyzePropertyQuery(query) {
  // Initialize search params object
  const searchParams = {};
  const lowerQuery = query.toLowerCase();
  
  // Check for property type
  const typePatterns = [
    { regex: /\b(?:apartment|flat|condo(?:minium)?)\b/i, type: 'apartment' },
    { regex: /\bhouse\b/i, type: 'house' },
    { regex: /\bvilla\b/i, type: 'villa' },
    { regex: /\btownhouse\b/i, type: 'townhouse' },
    { regex: /\b(?:land|plot|lot)\b/i, type: 'land' },
    { regex: /\b(?:commercial|office|retail|shop)\b/i, type: 'commercial' }
  ];
  
  for (const pattern of typePatterns) {
    if (pattern.regex.test(lowerQuery)) {
      searchParams.type = pattern.type;
      break;
    }
  }
  
  // Check for location
  const locationMatch = lowerQuery.match(/\bin\s+([a-z\s]+)(?:\s+area)?\b/i) || 
                        lowerQuery.match(/\bnear\s+([a-z\s]+)\b/i) ||
                        lowerQuery.match(/\bat\s+([a-z\s]+)\b/i);
  
  if (locationMatch && locationMatch[1]) {
    searchParams.location = locationMatch[1].trim();
  }
  
  // Check for price range
  const minPriceMatch = lowerQuery.match(/\babove\s+(\d[,\d]*)\b/i) ||
                        lowerQuery.match(/\bfrom\s+(\d[,\d]*)\b/i) ||
                        lowerQuery.match(/\bminimum\s+(\d[,\d]*)\b/i) ||
                        lowerQuery.match(/\bmore\s+than\s+(\d[,\d]*)\b/i);
  
  const maxPriceMatch = lowerQuery.match(/\bbelow\s+(\d[,\d]*)\b/i) ||
                        lowerQuery.match(/\bunder\s+(\d[,\d]*)\b/i) ||
                        lowerQuery.match(/\bless\s+than\s+(\d[,\d]*)\b/i) ||
                        lowerQuery.match(/\bmax(?:imum)?\s+(\d[,\d]*)\b/i);
  
  if (minPriceMatch && minPriceMatch[1]) {
    searchParams.minPrice = parseInt(minPriceMatch[1].replace(/,/g, ''), 10);
  }
  
  if (maxPriceMatch && maxPriceMatch[1]) {
    searchParams.maxPrice = parseInt(maxPriceMatch[1].replace(/,/g, ''), 10);
  }
  
  // Check for number of bedrooms
  const bedroomMatch = lowerQuery.match(/\b(\d+)\s*(?:bed|bedroom|br)\b/i) ||
                      lowerQuery.match(/\b(one|two|three|four|five|six)\s*(?:bed|bedroom|br)\b/i);
  
  if (bedroomMatch && bedroomMatch[1]) {
    const bedroomValue = bedroomMatch[1].toLowerCase();
    const bedroomMap = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6 };
    
    searchParams.bedrooms = bedroomMap[bedroomValue] || parseInt(bedroomValue, 10);
  }
  
  // Check for pool
  if (/\bpool\b/i.test(lowerQuery) || /\bswimming\b/i.test(lowerQuery)) {
    searchParams.hasPool = true;
  }
  
  // Check for keywords to use for search
  const keywords = [];
  const keywordPatterns = [
    /\bmodern\b/i, /\bluxury\b/i, /\bbeach\b/i, /\bview\b/i, 
    /\bnew\b/i, /\brenovated\b/i, /\bfurnished\b/i, /\bgarden\b/i
  ];
  
  keywordPatterns.forEach(pattern => {
    const match = lowerQuery.match(pattern);
    if (match) {
      keywords.push(match[0]);
    }
  });
  
  if (keywords.length > 0) {
    searchParams.keywords = keywords;
  }
  
  // Add property style if mentioned
  const stylePatterns = [
    { regex: /\bmodern\b/i, style: 'modern' },
    { regex: /\bcontemporary\b/i, style: 'contemporary' },
    { regex: /\btraditional\b/i, style: 'traditional' },
    { regex: /\brustic\b/i, style: 'rustic' },
    { regex: /\bminimalist\b/i, style: 'minimalist' },
    { regex: /\bindust(?:rial)?\b/i, style: 'industrial' },
    { regex: /\bcountry\b/i, style: 'country' }
  ];
  
  for (const pattern of stylePatterns) {
    if (pattern.regex.test(lowerQuery)) {
      searchParams.style = pattern.style;
      break;
    }
  }
  
  // Only return searchParams if we have some meaningful parameters
  const hasSearchParams = Object.keys(searchParams).length > 0;
  return hasSearchParams ? searchParams : null;
}
