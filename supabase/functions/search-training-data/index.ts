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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// CRITICAL DEBUGGING OUTPUT: Log when the function loads
console.log('🚀 SEARCH-TRAINING-DATA FUNCTION LOADED AND READY');
console.log('👉 Listening for requests on this edge function');

serve(async (req) => {
  // CRITICAL DEBUGGING OUTPUT: Log EVERY incoming request in detail
  console.log('🚨 INCOMING REQUEST TO SEARCH-TRAINING-DATA');
  console.log('🔑 Request URL:', req.url);
  console.log('📋 Request method:', req.method);
  console.log('🔍 Request headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling CORS preflight request');
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  try {
    console.log('📦 Starting to parse request body');
    let reqBody;
    try {
      reqBody = await req.json();
      console.log('📦 Request body parsed successfully:', JSON.stringify(reqBody, null, 2));
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
      'business', 'office', 'location', 'address', 'contact', 'tell me about',
      'what do you do', 'services', 'specialties', 'experience', 'expertise'
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
        .select('id, question, answer, category, extracted_text, content_type')
        .eq('user_id', userId)
        .limit(10);
      
      console.log('📊 DIRECT CHECK RESULT COUNT:', trainingFilesCheck?.length || 0);
      if (checkError) {
        console.error('❌ Error in direct check:', checkError);
      } else {
        console.log(`📊 DIRECT CHECK found ${trainingFilesCheck?.length || 0} training files`);
        // Log the first few results to debug
        if (trainingFilesCheck && trainingFilesCheck.length > 0) {
          console.log('📊 SAMPLE TRAINING DATA:', 
            trainingFilesCheck.slice(0, 3).map(item => ({
              id: item.id,
              question: item.question?.substring(0, 50),
              answer: item.answer?.substring(0, 50),
              extracted_text: item.extracted_text?.substring(0, 50),
              content_type: item.content_type
            }))
          );
        }
      }
    } catch (checkError) {
      console.error('❌ Exception in direct check:', checkError);
    }
    
    // Search all training data 
    if (includeQA || includeFiles) {
      console.log('🔍 Searching for all training content types');
      
      try {
        // First try direct database query for both QA and extracted text
        console.log(`⏳ Starting direct query to chatbot_training_files - ${new Date().toISOString()}`);
        
        // For agency questions, prioritize getting ANY training data no matter the similarity
        const directQuerySelect = 'id, question, answer, category, priority, extracted_text, content_type';
        
        // Query for QA pairs
        let qaData = [];
        if (includeQA) {
          const { data: qaQueryData, error: qaQueryError } = await supabase
            .from('chatbot_training_files')
            .select(directQuerySelect)
            .eq('user_id', userId)
            .not('question', 'is', null)
            .not('answer', 'is', null)
            .order('priority', { ascending: false })
            .limit(5);
            
          if (qaQueryError) {
            console.error('❌ Error in QA direct query:', qaQueryError);
          } else if (qaQueryData && qaQueryData.length > 0) {
            console.log(`📊 Direct query found ${qaQueryData.length} QA items`);
            qaData = qaQueryData;
          }
        }
        
        // Query for extracted text
        let fileData = [];
        if (includeFiles) {
          const { data: fileQueryData, error: fileQueryError } = await supabase
            .from('chatbot_training_files')
            .select(directQuerySelect)
            .eq('user_id', userId)
            .not('extracted_text', 'is', null)
            .not('extracted_text', 'eq', '')
            .order('priority', { ascending: false })
            .limit(5);
            
          if (fileQueryError) {
            console.error('❌ Error in file content direct query:', fileQueryError);
          } else if (fileQueryData && fileQueryData.length > 0) {
            console.log(`📊 Direct query found ${fileQueryData.length} file content items`);
            fileData = fileQueryData;
          }
        }
        
        // Process QA data
        if (qaData.length > 0) {
          console.log(`Found ${qaData.length} QA matches, processing...`);
          
          // Calculate similarity for each QA pair
          qaData.forEach((item) => {
            const similarityScore = calculateSimilarity(item.question || '', query);
            // For agency questions, use a lower threshold
            const effectiveScore = isAgencyQuestion ? Math.max(similarityScore * 1.5, 0.2) : similarityScore;
            
            result.qa_matches.push({
              id: item.id,
              question: item.question,
              answer: item.answer,
              category: item.category,
              priority: item.priority,
              similarity: effectiveScore,
              source: 'direct_query',
              boosted: isAgencyQuestion
            });
          });
        }
        
        // Process file content data
        if (fileData.length > 0) {
          console.log(`Found ${fileData.length} file content matches, processing...`);
          
          // Calculate similarity for each file content
          fileData.forEach((item) => {
            const similarityScore = calculateSimilarity(item.extracted_text || '', query);
            // For agency questions, use a lower threshold
            const effectiveScore = isAgencyQuestion ? Math.max(similarityScore * 1.5, 0.2) : similarityScore;
            
            result.file_content.push({
              id: item.id,
              source: item.content_type || 'text',
              category: item.category,
              text: item.extracted_text,
              priority: item.priority,
              similarity: effectiveScore,
              source: 'direct_query',
              boosted: isAgencyQuestion
            });
          });
        }
        
        // Also try the RPC function if we don't have enough data
        if (qaData.length === 0 && fileData.length === 0) {
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
        }
        
        // Sort results by similarity
        result.qa_matches.sort((a, b) => b.similarity - a.similarity);
        result.file_content.sort((a, b) => b.similarity - a.similarity);
        
        // If this is an agency question and we still have no results, add a fallback
        if (isAgencyQuestion && result.qa_matches.length === 0 && result.file_content.length === 0) {
          console.log('⚠️ No agency data found despite agency question, checking for ANY training data');
          
          // Try one more time with a very general query to get any agency data
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('chatbot_training_files')
            .select(directQuerySelect)
            .eq('user_id', userId)
            .limit(3);
            
          if (!fallbackError && fallbackData && fallbackData.length > 0) {
            console.log(`📊 Found ${fallbackData.length} fallback training items`);
            
            // Add any found items to results
            fallbackData.forEach(item => {
              if (item.question && item.answer) {
                result.qa_matches.push({
                  id: item.id,
                  question: item.question,
                  answer: item.answer,
                  category: item.category || 'General',
                  priority: item.priority || 5,
                  similarity: 0.3, // Low similarity but better than nothing
                  source: 'fallback',
                  boosted: true
                });
              } else if (item.extracted_text) {
                result.file_content.push({
                  id: item.id,
                  source: item.content_type || 'text',
                  category: item.category || 'General',
                  text: item.extracted_text,
                  priority: item.priority || 5,
                  similarity: 0.3, // Low similarity but better than nothing
                  source: 'fallback',
                  boosted: true
                });
              }
            });
          }
        }
      } catch (supabaseError) {
        console.error('❌ Exception in Supabase queries:', supabaseError);
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
    
    // Return the combined results - Add additional CORS headers to ensure proper handling
    console.log(`🏁 Returning results with status 200 and CORS headers`);
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        } 
      }
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
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate' 
        } 
      }
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

// Helper function to calculate text similarity manually as a fallback
function calculateSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  
  const text1Lower = text1.toLowerCase();
  const text2Lower = text2.toLowerCase();
  
  // Simple word overlap calculation
  const words1 = text1Lower.split(/\W+/).filter(word => word.length > 2);
  const words2 = text2Lower.split(/\W+/).filter(word => word.length > 2);
  
  // Count matching words
  let matchCount = 0;
  for (const word of words2) {
    if (words1.includes(word)) {
      matchCount++;
    }
  }
  
  // If either text has no significant words, return low similarity
  if (words1.length === 0 || words2.length === 0) return 0.1;
  
  // Calculate similarity as percentage of matching words
  return matchCount / Math.min(words1.length, words2.length);
}
