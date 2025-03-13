
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
      includeProperties = true
    } = await req.json();
    
    console.log(`Processing training search for user ${userId} with query: "${query}"`);
    
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
      } else if (qaData) {
        console.log(`Found ${qaData.length} QA matches`);
        result.qa_matches = qaData;
      }
    }
    
    // Search file content if requested
    if (includeFiles) {
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
        console.log(`Found ${fileData.length} file content matches`);
        
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
      const { data: propertyData, error: propertyError } = await supabase.rpc(
        'search_properties',
        { user_id_param: userId, query_text: query, max_results: 3 }
      );
      
      if (propertyError) {
        console.error('Error searching properties:', propertyError);
      } else if (propertyData) {
        console.log(`Found ${propertyData.length} property matches`);
        
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
