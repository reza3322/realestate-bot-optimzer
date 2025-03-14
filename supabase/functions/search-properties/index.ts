
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
    const { userId, searchParams } = await req.json();
    console.log(`Searching properties for user: ${userId} with params:`, searchParams);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      type, 
      location, 
      minPrice, 
      maxPrice, 
      bedrooms, 
      keywords = [],
      style,
      maxResults = 3,
      hasPool
    } = searchParams || {};

    let query = supabaseClient
      .from('properties')
      .select('id, title, description, price, bedrooms, bathrooms, city, state, status, url, living_area, plot_area, garage_area, terrace, has_pool')
      .eq('user_id', userId)
      .eq('status', 'active');

    // Apply filters
    if (type) query = query.eq('type', type);
    if (location) query = query.or(`city.ilike.%${location}%,state.ilike.%${location}%`);
    if (minPrice) query = query.gte('price', minPrice);
    if (maxPrice) query = query.lte('price', maxPrice);
    if (bedrooms) query = query.gte('bedrooms', bedrooms);
    if (hasPool !== undefined) query = query.eq('has_pool', hasPool);

    // Get results
    const { data: properties, error } = await query.limit(maxResults);

    if (error) {
      console.error('Error searching properties:', error);
      throw error;
    }

    // If we have a style query, use the database function for better relevance matching
    if (style && properties.length === 0) {
      console.log(`No results with basic filtering, trying style-based search for: ${style}`);
      const { data: styleResults, error: styleError } = await supabaseClient
        .rpc('search_properties_by_style', { 
          user_id_param: userId, 
          style_query: style,
          max_results: maxResults
        });

      if (styleError) {
        console.error('Error searching properties by style:', styleError);
      } else if (styleResults && styleResults.length > 0) {
        console.log(`Found ${styleResults.length} properties by style`);
        return new Response(
          JSON.stringify({ 
            properties: styleResults.map(property => ({
              ...property,
              features: extractFeatures(property),
              highlight: getHighlight(property)
            })) 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Format and return properties
    const formattedProperties = properties.map(property => ({
      ...property,
      features: extractFeatures(property),
      highlight: getHighlight(property)
    }));

    return new Response(
      JSON.stringify({ properties: formattedProperties }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-properties function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to extract features from a property
function extractFeatures(property) {
  const features = [];
  
  if (property.bedrooms) features.push(`${property.bedrooms} Bedrooms`);
  if (property.bathrooms) features.push(`${property.bathrooms} Bathrooms`);
  if (property.living_area) features.push(`${property.living_area} m² Living Area`);
  if (property.plot_area) features.push(`${property.plot_area} m² Plot`);
  if (property.garage_area) features.push(`${property.garage_area} m² Garage`);
  if (property.terrace) features.push(`${property.terrace} m² Terrace`);
  if (property.has_pool) features.push(`Swimming Pool`);
  
  // Extract additional features from description if available
  if (property.description) {
    const featureKeywords = ['garden', 'view', 'furnished', 'renovated', 'modern'];
    
    featureKeywords.forEach(keyword => {
      if (property.description.toLowerCase().includes(keyword)) {
        features.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    });
  }
  
  return features;
}

// Helper function to generate a highlight for a property
function getHighlight(property) {
  if (!property.description) return null;
  
  const description = property.description.toLowerCase();
  
  // Check for common selling points
  if (description.includes('investment')) {
    return 'Great investment opportunity with strong rental potential!';
  }
  
  if (description.includes('view') || description.includes('panoramic')) {
    return 'Breathtaking views from your private terrace!';
  }
  
  if (description.includes('modern') || description.includes('contemporary')) {
    return 'Stunning modern design with high-end finishes!';
  }
  
  if (description.includes('renovated') || description.includes('refurbished')) {
    return 'Recently renovated to the highest standards!';
  }
  
  if (description.includes('beach') || description.includes('sea')) {
    return 'Just steps away from the beautiful Mediterranean Sea!';
  }
  
  if (property.has_pool) {
    return 'Enjoy your own private swimming pool!';
  }
  
  // Default highlight
  return 'Perfect home in a prime location!';
}
