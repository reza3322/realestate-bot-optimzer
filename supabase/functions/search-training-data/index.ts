
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      query, 
      userId, 
      includeQA = true, 
      includeFiles = true, 
      includeProperties = true,
      maxResults = 5 
    } = await req.json();
    
    console.log(`Searching training data for user ${userId} with query: ${query}`);

    if (!query || !userId) {
      return new Response(
        JSON.stringify({ error: 'Query and user ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize results
    let qaMatches = [];
    let fileContent = [];
    let propertyListings = [];

    // Fetch Q&A matches
    if (includeQA) {
      const { data: qaData, error: qaError } = await supabaseClient
        .rpc('search_training_data', {
          user_id_param: userId,
          query_text: query
        });
      
      if (qaError) {
        console.error('Error searching QA data:', qaError);
      } else if (qaData && qaData.length > 0) {
        qaMatches = qaData.slice(0, maxResults);
        console.log(`Found ${qaMatches.length} QA matches`);
      }
    }

    // Fetch file content
    if (includeFiles) {
      const { data: filesData, error: filesError } = await supabaseClient
        .from('chatbot_training_files')
        .select('id, source_file, category, content_type, extracted_text')
        .eq('user_id', userId)
        .limit(maxResults);
      
      if (filesError) {
        console.error('Error fetching training files:', filesError);
      } else if (filesData && filesData.length > 0) {
        // Filter and transform file data
        fileContent = filesData.map(file => ({
          id: file.id,
          source: file.source_file,
          category: file.category,
          content_type: file.content_type,
          text: file.extracted_text.substring(0, 500) // Limit text length
        }));
        console.log(`Found ${fileContent.length} file content matches`);
      }
    }

    // Fetch property listings - directly from the database, not hardcoded
    if (includeProperties) {
      // First check if the query seems to be about properties
      const propertyTerms = ['property', 'properties', 'house', 'home', 'apartment', 'villa', 'flat', 'condo', 
                             'real estate', 'buy', 'rent', 'sale', 'bedroom', 'bathroom', 'pool'];
      
      const isPropertyQuery = propertyTerms.some(term => query.toLowerCase().includes(term));
      
      if (isPropertyQuery) {
        // Extract potential location from query
        let locationFilter = '';
        const locationMatches = query.match(/in\s+([a-zA-Z\s]+?)(?:,|\s|$|\?|\.)/i);
        if (locationMatches && locationMatches[1]) {
          locationFilter = locationMatches[1].trim();
        }
        
        // Extract potential bedrooms from query
        let bedroomsFilter = null;
        const bedroomsMatches = query.match(/(\d+)\s*(?:bed|bedroom|bedrooms|br)/i);
        if (bedroomsMatches && bedroomsMatches[1]) {
          bedroomsFilter = parseInt(bedroomsMatches[1]);
        }
        
        // Build query based on extracted filters
        let query = supabaseClient
          .from('properties')
          .select('id, title, description, price, bedrooms, bathrooms, city, state, status, url, has_pool')
          .eq('user_id', userId)
          .eq('status', 'active');
        
        // Add location filter if present
        if (locationFilter) {
          query = query.or(`city.ilike.%${locationFilter}%,state.ilike.%${locationFilter}%,description.ilike.%${locationFilter}%`);
        }
        
        // Add bedrooms filter if present
        if (bedroomsFilter !== null) {
          query = query.eq('bedrooms', bedroomsFilter);
        }
        
        // Add pool filter if mentioned
        if (query.toLowerCase().includes('pool')) {
          query = query.eq('has_pool', true);
        }
        
        // Execute query
        const { data: propertiesData, error: propertiesError } = await query.limit(maxResults);
        
        if (propertiesError) {
          console.error('Error fetching properties:', propertiesError);
        } else if (propertiesData && propertiesData.length > 0) {
          propertyListings = propertiesData;
          console.log(`Found ${propertyListings.length} property listings matching query terms`);
        } else {
          // If no specific filters matched, just return some properties
          const { data: fallbackProperties, error: fallbackError } = await supabaseClient
            .from('properties')
            .select('id, title, description, price, bedrooms, bathrooms, city, state, status, url, has_pool')
            .eq('user_id', userId)
            .eq('status', 'active')
            .limit(maxResults);
          
          if (!fallbackError && fallbackProperties && fallbackProperties.length > 0) {
            propertyListings = fallbackProperties;
            console.log(`Found ${propertyListings.length} fallback property listings`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        qa_matches: qaMatches,
        file_content: fileContent,
        property_listings: propertyListings
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-training-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
