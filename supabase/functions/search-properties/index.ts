
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

    // Start with a basic query
    let query = supabaseClient
      .from('properties')
      .select('id, title, description, price, bedrooms, bathrooms, city, state, status, url, living_area, plot_area, garage_area, terrace, has_pool')
      .eq('user_id', userId)
      .eq('status', 'active');

    // Apply filters - IMPROVED FLEXIBILITY 
    if (type) {
      // Convert to lowercase and look for partial matches
      const lowerType = type.toLowerCase();
      query = query.or(`type.ilike.%${lowerType}%,title.ilike.%${lowerType}%,description.ilike.%${lowerType}%`);
    }
    
    if (location) {
      // More flexible location matching
      const lowerLocation = location.toLowerCase();
      query = query.or(`city.ilike.%${lowerLocation}%,state.ilike.%${lowerLocation}%,description.ilike.%${lowerLocation}%`);
    }
    
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

    // If no results and style is provided, try style-based search
    if ((!properties || properties.length === 0) && style) {
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
        
        // Make sure URLs are included in the response
        const enhancedResults = styleResults.map(property => {
          // Make sure URL exists, create a placeholder if not
          if (!property.url) {
            property.url = `https://youragency.com/listing/${property.id.substring(0, 6)}`;
          }
          
          return {
            ...property,
            features: extractFeatures(property),
            highlight: getHighlight(property),
            location: property.city ? (property.state ? `${property.city}, ${property.state}` : property.city) : 'Exclusive Location'
          };
        });
        
        return new Response(
          JSON.stringify({ properties: enhancedResults }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // If still no results, try a broader search
    if (!properties || properties.length === 0) {
      console.log('No specific matches found, trying broader search');
      
      // Fall back to a broader search just to show something relevant
      const { data: broadResults, error: broadError } = await supabaseClient
        .from('properties')
        .select('id, title, description, price, bedrooms, bathrooms, city, state, status, url, living_area, plot_area, garage_area, terrace, has_pool')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(maxResults);
        
      if (broadError) {
        console.error('Error in broader property search:', broadError);
      } else if (broadResults && broadResults.length > 0) {
        console.log(`Found ${broadResults.length} properties in broader search`);
        
        // Format and return properties
        const formattedProperties = broadResults.map(property => {
          // Make sure URL exists, create a placeholder if not
          if (!property.url) {
            property.url = `https://youragency.com/listing/${property.id.substring(0, 6)}`;
          }
          
          return {
            ...property,
            features: extractFeatures(property),
            highlight: getHighlight(property),
            location: property.city ? (property.state ? `${property.city}, ${property.state}` : property.city) : 'Exclusive Location'
          };
        });

        return new Response(
          JSON.stringify({ 
            properties: formattedProperties,
            message: 'Showing best available properties based on broader search'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Format and return properties
    const formattedProperties = properties ? properties.map(property => {
      // Make sure URL exists, create a placeholder if not
      if (!property.url) {
        property.url = `https://youragency.com/listing/${property.id.substring(0, 6)}`;
      }
      
      return {
        ...property,
        features: extractFeatures(property),
        highlight: getHighlight(property),
        location: property.city ? (property.state ? `${property.city}, ${property.state}` : property.city) : 'Exclusive Location'
      };
    }) : [];

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
