
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for browser compatibility
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
    const { query, userId, limit = 5 } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: "Search query is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching properties for user: ${userId}, query: ${query}`);

    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://ckgaqkbsnrvccctqxsqv.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Create Supabase client (using native fetch rather than supabase-js to reduce bundle size)
    const searchUrl = `${supabaseUrl}/rest/v1/rpc/search_properties`;
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        user_id_param: userId,
        query_text: query,
        max_results: limit
      })
    });

    if (!response.ok) {
      throw new Error(`Database search failed: ${response.statusText}`);
    }

    const properties = await response.json();
    
    console.log(`Found ${properties.length} properties matching query "${query}"`);
    
    // Map the properties to a simplified format for the frontend
    const propertyListings = properties.map(property => ({
      id: property.id,
      title: property.title,
      description: property.description,
      price: property.price,
      bedroomCount: property.bedrooms,
      bathroomCount: property.bathrooms,
      location: `${property.city || ''}, ${property.state || ''}`.trim(),
      url: property.url,
      features: [
        property.living_area ? `${property.living_area} sqm living area` : null,
        property.plot_area ? `${property.plot_area} sqm plot` : null,
        property.garage_area ? `Garage: ${property.garage_area} sqm` : null,
        property.terrace ? `Terrace: ${property.terrace} sqm` : null,
        property.has_pool ? 'Swimming pool' : null
      ].filter(Boolean),
      relevance: property.relevance
    }));

    return new Response(
      JSON.stringify({
        properties: propertyListings,
        query: query,
        count: propertyListings.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-property-listings function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: "Failed to search property listings"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
