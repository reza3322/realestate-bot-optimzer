
// Search Training Data Edge Function
// This function searches through training data for relevant content
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS headers
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
    const { query, userId, includeQA = true, includeFiles = true, includeProperties = true, maxResults = 5 } = await req.json();
    
    console.log(`Searching for: "${query}" for user ${userId}`);
    console.log(`Filters: includeQA=${includeQA}, includeFiles=${includeFiles}, includeProperties=${includeProperties}`);

    // Initialize results collections
    let qaMatches = [];
    let fileContent = [];
    let propertyListings = [];

    // 1. Search for Q&A matches if requested
    if (includeQA) {
      const { data: qaData, error: qaError } = await supabase.rpc(
        'search_training_data',
        { 
          user_id_param: userId,
          query_text: query
        }
      );

      if (qaError) {
        console.error("Error searching Q&A training data:", qaError);
      } else {
        console.log(`Found ${qaData?.length || 0} Q&A matches`);
        qaMatches = qaData || [];
      }
    }

    // 2. Search for file content if requested
    if (includeFiles) {
      const { data: fileData, error: fileError } = await supabase
        .from('chatbot_training_files')
        .select('*')
        .eq('user_id', userId)
        .eq('content_type', 'file')
        .limit(maxResults);

      if (fileError) {
        console.error("Error searching file content:", fileError);
      } else {
        console.log(`Found ${fileData?.length || 0} file content matches`);
        fileContent = fileData || [];
      }
    }

    // 3. Search for property listings if requested
    if (includeProperties) {
      const { data: propertyData, error: propertyError } = await supabase.rpc(
        'search_properties',
        { 
          user_id_param: userId,
          query_text: query,
          max_results: maxResults
        }
      );

      if (propertyError) {
        console.error("Error searching properties:", propertyError);
      } else {
        console.log(`Found ${propertyData?.length || 0} property listings`);
        propertyListings = propertyData || [];
      }
    }

    // Return combined results
    return new Response(
      JSON.stringify({
        qa_matches: qaMatches,
        file_content: fileContent,
        property_listings: propertyListings
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
