
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
  console.log('🚀 SEARCH-TRAINING-DATA FUNCTION CALLED - ENTRY POINT');
  console.log('🔑 Function URL:', req.url);
  console.log('📋 Request method:', req.method);
  console.log('🔍 Request headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📦 Starting to parse request body');
    let reqBody;
    try {
      reqBody = await req.json();
      console.log('📦 Request body parsed successfully');
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          qa_matches: [],
          file_content: [],
          property_listings: []
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { 
      query, 
      userId, 
      conversationId, 
      includeQA = true, 
      includeFiles = true,
      includeProperties = true,
      previousMessages = []
    } = reqBody;
    
    console.log(`🔍 Processing training search with parameters: 
      - Query: "${query}"
      - User ID: ${userId}
      - Conversation ID: ${conversationId}
      - Include QA: ${includeQA}
      - Include Files: ${includeFiles}
      - Include Properties: ${includeProperties}
      - Previous messages: ${previousMessages.length}
    `);
    
    if (!userId) {
      console.error('❌ Missing required parameter: userId');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameter: userId',
          qa_matches: [],
          file_content: [],
          property_listings: []
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!query) {
      console.error('❌ Missing required parameter: query');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameter: query',
          qa_matches: [],
          file_content: [],
          property_listings: []
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if this is potentially an agency-related question
    const lowerQuery = query.toLowerCase();
    const agencyKeywords = [
      'agency', 'company', 'firm', 'about you', 'your name', 'who are you',
      'business', 'office', 'location', 'address', 'contact', 'tell me about'
    ];
    
    const isAgencyQuestion = agencyKeywords.some(keyword => lowerQuery.includes(keyword));
    if (isAgencyQuestion) {
      console.log('🏢 AGENCY QUESTION DETECTED IN SEARCH FUNCTION:', query);
    }
    
    // Extract keywords from the query for better matching
    const keywords = extractKeywords(query);
    console.log(`🔤 Extracted keywords: ${keywords.join(', ')}`);
    
    // Extract property-related keywords if looking for properties
    const propertyKeywords = includeProperties ? extractPropertyKeywords(query) : [];
    if (propertyKeywords.length > 0) {
      console.log(`🏠 Property-related keywords: ${propertyKeywords.join(', ')}`);
    }
    
    // Initialize response object
    const result = {
      qa_matches: [],
      file_content: [],
      property_listings: []
    };
    
    // Search all training data regardless of content_type
    if (includeQA || includeFiles) {
      console.log('🔍 Searching for all training content types');
      console.log('🔍 Calling Supabase RPC: search_all_training_content');
      console.log('🔍 Parameters:', { user_id_param: userId, query_text: query });
      
      try {
        console.log(`⏳ Starting Supabase RPC call - ${new Date().toISOString()}`);
        // Use the search_all_training_content function which now combines all content types
        const { data: trainingData, error: trainingError } = await supabase.rpc(
          'search_all_training_content',
          { user_id_param: userId, query_text: query }
        );
        console.log(`✅ Supabase RPC call completed - ${new Date().toISOString()}`);
        
        // 🔍 Debugging: Log the response from Supabase in detail
        console.log(`🔍 Training Data Response from Supabase for user ${userId}:`, JSON.stringify(trainingData || 'null', null, 2));
        
        if (trainingError) {
          console.error('❌ Error searching all training content:', trainingError);
          console.error('❌ Error details:', JSON.stringify(trainingError, null, 2));
        } else if (trainingData && trainingData.length > 0) {
          console.log(`📊 Found ${trainingData.length} training content matches`);
          console.log('📊 Content types found:', trainingData.map((item: any) => item.content_type).join(', '));
          
          // Log sample results for debugging
          if (trainingData.length > 0) {
            console.log('📊 First result sample:', JSON.stringify(trainingData[0], null, 2));
          }
          
          // Give boost to agency questions if this is an agency-related query
          const trainingWithBoost = isAgencyQuestion ? 
            trainingData.map((item: any) => {
              // Check if content is related to agency
              const isAgencyContent = 
                (item.category && ['agency', 'company', 'about us', 'contact'].some(term => 
                  item.category.toLowerCase().includes(term))) ||
                (item.content && agencyKeywords.some(term => 
                  item.content.toLowerCase().includes(term)));
                
              // Apply boost to similarity score for agency content
              if (isAgencyContent) {
                console.log(`⭐️ Boosting agency-related content: ${item.content_type}, similarity from ${item.similarity} to ${item.similarity * 1.5}`);
                return { 
                  ...item, 
                  similarity: Math.min(1.0, item.similarity * 1.5),  // Boost but cap at 1.0
                  boosted: true
                };
              }
              return item;
            }).sort((a: any, b: any) => b.similarity - a.similarity)
            : trainingData;
          
          // Process and separate training content into qa_matches and file_content
          trainingWithBoost.forEach((item: any) => {
            console.log(`⚙️ Processing item of type ${item.content_type}, similarity: ${item.similarity.toFixed(2)}, category: ${item.category || 'uncategorized'}`);
            
            // Check content_type to determine whether it's a QA pair or file content
            if (item.content_type === 'qa' && includeQA) {
              // Extract question and answer from the content if it's in Q&A format
              const qaMatch = extractQAPair(item.content);
              if (qaMatch) {
                console.log(`✅ Adding QA match: Q: ${qaMatch.question.substring(0, 30)}...`);
                result.qa_matches.push({
                  id: item.content_id,
                  question: qaMatch.question,
                  answer: qaMatch.answer,
                  category: item.category,
                  priority: item.priority,
                  similarity: item.similarity,
                  boosted: item.boosted
                });
              } else {
                console.log(`❌ Failed to extract QA pair from content: ${item.content.substring(0, 50)}...`);
              }
            } else if (includeFiles) {
              // Treat as file content for all other content types
              console.log(`✅ Adding file content: ${item.content.substring(0, 30)}...`);
              result.file_content.push({
                id: item.content_id,
                source: item.content_type,
                category: item.category,
                text: item.content,
                priority: item.priority,
                similarity: item.similarity,
                boosted: item.boosted
              });
            }
          });
          
          console.log(`✅ Processed ${result.qa_matches.length} QA matches and ${result.file_content.length} file content items`);
        } else {
          console.log('⚠️ No training content matches found');
        }
      } catch (supabaseError) {
        console.error('❌ Exception in Supabase RPC call:', supabaseError);
        console.error('❌ Stack trace:', supabaseError.stack);
      }
    }
    
    // Search property listings if requested
    if (includeProperties) {
      try {
        console.log('🔍 Searching for property listings');
        console.log('🔍 Calling Supabase RPC: search_properties');
        
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
          console.error('❌ Error searching properties:', propertyError);
        } else if (propertyData && propertyData.length > 0) {
          console.log(`📊 Found ${propertyData.length} property matches`);
          
          result.property_listings = propertyData.map((property: any) => ({
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
        } else {
          console.log('⚠️ No property matches found');
        }
      } catch (error) {
        console.error('❌ Error processing property search:', error);
      }
    }
    
    // Return the combined results
    console.log(`🏁 Returning: ${result.qa_matches.length} QA matches, ${result.file_content.length} file content items, ${result.property_listings.length} property listings`);
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("❌ Error in search-training-data function:", error);
    console.error("❌ Stack trace:", error.stack);
    
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

// Helper function to extract question and answer from content
function extractQAPair(content: string) {
  // Check if content is in Q&A format
  if (!content) {
    console.log('❌ Content is null or undefined in extractQAPair');
    return null;
  }
  
  if (content.startsWith('Q:') && content.includes('\nA:')) {
    const parts = content.split('\nA:');
    if (parts.length >= 2) {
      return {
        question: parts[0].replace('Q:', '').trim(),
        answer: parts[1].trim()
      };
    }
  }
  
  console.log(`❌ Content does not match Q&A format: ${content.substring(0, 50)}...`);
  return null;
}

// Helper function to extract meaningful keywords from a query
function extractKeywords(query: string) {
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
function extractPropertyKeywords(query: string) {
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
