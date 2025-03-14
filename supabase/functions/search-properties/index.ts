
// Search Properties Edge Function
// This function searches through property listings for relevant matches
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
    const { userId, searchParams = {} } = await req.json();
    
    console.log(`Searching properties for user ${userId} with params:`, searchParams);

    // Extract search parameters
    const { 
      location, 
      type, 
      minPrice, 
      maxPrice, 
      bedrooms, 
      style, 
      maxResults = 3 
    } = searchParams;

    // Build query
    let query = supabase.rpc('search_properties', {
      user_id_param: userId,
      query_text: location || type || style || '',
      max_results: maxResults
    });

    // Fetch properties
    const { data, error } = await query;

    if (error) {
      console.error("Error searching properties:", error);
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

    console.log(`Found ${data?.length || 0} matching properties`);
    
    // Apply additional filters client-side
    let filteredProperties = data || [];
    
    if (minPrice) {
      filteredProperties = filteredProperties.filter(p => (p.price >= minPrice));
    }
    
    if (maxPrice) {
      filteredProperties = filteredProperties.filter(p => (p.price <= maxPrice));
    }
    
    if (bedrooms) {
      filteredProperties = filteredProperties.filter(p => (p.bedrooms >= bedrooms));
    }

    console.log(`Returning ${filteredProperties.length} properties after filters`);

    // Return properties
    return new Response(
      JSON.stringify({ properties: filteredProperties }),
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
