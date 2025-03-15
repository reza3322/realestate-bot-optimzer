
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
      console.log('📦 Request body parsed successfully:', JSON.stringify(reqBody));
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
    
    // Initialize response object
    const result = {
      qa_matches: [],
      file_content: [],
      property_listings: []
    };
    
    // DIRECT DATABASE QUERY: Query the chatbot_training_files table directly to check if there's data
    console.log('🔍 DIRECT CHECK: Querying chatbot_training_files for user_id:', userId);
    try {
      const { data: trainingFilesCheck, error: checkError } = await supabase
        .from('chatbot_training_files')
        .select('id, question, answer, category')
        .eq('user_id', userId)
        .limit(5);
      
      console.log('📊 DIRECT CHECK RESULT:', JSON.stringify(trainingFilesCheck || [], null, 2));
      if (checkError) {
        console.error('❌ Error in direct check:', checkError);
      } else {
        console.log(`📊 DIRECT CHECK found ${trainingFilesCheck?.length || 0} training files`);
      }
    } catch (checkError) {
      console.error('❌ Exception in direct check:', checkError);
    }
    
    // Search all training data 
    if (includeQA || includeFiles) {
      console.log('🔍 Searching for all training content types');
      
      try {
        console.log(`⏳ Starting direct query to chatbot_training_files - ${new Date().toISOString()}`);
        
        // First try direct database query as a fallback
        const { data: directQueryData, error: directQueryError } = await supabase
          .from('chatbot_training_files')
          .select('*')
          .eq('user_id', userId)
          .order('priority', { ascending: false })
          .limit(10);
        
        if (directQueryError) {
          console.error('❌ Error in direct query:', directQueryError);
        } else if (directQueryData && directQueryData.length > 0) {
          console.log(`📊 Direct query found ${directQueryData.length} training items`);
          
          // Process the direct query results
          directQueryData.forEach((item) => {
            if (item.question && item.answer) {
              result.qa_matches.push({
                id: item.id,
                question: item.question,
                answer: item.answer,
                category: item.category,
                priority: item.priority,
                similarity: 0.8, // Default high similarity for direct matches
                source: 'direct_query'
              });
            } else if (item.extracted_text) {
              result.file_content.push({
                id: item.id,
                source: item.content_type || 'text',
                category: item.category,
                text: item.extracted_text,
                priority: item.priority,
                similarity: 0.7, // Default similarity
                source: 'direct_query'
              });
            }
          });
        }
        
        // Also try the RPC function if available
        console.log(`⏳ Starting Supabase RPC call - ${new Date().toISOString()}`);
        // Use the search_all_training_content function 
        const { data: trainingData, error: trainingError } = await supabase.rpc(
          'search_all_training_content',
          { user_id_param: userId, query_text: query }
        );
        console.log(`✅ Supabase RPC call completed - ${new Date().toISOString()}`);
        
        // Log the response from Supabase in detail
        console.log(`🔍 Training Data Response from Supabase for user ${userId}:`, JSON.stringify(trainingData || 'null', null, 2));
        
        if (trainingError) {
          console.error('❌ Error searching all training content:', trainingError);
          console.error('❌ Error details:', JSON.stringify(trainingError, null, 2));
        } else if (trainingData && trainingData.length > 0) {
          console.log(`📊 Found ${trainingData.length} training content matches from RPC`);
          
          // Give boost to agency questions if this is an agency-related query
          const trainingWithBoost = isAgencyQuestion ? 
            trainingData.map((item) => {
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
            }).sort((a, b) => b.similarity - a.similarity)
            : trainingData;
          
          // Process and separate training content into qa_matches and file_content
          trainingWithBoost.forEach((item) => {
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
                  boosted: item.boosted,
                  source: 'rpc'
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
                boosted: item.boosted,
                source: 'rpc'
              });
            }
          });
        } else {
          console.log('⚠️ No training content matches found from RPC');
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
        
        // Use the search_properties function
        const { data: propertyData, error: propertyError } = await supabase.rpc(
          'search_properties',
          { 
            user_id_param: userId, 
            query_text: query,
            max_results: 3 
          }
        );
        
        if (propertyError) {
          console.error('❌ Error searching properties:', propertyError);
        } else if (propertyData && propertyData.length > 0) {
          console.log(`📊 Found ${propertyData.length} property matches`);
          
          result.property_listings = propertyData.map((property) => ({
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
function extractQAPair(content) {
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

